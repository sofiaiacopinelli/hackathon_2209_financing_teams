/**
 * FinanzaFacile — Mortgage Coach Agent
 * ======================================
 * Corrisponde a POST /mortgage-coach.
 * Genera prossimi passi personalizzati per migliorare la situazione
 * finanziaria dell'utente prima di accendere un mutuo.
 * Usa skill: propose_mortgage + analyze_expenses.
 */

import { runSkill, setMarketRates } from '../app/server/skills.js';
import { callClaude, loadPrompt, LEVEL_STYLE } from './base-agent.js';

function skill(name, input) {
  const result = runSkill(name, input);
  console.log(`  [skill] ${name}`);
  return result;
}

export function buildPrompt(d) {
  if (d.market_rates) setMarketRates(d.market_rates);

  const mort = skill('propose_mortgage', {
    income:          d.income ?? 0,
    monthly_savings: d.monthly_savings ?? 0,
  });
  const exp = skill('analyze_expenses', {
    income:   d.income ?? 0,
    expenses: d.expenses ?? {},
  });

  const level      = d.level ?? 'principiante';
  const levelStyle = LEVEL_STYLE[level] || LEVEL_STYLE.principiante;

  // Spese più alte e anomalie — identificano dove agire
  const topSpese = Object.entries(d.expenses ?? {})
    .filter(([, v]) => parseFloat(v) > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([k, v]) => `${k}: €${v}`)
    .join(', ');

  const anomalie = exp.anomalies.length
    ? exp.anomalies.map(a => `${a.category} (${a.pct_of_income}% del reddito, max consigliato ${a.suggested_max_pct}%)`).join(', ')
    : 'nessuna anomalia rilevata';

  // Gap rispetto alla soglia del 20% (ok)
  const targetSurplus = Math.round(d.income * 0.20 / 0.50); // rata target / 50% surplus
  const gapMensile    = Math.max(0, targetSurplus - (d.monthly_savings ?? 0));

  return loadPrompt('mortgage-coach', {
    LEVEL_STYLE:      levelStyle,
    LEVEL:            level,
    STATUS:           d.status ?? mort.status,
    STATUS_LABEL:     mort.status_label,
    INCOME:           d.income ?? 0,
    MONTHLY_SAVINGS:  d.monthly_savings ?? 0,
    SAVINGS_RATE_PCT: exp.savings_rate_pct,
    MAX_RATA:         mort.max_rata_realistic,
    AFFORD_PCT:       mort.affordability_pct,
    TOP_SPESE:        topSpese || 'non disponibili',
    ANOMALIE:         anomalie,
    GAP_MENSILE:      gapMensile,
    BEST_IMPORTO:     mort.table_by_duration.at(-1)?.max_amount ?? 0,
    BEST_DURATA:      mort.table_by_duration.at(-1)?.years ?? 30,
  });
}

export async function run(data) {
  const prompt = buildPrompt(data);
  return callClaude(prompt);
}
