// ── Chain builder UI: renders and manages permutation chain chips ──────
// Each chain step is a draggable chip. Clicking opens config, ✕ removes.
// The [+] button opens a popover to add new steps.

import { hebrewToDigits } from '../data/digits.js';
import { getTransform } from '../pipeline/transforms.js';
import { ROT_LABELS, pChain, setPChain, pReset } from '../pipeline/engine.js';
import { addStep, removeStep, moveStep } from '../pipeline/chain.js';
import { LAYER_LABELS, CUBE_LABELS } from '../cube/state.js';

let _openKeyDialog = null;
let _openLetterPanel = null;

let chipsEl = null;
let addBtn = null;
let ddAdd = null;
let ddConfig = null;

let activeChipIdx = -1; // which chip has config dropdown open
let dragIdx = -1;

// ── Chip rendering ──────────────────────────────────────────────────

function chipIcon(step) {
  switch (step.type) {
    case 'cipher': return '✡';
    case 'expansion': return '📖';
    case 'cube-reset': return '🎲';
    case 'cube-rotation': return '🎲';
    default: return '?';
  }
}

function chipLabel(step) {
  switch (step.type) {
    case 'cipher': {
      const t = getTransform(step.transform);
      return t ? t.label : step.transform;
    }
    case 'expansion': {
      const t = getTransform(step.transform);
      return t ? t.label : step.transform;
    }
    case 'cube-reset': return 'Key';
    case 'cube-rotation': {
      const src = ROT_LABELS[step.rotSrc] || step.rotSrc;
      const mode = step.moveMode === 'cube' ? 'Cube' : 'Layers';
      return `${src} · ${mode}`;
    }
    default: return step.type;
  }
}

export function renderChain() {
  if (!chipsEl) return;
  chipsEl.innerHTML = '';
  const chain = pChain;

  if (chain.length === 0) {
    const placeholder = document.createElement('span');
    placeholder.className = 'chain-empty';
    placeholder.textContent = 'Add a cipher or rotation step \u2192';
    placeholder.addEventListener('click', (e) => {
      e.stopPropagation();
      if (addBtn) addBtn.click();
    });
    chipsEl.appendChild(placeholder);
    return;
  }

  for (let i = 0; i < chain.length; i++) {
    if (i > 0) {
      const arrow = document.createElement('span');
      arrow.className = 'chain-arrow';
      arrow.textContent = '→';
      chipsEl.appendChild(arrow);
    }

    const step = chain[i];
    const chip = document.createElement('div');
    chip.className = 'chain-chip';
    chip.dataset.idx = i;
    chip.draggable = true;
    if (i === activeChipIdx) chip.classList.add('active');

    chip.innerHTML = `<span class="chip-icon">${chipIcon(step)}</span>`
      + `<span class="chip-label">${chipLabel(step)}</span>`
      + `<span class="chip-remove" data-action="remove" title="Remove">✕</span>`;

    // Click chip -> open config
    chip.addEventListener('click', (e) => {
      if (e.target.dataset.action === 'remove') {
        e.stopPropagation();
        setPChain(removeStep(pChain, i));
        activeChipIdx = -1;
        closeAllChainDropdowns();
        renderChain();
        pReset();
        return;
      }
      e.stopPropagation();
      if (activeChipIdx === i && ddConfig.classList.contains('open')) {
        closeAllChainDropdowns();
        activeChipIdx = -1;
        renderChain();
      } else {
        openChipConfig(i, chip);
      }
    });

    // Drag events
    chip.addEventListener('dragstart', (e) => {
      dragIdx = i;
      chip.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    chip.addEventListener('dragend', () => {
      chip.classList.remove('dragging');
      dragIdx = -1;
      renderChain();
    });
    chip.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      chip.classList.add('drag-over');
    });
    chip.addEventListener('dragleave', () => chip.classList.remove('drag-over'));
    chip.addEventListener('drop', (e) => {
      e.preventDefault();
      chip.classList.remove('drag-over');
      if (dragIdx !== -1 && dragIdx !== i) {
        setPChain(moveStep(pChain, dragIdx, i));
        activeChipIdx = -1;
        closeAllChainDropdowns();
        renderChain();
        pReset();
      }
    });

    chipsEl.appendChild(chip);
  }
}

