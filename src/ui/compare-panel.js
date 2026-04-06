// ── Compare panel: multi-source comparison dashboard ─────────────────
// Opens as a modal. User selects source texts, runs comparison with
// current pipeline config, and sees a heatmap table + similarity matrix.

import { compareTexts, similarityMatrix, rankByProperty, findAnomalies } from '../analysis/compare.js';
import { SOURCE_LIBRARY, SOURCE_CATEGORIES } from '../data/sources.js';
import { pChain } from '../pipeline/engine.js';

const overlay = document.getElementById('compare-overlay');
const dialog  = document.getElementById('compare-dialog');

// ── State ───────────────────────────────────────────────────────────
let lastResults = null;

// ── Open / Close ────────────────────────────────────────────────────

export function openComparePanel() {
  overlay.classList.add('open');
  dialog.classList.add('open');
  buildSourceChecklist();
  clearResults();
}

export function closeComparePanel() {
  overlay.classList.remove('open');
  dialog.classList.remove('open');
}

// ── Init (wire DOM events) ──────────────────────────────────────────

export function initComparePanel() {
  document.getElementById('compare-close').addEventListener('click', closeComparePanel);
  overlay.addEventListener('click', closeComparePanel);

  document.getElementById('compare-run').addEventListener('click', runComparison);
  document.getElementById('compare-export').addEventListener('click', exportCSV);

  // Select-all / none helpers
  document.getElementById('compare-select-all').addEventListener('click', () => toggleAll(true));
  document.getElementById('compare-select-none').addEventListener('click', () => toggleAll(false));
}

// ── Build source checklist grouped by category ──────────────────────

function buildSourceChecklist() {
  const container = document.getElementById('compare-sources');
  container.innerHTML = '';

  const catKeys = Object.keys(SOURCE_CATEGORIES);
  for (const catKey of catKeys) {
    const cat = SOURCE_CATEGORIES[catKey];
    const sources = SOURCE_LIBRARY.filter(s => s.category === catKey);
    if (!sources.length) continue;

    const group = document.createElement('div');
    group.className = 'cmp-cat-group';

    // Category header with select-all for the group
    const header = document.createElement('label');
    header.className = 'cmp-cat-header';
    const catCb = document.createElement('input');
    catCb.type = 'checkbox';
    catCb.className = 'cmp-cat-cb';
    catCb.dataset.cat = catKey;
    // Pre-check tribal blessings
    if (catKey === 'tribal-jacob' || catKey === 'tribal-moses') catCb.checked = true;
    header.appendChild(catCb);
    header.appendChild(document.createTextNode(` ${cat.icon} ${cat.label}`));
    group.appendChild(header);

    // Toggle child checkboxes when category header changes
    catCb.addEventListener('change', () => {
      group.querySelectorAll('.cmp-src-cb').forEach(cb => { cb.checked = catCb.checked; });
    });

    const items = document.createElement('div');
    items.className = 'cmp-cat-items';
    for (const s of sources) {
      const lbl = document.createElement('label');
      lbl.className = 'cmp-src-label';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'cmp-src-cb';
      cb.value = s.id;
      if (catCb.checked) cb.checked = true;
      lbl.appendChild(cb);
      lbl.appendChild(document.createTextNode(` ${s.name}`));
      const ref = document.createElement('span');
      ref.className = 'cmp-src-ref';
      ref.textContent = ` (${s.text.length})`;
      lbl.appendChild(ref);
      items.appendChild(lbl);
    }
    group.appendChild(items);
    container.appendChild(group);
  }
}

function toggleAll(checked) {
  dialog.querySelectorAll('.cmp-src-cb, .cmp-cat-cb').forEach(cb => { cb.checked = checked; });
}

function getSelectedIds() {
  return [...dialog.querySelectorAll('.cmp-src-cb:checked')].map(cb => cb.value);
}

// ── Clear results area ──────────────────────────────────────────────

function clearResults() {
  document.getElementById('compare-results').innerHTML = '';
  document.getElementById('compare-export').style.display = 'none';
  lastResults = null;
}

