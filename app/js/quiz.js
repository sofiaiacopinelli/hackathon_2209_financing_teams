/**
 * @module quiz
 * Logica del quiz di valutazione finanziaria.
 * Gestisce navigazione tra domande, feedback immediato e calcolo dei punteggi.
 *
 * Dipendenza circolare: questo modulo importa showStep da navigation.js,
 * e navigation.js usa backToQuiz tramite il callback registerQuizNavigation (risolto in main.js).
 */

import { showStep } from './navigation.js';
import { state } from './state.js';
import { QUIZ } from './constants.js';
import { getProfile } from './utils.js';
import { MarketDataSkill } from './market-data.js';
import { SERVER } from './ai.js';
import { goToExpenses } from './expenses.js';

/**
 * Inizializza e avvia il quiz dall'inizio.
 * Resetta lo stato del quiz e mostra la prima domanda.
 */
export function startQuiz() {
  state.quizStep = 0;
  state.answers = new Array(QUIZ.length).fill(null);
  showStep('quiz');
  renderQuestion();
}

/**
 * Renderizza la domanda corrente in base a state.quizStep.
 * Gestisce sia le domande normali che i section break.
 */
export function renderQuestion() {
  const q = QUIZ[state.quizStep];
  const badge   = document.getElementById('quizBadge');
  const titleEl = document.getElementById('questionTitle');
  const textEl  = document.getElementById('questionText');
  const listEl  = document.getElementById('optionsList');
  const nextBtn = document.getElementById('btnNextQ');
  const prevBtn = document.getElementById('btnPrevQ');

  // Rimuove feedback e card di sezione precedenti
  const oldFb    = document.getElementById('quizFeedback');
  const oldBreak = document.getElementById('sectionBreakContent');
  if (oldFb)    oldFb.remove();
  if (oldBreak) oldBreak.remove();

  if (q.type === 'section_break') {
    badge.style.display   = 'none';
    titleEl.style.display = 'none';
    textEl.style.display  = 'none';
    listEl.style.display  = 'none';

    const card = document.createElement('div');
    card.id = 'sectionBreakContent';
    card.className = 'section-break-card';
    card.innerHTML = `
      <div class="sb-icon">${q.icon}</div>
      <h3 class="sb-title">${q.title}</h3>
      <p class="sb-desc">${q.description}</p>
      <div class="sb-sections">
        <div class="sb-sec sb-done">✅ Conoscenza finanziaria — completata</div>
        <div class="sb-sec sb-next">→ Stile di vita — prossima</div>
      </div>`;
    document.querySelector('#step-quiz .question-container').appendChild(card);

    prevBtn.textContent = '← Indietro';
    nextBtn.textContent = q.nextLabel;
    nextBtn.disabled    = false;
    return;
  }

  // Ripristina visibilità per domande normali
  badge.style.display   = '';
  titleEl.style.display = '';
  textEl.style.display  = '';
  listEl.style.display  = '';

  // Badge: conta solo le domande reali (esclude section_break)
  const totalQ   = QUIZ.filter(x => x.type !== 'section_break').length;
  const currentQ = QUIZ.slice(0, state.quizStep + 1).filter(x => x.type !== 'section_break').length;
  badge.textContent   = `Domanda ${currentQ} di ${totalQ}`;
  titleEl.textContent = q.category;
  textEl.textContent  = q.text;

  const saved = state.answers[state.quizStep];
  listEl.innerHTML = '';

  q.options.forEach((opt, i) => {
    const btn = document.createElement('button');
    btn.className = 'option-item';
    btn.textContent = opt;

    if (saved !== null) {
      btn.disabled = true;
      if (q.type === 'knowledge') {
        if (i === q.correct)                           btn.classList.add('correct');
        else if (i === saved && i === q.partial)       btn.classList.add('partial');
        else if (i === saved)                          btn.classList.add('wrong');
      } else {
        if (i === saved) btn.classList.add('selected');
      }
    } else {
      btn.onclick = () => selectAnswer(i);
    }
    listEl.appendChild(btn);
  });

  if (saved !== null && q.type === 'knowledge') showKnowledgeFeedback(q, saved);

  nextBtn.disabled    = saved === null;
  nextBtn.textContent = state.quizStep === QUIZ.length - 1 ? 'Vedi il mio profilo →' : 'Avanti →';
  prevBtn.textContent = state.quizStep === 0 ? '← Home' : '← Indietro';
}

/**
 * Mostra il feedback immediato per una domanda di tipo 'knowledge'.
 * Per risposte non corrette, invia una richiesta al server per feedback dinamico via Claude.
 *
 * @param {Object} q - L'oggetto domanda corrente
 * @param {number} selectedIdx - Indice dell'opzione selezionata dall'utente
 */
