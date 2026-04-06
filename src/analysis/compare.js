// ── Comparative analysis engine ──────────────────────────────────────
// Runs multiple source texts through the same pipeline configuration
// and compares the resulting amino acid sequences.
// Pure logic — no DOM, no Three.js, no UI.

import { runChainPure } from '../pipeline/chain.js';
import { getSource, SOURCE_LIBRARY } from '../data/sources.js';
import { DEFAULT_LETTERS } from '../data/hebrew.js';
import { parseKey } from '../cube/state.js';
import { aminoLookup } from '../data/amino.js';
import { analyzeSequence, splitAtStops, CATEGORIES } from './properties.js';

// ── Helpers ─────────────────────────────────────────────────────────

/** Resolve initial cube state from a pipelineConfig's cubeKey or use default. */
function resolveInitialState(cubeKey) {
  if (cubeKey) {
    const parsed = parseKey(cubeKey);
    if (parsed) return parsed;
  }
  return [...DEFAULT_LETTERS];
}

/** Classify a single amino acid into its primary category. */
function classifyAA(aa) {
  for (const [cat, aas] of Object.entries(CATEGORIES)) {
    if (aas.has(aa)) return cat;
  }
  return 'other';
}

// ── 1. compareTexts ─────────────────────────────────────────────────

/**
 * Run multiple source texts through the same pipeline configuration.
 * @param {string[]} sourceIds - IDs from the SOURCE_LIBRARY
 * @param {{ chain: Object[], cubeKey: string|null }} pipelineConfig
 * @returns {Object[]} array of { sourceId, name, aminoSequence, properties, segments }
 */
export function compareTexts(sourceIds, pipelineConfig) {
  const { chain, cubeKey = null } = pipelineConfig;
  const results = [];

  for (const sourceId of sourceIds) {
    const src = getSource(sourceId);
    if (!src) continue;

    // Each run starts from the same initial cube state
    const initialState = resolveInitialState(cubeKey);
    const srcLetters = [...src.text];
    const result = runChainPure(initialState, srcLetters, chain);

    // Map output letters to amino acids
    const aminoSequence = result.finalOutput.map(ch => aminoLookup(ch)).join('');
    const segments = splitAtStops(aminoSequence);
    const longest = segments.reduce((a, b) => a.length > b.length ? a : b, '');
    const properties = analyzeSequence(longest);

    results.push({
      sourceId,
      name: src.name,
      nameHe: src.nameHe,
      category: src.category,
      reference: src.reference,
      aminoSequence,
      properties,
      segments,
      textLength: srcLetters.length,
    });
  }

  return results;
}

// ── 2. similarityMatrix ─────────────────────────────────────────────

/**
 * Compute pairwise similarity between all sequences.
 * Metric: proportion of shared amino acids at each aligned position,
 * normalized by the shorter sequence length.
 * @param {Object[]} results - output from compareTexts
 * @returns {{ matrix: number[][], labels: string[] }}
 */
export function similarityMatrix(results) {
  const n = results.length;
  const matrix = Array.from({ length: n }, () => new Array(n).fill(0));
  const labels = results.map(r => r.sourceId);

  for (let i = 0; i < n; i++) {
    matrix[i][i] = 1.0; // self-similarity is 1
    const seqA = results[i].aminoSequence;

    for (let j = i + 1; j < n; j++) {
      const seqB = results[j].aminoSequence;
      const minLen = Math.min(seqA.length, seqB.length);
      if (minLen === 0) {
        matrix[i][j] = 0;
        matrix[j][i] = 0;
        continue;
      }

      let matches = 0;
      for (let k = 0; k < minLen; k++) {
        if (seqA[k] === seqB[k]) matches++;
      }

      const similarity = matches / minLen;
      matrix[i][j] = Math.round(similarity * 1000) / 1000;
      matrix[j][i] = matrix[i][j];
    }
  }

  return { matrix, labels };
}

// ── 3. differenceProfile ────────────────────────────────────────────

