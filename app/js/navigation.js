/**
 * @module navigation
 * Gestione della navigazione tra gli step dell'applicazione.
 *
 * Gestione dipendenza circolare con quiz.js:
 *   quiz.js importa showStep da qui; navigation.js ha bisogno di backToQuiz da quiz.js.
 *   Soluzione: si usa il pattern callback tramite registerQuizNavigation(fn).
 *   In main.js, dopo l'import di backToQuiz, si chiama registerQuizNavigation(backToQuiz).
 */

/**
 * Ordine degli step nel flusso principale dell'applicazione.
 * @type {string[]}
 */
export const FLOW_ORDER = ['quiz', 'expenses', 'profile', 'simulation', 'mortgage'];

/**
 * Callback per tornare al quiz. Impostato via registerQuizNavigation().
 * @type {Function|null}
 */
let _backToQuizFn = null;

/**
 * Registra la funzione backToQuiz da quiz.js per evitare la dipendenza circolare.
 * Deve essere chiamata in main.js subito dopo l'import di backToQuiz.
 *
 * @param {Function} fn - La funzione backToQuiz esportata da quiz.js
 */
export function registerQuizNavigation(fn) {
  _backToQuizFn = fn;
}

/**
 * Mostra lo step indicato nascondendo tutti gli altri.
 * Aggiorna anche la progress bar e il flow indicator nella UI.
 *
 * @param {string} id - ID dello step da mostrare (es. 'quiz', 'expenses', 'profile', …)
 */
export function showStep(id) {
  document.querySelectorAll('.step').forEach(s => s.classList.remove('active'));
  document.getElementById('step-' + id).classList.add('active');

  // Barra di progressione (linea sottile in cima alla pagina)
  const allSteps = ['landing', 'quiz', 'expenses', 'profile', 'simulation', 'mortgage'];
  const idx = allSteps.indexOf(id);
  document.getElementById('progressBarFill').style.width =
    idx > 0 ? (idx / (allSteps.length - 1) * 100) + '%' : '0%';

  // Indicatore del flusso (step flow)
  const flow = document.getElementById('stepFlow');
  const flowIdx = FLOW_ORDER.indexOf(id);
  if (flowIdx < 0) {
    flow.style.display = 'none';
  } else {
    flow.style.display = 'flex';
    FLOW_ORDER.forEach((step, i) => {
      const el = document.getElementById('sf-' + step);
      if (!el) return;
      el.classList.remove('sf-active', 'sf-done');
      if (i === flowIdx) {
        el.classList.add('sf-active');
        el.onclick = null;
      } else if (i < flowIdx) {
        el.classList.add('sf-done');
        el.onclick = () => navigateBack(step, flowIdx, i);
      } else {
        el.onclick = null;
      }
    });
  }

  window.scrollTo(0, 0);
}

/**
 * Naviga indietro verso uno step precedente nel flusso.
 * Se il target è 'quiz', usa il callback registrato da registerQuizNavigation.
 *
 * @param {string} targetStep - ID dello step di destinazione
 * @param {number} currentIdx - Indice corrente in FLOW_ORDER
 * @param {number} targetIdx - Indice target in FLOW_ORDER
 */
export function navigateBack(targetStep, currentIdx, targetIdx) {
  if (targetIdx >= currentIdx) return;
  if (targetStep === 'quiz') {
    if (_backToQuizFn) _backToQuizFn();
  } else {
    showStep(targetStep);
  }
}
