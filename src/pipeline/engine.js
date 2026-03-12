// ── Pipeline execution engine ─────────────────────────────────────────
// THE CORE: manages pipeline state, playback, and step logic.
// Interacts with the cube through injected dependencies (no Three.js imports).

import { getDigits, hebrewToDigits } from '../data/digits.js';
import { aminoLookup } from '../data/amino.js';
import { SOURCE_PRESETS, SOURCE_DISPLAY, MEZUZAH_TEXT } from './source.js';
import { getTransform } from './transforms.js';

// ── Rotation labels ──────────────────────────────────────────────────
export const ROT_LABELS = {
  pi: '\u03C0 digits',
  e: 'e digits',
  phi: '\u03C6 digits',
  fib: 'Fibonacci',
  custom: 'Custom',
  hebrew: 'Hebrew\u2192digits',
};

// ── Pipeline state ───────────────────────────────────────────────────
export let pIdx = 0;
export let pInput = [];
export let pOutput = [];
export let pMoves = [];
export let pStates = [];
export let pSteps = [];
export let pPlaying = false;
export let pSpeed = 200;
export let pFlash = true;
export let pInitLetters = null;
export let pInitialized = false;
export let pSrcPreset = 'mezuzah';
export let pSourceText = MEZUZAH_TEXT;
export let pRotSrc = 'pi';
export let pRotSeq = getDigits('pi');
export let pRotCustom = [];
export let pRotHebrew = '';
export let pMoveMode = 'layers'; // 'layers' or 'cube'
export let pTransform = 'identity'; // pre-cube transform name

// ── State setters (needed because ES module exports are read-only bindings) ──
export function setPIdx(v)         { pIdx = v; }
export function setPInput(v)       { pInput = v; }
export function setPOutput(v)      { pOutput = v; }
export function setPMoves(v)       { pMoves = v; }
export function setPStates(v)      { pStates = v; }
export function setPSteps(v)       { pSteps = v; }
export function setPPlaying(v)     { pPlaying = v; }
export function setPSpeed(v)       { pSpeed = v; }
export function setPFlash(v)       { pFlash = v; }
export function setPInitLetters(v) { pInitLetters = v; }
export function setPInitialized(v) { pInitialized = v; }
export function setPSrcPreset(v)   { pSrcPreset = v; }
export function setPSourceText(v)  { pSourceText = v; }
export function setPRotSrc(v)      { pRotSrc = v; }
export function setPRotSeq(v)      { pRotSeq = v; }
export function setPRotCustom(v)   { pRotCustom = v; }
export function setPRotHebrew(v)   { pRotHebrew = v; }
export function setPMoveMode(v)    { pMoveMode = v; }
export function setPTransform(v)   { pTransform = v; }

// ── Injected dependencies ────────────────────────────────────────────
let deps = {};

/**
 * Initialize the engine with external dependencies.
 * @param {Object} dependencies
 * @param {Object} dependencies.cubeGroup - Three.js Group containing cube meshes
 * @param {Function} dependencies.queueRotation - (axis, layer, angle, dur) => void
 * @param {Function} dependencies.applyRotationInstant - (axis, layer, angle) => void
 * @param {Function} dependencies.readCubeState - () => string[]
 * @param {Function} dependencies.waitAnimDone - (cb) => void
 * @param {Function} dependencies.buildCube - () => void
 * @param {Function} dependencies.getLetters - () => string[]
 * @param {Function} dependencies.setLetters - (letters: string[]) => void
 * @param {Function} dependencies.clearGlow - (mesh) => void
 * @param {Function} dependencies.applyGlow - (mesh) => void
 * @param {Object}   dependencies.glowState - { ref, oldPos, yellowMesh, yellowStart }
 * @param {Object}   dependencies.INNER_MAT - Three.js material for inner faces
 * @param {Function} dependencies.renderPanel - () => void
 * @param {Function} dependencies.stopIdle - () => void
 * @param {Object}   dependencies.NUM_MOVES - key->move table for layer mode
 * @param {Object}   dependencies.PIPE_MOVES - key->move table for cube mode
 */
