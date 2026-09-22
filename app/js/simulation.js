/**
 * @module simulation
 * Gestione dello step "simulazione futura": grafico, metriche, tips educativi e azioni consigliate.
 */

import { showStep } from './navigation.js';
import { state } from './state.js';
import { TIPS } from './constants.js';
import { monthlySavings, compoundGrowth, fmt } from './utils.js';
import { SERVER } from './ai.js';

/**
 * Naviga allo step simulazione e renderizza il contenuto.
 */
export function goToSimulation() {
  renderSimulation();
  showStep('simulation');
}

/**
 * Renderizza l'intera simulazione: metriche, grafico Chart.js, legenda, tips e azioni.
 */
// Scenario realistico: 5% rendimento, 83% contribuzione effettiva (10/12 mesi),
// con shock agli anni 5, 10, 15 che simulano emergenze (spese impreviste, periodi difficili)
function realisticScenarioSeries(pmt, years, investRate = 0.05) {
  const SHOCKS = { 5: 4, 10: 3, 15: 4 }; // mesi di risparmio persi per emergenza
  const effectivePmt = pmt * (10 / 12);   // 2 mesi/anno "persi" a imprevisti piccoli
  const r = investRate / 12;
  const series = [0];
  let balance = 0;
  for (let y = 1; y <= years; y++) {
    for (let m = 0; m < 12; m++) balance = balance * (1 + r) + effectivePmt;
    if (SHOCKS[y]) balance = Math.max(0, balance - pmt * SHOCKS[y]);
    series.push(Math.round(balance));
  }
  return series;
}

// Scenario crescita stipendio: risparmio aumenta del growthRate% ogni anno, investito al 5%
function progressiveScenarioSeries(pmt, years, investRate = 0.05, growthRate = 0.03) {
  const r = investRate / 12;
  const series = [0];
  let balance = 0;
  for (let y = 1; y <= years; y++) {
    const yearPmt = pmt * Math.pow(1 + growthRate, y - 1);
    for (let m = 0; m < 12; m++) balance = balance * (1 + r) + yearPmt;
    series.push(Math.round(balance));
  }
  return series;
}

export function renderSimulation() {
  const pmt = Math.max(0, monthlySavings());
  const years = 20;
  const labels = Array.from({ length: years + 1 }, (_, i) => i === 0 ? 'Oggi' : `Anno ${i}`);

  const noInterest  = labels.map((_, i) => pmt * i * 12);
  const low         = labels.map((_, i) => compoundGrowth(pmt, i, 0.02));
  const mid         = labels.map((_, i) => compoundGrowth(pmt, i, 0.05));
  const realPower   = labels.map((_, i) => (pmt * i * 12) / Math.pow(1.02, i));
  const realistic   = realisticScenarioSeries(pmt, years, 0.05);
  const progressive = progressiveScenarioSeries(pmt, years, 0.05, 0.03);

  // Metriche riepilogative
  const savings = monthlySavings();
  document.getElementById('metricsGrid').innerHTML = `
    <div class="metric-card">
      <div class="metric-label">Risparmio mensile</div>
      <div class="metric-value" style="color:${savings >= 0 ? 'var(--success)' : 'var(--danger)'}">${fmt(savings)}</div>
      <div class="metric-sub">${savings >= 0 ? 'ottimo punto di partenza' : 'da riequilibrare'}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">In 10 anni — ottimistico (5%)</div>
      <div class="metric-value" style="color:var(--success)">${fmt(Math.max(0, mid[10]))}</div>
      <div class="metric-sub">${mid[10] > noInterest[10] ? '+' + fmt(mid[10] - noInterest[10]) + ' vs puro' : ''}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">In 10 anni — realistico</div>
      <div class="metric-value" style="color:var(--warning)">${fmt(Math.max(0, realistic[10]))}</div>
      <div class="metric-sub">con imprevisti inclusi</div>
    </div>`;

  // Grafico Chart.js (distrugge il precedente se esiste)
  if (state.chart) state.chart.destroy();
  const ctx = document.getElementById('simulationChart').getContext('2d');
  state.chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Solo risparmio (0%)',                  data: noInterest,  borderColor: '#94A3B8', borderWidth: 1.5, tension: 0.3, fill: false, pointRadius: 0 },
        { label: 'Conto deposito (2%)',                   data: low,         borderColor: '#2563EB', borderWidth: 1.5, tension: 0.3, fill: false, pointRadius: 0 },
        { label: 'Investimento ottimistico (5%)',          data: mid,         borderColor: '#16A34A', borderWidth: 2.5, tension: 0.3, fill: { target: 'origin', above: 'rgba(22,163,74,0.05)' }, pointRadius: 0 },
        { label: 'Realistico con imprevisti',             data: realistic,   borderColor: '#F59E0B', borderWidth: 2.5, tension: 0.2, fill: false, borderDash: [5, 3], pointRadius: 0 },
        { label: 'Con crescita stipendio (+3%/anno)',     data: progressive, borderColor: '#06B6D4', borderWidth: 2,   tension: 0.3, fill: false, borderDash: [3, 2], pointRadius: 0 },
        { label: 'Potere acquisto reale (inflaz. 2%)',    data: realPower,   borderColor: '#EF4444', borderWidth: 1.5, tension: 0.3, fill: false, borderDash: [8, 4], pointRadius: 0 },
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => c.dataset.label + ': ' + fmt(c.raw) } }
      },
      scales: { y: { ticks: { callback: v => fmt(v) }, grid: { color: 'rgba(255,255,255,0.04)' } } }
    }
  });

  // Legenda testuale
  document.getElementById('chartLegendDesc').innerHTML = `
    <div class="legend-item"><div class="legend-dot" style="background:#94A3B8"></div>Risparmio puro: soldi sul conto, senza interessi né rendimenti</div>
    <div class="legend-item"><div class="legend-dot" style="background:#2563EB"></div>Conto deposito al 2% annuo: rendimento basso ma sicuro</div>
    <div class="legend-item"><div class="legend-dot" style="background:#16A34A"></div>Investimento ottimistico al 5% annuo: scenario ideale senza interruzioni</div>
    <div class="legend-item"><div class="legend-dot legend-dot--dashed" style="background:#F59E0B"></div>Realistico con imprevisti: 10 mesi/anno effettivi + emergenze agli anni 5, 10, 15</div>
    <div class="legend-item"><div class="legend-dot legend-dot--dashed" style="background:#06B6D4"></div>Con crescita stipendio: risparmio +3% all'anno (carriera), investito al 5%</div>
    <div class="legend-item"><div class="legend-dot legend-dot--dashed" style="background:#EF4444"></div>Potere d'acquisto reale: erosione inflazione al 2% sui risparmi fermi</div>`;

  renderTips();
}

