/**
 * @module simulation
 * Gestione dello step "simulazione futura": grafico, metriche, tips educativi e azioni consigliate.
 */

import { showStep } from './navigation.js';
import { state } from './state.js';
import { TIPS, ACTIONS } from './constants.js';
import { monthlySavings, compoundGrowth, fmt } from './utils.js';

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
  renderActions(savings);
}

/**
 * Renderizza le card educative sui concetti finanziari, calibrate per il livello utente.
 */
export function renderTips() {
  const level = state.level || 'principiante';
  const introText = {
    principiante: "Ecco i 5 concetti fondamentali della finanza personale, spiegati in parole semplici. Capirli ti aiuterà a prendere decisioni migliori con i tuoi soldi.",
    intermedio: "I concetti chiave con qualche dettaglio in più — le sfumature che ti aiutano a ottimizzare le tue scelte finanziarie.",
    esperto: "Una sintesi tecnica con focus sulle implicazioni pratiche per la tua strategia finanziaria."
  };
  document.getElementById('tipsIntro').textContent = introText[level];

  const grid = document.getElementById('tipsGrid');
  grid.innerHTML = '';
  Object.values(TIPS).forEach(tip => {
    const content = tip[level];
    const card = document.createElement('div');
    card.className = 'tip-card';
    card.style.borderLeftColor = tip.color;
    card.innerHTML = `
      <div class="tip-header">
        <div class="tip-title">${tip.icon} ${tip.title}</div>
        <span class="tip-tag" style="background:${tip.color}20;color:${tip.color}">${level}</span>
      </div>
      <p class="tip-simple">${content.simple}</p>
      <div class="tip-example">${content.example}</div>`;
    grid.appendChild(card);
  });
}

/**
 * Renderizza le azioni consigliate per il livello utente.
 * Se il risparmio mensile è negativo, aggiunge un avviso prioritario in cima.
 *
 * @param {number} savings - Risparmio mensile corrente in euro
 */
export function renderActions(savings) {
  const level = state.level || 'principiante';
  let actions = [...(ACTIONS[level] || ACTIONS.principiante)];

  if (savings < 0) {
    actions.unshift({
      title: '⚠️ Le uscite superano le entrate',
      text: "La priorità assoluta è riequilibrare il budget. Identifica le spese più facili da ridurre (ristoranti, abbonamenti, shopping) e punta ad avere almeno qualcosa da parte ogni mese."
    });
  }

  document.getElementById('actionList').innerHTML = actions.slice(0, 4).map((a, i) => `
    <div class="action-item">
      <div class="action-num">${i + 1}</div>
      <div class="action-text">
        <strong>${a.title}</strong>
        <span>${a.text}</span>
      </div>
    </div>`).join('');
}
