/**
 * @module ai
 * Costante SERVER e funzione requestAIAnalysis per l'analisi personalizzata via Claude.
 * Il server Node locale espone le route /analyze, /quiz-feedback, /suggest-expenses, /mortgage-offer.
 */

import { state } from './state.js';
import { MARKET_RATES } from './market-rates.js';
import { monthlySavings } from './utils.js';

/**
 * URL base del server locale Node/Express.
 * @constant {string}
 */
export const SERVER = 'http://localhost:3000';

/**
 * Richiede al server un'analisi AI personalizzata della situazione finanziaria dell'utente.
 * Aggiorna la UI con il risultato o mostra un alert in caso di errore.
 * @returns {Promise<void>}
 */
export async function requestAIAnalysis() {
  const btn = document.querySelector('#aiBanner .btn-ai');
  btn.textContent = '⏳ Analisi in corso…';
  btn.disabled = true;

  const mortgageInterest = Object.values(state.mortgageContext ?? {}).some(v => v === 0);

  try {
    const res = await fetch(`${SERVER}/analyze`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        knowledge_score:   state.knowledgeScore,
        lifestyle_score:   state.lifestyleScore,
        income:            state.income,
        expenses:          state.expenses,
        lifestyle_context: state.lifestyleContext,
        mortgage_context:  state.mortgageContext,
        mortgage_interest: mortgageInterest,
        market_data:       state.marketDataSummary || null,
        market_rates:      MARKET_RATES.live
          ? { fisso: MARKET_RATES.fisso, variabile: MARKET_RATES.variabile }
          : null,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    document.getElementById('aiResultBody').textContent = data.analysis;
    document.getElementById('aiResult').style.display = 'block';
    document.getElementById('aiBanner').style.display = 'none';

  } catch (err) {
    const isNetwork = err.message.includes('fetch') || err.message.includes('Failed') || err.message.includes('NetworkError');
    if (isNetwork) {
      alert('Server non raggiungibile.\n\nAvvia il server dal terminale di Claude Code:\n  cd server\n  npm install\n  npm start');
    } else {
      alert('Errore analisi AI: ' + err.message);
    }
    btn.textContent = 'Analizza con AI';
    btn.disabled = false;
  }
}
