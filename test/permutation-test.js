// Quick validation of permutation algebra vs Three.js cube rotations.
// Run: node --experimental-vm-modules test/permutation-test.js
// Or: bun test/permutation-test.js

import { POSITIONS, POS_LOOKUP, NUM_MOVES, PIPE_MOVES } from '../src/cube/state.js';
import {
  computeRotationPerm, composePerm, applyPerm, identityPerm,
  invertPerm, permOrder, LAYER_PERMS, CUBE_PERMS, runPipelinePure,
} from '../src/cube/permutation.js';
import { DEFAULT_LETTERS } from '../src/data/hebrew.js';
import { getDigits } from '../src/data/digits.js';

let pass = 0, fail = 0;

function assert(cond, msg) {
  if (cond) { pass++; }
  else { fail++; console.error('FAIL:', msg); }
}

// 1. Identity permutation
const id = identityPerm();
assert(id.length === 27, 'identity length');
assert(id.every((v, i) => v === i), 'identity values');

// 2. Each layer perm is length 27
for (const [key, perm] of Object.entries(LAYER_PERMS)) {
  assert(perm.length === 27, `LAYER_PERMS[${key}] length`);
  // Should be a valid permutation (each index 0-26 appears exactly once)
  const sorted = [...perm].sort((a, b) => a - b);
  assert(sorted.every((v, i) => v === i), `LAYER_PERMS[${key}] is valid permutation`);
}

// 3. Each cube perm is length 27 and valid
for (const [key, perm] of Object.entries(CUBE_PERMS)) {
  assert(perm.length === 27, `CUBE_PERMS[${key}] length`);
  const sorted = [...perm].sort((a, b) => a - b);
  assert(sorted.every((v, i) => v === i), `CUBE_PERMS[${key}] is valid permutation`);
}

// 4. 90-degree rotation applied 4 times = identity
for (const [key, perm] of Object.entries(LAYER_PERMS)) {
  let p = perm;
  for (let i = 0; i < 3; i++) p = composePerm(perm, p);
  assert(p.every((v, i) => v === i), `LAYER_PERMS[${key}]^4 = identity`);
}

// 5. Inverse works
for (const [key, perm] of Object.entries(LAYER_PERMS)) {
  const inv = invertPerm(perm);
  const product = composePerm(perm, inv);
  assert(product.every((v, i) => v === i), `LAYER_PERMS[${key}] * inverse = identity`);
}

// 6. Layer rotations only affect their layer
for (const [key, move] of Object.entries(NUM_MOVES)) {
  const perm = LAYER_PERMS[key];
  for (let i = 0; i < 27; i++) {
    if (POSITIONS[i][move.axis] !== move.layer) {
      assert(perm[i] === i, `LAYER_PERMS[${key}] position ${i} not in layer ${move.layer} should be fixed`);
    }
  }
}

// 7. Center piece (index 26, position 0,0,0) never moves in layer rotations
for (const [key, perm] of Object.entries(LAYER_PERMS)) {
  assert(perm[26] === 26, `Center fixed in LAYER_PERMS[${key}]`);
}

// 8. Whole-cube rotations move all pieces (no fixed points except possibly center)
for (const [key, perm] of Object.entries(CUBE_PERMS)) {
  const fixedCount = perm.filter((v, i) => v === i).length;
  // 180-degree rotations can have fixed points on the axis
  // 90-degree rotations should only fix the center
  const move = PIPE_MOVES[key];
  if (Math.abs(move.s) === 1) {
    assert(fixedCount <= 3, `CUBE_PERMS[${key}] has ≤3 fixed points (center + axis)`);
  }
}

// 9. runPipelinePure produces output of correct length
const result = runPipelinePure(DEFAULT_LETTERS, 'אבגדהוז', getDigits('pi'), 'layers');
assert(result.output.length === 7, 'pipeline output length matches input');
assert(result.steps.length === 7, 'pipeline steps length matches input');
assert(result.finalState.length === 27, 'final state is 27 letters');

// 10. Identity pipeline (digit 0 = no rotation) preserves input
const zeros = [0, 0, 0, 0, 0];
const identityResult = runPipelinePure(DEFAULT_LETTERS, 'אבגדה', zeros, 'layers');
assert(identityResult.output.join('') === 'אבגדה', 'zero digits = identity mapping');

// 11. Permutation order for a single layer rotation should be 4
for (const [key, perm] of Object.entries(LAYER_PERMS)) {
  const order = permOrder(perm);
  assert(order === 4, `LAYER_PERMS[${key}] has order ${order} (expected 4)`);
}

// ═══════════════════════════════════════════════════════════════════════
// Chain module tests (src/pipeline/chain.js)
// ═══════════════════════════════════════════════════════════════════════

