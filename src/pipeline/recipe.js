// ── URL recipe encode/decode ──────────────────────────────────────────
// Encodes/decodes pipeline configuration to/from URL hash strings.
// engine.js and recipe.js may reference DOM elements for now.

import { SOURCE_PRESETS, SOURCE_DISPLAY } from './source.js';
import { getDigits, hebrewToDigits } from '../data/digits.js';
import { toAminoKey, parseAminoKey, DEFAULT_AMINO_KEY } from '../data/amino.js';
import { ROT_LABELS } from './engine.js';

/**
 * Encode the current pipeline state into a URL hash string.
 *
 * @param {Object} state - Pipeline state snapshot
 * @param {string} state.pSrcPreset
 * @param {string} state.pSourceText
 * @param {string} state.pRotSrc
 * @param {number[]} state.pRotCustom
 * @param {string} state.pRotHebrew
 * @param {string} state.pMoveMode
 * @param {Function} state.toKey - (letters) => string  (cube key encoder)
 * @param {string[]} state.letters - current letter assignment
 * @returns {string} hash string starting with '#recipe='
 */
export function encodeRecipe(state) {
  const parts = [];
  parts.push('src:' + (SOURCE_PRESETS[state.pSrcPreset] ? state.pSrcPreset : encodeURIComponent(state.pSourceText.slice(0, 200))));
  parts.push('rot:' + state.pRotSrc);
  if (state.pRotSrc === 'custom' && state.pRotCustom.length) parts.push('rotd:' + state.pRotCustom.join(''));
  if (state.pRotSrc === 'hebrew' && state.pRotHebrew) parts.push('roth:' + encodeURIComponent(state.pRotHebrew.slice(0, 200)));
  parts.push('mmode:' + state.pMoveMode);
  parts.push('cube:' + state.toKey(state.letters));
  const akey = toAminoKey();
  if (akey !== DEFAULT_AMINO_KEY) parts.push('amap:' + akey);
  return '#recipe=' + parts.join('|');
}

/**
 * Decode a hash string into a recipe object.
 *
 * @param {string} hash - URL hash (e.g. '#recipe=src:mezuzah|rot:pi|...')
 * @returns {{ src: string, rot: string, cube: string|null, rotd: string|null, roth: string|null, mmode: string, amap: string|null } | null}
 */
export function decodeRecipe(hash) {
  if (!hash.startsWith('#recipe=')) return null;
  const recipe = { src: 'mezuzah', rot: 'pi', cube: null, rotd: null, roth: null, mmode: 'layers', amap: null };
  const parts = hash.slice(8).split('|');
  for (const p of parts) {
    const [k, ...rest] = p.split(':');
    const v = rest.join(':');
    if (k === 'src') recipe.src = v;
    if (k === 'rot') recipe.rot = v;
    if (k === 'rotd') recipe.rotd = v;
    if (k === 'cube') recipe.cube = v;
    if (k === 'roth') recipe.roth = v;
    if (k === 'mmode') recipe.mmode = v;
    if (k === 'amap') recipe.amap = v;
  }
  return recipe;
}

/**
 * Apply a decoded recipe to restore pipeline state.
 *
 * @param {Object} recipe - As returned by decodeRecipe()
 * @param {Object} engineState - Mutable engine state (setters)
 * @param {Function} engineState.setPSrcPreset
 * @param {Function} engineState.setPSourceText
 * @param {Function} engineState.setPRotSrc
 * @param {Function} engineState.setPRotSeq
 * @param {Function} engineState.setPRotCustom
 * @param {Function} engineState.setPRotHebrew
 * @param {Function} engineState.setPMoveMode
 * @param {Function} engineState.pReset
 * @param {Object} uiFunctions - DOM/cube interaction helpers
 * @param {Function} uiFunctions.parseKey - (key) => string[] | null
 * @param {Function} uiFunctions.setLetters - (letters) => void
 * @param {Function} uiFunctions.buildCube
 * @param {Function} uiFunctions.renderPanel
 * @param {Function} uiFunctions.renderMoveVocab
 * @param {Function} uiFunctions.getLetters - () => string[]
 * @param {string[]} uiFunctions.DEFAULT_LETTERS
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

  // Rotation
  engineState.setPRotSrc(recipe.rot);
  if (recipe.rot === 'custom' && recipe.rotd) {
    const digits = [...recipe.rotd].map(Number).filter(d => d >= 0 && d <= 9);
    engineState.setPRotSeq(digits);
    engineState.setPRotCustom([...digits]);
    const customInput = document.getElementById('rot-custom-input');
    if (customInput) customInput.value = recipe.rotd;
  } else if (recipe.rot === 'hebrew') {
    const hText = recipe.roth ? decodeURIComponent(recipe.roth) : srcText;
    engineState.setPRotHebrew(hText);
    engineState.setPRotSeq(hebrewToDigits(hText));
    const hebInput = document.getElementById('rot-hebrew-input');
    if (hebInput) hebInput.value = hText;
  } else {
    engineState.setPRotSeq(getDigits(recipe.rot));
  }

  document.querySelectorAll('#rot-presets .stage-preset').forEach(b => {
    b.classList.toggle('active', b.dataset.rot === recipe.rot);
  });
  const pillRot = document.getElementById('pill-sub-rot');
  if (pillRot) pillRot.textContent = ROT_LABELS[recipe.rot] || recipe.rot;

  // Move mode
  engineState.setPMoveMode(recipe.mmode || 'layers');
  document.querySelectorAll('#move-mode-presets .stage-preset').forEach(b => {
    b.classList.toggle('active', b.dataset.mmode === (recipe.mmode || 'layers'));
  });
  if (uiFunctions.renderMoveVocab) uiFunctions.renderMoveVocab();

  // Cube layout
  if (recipe.cube && uiFunctions.parseKey) {
    const parsed = uiFunctions.parseKey(recipe.cube);
    if (parsed) {
      uiFunctions.setLetters(parsed);
      uiFunctions.buildCube();
      uiFunctions.renderPanel();
    }
  }

  // Amino acid mapping
  if (recipe.amap) parseAminoKey(recipe.amap);
  const pillMap = document.getElementById('pill-sub-map');
  if (pillMap) pillMap.textContent = toAminoKey() === DEFAULT_AMINO_KEY ? 'Default' : 'Custom';

  // Update pill subtitle for cube
  const letters = uiFunctions.getLetters();
  const isDefault = letters.every((l, i) => l === uiFunctions.DEFAULT_LETTERS[i]);
  const pillCube = document.getElementById('pill-sub-cube');
  if (pillCube) pillCube.textContent = isDefault ? 'Default' : 'Custom';

  engineState.pReset();
}
