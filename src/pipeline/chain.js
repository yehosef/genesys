// ── Permutation chain: composable pipeline operations ──────────────────
// Core data model and pure execution engine for the chain-based pipeline.
//
// Step types:
//   { type: 'cipher',        transform: 'atbash' }
//   { type: 'expansion',     transform: 'milui' }
//   { type: 'cube-reset',    key: 'ABCDEFGH-...' }
//   { type: 'cube-rotation', rotSrc: 'pi', moveMode: 'layers',
//                             rotCustom: [], rotHebrew: '' }

import { getTransform } from './transforms.js';
import { LAYER_PERMS, CUBE_PERMS, applyPerm } from '../cube/permutation.js';
import { getDigits, hebrewToDigits } from '../data/digits.js';
import { parseKey } from '../cube/state.js';

// ── Default chain (matches current behavior) ──────────────────────────
export function defaultChain() {
  return [{ type: 'cube-rotation', rotSrc: 'pi', moveMode: 'layers', rotCustom: [], rotHebrew: '' }];
}

// ── Resolve a rotation step's digit sequence ──────────────────────────
export function resolveRotSeq(step) {
  if (step.rotSrc === 'custom') return step.rotCustom || [];
  if (step.rotSrc === 'hebrew') return hebrewToDigits(step.rotHebrew || '');
  return getDigits(step.rotSrc);
}

// ── Run a chain purely (no Three.js, no DOM) ──────────────────────────
/**
 * @param {string[]} initialCubeState - 27-element letter array
 * @param {string[]} sourceLetters - input letter array
 * @param {Object[]} chain - ordered step array
 * @returns {{ finalOutput: string[], intermediates: Object[], finalCubeState: string[] }}
 */
export function runChainPure(initialCubeState, sourceLetters, chain) {
  let letters = [...sourceLetters];
  let cubeState = [...initialCubeState];
  const intermediates = [];

  for (let stepIdx = 0; stepIdx < chain.length; stepIdx++) {
    const step = chain[stepIdx];
    const inputLetters = [...letters];
    const cubeStateBefore = [...cubeState];

    switch (step.type) {
      case 'cipher': {
        const t = getTransform(step.transform);
        if (t) letters = t.apply(letters);
        intermediates.push({ stepIdx, type: 'cipher', inputLetters, outputLetters: [...letters] });
        break;
      }

      case 'expansion': {
        const t = getTransform(step.transform);
        if (t) letters = t.apply(letters);
        intermediates.push({ stepIdx, type: 'expansion', inputLetters, outputLetters: [...letters] });
        break;
      }

      case 'cube-reset': {
        const parsed = parseKey(step.key);
        if (parsed) cubeState = parsed;
        intermediates.push({
          stepIdx, type: 'cube-reset', inputLetters, outputLetters: [...letters],
          cubeStateBefore, cubeStateAfter: [...cubeState],
        });
        break;
      }

      case 'cube-rotation': {
        const rotSeq = resolveRotSeq(step);
        if (!rotSeq.length) {
          intermediates.push({ stepIdx, type: 'cube-rotation', inputLetters, outputLetters: [...letters],
            cubeStateBefore, cubeStateAfter: [...cubeState] });
          break;
        }
        const permTable = step.moveMode === 'cube' ? CUBE_PERMS : LAYER_PERMS;
        const output = [];

        for (let i = 0; i < letters.length; i++) {
          const inputLetter = letters[i];
          const digit = rotSeq[i % rotSeq.length];
          const posIdx = cubeState.indexOf(inputLetter);

          if (posIdx === -1 || digit === 0) {
            output.push(posIdx === -1 ? inputLetter : cubeState[posIdx]);
            continue;
          }

          const perm = permTable[String(digit)];
          if (!perm) {
            output.push(inputLetter);
            continue;
          }

          cubeState = applyPerm(cubeState, perm);
          output.push(cubeState[posIdx]);
        }

        letters = output;
        intermediates.push({
          stepIdx, type: 'cube-rotation', inputLetters, outputLetters: [...letters],
          cubeStateBefore, cubeStateAfter: [...cubeState],
        });
        break;
      }

      default:
        // Unknown step type — passthrough
        intermediates.push({ stepIdx, type: step.type, inputLetters, outputLetters: [...letters] });
        break;
    }
  }

  return { finalOutput: letters, intermediates, finalCubeState: cubeState };
}

// ── Chain manipulation helpers ──────────────────────────────────────────

export function addStep(chain, step, position) {
  const c = [...chain];
  if (position !== undefined && position >= 0 && position <= c.length) {
    c.splice(position, 0, step);
  } else {
    c.push(step);
  }
  return c;
}

export function removeStep(chain, idx) {
  const c = [...chain];
  if (idx >= 0 && idx < c.length) c.splice(idx, 1);
  return c;
}

export function moveStep(chain, from, to) {
  if (from === to) return [...chain];
  const c = [...chain];
  const [step] = c.splice(from, 1);
  c.splice(to, 0, step);
  return c;
}

// ── Serialization ───────────────────────────────────────────────────────
// Step codes (comma-separated):
//   c.NAME        — cipher
//   x.NAME        — expansion
//   s.KEY         — cube-reset (27-char key)
//   r.SRC.MODE    — cube rotation with built-in source
//   r.custom.MODE.DIGITS — custom digits inline
//   r.hebrew.MODE.ENCODED — Hebrew text inline (URI-encoded)

export function serializeChain(chain) {
  return chain.map(step => {
    switch (step.type) {
      case 'cipher':
        return `c.${step.transform}`;
      case 'expansion':
        return `x.${step.transform}`;
      case 'cube-reset':
        return `s.${step.key}`;
      case 'cube-rotation': {
        const base = `r.${step.rotSrc}.${step.moveMode}`;
        if (step.rotSrc === 'custom' && step.rotCustom && step.rotCustom.length) {
          return `${base}.${step.rotCustom.join('')}`;
        }
        if (step.rotSrc === 'hebrew' && step.rotHebrew) {
          return `${base}.${encodeURIComponent(step.rotHebrew)}`;
        }
        return base;
      }
      default:
        return '';
    }
  }).filter(Boolean).join(',');
}

export function deserializeChain(str) {
  if (!str) return defaultChain();
  const parts = str.split(',');
  const chain = [];

  for (const part of parts) {
    const segments = part.split('.');
    const code = segments[0];

    switch (code) {
      case 'c':
        if (segments[1]) chain.push({ type: 'cipher', transform: segments[1] });
        break;
      case 'x':
        if (segments[1]) chain.push({ type: 'expansion', transform: segments[1] });
        break;
      case 's':
        // Key may contain dashes, so rejoin everything after 's.'
        if (segments.length > 1) chain.push({ type: 'cube-reset', key: segments.slice(1).join('.') });
        break;
      case 'r': {
        // r.SRC.MODE[.DATA]
        const rotSrc = segments[1] || 'pi';
        const moveMode = segments[2] || 'layers';
        const step = { type: 'cube-rotation', rotSrc, moveMode, rotCustom: [], rotHebrew: '' };
        if (rotSrc === 'custom' && segments[3]) {
          step.rotCustom = [...segments[3]].map(Number).filter(d => d >= 0 && d <= 9);
        } else if (rotSrc === 'hebrew' && segments[3]) {
          step.rotHebrew = decodeURIComponent(segments[3]);
        }
        chain.push(step);
        break;
      }
    }
  }

  return chain.length ? chain : defaultChain();
}

