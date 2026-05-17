// ── Main entry point ──────────────────────────────────────────────────
// Wires together all modules: scene, cube, pipeline, and UI.

import * as THREE from 'three';

// ── Data ─────────────────────────────────────────────────────────────
import { DEFAULT_LETTERS } from './data/hebrew.js';

// ── Cube ─────────────────────────────────────────────────────────────
import { scene, camera, renderer, controls, cubeGroup } from './cube/scene.js';
import { buildCube, INNER_MAT } from './cube/build.js';
import {
  initRotation, queueRotation, tickAnim,
  waitAnimDone, cancelRotations, currentAnim, queue,
} from './cube/rotation.js';
import {
  initState, letters, getLetters, setLetters,
  readCubeState, toKey, parseKey, toStateKey, parseStateKey,
  applyKey, updateHash,
  NUM_MOVES, CUBE_ROT, PIPE_MOVES,
} from './cube/state.js';
import {
  setHighlight, clearHighlight,
  glowMeshRef,
  yellowFlashMesh, yellowFlashStart,
  setYellowFlashMesh,
  applyGlow, clearGlow,
} from './cube/highlight.js';

// ── Pipeline ─────────────────────────────────────────────────────────
import {
  initEngine, pPlaying, pFlash,
  pReset, pRunAll, pPlay, pPause, pClearGlow,
  pSrcPreset, pSourceText, pChain,
  setPInitLetters, setPInitialized,
  setPSrcPreset, setPSourceText, setPChain, setPSpeed,
  renderPipeAmino,
  addRenderHook,
} from './pipeline/engine.js';
import { decodeRecipe, applyRecipe, encodeRecipe } from './pipeline/recipe.js';
import { getSource } from './data/sources.js';

// ── UI ───────────────────────────────────────────────────────────────
import { initBottomBar, startIdle, stopIdle } from './ui/bottom-bar.js';
import { initLetterPanel, renderPanel, openKeyDialog } from './ui/letter-panel.js';
import { initPipelineBar, renderChain } from './ui/pipeline-bar.js';
import { initMappingDialog, openMappingDialog } from './ui/mapping-dialog.js';
import { initOutputPanel, renderSequenceStats } from './ui/output-panel.js';
import { initComparePanel, openComparePanel } from './ui/compare-panel.js';
import { initExperimentsGallery } from './ui/experiments.js';
import { DEMO_EXPERIMENTS } from './data/demos.js';

const INITIAL_DEMO_ROTATION_MS = 500;

// ── Raycaster for click-to-rotate ────────────────────────────────────
const raycaster = new THREE.Raycaster();
const ptrStart = new THREE.Vector2();
let ptrTime = 0;

// ── Shared glow state object (passed to engine as mutable ref) ───────
const glowState = {
  get ref() { return _glowStateRef; },
  set ref(v) { _glowStateRef = v; },
  get oldPos() { return _glowStateOldPos; },
  set oldPos(v) { _glowStateOldPos = v; },
  get yellowMesh() { return _glowStateYellow; },
  set yellowMesh(v) { _glowStateYellow = v; },
  get yellowStart() { return _glowStateYellowStart; },
  set yellowStart(v) { _glowStateYellowStart = v; },
};
let _glowStateRef = null;
let _glowStateOldPos = null;
let _glowStateYellow = null;
let _glowStateYellowStart = 0;

function rebuildCube() {
  cancelRotations({ disposeMaterials: true });
  buildCube(cubeGroup, getLetters());
}

function setPipelineSpeed(speedMs) {
  setPSpeed(speedMs);
  const speedInput = document.getElementById('pipe-speed');
  const speedValue = document.getElementById('pipe-speed-val');
  if (speedInput) speedInput.value = String(speedMs);
  if (speedValue) speedValue.textContent = speedMs + 'ms';
}

// ── Load a recipe hash programmatically (pipeline open + auto-run) ───
function applyRecipeAndRun(recipeHash, { animate = false, caption = null } = {}) {
  const recipe = decodeRecipe(recipeHash);
  if (!recipe) return;
  const pipeBar = document.getElementById('pipeline-bar');
  const outPanel = document.getElementById('output-panel');
  stopIdle();
  clearHighlight();
  pClearGlow();
  setPInitLetters([...getLetters()]);
  setPInitialized(true);
  applyRecipe(recipe, {
    setPSrcPreset, setPSourceText, setPChain, pReset,
  }, {
    parseKey,
    setLetters,
    buildCube: rebuildCube,
    renderPanel,
    getLetters,
    DEFAULT_LETTERS,
  });
  if (pipeBar) pipeBar.classList.add('open');
  if (outPanel) outPanel.classList.add('open');
  const bottomBar = document.getElementById('bottom-bar');
  if (bottomBar) bottomBar.style.display = 'none';
  renderChain();
  history.replaceState(null, '', recipeHash);
  updateExperimentLabel();

  if (animate) {
    // Show caption if provided
    if (caption) showCaption(caption);
    setTimeout(() => {
      setPipelineSpeed(INITIAL_DEMO_ROTATION_MS);
      pPlay();
    }, 400);
  } else {
    setTimeout(() => pRunAll(), 300);
  }
}

