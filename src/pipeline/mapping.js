// ── Output mapping layer ─────────────────────────────────────────────
// Extensible registry for mapping Hebrew letters to output symbols.
// No DOM manipulation — pure data.

import {
  aminoLookup,
  AMINO_MAP,
  toAminoKey,
  parseAminoKey,
  DEFAULT_AMINO_KEY,
} from '../data/amino.js';

// Re-export amino.js functions for convenience
export { aminoLookup, AMINO_MAP, toAminoKey, parseAminoKey, DEFAULT_AMINO_KEY };

// ── Registry ─────────────────────────────────────────────────────────

const mappings = new Map();

/**
 * Register a named mapping function.
 * @param {string} name
 * @param {{ name: string, label: string, map: (hebrewLetter: string) => string }} mapFn
 */
export function registerMapping(name, mapFn) {
  mappings.set(name, mapFn);
}

/**
 * Retrieve a mapping by name.
 * @param {string} name
 * @returns {{ name: string, label: string, map: Function } | undefined}
 */
export function getMapping(name) {
  return mappings.get(name);
}

/**
 * List all registered mapping names.
 * @returns {string[]}
 */
export function listMappings() {
  return [...mappings.keys()];
}

// ── Built-in: amino acid mapping ─────────────────────────────────────
registerMapping('amino', {
  name: 'amino',
  label: 'Amino Acids',
  map(hebrewLetter) {
    return aminoLookup(hebrewLetter);
  },
});

/**
 * Map an array of Hebrew letters through a named mapping.
 * @param {string[]} hebrewLetters
 * @param {string} mappingName - defaults to 'amino'
 * @returns {string[]}
 */
export function applyMapping(hebrewLetters, mappingName = 'amino') {
  const mapping = mappings.get(mappingName);
  if (!mapping) return hebrewLetters.map(() => '?');
  return hebrewLetters.map(ch => mapping.map(ch));
}
