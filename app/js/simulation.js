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
export function renderSimulation() {
  const pmt = Math.max(0, monthlySavings());
  const years = 20;
  const labels = Array.from({ length: years + 1 }, (_, i) => i === 0 ? 'Oggi' : `Anno ${i}`);

  const noInterest = labels.map((_, i) => pmt * i * 12);
  const low        = labels.map((_, i) => compoundGrowth(pmt, i, 0.02));
  const mid        = labels.map((_, i) => compoundGrowth(pmt, i, 0.05));
  const realPower  = labels.map((_, i) => (pmt * i * 12) / Math.pow(1.02, i));

  // Metriche riepilogative
  const savings = monthlySavings();
  document.getElementById('metricsGrid').innerHTML = `
    <div class="metric-card">
      <div class="metric-label">Risparmio mensile</div>
      <div class="metric-value" style="color:${savings >= 0 ? 'var(--success)' : 'var(--danger)'}">${fmt(savings)}</div>
      <div class="metric-sub">${savings >= 0 ? 'ottimo punto di partenza' : 'da riequilibrare'}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">In 10 anni — solo risparmio</div>
      <div class="metric-value">${fmt(Math.max(0, noInterest[10]))}</div>
      <div class="metric-sub">senza rendimenti</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">In 10 anni — investendo al 5%</div>
      <div class="metric-value" style="color:var(--success)">${fmt(Math.max(0, mid[10]))}</div>
      <div class="metric-sub">${mid[10] > noInterest[10] ? '+' + fmt(mid[10] - noInterest[10]) + ' extra' : ''}</div>
    </div>`;

  // Grafico Chart.js (distrugge il precedente se esiste)
  if (state.chart) state.chart.destroy();
  const ctx = document.getElementById('simulationChart').getContext('2d');
  state.chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Solo risparmio (0%)',               data: noInterest, borderColor: '#94A3B8', borderWidth: 2, tension: 0.3, fill: false },
        { label: 'Conto deposito (2%)',                data: low,        borderColor: '#2563EB', borderWidth: 2, tension: 0.3, fill: false },
        { label: 'Investimento moderato (5%)',          data: mid,        borderColor: '#16A34A', borderWidth: 3, tension: 0.3, fill: { target: 'origin', above: 'rgba(22,163,74,0.06)' } },
        { label: 'Potere acquisto reale (inflaz. 2%)', data: realPower,  borderColor: '#DC2626', borderWidth: 2, tension: 0.3, fill: false, borderDash: [6, 4] }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: c => c.dataset.label + ': ' + fmt(c.raw) } }
      },
      scales: { y: { ticks: { callback: v => fmt(v) } } }
    }
  });

  // Legenda testuale
  document.getElementById('chartLegendDesc').innerHTML = `
    <div class="legend-item"><div class="legend-dot" style="background:#94A3B8"></div>Risparmio puro: soldi sul conto, senza interessi</div>
    <div class="legend-item"><div class="legend-dot" style="background:#2563EB"></div>Conto deposito al 2% annuo: rendimento basso ma sicuro</div>
    <div class="legend-item"><div class="legend-dot" style="background:#16A34A"></div>Investimento moderato al 5% annuo: rendimento storico tipico dei fondi bilanciati</div>
    <div class="legend-item"><div class="legend-dot" style="background:#DC2626"></div>Potere d'acquisto reale: quanto valgono i risparmi dopo l'inflazione al 2%</div>`;

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
        topic:      key,
        title:      tip.title,
        level:      state.level || 'principiante',
        income:     state.income || 0,
        savings:    monthlySavings(),
        weak_areas: state.weakAreas || [],
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

