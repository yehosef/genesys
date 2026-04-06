// ── URL recipe encode/decode ──────────────────────────────────────────
// Encodes/decodes pipeline configuration to/from URL hash strings.
// Supports v2 chain format and backward-compatible v1 decoding.

import { SOURCE_PRESETS, SOURCE_DISPLAY } from './source.js';
import { toAminoKey, parseAminoKey, DEFAULT_AMINO_KEY } from '../data/amino.js';
import { serializeChain, deserializeChain } from './chain.js';

/**
 * Encode pipeline state as a v2 URL hash.
 *
 * @param {Object} state
 * @param {string} state.pSrcPreset
 * @param {string} state.pSourceText
 * @param {Object[]} state.pChain - chain step array
 * @param {Function} state.toKey - (letters) => string
 * @param {string[]} state.letters - current letter assignment
 * @returns {string} hash string starting with '#recipe='
 */
export function encodeRecipe(state) {
  const parts = ['v2'];
  parts.push('src:' + (SOURCE_PRESETS[state.pSrcPreset] ? state.pSrcPreset : encodeURIComponent(state.pSourceText.slice(0, 200))));
  parts.push('chain:' + serializeChain(state.pChain));
  const akey = toAminoKey();
  if (akey !== DEFAULT_AMINO_KEY) parts.push('amap:' + akey);
  return '#recipe=' + parts.join('|');
}

/**
 * Decode a hash string into a recipe object (v2 format only).
 *
 * @param {string} hash
 * @returns {{ src: string, chain: Object[], amap: string|null, version: number } | null}
 */
export function decodeRecipe(hash) {
  if (!hash.startsWith('#recipe=')) return null;
  const raw = hash.slice(8);
  if (!raw.startsWith('v2|')) return null;
  return decodeV2(raw.slice(3));
}

function decodeV2(raw) {
  const recipe = { src: 'mezuzah', chain: null, amap: null, version: 2 };
  const parts = raw.split('|');
  for (const p of parts) {
    const [k, ...rest] = p.split(':');
    const v = rest.join(':');
    if (k === 'src') recipe.src = v;
    if (k === 'chain') recipe.chain = deserializeChain(v);
    if (k === 'amap') recipe.amap = v;
  }
  if (!recipe.chain) recipe.chain = deserializeChain('');
  return recipe;
}

/**
 * Apply a decoded recipe to restore pipeline state.
 * Returns a config object — DOM updates are the caller's responsibility.
 *
 * @param {Object} recipe - As returned by decodeRecipe()
 * @param {Object} engineState - Engine setters
 * @param {Object} uiFunctions - Cube/panel helpers
 */
export function applyRecipe(recipe, engineState, uiFunctions) {
  if (!recipe) return;

  // Source
  if (SOURCE_PRESETS[recipe.src]) {
    engineState.setPSrcPreset(recipe.src);
    engineState.setPSourceText(SOURCE_PRESETS[recipe.src]);
  } else {
    engineState.setPSrcPreset('custom');
    engineState.setPSourceText(decodeURIComponent(recipe.src));
  }

  // Chain
  engineState.setPChain(recipe.chain);

  // Apply cube-reset steps: find last cube-reset and apply its key
  const cubeResets = recipe.chain.filter(s => s.type === 'cube-reset');
  if (cubeResets.length && uiFunctions.parseKey) {
    const lastReset = cubeResets[cubeResets.length - 1];
    const parsed = uiFunctions.parseKey(lastReset.key);
    if (parsed) {
      uiFunctions.setLetters(parsed);
      uiFunctions.buildCube();
      uiFunctions.renderPanel();
    }
  }

  // Amino acid mapping
  if (recipe.amap) parseAminoKey(recipe.amap);

  // Update source UI
  const srcTextarea = document.getElementById('source-textarea');
  const currentPreset = SOURCE_PRESETS[recipe.src] ? recipe.src : 'custom';
  if (srcTextarea) {
    srcTextarea.value = SOURCE_DISPLAY[currentPreset] || decodeURIComponent(recipe.src);
  }
  const srcCount = document.getElementById('source-count');
  const srcText = SOURCE_PRESETS[recipe.src] || decodeURIComponent(recipe.src);
  if (srcCount) srcCount.textContent = [...srcText].length + ' letters';

  document.querySelectorAll('#src-presets .stage-preset').forEach(b => {
    b.classList.toggle('active', b.dataset.srcPreset === currentPreset);
  });
  const pillSrc = document.getElementById('pill-sub-source');
  if (pillSrc) {
    pillSrc.textContent = currentPreset === 'mezuzah' ? 'Mezuzah' : currentPreset === 'genesis' ? 'Genesis 1:1' : 'Custom';
  }

  // Update mapping pill
  const pillMap = document.getElementById('pill-sub-map');
  if (pillMap) pillMap.textContent = toAminoKey() === DEFAULT_AMINO_KEY ? 'Default' : 'Custom';

  // Update cube pill
  const letters = uiFunctions.getLetters();
  const isDefault = letters.every((l, i) => l === uiFunctions.DEFAULT_LETTERS[i]);
  const pillCube = document.getElementById('pill-sub-cube');
  if (pillCube) pillCube.textContent = isDefault ? 'Default' : 'Custom';

  engineState.pReset();
}
