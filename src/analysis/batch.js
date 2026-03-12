// ── Batch pipeline runner ────────────────────────────────────────────
// Uses pure permutation algebra to run many pipeline configurations
// and compare outputs. No Three.js, no DOM — can run in a worker.

import { runPipelinePure } from '../cube/permutation.js';
import { getDigits } from '../data/digits.js';
import { HEBREW_22, FINAL_TO_BASE } from '../data/hebrew.js';
import { ATBASH, ALBAM, AVGAD } from '../pipeline/transforms.js';
import { analyzeSequence, splitAtStops } from './properties.js';

/**
 * Score a sequence by how "protein-like" it is.
 * Higher = more protein-like.
 * Considers: length, amino acid diversity, charge balance, no excessive stops.
 */
function proteinScore(aaSeq) {
  const segments = splitAtStops(aaSeq);
  if (segments.length === 0) return 0;

  // Find the longest segment
  const longest = segments.reduce((a, b) => a.length > b.length ? a : b);
  if (longest.length < 10) return 0;

  const props = analyzeSequence(longest);
  if (!props) return 0;

  let score = 0;

  // Reward reasonable length (100-500 residues is typical)
  if (props.length >= 50 && props.length <= 800) score += 20;
  if (props.length >= 100 && props.length <= 500) score += 10;

  // Reward amino acid diversity (real proteins use all 20)
  const uniqueAA = Object.keys(props.composition).length;
  score += uniqueAA * 2; // max 40

  // Penalize extreme hydrophobicity
  if (Math.abs(props.gravy) < 1.0) score += 10;
  if (Math.abs(props.gravy) < 0.5) score += 10;

  // Reward near-neutral charge
  const chargePerResidue = Math.abs(props.netCharge) / props.length;
  if (chargePerResidue < 0.1) score += 10;
  if (chargePerResidue < 0.05) score += 5;

  // Penalize too many stop codons (many segments = bad)
  score -= (segments.length - 1) * 3;

  return Math.max(0, score);
}

/**
 * Run a batch of pipeline configurations.
 * @param {Object} opts
 * @param {string[]} opts.initialState - 27-letter initial cube state
 * @param {string} opts.sourceText - Hebrew source text
 * @param {string[]} [opts.rotSources] - rotation sources to try (default: all)
 * @param {string[]} [opts.moveModes] - move modes to try (default: both)
 * @param {string[]} [opts.transforms] - pre-transforms to try (default: none + all ciphers)
 * @param {Function} [opts.aminoLookup] - letter -> amino acid function
 * @returns {{ configs: Object[], best: Object }}
 */
export function batchRun({
  initialState,
  sourceText,
  rotSources = ['pi', 'e', 'phi', 'fib'],
  moveModes = ['layers', 'cube'],
  transforms = ['none', 'atbash', 'albam', 'avgad'],
  aminoLookup,
}) {
  const cipherMaps = { atbash: ATBASH, albam: ALBAM, avgad: AVGAD };
  const results = [];

  for (const rotSrc of rotSources) {
    const rotSeq = getDigits(rotSrc);
    for (const mode of moveModes) {
      for (const transform of transforms) {
        // Apply pre-transform to source text
        let srcText = sourceText;
        if (transform !== 'none' && cipherMaps[transform]) {
          const map = cipherMaps[transform];
          srcText = [...sourceText].map(ch => {
            const base = FINAL_TO_BASE[ch] || ch;
            return map[base] || ch;
          }).join('');
        }

        const result = runPipelinePure(initialState, srcText, rotSeq, mode);

        // Convert output to amino acid sequence
        let aaSeq = '';
        if (aminoLookup) {
          aaSeq = result.output.map(ch => aminoLookup(ch)).join('');
        }

        const config = {
          rotSource: rotSrc,
          moveMode: mode,
          transform,
          outputLength: result.output.length,
          changedCount: result.steps.filter(s => !s.same).length,
          changeRate: result.steps.filter(s => !s.same).length / result.steps.length,
          aaSequence: aaSeq,
          score: aaSeq ? proteinScore(aaSeq) : 0,
        };

        results.push(config);
      }
    }
  }

  results.sort((a, b) => b.score - a.score);

  return {
    configs: results,
    best: results[0] || null,
    summary: {
      totalConfigs: results.length,
      avgScore: results.reduce((s, r) => s + r.score, 0) / results.length,
      maxScore: results[0]?.score || 0,
      avgChangeRate: results.reduce((s, r) => s + r.changeRate, 0) / results.length,
    },
  };
}
