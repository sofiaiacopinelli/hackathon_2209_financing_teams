/**
 * @module skills/quiz
 * Skill `evaluate_quiz`: calcola il profilo finanziario dell'utente
 * a partire dai punteggi del quiz di conoscenza e di stile di vita.
 */

/** @type {Record<string, {range: [number, number], desc: string}>} */
const PROFILES = {
  principiante: { range: [0, 5],   desc: 'Stai iniziando il percorso finanziario — ampi margini di miglioramento.' },
  intermedio:   { range: [6, 9],   desc: 'Buone basi, puoi ottimizzare ulteriormente le tue scelte.' },
  esperto:      { range: [10, 11], desc: 'Solida comprensione finanziaria, pronto per strategie avanzate.' },
};

/**
 * Valuta il profilo utente in base ai punteggi del quiz.
 *
 * @param {object} input
 * @param {number} input.knowledge_score - Punteggio sezione conoscenza (0-5).
 * @param {number} input.lifestyle_score - Punteggio sezione stile di vita (0-6).
 * @returns {{level: string, description: string, total_score: number, max_score: number, knowledge_pct: number, lifestyle_pct: number, weak_areas: string[]}}
 */
export function evaluateQuiz({ knowledge_score, lifestyle_score }) {
  const ks    = knowledge_score ?? 0;
  const ls    = lifestyle_score ?? 0;
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
    description:   PROFILES[level].desc,
    total_score:   total,
    max_score:     11,
    knowledge_pct: Math.round(ks / 5 * 100),
    lifestyle_pct: Math.round(ls / 6 * 100),
    weak_areas:    weakAreas,
  };
}
