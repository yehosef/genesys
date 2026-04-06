// ── Pipeline execution engine ─────────────────────────────────────────
// THE CORE: manages pipeline state, playback, and step logic.
// Interacts with the cube through injected dependencies (no Three.js imports).

import { aminoLookup } from '../data/amino.js';
import { SOURCE_PRESETS, SOURCE_DISPLAY, MEZUZAH_TEXT } from './source.js';
import { runChainPure, resolveRotSeq, defaultChain } from './chain.js';

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

// ── Chain state ─────────────────────────────────────────────────────
export let pChain = defaultChain();

// ── State setters ───────────────────────────────────────────────────
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
export function setPChain(v)       { pChain = v; }

// ── Injected dependencies ────────────────────────────────────────────
let deps = {};

export function initEngine(dependencies) {
  deps = dependencies;
}

// ── DOM element refs ──────────────────────────────────────────────────
function el(id) { return document.getElementById(id); }

// ── Utility ──────────────────────────────────────────────────────────
function waitAnimDone(cb) {
  if (deps.waitAnimDone) {
    deps.waitAnimDone(cb);
  } else {
    cb();
  }
}

// ── Playback preparation ──────────────────────────────────────────────
// Splits pChain at the first cube-rotation step. Pre-steps (ciphers,
// expansions, cube-resets) are executed instantly to produce
// pPreparedLetters — the text that feeds into the animated rotation.
let pPreparedLetters = [];
let pRotStep = null;
let pPostSteps = [];

function preparePlayback() {
  const rotIdx = pChain.findIndex(s => s.type === 'cube-rotation');
  const preSteps = rotIdx === -1 ? [...pChain] : pChain.slice(0, rotIdx);
  pRotStep = rotIdx === -1 ? null : pChain[rotIdx];
  pPostSteps = rotIdx === -1 ? [] : pChain.slice(rotIdx + 1);

  if (preSteps.length) {
    const cubeState = deps.readCubeState();
    const result = runChainPure(cubeState, [...pSourceText], preSteps);
    pPreparedLetters = result.finalOutput;
    // Sync cube state if pre-steps changed it (e.g. cube-reset)
    deps.setLetters(result.finalCubeState);
    deps.buildCube();
  } else {
    pPreparedLetters = [...pSourceText];
  }
}

function getMoveTable() {
  const mode = pRotStep ? pRotStep.moveMode : 'layers';
  return mode === 'cube' ? deps.PIPE_MOVES : deps.NUM_MOVES;
}


// ── Clear glow ───────────────────────────────────────────────────────
export function pClearGlow() {
  const gs = deps.glowState;
  if (!gs) return;

  if (gs.ref) { deps.clearGlow(gs.ref); gs.ref = null; }
  if (gs.yellowMesh) { deps.clearGlow(gs.yellowMesh); gs.yellowMesh = null; }
  gs.oldPos = null;

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

// ── Render hooks ────────────────────────────────────────────────────
const renderHooks = [];
export function addRenderHook(fn) { renderHooks.push(fn); }

// ── Renderers ───────────────────────────────────────────────────────
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
  const total = pPreparedLetters.length;
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
    if (aa === '*') continue;
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
  log.scrollLeft = log.scrollWidth;
}

// ── Play / Pause ─────────────────────────────────────────────────────
export function pPlay() {
  if (!pSourceText.length) return;
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
  if (!pPlaying || pIdx >= pPreparedLetters.length) { pPause(); return; }
  pStepFwd(() => { if (pPlaying) pPlayLoop(); });
}

