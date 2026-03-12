// ── Amino acid sequence properties (client-side, no API) ────────────
// Computes physicochemical properties from an amino acid sequence string.

// Kyte-Doolittle hydrophobicity scale
const HYDRO = {
  I: 4.5, V: 4.2, L: 3.8, F: 2.8, C: 2.5, M: 1.9, A: 1.8,
  G: -0.4, T: -0.7, S: -0.8, W: -0.9, Y: -1.3, P: -1.6,
  H: -3.2, D: -3.5, E: -3.5, N: -3.5, Q: -3.5, K: -3.9, R: -4.5,
};

// Average molecular weights (Da) of amino acid residues (minus water)
const MW = {
  G: 57.02, A: 71.04, V: 99.07, L: 113.08, I: 113.08,
  P: 97.05, F: 147.07, W: 186.08, M: 131.04, S: 87.03,
  T: 101.05, C: 103.01, Y: 163.06, N: 114.04, D: 115.03,
  E: 129.04, Q: 128.06, H: 137.06, K: 128.09, R: 156.10,
};

// Charge at pH 7 (approximate)
const CHARGE = {
  D: -1, E: -1, K: 1, R: 1, H: 0.1,
};

// One-letter to three-letter codes
const THREE_LETTER = {
  G:'Gly',A:'Ala',V:'Val',L:'Leu',I:'Ile',P:'Pro',F:'Phe',W:'Trp',
  M:'Met',S:'Ser',T:'Thr',C:'Cys',Y:'Tyr',N:'Asn',D:'Asp',E:'Glu',
  Q:'Gln',H:'His',K:'Lys',R:'Arg',
};

// Amino acid categories
const CATEGORIES = {
  hydrophobic: new Set(['A','V','L','I','P','F','W','M']),
  polar:       new Set(['S','T','C','Y','N','Q']),
  positive:    new Set(['K','R','H']),
  negative:    new Set(['D','E']),
  aromatic:    new Set(['F','W','Y','H']),
  tiny:        new Set(['G','A','S']),
};

/**
 * Analyze an amino acid sequence string (one-letter codes, no stops).
 * @param {string} seq - e.g. "MVLSPADK..."
 * @returns {Object} properties
 */
export function analyzeSequence(seq) {
  const aa = seq.replace(/[^A-Z]/g, '').replace(/\*/g, '');
  const len = aa.length;
  if (len === 0) return null;

  // Composition
  const composition = {};
  for (const ch of aa) {
    composition[ch] = (composition[ch] || 0) + 1;
  }

  // Molecular weight (sum of residues + water for the whole chain)
  let molWeight = 18.02; // water
  for (const ch of aa) molWeight += (MW[ch] || 110); // 110 avg fallback

  // Net charge at pH 7
  let netCharge = 0;
  for (const ch of aa) netCharge += (CHARGE[ch] || 0);

  // Hydrophobicity (average Kyte-Doolittle)
  let totalHydro = 0;
  for (const ch of aa) totalHydro += (HYDRO[ch] || 0);
  const avgHydro = totalHydro / len;

  // GRAVY (Grand Average of Hydropathy) = same as avgHydro
  const gravy = avgHydro;

  // Category percentages
  const catPct = {};
  for (const [cat, aas] of Object.entries(CATEGORIES)) {
    let count = 0;
    for (const ch of aa) if (aas.has(ch)) count++;
    catPct[cat] = (count / len * 100).toFixed(1);
  }

  // Isoelectric point estimate (very rough)
  // Count charged residues
  const nK = composition['K'] || 0;
  const nR = composition['R'] || 0;
  const nH = composition['H'] || 0;
  const nD = composition['D'] || 0;
  const nE = composition['E'] || 0;
  const pI = (nK + nR + nH) > (nD + nE) ? 'basic (>7)' : (nK + nR + nH) < (nD + nE) ? 'acidic (<7)' : '~neutral';

  return {
    length: len,
    composition,
    molWeight: Math.round(molWeight),
    netCharge: Math.round(netCharge * 10) / 10,
    gravy: Math.round(gravy * 100) / 100,
    pI,
    categories: catPct,
  };
}

/**
 * Compute a hydrophobicity profile (sliding window).
 * @param {string} seq - amino acid sequence
 * @param {number} window - window size (default 7)
 * @returns {number[]} array of hydrophobicity values
 */
export function hydrophobicityProfile(seq, window = 7) {
  const aa = seq.replace(/[^A-Z]/g, '').replace(/\*/g, '');
  if (aa.length < window) return [];
  const half = Math.floor(window / 2);
  const profile = [];
  for (let i = half; i < aa.length - half; i++) {
    let sum = 0;
    for (let j = i - half; j <= i + half; j++) {
      sum += HYDRO[aa[j]] || 0;
    }
    profile.push(Math.round((sum / window) * 100) / 100);
  }
  return profile;
}

/**
 * Split sequence at stop codons (*) into protein segments.
 * @param {string} seq - amino acid sequence possibly containing '*'
 * @returns {string[]} array of non-empty segments
 */
export function splitAtStops(seq) {
  return seq.split('*').filter(s => s.length > 0);
}

/**
 * Convert sequence to FASTA format.
 * @param {string} seq
 * @param {string} header - FASTA header (without >)
 * @returns {string}
 */
export function toFasta(seq, header = 'GeneSys_output') {
  const lines = ['>' + header];
  const clean = seq.replace(/\*/g, '');
  for (let i = 0; i < clean.length; i += 60) {
    lines.push(clean.slice(i, i + 60));
  }
  return lines.join('\n');
}

export { HYDRO, MW, THREE_LETTER, CATEGORIES };
