/**
 * @module expenses
 * Gestione dello step "spese mensili": form dinamico, suggerimento AI e calcolo del risparmio.
 */

import { showStep } from './navigation.js';
import { state } from './state.js';
import { QUIZ, CATEGORIES, ISTAT_AVERAGES } from './constants.js';
import { fmt, totalExpenses, monthlySavings } from './utils.js';
import { SERVER } from './ai.js';

/**
 * Naviga allo step spese e renderizza il form.
 */
export function goToExpenses() {
  renderExpenseForm();
  showStep('expenses');
}

/**
 * Calcola hint contestuali per ogni categoria di spesa in base alle risposte del quiz.
 * - affitto: varia per città (grande/media/piccola) × tipo abitazione
 * - trasporti: €42 abbonamento, €180 una auto, €300 due+ auto
 * - salute: cresce con numero di figli
 * - svago: cresce con numero di figli
 * - spesa/bollette: crescono con la dimensione del nucleo familiare
 */
function computeContextHints() {
  const city     = state.answers[6] ?? null; // 0=grande, 1=media, 2=piccolo
  const children = state.answers[8] ?? null; // 0=no, 1=uno, 2=due+
  const cars     = state.answers[9] ?? null; // 0=nessuna, 1=una, 2=due+
  const family   = state.answers[7] ?? null; // 0=solo, 1=partner, 2=partner+figli, 3=genitori

  // Affitto base per città × tipo abitazione (housing calcolato in buildVisibleCategories)
  const housingQIdx = QUIZ.findIndex(q => q.key === 'housing');
  const housing = housingQIdx >= 0 ? state.answers[housingQIdx] : null;
  let affitto = 800; // fallback generico
  if (housing === 0) {
    // In affitto
    affitto = city === 0 ? 1100 : city === 1 ? 700 : 450;
  } else if (housing === 1) {
    // Rata mutuo
    affitto = city === 0 ? 850 : city === 1 ? 600 : 500;
  }

  const trasporti = cars === 0 ? 42 : cars === 1 ? 180 : 300;
  const salute    = children === 0 ? 45  : children === 1 ? 85  : 130;
  const svago     = children === 0 ? 70  : children === 1 ? 110 : 150;
  const spesa     = family === 0 ? 280 : family === 1 ? 400 : family === 2 ? (children === 2 ? 600 : 500) : 350;
  const bollette  = family === 0 ? 100 : family === 1 ? 130 : family === 2 ? 160 : 120;

  return { affitto, trasporti, salute, svago, spesa, bollette };
}

/**
 * Compila i campi del form con i valori adattati al contesto dell'utente
 * (città, auto, figli, nucleo familiare) oppure con le medie ISTAT come fallback.
 * Rimuove il flag data-user-set in modo che la successiva chiamata AI possa sovrascrivere.
 */
export function fillAverageValues() {
  const hints = computeContextHints();
  document.querySelectorAll('[data-cat]').forEach(inp => {
    const cat = inp.dataset.cat;
    inp.value = hints[cat] ?? ISTAT_AVERAGES[cat] ?? 0;
    delete inp.dataset.userSet; // permette all'AI di sovrascrivere tutto
  });
  updateSavings();
}

/**
 * Richiede al server un suggerimento AI delle spese mensili in base al profilo utente.
 * Legge il contesto quiz direttamente da state.answers (computeScores potrebbe non essere stato chiamato).
 * @returns {Promise<void>}
 */
