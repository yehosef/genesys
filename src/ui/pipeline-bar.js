// ── Pipeline bar: stage pills, dropdowns, playback, share ───────────
// Manages the pipeline bar UI, stage dropdown interactions, and playback controls.

import { getDigits, hebrewToDigits } from '../data/digits.js';
import { toAminoKey, DEFAULT_AMINO_KEY, parseAminoKey } from '../data/amino.js';
import { toKey, parseKey, getLetters, setLetters, LAYER_LABELS, CUBE_LABELS, readCubeState } from '../cube/state.js';
import { clearHighlight, clearGlow, setGlowMeshRef, setYellowFlashMesh } from '../cube/highlight.js';
import { SOURCE_PRESETS, SOURCE_DISPLAY } from '../pipeline/source.js';
import { encodeRecipe } from '../pipeline/recipe.js';
import { getTransform, listTransforms } from '../pipeline/transforms.js';
import {
  ROT_LABELS,
  pSrcPreset, pSourceText, pRotSrc, pRotSeq, pRotCustom, pRotHebrew,
  pMoveMode, pFlash, pSpeed, pPlaying, pInitLetters, pInitialized,
  pTransform, getEffectiveSource,
  setPSrcPreset, setPSourceText, setPRotSrc, setPRotSeq, setPRotCustom, setPRotHebrew,
  setPMoveMode, setPFlash, setPSpeed, setPInitLetters, setPInitialized,
  setPTransform,
  pPlay, pPause, pStepFwd, pStepBack, pReset, pRunAll,
  pClearGlow, renderPipeCounter,
} from '../pipeline/engine.js';

let _stopIdle = null;
let _buildCube = null;
let _cubeGroup = null;
let _renderPanel = null;
let _waitAnimDone = null;
let _openMappingDialog = null;
let _openKeyDialog = null;

const pipeBar = document.getElementById('pipeline-bar');
const outPanel = document.getElementById('output-panel');
const panel = document.getElementById('letter-panel');
const srcTextarea = document.getElementById('source-textarea');

let openDropdown = null;

// ── Dropdown management ─────────────────────────────────────────────

function closeAllDropdowns() {
  document.querySelectorAll('.stage-dropdown.open').forEach(d => d.classList.remove('open'));
  document.querySelectorAll('.pipeline-pill.active').forEach(p => p.classList.remove('active'));
  openDropdown = null;
}

// ── Move vocabulary ─────────────────────────────────────────────────

export function renderMoveVocab() {
  const el = document.getElementById('move-vocab');
  if (!el) return;
  const labels = pMoveMode === 'cube' ? CUBE_LABELS : LAYER_LABELS;
  const start = pMoveMode === 'cube' ? 0 : 1;
  let h = '';
  for (let d = start; d <= 9; d++) {
    h += `<div class="mv-row"><span class="mv-digit">${d}</span><span class="mv-desc">${labels[d] || ''}</span></div>`;
  }
  el.innerHTML = h;
}

// ── Init ────────────────────────────────────────────────────────────

/**
 * Wire up pipeline bar DOM event listeners.
 * @param {Object} deps
 * @param {Function} deps.stopIdle
 * @param {Function} deps.buildCube - (cubeGroup, letters) => void
 * @param {THREE.Group} deps.cubeGroup
 * @param {Function} deps.renderPanel
 * @param {Function} deps.waitAnimDone - (cb) => void
 * @param {Function} deps.openMappingDialog
 * @param {Function} deps.openKeyDialog
 */
