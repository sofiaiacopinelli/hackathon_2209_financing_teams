import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { FLOW_ORDER, registerQuizNavigation, navigateBack } from '../app/js/navigation.js';

describe('FLOW_ORDER', () => {
  it('è un array', () => {
    assert.ok(Array.isArray(FLOW_ORDER));
  });

  it('contiene gli step attesi del flusso', () => {
    const attesi = ['quiz', 'expenses', 'profile', 'simulation', 'mortgage'];
    attesi.forEach(step => {
      assert.ok(FLOW_ORDER.includes(step), `FLOW_ORDER manca lo step: ${step}`);
    });
  });

  it('non ha step duplicati', () => {
    assert.equal(new Set(FLOW_ORDER).size, FLOW_ORDER.length);
  });

  it('quiz è il primo step', () => {
    assert.equal(FLOW_ORDER[0], 'quiz');
  });
});

describe('registerQuizNavigation', () => {
  it('è una funzione', () => {
    assert.ok(typeof registerQuizNavigation === 'function');
  });

  it('accetta una funzione senza lanciare eccezioni', () => {
    assert.doesNotThrow(() => registerQuizNavigation(() => {}));
  });

  it('accetta null senza lanciare eccezioni', () => {
    assert.doesNotThrow(() => registerQuizNavigation(null));
  });
});

describe('navigateBack', () => {
  it('è una funzione', () => {
    assert.ok(typeof navigateBack === 'function');
  });

  it('non fa nulla se targetIdx >= currentIdx (nessuna navigazione all\'indietro)', () => {
    // Non deve lanciare eccezioni
    assert.doesNotThrow(() => navigateBack('expenses', 1, 1));
    assert.doesNotThrow(() => navigateBack('expenses', 1, 2));
  });

  it('chiama il callback registrato quando il target è quiz', () => {
    let chiamato = false;
    registerQuizNavigation(() => { chiamato = true; });
    navigateBack('quiz', 2, 0);
    assert.ok(chiamato, 'Il callback backToQuiz non è stato chiamato');
  });

  it('non chiama il callback quiz se targetIdx >= currentIdx', () => {
    let chiamato = false;
    registerQuizNavigation(() => { chiamato = true; });
    navigateBack('quiz', 0, 0); // stesso indice → nessuna azione
    assert.ok(!chiamato, 'Il callback non doveva essere chiamato');
  });

  it('con callback null non lancia eccezioni (navigazione verso quiz)', () => {
    registerQuizNavigation(null);
    // targetIdx 0 < currentIdx 2: tenta di andare a quiz ma _backToQuizFn è null
    assert.doesNotThrow(() => navigateBack('quiz', 2, 0));
  });
});
