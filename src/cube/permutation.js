// ── Permutation matrices for cube rotations ─────────────────────────
// Precomputes the permutation that each rotation applies to the 27 positions.
// Enables instant pipeline evaluation without Three.js.
//
// Each permutation P is an array of 27 indices: P[newPos] = oldPos
// To apply: newState[i] = oldState[P[i]]
// To compose: (P2 ∘ P1)[i] = P1[P2[i]]

import { POSITIONS, POS_LOOKUP, NUM_MOVES, PIPE_MOVES } from './state.js';

/**
 * Compute the permutation for a single 90-degree rotation.
 * @param {string} axis - 'x', 'y', or 'z'
 * @param {number|null} layer - -1, 0, 1 for layer; null for whole cube
 * @param {number} sign - +1 for CW, -1 for CCW (from viewer perspective)
 * @returns {number[]} permutation array (length 27)
 */
export function computeRotationPerm(axis, layer, sign) {
  const perm = new Array(27);
  for (let i = 0; i < 27; i++) {
    const p = POSITIONS[i];

    // Check if this position is affected by the rotation
    const inLayer = (layer === null) || (p[axis] === layer);

    if (!inLayer) {
      perm[i] = i; // unchanged
      continue;
    }

    // Rotate 90 degrees around the given axis
    // For axis 'x': (y,z) -> (z,-y) for CW looking from +x
    // For axis 'y': (x,z) -> (-z,x) for CW looking from +y
    // For axis 'z': (x,y) -> (y,-x) for CW looking from +z
    let nx = p.x, ny = p.y, nz = p.z;

    if (axis === 'x') {
      ny = sign * p.z;
      nz = -sign * p.y;
    } else if (axis === 'y') {
      nx = -sign * p.z;
      nz = sign * p.x;
    } else { // z
      nx = sign * p.y;
      ny = -sign * p.x;
    }

    const sourceKey = `${Math.round(nx)},${Math.round(ny)},${Math.round(nz)}`;
    const sourceIdx = POS_LOOKUP.get(sourceKey);
    perm[i] = (sourceIdx !== undefined) ? sourceIdx : i;
  }
  return perm;
}

/**
 * Compose two permutations: result = apply P1 then P2.
 * result[i] = P1[P2[i]]
 */
export function composePerm(p1, p2) {
  const result = new Array(27);
  for (let i = 0; i < 27; i++) {
    result[i] = p1[p2[i]];
  }
  return result;
}

/**
 * Identity permutation.
 */
export function identityPerm() {
  return Array.from({ length: 27 }, (_, i) => i);
}

/**
 * Apply a permutation to a state (letter array).
 * @param {string[]} state - 27-element array
 * @param {number[]} perm - permutation
 * @returns {string[]} new state
 */
export function applyPerm(state, perm) {
  const result = new Array(27);
  for (let i = 0; i < 27; i++) {
    result[i] = state[perm[i]];
  }
  return result;
}

/**
 * Invert a permutation.
 */
export function invertPerm(perm) {
  const inv = new Array(27);
  for (let i = 0; i < 27; i++) {
    inv[perm[i]] = i;
  }
  return inv;
}

/**
 * Compute the order (period) of a permutation — smallest n where P^n = identity.
 */
export function permOrder(perm) {
  let current = [...perm];
  const id = identityPerm();
  for (let n = 1; n <= 1260; n++) { // 1260 = LCM(1..9), max possible order for S27 subgroup from cube
    if (current.every((v, i) => v === id[i])) return n;
    current = composePerm(perm, current);
  }
  return -1; // shouldn't happen for valid cube permutations
}

// ── Precomputed permutation tables ──────────────────────────────────

// Layer rotation permutations (keys '1'-'9' from NUM_MOVES)
export const LAYER_PERMS = {};
for (const [key, move] of Object.entries(NUM_MOVES)) {
  LAYER_PERMS[key] = computeRotationPerm(move.axis, move.layer, move.s);
}

// Whole-cube rotation permutations (keys '1'-'9' from PIPE_MOVES)
export const CUBE_PERMS = {};
for (const [key, move] of Object.entries(PIPE_MOVES)) {
  const s = move.s;
  if (Math.abs(s) === 2) {
    // 180-degree: compose two 90-degree rotations
    const single = computeRotationPerm(move.axis, null, s > 0 ? 1 : -1);
    CUBE_PERMS[key] = composePerm(single, single);
  } else {
    CUBE_PERMS[key] = computeRotationPerm(move.axis, null, s);
  }
}

/**
 * Run the entire pipeline using permutation algebra (no Three.js).
 * @param {string[]} initialState - 27-letter array
 * @param {string} sourceText - Hebrew source text
 * @param {number[]} rotSeq - digit sequence
 * @param {string} moveMode - 'layers' or 'cube'
 * @returns {{ output: string[], steps: Object[], finalState: string[] }}
 */
export function runPipelinePure(initialState, sourceText, rotSeq, moveMode = 'layers') {
  const permTable = moveMode === 'cube' ? CUBE_PERMS : LAYER_PERMS;
  const srcChars = [...sourceText];
  let state = [...initialState];
  const output = [];
  const steps = [];

  for (let i = 0; i < srcChars.length; i++) {
    const inputLetter = srcChars[i];
    const digit = rotSeq[i % rotSeq.length];
    const posIdx = state.indexOf(inputLetter);

    if (posIdx === -1 || digit === 0) {
      const outLetter = posIdx === -1 ? inputLetter : state[posIdx];
      output.push(outLetter);
      steps.push({ idx: i + 1, inL: inputLetter, digit, outL: outLetter, same: inputLetter === outLetter });
      continue;
    }

    const perm = permTable[String(digit)];
    if (!perm) {
      output.push(inputLetter);
      steps.push({ idx: i + 1, inL: inputLetter, digit, outL: inputLetter, same: true });
      continue;
    }

    state = applyPerm(state, perm);
    const outLetter = state[posIdx];
    output.push(outLetter);
    steps.push({ idx: i + 1, inL: inputLetter, digit, outL: outLetter, same: inputLetter === outLetter });
  }

  return { output, steps, finalState: state };
}