// ── Experiment label in header ──────────────────────────────────────
function updateExperimentLabel() {
  const label = document.getElementById('experiment-label');
  if (!label) return;
  const src = getSource(pSrcPreset);
  const srcName = src ? src.name : 'Custom';
  // Build chain description
  const chainDesc = pChain.length === 0 ? 'Direct mapping'
    : pChain.map(s => {
        if (s.type === 'cipher') return s.transform.charAt(0).toUpperCase() + s.transform.slice(1);
        if (s.type === 'expansion') return 'Milui';
        if (s.type === 'cube-rotation') return (s.rotSrc === 'pi' ? 'π' : s.rotSrc === 'phi' ? 'φ' : s.rotSrc === 'e' ? 'e' : s.rotSrc === 'fib' ? 'Fib' : s.rotSrc) + ' rotation';
        return s.type;
      }).join(' → ');
  label.innerHTML = `<span class="exp-source">${srcName}</span> · ${chainDesc}`;
}

// ── Floating caption ────────────────────────────────────────────────
function showCaption(text) {
  const el = document.getElementById('demo-caption');
  if (!el) return;
  el.innerHTML = text;
  el.classList.add('visible');
  // Fade on any interaction
  const dismiss = () => {
    el.classList.remove('visible');
    window.removeEventListener('pointerdown', dismiss);
    window.removeEventListener('keydown', dismiss);
  };
  setTimeout(() => {
    window.addEventListener('pointerdown', dismiss, { once: true });
    window.addEventListener('keydown', dismiss, { once: true });
  }, 1000);
  // Auto-fade after 8 seconds
  setTimeout(() => el.classList.remove('visible'), 8000);
}

