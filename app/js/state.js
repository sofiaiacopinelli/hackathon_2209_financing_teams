/**
 * @module state
 * Singleton mutabile dello stato dell'applicazione.
 * Esportato come oggetto così le mutazioni sono visibili in tutti i moduli importatori.
 */

/**
 * Stato globale dell'applicazione FinanzaFacile.
 *
 * @type {{
 *   quizStep: number,
 *   answers: Array<number|null>,
 *   knowledgeScore: number,
 *   lifestyleScore: number,
 *   mortgageContext: Object,
 *   lifestyleContext: Object,
 *   level: string,
 *   income: number,
 *   expenses: Object.<string, number>,
 *   evalData: Object|null,
 *   chart: Object|null,
 *   marketDataReady: boolean,
 *   marketDataSummary: string
 * }}
 */
export const state = {
  quizStep: 0,
  answers: [],
  knowledgeScore: 0,
  lifestyleScore: 0,
  mortgageContext: {},
  lifestyleContext: {},
  level: 'principiante',
  income: 0,
  expenses: {},
  evalData: null,
  chart: null,
  marketDataReady: false,
  marketDataSummary: ''
};
