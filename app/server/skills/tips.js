/**
 * @module skills/tips
 * Skill `get_tips`: restituisce consigli finanziari personalizzati
 * in base al livello dell'utente e alle aree di debolezza rilevate dal quiz.
 */

/**
 * Database dei consigli, organizzato per area tematica e livello utente.
 * @type {Record<string, Record<string, string>>}
 */
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

/**
 * Restituisce i consigli per le aree di debolezza dell'utente, adattati al suo livello.
 *
 * @param {object} input
 * @param {string} input.level       - Livello utente ('principiante' | 'intermedio' | 'esperto').
 * @param {string[]} input.focus_areas - Aree tematiche da approfondire (output di evaluateQuiz).
 * @returns {{level: string, tips: Array<{area: string, tip: string}>, count: number}}
 */
export function getTips({ level, focus_areas }) {
  const tips = (focus_areas ?? [])
    .filter(area => TIPS_DB[area])
    .map(area => ({
      area,
      tip: TIPS_DB[area][level] ?? TIPS_DB[area].principiante,
    }));
  return { level, tips, count: tips.length };
}
