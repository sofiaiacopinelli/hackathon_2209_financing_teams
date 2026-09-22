/**
 * FinanzaFacile — Orchestrator
 * ==============================
 * Routing dei task agli agenti specializzati.
 *
 * Modalità:
 * - Deterministico: task_type noto → agente diretto
 * - Automatico: task_type 'auto' o sconosciuto → Claude sceglie l'agente
 *
 * Esporta:
 *   dispatch(taskType, data) → Promise<string | object>
 */

import { callClaude }     from './base-agent.js';
import * as analyzer      from './financial-analyzer.js';
import * as mortgage      from './mortgage-advisor.js';
import * as expenses      from './expense-suggester.js';
import * as quiz          from './quiz-tutor.js';
import * as tipExplainer  from './tip-explainer.js';

// Mappa dei task type agli agenti disponibili
const AGENTS = {
  'analyze':          analyzer,
  'mortgage-offer':   mortgage,
  'suggest-expenses': expenses,
  'quiz-feedback':    quiz,
  'tip-detail':       tipExplainer,
};

// Descrizioni degli agenti per il prompt di routing automatico
const AGENT_DESCRIPTIONS = `
- analyze: analisi finanziaria completa (spese, risparmi, simulazioni, consigli personalizzati)
- mortgage-offer: valutazione di un preventivo mutuo (rata, indicatori, giudizio)
- suggest-expenses: stima delle spese mensili realistiche per un utente (produce JSON)
- quiz-feedback: feedback su una risposta errata o parziale a una domanda del quiz finanziario
- tip-detail: approfondimento personalizzato su un concetto finanziario specifico
`.trim();

/**
 * autoRoute(data) — usa Claude per scegliere l'agente più adatto.
 * Restituisce uno dei valori: 'analyze' | 'mortgage-offer' | 'suggest-expenses' | 'quiz-feedback'.
 * In caso di risposta non valida, effettua fallback su 'analyze'.
 */
async function autoRoute(data) {
  const dataDesc = JSON.stringify(data, null, 2).slice(0, 800); // limita la lunghezza

  const routingPrompt = [
    `Sei un router di agenti AI per un'app di consulenza finanziaria.`,
    `Dati la seguente richiesta utente, scegli l'agente più adatto tra quelli disponibili.`,
    ``,
    `AGENTI DISPONIBILI:`,
    AGENT_DESCRIPTIONS,
    ``,
    `DATI DELLA RICHIESTA:`,
    dataDesc,
    ``,
    `Rispondi SOLO con il nome dell'agente (una parola/stringa esatta tra quelle elencate), senza spiegazioni.`,
    `Valori validi: analyze, mortgage-offer, suggest-expenses, quiz-feedback`,
  ].join('\n');

  try {
    const choice = await callClaude(routingPrompt);
    // Estrae la prima parola/token dalla risposta e verifica che sia un agente valido
    const normalized = choice.trim().toLowerCase().split(/[\s\n]/)[0];
    if (AGENTS[normalized]) {
      console.log(`  [orchestrator] auto-routing → ${normalized}`);
      return normalized;
    }
    console.warn(`  [orchestrator] routing non valido ("${normalized}"), fallback su 'analyze'`);
    return 'analyze';
  } catch (err) {
    console.warn(`  [orchestrator] errore routing automatico: ${err.message}, fallback su 'analyze'`);
    return 'analyze';
  }
}

/**
 * dispatch(taskType, data) — instrada la richiesta all'agente corretto.
 *
 * @param {string} taskType  Uno tra 'analyze' | 'mortgage-offer' | 'suggest-expenses' | 'quiz-feedback' | 'auto'
 * @param {object} data      Payload della richiesta
 * @returns {Promise<string|object>}  Risposta dell'agente
 */
export async function dispatch(taskType, data) {
  // Routing deterministico per task type noti
  if (AGENTS[taskType]) {
    console.log(`  [orchestrator] routing deterministico → ${taskType}`);
    return AGENTS[taskType].run(data);
  }

  // Routing automatico tramite Claude per 'auto' o task type non riconosciuti
  console.log(`  [orchestrator] task type "${taskType}" non riconosciuto, uso routing automatico`);
  const resolvedType = await autoRoute(data);
  return AGENTS[resolvedType].run(data);
}
