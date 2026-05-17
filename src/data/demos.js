// ── Pre-built demo experiments ─────────────────────────────────────────
// Named pipeline configurations for the experiments gallery.
// Each experiment encodes a complete pipeline as a recipe hash.

export const DEMO_EXPERIMENTS = [
  {
    id: 'genesis-direct',
    name: 'Genesis 1:1 — Direct',
    description: 'Raw mapping of the first Torah verse. No transformation — each letter maps directly to its amino acid. The baseline to compare everything else against.',
    source: 'Genesis 1:1',
    chainLabel: 'No transform',
    icon: '📜',
    recipe: '#recipe=v2|src:genesis-1-1|chain:',
  },
  {
    id: 'genesis-atbash',
    name: 'Genesis 1:1 — Mirror (Atbash)',
    description: 'Atbash mirrors each letter to its opposite (א↔ת, ב↔ש...). The first verse reflected through the alphabet.',
    source: 'Genesis 1:1',
    chainLabel: 'Atbash',
    icon: '🔄',
    recipe: '#recipe=v2|src:genesis-1-1|chain:c.atbash',
  },
  {
    id: 'priestly-pi',
    name: 'Priestly Blessing — π Cipher',
    description: 'The 72-letter priestly blessing (Numbers 6:24-26) encoded through π-driven cube rotations. Each digit of π selects a layer rotation.',
    source: 'Priestly Blessing',
    chainLabel: 'π rotation',
    icon: '✡',
    recipe: '#recipe=v2|src:priestly-blessing|chain:r.pi.layers',
  },
  {
    id: 'creation-atbash-phi',
    name: 'First Day — Atbash + φ',
    description: 'Genesis 1:1-5: mirrored through Atbash then permuted by the golden ratio spiral. Two classical systems in sequence.',
    source: 'First Day of Creation',
    chainLabel: 'Atbash → φ rotation',
    icon: '🌅',
    recipe: '#recipe=v2|src:genesis-1-1-5|chain:c.atbash,r.phi.layers',
  },
  {
    id: 'ana-bekhoach-milui',
    name: 'Ana BeKoach — Expansion',
    description: 'The kabbalistic 42-letter Name expanded via Milui — each letter spelled out in full. From 42 letters to their full representation.',
    source: 'Ana BeKoach',
    chainLabel: 'Milui expansion',
    icon: '✨',
    recipe: '#recipe=v2|src:ana-bekhoach|chain:x.milui',
  },
  {
    id: 'shema-e',
    name: 'Shema — e Cipher',
    description: "The full Shema passage (Deuteronomy 6:4-9, 11:13-21) encoded through Euler's number. 713 letters through e-driven permutations.",
    source: 'Mezuzah (Shema)',
    chainLabel: 'e rotation',
    icon: '🕍',
    recipe: '#recipe=v2|src:mezuzah|chain:r.e.layers',
  },
];

// ── Transform presets ──────────────────────────────────────────────────
// Named chain configurations for quick selection in the pipeline bar.
// Each maps to a pre-built chain array.

export const TRANSFORM_PRESETS = [
  {
    id: 'direct',
    label: 'Direct (no transform)',
    chain: [],
  },
  {
    id: 'atbash',
    label: 'Atbash Mirror',
    chain: [{ type: 'cipher', transform: 'atbash' }],
  },
  {
    id: 'albam',
    label: 'Albam',
    chain: [{ type: 'cipher', transform: 'albam' }],
  },
  {
    id: 'pi',
    label: 'π Cipher',
    chain: [{ type: 'cube-rotation', rotSrc: 'pi', moveMode: 'layers', rotCustom: [], rotHebrew: '' }],
  },
  {
    id: 'phi',
    label: 'φ Golden Ratio',
    chain: [{ type: 'cube-rotation', rotSrc: 'phi', moveMode: 'layers', rotCustom: [], rotHebrew: '' }],
  },
  {
    id: 'e',
    label: "e (Euler's)",
    chain: [{ type: 'cube-rotation', rotSrc: 'e', moveMode: 'layers', rotCustom: [], rotHebrew: '' }],
  },
  {
    id: 'atbash-pi',
    label: 'Atbash + π',
    chain: [
      { type: 'cipher', transform: 'atbash' },
      { type: 'cube-rotation', rotSrc: 'pi', moveMode: 'layers', rotCustom: [], rotHebrew: '' },
    ],
  },
  {
    id: 'atbash-phi',
    label: 'Atbash + φ',
    chain: [
      { type: 'cipher', transform: 'atbash' },
      { type: 'cube-rotation', rotSrc: 'phi', moveMode: 'layers', rotCustom: [], rotHebrew: '' },
    ],
  },
  {
    id: 'milui',
    label: 'Milui Expansion',
    chain: [{ type: 'expansion', transform: 'milui' }],
  },
];