// ── Add step popover ────────────────────────────────────────────────

function buildAddStepMenu() {
  let h = '<div class="group-title">CIPHERS</div><div class="add-step-grid">';
  const ciphers = ['atbash', 'albam', 'avgad', 'avgad-rev', 'achbi', 'ayak'];
  for (const name of ciphers) {
    const t = getTransform(name);
    if (t) h += `<button class="stage-preset" data-add-cipher="${name}">${t.label}</button>`;
  }
  h += '</div>';

  h += '<div class="group-title">EXPANSION</div><div class="add-step-grid">';
  const t = getTransform('milui');
  if (t) h += `<button class="stage-preset" data-add-expansion="milui">${t.label}</button>`;
  h += '</div>';

  h += '<div class="group-title">CUBE</div><div class="add-step-grid">';
  h += '<button class="stage-preset" data-add-rotation="true">Cube Rotation</button>';
  h += '<button class="stage-preset" data-add-reset="true">Cube Letters</button>';
  h += '</div>';

  ddAdd.innerHTML = h;

  // Wire clicks
  ddAdd.querySelectorAll('[data-add-cipher]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setPChain(addStep(pChain, { type: 'cipher', transform: btn.dataset.addCipher }));
      closeAllChainDropdowns();
      renderChain();
      pReset();
    });
  });

  ddAdd.querySelectorAll('[data-add-expansion]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      setPChain(addStep(pChain, { type: 'expansion', transform: btn.dataset.addExpansion }));
      closeAllChainDropdowns();
      renderChain();
      pReset();
    });
  });

  ddAdd.querySelector('[data-add-rotation]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    setPChain(addStep(pChain, { type: 'cube-rotation', rotSrc: 'pi', moveMode: 'layers', rotCustom: [], rotHebrew: '' }));
    closeAllChainDropdowns();
    renderChain();
    pReset();
  });

  ddAdd.querySelector('[data-add-reset]')?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAllChainDropdowns();
    if (_openKeyDialog) _openKeyDialog();
  });
}

// ── Chip config dropdown ────────────────────────────────────────────

