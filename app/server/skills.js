/**
 * FinanzaFacile — Skills (JS)
 * Implementazioni dei tool richiamati da Claude nell'agentic loop.
 * Specchiano le Python skills in agents/skills/.
 */

// ── evaluate_quiz ────────────────────────────────────────────
const PROFILES = {
  principiante: { range: [0, 5],   desc: 'Stai iniziando il percorso finanziario — ampi margini di miglioramento.' },
  intermedio:   { range: [6, 9],   desc: 'Buone basi, puoi ottimizzare ulteriormente le tue scelte.' },
  esperto:      { range: [10, 11], desc: 'Solida comprensione finanziaria, pronto per strategie avanzate.' },
};

function evaluateQuiz({ knowledge_score, lifestyle_score }) {
  const ks = knowledge_score ?? 0;
  const ls = lifestyle_score ?? 0;
  const total = ks + ls;

  let level = 'principiante';
  for (const [name, { range }] of Object.entries(PROFILES)) {
    if (total >= range[0] && total <= range[1]) { level = name; break; }
  }

  const weakAreas = [];
  if (ks < 3)  weakAreas.push('conoscenza_finanziaria');
  if (ls < 3)  weakAreas.push('abitudini_risparmio');
  if (ls <= 1) weakAreas.push('gestione_debiti');
  if (!weakAreas.length) weakAreas.push('investimenti');

  return {
    level,
    description: PROFILES[level].desc,
    total_score: total,
    max_score: 11,
    knowledge_pct: Math.round(ks / 5 * 100),
    lifestyle_pct: Math.round(ls / 6 * 100),
    weak_areas: weakAreas,
  };
}

// ── analyze_expenses ─────────────────────────────────────────
const THRESHOLDS = {
  affitto: 0.40, ristoranti: 0.10, abbonamenti: 0.05, shopping: 0.10, svago: 0.08,
};

function analyzeExpenses({ income, expenses }) {
  const totalExp = Object.values(expenses).reduce((s, v) => s + (parseFloat(v) || 0), 0);
  const savings  = income - totalExp;

  const anomalies = Object.entries(expenses)
    .filter(([, v]) => parseFloat(v) > 0 && income > 0)
    .reduce((acc, [cat, v]) => {
      const pct   = parseFloat(v) / income;
      const thresh = THRESHOLDS[cat] ?? 0.15;
      if (pct > thresh) acc.push({
        category: cat,
        amount: parseFloat(v),
        pct_of_income: Math.round(pct * 1000) / 10,
        suggested_max_pct: Math.round(thresh * 100),
      });
      return acc;
    }, []);

  const topCat = Object.entries(expenses).reduce(
    (best, [k, v]) => parseFloat(v) > parseFloat(best[1] ?? 0) ? [k, v] : best, ['—', 0]
  );

  return {
    income,
    total_expenses: totalExp,
    monthly_savings: savings,
    annual_savings: savings * 12,
    savings_rate_pct: income > 0 ? Math.round(savings / income * 1000) / 10 : 0,
    top_category: { name: topCat[0], amount: parseFloat(topCat[1]) },
    anomalies,
    balanced: savings >= 0,
  };
}

// ── run_simulation ───────────────────────────────────────────
function compoundGrowth(pmt, years, rate) {
  if (pmt <= 0) return 0;
  if (rate === 0) return pmt * years * 12;
  const r = rate / 12, n = years * 12;
  return pmt * ((Math.pow(1 + r, n) - 1) / r);
}

