// ── Source text management ────────────────────────────────────────────
// Provides preset source texts and display variants for the pipeline.
// No DOM manipulation — pure data.
// Re-exports from the centralized source library.

import {
  SOURCE_LIBRARY, SOURCE_CATEGORIES, getSource, getSourcesByCategory,
} from '../data/sources.js';

// Re-export for consumers
export { SOURCE_LIBRARY, SOURCE_CATEGORIES, getSource, getSourcesByCategory };

// ── Backward-compatible exports ──────────────────────────────────────

const mezSrc = getSource('mezuzah');
const genSrc = getSource('genesis-1-1');

export const MEZUZAH_DISPLAY = mezSrc ? mezSrc.display : '';
export const MEZUZAH_TEXT    = mezSrc ? mezSrc.text    : '';
export const GENESIS_DISPLAY = genSrc ? genSrc.display : '';
export const GENESIS_TEXT    = genSrc ? genSrc.text    : '';

// Legacy preset map — also supports any library ID
export const SOURCE_PRESETS = {
  mezuzah: MEZUZAH_TEXT,
  genesis: GENESIS_TEXT,
};

export const SOURCE_DISPLAY = {
  mezuzah: MEZUZAH_DISPLAY,
  genesis: GENESIS_DISPLAY,
};

/**
 * Get the pipeline text (consonants only) for any source library ID.
 * Falls back to legacy SOURCE_PRESETS for 'mezuzah'/'genesis'.
 */
export function getSourceText(id) {
  const entry = getSource(id);
  if (entry) return entry.text;
  return SOURCE_PRESETS[id] || '';
}

/**
 * Get the display text (with spaces) for any source library ID.
 * Falls back to legacy SOURCE_DISPLAY for 'mezuzah'/'genesis'.
 */
export function getSourceDisplay(id) {
  const entry = getSource(id);
  if (entry) return entry.display;
  return SOURCE_DISPLAY[id] || '';
}
