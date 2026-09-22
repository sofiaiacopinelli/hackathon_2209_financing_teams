/**
 * @module main
 * Entry point dell'applicazione FinanzaFacile.
 *
 * Importa tutti i moduli, registra il callback per la navigazione circolare
 * (navigation ↔ quiz), definisce le funzioni di coordinamento (goToProfile, restart),
 * assembla l'oggetto `app` e lo espone su `window` per i gestori `onclick` dell'HTML.
 */

import { startQuiz, prevQuestion, nextQuestion, backToQuiz, computeScores } from './quiz.js';
import { goToExpenses, fillAverageValues, requestExpenseAI, updateSavings } from './expenses.js';
import { goToSimulation } from './simulation.js';
import { renderProfile } from './profile.js';
import { showStep, registerQuizNavigation } from './navigation.js';
import { requestAIAnalysis } from './ai.js';
import { goToMortgage, updateMortgageSim, runEvaluation, requestEvalAI, goToEvaluator } from './mortgage.js';
import { state } from './state.js';

// Risolve la dipendenza circolare navigation ↔ quiz:
// navigation.js usa backToQuiz tramite questo callback invece di importarlo direttamente.
registerQuizNavigation(backToQuiz);

/**
 * Calcola i punteggi, renderizza il profilo e mostra lo step 'profile'.
 * Funzione di coordinamento: chiama computeScores (quiz) e renderProfile (profile).
 */
function goToProfile() {
  const incomeVal = parseFloat(document.getElementById('incomeInput').value) || 0;
  if (incomeVal <= 0) {
    const inp = document.getElementById('incomeInput');
    inp.classList.add('input-error');
    inp.focus();
    inp.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => inp.classList.remove('input-error'), 2500);
    return;
  }
  computeScores();
  renderProfile();
  showStep('profile');
}

/**
 * Riporta l'applicazione allo stato iniziale e mostra la landing page.
 * Distrugge il grafico Chart.js se presente.
 */
function restart() {
  state.quizStep = 0;
  state.answers = new Array(8).fill(null);
  state.knowledgeScore = 0;
  state.lifestyleScore = 0;
  state.mortgageContext = {};
  state.evalData = null;
  state.level = 'principiante';
  state.income = 0;
  state.expenses = {};
  if (state.chart) { state.chart.destroy(); state.chart = null; }
  document.getElementById('aiResult').style.display = 'none';
  document.getElementById('aiBanner').style.display = 'flex';
  document.getElementById('evalResult').style.display = 'none';
  document.getElementById('evalAiBanner').style.display = 'none';
  document.getElementById('evalAiResult').style.display = 'none';
  showStep('landing');
}

/**
 * Oggetto pubblico dell'applicazione esposto su `window.app`.
 * Tutti i metodi referenziati tramite `onclick="app.xxx()"` nell'HTML devono essere qui.
 *
 * @namespace app
 */
const app = {
  startQuiz,
  prevQuestion,
  nextQuestion,
  backToQuiz,
  goToExpenses,
  goToProfile,
  goToSimulation,
  updateSavings,
  fillAverageValues,
  showStep,
  requestAIAnalysis,
  restart,
  goToMortgage,
  updateMortgageSim,
  runEvaluation,
  requestEvalAI,
  requestExpenseAI,
  goToEvaluator,
};

// Espone l'oggetto app globalmente per i gestori onclick inline nell'HTML
window.app = app;