/**
 * Detailed position-by-position comparison of two results.
 * @param {Object} resultA - single entry from compareTexts output
 * @param {Object} resultB - single entry from compareTexts output
 * @returns {Object} { positions, summary }
 */
export function differenceProfile(resultA, resultB) {
  const seqA = resultA.aminoSequence;
  const seqB = resultB.aminoSequence;
  const maxLen = Math.max(seqA.length, seqB.length);
  const minLen = Math.min(seqA.length, seqB.length);

  const positions = [];
  let matchCount = 0;
  const categoryChanges = {};

  for (let i = 0; i < maxLen; i++) {
    const aaA = seqA[i] || '-';
    const aaB = seqB[i] || '-';
    const match = aaA === aaB;

    if (match) {
      matchCount++;
    } else {
      const catA = aaA === '-' ? 'gap' : classifyAA(aaA);
      const catB = aaB === '-' ? 'gap' : classifyAA(aaB);
      const changeKey = `${catA}→${catB}`;
      categoryChanges[changeKey] = (categoryChanges[changeKey] || 0) + 1;

      positions.push({ index: i, aaA, aaB, catA, catB });
    }
  }

  return {
    sourceA: { id: resultA.sourceId, name: resultA.name },
    sourceB: { id: resultB.sourceId, name: resultB.name },
    positions,
    summary: {
      lengthA: seqA.length,
      lengthB: seqB.length,
      alignedLength: minLen,
      totalDifferences: positions.length,
      matchCount,
      identity: minLen > 0
        ? Math.round((matchCount / minLen) * 1000) / 1000
        : 0,
      categoryChanges,
    },
  };
}

// ── 4. rankByProperty ───────────────────────────────────────────────

/**
 * Sort results by a numeric property from analyzeSequence output.
 * @param {Object[]} results - output from compareTexts
 * @param {string} property - 'gravy', 'molWeight', 'netCharge', 'length', or a category key
 * @returns {Object[]} sorted array with { rank, sourceId, name, value }
 */
export function rankByProperty(results, property) {
  const ranked = results
    .map(r => {
      let value;
      if (!r.properties) {
        value = null;
      } else if (property in r.properties) {
        value = r.properties[property];
      } else if (r.properties.categories && property in r.properties.categories) {
        value = parseFloat(r.properties.categories[property]);
      } else {
        value = null;
      }
      return { sourceId: r.sourceId, name: r.name, value };
    })
    .filter(r => r.value !== null && typeof r.value === 'number' && !isNaN(r.value))
    .sort((a, b) => b.value - a.value);

  return ranked.map((r, i) => ({ ...r, rank: i + 1 }));
}

// ── 5. findAnomalies ────────────────────────────────────────────────

/**
 * Identify sequences that are statistical outliers in any numeric property.
 * An outlier is >2 standard deviations from the mean.
 * @param {Object[]} results - output from compareTexts
 * @returns {Object[]} array of { sourceId, name, property, value, mean, stdDev, zScore }
 */
export function findAnomalies(results) {
  const numericProps = ['length', 'molWeight', 'netCharge', 'gravy'];
  const anomalies = [];

  for (const prop of numericProps) {
    const values = results
      .filter(r => r.properties && typeof r.properties[prop] === 'number')
      .map(r => ({ sourceId: r.sourceId, name: r.name, value: r.properties[prop] }));

    if (values.length < 3) continue; // need at least 3 data points

    const mean = values.reduce((s, v) => s + v.value, 0) / values.length;
    const variance = values.reduce((s, v) => s + (v.value - mean) ** 2, 0) / values.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) continue;

    for (const v of values) {
      const zScore = (v.value - mean) / stdDev;
      if (Math.abs(zScore) > 2) {
        anomalies.push({
          sourceId: v.sourceId,
          name: v.name,
          property: prop,
          value: v.value,
          mean: Math.round(mean * 100) / 100,
          stdDev: Math.round(stdDev * 100) / 100,
          zScore: Math.round(zScore * 100) / 100,
        });
      }
    }
  }

  // Sort by absolute z-score descending (most extreme first)
  anomalies.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
  return anomalies;
}
