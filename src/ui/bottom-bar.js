// ── Bottom bar: idle mode, autorotate, scramble ─────────────────────
// Manages the bottom button bar and idle auto-rotation behaviour.

let _controls = null;
let _cubeGroup = null;
let _queueRotation = null;
let _currentAnimGetter = null;
let _queueGetter = null;

let idleInterval = null;
let lastIdleAxis = null;

const autoBtn = document.getElementById('autorotate-btn');

// ── Idle mode ───────────────────────────────────────────────────────

export function startIdle() {
  _controls.autoRotate = true;
  autoBtn.textContent = '\u23F8 Pause';
  if (!idleInterval) {
    idleInterval = setInterval(() => {
      const currentAnim = _currentAnimGetter();
      const queue = _queueGetter();
      if (!currentAnim && !queue.length) {
        const axes = ['x', 'y', 'z'].filter(a => a !== lastIdleAxis);
        const axis = axes[Math.random() * axes.length | 0];
        lastIdleAxis = axis;
        const layers = [-1, 0, 1], angles = [Math.PI / 2, -Math.PI / 2];
        _queueRotation(
          axis,
          layers[Math.random() * 3 | 0],
          angles[Math.random() * 2 | 0],
          400
        );
      }
    }, 1200);
  }
}

export function stopIdle() {
  _controls.autoRotate = false;
  autoBtn.textContent = '\u25B6 Resume';
  if (idleInterval) { clearInterval(idleInterval); idleInterval = null; }
}

// ── Scramble ────────────────────────────────────────────────────────

function scramble(n = 20) {
  const axes = ['x', 'y', 'z'], layers = [-1, 1], angles = [Math.PI / 2, -Math.PI / 2];
  for (let i = 0; i < n; i++) {
    _queueRotation(
      axes[Math.random() * 3 | 0],
      layers[Math.random() * 2 | 0],
      angles[Math.random() * 2 | 0],
      80
    );
  }
}

// ── Init ────────────────────────────────────────────────────────────

/**
 * Wire up bottom-bar DOM event listeners.
 * @param {Object} deps
 * @param {Object} deps.controls - OrbitControls instance
 * @param {THREE.Group} deps.cubeGroup
 * @param {Function} deps.queueRotation
 * @param {Function} deps.currentAnimGetter - () => currentAnim
 * @param {Function} deps.queueGetter - () => queue array
 */
export function initBottomBar({ controls, cubeGroup, queueRotation, currentAnimGetter, queueGetter }) {
  _controls = controls;
  _cubeGroup = cubeGroup;
  _queueRotation = queueRotation;
  _currentAnimGetter = currentAnimGetter;
  _queueGetter = queueGetter;

  // Autorotate toggle
  autoBtn.addEventListener('click', () => {
    if (_controls.autoRotate) stopIdle();
    else startIdle();
  });

  // Scramble
  document.getElementById('scramble-btn').addEventListener('click', () => scramble());

  // Pointer interaction stops idle
  const canvas = document.querySelector('canvas');
  if (canvas) {
    canvas.addEventListener('pointerdown', () => {
      if (_controls.autoRotate) stopIdle();
    });
  }

}
