// ── Letter panel: letter assignment chips, key dialog ────────────────
// Manages the left-side letter panel and the key import/export dialog.

import { DEFAULT_LETTERS } from '../data/hebrew.js';
import { GROUPS, toKey, parseKey, canonicalize, toStateKey, parseStateKey, updateHash } from '../cube/state.js';
import { highlightedIdx, setHighlightedIdx, setHighlight, clearHighlight } from '../cube/highlight.js';

let _cubeGroup = null;
let _getLetters = null;
let _setLetters = null;
let _buildCube = null;
let _renderPanelCb = null;

let dragSrcIdx = null;

const panel = document.getElementById('letter-panel');

// ── Render panel ────────────────────────────────────────────────────

export function renderPanel() {
  const letters = _getLetters();
  const currentHighlight = highlightedIdx;
  for (const { id, start, count } of GROUPS) {
    const el = document.getElementById(id);
    el.innerHTML = '';
    for (let i = start; i < start + count; i++) {
      const chip = document.createElement('div');
      chip.className = 'letter-chip' + (currentHighlight === i ? ' active' : '');
      chip.textContent = letters[i];
      chip.draggable = true;

      chip.addEventListener('dragstart', e => {
        dragSrcIdx = i;
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(i));
        requestAnimationFrame(() => chip.classList.add('dragging'));
      });
      chip.addEventListener('dragend', () => {
        chip.classList.remove('dragging');
        dragSrcIdx = null;
      });
      chip.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (dragSrcIdx !== null && dragSrcIdx !== i) chip.classList.add('drag-over');
      });
      chip.addEventListener('dragleave', () => chip.classList.remove('drag-over'));
      chip.addEventListener('drop', e => {
        e.preventDefault();
        chip.classList.remove('drag-over');
        const src = parseInt(e.dataTransfer.getData('text/plain'));
        if (!isNaN(src) && src !== i) {
          setHighlightedIdx(null);
          const letters = _getLetters();
          [letters[src], letters[i]] = [letters[i], letters[src]];
          _setLetters(letters);
          _buildCube();
          updateHash();
        }
        renderPanel();
      });

      chip.addEventListener('click', () => setHighlight(i, _getLetters(), _cubeGroup, renderPanel));
      el.appendChild(chip);
    }
  }
}

// ── Key dialog ──────────────────────────────────────────────────────

const keyDialog = document.getElementById('key-dialog');
const keyOverlay = document.getElementById('key-overlay');
const keyDisplay = document.getElementById('key-display');
const stateDisplay = document.getElementById('state-display');
const keyInput = document.getElementById('key-input');
const keyError = document.getElementById('key-error');

export function openKeyDialog() {
  keyDisplay.value = toKey(_getLetters());
  stateDisplay.value = toStateKey(_cubeGroup);
  keyInput.value = '';
  keyError.classList.remove('show');
  keyDialog.classList.add('open');
  keyOverlay.classList.add('open');
}

function closeKeyDialog() {
  keyDialog.classList.remove('open');
  keyOverlay.classList.remove('open');
}

// ── Init ────────────────────────────────────────────────────────────

/**
 * Wire up letter panel and key dialog DOM event listeners.
 * @param {Object} deps
 * @param {THREE.Group} deps.cubeGroup
 * @param {Function} deps.getLetters - () => string[]
 * @param {Function} deps.setLetters - (string[]) => void
 * @param {Function} deps.buildCube - (cubeGroup, letters) => void
 * @param {Function} deps.setHighlightState - { highlightedIdx, setHighlightedIdx }
 */
export function initLetterPanel({ cubeGroup, getLetters, setLetters, buildCube }) {
  _cubeGroup = cubeGroup;
  _getLetters = getLetters;
  _setLetters = setLetters;
  _buildCube = buildCube;

  // Letters button opens panel
  document.getElementById('letters-btn').addEventListener('click', () => {
    panel.classList.toggle('open');
    if (panel.classList.contains('open')) renderPanel();
  });

  // Close panel
  document.getElementById('panel-close').addEventListener('click', () => {
    panel.classList.remove('open');
  });

  // Shuffle
  document.getElementById('shuffle-btn').addEventListener('click', () => {
    setHighlightedIdx(null);
    const letters = _getLetters();
    for (let i = letters.length - 1; i > 0; i--) {
      const j = Math.random() * (i + 1) | 0;
      [letters[i], letters[j]] = [letters[j], letters[i]];
    }
    _setLetters(letters);
    _buildCube();
    renderPanel();
    updateHash();
  });

  // Reset
  document.getElementById('reset-btn').addEventListener('click', () => {
    setHighlightedIdx(null);
    _setLetters([...DEFAULT_LETTERS]);
    _buildCube();
    renderPanel();
    updateHash();
  });

  // Key button opens dialog
  document.getElementById('key-btn').addEventListener('click', openKeyDialog);

  // Key dialog close
  document.getElementById('key-close').addEventListener('click', closeKeyDialog);
  keyOverlay.addEventListener('click', closeKeyDialog);

  // Copy key
  document.getElementById('key-copy').addEventListener('click', () => {
    navigator.clipboard.writeText(keyDisplay.value).then(() => {
      const btn = document.getElementById('key-copy');
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy', 1500);
    });
  });

  // Canonical key
  document.getElementById('key-canonical').addEventListener('click', () => {
    keyDisplay.value = canonicalize(keyDisplay.value);
  });

  // Copy state
  document.getElementById('state-copy').addEventListener('click', () => {
    navigator.clipboard.writeText(stateDisplay.value).then(() => {
      const btn = document.getElementById('state-copy');
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy', 1500);
    });
  });

  // Load key
  document.getElementById('key-load').addEventListener('click', () => {
    const raw = keyInput.value.trim().toUpperCase();
    if (!raw) return;
    const isState = raw.includes('.');
    const parsed = isState ? parseStateKey(raw) : parseKey(raw);
    if (parsed) {
      _setLetters(parsed);
      _buildCube();
      renderPanel();
      updateHash();
      keyDisplay.value = toKey(_getLetters());
      stateDisplay.value = toStateKey(_cubeGroup);
      keyError.classList.remove('show');
      closeKeyDialog();
    } else {
      keyError.classList.add('show');
    }
  });

  // Escape key closes key dialog
  window.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && keyDialog.classList.contains('open')) {
      closeKeyDialog();
      ev.stopPropagation();
    }
  }, true);
}