// ── Boot ─────────────────────────────────────────────────────────────
async function boot() {
  // 1. Wait for Hebrew font
  await document.fonts.load("bold 140px 'Frank Ruhl Libre'").catch(() => {});

  // 2. Initialize cube modules
  initState(cubeGroup, rebuildCube, renderPanel);
  initRotation(cubeGroup, () => _glowStateRef);

  // 3. Build initial cube
  buildCube(cubeGroup, getLetters());

  // 4. Initialize pipeline engine
  initEngine({
    cubeGroup,
    queueRotation,
    readCubeState: () => readCubeState(cubeGroup),
    waitAnimDone,
    buildCube: rebuildCube,
    getLetters,
    setLetters,
    clearGlow,
    applyGlow,
    glowState,
    INNER_MAT,
    renderPanel,
    stopIdle,
    NUM_MOVES,
    PIPE_MOVES,
  });

  // 5. Initialize UI modules
  const pipeBar = document.getElementById('pipeline-bar');
  const outPanel = document.getElementById('output-panel');

  initBottomBar({
    controls,
    queueRotation,
    currentAnimGetter: () => currentAnim,
    queueGetter: () => queue,
  });

  initLetterPanel({
    cubeGroup,
    getLetters,
    setLetters,
    buildCube: rebuildCube,
  });

  initPipelineBar({
    stopIdle,
    buildCube: rebuildCube,
    cubeGroup,
    renderPanel,
    waitAnimDone,
    openMappingDialog,
    openKeyDialog,
  });

  initMappingDialog({
    renderPipeAmino,
  });

  initOutputPanel();
  initComparePanel();
  addRenderHook(renderSequenceStats);

  // Compare button in pipeline bar
  document.getElementById('pipe-compare').addEventListener('click', openComparePanel);

  // Experiments gallery
  initExperimentsGallery({
    demos: DEMO_EXPERIMENTS,
    loadExperiment: (recipeHash) => {
      document.getElementById('experiments-overlay')?.classList.remove('open');
      document.getElementById('experiments-dialog')?.classList.remove('open');
      applyRecipeAndRun(recipeHash);
    },
    getRecipeHash: () => encodeRecipe({
      pSrcPreset, pSourceText, pChain, toKey, letters: getLetters(),
    }),
  });

  // 5b. About dialog
  const aboutOverlay = document.getElementById('about-overlay');
  const aboutDialog = document.getElementById('about-dialog');
  const openAbout = () => { aboutOverlay.classList.add('open'); aboutDialog.classList.add('open'); };
  const closeAbout = () => {
    aboutOverlay.classList.remove('open');
    aboutDialog.classList.remove('open');
    localStorage.setItem('genesys-about-seen', '1');
  };
  document.getElementById('about-btn').addEventListener('click', openAbout);
  document.getElementById('about-close').addEventListener('click', closeAbout);
  aboutOverlay.addEventListener('click', closeAbout);

  // Auto-open About on first visit
  if (!localStorage.getItem('genesys-about-seen')) {
    openAbout();
  }

  // 6. Load from URL hash (recipe, state, or key)
  const loadedFromHash = loadFromHash();

  // 7. Set initial highlight (random, not center piece at index 26)
  setHighlight(Math.random() * 26 | 0, getLetters(), cubeGroup, renderPanel);

  // 8. Start idle mode
  startIdle();

  // 9a. If no URL hash on initial load, auto-load the Priestly Blessing demo with animation
  if (!loadedFromHash) {
    const demo = DEMO_EXPERIMENTS[2]; // Priestly Blessing — π Cipher
    setTimeout(() => {
      applyRecipeAndRun(demo.recipe, {
        animate: true,
        caption: `<span class="cap-source">${demo.name}</span> <span class="cap-dim">·</span> ${demo.description.split('.')[0]}`,
      });
    }, 700);
  }

  // 9b. Advanced tools toggle
  const advToggle = document.getElementById('pipe-adv-toggle');
  const advPanel = document.getElementById('pipeline-advanced');
  if (advToggle && advPanel) {
    advToggle.addEventListener('click', () => advPanel.classList.toggle('open'));
  }

  // 9. Set up render loop
  let lastT = performance.now();
  (function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const dt = now - lastT;
    lastT = now;

    // Advance rotation animation
    tickAnim(dt, pipeBar);

    // Pulse glow on highlighted cube piece
    const pipeOpen = pipeBar ? pipeBar.classList.contains('open') : false;
    const currentGlow = _glowStateRef || glowMeshRef;
    if (currentGlow && Array.isArray(currentGlow.material) && !(pipeOpen && !pFlash)) {
      const pulse = 0.35 + 0.25 * Math.sin(now * 0.004);
      currentGlow.material.forEach(m => {
        if (m !== INNER_MAT && m.emissive) m.emissiveIntensity = pulse;
      });
    }

    // Fade out yellow flash
    const yfm = _glowStateYellow || yellowFlashMesh;
    if (yfm && Array.isArray(yfm.material)) {
      if (pipeOpen && !pFlash) {
        clearGlow(yfm);
        _glowStateYellow = null;
        setYellowFlashMesh(null);
      } else {
        const yfs = _glowStateYellowStart || yellowFlashStart;
        const fade = Math.max(0, 1 - (now - yfs) / 800);
        if (fade <= 0) {
          clearGlow(yfm);
          _glowStateYellow = null;
          setYellowFlashMesh(null);
        } else {
          yfm.material.forEach(m => {
            if (m !== INNER_MAT && m.emissive) m.emissiveIntensity = 0.6 * fade;
          });
        }
      }
    }

    controls.update();
    renderer.render(scene, camera);
  })();

  // 10. Click-to-rotate on renderer canvas
  renderer.domElement.addEventListener('pointerdown', ev => {
    ptrStart.set(ev.clientX, ev.clientY);
    ptrTime = performance.now();
    if (controls.autoRotate) stopIdle();
  });

  renderer.domElement.addEventListener('pointerup', ev => {
    const dx = ev.clientX - ptrStart.x, dy = ev.clientY - ptrStart.y;
    if (Math.sqrt(dx * dx + dy * dy) > 5 || performance.now() - ptrTime > 300) return;
    if (currentAnim) return;

    // Block manual rotations during pipeline playback
    if (pipeBar && pipeBar.classList.contains('open') && pPlaying) return;

    const mouse = new THREE.Vector2(
      (ev.clientX / innerWidth) * 2 - 1,
      -(ev.clientY / innerHeight) * 2 + 1
    );
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(cubeGroup.children.filter(c => c.isMesh));
    if (!hits.length) return;

    const hit = hits[0];

    // Shift+click = highlight/glow the clicked piece (disabled during pipeline)
    if (ev.shiftKey) {
      if (pipeBar && pipeBar.classList.contains('open')) return;
      const mesh = hit.object;
      const letter = mesh.userData.letter;
      const ltrs = getLetters();
      const idx = ltrs.indexOf(letter);
      if (idx !== -1) setHighlight(idx, ltrs, cubeGroup, renderPanel);
      return;
    }

    const normal = hit.face.normal.clone().applyQuaternion(hit.object.quaternion).round();

    let axis, layer;
    const ax = Math.abs(normal.x), ay = Math.abs(normal.y), az = Math.abs(normal.z);
    if (ax >= ay && ax >= az) { axis = 'x'; layer = Math.round(hit.object.position.x); }
    else if (ay >= ax && ay >= az) { axis = 'y'; layer = Math.round(hit.object.position.y); }
    else { axis = 'z'; layer = Math.round(hit.object.position.z); }

    let angle = (layer >= 0 ? 1 : -1) * Math.PI / 2;
    queueRotation(axis, layer, angle);
  });

  // 11. Keyboard handler
  window.addEventListener('keydown', ev => {
    // Skip when typing in inputs
    if (document.activeElement && document.activeElement.matches('input, textarea')) return;

    const key = ev.key;

    // Escape closes dialogs / panels
    if (key === 'Escape') {
      const compareDlg = document.getElementById('compare-dialog');
      if (compareDlg && compareDlg.classList.contains('open')) {
        compareDlg.classList.remove('open');
        document.getElementById('compare-overlay').classList.remove('open');
        return;
      }
      const aboutDlg = document.getElementById('about-dialog');
      if (aboutDlg && aboutDlg.classList.contains('open')) {
        aboutDlg.classList.remove('open');
        document.getElementById('about-overlay').classList.remove('open');
        return;
      }
      const keyDialog = document.getElementById('key-dialog');
      if (keyDialog && keyDialog.classList.contains('open')) {
        keyDialog.classList.remove('open');
        const keyOverlay = document.getElementById('key-overlay');
        if (keyOverlay) keyOverlay.classList.remove('open');
        return;
      }
      const mappingDialog = document.getElementById('mapping-dialog');
      if (mappingDialog && mappingDialog.classList.contains('open')) {
        mappingDialog.classList.remove('open');
        const mappingOverlay = document.getElementById('mapping-overlay');
        if (mappingOverlay) mappingOverlay.classList.remove('open');
        return;
      }
      const letterPanel = document.getElementById('letter-panel');
      if (letterPanel && letterPanel.classList.contains('open')) {
        letterPanel.classList.remove('open');
        return;
      }
      return;
    }

    // Block rotation keys when dialogs/panels are open
    const letterPanel = document.getElementById('letter-panel');
    const keyDialog = document.getElementById('key-dialog');
    if (letterPanel && letterPanel.classList.contains('open')) return;
    if (keyDialog && keyDialog.classList.contains('open')) return;

    // Block manual rotations during pipeline playback
    if (pipeBar && pipeBar.classList.contains('open') && pPlaying) return;

    // Ctrl/Cmd + number = whole cube rotation
    if ((ev.ctrlKey || ev.metaKey) && CUBE_ROT[key]) {
      ev.preventDefault();
      const cr = CUBE_ROT[key];
      let angle = cr.s * Math.PI / 2;
      if (ev.shiftKey) angle = -angle;
      queueRotation(cr.axis, null, angle);
      return;
    }

    // Number keys = layer rotation
    const nm = NUM_MOVES[key];
    if (nm) {
      ev.preventDefault();
      let angle = nm.s * Math.PI / 2;
      if (ev.shiftKey) angle = -angle;
      queueRotation(nm.axis, nm.layer, angle);
      return;
    }
  });

  // 12. Browser back/forward
  window.addEventListener('popstate', loadFromHash);
}