import {
  runChainPure, serializeChain, deserializeChain, defaultChain,
  addStep, removeStep, moveStep,
} from '../src/pipeline/chain.js';
import { HEBREW_22 } from '../src/data/hebrew.js';

// ── 12. Empty chain = identity passthrough ───────────────────────────
{
  const input = [...'אבגדהוז'];
  const r = runChainPure(DEFAULT_LETTERS, input, []);
  assert(r.finalOutput.join('') === input.join(''), 'empty chain is identity');
  assert(r.intermediates.length === 0, 'empty chain has no intermediates');
  assert(r.finalCubeState.join('') === DEFAULT_LETTERS.join(''), 'empty chain preserves cube state');
}

// ── 13. Single cipher chain (atbash) ─────────────────────────────────
{
  // Atbash: א↔ת, ב↔ש, ג↔ר
  const input = ['א', 'ב', 'ג'];
  const chain = [{ type: 'cipher', transform: 'atbash' }];
  const r = runChainPure(DEFAULT_LETTERS, input, chain);
  assert(r.finalOutput[0] === 'ת', 'atbash א→ת');
  assert(r.finalOutput[1] === 'ש', 'atbash ב→ש');
  assert(r.finalOutput[2] === 'ר', 'atbash ג→ר');
  assert(r.intermediates.length === 1, 'single cipher has 1 intermediate');
  assert(r.intermediates[0].type === 'cipher', 'intermediate type is cipher');
}

// ── 14. Single cube-rotation chain = same as runPipelinePure ─────────
{
  const input = [...'אבגדהוז'];
  const chain = [{ type: 'cube-rotation', rotSrc: 'pi', moveMode: 'layers', rotCustom: [], rotHebrew: '' }];
  const chainResult = runChainPure(DEFAULT_LETTERS, input, chain);
  const pipeResult = runPipelinePure(DEFAULT_LETTERS, input.join(''), getDigits('pi'), 'layers');
  assert(
    chainResult.finalOutput.join('') === pipeResult.output.join(''),
    'single cube-rotation chain matches runPipelinePure'
  );
}

// ── 15. Multi-step: cipher → cube-rotation differs from either alone ─
{
  const input = [...'אבגדהוז'];
  const cipherOnly = [{ type: 'cipher', transform: 'atbash' }];
  const rotOnly = [{ type: 'cube-rotation', rotSrc: 'pi', moveMode: 'layers', rotCustom: [], rotHebrew: '' }];
  const combined = [
    { type: 'cipher', transform: 'atbash' },
    { type: 'cube-rotation', rotSrc: 'pi', moveMode: 'layers', rotCustom: [], rotHebrew: '' },
  ];
  const rCipher = runChainPure(DEFAULT_LETTERS, input, cipherOnly);
  const rRot    = runChainPure(DEFAULT_LETTERS, input, rotOnly);
  const rBoth   = runChainPure(DEFAULT_LETTERS, input, combined);
  assert(rBoth.finalOutput.join('') !== rCipher.finalOutput.join(''), 'cipher+rot differs from cipher alone');
  assert(rBoth.finalOutput.join('') !== rRot.finalOutput.join(''), 'cipher+rot differs from rot alone');
  assert(rBoth.intermediates.length === 2, 'combined chain has 2 intermediates');
}

// ── 16. Expansion (milui) before cube rotation ───────────────────────
{
  // milui expands letters: א→אלף, ב→בית → longer sequence
  const input = ['א', 'ב'];
  const chain = [
    { type: 'expansion', transform: 'milui' },
    { type: 'cube-rotation', rotSrc: 'pi', moveMode: 'layers', rotCustom: [], rotHebrew: '' },
  ];
  const r = runChainPure(DEFAULT_LETTERS, input, chain);
  // After milui: א→[א,ל,פ], ב→[ב,י,ת] = 6 letters
  assert(r.intermediates[0].outputLetters.length === 6, 'milui expands א,ב to 6 letters');
  assert(r.finalOutput.length === 6, 'milui before cube keeps expanded length');
}

// ── 17. Expansion (milui) after cube rotation ────────────────────────
{
  const input = ['א', 'ב'];
  const chain = [
    { type: 'cube-rotation', rotSrc: 'pi', moveMode: 'layers', rotCustom: [], rotHebrew: '' },
    { type: 'expansion', transform: 'milui' },
  ];
  const r = runChainPure(DEFAULT_LETTERS, input, chain);
  // Cube rotation produces 2 letters, then milui expands them
  assert(r.intermediates[0].outputLetters.length === 2, 'cube rotation output is 2 letters');
  assert(r.finalOutput.length > 2, 'milui after cube expands output');
}