export function showKnowledgeFeedback(q, selectedIdx) {
  const isCorrect = selectedIdx === q.correct;
  const isPartial = selectedIdx === q.partial;
  const type      = isCorrect ? 'correct' : isPartial ? 'partial' : 'wrong';
  const icons     = { correct: '✅', partial: '🟡', wrong: '❌' };
  const labels    = { correct: 'Esatto!', partial: 'Quasi — ma non del tutto', wrong: 'Non è corretto' };

  const existing = document.getElementById('quizFeedback');
  if (existing) existing.remove();

  const fb = document.createElement('div');
  fb.id = 'quizFeedback';
  fb.className = `quiz-feedback fb-${type}`;

  // Testo statico come fallback immediato
  const staticText = q.feedback?.[type] ?? '';
  fb.innerHTML = `
    <div class="fb-header">
      <span class="fb-icon">${icons[type]}</span>
      <strong class="fb-label">${labels[type]}</strong>
    </div>
    <p class="fb-text" id="fbText">${staticText || '⏳ Analisi in corso…'}</p>`;

  document.getElementById('optionsList').after(fb);

  // Feedback dinamico via Claude (solo per risposte non corrette)
  if (!isCorrect) {
    fetch(`${SERVER}/quiz-feedback`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question:     q.text,
        options:      q.options,
        selected_idx: selectedIdx,
        correct_idx:  q.correct,
        answer_type:  type,
      }),
    })
    .then(r => r.json())
    .then(data => {
      const el = document.getElementById('fbText');
      if (el && data.feedback) el.textContent = data.feedback;
    })
    .catch(() => {
      // Se il server non risponde, resta il testo statico
      const el = document.getElementById('fbText');
      if (el && !el.textContent.trim()) el.textContent = staticText;
    });
  }
}

/**
 * Registra la risposta dell'utente e aggiorna la UI di conseguenza.
 * @param {number} idx - Indice dell'opzione selezionata
 */
export function selectAnswer(idx) {
  const q = QUIZ[state.quizStep];
  state.answers[state.quizStep] = idx;

  document.querySelectorAll('.option-item').forEach((btn, i) => {
    btn.disabled = true;
    if (q.type === 'knowledge') {
      if (i === q.correct)                   btn.classList.add('correct');
      else if (i === idx && i === q.partial) btn.classList.add('partial');
      else if (i === idx)                    btn.classList.add('wrong');
    } else {
      if (i === idx) btn.classList.add('selected');
    }
  });

  if (q.type === 'knowledge') showKnowledgeFeedback(q, idx);

  document.getElementById('btnNextQ').disabled = false;
}

/**
 * Avanza alla domanda successiva o termina il quiz passando alle spese.
 */
export function nextQuestion() {
  if (state.quizStep < QUIZ.length - 1) {
    state.quizStep++;
    renderQuestion();
  } else {
    goToExpenses();
  }
}

/**
 * Torna alla domanda precedente o allo step landing se si è alla prima domanda.
 */
export function prevQuestion() {
  if (state.quizStep > 0) {
    state.quizStep--;
    renderQuestion();
  } else {
    showStep('landing');
  }
}

/**
 * Riporta l'utente all'ultima domanda del quiz dallo step spese.
 */
export function backToQuiz() {
  state.quizStep = QUIZ.length - 1;
  showStep('quiz');
  renderQuestion();
}

/**
 * Calcola i punteggi di conoscenza e stile di vita dalle risposte del quiz.
 * Popola anche mortgageContext e lifestyleContext in state.
 * Avvia MarketDataSkill in background per aggiornare i tassi.
 */
export function computeScores() {
  state.knowledgeScore = 0;
  state.lifestyleScore = 0;
  state.mortgageContext = {};
  state.lifestyleContext = {};

  QUIZ.forEach((q, i) => {
    if (q.type === 'section_break') return;
    const ans = state.answers[i];
    if (ans === null) return;
    if (q.type === 'knowledge' && ans === q.correct)   state.knowledgeScore++;
    if (q.type === 'lifestyle')                        state.lifestyleScore += q.scores[ans];
    if (q.type === 'mortgage_context')                 state.mortgageContext[i] = ans;
    if (q.type === 'lifestyle_context')                state.lifestyleContext[q.key ?? i] = ans;
  });

  state.level = getProfile().id;

  // Avvia MarketDataSkill in background: aggiorna i tassi prima che l'utente arrivi al mutuo
  state.marketDataReady = false;
  MarketDataSkill.run().then(result => {
    state.marketDataReady = true;
    state.marketDataSummary = result.summary;
  });
}
