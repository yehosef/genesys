import * as THREE from 'three';
import { POSITIONS } from './state.js';
import { reapplyHighlight } from './highlight.js';

// ── BoxGeometry face order: +x, -x, +y, -y, +z, -z ─────────────────
export const FACE_AXES = [
  { axis: 'x', sign:  1 },
  { axis: 'x', sign: -1 },
  { axis: 'y', sign:  1 },
  { axis: 'y', sign: -1 },
  { axis: 'z', sign:  1 },
  { axis: 'z', sign: -1 },
];

// Canvas "up" and "right" world-directions for each BoxGeometry face
// (derived from Three.js BoxGeometry buildPlane UV mapping)
export const CANVAS_DIRS = [
  { up: [0,1,0], rt: [0,0,-1] },  // +x: up=+y, right=-z
  { up: [0,1,0], rt: [0,0,1]  },  // -x: up=+y, right=+z
  { up: [0,0,-1],rt: [1,0,0]  },  // +y: up=-z, right=+x
  { up: [0,0,1], rt: [1,0,0]  },  // -y: up=+z, right=+x
  { up: [0,1,0], rt: [1,0,0]  },  // +z: up=+y, right=+x
  { up: [0,1,0], rt: [-1,0,0] },  // -z: up=+y, right=-x
];

// ── Helpers ──────────────────────────────────────────────────────────
export function dot3(a, b) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }

/**
 * Compute the canvas rotation so the letter orients toward cube-edges:
 *   face center (0 cube-edges) -> 0
 *   edge piece  (1 cube-edge)  -> letter top points toward cube-edge
 *   corner      (2 cube-edges) -> letter top + right both point toward cube-edges
 */
export function letterRotation(gx, gy, gz, faceIdx) {
  const { up, rt } = CANVAS_DIRS[faceIdx];
  const pos = [gx, gy, gz];
  const axIdx = 'xyz'.indexOf(FACE_AXES[faceIdx].axis);

  // For each non-face axis that is +/-1, find its canvas direction (0=up 1=right 2=down 3=left)
  const dirs = [];
  for (let i = 0; i < 3; i++) {
    if (i === axIdx || pos[i] === 0) continue;
    const d = [0,0,0]; d[i] = pos[i];
    const du = dot3(d, up), dr = dot3(d, rt);
    if      (du > 0) dirs.push(0);
    else if (du < 0) dirs.push(2);
    else if (dr > 0) dirs.push(1);
    else              dirs.push(3);
  }

  if (dirs.length === 0) return 0;                    // face center
  if (dirs.length === 1) return dirs[0] * Math.PI/2;  // edge -> top toward edge

  // corner: find t where both t and (t+1)%4 are in dirs
  const s = new Set(dirs);
  for (let t = 0; t < 4; t++) if (s.has(t) && s.has((t+1)%4)) return t * Math.PI/2;
  return 0;
}

/** Rounded-rectangle path helper */
export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y);
  ctx.quadraticCurveTo(x+w,y,x+w,y+r); ctx.lineTo(x+w,y+h-r);
  ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h); ctx.lineTo(x+r,y+h);
  ctx.quadraticCurveTo(x,y+h,x,y+h-r); ctx.lineTo(x,y+r);
  ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath();
}

// ── Texture cache & materials ────────────────────────────────────────
export const texCache = new Map();
export const INNER_MAT = new THREE.MeshLambertMaterial({ color: 0x111116 });
export const GEO = new THREE.BoxGeometry(0.92, 0.92, 0.92);

/** Generate (or retrieve from cache) a canvas texture for a letter face */
export function faceTex(letter, rotation = 0) {
  const key = letter + '_' + rotation;
  if (texCache.has(key)) return texCache.get(key);
  const S = 256, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const c = cv.getContext('2d');
  // White background
  c.fillStyle = '#fff';
  c.fillRect(0, 0, S, S);
  // Subtle border
  c.strokeStyle = 'rgba(0,0,0,0.12)'; c.lineWidth = 3;
  rr(c, 10, 10, S-20, S-20, 14); c.stroke();
  if (letter) {
    c.save();
    c.translate(S/2, S/2);
    c.rotate(rotation);
    c.fillStyle = '#1a1a2e';
    c.font = `bold ${S*0.56|0}px 'Frank Ruhl Libre','David','Arial Hebrew',Arial`;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.shadowColor = 'rgba(0,0,0,0.12)';
    c.shadowBlur = 4; c.shadowOffsetX = 1; c.shadowOffsetY = 2;
    c.fillText(letter, 0, 3);
    c.restore();
  }
  const t = new THREE.CanvasTexture(cv);
  texCache.set(key, t);
  return t;
}

/**
 * Build (or rebuild) the cube meshes inside cubeGroup.
 * @param {THREE.Group} cubeGroup - the group to populate
 * @param {string[]} letters - 27-element array of Hebrew letters
 */
export function buildCube(cubeGroup, letters) {
  // Clear existing children
  while (cubeGroup.children.length) {
    const ch = cubeGroup.children[0];
    cubeGroup.remove(ch);
    if (Array.isArray(ch.material)) ch.material.forEach(m => { if (m !== INNER_MAT) m.dispose(); });
  }

  for (let i = 0; i < POSITIONS.length; i++) {
    const { x, y, z } = POSITIONS[i];
    const letter = letters[i];
    const mats = FACE_AXES.map(({ axis, sign }, fi) => {
      const p = { x, y, z };
      if (p[axis] === sign) {
        const rot = letterRotation(x, y, z, fi);
        return new THREE.MeshLambertMaterial({ map: faceTex(letter, rot) });
      }
      return INNER_MAT;
    });
    const mesh = new THREE.Mesh(GEO, mats);
    mesh.position.set(x, y, z);
    mesh.userData.letter = letter;
    cubeGroup.add(mesh);
  }

  reapplyHighlight(letters, cubeGroup);
}
