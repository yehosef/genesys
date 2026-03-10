import * as THREE from 'three';
import { glowOldPos as _glowOldPos, yellowFlashMesh as _yfm, clearGlow } from './highlight.js';
import { INNER_MAT } from './build.js';

// ── Rotation queue & animation state ─────────────────────────────────
export const queue = [];
export let currentAnim = null;

// Mutable highlight-tracking state managed by processQueue/tickAnim.
// We keep local refs that mirror highlight.js exported state, updated via setters.
let glowOldPos = null;
let yellowFlashMesh = null;
let yellowFlashStart = 0;

// Accessors so external code can read/write these
export function getGlowOldPos() { return glowOldPos; }
export function setGlowOldPos(v) { glowOldPos = v; }
export function getYellowFlashMesh() { return yellowFlashMesh; }
export function setYellowFlashMesh(v) { yellowFlashMesh = v; }
export function getYellowFlashStart() { return yellowFlashStart; }
export function setYellowFlashStart(v) { yellowFlashStart = v; }

/**
 * Enqueue a 90-degree rotation.
 * @param {string} axis - 'x', 'y', or 'z'
 * @param {number|null} layer - -1, 0, 1, or null for whole-cube
 * @param {number} angle - radians (typically +/-PI/2)
 * @param {number} [dur=200] - animation duration in ms
 */
export function queueRotation(axis, layer, angle, dur) {
  queue.push({ axis, layer, angle, dur: dur ?? 200 });
  if (!currentAnim) processQueue();
}

// Store reference to cubeGroup — set by init call from main
let _cubeGroup = null;
let _glowMeshRefGetter = null;

/**
 * Initialize rotation engine with references it needs.
 * @param {THREE.Group} cubeGroup
 * @param {Function} getGlowMeshRef - () => mesh ref from highlight module
 */
export function initRotation(cubeGroup, getGlowMeshRef) {
  _cubeGroup = cubeGroup;
  _glowMeshRefGetter = getGlowMeshRef;
}

/** Process the next item in the rotation queue */
export function processQueue() {
  if (currentAnim || !queue.length) return;
  const { axis, layer, angle, dur } = queue.shift();

  const cubeGroup = _cubeGroup;
  if (!cubeGroup) return;

  const cubies = cubeGroup.children.filter(
    m => m.isMesh && (layer === null || Math.round(m.position[axis]) === layer)
  );
  if (!cubies.length) { processQueue(); return; }

  // Remember highlighted piece's position before rotation
  glowOldPos = null;
  const glowMeshRef = _glowMeshRefGetter ? _glowMeshRefGetter() : null;
  if (glowMeshRef && cubies.includes(glowMeshRef)) {
    glowOldPos = {
      x: Math.round(glowMeshRef.position.x),
      y: Math.round(glowMeshRef.position.y),
      z: Math.round(glowMeshRef.position.z)
    };
  }

  const pivot = new THREE.Object3D();
  cubeGroup.add(pivot);
  cubies.forEach(m => pivot.attach(m));

  const axisVec = new THREE.Vector3(axis==='x'?1:0, axis==='y'?1:0, axis==='z'?1:0);

  currentAnim = { pivot, cubies, axisVec, angle, elapsed: 0, dur };
}

/**
 * Tick the current animation forward by dt milliseconds.
 * @param {number} dt - delta time in ms
 * @param {HTMLElement} [pipeBar] - pipeline bar element (for flash check)
 */
export function tickAnim(dt, pipeBar) {
  if (!currentAnim) return;
  const cubeGroup = _cubeGroup;
  const a = currentAnim;
  a.elapsed = Math.min(a.elapsed + dt, a.dur);
  const t = a.elapsed / a.dur;
  const e = t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2, 2)/2;
  a.pivot.quaternion.setFromAxisAngle(a.axisVec, a.angle * e);

  if (t >= 1) {
    for (const m of a.cubies) {
      cubeGroup.attach(m);
      m.position.x = Math.round(m.position.x);
      m.position.y = Math.round(m.position.y);
      m.position.z = Math.round(m.position.z);
      // snap quaternion (entries should be 0/+/-1 for 90deg multiples)
      const rm = new THREE.Matrix4().makeRotationFromQuaternion(m.quaternion);
      const el = rm.elements;
      for (let i = 0; i < 16; i++) el[i] = Math.round(el[i]);
      m.quaternion.setFromRotationMatrix(rm);
    }
    cubeGroup.remove(a.pivot);

    // Flash yellow on the piece that replaced the highlighted one
    // (skip during pipeline — handled separately)
    const glowMeshRef = _glowMeshRefGetter ? _glowMeshRefGetter() : null;
    const pipeOpen = pipeBar ? pipeBar.classList.contains('open') : false;
    if (glowOldPos && glowMeshRef && !pipeOpen) {
      const np = glowMeshRef.position;
      if (Math.round(np.x) !== glowOldPos.x || Math.round(np.y) !== glowOldPos.y || Math.round(np.z) !== glowOldPos.z) {
        const replacer = cubeGroup.children.find(m =>
          m.isMesh && m !== glowMeshRef &&
          Math.round(m.position.x) === glowOldPos.x &&
          Math.round(m.position.y) === glowOldPos.y &&
          Math.round(m.position.z) === glowOldPos.z
        );
        if (replacer) {
          // Clear previous flash if still running
          if (yellowFlashMesh) clearGlow(yellowFlashMesh);
          yellowFlashMesh = replacer;
          yellowFlashStart = performance.now();
          replacer.material.forEach(m => {
            if (m !== INNER_MAT) {
              m.emissive = new THREE.Color(0xffaa00);
              m.emissiveIntensity = 0.6;
            }
          });
        }
      }
      glowOldPos = null;
    }

    currentAnim = null;
    processQueue();
  }
}

/**
 * Apply a rotation instantly (no animation). Used by pRunAll.
 * @param {THREE.Group} cubeGroup
 * @param {string} axis
 * @param {number|null} layer
 * @param {number} angle
 */
export function applyRotationInstant(cubeGroup, axis, layer, angle) {
  const cubies = cubeGroup.children.filter(
    m => m.isMesh && (layer === null || Math.round(m.position[axis]) === layer)
  );
  if (!cubies.length) return;
  const pivot = new THREE.Object3D();
  cubeGroup.add(pivot);
  cubies.forEach(m => pivot.attach(m));
  const axisVec = new THREE.Vector3(axis==='x'?1:0, axis==='y'?1:0, axis==='z'?1:0);
  pivot.quaternion.setFromAxisAngle(axisVec, angle);
  pivot.updateMatrixWorld(true);
  for (const m of cubies) {
    cubeGroup.attach(m);
    m.position.x = Math.round(m.position.x);
    m.position.y = Math.round(m.position.y);
    m.position.z = Math.round(m.position.z);
    const rm = new THREE.Matrix4().makeRotationFromQuaternion(m.quaternion);
    const el = rm.elements;
    for (let i = 0; i < 16; i++) el[i] = Math.round(el[i]);
    m.quaternion.setFromRotationMatrix(rm);
  }
  cubeGroup.remove(pivot);
}

/**
 * Wait for all queued animations to complete, then call cb.
 * @param {Function} cb
 */
export function waitAnimDone(cb) {
  (function poll() { (currentAnim || queue.length) ? requestAnimationFrame(poll) : cb(); })();
}
