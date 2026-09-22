import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { state } from '../app/js/state.js';
import { QUIZ } from '../app/js/constants.js';
import { computeScores } from '../app/js/quiz.js';

const KNOWLEDGE_IDXS = [0, 1, 2, 3, 4];
const LIFESTYLE_IDXS = [11, 12, 13];
const MORTGAGE_IDXS  = [14, 15];
const HOUSING_IDX    = QUIZ.findIndex(q => q.key === 'housing'); // 10

function resetState() {
  state.answers = new Array(QUIZ.length).fill(null);
  state.knowledgeScore = 0;
  state.lifestyleScore = 0;
  state.mortgageContext = {};
  state.lifestyleContext = {};
  state.level = '';
}

// ── computeScores — punteggi conoscenza ──────────────────────────────────────

describe('computeScores — punteggi conoscenza', () => {
  beforeEach(resetState);

  it('con tutte le risposte null → knowledgeScore è 0', () => {
    computeScores();
    assert.equal(state.knowledgeScore, 0);
  });

  it('con tutte le risposte null → lifestyleScore è 0', () => {
    computeScores();
    assert.equal(state.lifestyleScore, 0);
  });

  it('5 risposte knowledge corrette → knowledgeScore 5', () => {
    KNOWLEDGE_IDXS.forEach(i => { state.answers[i] = QUIZ[i].correct; });
    computeScores();
    assert.equal(state.knowledgeScore, 5);
  });

  it('risposta parziale su knowledge non incrementa knowledgeScore', () => {
    state.answers[0] = QUIZ[0].partial;
    computeScores();
    assert.equal(state.knowledgeScore, 0);
  });

  it('risposta sbagliata su knowledge non incrementa knowledgeScore', () => {
    state.answers[0] = 2; // né correct(0) né partial(1)
    computeScores();
    assert.equal(state.knowledgeScore, 0);
  });

  it('knowledgeScore cresce di 1 per ogni risposta corretta', () => {
    state.answers[0] = QUIZ[0].correct;
    state.answers[2] = QUIZ[2].correct;
    computeScores();
    assert.equal(state.knowledgeScore, 2);
  });

  it('section_break è ignorato e non lancia eccezioni', () => {
    assert.doesNotThrow(() => computeScores());
    assert.equal(state.knowledgeScore, 0);
  });
});

// ── computeScores — punteggi lifestyle ──────────────────────────────────────

describe('computeScores — punteggi lifestyle', () => {
  beforeEach(resetState);

  it('risposta lifestyle con score 0 → lifestyleScore resta 0', () => {
    state.answers[11] = 0;
    computeScores();
    assert.equal(state.lifestyleScore, 0);
  });

  it('risposta lifestyle con score 2 → lifestyleScore è 2', () => {
    state.answers[11] = 2;
    computeScores();
    assert.equal(state.lifestyleScore, 2);
  });

  it('risposta lifestyle con score 1 → lifestyleScore è 1', () => {
    state.answers[11] = 1;
    computeScores();
    assert.equal(state.lifestyleScore, 1);
  });

  it('tre risposte lifestyle con score 2 ciascuna → lifestyleScore 6', () => {
    LIFESTYLE_IDXS.forEach(i => { state.answers[i] = 2; });
    computeScores();
    assert.equal(state.lifestyleScore, 6);
  });

  it('la somma dei punteggi lifestyle è cumulativa tra più domande', () => {
    state.answers[11] = 1; // +1
    state.answers[12] = 2; // +2
    computeScores();
    assert.equal(state.lifestyleScore, 3);
  });
});

// ── computeScores — contesti ─────────────────────────────────────────────────

describe('computeScores — contesti', () => {
  beforeEach(resetState);

  it('risposta mortgage_context finisce in state.mortgageContext all\'indice corretto', () => {
    state.answers[14] = 0;
    computeScores();
    assert.equal(state.mortgageContext[14], 0);
  });

  it('più risposte mortgage_context sono entrambe presenti in state.mortgageContext', () => {
    state.answers[14] = 1;
    state.answers[15] = 2;
    computeScores();
    assert.equal(state.mortgageContext[14], 1);
    assert.equal(state.mortgageContext[15], 2);
  });

  it('mortgage_context non contamina lifestyleContext', () => {
    state.answers[14] = 0;
    computeScores();
    assert.equal(Object.keys(state.lifestyleContext).length, 0);
  });

  it('lifestyle_context senza key usa l\'indice come chiave', () => {
    state.answers[6] = 1; // città media, no key
    computeScores();
    assert.equal(state.lifestyleContext[6], 1);
  });

  it('lifestyle_context con key "housing" usa la key come chiave', () => {
    state.answers[HOUSING_IDX] = 0;
    computeScores();
    assert.equal(state.lifestyleContext['housing'], 0);
  });

  it('con risposta null il contesto non viene popolato', () => {
    // answers[14] rimane null
    computeScores();
    assert.equal(state.mortgageContext[14], undefined);
  });
});

// ── computeScores — level ────────────────────────────────────────────────────

describe('computeScores — level', () => {
  beforeEach(resetState);

  it('score totale 0 → level "principiante"', () => {
    computeScores();
    assert.equal(state.level, 'principiante');
  });

  it('score 5 (knowledgeScore=5, lifestyleScore=0) → level "principiante"', () => {
    KNOWLEDGE_IDXS.forEach(i => { state.answers[i] = QUIZ[i].correct; });
    computeScores();
    assert.equal(state.level, 'principiante');
  });

  it('score 6 (knowledgeScore=4, lifestyleScore=2) → level "intermedio"', () => {
    KNOWLEDGE_IDXS.slice(0, 4).forEach(i => { state.answers[i] = QUIZ[i].correct; });
    state.answers[11] = 2; // +2
    computeScores();
    assert.equal(state.level, 'intermedio');
  });

  it('score 9 (knowledgeScore=3, lifestyleScore=6) → level "intermedio"', () => {
    KNOWLEDGE_IDXS.slice(0, 3).forEach(i => { state.answers[i] = QUIZ[i].correct; });
    LIFESTYLE_IDXS.forEach(i => { state.answers[i] = 2; });
    computeScores();
    assert.equal(state.level, 'intermedio');
  });

  it('score 10 (knowledgeScore=4, lifestyleScore=6) → level "esperto"', () => {
    KNOWLEDGE_IDXS.slice(0, 4).forEach(i => { state.answers[i] = QUIZ[i].correct; });
    LIFESTYLE_IDXS.forEach(i => { state.answers[i] = 2; });
    computeScores();
    assert.equal(state.level, 'esperto');
  });

  it('score 11 (knowledgeScore=5, lifestyleScore=6) → level "esperto"', () => {
    KNOWLEDGE_IDXS.forEach(i => { state.answers[i] = QUIZ[i].correct; });
    LIFESTYLE_IDXS.forEach(i => { state.answers[i] = 2; });
    computeScores();
    assert.equal(state.level, 'esperto');
  });

  it('computeScores aggiorna state.level ad ogni chiamata', () => {
    computeScores();
    assert.equal(state.level, 'principiante');

    KNOWLEDGE_IDXS.forEach(i => { state.answers[i] = QUIZ[i].correct; });
    LIFESTYLE_IDXS.forEach(i => { state.answers[i] = 2; });
    computeScores();
    assert.equal(state.level, 'esperto');
  });
});
