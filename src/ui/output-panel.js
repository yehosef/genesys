// ── Output panel: close button ──────────────────────────────────────
// The output panel rendering is handled by engine.js render functions.
// This module just wires the close button.

import { pPause, pPlaying } from '../pipeline/engine.js';

/**
 * Wire up output panel DOM event listeners.
 */
export function initOutputPanel() {
  const pipeBar = document.getElementById('pipeline-bar');
  const outPanel = document.getElementById('output-panel');

  document.getElementById('output-close').addEventListener('click', () => {
    if (pPlaying) pPause();
    pipeBar.classList.remove('open');
    outPanel.classList.remove('open');
  });
}
