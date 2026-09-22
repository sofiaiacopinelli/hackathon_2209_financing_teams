/**
 * FinanzaFacile — Quiz Tutor Agent
 * ==================================
 * Corrisponde a POST /quiz-feedback.
 * Fornisce una spiegazione incoraggiante quando l'utente risponde
 * in modo errato o parzialmente corretto a una domanda del quiz.
 */

import { fileURLToPath }              from 'url';
import { dirname }                    from 'path';
import { callClaude, loadPrompt, LEVEL_STYLE } from './base-agent.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * buildPrompt(data) — costruisce il prompt per il feedback quiz.
 * Mappa answer_type ('partial' | altro) in etichette leggibili.
 */
export function buildPrompt(d) {
  const { question, options, selected_idx, correct_idx, answer_type, level } = d;

  const selected     = options?.[selected_idx] ?? '';
  const correct      = options?.[correct_idx]  ?? '';
  const isPartial    = answer_type === 'partial';

  // Etichette in linguaggio naturale per il tipo di risposta
  const answerTypeLabel   = isPartial ? 'parzialmente corretto' : 'errato';
  const answerTypeExplain = isPartial ? 'incompleta' : 'sbagliata';

  const levelStyle = LEVEL_STYLE[level ?? 'principiante'] || LEVEL_STYLE.principiante;

  return loadPrompt('quiz-tutor', {
    ANSWER_TYPE_LABEL:   answerTypeLabel,
    ANSWER_TYPE_EXPLAIN: answerTypeExplain,
    LEVEL_STYLE:         levelStyle,
    QUESTION:            question,
    SELECTED:            selected,
    CORRECT:             correct,
  });
}

/**
 * run(data) — esegue il feedback del quiz.
 * Restituisce la spiegazione prodotta da Claude.
 */
export async function run(data) {
  const prompt = buildPrompt(data);
  return callClaude(prompt);
}
