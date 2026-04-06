// ── Pipeline bar: source pill, chain builder, mapping pill, playback, share ──
// Manages the pipeline bar UI and playback controls.

import { toAminoKey, DEFAULT_AMINO_KEY } from '../data/amino.js';
import { toKey, getLetters, readCubeState } from '../cube/state.js';
import { clearHighlight, clearGlow } from '../cube/highlight.js';
import {
  SOURCE_PRESETS, SOURCE_DISPLAY,
  SOURCE_LIBRARY, SOURCE_CATEGORIES, getSource, getSourcesByCategory,
  getSourceText, getSourceDisplay,
} from '../pipeline/source.js';
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

// ── Source library helpers ──────────────────────────────────────────

function buildSourceLibrary() {
  const container = document.getElementById('source-library');
  if (!container) return;
  container.innerHTML = '';

  const categoryKeys = Object.keys(SOURCE_CATEGORIES);
  for (const catKey of categoryKeys) {
    const cat = SOURCE_CATEGORIES[catKey];
    const sources = getSourcesByCategory(catKey);
    if (!sources.length) continue;

    // Category header
    const header = document.createElement('div');
    header.className = 'source-category';
    header.innerHTML = `<span class="source-cat-icon">${cat.icon}</span><span class="source-cat-label">${cat.label}</span><span class="source-cat-arrow">▾</span>`;
    container.appendChild(header);

    // Source items
    const group = document.createElement('div');
    group.className = 'source-cat-group';
    for (const s of sources) {
      const item = document.createElement('div');
      item.className = 'source-item';
      item.dataset.sourceId = s.id;
      const letterCount = s.text.length;
      item.innerHTML = `<span class="source-name">${s.name}</span><span class="source-ref">${s.reference} &middot; ${letterCount}</span>`;
      group.appendChild(item);
    }
    container.appendChild(group);
  }
}

function selectSource(id) {
  const entry = getSource(id);
  if (!entry) return;

  clearActiveSourceItem();
  const item = document.querySelector(`.source-item[data-source-id="${id}"]`);
  if (item) item.classList.add('active');

  setPSrcPreset(id);
  setPSourceText(entry.text);
  srcTextarea.value = entry.display;
  document.getElementById('source-count').textContent = [...entry.text].length + ' letters';
  document.getElementById('pill-sub-source').textContent = entry.name;
  pReset();
}

function clearActiveSourceItem() {
  document.querySelectorAll('.source-item.active').forEach(el => el.classList.remove('active'));
}

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
        srcTextarea.value = getSourceDisplay(pSrcPreset) || pSourceText;
        document.getElementById('source-count').textContent = [...pSourceText].length + ' letters';
        // Highlight the active source item in the library
        const activeItem = document.querySelector(`.source-item[data-source-id="${pSrcPreset}"]`);
        if (activeItem) activeItem.classList.add('active');
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

  // ── Build categorized source library dropdown ────────────────────
  buildSourceLibrary();

  // ── Source item selection (delegated) ────────────────────────────
  const srcLibrary = document.getElementById('source-library');
  srcLibrary.addEventListener('click', e => {
    const item = e.target.closest('.source-item');
    if (!item) return;
    const id = item.dataset.sourceId;
    selectSource(id);
  });

  // ── Category collapse/expand ────────────────────────────────────
  srcLibrary.addEventListener('click', e => {
    const header = e.target.closest('.source-category');
    if (!header) return;
    header.classList.toggle('collapsed');
  });

  // ── Custom textarea input ───────────────────────────────────────
  srcTextarea.addEventListener('input', () => {
    clearActiveSourceItem();
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

// Export selectSource for programmatic source selection (e.g. recipe loading)
export { selectSource };
