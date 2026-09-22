/**
 * FinanzaFacile — Expense Suggester Agent
 * =========================================
 * Corrisponde a POST /suggest-expenses.
 * Costruisce un prompt con il profilo utente e le risposte del quiz,
 * chiama Claude per ottenere stime di spesa in JSON, e le parsa.
 */

import { fileURLToPath }        from 'url';
import { dirname }              from 'path';
import { callClaude, loadPrompt } from './base-agent.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * buildPrompt(data) — costruisce il prompt per il suggerimento spese.
 * Aggrega le risposte del quiz in testo leggibile e carica il template.
 */
export function buildPrompt(d) {
  // Valori già inseriti dall'utente (non devono essere sovrascritti da Claude)
  const filled = Object.entries(d.already_filled ?? {})
    .map(([k, v]) => `${k}: €${v}`)
    .join(', ') || 'nessuno';

  // Risposte quiz in formato leggibile (due sorgenti possibili)
  const ctxLines = [];
  if (d.lifestyle_context && Object.keys(d.lifestyle_context).length) {
    Object.entries(d.lifestyle_context).forEach(([q, a]) => ctxLines.push(`  - ${q}: ${a}`));
  }
  if (d.lifestyle_answers?.length) {
    d.lifestyle_answers.forEach(({ question, answer }) => ctxLines.push(`  - ${question}: ${answer}`));
  }
  const quizAnswers = ctxLines.length
    ? `Risposte dal quiz:\n${ctxLines.join('\n')}`
    : '';

  return loadPrompt('expense-suggester', {
    LEVEL:          d.level ?? 'principiante',
    INCOME:         d.income ?? 0,
    QUIZ_ANSWERS:   quizAnswers,
    ALREADY_FILLED: filled,
  });
}

/**
 * run(data) — esegue il suggerimento spese.
 * Restituisce un oggetto JSON con le categorie di spesa stimate.
 * @throws {Error} se Claude non restituisce JSON valido
 */
export async function run(data) {
  const prompt = buildPrompt(data);
  const raw    = await callClaude(prompt);
  const match  = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('Risposta non parsabile come JSON');
  return JSON.parse(match[0]);
}
