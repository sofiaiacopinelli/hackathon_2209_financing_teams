/**
 * @module skills/index
 * Registry centrale delle skill del server FinanzaFacile.
 *
 * Ogni skill è una funzione pura che riceve un oggetto di input
 * e restituisce un oggetto di output strutturato.
 * Usato da `prompts.js` tramite `runSkill(name, input)`.
 *
 * Skill disponibili:
 *   - evaluate_quiz         → profilo utente da punteggi quiz
 *   - analyze_expenses      → analisi spese e risparmio
 *   - run_simulation        → proiezioni risparmio a lungo termine
 *   - get_tips              → consigli personalizzati per area
 *   - propose_mortgage      → affordability mutuo
 *   - evaluate_mortgage_offer → valutazione preventivo bancario
 */

import { evaluateQuiz }            from './quiz.js';
import { analyzeExpenses }         from './expenses.js';
import { runSimulation }           from './simulation.js';
import { getTips }                 from './tips.js';
import { proposeMortgage, evaluateMortgageOffer, setMarketRates as _setRates } from './mortgage.js';

/** @type {Record<string, Function>} */
const SKILLS = {
  evaluate_quiz:            evaluateQuiz,
  analyze_expenses:         analyzeExpenses,
  run_simulation:           runSimulation,
  get_tips:                 getTips,
  propose_mortgage:         proposeMortgage,
  evaluate_mortgage_offer:  evaluateMortgageOffer,
};

/**
 * Esegue la skill richiesta con l'input fornito.
 *
 * @param {string} name  - Nome della skill da eseguire.
 * @param {object} input - Parametri di input per la skill.
 * @returns {object} Output della skill, oppure `{ error: string }` se non trovata.
 */
export function runSkill(name, input) {
  const fn = SKILLS[name];
  if (!fn) {
    return { error: `Skill '${name}' non trovata. Disponibili: ${Object.keys(SKILLS).join(', ')}` };
  }
  return fn(input);
}

/**
 * Restituisce i nomi di tutte le skill registrate.
 * @returns {string[]}
 */
export function listSkills() {
  return Object.keys(SKILLS);
}

/**
 * Aggiorna i tassi di mercato nelle skill che li usano.
 * Proxy verso `mortgage.js#setMarketRates`.
 *
 * @param {{fisso?: number, variabile?: number}} rates
 */
export { _setRates as setMarketRates };
