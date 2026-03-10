// ── Mapping dialog: amino acid mapping modal ────────────────────────
// Full-screen modal for editing the Hebrew letter -> amino acid mapping.

import {
  HEBREW_22,
  AMINO_MAP,
  AMINO_CODES,
  AMINO_NAMES,
  AMINO_FULL_NAMES,
  toAminoKey,
  parseAminoKey,
  DEFAULT_AMINO_KEY,
} from '../data/amino.js';

let _renderPipeAmino = null;
let _updateAminoMapLabel = null;

const mapDialog = document.getElementById('mapping-dialog');
const mapOverlay = document.getElementById('mapping-overlay');

let mdDragSrc = null;

// 2 rows of 11: alef-kaf, lamed-tav
const MD_ROWS = [
  { label: '\u05D0\u2013\u05DB', letters: HEBREW_22.slice(0, 11) },
  { label: '\u05DC\u2013\u05EA', letters: HEBREW_22.slice(11) },
];

// ── Open / Close ────────────────────────────────────────────────────

export function openMappingDialog() {
  renderMappingDialogGrid();
  mapDialog.classList.add('open');
  mapOverlay.classList.add('open');
}

export function closeMappingDialog() {
  mapDialog.classList.remove('open');
  mapOverlay.classList.remove('open');
}

// ── Swap amino acid assignments ─────────────────────────────────────

function mdSwap(srcLetter, dstLetter) {
  if (!srcLetter || srcLetter === dstLetter) return;
  const tmp = AMINO_MAP[srcLetter];
  AMINO_MAP[srcLetter] = AMINO_MAP[dstLetter];
  AMINO_MAP[dstLetter] = tmp;
  renderMappingDialogGrid();
  if (_renderPipeAmino) _renderPipeAmino();
  if (_updateAminoMapLabel) _updateAminoMapLabel();
}

// ── Render the mapping grid ─────────────────────────────────────────

function renderMappingDialogGrid() {
  const grid = document.getElementById('md-grid');
  let h = '';
  for (const row of MD_ROWS) {
    h += `<div class="md-row-label">${row.label}</div>`;
    for (const ch of row.letters) {
      const aa = AMINO_MAP[ch] || '*';
      const name = AMINO_NAMES[aa] || '';
      const fullName = AMINO_FULL_NAMES[aa] || '';
      h += `<div class="md-cell" data-letter="${ch}" title="${fullName}"><span class="md-heb">${ch}</span><span class="md-amino" draggable="true" data-letter="${ch}" title="${fullName}">${aa}</span><span class="md-name">${name}</span></div>`;
    }
  }
  grid.innerHTML = h;

  // Update the key field
  document.getElementById('amino-key-field').value = toAminoKey();

  // Amino acid badge: draggable + droppable
  grid.querySelectorAll('.md-amino[draggable]').forEach(badge => {
    badge.addEventListener('dragstart', e => {
      mdDragSrc = badge.dataset.letter;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', mdDragSrc);
      requestAnimationFrame(() => badge.classList.add('dragging'));
    });
    badge.addEventListener('dragend', () => {
      badge.classList.remove('dragging');
      mdDragSrc = null;
    });
    badge.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (mdDragSrc && mdDragSrc !== badge.dataset.letter) {
        badge.closest('.md-cell').classList.add('drag-over');
      }
    });
    badge.addEventListener('dragleave', () => {
      badge.closest('.md-cell').classList.remove('drag-over');
    });
    badge.addEventListener('drop', e => {
      e.preventDefault();
      badge.closest('.md-cell').classList.remove('drag-over');
      mdSwap(e.dataTransfer.getData('text/plain'), badge.dataset.letter);
    });
  });

  // Click to cycle amino acid assignment
  grid.querySelectorAll('.md-amino[draggable]').forEach(badge => {
    badge.addEventListener('click', () => {
      const letter = badge.dataset.letter;
      const cur = AMINO_MAP[letter] || '*';
      const idx = AMINO_CODES.indexOf(cur);
      AMINO_MAP[letter] = AMINO_CODES[(idx + 1) % AMINO_CODES.length];
      renderMappingDialogGrid();
      if (_renderPipeAmino) _renderPipeAmino();
      if (_updateAminoMapLabel) _updateAminoMapLabel();
    });
  });

  // Cell is also a drop target (easier to hit)
  grid.querySelectorAll('.md-cell[data-letter]').forEach(cell => {
    cell.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (mdDragSrc && mdDragSrc !== cell.dataset.letter) cell.classList.add('drag-over');
    });
    cell.addEventListener('dragleave', () => cell.classList.remove('drag-over'));
    cell.addEventListener('drop', e => {
      e.preventDefault();
      cell.classList.remove('drag-over');
      mdSwap(e.dataTransfer.getData('text/plain'), cell.dataset.letter);
    });
  });
}

// ── Update amino map label helper ───────────────────────────────────

export function updateAminoMapLabel() {
  document.getElementById('pill-sub-map').textContent = toAminoKey() === DEFAULT_AMINO_KEY ? 'Default' : 'Custom';
}

// ── Init ────────────────────────────────────────────────────────────

/**
 * Wire up mapping dialog DOM event listeners.
 * @param {Object} deps
 * @param {Function} deps.renderPipeAmino - re-render amino acid output
 * @param {Function} [deps.updateAminoMapLabel] - update pill subtitle (optional, uses internal if not provided)
 */
export function initMappingDialog({ renderPipeAmino, updateAminoMapLabel: externalUpdateLabel }) {
  _renderPipeAmino = renderPipeAmino;
  _updateAminoMapLabel = externalUpdateLabel || updateAminoMapLabel;

  // Close button
  document.getElementById('mapping-close').addEventListener('click', closeMappingDialog);
  mapOverlay.addEventListener('click', closeMappingDialog);

  // Reset to default
  document.getElementById('mapping-default').addEventListener('click', () => {
    parseAminoKey(DEFAULT_AMINO_KEY);
    renderMappingDialogGrid();
    if (_renderPipeAmino) _renderPipeAmino();
    _updateAminoMapLabel();
  });

  // Copy amino key
  document.getElementById('amino-key-copy').addEventListener('click', () => {
    const field = document.getElementById('amino-key-field');
    navigator.clipboard.writeText(field.value).then(() => {
      const btn = document.getElementById('amino-key-copy');
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy', 1200);
    });
  });

  // Apply amino key
  document.getElementById('amino-key-apply').addEventListener('click', () => {
    const errEl = document.getElementById('amino-key-error');
    const key = document.getElementById('amino-key-field').value.trim().toUpperCase();
    if (parseAminoKey(key)) {
      errEl.style.display = 'none';
      renderMappingDialogGrid();
      if (_renderPipeAmino) _renderPipeAmino();
      _updateAminoMapLabel();
    } else {
      errEl.style.display = '';
    }
  });

  // Escape key closes mapping dialog
  window.addEventListener('keydown', ev => {
    if (ev.key === 'Escape' && mapDialog.classList.contains('open')) {
      closeMappingDialog();
      ev.stopPropagation();
    }
  }, true);
}
