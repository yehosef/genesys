import * as THREE from 'three';
import { INNER_MAT } from './build.js';

// ── Mutable highlight state ──────────────────────────────────────────
export let highlightedIdx = null;
export let glowMeshRef = null;

// Yellow flash state (used by rotation engine and render loop)
export let glowOldPos = null;
export let yellowFlashMesh = null;
export let yellowFlashStart = 0;

// Setters for external mutation
export function setHighlightedIdx(v) { highlightedIdx = v; }
export function setGlowMeshRef(v) { glowMeshRef = v; }
export function setGlowOldPos(v) { glowOldPos = v; }
export function setYellowFlashMesh(v) { yellowFlashMesh = v; }
export function setYellowFlashStart(v) { yellowFlashStart = v; }

/**
 * Apply blue glow emissive to a mesh.
 * @param {THREE.Mesh} mesh
 */
export function applyGlow(mesh) {
  if (!mesh || !Array.isArray(mesh.material)) return;
  mesh.material.forEach(m => {
    if (m !== INNER_MAT) {
      m.emissive = new THREE.Color(0x3388ff);
      m.emissiveIntensity = 0.5;
    }
  });
}

/**
 * Clear emissive glow from a mesh.
 * @param {THREE.Mesh} mesh
 */
export function clearGlow(mesh) {
  if (!mesh || !Array.isArray(mesh.material)) return;
  mesh.material.forEach(m => {
    if (m !== INNER_MAT) {
      m.emissive = new THREE.Color(0x000000);
      m.emissiveIntensity = 0;
    }
  });
}

/**
 * Toggle or set highlight on a specific letter index.
 * @param {number} idx - index into the letters array
 * @param {string[]} letters - current letters array
 * @param {THREE.Group} cubeGroup
 * @param {Function} [renderPanel] - optional callback to re-render letter panel
 */
export function setHighlight(idx, letters, cubeGroup, renderPanel) {
  if (glowMeshRef) { clearGlow(glowMeshRef); glowMeshRef = null; }
  highlightedIdx = (highlightedIdx === idx) ? null : idx;
  if (highlightedIdx !== null) {
    const letter = letters[highlightedIdx];
    glowMeshRef = cubeGroup.children.find(m => m.isMesh && m.userData.letter === letter) || null;
    applyGlow(glowMeshRef);
  }
  if (renderPanel) renderPanel();
}

/**
 * Clear any active highlight.
 */
export function clearHighlight() {
  if (glowMeshRef) { clearGlow(glowMeshRef); glowMeshRef = null; }
  highlightedIdx = null;
}

/**
 * Reapply highlight after cube rebuild (meshes were recreated).
 * @param {string[]} letters - current letters array
 * @param {THREE.Group} cubeGroup
 */
export function reapplyHighlight(letters, cubeGroup) {
  glowMeshRef = null;
  if (highlightedIdx !== null) {
    const letter = letters[highlightedIdx];
    glowMeshRef = cubeGroup.children.find(m => m.isMesh && m.userData.letter === letter) || null;
    applyGlow(glowMeshRef);
  }
}
