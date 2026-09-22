/**
 * FinanzaFacile — Tip Explainer Agent
 * =====================================
 * Corrisponde a POST /tip-detail.
 * Genera un approfondimento personalizzato su un concetto finanziario,
 * adattato al livello e alla situazione economica dell'utente.
 * Usa skill: evaluate_quiz + analyze_expenses per contestualizzare.
 */

import { runSkill } from '../app/server/skills.js';
import { callClaude, loadPrompt, LEVEL_STYLE } from './base-agent.js';

function skill(name, input) {
  const result = runSkill(name, input);
  console.log(`  [skill] ${name}`);
  return result;
}

const TOPIC_BASE = {
  interesse:  "L'interesse è il costo o il guadagno del denaro nel tempo; l'interesse composto fa crescere il capitale esponenzialmente.",
  tasso:      "Il tasso indica quanto costa o rende il denaro; esistono tassi fissi e variabili, nominali e reali.",
  inflazione: "L'inflazione è l'aumento generale dei prezzi; erode il potere d'acquisto dei risparmi fermi.",
  rata:       "La rata è la quota mensile di rimborso di un prestito; include capitale e interessi, con ammortamento alla francese.",
  taeg:       "Il TAEG è il costo totale reale di un prestito in percentuale annua; include tutti i costi obbligatori.",
};

export function buildPrompt(d) {
  const level      = d.level ?? 'principiante';
  const levelStyle = LEVEL_STYLE[level] || LEVEL_STYLE.principiante;
  const topic      = d.topic ?? 'interesse';

  // Skill 1: profilo finanziario dall'utente
  const quiz = skill('evaluate_quiz', {
    knowledge_score: d.knowledge_score ?? 0,
    lifestyle_score: d.lifestyle_score ?? 0,
  });

  // Skill 2: analisi spese (solo se disponibili)
  const hasExpenses = d.expenses && Object.keys(d.expenses).length > 0;
  const exp = hasExpenses
    ? skill('analyze_expenses', { income: d.income ?? 0, expenses: d.expenses })
    : null;

  // Costruzione contesto spese per il prompt
  let expenseContext = 'dati spese non disponibili';
  if (exp) {
    const anomStr = exp.anomalies.length
      ? `Spese elevate: ${exp.anomalies.map(a => `${a.category} al ${a.pct_of_income}%`).join(', ')}.`
      : 'Nessuna categoria fuori soglia.';
    expenseContext = [
      `Tasso di risparmio: ${exp.savings_rate_pct}% del reddito.`,
      `Spesa principale: ${exp.top_category.name} (€${exp.top_category.amount}).`,
      anomStr,
    ].join(' ');
  }

  return loadPrompt('tip-explainer', {
    TOPIC:            topic,
    LEVEL:            level,
    LEVEL_STYLE:      levelStyle,
    INCOME:           d.income ?? 0,
    SAVINGS:          d.savings ?? exp?.monthly_savings ?? 0,
    WEAK_AREAS:       (quiz.weak_areas ?? d.weak_areas ?? []).join(', ') || 'non specificate',
    EXPENSE_CONTEXT:  expenseContext,
    ALREADY_SHOWN:    TOPIC_BASE[topic] ?? '',
  });
}

export async function run(data) {
  const prompt = buildPrompt(data);
  return callClaude(prompt);
}
