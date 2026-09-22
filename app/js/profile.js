/**
 * @module profile
 * Renderizza il profilo utente con punteggi e riepilogo del contesto di vita.
 */

import { state } from './state.js';
import { QUIZ } from './constants.js';
import { getProfile } from './utils.js';

/**
 * Renderizza la scheda profilo nello step 'profile'.
 * Aggiorna icona, titolo, descrizione, barre dei punteggi e riepilogo contesto.
 */
export function renderProfile() {
  const p = getProfile();
  document.getElementById('profileIcon').textContent = p.icon;
  document.getElementById('profileTitle').textContent = p.title;
  document.getElementById('profileDesc').textContent = p.desc;

  const kPct = (state.knowledgeScore / 5 * 100).toFixed(0);
  const lPct = (state.lifestyleScore / 6 * 100).toFixed(0);

  // Animazione barre (leggero ritardo per dare il tempo al DOM di renderizzare)
  setTimeout(() => {
    document.getElementById('knowledgeBar').style.width = kPct + '%';
    document.getElementById('lifestyleBar').style.width = lPct + '%';
  }, 120);

  const kLabels = ['In crescita', 'Base', 'Discreto', 'Buono', 'Ottimo', 'Eccellente'];
  const lLabels = ['Da migliorare', 'Base', 'Discreto', 'Buono', 'Ottimo', 'Eccellente', 'Top'];
  document.getElementById('knowledgeLabel').textContent = kLabels[state.knowledgeScore] || '';
  document.getElementById('lifestyleLabel').textContent = lLabels[state.lifestyleScore] || '';

  // Riepilogo contesto di vita (risposte lifestyle_context)
  const ctxItems = QUIZ
    .map((q, i) => q.type === 'lifestyle_context' && state.answers[i] !== null
      ? q.options[state.answers[i]] : null)
    .filter(Boolean);

  const ctxEl = document.getElementById('profileContextRow');
  if (ctxEl) {
    if (ctxItems.length > 0) {
      ctxEl.textContent = ctxItems.join('  ·  ');
      ctxEl.style.display = 'block';
    } else {
      ctxEl.style.display = 'none';
    }
  }
}