const _tipDetailCache = {};

/**
 * Renderizza le card educative sui concetti finanziari, calibrate per il livello utente.
 * Ogni card è cliccabile per espandere un approfondimento AI.
 */
export function renderTips() {
  const level = state.level || 'principiante';
  const introText = {
    principiante: "Clicca su un concetto per un approfondimento personalizzato — spiegato in parole semplici, con esempi dalla tua situazione.",
    intermedio: "Clicca su un concetto per un approfondimento AI adattato al tuo profilo e ai tuoi numeri.",
    esperto: "Clicca su un concetto per un'analisi tecnica approfondita con implicazioni pratiche per la tua strategia."
  };
  document.getElementById('tipsIntro').textContent = introText[level];

  const grid = document.getElementById('tipsGrid');
  grid.innerHTML = '';
  Object.entries(TIPS).forEach(([key, tip]) => {
    const content = tip[level];
    const card = document.createElement('div');
    card.className = 'tip-card tip-card--clickable';
    card.style.borderLeftColor = tip.color;
    card.innerHTML = `
      <div class="tip-header">
        <div class="tip-title">${tip.icon} ${tip.title}</div>
        <span class="tip-tag" style="background:${tip.color}20;color:${tip.color}">${level}</span>
      </div>
      <p class="tip-simple">${content.simple}</p>
      <div class="tip-example">${content.example}</div>
      <div class="tip-detail" id="tip-detail-${key}" style="display:none">
        <div class="tip-detail-body" id="tip-detail-body-${key}"></div>
      </div>
      <div class="tip-expand-strip" id="tip-strip-${key}">✨ Approfondisci con AI</div>`;
    card.addEventListener('click', () => expandTip(key, tip, card));
    grid.appendChild(card);
  });
}

async function expandTip(key, tip, card) {
  const detailEl = document.getElementById(`tip-detail-${key}`);
  const bodyEl   = document.getElementById(`tip-detail-body-${key}`);
  const stripEl  = document.getElementById(`tip-strip-${key}`);

  if (detailEl.style.display !== 'none') {
    detailEl.style.display = 'none';
    if (stripEl) stripEl.textContent = '✨ Approfondisci con AI';
    card.classList.remove('tip-card--open');
    return;
  }

  detailEl.style.display = 'block';
  if (stripEl) stripEl.textContent = '▲ Chiudi';
  card.classList.add('tip-card--open');

  if (_tipDetailCache[key]) {
    bodyEl.textContent = _tipDetailCache[key];
    return;
  }

  bodyEl.innerHTML = '<span style="color:var(--muted);font-size:0.85rem">⏳ Caricamento approfondimento…</span>';

  try {
    const res = await fetch(`${SERVER}/tip-detail`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic:           key,
        title:           tip.title,
        level:           state.level || 'principiante',
        income:          state.income || 0,
        savings:         monthlySavings(),
        expenses:        state.expenses || {},
        knowledge_score: state.knowledgeScore || 0,
        lifestyle_score: state.lifestyleScore || 0,
        weak_areas:      state.weakAreas || [],
      }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const text = data.detail || data.analysis || '—';
    _tipDetailCache[key] = text;
    bodyEl.textContent = text;
  } catch {
    bodyEl.innerHTML = '<span style="color:var(--muted);font-size:0.85rem">Server non disponibile. Avvia il server locale per gli approfondimenti AI.</span>';
  }
}

