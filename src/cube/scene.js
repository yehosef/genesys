import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ── Scene ────────────────────────────────────────────────────────────
export const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a18);

export const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.1, 100);
camera.position.set(5.5, 4.2, 6.5);

export const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

export const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 3.5;
controls.maxDistance = 18;
controls.autoRotate = true;
controls.autoRotateSpeed = 1.2;

// ── Lighting ─────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.55));

const sun = new THREE.DirectionalLight(0xffffff, 1.0);
sun.position.set(6, 10, 8);
scene.add(sun);

const fill = new THREE.DirectionalLight(0x7799ff, 0.4);
fill.position.set(-6, -4, -6);
scene.add(fill);

const rim = new THREE.DirectionalLight(0xffddaa, 0.25);
rim.position.set(0, -8, 0);
scene.add(rim);

// ── Starfield ────────────────────────────────────────────────────────
{
  const n = 300, pos = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i++) pos[i] = (Math.random() - 0.5) * 60;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({
    color: 0x5566bb, size: 0.06, transparent: true, opacity: 0.6
  })));
}

// ── Cube group ───────────────────────────────────────────────────────
export const cubeGroup = new THREE.Group();
scene.add(cubeGroup);

// ── Resize handler ───────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
