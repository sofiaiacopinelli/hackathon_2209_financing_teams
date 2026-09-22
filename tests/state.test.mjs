import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { state } from '../app/js/state.js';

describe('state — struttura iniziale', () => {
  it('è un oggetto', () => {
    assert.ok(state !== null && typeof state === 'object');
  });

  it('quizStep è un numero', () => {
    assert.ok(typeof state.quizStep === 'number');
  });

  it('answers è un array', () => {
    assert.ok(Array.isArray(state.answers));
  });

  it('knowledgeScore è un numero', () => {
    assert.ok(typeof state.knowledgeScore === 'number');
  });

  it('lifestyleScore è un numero', () => {
    assert.ok(typeof state.lifestyleScore === 'number');
  });

  it('income è un numero', () => {
    assert.ok(typeof state.income === 'number');
  });

  it('expenses è un oggetto', () => {
    assert.ok(state.expenses !== null && typeof state.expenses === 'object' && !Array.isArray(state.expenses));
  });

  it('mortgageContext è un oggetto', () => {
    assert.ok(typeof state.mortgageContext === 'object');
  });

  it('lifestyleContext è un oggetto', () => {
    assert.ok(typeof state.lifestyleContext === 'object');
  });

  it('level è una stringa', () => {
    assert.ok(typeof state.level === 'string');
  });

  it('marketDataReady è un booleano', () => {
    assert.ok(typeof state.marketDataReady === 'boolean');
  });

  it('marketDataSummary è una stringa', () => {
    assert.ok(typeof state.marketDataSummary === 'string');
  });
});

describe('state — mutabilità', () => {
  beforeEach(() => {
    // Ripristina i valori di base prima di ogni test
    state.income = 0;
    state.expenses = {};
    state.quizStep = 0;
    state.answers = [];
    state.knowledgeScore = 0;
    state.lifestyleScore = 0;
  });

  it('la modifica di income è visibile immediatamente', () => {
    state.income = 2500;
    assert.equal(state.income, 2500);
  });

  it('la modifica di expenses è visibile immediatamente', () => {
    state.expenses.affitto = 900;
    assert.equal(state.expenses.affitto, 900);
  });

  it('il push su answers aumenta la lunghezza di 1', () => {
    state.answers.push(0);
    assert.equal(state.answers.length, 1);
  });

  it('l\'incremento di quizStep funziona', () => {
    state.quizStep++;
    assert.equal(state.quizStep, 1);
  });

  it('i campi modificati sono indipendenti tra loro', () => {
    state.income = 3000;
    state.knowledgeScore = 5;
    assert.equal(state.income, 3000);
    assert.equal(state.knowledgeScore, 5);
  });
});
