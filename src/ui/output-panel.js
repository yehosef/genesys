// ── Output panel: close button + sequence stats + FASTA export ──────
// The output panel rendering is handled by engine.js render functions.
// This module wires the close button and post-run analysis display.

import { pPause, pPlaying, pOutput } from '../pipeline/engine.js';
import { aminoLookup } from '../data/amino.js';
import { analyzeSequence, splitAtStops, toFasta } from '../analysis/properties.js';

const statsSection = document.getElementById('seq-stats-section');
const statsEl = document.getElementById('seq-stats');

/**
 * Render sequence statistics from current pipeline output.
 * Called after pipeline runs complete.
 */
export function renderSequenceStats() {
  if (!statsSection || !statsEl) return;

  if (!pOutput || pOutput.length === 0) {
    statsSection.style.display = 'none';
    return;
  }

  // Build amino acid sequence from output
  const aaSeq = pOutput.map(ch => aminoLookup(ch)).join('');
  const segments = splitAtStops(aaSeq);
  if (segments.length === 0) {
    statsSection.style.display = 'none';
    return;
  }

  const longest = segments.reduce((a, b) => a.length > b.length ? a : b);
  const props = analyzeSequence(longest);
  if (!props) { statsSection.style.display = 'none'; return; }

  const stopCount = (aaSeq.match(/\*/g) || []).length;

  let h = '';
  h += `<b>Total:</b> ${aaSeq.length} residues · ${segments.length} segment${segments.length > 1 ? 's' : ''} · ${stopCount} stops<br>`;
  h += `<b>Longest segment:</b> ${props.length} residues<br>`;
  h += `<b>Mol. weight:</b> ${(props.molWeight / 1000).toFixed(1)} kDa · `;
  h += `<b>Charge:</b> ${props.netCharge > 0 ? '+' : ''}${props.netCharge} · `;
  h += `<b>pI:</b> ${props.pI}<br>`;
  h += `<b>GRAVY:</b> ${props.gravy} · `;
  h += `<b>Hydrophobic:</b> ${props.categories.hydrophobic}% · `;
  h += `<b>Polar:</b> ${props.categories.polar}% · `;
  h += `<b>Charged:</b> ${(parseFloat(props.categories.positive) + parseFloat(props.categories.negative)).toFixed(1)}%<br>`;
  h += `<b>Unique AAs:</b> ${Object.keys(props.composition).length}/20`;

  statsEl.innerHTML = h;
  statsSection.style.display = 'block';
}

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

  // FASTA export button
  document.getElementById('export-fasta').addEventListener('click', () => {
    if (!pOutput || pOutput.length === 0) return;
    const aaSeq = pOutput.map(ch => aminoLookup(ch)).join('').replace(/\*/g, '');
    const fasta = toFasta(aaSeq, 'GeneSys_output');
    const blob = new Blob([fasta], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'genesys_output.fasta';
    a.click();
    URL.revokeObjectURL(url);
  });
}
