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

console.log(`\nResults: ${pass} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
