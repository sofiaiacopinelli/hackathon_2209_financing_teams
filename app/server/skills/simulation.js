/**
 * @module skills/simulation
 * Skill `run_simulation`: proietta la crescita del risparmio mensile
 * su orizzonti temporali diversi con tre scenari di rendimento.
 */

/**
 * Calcola il montante finale con versamento mensile costante e interesse composto.
 *
 * @param {number} pmt  - Versamento mensile in euro.
 * @param {number} years - Orizzonte temporale in anni.
 * @param {number} rate  - Tasso annuo (es. 0.05 per 5%).
 * @returns {number} Montante finale in euro.
 */
function compoundGrowth(pmt, years, rate) {
  if (pmt <= 0) return 0;
  if (rate === 0) return pmt * years * 12;
  const r = rate / 12;
  const n = years * 12;
  return pmt * ((Math.pow(1 + r, n) - 1) / r);
}

/**
 * Simula la crescita del risparmio mensile su 5, 10 e 20 anni
 * con tre scenari: risparmio puro, conto deposito (2%), investimento moderato (5%).
 *
 * @param {object} input
 * @param {number} input.monthly_savings - Risparmio mensile netto in euro.
 * @returns {{monthly_savings: number, scenarios: object, investment_gain_10yr: number, investment_gain_20yr: number}}
 */
export function runSimulation({ monthly_savings }) {
  const pmt       = Math.max(0, monthly_savings ?? 0);
  const scenarios = {};

  for (const [name, rate] of [
    ['risparmio_puro',        0],
    ['conto_deposito',        0.02],
    ['investimento_moderato', 0.05],
  ]) {
    scenarios[name] = {
      annual_rate_pct: rate * 100,
      '5yr':  Math.round(compoundGrowth(pmt, 5,  rate)),
      '10yr': Math.round(compoundGrowth(pmt, 10, rate)),
      '20yr': Math.round(compoundGrowth(pmt, 20, rate)),
    };
  }

  return {
    monthly_savings: pmt,
    scenarios,
    investment_gain_10yr: scenarios.investimento_moderato['10yr'] - scenarios.risparmio_puro['10yr'],
    investment_gain_20yr: scenarios.investimento_moderato['20yr'] - scenarios.risparmio_puro['20yr'],
  };
}
