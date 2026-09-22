/**
 * @module skills/mortgage
 * Skill `propose_mortgage` e `evaluate_mortgage_offer`.
 *
 * - `propose_mortgage`: calcola l'affordability mutuo dato reddito e risparmio.
 * - `evaluate_mortgage_offer`: analizza un preventivo mutuo ricevuto da una banca.
 *
 * I tassi di mercato di riferimento sono aggiornabili a runtime tramite `setMarketRates`.
 */

/** Tasso fisso di riferimento (default fallback, aggiornato dai dati BCE live). */
let MARKET_RATE     = 3.5;

/** Tasso variabile di riferimento (default fallback). */
let MARKET_RATE_VAR = 2.8;

/** Durate standard in anni per le simulazioni. */
const DURATIONS = [10, 15, 20, 25, 30];

/**
 * Aggiorna i tassi di mercato con i dati live (BCE / Banca d'Italia).
 * Chiamato da `prompts.js` quando il client invia `market_rates` nel body.
 *
 * @param {object} rates
 * @param {number} [rates.fisso]    - Tasso fisso aggiornato (es. 3.2).
 * @param {number} [rates.variabile] - Tasso variabile aggiornato (es. 2.5).
 */
export function setMarketRates({ fisso, variabile } = {}) {
  if (fisso     && typeof fisso === 'number')     MARKET_RATE     = fisso;
  if (variabile && typeof variabile === 'number') MARKET_RATE_VAR = variabile;
}

/**
 * Calcola la rata mensile di un mutuo con ammortamento alla francese.
 *
 * @param {number} amount        - Importo finanziato in euro.
 * @param {number} annualRatePct - Tasso annuo in percentuale (es. 3.5).
 * @param {number} years         - Durata in anni.
 * @returns {number} Rata mensile in euro.
 */
function monthlyPayment(amount, annualRatePct, years) {
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  if (r === 0) return amount / n;
  return amount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

/**
 * Calcola l'importo massimo finanziabile dato un tetto di rata mensile.
 *
 * @param {number} maxPayment    - Rata massima sostenibile in euro.
 * @param {number} annualRatePct - Tasso annuo in percentuale.
 * @param {number} years         - Durata in anni.
 * @returns {number} Importo massimo in euro.
 */
function maxAmount(maxPayment, annualRatePct, years) {
  const r = annualRatePct / 100 / 12;
  const n = years * 12;
  if (r === 0) return maxPayment * n;
  return maxPayment * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n));
}

/**
 * Calcola l'affordability mutuo: quanto può permettersi di richiedere l'utente
 * in base al reddito e al risparmio mensile, secondo la regola del 30%.
 *
 * @param {object} input
 * @param {number} input.income          - Reddito mensile lordo in euro.
 * @param {number} [input.monthly_savings] - Risparmio mensile netto in euro.
 * @returns {{status: string, status_label: string, max_rata_30pct_rule: number, max_rata_realistic: number, affordability_pct: number, reference_rate_pct: number, table_by_duration: object[]}}
 */
export function proposeMortgage({ income, monthly_savings }) {
  const maxRata30 = income * 0.30;
  const maxRataR  = Math.max(0, (monthly_savings ?? 0) * 0.50);
  const affordPct = income > 0 ? maxRataR / income * 100 : 0;
  const status    = affordPct >= 20 ? 'ok' : affordPct >= 10 ? 'warning' : 'danger';
  const statusLabel = {
    ok:      'Situazione favorevole per un mutuo',
    warning: 'Margine limitato — valuta con attenzione',
    danger:  'Da rafforzare prima di accendere un mutuo',
  };

  return {
    status,
    status_label:       statusLabel[status],
    max_rata_30pct_rule: Math.round(maxRata30),
    max_rata_realistic:  Math.round(maxRataR),
    affordability_pct:   Math.round(affordPct * 10) / 10,
    reference_rate_pct:  MARKET_RATE,
    table_by_duration:   DURATIONS.map(dur => {
      const imp  = maxAmount(maxRataR, MARKET_RATE, dur);
      const rata = monthlyPayment(imp, MARKET_RATE, dur);
      return { years: dur, max_amount: Math.round(imp), monthly_payment: Math.round(rata) };
    }),
  };
}

/**
 * Valuta un preventivo mutuo fornito dalla banca: confronta tasso, LTV e sostenibilità.
 *
 * @param {object} input
 * @param {number} input.income            - Reddito mensile in euro.
 * @param {number} input.amount            - Importo richiesto in euro.
 * @param {number} [input.property_value]  - Valore dell'immobile in euro.
 * @param {number} input.duration_years    - Durata in anni.
 * @param {number} input.rate              - Tasso nominale in percentuale.
 * @param {number} [input.taeg]            - TAEG dichiarato dalla banca.
 * @param {number} [input.declared_payment] - Rata dichiarata dalla banca.
 * @param {number} [input.fees]            - Spese di istruttoria in euro.
 * @param {string} [input.rate_type]       - Tipo tasso ('fisso' | 'variabile').
 * @returns {{indicators: object[], overall_status: string, overall_label: string, computed_payment: number, declared_payment: number, payment_delta: number|null}}
 */
export function evaluateMortgageOffer({
  income, amount, property_value = 0, duration_years,
  rate, taeg = 0, declared_payment = 0, fees = 0, rate_type = 'fisso',
}) {
  const computed = monthlyPayment(amount, rate, duration_years);
  const ltv      = property_value > 0 ? amount / property_value * 100 : null;
  const payPct   = income > 0 && declared_payment > 0 ? declared_payment / income * 100 : null;

  const light = (v, ok, warn) =>
    v === null ? 'neutral' : v <= ok ? 'ok' : v <= warn ? 'warning' : 'danger';

  const indicators = [
    {
      name:   'Sostenibilità rata',
      value:  payPct ? `${payPct.toFixed(1)}% del reddito` : '—',
      status: light(payPct, 30, 40),
      detail: payPct ? (payPct < 30 ? 'Sotto la soglia del 30%' : 'Supera il 30% del reddito') : '—',
    },
    {
      name:   'LTV (Loan To Value)',
      value:  ltv ? `${ltv.toFixed(1)}%` : '—',
      status: light(ltv, 80, 90),
      detail: ltv ? (ltv < 80 ? "Sotto l'80%: condizioni più favorevoli" : "Sopra l'80%") : '—',
    },
    {
      name:   'Competitività tasso',
      value:  `${rate.toFixed(2)}% (benchmark: ${MARKET_RATE}%)`,
      status: light(rate, MARKET_RATE, MARKET_RATE + 0.5),
      detail: rate <= MARKET_RATE ? 'In linea con il mercato' : 'Sopra la media — prova a negoziare',
    },
  ];

  const active  = indicators.map(i => i.status).filter(s => s !== 'neutral');
  const overall = active.includes('danger') ? 'danger' : active.includes('warning') ? 'warning' : 'ok';

  return {
    indicators,
    overall_status:    overall,
    overall_label:     { ok: 'Preventivo buono', warning: 'Accettabile con riserve', danger: 'Da rivedere o negoziare' }[overall],
    computed_payment:  Math.round(computed),
    declared_payment,
    payment_delta:     declared_payment ? Math.round(declared_payment - computed) : null,
  };
}
