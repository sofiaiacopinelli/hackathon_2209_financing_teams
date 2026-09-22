/**
 * @module mortgage
 * Gestione dello step mutuo: affordability, simulatore interattivo e valutazione preventivo.
 */

import { showStep } from './navigation.js';
import { state } from './state.js';
import { MARKET_RATES } from './market-rates.js';
import { MORTGAGE_DURATIONS, MORTGAGE_IMPROVEMENT_ACTIONS, QUIZ } from './constants.js';
import { monthlySavings, calcolaRata, calcolaImportoMax, fmt } from './utils.js';
import { SERVER } from './ai.js';

/**
 * Naviga allo step mutuo e renderizza la scheda di affordability.
 */
export function goToMortgage() {
  renderMortgage();
  showStep('mortgage');
}

/**
 * Naviga allo step valutatore preventivo.
 * Pre-popola la rata dal simulatore (se impostato) e, se l'utente ha già
 * un mutuo in corso, pre-popola la rata dalle spese inserite.
 */
export function goToEvaluator() {
  // Pre-fill dal simulatore interattivo
  const simAmount   = document.getElementById('simAmount');
  const simDuration = document.getElementById('simDuration');
  const simRate     = document.getElementById('simRate');
  if (simAmount?.value)   document.getElementById('evalAmount').value   = simAmount.value;
  if (simDuration?.value) document.getElementById('evalDuration').value = simDuration.value;
  if (simRate?.value)     document.getElementById('evalRate').value     = simRate.value;

  // Se ha già un mutuo in corso (housing=1), pre-popola rata dalla voce affitto/mutuo
  const housingIdx = QUIZ.findIndex(q => q.key === 'housing');
  if (housingIdx >= 0 && state.answers[housingIdx] === 1 && state.expenses?.affitto) {
    const evalRata = document.getElementById('evalRata');
    if (evalRata && !evalRata.value) evalRata.value = state.expenses.affitto;
  }

  showStep('evaluator');
}

/**
 * Renderizza la scheda di affordability mutuo:
 * indicatore di sostenibilità, tabella importi/rate per durata e nota sui tassi.
 * Avvia anche la simulazione interattiva.
 */
export function renderMortgage() {
  const surplus = monthlySavings();
  const rataMax30    = state.income * 0.30;
  const rataMaxReale = Math.max(0, surplus * 0.50);
  const rataPct      = state.income > 0 ? (rataMaxReale / state.income * 100) : 0;
  const status       = rataPct >= 20 ? 'ok' : rataPct >= 10 ? 'warning' : 'danger';
  const statusLabel  = {
    ok:      '✅ Situazione favorevole per un mutuo',
    warning: '⚠️ Margine limitato — valuta con attenzione',
    danger:  '❌ Da rafforzare prima di accendere un mutuo'
  };

  const liveTag = MARKET_RATES.live
    ? `<span class="market-live-badge" title="${state.marketDataSummary}">📡 Dati live BCE${MARKET_RATES.dateRef ? ' · ' + MARKET_RATES.dateRef : ''}</span>`
    : `<span class="market-live-badge market-live-badge--fallback">📋 Dati stimati</span>`;

  document.getElementById('mortgageResultCard').innerHTML = `
    <div class="mortgage-status ${status}">
      <div class="ms-icon">${status === 'ok' ? '🏠' : status === 'warning' ? '⚠️' : '🔴'}</div>
      <div class="ms-body">
        <strong>${statusLabel[status]}</strong>
        <span>Rata max realistica: <b>${fmt(rataMaxReale)}/mese</b> &nbsp;|&nbsp; Soglia del 30%: ${fmt(rataMax30)}/mese</span>
      </div>
    </div>
    <div class="mortgage-table">
      <div class="mt-row header"><span>Durata</span><span>Importo max</span><span>Rata stimata</span></div>
      ${MORTGAGE_DURATIONS.map(d => {
        const imp  = calcolaImportoMax(rataMaxReale, MARKET_RATES.fisso, d);
        const rata = calcolaRata(imp, MARKET_RATES.fisso, d);
        return `<div class="mt-row"><span>${d} anni</span><span class="mt-amount">${fmt(imp)}</span><span class="mt-rata">${fmt(rata)}/mese</span></div>`;
      }).join('')}
    </div>
    <p class="mt-note">${liveTag} Calcolato con tasso fisso ${MARKET_RATES.fisso}% · variabile ${MARKET_RATES.variabile}%${MARKET_RATES.inflazione ? ' · inflazione ' + MARKET_RATES.inflazione + '%' : ''}. Il TAEG effettivo varia per banca.</p>`;

  renderMortgageActions(status, surplus);
  updateMortgageSim();
}

