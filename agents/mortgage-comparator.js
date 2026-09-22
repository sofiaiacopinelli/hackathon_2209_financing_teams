/**
 * FinanzaFacile — Mortgage Comparator Agent
 * ==========================================
 * Corrisponde a POST /mortgage-compare.
 * Confronta il preventivo reale inserito dall'utente con il profilo ideale
 * calcolato nello step mutuo (rata sostenibile, importo massimo, tasso BCE).
 */

import { fileURLToPath }              from 'url';
import { dirname }                    from 'path';
import { runSkill, setMarketRates }   from '../app/server/skills.js';
import { callClaude, loadPrompt, LEVEL_STYLE } from './base-agent.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function skill(name, input) {
  const result = runSkill(name, input);
  console.log(`  [skill] ${name}`);
  return result;
}

export function buildPrompt(d) {
  if (d.market_rates) setMarketRates(d.market_rates);

  const cmp = skill('compare_mortgage_offer', {
    income:           d.income,
    monthly_savings:  d.monthly_savings,
    ideal_rate:       d.ideal_rate,
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

  const comparisons = cmp.comparisons
    .map(c => `- ${c.name}: ideale ${c.ideal_label} → offerto ${c.offered_label} [${c.status.toUpperCase()}] — ${c.note}`)
    .join('\n');

  return loadPrompt('mortgage-comparator', {
    LEVEL_STYLE:    levelStyle,
    IDEAL_RATA:     cmp.ideal_rata.toLocaleString('it-IT'),
    IDEAL_AMOUNT:   cmp.ideal_amount.toLocaleString('it-IT'),
    IDEAL_RATE:     cmp.ideal_rate,
    OFFERED_RATA:   cmp.offered_rata.toLocaleString('it-IT'),
    OFFERED_AMOUNT: cmp.offered_amount.toLocaleString('it-IT'),
    OFFERED_RATE:   cmp.offered_rate,
    TAEG:           d.taeg ?? '—',
    RATE_TYPE:      d.rate_type ?? 'fisso',
    DURATION_YEARS: d.duration_years,
    FEES:           d.fees ? d.fees.toLocaleString('it-IT') : '0',
    COMPARISONS:    comparisons,
    OVERALL_LABEL:  cmp.overall_label,
  });
}

export async function run(data) {
  const prompt = buildPrompt(data);
  return callClaude(prompt);
}
