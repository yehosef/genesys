// ── Batch pipeline runner ────────────────────────────────────────────
// Uses pure permutation algebra to run many pipeline configurations
// and compare outputs. No Three.js, no DOM — can run in a worker.

import { runChainPure } from '../pipeline/chain.js';
import { getDigits } from '../data/digits.js';
import { analyzeSequence, splitAtStops } from './properties.js';

/**
 * Score a sequence by how "protein-like" it is.
 */
function proteinScore(aaSeq) {
  const segments = splitAtStops(aaSeq);
  if (segments.length === 0) return 0;

  const longest = segments.reduce((a, b) => a.length > b.length ? a : b);
  if (longest.length < 10) return 0;

  const props = analyzeSequence(longest);
  if (!props) return 0;

  let score = 0;

  if (props.length >= 50 && props.length <= 800) score += 20;
  if (props.length >= 100 && props.length <= 500) score += 10;

  const uniqueAA = Object.keys(props.composition).length;
  score += uniqueAA * 2;

  if (Math.abs(props.gravy) < 1.0) score += 10;
  if (Math.abs(props.gravy) < 0.5) score += 10;

  const chargePerResidue = Math.abs(props.netCharge) / props.length;
  if (chargePerResidue < 0.1) score += 10;
  if (chargePerResidue < 0.05) score += 5;

  score -= (segments.length - 1) * 3;

  return Math.max(0, score);
}

/**
 * Run a batch of pipeline configurations using runChainPure.
 * @param {Object} opts
 * @param {string[]} opts.initialState - 27-letter initial cube state
 * @param {string} opts.sourceText - Hebrew source text
 * @param {string[]} [opts.rotSources] - rotation sources to try
 * @param {string[]} [opts.moveModes] - move modes to try
 * @param {string[]} [opts.transforms] - pre-transforms to try
 * @param {Function} [opts.aminoLookup] - letter -> amino acid function
 * @returns {{ configs: Object[], best: Object }}
 */
export function batchRun({
  initialState,
  sourceText,
  rotSources = ['pi', 'e', 'phi', 'fib'],
  moveModes = ['layers', 'cube'],
  transforms = ['none', 'atbash', 'albam', 'avgad', 'avgad-rev', 'achbi', 'ayak', 'milui'],
  aminoLookup,
}) {
  const results = [];
  const srcLetters = [...sourceText];

  for (const rotSrc of rotSources) {
    for (const mode of moveModes) {
      for (const transform of transforms) {
        // Build chain for this configuration
        const chain = [];
        if (transform !== 'none') {
          // Determine step type based on transform name
          const stepType = transform === 'milui' ? 'expansion' : 'cipher';
          chain.push({ type: stepType, transform });
        }
        chain.push({ type: 'cube-rotation', rotSrc, moveMode: mode, rotCustom: [], rotHebrew: '' });

        const result = runChainPure(initialState, srcLetters, chain);

        // Convert output to amino acid sequence
        let aaSeq = '';
        if (aminoLookup) {
          aaSeq = result.finalOutput.map(ch => aminoLookup(ch)).join('');
        }

        const config = {
          rotSource: rotSrc,
          moveMode: mode,
          transform,
          outputLength: result.finalOutput.length,
          changedCount: result.finalOutput.filter((ch, i) => ch !== srcLetters[i]).length,
          changeRate: result.finalOutput.filter((ch, i) => ch !== srcLetters[i]).length / result.finalOutput.length,
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