// ── Run comparison ──────────────────────────────────────────────────

function runComparison() {
  const ids = getSelectedIds();
  if (ids.length < 2) {
    alert('Select at least 2 source texts to compare.');
    return;
  }

  const config = { chain: pChain, cubeKey: null };
  const results = compareTexts(ids, config);
  lastResults = results;

  const container = document.getElementById('compare-results');
  container.innerHTML = '';

  // 1. Properties table
  container.appendChild(buildPropertiesTable(results));

  // 2. Similarity matrix
  if (results.length >= 2) {
    container.appendChild(buildSimilaritySection(results));
  }

  // 3. Anomalies
  const anomalies = findAnomalies(results);
  if (anomalies.length) {
    container.appendChild(buildAnomaliesSection(anomalies));
  }

  document.getElementById('compare-export').style.display = 'inline-block';
}

// ── Properties heatmap table ────────────────────────────────────────

const COLUMNS = [
  { key: 'textLength',   label: 'Letters',   accessor: r => r.textLength },
  { key: 'length',       label: 'AA Len',    accessor: r => r.properties?.length ?? 0 },
  { key: 'molWeight',    label: 'MW (kDa)',   accessor: r => r.properties?.molWeight ? r.properties.molWeight / 1000 : 0, fmt: v => v.toFixed(1) },
  { key: 'netCharge',    label: 'Charge',     accessor: r => r.properties?.netCharge ?? 0, fmt: v => (v > 0 ? '+' : '') + v },
  { key: 'gravy',        label: 'GRAVY',      accessor: r => r.properties?.gravy ?? 0, fmt: v => v.toFixed(2) },
  { key: 'hydrophobic',  label: 'Hydro %',    accessor: r => parseFloat(r.properties?.categories?.hydrophobic ?? 0), fmt: v => v.toFixed(1) },
  { key: 'uniqueAA',     label: 'Unique AA',  accessor: r => r.properties?.composition ? Object.keys(r.properties.composition).length : 0 },
];

function buildPropertiesTable(results) {
  const section = document.createElement('div');
  section.className = 'cmp-section';

  const title = document.createElement('div');
  title.className = 'cmp-section-title';
  title.textContent = 'Properties';
  section.appendChild(title);

  const wrap = document.createElement('div');
  wrap.className = 'cmp-table-wrap';

  const table = document.createElement('table');
  table.className = 'cmp-table';

  // Header
  const thead = document.createElement('thead');
  const hrow = document.createElement('tr');
  hrow.innerHTML = '<th class="cmp-th-name">Source</th>';
  for (const col of COLUMNS) {
    const th = document.createElement('th');
    th.textContent = col.label;
    hrow.appendChild(th);
  }
  thead.appendChild(hrow);
  table.appendChild(thead);

  // Compute min/max per column for heatmap
  const colValues = COLUMNS.map(col => results.map(r => col.accessor(r)));
  const colMin = colValues.map(vals => Math.min(...vals));
  const colMax = colValues.map(vals => Math.max(...vals));

  // Body
  const tbody = document.createElement('tbody');
  for (const r of results) {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    nameCell.className = 'cmp-td-name';
    nameCell.textContent = r.name;
    nameCell.title = r.reference || '';
    row.appendChild(nameCell);

    for (let c = 0; c < COLUMNS.length; c++) {
      const col = COLUMNS[c];
      const val = col.accessor(r);
      const td = document.createElement('td');
      td.textContent = col.fmt ? col.fmt(val) : val;

      // Heatmap: color intensity based on relative position in range
      const range = colMax[c] - colMin[c];
      if (range > 0) {
        const t = (val - colMin[c]) / range; // 0..1
        // Low = cool blue, High = warm orange
        const hue = 200 - t * 170; // 200 (blue) -> 30 (orange)
        const sat = 50 + t * 30;
        const light = 15 + t * 15;
        td.style.background = `hsla(${hue}, ${sat}%, ${light}%, 0.5)`;
      }
      row.appendChild(td);
    }
    tbody.appendChild(row);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);
  section.appendChild(wrap);
  return section;
}