export function initEngine(dependencies) {
  deps = dependencies;
}

// ── DOM element refs (will be cleaned up in UI extraction later) ──────
function el(id) { return document.getElementById(id); }

// ── Utility ──────────────────────────────────────────────────────────
function waitAnimDone(cb) {
  if (deps.waitAnimDone) {
    deps.waitAnimDone(cb);
  } else {
    cb();
  }
}

function getMoveTable() {
  return pMoveMode === 'cube' ? deps.PIPE_MOVES : deps.NUM_MOVES;
}

/**
 * Get the effective source text after applying the selected pre-cube transform.
 * @returns {string}
 */
export function getEffectiveSource() {
  if (pTransform === 'identity' || !pTransform) return pSourceText;
  const t = getTransform(pTransform);
  if (!t) return pSourceText;
  const srcLetters = [...pSourceText];
  const transformed = t.apply(srcLetters);
  return transformed.join('');
}

// ── Clear glow ───────────────────────────────────────────────────────
export function pClearGlow() {
  const gs = deps.glowState;
  if (!gs) return;

  if (gs.ref) { deps.clearGlow(gs.ref); gs.ref = null; }
  if (gs.yellowMesh) { deps.clearGlow(gs.yellowMesh); gs.yellowMesh = null; }
  gs.oldPos = null;

  // Sweep all cubies to ensure no stale emissive
  if (deps.cubeGroup) {
    for (const m of deps.cubeGroup.children) {
      if (!m.isMesh || !Array.isArray(m.material)) continue;
      for (const mat of m.material) {
        if (mat !== deps.INNER_MAT && mat.emissiveIntensity > 0) {
          mat.emissive.setHex(0x000000);
          mat.emissiveIntensity = 0;
        }
      }
    }
  }
}

// ── Render hooks (for external modules to hook into render cycle) ────
const renderHooks = [];
export function addRenderHook(fn) { renderHooks.push(fn); }

// ── Renderers (DOM-dependent — will move to UI modules later) ────────
export function renderPipeAll() {
  renderPipeCounter();
  renderPipeStepLog();
  renderPipeOutput();
  renderPipeAmino();
  for (const hook of renderHooks) hook();
}

export function renderPipeCounter() {
  const counter = el('pipe-counter');
  if (!counter) return;
  const effSrc = getEffectiveSource();
  const total = [...effSrc].length;
  counter.textContent = `Letter ${pIdx} / ${total}`;
}

export function renderPipeOutput() {
  const result = el('output-result');
  if (!result) return;
  if (!pOutput.length) { result.textContent = '\u2014'; return; }
  result.textContent = pOutput.join('');
}

export function renderPipeAmino() {
  const amino = el('output-amino');
  if (!amino) return;
  if (!pOutput.length) { amino.textContent = '\u2014'; return; }
  let h = '';
  for (const ch of pOutput) {
    const aa = aminoLookup(ch);
    if (aa === '*') continue; // silent — skip
    h += aa;
  }
  amino.innerHTML = h || '\u2014';
}

export function renderPipeStepLog() {
  const log = el('step-log');
  if (!log) return;
  let h = '';
  for (let i = 0; i < pSteps.length; i++) {
    const s = pSteps[i];
    const cls = s.same ? 'step-cell same' : 'step-cell changed';
    h += `<div class="${cls}" title="#${s.idx}: ${s.inL}\u2192[${s.digit}]\u2192${s.outL}"><span class="s-in">${s.inL}</span><span class="s-dg">${s.digit}</span><span class="s-out">${s.outL}</span></div>`;
  }
  log.innerHTML = h;
  // Auto-scroll to show latest step
  log.scrollLeft = log.scrollWidth;
}