// ── Load from URL hash ───────────────────────────────────────────────
function loadFromHash() {
  const hash = location.hash;
  const pipeBar = document.getElementById('pipeline-bar');
  const outPanel = document.getElementById('output-panel');

  if (hash.startsWith('#recipe=')) {
    const recipe = decodeRecipe(hash);
    if (recipe) {
      setTimeout(() => {
        applyRecipe(recipe, {
          setPSrcPreset, setPSourceText, setPChain, pReset,
        }, {
          parseKey,
          setLetters,
          buildCube: rebuildCube,
          renderPanel,
          getLetters,
          DEFAULT_LETTERS,
        });
        if (pipeBar) pipeBar.classList.add('open');
        if (outPanel) outPanel.classList.add('open');
        const bb = document.getElementById('bottom-bar');
        if (bb) bb.style.display = 'none';
        setPInitLetters([...getLetters()]);
        setPInitialized(true);
        renderChain();
        updateExperimentLabel();
      }, 100);
      return true;
    }
  }

  if (hash.startsWith('#state=')) {
    const key = decodeURIComponent(hash.slice(7));
    const parsed = parseStateKey(key);
    if (!parsed) return false;
    clearHighlight();
    setLetters(parsed);
    rebuildCube();
    renderPanel();
    return true;
  }

  if (hash.startsWith('#key=')) {
    const key = decodeURIComponent(hash.slice(5));
    return applyKey(key);
  }

  // No matching hash — set default
  if (!hash.startsWith('#key=') && !hash.startsWith('#state=') && !hash.startsWith('#recipe=')) {
    const key = toKey(getLetters());
    history.replaceState(null, '', '#key=' + encodeURIComponent(key));
  }

  return false;
}

// ── Start ────────────────────────────────────────────────────────────
boot();
