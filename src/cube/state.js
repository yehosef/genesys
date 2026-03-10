import { HEBREW_TO_EN, EN_TO_HEBREW, DEFAULT_LETTERS } from '../data/hebrew.js';

// ── 27 positions sorted: corners(8) -> edges(12) -> faces(6) -> center(1) ──
export const POSITIONS = [];
for (let x = -1; x <= 1; x++)
  for (let y = -1; y <= 1; y++)
    for (let z = -1; z <= 1; z++)
      POSITIONS.push({ x, y, z, outer: (x?1:0)+(y?1:0)+(z?1:0) });
POSITIONS.sort((a, b) => b.outer - a.outer);

export const POS_LOOKUP = new Map();
POSITIONS.forEach((p, i) => POS_LOOKUP.set(`${p.x},${p.y},${p.z}`, i));

// ── Groups (topology categories) ─────────────────────────────────────
export const GROUPS = [
  { id: 'chips-corners', start: 0,  count: 8  },
  { id: 'chips-edges',   start: 8,  count: 12 },
  { id: 'chips-faces',   start: 20, count: 6  },
  { id: 'chips-center',  start: 26, count: 1  },
];

// ── Mutable letter assignment (THE single source of truth) ───────────
export let letters = [...DEFAULT_LETTERS];

/** Replace the entire letters array */
export function setLetters(newLetters) {
  letters = [...newLetters];
}

/** Get a copy of the current letters */
export function getLetters() {
  return [...letters];
}

// ── Read cube state from 3D meshes ───────────────────────────────────
/**
 * Read the current letter at each of the 27 positions from the 3D scene.
 * @param {THREE.Group} cubeGroup
 * @returns {string[]} 27-element array
 */
export function readCubeState(cubeGroup) {
  const state = new Array(27);
  for (const child of cubeGroup.children) {
    if (!child.isMesh || !child.userData.letter) continue;
    const k = `${Math.round(child.position.x)},${Math.round(child.position.y)},${Math.round(child.position.z)}`;
    const idx = POS_LOOKUP.get(k);
    if (idx !== undefined) state[idx] = child.userData.letter;
  }
  return state;
}

// ── Key encoding/decoding (letter assignment) ────────────────────────
/**
 * Encode a letters array as a key string (4 dash-separated groups).
 * @param {string[]} ltrs - 27-element array
 * @returns {string}
 */
export function toKey(ltrs) {
  return GROUPS.map(({ start, count }) => {
    const seg = [];
    for (let i = start; i < start + count; i++) seg.push(HEBREW_TO_EN[ltrs[i]]);
    return seg.join('');
  }).join('-');
}

/**
 * Parse a key string back into a 27-element letters array.
 * @param {string} key
 * @returns {string[]|null}
 */
export function parseKey(key) {
  const parts = key.split('-');
  if (parts.length !== 4) return null;
  const sizes = [8, 12, 6, 1];
  if (parts.some((p, i) => p.length !== sizes[i])) return null;
  const all = parts.join('');
  const seen = new Set(all);
  if (seen.size !== 27) return null;
  for (const c of all) if (!EN_TO_HEBREW[c]) return null;
  const result = [];
  for (const part of parts) for (const ch of part) result.push(EN_TO_HEBREW[ch]);
  return result;
}

/**
 * Canonicalize a key (sort each group alphabetically).
 * @param {string} key
 * @returns {string}
 */
export function canonicalize(key) {
  return key.split('-').map(s => [...s].sort().join('')).join('-');
}

// ── State key encoding/decoding (includes rotation state) ────────────
/**
 * Generate a state key from the current 3D positions.
 * @param {THREE.Group} cubeGroup
 * @returns {string}
 */
export function toStateKey(cubeGroup) {
  const state = readCubeState(cubeGroup);
  return GROUPS.map(({ start, count }) => {
    const seg = [];
    for (let i = start; i < start + count; i++) seg.push(HEBREW_TO_EN[state[i]]);
    return seg.join('');
  }).join('.');
}

/**
 * Parse a state key (dot-separated) back into a 27-element letters array.
 * @param {string} key
 * @returns {string[]|null}
 */
export function parseStateKey(key) {
  const parts = key.split('.');
  if (parts.length !== 4) return null;
  const sizes = [8, 12, 6, 1];
  if (parts.some((p, i) => p.length !== sizes[i])) return null;
  const all = parts.join('');
  const seen = new Set(all);
  if (seen.size !== 27) return null;
  for (const c of all) if (!EN_TO_HEBREW[c]) return null;
  const result = [];
  for (const part of parts) for (const ch of part) result.push(EN_TO_HEBREW[ch]);
  return result;
}

