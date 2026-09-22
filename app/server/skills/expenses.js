/**
 * @module skills/expenses
 * Skill `analyze_expenses`: analizza la distribuzione delle spese mensili
 * rispetto al reddito e segnala le categorie anomale.
 */

/**
 * Soglie di allerta per categoria (percentuale del reddito).
 * Se la spesa supera la soglia, viene classificata come anomalia.
 * @type {Record<string, number>}
 */
const THRESHOLDS = {
  affitto:      0.40,
  ristoranti:   0.10,
  abbonamenti:  0.05,
  shopping:     0.10,
  svago:        0.08,
};

/** Soglia predefinita per categorie non elencate. */
const DEFAULT_THRESHOLD = 0.15;

/**
 * Analizza entrate e spese, calcola risparmio e rileva anomalie.
 *
 * @param {object} input
 * @param {number} input.income - Reddito mensile in euro.
 * @param {Record<string, number>} input.expenses - Spese per categoria (chiave → importo €).
 * @returns {{income: number, total_expenses: number, monthly_savings: number, annual_savings: number, savings_rate_pct: number, top_category: {name: string, amount: number}, anomalies: object[], balanced: boolean}}
 */
export function analyzeExpenses({ income, expenses }) {
  const totalExp = Object.values(expenses).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const savings  = income - totalExp;

  const anomalies = Object.entries(expenses)
    .filter(([, v]) => parseFloat(v) > 0 && income > 0)
    .reduce((acc, [cat, v]) => {
      const pct    = parseFloat(v) / income;
      const thresh = THRESHOLDS[cat] ?? DEFAULT_THRESHOLD;
      if (pct > thresh) acc.push({
        category:          cat,
        amount:            parseFloat(v),
        pct_of_income:     Math.round(pct * 1000) / 10,
        suggested_max_pct: Math.round(thresh * 100),
      });
      return acc;
    }, []);

  const topCat = Object.entries(expenses).reduce(
    (best, [k, v]) => parseFloat(v) > parseFloat(best[1] ?? 0) ? [k, v] : best, ['—', 0]
  );

  return {
    income,
    total_expenses:  totalExp,
    monthly_savings: savings,
    annual_savings:  savings * 12,
    savings_rate_pct: income > 0 ? Math.round(savings / income * 1000) / 10 : 0,
    top_category:    { name: topCat[0], amount: parseFloat(topCat[1]) },
    anomalies,
    balanced:        savings >= 0,
  };
}