export function initPipelineBar({ stopIdle, buildCube, cubeGroup, renderPanel, waitAnimDone, openMappingDialog, openKeyDialog }) {
  _stopIdle = stopIdle;
  _buildCube = buildCube;
  _cubeGroup = cubeGroup;
  _renderPanel = renderPanel;
  _waitAnimDone = waitAnimDone;
  _openMappingDialog = openMappingDialog;
  _openKeyDialog = openKeyDialog;

  // Pipeline button toggles pipeline bar + output panel
  document.getElementById('pipeline-btn').addEventListener('click', () => {
    const opening = !pipeBar.classList.contains('open');
    pipeBar.classList.toggle('open');
    outPanel.classList.toggle('open');
    if (opening) {
      panel.classList.remove('open');
      if (!pInitialized) {
        _stopIdle();
        clearHighlight();
        // Clear any yellow flash
        const yfm = null; // yellowFlashMesh handled by pClearGlow
        pClearGlow();
        setPInitLetters([...getLetters()]);
        _buildCube();
        // Push initial state
        const initialState = readCubeState(_cubeGroup);
        // engine pStates is managed internally; call pReset to initialize properly
        setPInitialized(true);
        pReset();
      }
      renderPipeCounter();
      // Pre-fill source textarea (with spaces for readability)
      if (!srcTextarea.value) {
        srcTextarea.value = SOURCE_DISPLAY[pSrcPreset] || pSourceText;
        document.getElementById('source-count').textContent = [...pSourceText].length + ' letters';
      }
    }
  });

  // ── Stage dropdown toggle ───────────────────────────────────────
  document.querySelectorAll('.pipeline-pill').forEach(pill => {
    pill.addEventListener('click', e => {
      if (pill.classList.contains('dimmed')) return;
      e.stopPropagation();
      // Mapping pill opens full modal instead of dropdown
      if (pill.dataset.stage === 'mapping') {
        closeAllDropdowns();
        if (_openMappingDialog) _openMappingDialog();
        return;
      }
      const dd = pill.querySelector('.stage-dropdown');
      if (!dd) return;
      const wasOpen = dd.classList.contains('open');
      closeAllDropdowns();
      if (!wasOpen) {
        dd.classList.add('open');
        pill.classList.add('active');
        openDropdown = dd;
      }
    });
  });

  // Close dropdown on outside click
  document.addEventListener('click', e => {
    if (openDropdown && !e.target.closest('.stage-dropdown') && !e.target.closest('.pipeline-pill')) {
      closeAllDropdowns();
    }
  });

  // Prevent dropdown clicks from closing
  document.querySelectorAll('.stage-dropdown').forEach(dd => {
    dd.addEventListener('click', e => e.stopPropagation());
  });

  // ── Source text selection ─────────────────────────────────────────
  document.querySelectorAll('#src-presets .stage-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#src-presets .stage-preset').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setPSrcPreset(btn.dataset.srcPreset);
      const currentPreset = btn.dataset.srcPreset;
      if (SOURCE_PRESETS[currentPreset]) {
        setPSourceText(SOURCE_PRESETS[currentPreset]);
        srcTextarea.value = SOURCE_DISPLAY[currentPreset] || SOURCE_PRESETS[currentPreset];
      } else {
        setPSourceText(srcTextarea.value.replace(/[^\u05D0-\u05EA]/g, ''));
      }
      document.getElementById('source-count').textContent = [...pSourceText].length + ' letters';
      document.getElementById('pill-sub-source').textContent =
        currentPreset === 'mezuzah' ? 'Mezuzah' : currentPreset === 'genesis' ? 'Genesis 1:1' : 'Custom';
      pReset();
    });
  });

  srcTextarea.addEventListener('input', () => {
    // Auto-switch to custom when user edits
    document.querySelectorAll('#src-presets .stage-preset').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-src-preset="custom"]').classList.add('active');
    setPSrcPreset('custom');
    setPSourceText(srcTextarea.value.replace(/[^\u05D0-\u05EA]/g, ''));
    document.getElementById('source-count').textContent = [...pSourceText].length + ' letters';
    document.getElementById('pill-sub-source').textContent = 'Custom';
  });

  // ── Transform selection ──────────────────────────────────────────────
  document.querySelectorAll('#transform-presets .stage-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#transform-presets .stage-preset').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const name = btn.dataset.transform;
      setPTransform(name);
      const t = getTransform(name);
      document.getElementById('pill-sub-transform').textContent = t ? t.label : 'None';

      // Show note for expansion transforms
      const note = document.getElementById('transform-note');
      if (t && t.expansion) {
        const effLen = [...getEffectiveSource()].length;
        note.textContent = `Milui expands ${[...pSourceText].length} → ${effLen} letters`;
        note.style.display = 'block';
      } else {
        note.style.display = 'none';
      }

      // Update source count to show effective length
      const effSrc = getEffectiveSource();
      document.getElementById('source-count').textContent = [...effSrc].length + ' letters';

      pReset();
      closeAllDropdowns();
    });
  });

  // ── Rotation source selection ──────────────────────────────────────
  document.querySelectorAll('#rot-presets .stage-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#rot-presets .stage-preset').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setPRotSrc(btn.dataset.rot);
      document.getElementById('rot-custom-area').style.display = btn.dataset.rot === 'custom' ? 'block' : 'none';
      document.getElementById('rot-hebrew-area').style.display = btn.dataset.rot === 'hebrew' ? 'block' : 'none';
      if (btn.dataset.rot !== 'custom' && btn.dataset.rot !== 'hebrew') {
        setPRotSeq(getDigits(btn.dataset.rot));
        document.getElementById('pill-sub-rot').textContent = ROT_LABELS[btn.dataset.rot] || btn.dataset.rot;
        pReset();
      }
    });
  });

  document.getElementById('rot-custom-set').addEventListener('click', () => {
    const raw = document.getElementById('rot-custom-input').value.trim();
    const digits = [...raw].map(Number).filter(d => d >= 0 && d <= 9);
    if (digits.length) {
      setPRotSeq(digits);
      setPRotCustom(digits);
      document.getElementById('pill-sub-rot').textContent = 'Custom';
      pReset();
      closeAllDropdowns();
    }
  });

  document.getElementById('rot-hebrew-set').addEventListener('click', () => {
    const text = document.getElementById('rot-hebrew-input').value.trim();
    const digits = hebrewToDigits(text);
    if (digits.length) {
      setPRotSeq(digits);
      setPRotHebrew(text);
      document.getElementById('pill-sub-rot').textContent = 'Hebrew\u2192digits';
      pReset();
      closeAllDropdowns();
    }
  });

  document.getElementById('rot-custom-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('rot-custom-set').click();
  });
  document.getElementById('rot-hebrew-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('rot-hebrew-set').click();
  });

  // ── Cube stage shortcuts ──────────────────────────────────────────
  document.getElementById('cube-open-panel').addEventListener('click', () => {
    closeAllDropdowns();
    panel.classList.add('open');
    if (_renderPanel) _renderPanel();
  });
  document.getElementById('cube-open-key').addEventListener('click', () => {
    closeAllDropdowns();
    if (_openKeyDialog) _openKeyDialog();
  });

  // ── Move mode toggle ──────────────────────────────────────────────
  document.querySelectorAll('#move-mode-presets .stage-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#move-mode-presets .stage-preset').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      setPMoveMode(btn.dataset.mmode);
      renderMoveVocab();
      pReset();
    });
  });

  // ── Speed slider ──────────────────────────────────────────────────
  const pSpeedEl = document.getElementById('pipe-speed');
  const pSpeedValEl = document.getElementById('pipe-speed-val');
  pSpeedEl.addEventListener('input', () => {
    setPSpeed(parseInt(pSpeedEl.value));
    pSpeedValEl.textContent = pSpeed + 'ms';
  });

  // ── Flash toggle ──────────────────────────────────────────────────
  const pFlashEl = document.getElementById('pipe-flash');
  pFlashEl.addEventListener('change', () => {
    setPFlash(pFlashEl.checked);
    if (!pFlash) pClearGlow();
  });

  // ── Playback controls ─────────────────────────────────────────────
  const pPlayBtn = document.getElementById('pipe-play');
  pPlayBtn.addEventListener('click', () => pPlaying ? pPause() : pPlay());

  document.getElementById('pipe-fwd').addEventListener('click', () => {
    if (pPlaying) pPause();
    _waitAnimDone(() => pStepFwd());
  });

  document.getElementById('pipe-back').addEventListener('click', () => {
    if (pPlaying) pPause();
    _waitAnimDone(() => pStepBack());
  });

  document.getElementById('pipe-reset').addEventListener('click', () => {
    if (pPlaying) pPause();
    _waitAnimDone(() => pReset());
  });

  document.getElementById('pipe-run-all').addEventListener('click', () => {
    _waitAnimDone(() => pRunAll());
  });

  // ── Block manual rotations during pipeline playback ───────────────
  // (NUM_MOVES imported via state.js)
  const NUM_MOVES_KEYS = new Set(['1','2','3','4','5','6','7','8','9']);
  window.addEventListener('keydown', ev => {
    if (pPlaying && NUM_MOVES_KEYS.has(ev.key)) {
      ev.preventDefault();
      ev.stopImmediatePropagation();
    }
  }, true);

  // ── Share button ──────────────────────────────────────────────────
  document.getElementById('pipe-share').addEventListener('click', () => {
    const recipeHash = encodeRecipe({
      pSrcPreset,
      pSourceText,
      pRotSrc,
      pRotCustom,
      pRotHebrew,
      pMoveMode,
      toKey,
      letters: getLetters(),
    });
    const url = location.origin + location.pathname + recipeHash;
    navigator.clipboard.writeText(url).then(() => {
      const btn = document.getElementById('pipe-share');
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = '\uD83D\uDD17 Share', 1500);
    });
  });

  // Render move vocabulary on init
  renderMoveVocab();
}