// ── Apply key (sets letters + rebuilds) ──────────────────────────────
// buildCube and renderPanel are injected at init time to avoid circular deps
let _buildCube = null;
let _cubeGroup = null;
let _renderPanel = null;

/**
 * Inject dependencies that applyKey needs (avoids circular imports).
 * Call once from main.js after all modules are loaded.
 */
export function initState(cubeGroup, buildCubeFn, renderPanelFn) {
  _cubeGroup = cubeGroup;
  _buildCube = buildCubeFn;
  _renderPanel = renderPanelFn;
}

/**
 * Apply a key string: parse, set letters, rebuild cube, re-render panel.
 * @param {string} key
 * @returns {boolean} success
 */
export function applyKey(key) {
  const parsed = parseKey(key);
  if (!parsed) return false;
  // We import highlight inline to avoid circular deps at module level
  letters = parsed;
  if (_buildCube && _cubeGroup) _buildCube(_cubeGroup, letters);
  if (_renderPanel) _renderPanel();
  return true;
}

/**
 * Update the URL hash with the current letter assignment key.
 * @param {string[]} ltrs - letters array (defaults to module state)
 */
export function updateHash(ltrs) {
  const l = ltrs || letters;
  const key = toKey(l);
  const hash = '#key=' + encodeURIComponent(key);
  if (location.hash !== hash) history.pushState(null, '', hash);
  // Update cube pill subtitle if pipeline UI exists
  const cubeSub = document.getElementById('pill-sub-cube');
  if (cubeSub) {
    const isDefault = l.every((ch, i) => ch === DEFAULT_LETTERS[i]);
    cubeSub.textContent = isDefault ? 'Default' : 'Custom';
  }
}

// ── Keyboard rotation mappings ───────────────────────────────────────
// Number keys: 1-3 = x layers (R/M/L), 4-6 = y (U/E/D), 7-9 = z (F/S/B)
export const NUM_MOVES = {
  '1': { axis:'x', layer: 1, s: 1 },
  '2': { axis:'x', layer: 0, s:-1 },
  '3': { axis:'x', layer:-1, s:-1 },
  '4': { axis:'y', layer: 1, s: 1 },
  '5': { axis:'y', layer: 0, s:-1 },
  '6': { axis:'y', layer:-1, s:-1 },
  '7': { axis:'z', layer: 1, s:-1 },
  '8': { axis:'z', layer: 0, s:-1 },
  '9': { axis:'z', layer:-1, s: 1 },
};

// Ctrl/Cmd + 1-6 = whole cube rotation: 1/2 x+/-, 3/4 y+/-, 5/6 z+/-
export const CUBE_ROT = {
  '1': { axis:'x', s: 1 },
  '2': { axis:'x', s:-1 },
  '3': { axis:'y', s: 1 },
  '4': { axis:'y', s:-1 },
  '5': { axis:'z', s: 1 },
  '6': { axis:'z', s:-1 },
};

// Whole-cube rotations (layer: null) for pipeline
export const PIPE_MOVES = {
  '1': { axis:'x', layer: null, s: 1  },   // X  CW
  '2': { axis:'x', layer: null, s:-1  },   // X' CCW
  '3': { axis:'y', layer: null, s: 1  },   // Y  CW
  '4': { axis:'y', layer: null, s:-1  },   // Y' CCW
  '5': { axis:'z', layer: null, s: 1  },   // Z  CW
  '6': { axis:'z', layer: null, s:-1  },   // Z' CCW
  '7': { axis:'x', layer: null, s: 2  },   // X2 180deg
  '8': { axis:'y', layer: null, s: 2  },   // Y2 180deg
  '9': { axis:'z', layer: null, s: 2  },   // Z2 180deg
};

export const LAYER_LABELS = {
  '1': 'R ↻ x+1', '2': 'M ↺ x·0', '3': 'L ↺ x-1',
  '4': 'U ↻ y+1', '5': 'E ↺ y·0', '6': 'D ↺ y-1',
  '7': 'F ↺ z+1', '8': 'S ↺ z·0', '9': 'B ↻ z-1',
};

export const CUBE_LABELS = {
  '0': 'skip',
  '1': 'X ↻',  '2': "X' ↺",
  '3': 'Y ↻',  '4': "Y' ↺",
  '5': 'Z ↻',  '6': "Z' ↺",
  '7': 'X2',   '8': 'Y2',   '9': 'Z2',
};
