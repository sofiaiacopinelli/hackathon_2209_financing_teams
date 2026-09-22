/**
 * FinanzaFacile — Expense Suggester Agent
 * =========================================
 * Corrisponde a POST /suggest-expenses.
 * Costruisce un prompt con il profilo utente e le risposte del quiz,
 * chiama Claude per ottenere stime di spesa in JSON, e le valida.
 */

import { callClaude, loadPrompt } from './base-agent.js';

const EXPENSE_KEYS = ['affitto','spesa','ristoranti','trasporti','bollette','abbonamenti','shopping','salute','svago','altro'];

export function buildPrompt(d) {
  const income = d.income ?? 0;

  // Valori già inseriti — riprodotti esattamente nel prompt
  const alreadyFilled = d.already_filled ?? {};
  const filledLines = Object.keys(alreadyFilled).length
    ? Object.entries(alreadyFilled).map(([k, v]) => `  ${k}: €${v}`).join('\n')
    : '  (nessuno — stima tutto tu)';

  // Separa contesto fattuale (housing, famiglia, auto) da abitudini finanziarie
  const lifeCtxLines = [];
  const habitLines   = [];

  if (d.lifestyle_context && Object.keys(d.lifestyle_context).length) {
    // lifestyle_context: domande fattuali (abitazione, famiglia, auto, ecc.)
    Object.entries(d.lifestyle_context).forEach(([q, a]) => lifeCtxLines.push(`  - ${q}: ${a}`));
  }

  if (d.lifestyle_answers?.length) {
    // lifestyle: abitudini di risparmio e gestione denaro
    d.lifestyle_answers.forEach(({ question, answer }) => habitLines.push(`  - ${question}: ${answer}`));
  }

  const lifeContext = lifeCtxLines.length ? lifeCtxLines.join('\n') : '  (non disponibile)';
  const habits      = habitLines.length   ? habitLines.join('\n')   : '  (non disponibile)';

  return loadPrompt('expense-suggester', {
    LEVEL:          d.level ?? 'principiante',
    INCOME:         income,
    LIFE_CONTEXT:   lifeContext,
    HABITS:         habits,
    ALREADY_FILLED: filledLines,
  });
}

/**
 * validateExpenses(raw, income, alreadyFilled) — post-processing della risposta Claude.
 * - Clamp a 0 i valori negativi
 * - Ripristina i valori already_filled con quelli originali dell'utente
 * - Se il totale supera il 95% del reddito, scala proporzionalmente le voci non bloccate
 */
function validateExpenses(raw, income, alreadyFilled) {
  const result = {};
  const filled = alreadyFilled ?? {};

  // 1. Forza le chiavi attese, clamp negativi
  EXPENSE_KEYS.forEach(k => {
    result[k] = Math.max(0, Math.round(parseFloat(raw[k]) || 0));
  });

  // 2. Ripristina le voci già inserite dall'utente (garanzia assoluta)
  Object.entries(filled).forEach(([k, v]) => {
    if (EXPENSE_KEYS.includes(k)) result[k] = Math.round(parseFloat(v) || 0);
  });

  // 3. Se il totale supera il 90% del reddito, scala le voci non bloccate
  if (income > 0) {
    const cap = income * 0.90;
    const filledKeys = new Set(Object.keys(filled));
    const total = EXPENSE_KEYS.reduce((s, k) => s + result[k], 0);

    if (total > cap) {
      const filledTotal = [...filledKeys].reduce((s, k) => s + (result[k] || 0), 0);
      const scalableCap = cap - filledTotal;
      const scalableTotal = EXPENSE_KEYS
        .filter(k => !filledKeys.has(k))
        .reduce((s, k) => s + result[k], 0);

      if (scalableTotal > 0 && scalableCap > 0) {
        const ratio = scalableCap / scalableTotal;
        EXPENSE_KEYS.filter(k => !filledKeys.has(k)).forEach(k => {
          result[k] = Math.round(result[k] * ratio);
        });
      }
    }
  }

  return result;
}

/**
 * run(data) — esegue il suggerimento spese.
 * Restituisce un oggetto con le categorie di spesa stimate e validate.
 */
export async function run(data) {
  const prompt = buildPrompt(data);
  const raw    = await callClaude(prompt);

  // Estrai il JSON dalla risposta (gestisce eventuali markdown o testo extra)
  const match  = raw.match(/\{[\s\S]*?\}/);
  if (!match) throw new Error('Risposta non parsabile come JSON');

  const parsed = JSON.parse(match[0]);
  return validateExpenses(parsed, data.income ?? 0, data.already_filled ?? {});
}