function runSimulation({ monthly_savings }) {
  const pmt = Math.max(0, monthly_savings ?? 0);
  const scenarios = {};
  for (const [name, rate] of [
    ['risparmio_puro', 0],
    ['conto_deposito', 0.02],
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

// ── get_tips ─────────────────────────────────────────────────
const TIPS_DB = {
  conoscenza_finanziaria: {
    principiante: "Inizia dai concetti base: tasso, inflazione, TAEG, rata. Capirli ti protegge da scelte costose.",
    intermedio:   "Studia la differenza tra tasso nominale e reale, e come l'inflazione erode il potere d'acquisto.",
    esperto:      "Approfondisci la fiscalità: PIR, fondi pensione, regime dichiarativo vs. amministrato.",
  },
  abitudini_risparmio: {
    principiante: "Smetti di risparmiare quello che avanza — metti da parte subito e spendi il resto.",
    intermedio:   "Automatizza con un bonifico programmato il giorno dell'accredito stipendio.",
    esperto:      "Monitora il tasso di risparmio come KPI principale della tua salute finanziaria.",
  },
  gestione_debiti: {
    principiante: "Evita le carte revolving — TAEG spesso >20%. Paga sempre il saldo totale.",
    intermedio:   "Ordina i debiti per TAEG decrescente e estingui prima i più costosi (metodo avalanche).",
    esperto:      "Valuta se il TAEG del debito è inferiore al rendimento atteso prima di estinguere.",
  },
  investimenti: {
    principiante: "Prima crea un fondo di emergenza (3-6 mesi di spese). Solo dopo inizia a investire.",
    intermedio:   "Apri un PAC su ETF globali come MSCI World con versamenti mensili fissi.",
    esperto:      "Definisci un'asset allocation target (70% azionario, 25% obbligazionario) e ribilancia annualmente.",
  },
  budget: {
    principiante: "Traccia ogni spesa per un mese con un'app (Wallet, Spendee).",
    intermedio:   "Rivedi le spese fisse ogni anno: assicurazioni, utenze, abbonamenti.",
    esperto:      "Implementa un budget a busta (envelope budgeting) con tetti mensili per categoria.",
  },
};

function getTips({ level, focus_areas }) {
  const tips = (focus_areas ?? [])
    .filter(area => TIPS_DB[area])
    .map(area => ({
      area,
      tip: TIPS_DB[area][level] ?? TIPS_DB[area].principiante,
    }));
  return { level, tips, count: tips.length };
}

// ── propose_mortgage ─────────────────────────────────────────
// Tassi di riferimento — aggiornabili a runtime con setMarketRates()
let MARKET_RATE     = 3.5;
let MARKET_RATE_VAR = 2.8;
const DURATIONS     = [10, 15, 20, 25, 30];

export function setMarketRates({ fisso, variabile } = {}) {
  if (fisso     && typeof fisso === 'number')     MARKET_RATE     = fisso;
  if (variabile && typeof variabile === 'number') MARKET_RATE_VAR = variabile;
}

function monthlyPayment(amount, annualRatePct, years) {
  const r = annualRatePct / 100 / 12, n = years * 12;
  if (r === 0) return amount / n;
  return amount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function maxAmount(maxPayment, annualRatePct, years) {
  const r = annualRatePct / 100 / 12, n = years * 12;
  if (r === 0) return maxPayment * n;
  return maxPayment * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n));
}

function proposeMortgage({ income, monthly_savings }) {
  const maxRata30  = income * 0.30;
  const maxRataR   = Math.max(0, (monthly_savings ?? 0) * 0.50);
  const affordPct  = income > 0 ? maxRataR / income * 100 : 0;
  const status     = affordPct >= 20 ? 'ok' : affordPct >= 10 ? 'warning' : 'danger';
  const statusLabel = {
    ok:      'Situazione favorevole per un mutuo',
    warning: 'Margine limitato — valuta con attenzione',
    danger:  'Da rafforzare prima di accendere un mutuo',
  };
  return {
    status,
    status_label: statusLabel[status],
    max_rata_30pct_rule: Math.round(maxRata30),
    max_rata_realistic: Math.round(maxRataR),
    affordability_pct: Math.round(affordPct * 10) / 10,
    reference_rate_pct: MARKET_RATE,
    table_by_duration: DURATIONS.map(dur => {
      const imp  = maxAmount(maxRataR, MARKET_RATE, dur);
      const rata = monthlyPayment(imp, MARKET_RATE, dur);
      return { years: dur, max_amount: Math.round(imp), monthly_payment: Math.round(rata) };
    }),
  };
}

// ── evaluate_mortgage_offer ──────────────────────────────────
function evaluateMortgageOffer({
  income, amount, property_value = 0, duration_years,
  rate, taeg = 0, declared_payment = 0, fees = 0, rate_type = 'fisso',
}) {
  const computed  = monthlyPayment(amount, rate, duration_years);
  const ltv       = property_value > 0 ? amount / property_value * 100 : null;
  const payPct    = income > 0 && declared_payment > 0 ? declared_payment / income * 100 : null;

  const light = (v, ok, warn) =>
    v === null ? 'neutral' : v <= ok ? 'ok' : v <= warn ? 'warning' : 'danger';

  const indicators = [
    { name: 'Sostenibilità rata',    value: payPct ? `${payPct.toFixed(1)}% del reddito` : '—', status: light(payPct, 30, 40),              detail: payPct ? (payPct < 30 ? 'Sotto la soglia del 30%' : 'Supera il 30% del reddito') : '—' },
    { name: 'LTV (Loan To Value)',   value: ltv    ? `${ltv.toFixed(1)}%` : '—',               status: light(ltv, 80, 90),                  detail: ltv    ? (ltv < 80    ? "Sotto l'80%: condizioni più favorevoli" : "Sopra l'80%") : '—' },
    { name: 'Competitività tasso',   value: `${rate.toFixed(2)}% (benchmark: ${MARKET_RATE}%)`, status: light(rate, MARKET_RATE, MARKET_RATE + 0.5), detail: rate <= MARKET_RATE ? 'In linea con il mercato' : 'Sopra la media — prova a negoziare' },
  ];

  const active  = indicators.map(i => i.status).filter(s => s !== 'neutral');
  const overall = active.includes('danger') ? 'danger' : active.includes('warning') ? 'warning' : 'ok';

  return {
    indicators,
    overall_status: overall,
    overall_label: { ok: 'Preventivo buono', warning: 'Accettabile con riserve', danger: 'Da rivedere o negoziare' }[overall],
    computed_payment: Math.round(computed),
    declared_payment,
    payment_delta: declared_payment ? Math.round(declared_payment - computed) : null,
  };
}

// ── Router ───────────────────────────────────────────────────
const SKILLS = {
  evaluate_quiz: evaluateQuiz,
  analyze_expenses: analyzeExpenses,
  run_simulation: runSimulation,
  get_tips: getTips,
  propose_mortgage: proposeMortgage,
  evaluate_mortgage_offer: evaluateMortgageOffer,
};

export function runSkill(name, input) {
  const fn = SKILLS[name];
  if (!fn) return { error: `Skill '${name}' non trovata. Disponibili: ${Object.keys(SKILLS).join(', ')}` };
  return fn(input);
}

export function listSkills() {
  return Object.keys(SKILLS);
}