function openChipConfig(idx, chipEl) {
  closeAllChainDropdowns();
  activeChipIdx = idx;
  renderChain(); // re-render to show active state

  const step = pChain[idx];
  let h = '';

  switch (step.type) {
    case 'cipher':
    case 'expansion': {
      h += '<div class="group-title">CHANGE TRANSFORM</div><div class="add-step-grid">';
      const ciphers = ['atbash', 'albam', 'avgad', 'avgad-rev', 'achbi', 'ayak'];
      for (const name of ciphers) {
        const t = getTransform(name);
        if (t) {
          const active = step.transform === name ? ' active' : '';
          h += `<button class="stage-preset${active}" data-set-cipher="${name}">${t.label}</button>`;
        }
      }
      const milui = getTransform('milui');
      if (milui) {
        const active = step.transform === 'milui' ? ' active' : '';
        h += `<button class="stage-preset${active}" data-set-cipher="milui">${milui.label}</button>`;
      }
      h += '</div>';
      break;
    }

    case 'cube-rotation': {
      h += '<div class="group-title">ROTATION SOURCE</div>';
      h += '<div class="stage-presets" style="margin-bottom:6px">';
      for (const [key, label] of Object.entries(ROT_LABELS)) {
        const active = step.rotSrc === key ? ' active' : '';
        h += `<button class="stage-preset${active}" data-set-rot="${key}">${key === 'hebrew' ? 'עברית' : (key === 'custom' ? '123...' : label)}</button>`;
      }
      h += '</div>';

      h += '<div id="cfg-custom-area" style="display:' + (step.rotSrc === 'custom' ? 'block' : 'none') + ';margin-bottom:6px">';
      h += `<input type="text" class="key-field" id="cfg-custom-input" placeholder="Digits 1-9" value="${(step.rotCustom || []).join('')}">`;
      h += '<button class="key-btn" id="cfg-custom-set" style="margin-top:4px;width:100%">Set</button>';
      h += '</div>';

      h += '<div id="cfg-hebrew-area" style="display:' + (step.rotSrc === 'hebrew' ? 'block' : 'none') + ';margin-bottom:6px">';
      h += `<input type="text" class="key-field" id="cfg-hebrew-input" placeholder="הקלד טקסט בעברית" dir="rtl" style="font-family:'Frank Ruhl Libre',serif" value="${step.rotHebrew || ''}">`;
      h += '<button class="key-btn" id="cfg-hebrew-set" style="margin-top:4px;width:100%">Set</button>';
      h += '</div>';

      h += '<div class="group-title" style="margin-top:4px">MOVE MODE</div>';
      h += '<div class="stage-presets" style="margin-bottom:6px">';
      h += `<button class="stage-preset${step.moveMode === 'layers' ? ' active' : ''}" data-set-mmode="layers">Layers</button>`;
      h += `<button class="stage-preset${step.moveMode === 'cube' ? ' active' : ''}" data-set-mmode="cube">Whole Cube</button>`;
      h += '</div>';

      h += '<div class="group-title">MOVE VOCABULARY</div>';
      h += '<div class="move-vocab" id="cfg-move-vocab"></div>';
      break;
    }

    case 'cube-reset': {
      h += '<div class="group-title">CUBE LETTERS</div>';
      h += '<div class="stage-presets">';
      h += '<button class="stage-preset" id="cfg-edit-letters">Edit Letters</button>';
      h += '<button class="stage-preset" id="cfg-import-key">Import Key</button>';
      h += '</div>';
      break;
    }
  }

  ddConfig.innerHTML = h;

  // Position dropdown below the chip
  const chipRect = chipEl.getBoundingClientRect();
  const zoneRect = document.getElementById('permutation-zone').getBoundingClientRect();
  ddConfig.style.left = (chipRect.left - zoneRect.left) + 'px';
  ddConfig.classList.add('open');

  // Wire config events
  wireConfigEvents(idx, step);
}

