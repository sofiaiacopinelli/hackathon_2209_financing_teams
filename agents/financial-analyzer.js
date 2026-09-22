/**
 * FinanzaFacile — Financial Analyzer Agent
 * =========================================
 * Corrisponde a POST /analyze.
 * Calcola i dati dalle skill JS, popola i placeholder del template
 * financial-analyzer.md e chiama Claude per l'analisi testuale.
 */

import { fileURLToPath }              from 'url';
import { dirname, join }              from 'path';
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
 * buildPrompt(data) — costruisce il prompt per l'analisi finanziaria.
 * Calcola quiz, spese, simulazione, consigli, mutuo, poi carica il
 * template e sostituisce i placeholder.
 */
export function buildPrompt(d) {
  if (d.market_rates) setMarketRates(d.market_rates);

  const quiz = skill('evaluate_quiz', {
    knowledge_score: d.knowledge_score ?? 0,
    lifestyle_score: d.lifestyle_score ?? 0,
  });
  const exp  = skill('analyze_expenses', { income: d.income ?? 0, expenses: d.expenses ?? {} });
  const sim  = exp.monthly_savings > 0
    ? skill('run_simulation', { monthly_savings: exp.monthly_savings })
    : null;
  const tips = skill('get_tips', { level: quiz.level, focus_areas: quiz.weak_areas });
  const mort = d.mortgage_interest
    ? skill('propose_mortgage', { income: d.income ?? 0, monthly_savings: exp.monthly_savings })
    : null;

  const levelStyle = LEVEL_STYLE[quiz.level] || LEVEL_STYLE.principiante;

  // ── Sezione ANOMALIE (opzionale) ─────────────────────────────
  const anomalies = exp.anomalies.length
    ? `- Spese elevate: ${exp.anomalies.map(a => `${a.category} (${a.pct_of_income}% del reddito)`).join(', ')}`
    : '';

  // ── Sezione SIMULAZIONE (opzionale) ──────────────────────────
  let simulation = '';
  if (sim) {
    simulation = [
      'PROIEZIONE RISPARMIO (investimento moderato 5%/anno)',
      `- 5 anni: €${sim.scenarios.investimento_moderato['5yr'].toLocaleString('it-IT')}`,
      `- 10 anni: €${sim.scenarios.investimento_moderato['10yr'].toLocaleString('it-IT')}`,
      `- 20 anni: €${sim.scenarios.investimento_moderato['20yr'].toLocaleString('it-IT')}`,
      `- Guadagno vs risparmio puro (10 anni): +€${sim.investment_gain_10yr.toLocaleString('it-IT')}`,
    ].join('\n');
  }

  // ── Sezione CONSIGLI (opzionale) ─────────────────────────────
  let tipsSection = '';
  if (tips.tips.length) {
    tipsSection = 'CONSIGLI PERSONALIZZATI\n' +
      tips.tips.map(t => `- [${t.area}] ${t.tip}`).join('\n');
  }

  // ── Sezione MUTUO (opzionale) ─────────────────────────────────
  let mortgageSection = '';
  if (mort) {
    const lines = [
      `FATTIBILITA' MUTUO`,
      `- Stato: ${mort.status_label}`,
      `- Rata max sostenibile: €${mort.max_rata_realistic}/mese`,
    ];
    if (mort.table_by_duration.length) {
      const best = mort.table_by_duration[mort.table_by_duration.length - 1];
      lines.push(`- Importo stimabile (${best.years} anni): €${best.max_amount.toLocaleString('it-IT')}`);
    }
    mortgageSection = lines.join('\n');
  }

  return loadPrompt('financial-analyzer', {
    LEVEL_STYLE:       levelStyle,
    LEVEL:             quiz.level,
    SCORE:             quiz.total_score,
    MAX_SCORE:         quiz.max_score,
    WEAK_AREAS:        quiz.weak_areas.join(', '),
    INCOME:            exp.income,
    TOTAL_EXPENSES:    exp.total_expenses,
    MONTHLY_SAVINGS:   exp.monthly_savings,
    SAVINGS_RATE_PCT:  exp.savings_rate_pct,
    ANOMALIES:         anomalies,
    SIMULATION:        simulation,
    TIPS:              tipsSection,
    MORTGAGE:          mortgageSection,
    MARKET_DATA:       d.market_data ?? '',
  });
}

/**
 * run(data) — esegue l'analisi finanziaria completa.
 * Restituisce la stringa prodotta da Claude.
 */
export async function run(data) {
  const prompt = buildPrompt(data);
  return callClaude(prompt);
}
