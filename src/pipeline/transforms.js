// ── Transform registry ────────────────────────────────────────────────
// Registry pattern for pipeline transforms.
// Each transform: { name, label, apply(inputLetters, cubeState) => outputLetters }
//
// The cube transform registers itself from cube modules — this keeps
// the pipeline independent of Three.js / cube internals.

const transforms = new Map();

/**
 * Register a named transform function.
 * @param {string} name - Unique identifier
 * @param {{ name: string, label: string, apply: (inputLetters: string[], cubeState: string[]) => string[] }} transformFn
 */
export function registerTransform(name, transformFn) {
  transforms.set(name, transformFn);
}

/**
 * Retrieve a transform by name.
 * @param {string} name
 * @returns {{ name: string, label: string, apply: Function } | undefined}
 */
export function getTransform(name) {
  return transforms.get(name);
}

/**
 * List all registered transform names.
 * @returns {string[]}
 */
export function listTransforms() {
  return [...transforms.keys()];
}

// ── Built-in: identity (passthrough) ─────────────────────────────────
registerTransform('identity', {
  name: 'identity',
  label: 'None',
  apply(inputLetters, _cubeState) {
    return [...inputLetters];
  },
});

// ── Hebrew cipher transforms ────────────────────────────────────────

import { HEBREW_22, FINAL_TO_BASE } from '../data/hebrew.js';

// Helper: build a substitution cipher from a mapping object, handling final forms
function cipherApply(map, inputLetters) {
  return inputLetters.map(ch => {
    const base = FINAL_TO_BASE[ch] || ch;
    return map[base] || ch;
  });
}

// ── Atbash (את-בש): reverse alphabet ────────────────────────────────
const ATBASH = {};
for (let i = 0; i < 22; i++) {
  ATBASH[HEBREW_22[i]] = HEBREW_22[21 - i];
}
registerTransform('atbash', {
  name: 'atbash',
  label: 'Atbash את-בש',
  involution: true,
  apply(inputLetters) { return cipherApply(ATBASH, inputLetters); },
});
export { ATBASH };

// ── Albam (אל-בם): swap halves (shift 11) ──────────────────────────
const ALBAM = {};
for (let i = 0; i < 22; i++) {
  ALBAM[HEBREW_22[i]] = HEBREW_22[(i + 11) % 22];
}
registerTransform('albam', {
  name: 'albam',
  label: 'Albam אל-בם',
  involution: true,
  apply(inputLetters) { return cipherApply(ALBAM, inputLetters); },
});
export { ALBAM };

// ── Avgad (אב-גד): shift forward by 1 ─────────────────────────────
const AVGAD = {};
for (let i = 0; i < 22; i++) {
  AVGAD[HEBREW_22[i]] = HEBREW_22[(i + 1) % 22];
}
registerTransform('avgad', {
  name: 'avgad',
  label: 'Avgad אב-גד',
  involution: false,
  apply(inputLetters) { return cipherApply(AVGAD, inputLetters); },
});
export { AVGAD };

// ── Avgad Reverse: shift backward by 1 ─────────────────────────────
const AVGAD_REV = {};
for (let i = 0; i < 22; i++) {
  AVGAD_REV[HEBREW_22[i]] = HEBREW_22[(i + 21) % 22];
}
registerTransform('avgad-rev', {
  name: 'avgad-rev',
  label: 'Avgad Rev',
  involution: false,
  apply(inputLetters) { return cipherApply(AVGAD_REV, inputLetters); },
});

// ── Achbi (אכ-בי): pair by folded rows ─────────────────────────────
// Row 1 fwd: א ב ג ד ה ו ז ח ט י כ
// Row 2 rev: ת ש ר ק צ פ ע ס נ מ ל
// Pairs: א↔כ ב↔י ג↔ט ד↔ח ה↔ז ו=ו ל↔ת מ↔ש נ↔ר ס↔ק ע↔צ פ=פ
const ACHBI = {};
const achbiPairs = [
  ['א','כ'],['ב','י'],['ג','ט'],['ד','ח'],['ה','ז'],
  ['ל','ת'],['מ','ש'],['נ','ר'],['ס','ק'],['ע','צ'],
];
for (const [a, b] of achbiPairs) {
  ACHBI[a] = b; ACHBI[b] = a;
}
// ו and פ are fixed points
ACHBI['ו'] = 'ו';
ACHBI['פ'] = 'פ';
registerTransform('achbi', {
  name: 'achbi',
  label: 'Achbi אכ-בי',
  involution: true,
  apply(inputLetters) { return cipherApply(ACHBI, inputLetters); },
});

// ── Ayak Bachar: group by unit digit value ──────────────────────────
// Letters with same unit digit are interchangeable in 3-cycles or 2-cycles
// א(1)→י(10)→ק(100)→א, ב(2)→כ(20)→ר(200)→ב, etc.
const AYAK = {};
const ayakTriples = [
  ['א','י','ק'], ['ב','כ','ר'], ['ג','ל','ש'], ['ד','מ','ת'],
];
for (const [a, b, c] of ayakTriples) {
  AYAK[a] = b; AYAK[b] = c; AYAK[c] = a;
}
const ayakPairs = [
  ['ה','נ'], ['ו','ס'], ['ז','ע'], ['ח','פ'], ['ט','צ'],
];
for (const [a, b] of ayakPairs) {
  AYAK[a] = b; AYAK[b] = a;
}
registerTransform('ayak', {
  name: 'ayak',
  label: 'Ayak Bachar',
  involution: false,
  apply(inputLetters) { return cipherApply(AYAK, inputLetters); },
});

// ── Milui (מילוי): expand each letter to its spelled-out name ───────
const MILUI_SPELLINGS = {
  'א': 'אלף', 'ב': 'בית', 'ג': 'גימל', 'ד': 'דלת',
  'ה': 'הא', 'ו': 'ואו', 'ז': 'זין', 'ח': 'חית',
  'ט': 'טית', 'י': 'יוד', 'כ': 'כף', 'ל': 'למד',
  'מ': 'מם', 'נ': 'נון', 'ס': 'סמך', 'ע': 'עין',
  'פ': 'פא', 'צ': 'צדי', 'ק': 'קוף', 'ר': 'ריש',
  'ש': 'שין', 'ת': 'תו',
};
export { MILUI_SPELLINGS };

registerTransform('milui', {
  name: 'milui',
  label: 'Milui מילוי',
  expansion: true,
  apply(inputLetters) {
    const result = [];
    for (const ch of inputLetters) {
      const base = FINAL_TO_BASE[ch] || ch;
      const spelling = MILUI_SPELLINGS[base];
      if (spelling) {
        result.push(...spelling);
      } else {
        result.push(ch);
      }
    }
    return result;
  },
});