// ── Step forward (animated, one letter at a time for cube-rotation) ──
export function pStepFwd(onDone) {
  if (pIdx >= pPreparedLetters.length) { pPause(); return; }
  if (deps.stopIdle) deps.stopIdle();

  const rotSeq = pRotStep ? resolveRotSeq(pRotStep) : [];
  const inputLetter = pPreparedLetters[pIdx];
  const digit = rotSeq.length ? rotSeq[pIdx % rotSeq.length] : 0;

  const stateBefore = deps.readCubeState();
  const posIdx = stateBefore.indexOf(inputLetter);

  // Apply post-steps after last letter is processed
  const applyPostIfDone = () => {
    if (pIdx >= pPreparedLetters.length && pPostSteps.length) {
      const cubeState = deps.readCubeState();
      const postResult = runChainPure(cubeState, pOutput, pPostSteps);
      pOutput = postResult.finalOutput;
    }
  };

  if (!pRotStep || posIdx === -1 || digit === 0) {
    const outLetter = posIdx === -1 ? inputLetter : stateBefore[posIdx];
    pInput.push(inputLetter);
    pOutput.push(outLetter);
    pSteps.push({ idx: pIdx + 1, inL: inputLetter, digit, outL: outLetter, same: inputLetter === outLetter, moved: false });
    pIdx++;
    applyPostIfDone();
    renderPipeAll();
    if (onDone) setTimeout(onDone, 0);
    return;
  }

  const moveTable = getMoveTable();
  const move = moveTable[String(digit)];
  if (!move) {
    pInput.push(inputLetter);
    pOutput.push(inputLetter);
    pSteps.push({ idx: pIdx + 1, inL: inputLetter, digit, outL: inputLetter, same: true, moved: false });
    pIdx++;
    applyPostIfDone();
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
      if (gs.ref) { deps.clearGlow(gs.ref); gs.ref = null; }
    }

    pIdx++;
    applyPostIfDone();
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
  preparePlayback();
  renderPipeAll();
}

// ── Run entire pipeline at once (instant, no animation) ──────────────
export function pRunAll() {
  if (!pSourceText.length || !pChain.length) return;

  pPause();
  pClearGlow();
  if (deps.stopIdle) deps.stopIdle();

  // Reset cube to initial state
  if (pInitLetters) {
    deps.setLetters([...pInitLetters]);
    deps.buildCube();
  }

  // Use runChainPure for instant execution
  const initialState = deps.readCubeState();
  const srcLetters = [...pSourceText];
  const result = runChainPure(initialState, srcLetters, pChain);

  // Sync Three.js cube to final state
  deps.setLetters(result.finalCubeState);
  deps.buildCube();

  // Build step log from the cube-rotation intermediate
  pIdx = 0;
  pInput = [];
  pOutput = [];
  pMoves = [];
  pStates = [initialState];
  pSteps = [];

  const rotIntermediate = result.intermediates.find(im => im.type === 'cube-rotation');
  if (rotIntermediate) {
    const rot = pChain.find(s => s.type === 'cube-rotation');
    const rotSeqForSteps = rot ? resolveRotSeq(rot) : [];
    for (let i = 0; i < rotIntermediate.inputLetters.length; i++) {
      const inL = rotIntermediate.inputLetters[i];
      const outL = rotIntermediate.outputLetters[i];
      const digit = rotSeqForSteps.length ? rotSeqForSteps[i % rotSeqForSteps.length] : 0;
      pInput.push(inL);
      pOutput.push(outL);
      pSteps.push({
        idx: i + 1, inL, digit, outL,
        same: inL === outL,
        moved: inL !== outL,
      });
    }
    pIdx = rotIntermediate.inputLetters.length;
  } else {
    const lastIm = result.intermediates.length
      ? result.intermediates[result.intermediates.length - 1]
      : null;
    const stepIn = lastIm ? lastIm.inputLetters : srcLetters;
    for (let i = 0; i < result.finalOutput.length; i++) {
      const outL = result.finalOutput[i];
      const inL = stepIn[i] || '';
      pInput.push(inL);
      pOutput.push(outL);
      pSteps.push({ idx: i + 1, inL, digit: 0, outL, same: inL === outL, moved: false });
    }
    pIdx = result.finalOutput.length;
  }

  renderPipeAll();
}
