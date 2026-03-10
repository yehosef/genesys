import { HEBREW_22, FINAL_TO_BASE } from './hebrew.js';
export { HEBREW_22 };

export const AMINO_CODES = ['G','A','V','L','I','P','F','W','M','S','T','C','Y','N','D','E','Q','H','K','R','*'];

export const AMINO_NAMES = {
  G:'Gly',A:'Ala',V:'Val',L:'Leu',I:'Ile',P:'Pro',F:'Phe',W:'Trp',M:'Met',S:'Ser',
  T:'Thr',C:'Cys',Y:'Tyr',N:'Asn',D:'Asp',E:'Glu',Q:'Gln',H:'His',K:'Lys',R:'Arg','*':'Silent'
};

export const AMINO_FULL_NAMES = {
  G:'Glycine',A:'Alanine',V:'Valine',L:'Leucine',I:'Isoleucine',
  P:'Proline',F:'Phenylalanine',W:'Tryptophan',M:'Methionine',S:'Serine',
  T:'Threonine',C:'Cysteine',Y:'Tyrosine',N:'Asparagine',D:'Aspartic acid',
  E:'Glutamic acid',Q:'Glutamine',H:'Histidine',K:'Lysine',R:'Arginine',
  '*':'Stop codon'
};

export const AMINO_MAP = {
  'א':'*','ב':'A','ג':'V','ד':'L','ה':'I','ו':'P','ז':'F','ח':'W','ט':'M','י':'S',
  'כ':'T','ל':'C','מ':'Y','נ':'N','ס':'D','ע':'*','פ':'Q','צ':'H','ק':'K','ר':'R',
  'ש':'G','ת':'E'
};

export const DEFAULT_AMINO_KEY = HEBREW_22.map(ch => AMINO_MAP[ch]).join('');

export function aminoLookup(ch) {
  return AMINO_MAP[FINAL_TO_BASE[ch] || ch] || '?';
}

export function toAminoKey() {
  return HEBREW_22.map(ch => AMINO_MAP[ch]).join('');
}

export function parseAminoKey(key) {
  if (!key || key.length !== 22) return false;
  for (let i = 0; i < 22; i++) {
    if (!AMINO_CODES.includes(key[i])) return false;
  }
  for (let i = 0; i < 22; i++) AMINO_MAP[HEBREW_22[i]] = key[i];
  return true;
}
