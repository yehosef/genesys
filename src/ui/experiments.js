// ── Experiments gallery: demo + saved experiments ─────────────────────
// Shows pre-built demos and user-saved experiments.
// Saved experiments are stored in localStorage as JSON.

const STORAGE_KEY = 'genesys-experiments';

let _loadExperiment = null;
let _getRecipeHash = null;

// ── Storage helpers ─────────────────────────────────────────────────

function loadSaved() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveSaved(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function saveExperiment(name, recipe) {
  if (!name.trim() || !recipe) return false;
  const list = loadSaved();
  list.unshift({
    id: 'exp-' + Date.now(),
    name: name.trim(),
    timestamp: Date.now(),
    recipe,
  });
  saveSaved(list);
  return true;
}

export function deleteExperiment(id) {
  const list = loadSaved().filter(e => e.id !== id);
  saveSaved(list);
}

// ── Render ──────────────────────────────────────────────────────────

function renderDemoCard(exp) {
  const card = document.createElement('div');
  card.className = 'exp-card';
  card.innerHTML = `
    <div class="exp-card-icon">${exp.icon}</div>
    <div class="exp-card-body">
      <div class="exp-card-name">${exp.name}</div>
      <div class="exp-card-desc">${exp.description}</div>
      <div class="exp-card-meta">
        <span class="exp-tag">${exp.source}</span>
        <span class="exp-tag chain">${exp.chainLabel}</span>
      </div>
    </div>
    <button class="exp-load-btn">Load</button>
  `;
  card.querySelector('.exp-load-btn').addEventListener('click', () => {
    if (_loadExperiment) _loadExperiment(exp.recipe);
  });
  return card;
}

function renderSavedCard(exp) {
  const card = document.createElement('div');
  card.className = 'exp-card saved';
  const date = new Date(exp.timestamp).toLocaleDateString();
  card.innerHTML = `
    <div class="exp-card-icon">🧪</div>
    <div class="exp-card-body">
      <div class="exp-card-name">${exp.name}</div>
      <div class="exp-card-meta">
        <span class="exp-tag">${date}</span>
      </div>
    </div>
    <div class="exp-card-actions">
      <button class="exp-load-btn">Load</button>
      <button class="exp-del-btn" title="Delete">✕</button>
    </div>
  `;
  card.querySelector('.exp-load-btn').addEventListener('click', () => {
    if (_loadExperiment) _loadExperiment(exp.recipe);
  });
  card.querySelector('.exp-del-btn').addEventListener('click', () => {
    deleteExperiment(exp.id);
    renderGallery();
  });
  return card;
}

function renderGallery() {
  const savedGrid = document.getElementById('exp-saved-grid');
  const savedSection = document.getElementById('exp-saved-section');
  if (!savedGrid) return;

  const saved = loadSaved();
  savedGrid.innerHTML = '';
  if (saved.length) {
    savedSection.style.display = '';
    for (const exp of saved) {
      savedGrid.appendChild(renderSavedCard(exp));
    }
  } else {
    savedSection.style.display = 'none';
  }
}

// ── Init ────────────────────────────────────────────────────────────

/**
 * @param {Object} opts
 * @param {Object[]} opts.demos - DEMO_EXPERIMENTS array
 * @param {Function} opts.loadExperiment - (recipeHash) => void
 * @param {Function} opts.getRecipeHash - () => string (current pipeline as recipe)
 */
export function initExperimentsGallery({ demos, loadExperiment, getRecipeHash }) {
  _loadExperiment = loadExperiment;
  _getRecipeHash = getRecipeHash;

  const overlay = document.getElementById('experiments-overlay');
  const dialog = document.getElementById('experiments-dialog');
  if (!overlay || !dialog) return;

  // Render demo cards
  const demoGrid = document.getElementById('exp-demo-grid');
  if (demoGrid) {
    for (const exp of demos) {
      demoGrid.appendChild(renderDemoCard(exp));
    }
  }

  // Render saved experiments
  renderGallery();

  // Open/close
  function open() {
    renderGallery(); // refresh saved list
    overlay.classList.add('open');
    dialog.classList.add('open');
  }
  function close() {
    overlay.classList.remove('open');
    dialog.classList.remove('open');
  }

  overlay.addEventListener('click', close);
  document.getElementById('experiments-close').addEventListener('click', close);

  // Open from pipeline bar button
  const openBtn = document.getElementById('pipe-experiments');
  if (openBtn) openBtn.addEventListener('click', open);

  // Open from bottom bar button
  const bottomBtn = document.getElementById('experiments-btn');
  if (bottomBtn) bottomBtn.addEventListener('click', open);

  // Wire save buttons (there's one at the bottom, always visible)
  function wireSave(btnId, inputId) {
    const saveBtn = document.getElementById(btnId);
    const nameInput = document.getElementById(inputId);
    if (!saveBtn || !nameInput) return;
    saveBtn.addEventListener('click', () => {
      const name = nameInput.value.trim();
      if (!name) { nameInput.focus(); return; }
      const recipe = _getRecipeHash ? _getRecipeHash() : null;
      if (!recipe) return;
      if (saveExperiment(name, recipe)) {
        nameInput.value = '';
        renderGallery();
        // Show the saved section now
        const savedSection = document.getElementById('exp-saved-section');
        if (savedSection) savedSection.style.display = '';
      }
    });
    nameInput.addEventListener('keydown', e => {
      if (e.key === 'Enter') saveBtn.click();
    });
  }
  wireSave('exp-save-btn-main', 'exp-name-input-main');
}