// ── 18. cube-reset step changes letter assignment mid-chain ──────────
{
  // Build a reversed key: swap first two positions
  // Default key in EN is: ABCDEFGH-IJKLMNOPQRST-UVWXYZ-#
  // A reversed key: HGFEDCBA-TSRQPONMLKJI-ZYXWVU-#
  const reversedKey = 'HGFEDCBA-TSRQPONMLKJI-ZYXWVU-#';
  const input = ['א'];
  const chain = [
    { type: 'cube-reset', key: reversedKey },
    { type: 'cube-rotation', rotSrc: 'custom', moveMode: 'layers', rotCustom: [0], rotHebrew: '' },
  ];
  const r = runChainPure(DEFAULT_LETTERS, input, chain);
  // After reset, cube state changed; with digit 0 the letter maps to itself at its position
  assert(r.intermediates[0].type === 'cube-reset', 'first step is cube-reset');
  assert(r.intermediates[0].cubeStateAfter.join('') !== DEFAULT_LETTERS.join(''), 'cube-reset changed cube state');
}

// ── 19. Zero-digit rotation = identity mapping ──────────────────────
{
  const input = [...'אבגדה'];
  const chain = [{ type: 'cube-rotation', rotSrc: 'custom', moveMode: 'layers', rotCustom: [0,0,0,0,0], rotHebrew: '' }];
  const r = runChainPure(DEFAULT_LETTERS, input, chain);
  assert(r.finalOutput.join('') === 'אבגדה', 'zero-digit rotation is identity');
}

// ── 20. defaultChain returns single cube-rotation step ───────────────
{
  const dc = defaultChain();
  assert(dc.length === 1, 'defaultChain has 1 step');
  assert(dc[0].type === 'cube-rotation', 'defaultChain step is cube-rotation');
  assert(dc[0].rotSrc === 'pi', 'defaultChain uses pi');
  assert(dc[0].moveMode === 'layers', 'defaultChain uses layers mode');
}

// ── 21. serializeChain / deserializeChain roundtrip ──────────────────
{
  // Simple cipher
  const c1 = [{ type: 'cipher', transform: 'atbash' }];
  assert(deserializeChain(serializeChain(c1))[0].transform === 'atbash', 'roundtrip cipher');

  // Expansion
  const c2 = [{ type: 'expansion', transform: 'milui' }];
  const s2 = serializeChain(c2);
  assert(s2 === 'x.milui', 'expansion serializes as x.milui');
  assert(deserializeChain(s2)[0].type === 'expansion', 'roundtrip expansion type');

  // Cube rotation with pi
  const c3 = [{ type: 'cube-rotation', rotSrc: 'pi', moveMode: 'layers', rotCustom: [], rotHebrew: '' }];
  const s3 = serializeChain(c3);
  assert(s3 === 'r.pi.layers', 'pi rotation serializes correctly');
  const d3 = deserializeChain(s3);
  assert(d3[0].rotSrc === 'pi', 'roundtrip rotation src');
  assert(d3[0].moveMode === 'layers', 'roundtrip rotation mode');

  // Custom digits
  const c4 = [{ type: 'cube-rotation', rotSrc: 'custom', moveMode: 'cube', rotCustom: [1,2,3], rotHebrew: '' }];
  const s4 = serializeChain(c4);
  assert(s4 === 'r.custom.cube.123', 'custom digits serialize correctly');
  const d4 = deserializeChain(s4);
  assert(d4[0].rotSrc === 'custom', 'roundtrip custom src');
  assert(d4[0].rotCustom.join('') === '123', 'roundtrip custom digits');

  // Hebrew rotation source
  const c5 = [{ type: 'cube-rotation', rotSrc: 'hebrew', moveMode: 'layers', rotCustom: [], rotHebrew: 'אבג' }];
  const s5 = serializeChain(c5);
  const d5 = deserializeChain(s5);
  assert(d5[0].rotSrc === 'hebrew', 'roundtrip hebrew src');
  assert(d5[0].rotHebrew === 'אבג', 'roundtrip hebrew text');

  // cube-reset
  const c6 = [{ type: 'cube-reset', key: 'HGFEDCBA-TSRQPONMLKJI-ZYXWVU-#' }];
  const s6 = serializeChain(c6);
  assert(s6.startsWith('s.'), 'cube-reset serializes with s. prefix');
  const d6 = deserializeChain(s6);
  assert(d6[0].type === 'cube-reset', 'roundtrip cube-reset type');
  assert(d6[0].key === 'HGFEDCBA-TSRQPONMLKJI-ZYXWVU-#', 'roundtrip cube-reset key (with dashes)');
}