export async function requestExpenseAI() {
  const btn = document.getElementById('btnExpenseAI');
  btn.textContent = '⏳ Analisi in corso…';
  btn.disabled = true;

  // Invia solo i valori digitati manualmente dall'utente (non quelli auto-compilati)
  const alreadyFilled = {};
  document.querySelectorAll('[data-cat]').forEach(inp => {
    if (inp.dataset.userSet === 'true') {
      const val = parseFloat(inp.value);
      if (val > 0) alreadyFilled[inp.dataset.cat] = val;
    }
  });
  const income = parseFloat(document.getElementById('incomeInput').value) || 0;

  // Estrae il contesto quiz direttamente da state.answers (computeScores non è ancora stato chiamato)
  const quizContext = {};
  const lifestyleAnswers = [];
  let ks = 0, ls = 0;
  QUIZ.forEach((q, i) => {
    const ans = state.answers[i];
    if (ans === null || ans === undefined) return;
    if (q.type === 'lifestyle_context') quizContext[q.text] = q.options[ans];
    if (q.type === 'lifestyle')         { lifestyleAnswers.push({ question: q.text, answer: q.options[ans] }); ls += (q.scores?.[ans] ?? 0); }
    if (q.type === 'knowledge' && ans === q.correct) ks++;
  });
  const total = ks + ls;
  const currentLevel = total >= 10 ? 'esperto' : total >= 6 ? 'intermedio' : 'principiante';

  try {
    const res = await fetch(`${SERVER}/suggest-expenses`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level:             currentLevel,
        income,
        lifestyle_context: quizContext,
        lifestyle_answers: lifestyleAnswers,
        already_filled:    alreadyFilled,
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const data = await res.json();
    document.querySelectorAll('[data-cat]').forEach(inp => {
      const cat = inp.dataset.cat;
      if (alreadyFilled[cat]) return;
      if (data.expenses[cat] !== undefined) inp.value = Math.round(data.expenses[cat]);
    });
    updateSavings();

    btn.textContent = '✅ Valori suggeriti';
    setTimeout(() => { btn.textContent = '✨ Suggerisci con AI'; btn.disabled = false; }, 2500);

  } catch (err) {
    const isNetwork = err.message.includes('fetch') || err.message.includes('Failed');
    if (isNetwork) alert('Server non raggiungibile — avvia il server con npm start in app/server/');
    else alert('Errore suggerimento AI: ' + err.message);
    btn.textContent = '✨ Suggerisci con AI';
    btn.disabled = false;
  }
}

/**
 * Calcola le categorie di spesa visibili in base alla situazione abitativa dell'utente.
 * Se l'utente vive con la famiglia (opzione 2), rimuove la voce affitto/mutuo.
 *
 * @returns {Array<{id: string, label: string, icon: string, hint: number}>}
 */
export function buildVisibleCategories() {
  const housingQIdx = QUIZ.findIndex(q => q.key === 'housing');
  const housing = housingQIdx >= 0 ? state.answers[housingQIdx] : undefined;
  const hints = computeContextHints();
  let housingCat;
  if (housing === 0)       housingCat = { id: 'affitto', label: 'Affitto mensile',    icon: '🏠', hint: hints.affitto };
  else if (housing === 1)  housingCat = { id: 'affitto', label: 'Rata mutuo',          icon: '🏦', hint: hints.affitto };
  else if (housing === 2)  housingCat = null;
  else                     housingCat = { id: 'affitto', label: 'Affitto / Mutuo',     icon: '🏠', hint: hints.affitto };

  const rest = CATEGORIES
    .filter(c => c.id !== 'affitto')
    .map(c => hints[c.id] !== undefined ? { ...c, hint: hints[c.id] } : c);
  return housingCat ? [housingCat, ...rest] : rest;
}

/**
 * Renderizza le card del form spese in base alle categorie visibili.
 */
export function renderExpenseForm() {
  const grid = document.getElementById('expenseGrid');
  grid.innerHTML = '';
  buildVisibleCategories().forEach(cat => {
    const card = document.createElement('div');
    card.className = 'expense-card';
    card.innerHTML = `
      <div class="expense-card-header">
        <span class="expense-card-icon">${cat.icon}</span>
        <span class="expense-card-label">${cat.label}</span>
      </div>
      <div class="expense-input-wrap">
        <span class="expense-prefix">€</span>
        <input type="number" min="0" placeholder="${cat.hint}" data-cat="${cat.id}">
      </div>`;
    const inp = card.querySelector('input');
    inp.addEventListener('input', () => {
      inp.dataset.userSet = 'true';
      app.updateSavings();
    });
    grid.appendChild(card);
  });
}

/**
 * Legge income ed expenses dal DOM, aggiorna state e il pannello di anteprima risparmio.
 * Abilita/disabilita il pulsante AI in base alla presenza del reddito.
 */
export function updateSavings() {
  state.income = parseFloat(document.getElementById('incomeInput').value) || 0;
  state.expenses = {};
  document.querySelectorAll('[data-cat]').forEach(inp => {
    state.expenses[inp.dataset.cat] = parseFloat(inp.value) || 0;
  });

  const total = totalExpenses();
  const savings = monthlySavings();
  const preview = document.getElementById('savingsPreview');

  if (state.income > 0 || total > 0) {
    preview.style.display = 'block';
    document.getElementById('previewIncome').textContent = '+' + fmt(state.income);
    document.getElementById('previewExpenses').textContent = '-' + fmt(total);
    const el = document.getElementById('previewSavings');
    el.textContent = fmt(savings);
    el.className = 'savings-amount ' + (savings >= 0 ? 'positive' : 'negative');
  } else {
    preview.style.display = 'none';
  }

  const aiBtn = document.getElementById('btnExpenseAI');
  if (aiBtn) aiBtn.disabled = state.income <= 0;
}