// ── Similarity matrix ───────────────────────────────────────────────

function buildSimilaritySection(results) {
  const section = document.createElement('div');
  section.className = 'cmp-section';

  const title = document.createElement('div');
  title.className = 'cmp-section-title';
  title.textContent = 'Similarity Matrix';
  section.appendChild(title);

  const { matrix, labels } = similarityMatrix(results);
  const nameMap = {};
  for (const r of results) nameMap[r.sourceId] = r.name;

  const wrap = document.createElement('div');
  wrap.className = 'cmp-table-wrap';

  const table = document.createElement('table');
  table.className = 'cmp-table cmp-sim-table';

  // Header
  const thead = document.createElement('thead');
  const hrow = document.createElement('tr');
  hrow.innerHTML = '<th></th>';
  for (const lbl of labels) {
    const th = document.createElement('th');
    th.className = 'cmp-sim-header';
    th.textContent = shortName(nameMap[lbl] || lbl);
    th.title = nameMap[lbl] || lbl;
    hrow.appendChild(th);
  }
  thead.appendChild(hrow);
  table.appendChild(thead);

  // Body
  const tbody = document.createElement('tbody');
  for (let i = 0; i < matrix.length; i++) {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    nameCell.className = 'cmp-td-name';
    nameCell.textContent = shortName(nameMap[labels[i]] || labels[i]);
    nameCell.title = nameMap[labels[i]] || labels[i];
    row.appendChild(nameCell);

    for (let j = 0; j < matrix[i].length; j++) {
      const td = document.createElement('td');
      const pct = Math.round(matrix[i][j] * 100);
      td.textContent = pct + '%';
      td.className = 'cmp-sim-cell';
      if (i === j) {
        td.style.background = 'rgba(80,140,255,0.15)';
        td.style.color = 'rgba(255,255,255,0.3)';
      } else {
        const t = matrix[i][j];
        const hue = 0 + t * 120; // 0 (red) -> 120 (green)
        td.style.background = `hsla(${hue}, 60%, ${12 + t * 18}%, 0.6)`;
      }
      row.appendChild(td);
    }
    tbody.appendChild(row);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);
  section.appendChild(wrap);
  return section;
}

function shortName(name) {
  // Abbreviate long names for matrix headers
  if (name.length <= 10) return name;
  return name.slice(0, 9) + '\u2026';
}

// ── Anomalies ───────────────────────────────────────────────────────

function buildAnomaliesSection(anomalies) {
  const section = document.createElement('div');
  section.className = 'cmp-section cmp-anomalies';

  const title = document.createElement('div');
  title.className = 'cmp-section-title';
  title.textContent = 'Anomalies (>2\u03C3)';
  section.appendChild(title);

  for (const a of anomalies) {
    const item = document.createElement('div');
    item.className = 'cmp-anomaly-item';
    const dir = a.zScore > 0 ? '\u2191' : '\u2193';
    item.innerHTML = `<b>${a.name}</b> \u2014 ${a.property}: <span class="cmp-anomaly-val">${formatAnomalyVal(a)}</span> (z=${a.zScore}, mean=${a.mean})`;
    section.appendChild(item);
  }
  return section;
}

function formatAnomalyVal(a) {
  if (a.property === 'molWeight') return (a.value / 1000).toFixed(1) + ' kDa';
  if (a.property === 'gravy') return a.value.toFixed(2);
  return a.value;
}

// ── CSV Export ───────────────────────────────────────────────────────

function exportCSV() {
  if (!lastResults || !lastResults.length) return;

  const header = ['Source', ...COLUMNS.map(c => c.label)];
  const rows = lastResults.map(r =>
    [r.name, ...COLUMNS.map(c => {
      const v = c.accessor(r);
      return c.fmt ? c.fmt(v) : v;
    })]
  );

  const csv = [header, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  navigator.clipboard.writeText(csv).then(() => {
    const btn = document.getElementById('compare-export');
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = 'Export CSV'; }, 1500);
  }).catch(() => {
    // Fallback: download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'genesys_compare.csv';
    a.click();
    URL.revokeObjectURL(url);
  });
}