// ── 22. Multi-step roundtrip ─────────────────────────────────────────
{
  const chain = [
    { type: 'cipher', transform: 'atbash' },
    { type: 'cube-rotation', rotSrc: 'e', moveMode: 'cube', rotCustom: [], rotHebrew: '' },
  ];
  const s = serializeChain(chain);
  assert(s === 'c.atbash,r.e.cube', 'multi-step serializes correctly');
  const d = deserializeChain(s);
  assert(d.length === 2, 'roundtrip multi-step length');
  assert(d[0].type === 'cipher' && d[0].transform === 'atbash', 'roundtrip multi-step cipher');
  assert(d[1].type === 'cube-rotation' && d[1].rotSrc === 'e', 'roundtrip multi-step rotation');
}

// ── 23. deserializeChain with empty/null returns defaultChain ────────
{
  const d1 = deserializeChain('');
  assert(d1.length === 1 && d1[0].type === 'cube-rotation', 'empty string → default chain');
  const d2 = deserializeChain(null);
  assert(d2.length === 1 && d2[0].type === 'cube-rotation', 'null → default chain');
}

// ── 27. addStep ──────────────────────────────────────────────────────
{
  const base = [{ type: 'cipher', transform: 'atbash' }];
  const newStep = { type: 'cipher', transform: 'avgad' };

  // Append
  const c1 = addStep(base, newStep);
  assert(c1.length === 2, 'addStep appends');
  assert(c1[1].transform === 'avgad', 'addStep appended correct step');

  // Insert at position 0
  const c2 = addStep(base, newStep, 0);
  assert(c2.length === 2, 'addStep inserts');
  assert(c2[0].transform === 'avgad', 'addStep inserted at position 0');
  assert(c2[1].transform === 'atbash', 'addStep kept original at position 1');

  // Original unchanged (immutability)
  assert(base.length === 1, 'addStep does not mutate original');
}

// ── 28. removeStep ───────────────────────────────────────────────────
{
  const base = [
    { type: 'cipher', transform: 'atbash' },
    { type: 'cipher', transform: 'avgad' },
    { type: 'cube-rotation', rotSrc: 'pi', moveMode: 'layers', rotCustom: [], rotHebrew: '' },
  ];

  const c1 = removeStep(base, 1);
  assert(c1.length === 2, 'removeStep removes one step');
  assert(c1[0].transform === 'atbash', 'removeStep kept step 0');
  assert(c1[1].type === 'cube-rotation', 'removeStep kept step 2');

  // Out of bounds does nothing
  const c2 = removeStep(base, 10);
  assert(c2.length === 3, 'removeStep out of bounds is no-op');

  // Original unchanged
  assert(base.length === 3, 'removeStep does not mutate original');
}

// ── 29. moveStep ─────────────────────────────────────────────────────
{
  const base = [
    { type: 'cipher', transform: 'atbash' },
    { type: 'cipher', transform: 'avgad' },
    { type: 'cube-rotation', rotSrc: 'pi', moveMode: 'layers', rotCustom: [], rotHebrew: '' },
  ];

  // Move step 2 to position 0
  const c1 = moveStep(base, 2, 0);
  assert(c1[0].type === 'cube-rotation', 'moveStep moved rotation to front');
  assert(c1[1].transform === 'atbash', 'moveStep shifted atbash to 1');
  assert(c1[2].transform === 'avgad', 'moveStep shifted avgad to 2');

  // Same position = no change
  const c2 = moveStep(base, 1, 1);
  assert(c2[0].transform === 'atbash', 'moveStep same pos preserves order');
  assert(c2[1].transform === 'avgad', 'moveStep same pos preserves order (2)');

  // Original unchanged
  assert(base.length === 3, 'moveStep does not mutate original');
  assert(base[0].transform === 'atbash', 'moveStep does not mutate original content');
}

// ── 30. Cube mode rotation ───────────────────────────────────────────
{
  const input = [...'אבג'];
  const chain = [{ type: 'cube-rotation', rotSrc: 'custom', moveMode: 'cube', rotCustom: [1,2,3], rotHebrew: '' }];
  const r = runChainPure(DEFAULT_LETTERS, input, chain);
  assert(r.finalOutput.length === 3, 'cube mode rotation produces correct length');
  // With non-zero digits, output should differ from input (cube rotations move pieces)
  assert(r.finalOutput.join('') !== input.join(''), 'cube mode rotation changes output');
}

// ── 31. Empty rotation sequence = passthrough ────────────────────────
{
  const input = [...'אבגד'];
  const chain = [{ type: 'cube-rotation', rotSrc: 'custom', moveMode: 'layers', rotCustom: [], rotHebrew: '' }];
  const r = runChainPure(DEFAULT_LETTERS, input, chain);
  assert(r.finalOutput.join('') === input.join(''), 'empty rotation sequence is passthrough');
}

console.log(`\nResults: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