// ── Play / Pause ─────────────────────────────────────────────────────
export function pPlay() {
  if (!getEffectiveSource().length || !pRotSeq.length) return;
  if (deps.stopIdle) deps.stopIdle();
  pPlaying = true;
  const btn = el('pipe-play');
  if (btn) {
    btn.textContent = '\u23F8';
    btn.classList.add('playing');
  }
  pPlayLoop();
}

export function pPause() {
  pPlaying = false;
  const btn = el('pipe-play');
  if (btn) {
    btn.textContent = '\u25B6';
    btn.classList.remove('playing');
  }
}

export function pPlayLoop() {
  if (!pPlaying || pIdx >= [...getEffectiveSource()].length) { pPause(); return; }
  pStepFwd(() => { if (pPlaying) pPlayLoop(); });
}

// ── Step forward ─────────────────────────────────────────────────────
export function pStepFwd(onDone) {
  // Retry after animation instead of silently dropping callback
  const isAnimating = deps.cubeGroup && (deps.queueRotation._currentAnim || false);
  // Use a simpler check: if waitAnimDone is available, always go through it
  // The actual animation check happens inside waitAnimDone

  const srcChars = [...getEffectiveSource()];
  if (pIdx >= srcChars.length) { pPause(); return; }
  if (deps.stopIdle) deps.stopIdle();

  const inputLetter = srcChars[pIdx];
  const rotIdx = pIdx % pRotSeq.length;
  const digit = pRotSeq[rotIdx];

  const stateBefore = deps.readCubeState();
  const posIdx = stateBefore.indexOf(inputLetter);

  if (posIdx === -1 || digit === 0) {
    // Not found on cube or digit 0 — identity mapping
    const outLetter = posIdx === -1 ? inputLetter : stateBefore[posIdx];
    pInput.push(inputLetter);
    pOutput.push(outLetter);
    pSteps.push({ idx: pIdx + 1, inL: inputLetter, digit: digit, outL: outLetter, same: inputLetter === outLetter, moved: false });
    pIdx++;
    renderPipeAll();
    if (onDone) setTimeout(onDone, 0);
    return;
  }

  const moveTable = getMoveTable();
  const move = moveTable[String(digit)];
  if (!move) {
    // Invalid digit — identity
    pInput.push(inputLetter);
    pOutput.push(inputLetter);
    pSteps.push({ idx: pIdx + 1, inL: inputLetter, digit, outL: inputLetter, same: true, moved: false });
    pIdx++;
    renderPipeAll();
    if (onDone) setTimeout(onDone, 0);
    return;
  }

  const angle = move.s * Math.PI / 2;
  pMoves.push({ axis: move.axis, layer: move.layer, angle });

  // Highlight the input letter on the cube (blue glow) before rotation
  if (pFlash && deps.glowState) {
    const gs = deps.glowState;
    if (gs.ref) deps.clearGlow(gs.ref);
    if (gs.yellowMesh) { deps.clearGlow(gs.yellowMesh); gs.yellowMesh = null; }
    const inputMesh = deps.cubeGroup.children.find(m => m.isMesh && m.userData.letter === inputLetter);
    if (inputMesh) {
      gs.ref = inputMesh;
      deps.applyGlow(gs.ref);
      gs.oldPos = {
        x: Math.round(inputMesh.position.x),
        y: Math.round(inputMesh.position.y),
        z: Math.round(inputMesh.position.z),
      };
    }
  }

  deps.queueRotation(move.axis, move.layer, angle, pSpeed);

  waitAnimDone(() => {
    const stateAfter = deps.readCubeState();
    const outLetter = stateAfter[posIdx];
    pInput.push(inputLetter);
    pOutput.push(outLetter);
    pStates.push(stateAfter);
    pSteps.push({ idx: pIdx + 1, inL: inputLetter, digit, outL: outLetter, same: inputLetter === outLetter, moved: true });

    if (pFlash && deps.glowState) {
      const gs = deps.glowState;
      // For whole-cube rotations the built-in flash won't trigger (all pieces move),
      // so manually flash the output letter's mesh yellow
      if (move.layer === null && outLetter !== inputLetter) {
        const outMesh = deps.cubeGroup.children.find(m => m.isMesh && m.userData.letter === outLetter);
        if (outMesh) {
          if (gs.yellowMesh) deps.clearGlow(gs.yellowMesh);
          gs.yellowMesh = outMesh;
          gs.yellowStart = performance.now();
          outMesh.material.forEach(m => {
            if (m !== deps.INNER_MAT) { m.emissive.setHex(0xffaa00); m.emissiveIntensity = 0.6; }
          });
        }
      }
      // Clear the blue glow from input letter
      if (gs.ref) { deps.clearGlow(gs.ref); gs.ref = null; }
    }

    pIdx++;
    renderPipeAll();
    if (onDone) onDone();
  });
}