async function renderMortgageActions(status, surplus) {
  const el = document.getElementById('mortgageActionsSection');
  if (!el) return;

  if (status === 'ok') {
    el.innerHTML = '';
    return;
  }

  const heading = status === 'danger'
    ? '🎯 Come migliorare la tua situazione prima del mutuo'
    : '🎯 Piccoli aggiustamenti per essere pronti';

  // Mostra loading state
  el.innerHTML = `
    <div class="action-section mortgage-actions-section">
      <h3>${heading}</h3>
      <div class="ai-loading-state">
        <span class="ai-loading-dot"></span>
        <span style="color:var(--muted);font-size:0.88rem">Claude analizza la tua situazione…</span>
      </div>
    </div>`;

  try {
    const res = await fetch(`${SERVER}/mortgage-coach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        level:           state.level || 'principiante',
        income:          state.income || 0,
        monthly_savings: surplus,
        expenses:        state.expenses || {},
        knowledge_score: state.knowledgeScore || 0,
        lifestyle_score: state.lifestyleScore || 0,
        market_rates:    MARKET_RATES.live
          ? { fisso: MARKET_RATES.fisso, variabile: MARKET_RATES.variabile }
          : null,
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const text = data.advice || '';

    // Renderizza la risposta AI come testo strutturato
    el.innerHTML = `
      <div class="action-section mortgage-actions-section">
        <h3>${heading}</h3>
        <div class="mortgage-coach-output">${formatMortgageCoachOutput(text)}</div>
      </div>`;
  } catch {
    // Fallback ai contenuti statici se il server non è disponibile
    const actions = MORTGAGE_IMPROVEMENT_ACTIONS[status] || [];
    el.innerHTML = `
      <div class="action-section mortgage-actions-section">
        <h3>${heading}</h3>
        <div class="action-list">
          ${actions.map((a, i) => `
            <div class="action-item">
              <div class="action-num">${i + 1}</div>
              <div class="action-text">
                <strong>${a.title}</strong>
                <span>${a.text}</span>
              </div>
            </div>`).join('')}
        </div>
      </div>`;
  }
}

function formatMortgageCoachOutput(text) {
  // Converte il formato **N. Titolo**\nTesto in action-item card
  const blocks = text.split(/\n\s*\n/).filter(b => b.trim());
  const items = blocks.map((block, i) => {
    const lines = block.trim().split('\n');
    const titleLine = lines[0].replace(/^\*\*\d+\.\s*/, '').replace(/\*\*$/, '').trim();
    const body = lines.slice(1).join(' ').trim();
    return `
      <div class="action-item">
        <div class="action-num">${i + 1}</div>
        <div class="action-text">
          <strong>${titleLine}</strong>
          ${body ? `<span>${body}</span>` : ''}
        </div>
      </div>`;
  });
  return `<div class="action-list">${items.join('')}</div>`;
}

// Traccia lo status dell'ultimo aggiornamento del simulatore per evitare chiamate ridondanti
let _lastSimStatus = null;

/**
 * Aggiorna il simulatore mutuo interattivo in base ai valori correnti degli slider.
 * Mostra rata, costo totale, incidenza sul reddito e stress test dei tassi.
 */
export function updateMortgageSim() {
  const amount   = parseFloat(document.getElementById('simAmount').value);
  const duration = parseFloat(document.getElementById('simDuration').value);
  const rate     = parseFloat(document.getElementById('simRate').value);

  document.getElementById('simAmountLabel').textContent   = fmt(amount);
  document.getElementById('simDurationLabel').textContent = duration + ' anni';
  document.getElementById('simRateLabel').textContent     = rate.toFixed(1) + '%';

  const rata           = calcolaRata(amount, rate, duration);
  const totale         = rata * duration * 12;
  const interessi      = totale - amount;
  const rataVsReddito  = state.income > 0 ? (rata / state.income * 100).toFixed(1) : null;
  const sostenibile    = state.income > 0 && rata <= state.income * 0.30;

  // Stress test: rata se il tasso sale di +1% e +2%
  const rataStress1 = calcolaRata(amount, rate + 1, duration);
  const rataStress2 = calcolaRata(amount, rate + 2, duration);
  const stress1Pct  = state.income > 0 ? (rataStress1 / state.income * 100).toFixed(1) : null;
  const stress2Pct  = state.income > 0 ? (rataStress2 / state.income * 100).toFixed(1) : null;
  const stressBlock = rate < 8 ? `
    <div class="stress-test">
      <div class="stress-title">📊 Stress test tasso</div>
      <div class="stress-row">
        <span>Tasso attuale <strong>${rate.toFixed(1)}%</strong></span>
        <span style="color:${sostenibile ? 'var(--success)' : 'var(--danger)'}">${fmt(rata)}/mese${rataVsReddito ? ' · ' + rataVsReddito + '% reddito' : ''}</span>
      </div>
      ${rate + 1 <= 8 ? `<div class="stress-row">
        <span>Se sale a <strong>${(rate + 1).toFixed(1)}%</strong></span>
        <span style="color:${stress1Pct && stress1Pct < 30 ? 'var(--warning)' : 'var(--danger)'}">${fmt(rataStress1)}/mese${stress1Pct ? ' · +' + fmt(rataStress1 - rata) : ''}</span>
      </div>` : ''}
      ${rate + 2 <= 8 ? `<div class="stress-row">
        <span>Se sale a <strong>${(rate + 2).toFixed(1)}%</strong></span>
        <span style="color:var(--danger)">${fmt(rataStress2)}/mese${stress2Pct ? ' · +' + fmt(rataStress2 - rata) : ''}</span>
      </div>` : ''}
    </div>` : '';

  document.getElementById('simResult').innerHTML = `
    <div class="sim-metrics">
      <div class="sim-metric"><span class="sm-label">Rata mensile</span><span class="sm-val" style="color:${sostenibile ? 'var(--success)' : 'var(--danger)'}">${fmt(rata)}</span></div>
      <div class="sim-metric"><span class="sm-label">% del tuo reddito</span><span class="sm-val" style="color:${sostenibile ? 'var(--success)' : 'var(--danger)'}">${rataVsReddito ? rataVsReddito + '%' : '—'}</span></div>
      <div class="sim-metric"><span class="sm-label">Totale restituito</span><span class="sm-val">${fmt(totale)}</span></div>
      <div class="sim-metric"><span class="sm-label">Di cui interessi</span><span class="sm-val" style="color:var(--warning)">${fmt(interessi)}</span></div>
    </div>
    <div style="background:${sostenibile ? 'var(--success-dim)' : 'var(--danger-dim)'}; border-left:3px solid ${sostenibile ? 'var(--success)' : 'var(--danger)'}; padding:12px 16px; margin-top:12px; font-size:0.88rem; color:var(--text)">
      ${sostenibile ? '✅ Questa rata è sostenibile (< 30% del reddito)' : '⚠️ Questa rata supera il 30% del reddito — rischio elevato'}
    </div>
    ${MARKET_RATES.live ? `<p style="font-size:0.78rem;color:var(--muted);margin-top:8px">📡 Tasso di riferimento aggiornato da BCE${MARKET_RATES.dateRef ? ' · ' + MARKET_RATES.dateRef : ''}</p>` : ''}
    ${stressBlock}`;

  // Mostra suggerimenti AI sotto il simulatore solo quando la rata non è sostenibile,
  // e solo se lo status è cambiato (evita chiamate ridondanti ad ogni slider move)
  const simStatus = !sostenibile
    ? (rataVsReddito && parseFloat(rataVsReddito) >= 40 ? 'danger' : 'warning')
    : 'ok';

  if (simStatus !== _lastSimStatus) {
    _lastSimStatus = simStatus;
    renderMortgageActions(simStatus, monthlySavings());
  }
}

/**
 * Valuta un preventivo mutuo inserito dall'utente: calcola LTV, sostenibilità rata,
 * confronto con i tassi di mercato e costo totale del finanziamento.
 * Mostra il banner AI per l'analisi approfondita via Claude.
 */
export function runEvaluation() {
  const amount    = parseFloat(document.getElementById('evalAmount').value) || 0;
  const propValue = parseFloat(document.getElementById('evalPropertyValue').value) || 0;
  const duration  = parseFloat(document.getElementById('evalDuration').value) || 0;
  const rate      = parseFloat(document.getElementById('evalRate').value) || 0;
  const taeg      = parseFloat(document.getElementById('evalTAEG').value) || 0;
  const rata      = parseFloat(document.getElementById('evalRata').value) || 0;
  const fees      = parseFloat(document.getElementById('evalFees').value) || 0;
  const rateType  = document.getElementById('evalRateType').value;

  if (!amount || !duration || !rate) return;

  const ltv           = propValue > 0 ? (amount / propValue * 100).toFixed(1) : null;
  const rataVsReddito = state.income > 0 && rata > 0 ? (rata / state.income * 100).toFixed(1) : null;

  const statusColor = { ok: 'var(--success)', warning: 'var(--warning)', danger: 'var(--danger)', neutral: '#555' };

  const indicators = [
    {
      label: 'Sostenibilità rata',
      value: rataVsReddito ? rataVsReddito + '% del reddito' : 'Completa il quiz con il tuo reddito',
      status: !rataVsReddito ? 'neutral' : rataVsReddito < 30 ? 'ok' : rataVsReddito < 40 ? 'warning' : 'danger',
      detail: !rataVsReddito
        ? 'Inserisci il reddito nel quiz per vedere questo indicatore'
        : rataVsReddito < 30
          ? 'Ottimo: sotto la soglia del 30%'
          : rataVsReddito < 40
            ? 'Attenzione: tra 30% e 40%, gestibile ma limitante'
            : 'Pericoloso: supera il 40% del reddito'
    },
    {
      label: 'LTV (Loan To Value)',
      value: ltv ? ltv + '%' : 'Inserisci il valore dell\'immobile',
      status: !ltv ? 'neutral' : ltv < 80 ? 'ok' : ltv < 90 ? 'warning' : 'danger',
      detail: !ltv
        ? 'Inserisci il valore dell\'immobile per calcolare l\'LTV'
        : ltv < 80
          ? 'Buono: LTV sotto l\'80%, condizioni più favorevoli'
          : ltv < 90
            ? 'Nella media: alcune banche richiedono assicurazione'
            : 'Alto: difficoltà di approvazione, tassi più alti'
    },
    {
      label: 'Competitività tasso vs mercato',
      value: rate.toFixed(2) + '% (benchmark' + (MARKET_RATES.live ? ' live' : '') + ': ' + MARKET_RATES.fisso + '%)',
      status: rate <= MARKET_RATES.fisso ? 'ok' : rate <= MARKET_RATES.fisso + 0.5 ? 'warning' : 'danger',
      detail: (rate <= MARKET_RATES.fisso
        ? 'Ottimo: in linea o sotto la media di mercato'
        : rate <= MARKET_RATES.fisso + 0.5
          ? 'Leggermente sopra la media — prova a negoziare'
          : 'Sopra la media di mercato — confronta altri istituti')
        + (MARKET_RATES.live ? ` (dati BCE${MARKET_RATES.dateRef ? ' · ' + MARKET_RATES.dateRef : ''})` : ' (dati stimati)')
    }
  ];

  const overallStatus = indicators.some(i => i.status === 'danger')  ? 'danger'  :
                        indicators.some(i => i.status === 'warning') ? 'warning' : 'ok';
  const overallLabel = {
    ok:      '✅ Preventivo complessivamente buono',
    warning: '⚠️ Preventivo accettabile con riserve',
    danger:  '❌ Preventivo da rivedere o negoziare'
  };

  // Costo totale del mutuo
  const rataCalcolata  = rata > 0 ? rata : calcolaRata(amount, rate, duration);
  const costoTotale    = rataCalcolata * 12 * duration;
  const totaleInteressi = costoTotale - amount;
  const costoBlock = `
    <div class="eval-costo-totale">
      <div class="ect-title">💸 Quanto ti costa davvero questo mutuo</div>
      <div class="ect-metrics">
        <div class="ect-metric">
          <span class="ect-label">Importo finanziato</span>
          <span class="ect-val">${fmt(amount)}</span>
        </div>
        <div class="ect-metric">
          <span class="ect-label">Interessi totali pagati</span>
          <span class="ect-val" style="color:var(--warning)">${fmt(totaleInteressi)}</span>
        </div>
        <div class="ect-metric ect-total">
          <span class="ect-label">Totale restituito in ${duration} anni</span>
          <span class="ect-val" style="color:var(--danger)">${fmt(costoTotale)}</span>
        </div>
      </div>
      <p class="ect-note">Paghi <strong>${fmt(totaleInteressi)}</strong> di interessi — cioè il <strong>${(totaleInteressi / amount * 100).toFixed(0)}%</strong> in più rispetto a quanto hai ricevuto.</p>
    </div>`;

  document.getElementById('evalResult').style.display = 'block';
  document.getElementById('evalResult').innerHTML = `
    <div style="border-left:3px solid ${statusColor[overallStatus]}; background:var(--bg-card); border:1px solid var(--border); padding:16px 20px; margin-bottom:12px">
      <strong style="font-size:1rem; display:block; margin-bottom:4px">${overallLabel[overallStatus]}</strong>
      <span style="color:var(--muted); font-size:0.82rem">Tipo: ${rateType} | Durata: ${duration} anni | TAEG dichiarato: ${taeg || '—'}%</span>
    </div>
    ${costoBlock}
    ${indicators.map(ind => `
      <div class="eval-indicator" style="border-left:3px solid ${statusColor[ind.status]}">
        <div class="ei-header">
          <span class="ei-label">${ind.label}</span>
          <span class="ei-value" style="color:${statusColor[ind.status]}">${ind.value}</span>
        </div>
        <p class="ei-detail">${ind.detail}</p>
      </div>`).join('')}`;

  document.getElementById('evalAiBanner').style.display = 'flex';
  state.evalData = { amount, propValue, duration, rate, taeg, rata, fees, rateType, ltv, rataVsReddito, overallStatus };
}

/**
 * Richiede al server un'analisi AI del preventivo mutuo valutato.
 * Usa i dati salvati in state.evalData.
 * @returns {Promise<void>}
 */
export async function requestEvalAI() {
  if (!state.evalData) return;

  const btn = document.querySelector('#evalAiBanner .btn-ai');
  btn.textContent = '⏳ Analisi in corso…';
  btn.disabled = true;

  const d = state.evalData;

  try {
    const res = await fetch(`${SERVER}/mortgage-offer`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level:            state.level,
        income:           state.income,
        monthly_savings:  monthlySavings(),
        amount:           d.amount,
        property_value:   d.propValue ?? 0,
        duration_years:   d.duration,
        rate:             d.rate,
        taeg:             d.taeg ?? 0,
        declared_payment: d.rata ?? 0,
        fees:             d.fees ?? 0,
        rate_type:        d.rateType ?? 'fisso',
        market_rates:     MARKET_RATES.live
          ? { fisso: MARKET_RATES.fisso, variabile: MARKET_RATES.variabile }
          : null,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    document.getElementById('evalAiResultBody').textContent = data.analysis;
    document.getElementById('evalAiResult').style.display = 'block';
    document.getElementById('evalAiBanner').style.display = 'none';

  } catch (err) {
    const isNetwork = err.message.includes('fetch') || err.message.includes('Failed') || err.message.includes('NetworkError');
    if (isNetwork) {
      alert('Server non raggiungibile.\n\nAvvia il server dal terminale di Claude Code:\n  cd app/server\n  npm install\n  npm start');
    } else {
      alert('Errore AI: ' + err.message);
    }
    btn.textContent = 'Analizza con AI';
    btn.disabled = false;
  }
}
