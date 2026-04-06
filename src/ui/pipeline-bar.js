// ── Pipeline bar: source pill, chain builder, mapping pill, playback, share ──
// Manages the pipeline bar UI and playback controls.

import { toAminoKey, DEFAULT_AMINO_KEY } from '../data/amino.js';
import { toKey, getLetters, readCubeState } from '../cube/state.js';
import { clearHighlight, clearGlow } from '../cube/highlight.js';
import { SOURCE_PRESETS, SOURCE_DISPLAY } from '../pipeline/source.js';
import { encodeRecipe } from '../pipeline/recipe.js';
import { initChainBuilder, renderChain as _renderChain } from './chain-builder.js';
import {
  pSrcPreset, pSourceText, pFlash, pSpeed, pPlaying, pInitLetters, pInitialized,
  pChain,
  setPSrcPreset, setPSourceText,
  setPFlash, setPSpeed, setPInitLetters, setPInitialized,
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

// ── Init ────────────────────────────────────────────────────────────

export function initPipelineBar({ stopIdle, buildCube, cubeGroup, renderPanel, waitAnimDone, openMappingDialog, openKeyDialog }) {
  _stopIdle = stopIdle;
  _buildCube = buildCube;
  _cubeGroup = cubeGroup;
  _renderPanel = renderPanel;
  _waitAnimDone = waitAnimDone;
  _openMappingDialog = openMappingDialog;
  _openKeyDialog = openKeyDialog;

  // Initialize chain builder
  initChainBuilder({
    openKeyDialog,
    openLetterPanel: () => {
      closeAllDropdowns();
      panel.classList.add('open');
      if (_renderPanel) _renderPanel();
    },
  });

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
        pClearGlow();
        setPInitLetters([...getLetters()]);
        _buildCube();
        setPInitialized(true);
        pReset();
      }
      renderPipeCounter();
      _renderChain();
      if (!srcTextarea.value) {
        srcTextarea.value = SOURCE_DISPLAY[pSrcPreset] || pSourceText;
        document.getElementById('source-count').textContent = [...pSourceText].length + ' letters';
      }
    }
  });

  // ── Source & Mapping pill dropdown toggle ──────────────────────
  document.querySelectorAll('.pipeline-pill').forEach(pill => {
    pill.addEventListener('click', e => {
      if (pill.classList.contains('dimmed')) return;
      e.stopPropagation();
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

  document.addEventListener('click', e => {
    if (openDropdown && !e.target.closest('.stage-dropdown') && !e.target.closest('.pipeline-pill')) {
      closeAllDropdowns();
    }
  });

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
    document.querySelectorAll('#src-presets .stage-preset').forEach(b => b.classList.remove('active'));
    document.querySelector('[data-src-preset="custom"]').classList.add('active');
    setPSrcPreset('custom');
    setPSourceText(srcTextarea.value.replace(/[^\u05D0-\u05EA]/g, ''));
    document.getElementById('source-count').textContent = [...pSourceText].length + ' letters';
    document.getElementById('pill-sub-source').textContent = 'Custom';
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
      pChain,
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
}

// Re-export renderChain for external callers (recipe loading)
export { renderChain } from './chain-builder.js';
