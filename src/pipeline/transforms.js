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
  label: 'Identity',
  apply(inputLetters, _cubeState) {
    return [...inputLetters];
  },
});
