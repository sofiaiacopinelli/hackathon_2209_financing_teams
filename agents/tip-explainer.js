/**
 * FinanzaFacile — Tip Explainer Agent
 * =====================================
 * Corrisponde a POST /tip-detail.
 * Genera un approfondimento personalizzato su un concetto finanziario,
 * adattato al livello e alla situazione economica dell'utente.
 */

import { callClaude, loadPrompt, LEVEL_STYLE } from './base-agent.js';

// Descrizioni base dei concetti (usate come "già visto" per non ripetere)
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

  return loadPrompt('tip-explainer', {
    TOPIC:          topic,
    LEVEL:          level,
    LEVEL_STYLE:    levelStyle,
    INCOME:         d.income ?? 0,
    SAVINGS:        d.savings ?? 0,
    WEAK_AREAS:     (d.weak_areas ?? []).join(', ') || 'non specificate',
    ALREADY_SHOWN:  TOPIC_BASE[topic] ?? '',
  });
}

export async function run(data) {
  const prompt = buildPrompt(data);
  return callClaude(prompt);
}