function wireConfigEvents(idx, step) {
  // Cipher/expansion: change transform
  ddConfig.querySelectorAll('[data-set-cipher]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = btn.dataset.setCipher;
      const t = getTransform(name);
      const newChain = [...pChain];
      newChain[idx] = { type: t && t.expansion ? 'expansion' : 'cipher', transform: name };
      setPChain(newChain);
      closeAllChainDropdowns();
      activeChipIdx = -1;
      renderChain();
      pReset();
    });
  });

  // Cube rotation: rotation source
  ddConfig.querySelectorAll('[data-set-rot]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const rot = btn.dataset.setRot;
      const newChain = [...pChain];
      newChain[idx] = { ...newChain[idx], rotSrc: rot };
      setPChain(newChain);

      // Toggle custom/hebrew areas
      const customArea = ddConfig.querySelector('#cfg-custom-area');
      const hebrewArea = ddConfig.querySelector('#cfg-hebrew-area');
      if (customArea) customArea.style.display = rot === 'custom' ? 'block' : 'none';
      if (hebrewArea) hebrewArea.style.display = rot === 'hebrew' ? 'block' : 'none';

      // Update active state
      ddConfig.querySelectorAll('[data-set-rot]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      if (rot !== 'custom' && rot !== 'hebrew') {
        renderChain();
        pReset();
      }
    });
  });

  // Custom digits set
  ddConfig.querySelector('#cfg-custom-set')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const raw = ddConfig.querySelector('#cfg-custom-input')?.value || '';
    const digits = [...raw].map(Number).filter(d => d >= 0 && d <= 9);
    if (digits.length) {
      const newChain = [...pChain];
      newChain[idx] = { ...newChain[idx], rotSrc: 'custom', rotCustom: digits };
      setPChain(newChain);
      closeAllChainDropdowns();
      activeChipIdx = -1;
      renderChain();
      pReset();
    }
  });

  // Hebrew set
  ddConfig.querySelector('#cfg-hebrew-set')?.addEventListener('click', (e) => {
    e.stopPropagation();
    const text = ddConfig.querySelector('#cfg-hebrew-input')?.value || '';
    const digits = hebrewToDigits(text);
    if (digits.length) {
      const newChain = [...pChain];
      newChain[idx] = { ...newChain[idx], rotSrc: 'hebrew', rotHebrew: text };
      setPChain(newChain);
      closeAllChainDropdowns();
      activeChipIdx = -1;
      renderChain();
      pReset();
    }
  });

  // Move mode
  ddConfig.querySelectorAll('[data-set-mmode]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const newChain = [...pChain];
      newChain[idx] = { ...newChain[idx], moveMode: btn.dataset.setMmode };
      setPChain(newChain);
      ddConfig.querySelectorAll('[data-set-mmode]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderMoveVocabInConfig(newChain[idx].moveMode);
      renderChain();
      pReset();
    });
  });

  // Move vocab
  if (step.type === 'cube-rotation') {
    renderMoveVocabInConfig(step.moveMode);
  }

  // Cube reset: edit letters / import key
  ddConfig.querySelector('#cfg-edit-letters')?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAllChainDropdowns();
    if (_openLetterPanel) _openLetterPanel();
  });
  ddConfig.querySelector('#cfg-import-key')?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeAllChainDropdowns();
    if (_openKeyDialog) _openKeyDialog();
  });

  // Enter key support for inputs
  ddConfig.querySelector('#cfg-custom-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') ddConfig.querySelector('#cfg-custom-set')?.click();
  });
  ddConfig.querySelector('#cfg-hebrew-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') ddConfig.querySelector('#cfg-hebrew-set')?.click();
  });

  // Stop propagation on dropdown clicks
  ddConfig.addEventListener('click', e => e.stopPropagation());
}

function renderMoveVocabInConfig(moveMode) {
  const el = ddConfig.querySelector('#cfg-move-vocab');
  if (!el) return;
  const labels = moveMode === 'cube' ? CUBE_LABELS : LAYER_LABELS;
  const start = moveMode === 'cube' ? 0 : 1;
  let h = '';
  for (let d = start; d <= 9; d++) {
    h += `<div class="mv-row"><span class="mv-digit">${d}</span><span class="mv-desc">${labels[d] || ''}</span></div>`;
  }
  el.innerHTML = h;
}

// ── Dropdown management ─────────────────────────────────────────────

function closeAllChainDropdowns() {
  ddAdd.classList.remove('open');
  ddConfig.classList.remove('open');
}

// ── Init ────────────────────────────────────────────────────────────

export function initChainBuilder({ openKeyDialog, openLetterPanel }) {
  _openKeyDialog = openKeyDialog;
  _openLetterPanel = openLetterPanel;

  chipsEl = document.getElementById('chain-chips');
  addBtn = document.getElementById('chain-add');
  ddAdd = document.getElementById('dd-add-step');
  ddConfig = document.getElementById('dd-chip-config');

  buildAddStepMenu();

  // [+] button toggles add-step popover
  addBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    activeChipIdx = -1;
    ddConfig.classList.remove('open');
    ddAdd.classList.toggle('open');
    renderChain();
  });

  // Close dropdowns on outside click
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.permutation-zone') && !e.target.closest('.stage-dropdown')) {
      closeAllChainDropdowns();
      if (activeChipIdx !== -1) {
        activeChipIdx = -1;
        renderChain();
      }
    }
  });

  // Stop propagation on dropdown content
  ddAdd.addEventListener('click', e => e.stopPropagation());

  // Initial render
  renderChain();
}
