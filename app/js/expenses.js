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
 * Compila i campi del form con i valori medi ISTAT,
 * adattando la voce abitazione in base alla risposta del quiz (housing).
 */
export function fillAverageValues() {
  const housingQIdx = QUIZ.findIndex(q => q.key === 'housing');
  const housing = housingQIdx >= 0 ? state.answers[housingQIdx] : undefined;
  const housingAvg = housing === 0 ? 810 : housing === 1 ? 700 : 0;
  document.querySelectorAll('[data-cat]').forEach(inp => {
    const cat = inp.dataset.cat;
    inp.value = cat === 'affitto' ? housingAvg : (ISTAT_AVERAGES[cat] || 0);
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

  const alreadyFilled = {};
  document.querySelectorAll('[data-cat]').forEach(inp => {
    const val = parseFloat(inp.value);
    if (val > 0) alreadyFilled[inp.dataset.cat] = val;
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
  // Legge la risposta housing direttamente dalle answers del quiz (disponibile prima di computeScores)
  const housingQIdx = QUIZ.findIndex(q => q.key === 'housing');
  const housing = housingQIdx >= 0 ? state.answers[housingQIdx] : undefined;
  let housingCat;
  if (housing === 0)       housingCat = { id: 'affitto', label: 'Affitto mensile',    icon: '🏠', hint: 810 };
  else if (housing === 1)  housingCat = { id: 'affitto', label: 'Rata mutuo',          icon: '🏦', hint: 700 };
  else if (housing === 2)  housingCat = null; // vive con famiglia: nessuna spesa abitativa
  else                     housingCat = { id: 'affitto', label: 'Affitto / Mutuo',     icon: '🏠', hint: 800 };

  const rest = CATEGORIES.filter(c => c.id !== 'affitto');
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
        <input type="number" min="0" placeholder="${cat.hint}" data-cat="${cat.id}" oninput="app.updateSavings()">
      </div>`;
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
