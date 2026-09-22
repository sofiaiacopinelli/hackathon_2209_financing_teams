/**
 * FinanzaFacile — Mortgage Advisor Agent
 * ========================================
 * Corrisponde a POST /mortgage-offer.
 * Valuta un preventivo mutuo tramite la skill `evaluate_mortgage_offer`,
 * popola il template mortgage-advisor.md e chiama Claude per il parere.
 */

import { fileURLToPath }              from 'url';
import { dirname }                    from 'path';
import { runSkill, setMarketRates }   from '../app/server/skills.js';
import { callClaude, loadPrompt, LEVEL_STYLE } from './base-agent.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Helper locale per le skill ────────────────────────────────────
function skill(name, input) {
  const result = runSkill(name, input);
  console.log(`  [skill] ${name}`);
  return result;
}

/**
 * buildPrompt(data) — costruisce il prompt per la valutazione del mutuo.
 * Calcola gli indicatori tramite skill, poi carica il template e popola i placeholder.
 */
export function buildPrompt(d) {
  if (d.market_rates) setMarketRates(d.market_rates);

  const eval_ = skill('evaluate_mortgage_offer', {
    income:           d.income,
    amount:           d.amount,
    property_value:   d.property_value ?? 0,
    duration_years:   d.duration_years,
    rate:             d.rate,
    taeg:             d.taeg ?? 0,
    declared_payment: d.declared_payment ?? 0,
    fees:             d.fees ?? 0,
    rate_type:        d.rate_type ?? 'fisso',
  });

  const levelStyle = LEVEL_STYLE[d.level] || LEVEL_STYLE.principiante;

  // ── Delta rata (opzionale) ────────────────────────────────────
  const paymentDelta = eval_.payment_delta !== null
    ? `- Delta rata: €${eval_.payment_delta > 0 ? '+' : ''}${eval_.payment_delta}`
    : '';

  // ── Lista indicatori ──────────────────────────────────────────
  const indicators = eval_.indicators
    .map(i => `- ${i.name}: ${i.value} → ${i.status.toUpperCase()} (${i.detail})`)
    .join('\n');

  return loadPrompt('mortgage-advisor', {
    LEVEL_STYLE:       levelStyle,
    AMOUNT:            d.amount,
    DURATION_YEARS:    d.duration_years,
    RATE_TYPE:         d.rate_type ?? 'fisso',
    RATE:              d.rate,
    TAEG:              d.taeg ?? '—',
    DECLARED_PAYMENT:  d.declared_payment ?? '—',
    COMPUTED_PAYMENT:  eval_.computed_payment,
    PAYMENT_DELTA:     paymentDelta,
    INDICATORS:        indicators,
    OVERALL_LABEL:     eval_.overall_label,
  });
}

/**
 * run(data) — esegue la valutazione del preventivo mutuo.
 * Restituisce la stringa prodotta da Claude.
 */
export async function run(data) {
  const prompt = buildPrompt(data);
  return callClaude(prompt);
}