// ── Step back ────────────────────────────────────────────────────────
export function pStepBack() {
  if (pIdx === 0) return;
  pClearGlow();

  pIdx--;
  pInput.pop();
  pOutput.pop();
  const step = pSteps.pop();

  // Only undo rotation if this step actually caused one
  if (step && step.moved) {
    const prev = pMoves.pop();
    pStates.pop();
    deps.queueRotation(prev.axis, prev.layer, -prev.angle, pSpeed);
    waitAnimDone(() => renderPipeAll());
  } else {
    renderPipeAll();
  }
}

// ── Reset ────────────────────────────────────────────────────────────
export function pReset() {
  pPause();
  pClearGlow();
  if (pInitLetters) {
    deps.setLetters([...pInitLetters]);
    deps.buildCube();
    deps.renderPanel();
  }
  pIdx = 0;
  pInput = [];
  pOutput = [];
  pMoves = [];
  pStates = [deps.readCubeState()];
  pSteps = [];
  renderPipeAll();
}

// ── Run entire pipeline at once (instant, no animation) ──────────────
export function pRunAll() {
  if (!getEffectiveSource().length || !pRotSeq.length) return;

  pPause();
  pClearGlow();
  if (deps.stopIdle) deps.stopIdle();

  // Reset cube to initial state
  if (pInitLetters) {
    deps.setLetters([...pInitLetters]);
    deps.buildCube();
  }
  pIdx = 0;
  pInput = [];
  pOutput = [];
  pMoves = [];
  pStates = [deps.readCubeState()];
  pSteps = [];

  const srcChars = [...getEffectiveSource()];
  const moveTable = getMoveTable();

  for (let i = 0; i < srcChars.length; i++) {
    const inputLetter = srcChars[i];
    const digit = pRotSeq[i % pRotSeq.length];
    const stateBefore = deps.readCubeState();
    const posIdx = stateBefore.indexOf(inputLetter);

    if (posIdx === -1 || digit === 0) {
      const outLetter = posIdx === -1 ? inputLetter : stateBefore[posIdx];
      pInput.push(inputLetter);
      pOutput.push(outLetter);
      pSteps.push({ idx: i + 1, inL: inputLetter, digit, outL: outLetter, same: inputLetter === outLetter, moved: false });
      continue;
    }

    const move = moveTable[String(digit)];
    if (!move) {
      pInput.push(inputLetter);
      pOutput.push(inputLetter);
      pSteps.push({ idx: i + 1, inL: inputLetter, digit, outL: inputLetter, same: true, moved: false });
      continue;
    }

    const angle = move.s * Math.PI / 2;
    pMoves.push({ axis: move.axis, layer: move.layer, angle });
    deps.applyRotationInstant(move.axis, move.layer, angle);

    const stateAfter = deps.readCubeState();
    const outLetter = stateAfter[posIdx];
    pInput.push(inputLetter);
    pOutput.push(outLetter);
    pStates.push(stateAfter);
    pSteps.push({ idx: i + 1, inL: inputLetter, digit, outL: outLetter, same: inputLetter === outLetter, moved: true });
  }

  pIdx = srcChars.length;
  renderPipeAll();
}
