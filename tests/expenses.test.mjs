import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { state } from '../app/js/state.js';
import { QUIZ, CATEGORIES } from '../app/js/constants.js';
import { buildVisibleCategories } from '../app/js/expenses.js';

const HOUSING_IDX = QUIZ.findIndex(q => q.key === 'housing'); // 10
const CITY_IDX    = 6;  // 0=grande, 1=media, 2=piccolo
const FAMILY_IDX  = 7;  // 0=solo, 1=partner, 2=partner+figli, 3=genitori
const CHILDREN_IDX = 8; // 0=no, 1=uno, 2=due+
const CARS_IDX    = 9;  // 0=nessuna, 1=una, 2=due+

function resetAnswers() {
  state.answers = new Array(QUIZ.length).fill(null);
}

// ── buildVisibleCategories ────────────────────────────────────────────────────

describe('buildVisibleCategories — struttura di base', () => {
  beforeEach(resetAnswers);

  it('restituisce un array', () => {
    assert.ok(Array.isArray(buildVisibleCategories()));
  });

  it('ogni categoria ha i campi id, label, icon, hint', () => {
    buildVisibleCategories().forEach(cat => {
      assert.ok(typeof cat.id === 'string', `campo id mancante in ${cat.label}`);
      assert.ok(typeof cat.label === 'string', `campo label mancante in ${cat.id}`);
      assert.ok(typeof cat.icon === 'string', `campo icon mancante in ${cat.id}`);
      assert.ok(cat.hint !== undefined, `campo hint mancante in ${cat.id}`);
    });
  });

  it('senza housing specificato (null) include la categoria affitto generica', () => {
    const cats = buildVisibleCategories();
    const aff = cats.find(c => c.id === 'affitto');
    assert.ok(aff, 'categoria affitto assente');
    assert.equal(aff.label, 'Affitto / Mutuo');
    assert.equal(aff.icon, '🏠');
  });
});

describe('buildVisibleCategories — situazione abitativa', () => {
  beforeEach(resetAnswers);

  it('con housing=0 (affitto) → prima categoria "Affitto mensile"', () => {
    state.answers[HOUSING_IDX] = 0;
    const cats = buildVisibleCategories();
    assert.equal(cats[0].id, 'affitto');
    assert.equal(cats[0].label, 'Affitto mensile');
    assert.equal(cats[0].icon, '🏠');
  });

  it('con housing=1 (mutuo in corso) → prima categoria "Rata mutuo"', () => {
    state.answers[HOUSING_IDX] = 1;
    const cats = buildVisibleCategories();
    assert.equal(cats[0].id, 'affitto');
    assert.equal(cats[0].label, 'Rata mutuo');
    assert.equal(cats[0].icon, '🏦');
  });

  it('con housing=2 (con la famiglia) → nessuna categoria affitto', () => {
    state.answers[HOUSING_IDX] = 2;
    const cats = buildVisibleCategories();
    const aff = cats.find(c => c.id === 'affitto');
    assert.equal(aff, undefined);
  });

  it('con housing=0 → numero categorie uguale a CATEGORIES.length', () => {
    state.answers[HOUSING_IDX] = 0;
    assert.equal(buildVisibleCategories().length, CATEGORIES.length);
  });

  it('con housing=2 → numero categorie è CATEGORIES.length - 1', () => {
    state.answers[HOUSING_IDX] = 2;
    assert.equal(buildVisibleCategories().length, CATEGORIES.length - 1);
  });

  it('la categoria affitto è sempre la prima quando presente', () => {
    [0, 1, null].forEach(housing => {
      state.answers[HOUSING_IDX] = housing;
      const cats = buildVisibleCategories();
      if (housing !== 2) {
        assert.equal(cats[0].id, 'affitto');
      }
    });
  });

  it('le categorie non-affitto sono sempre presenti indipendentemente dalla situazione abitativa', () => {
    const nonAffitto = CATEGORIES.filter(c => c.id !== 'affitto').map(c => c.id);
    [0, 1, 2].forEach(housing => {
      state.answers[HOUSING_IDX] = housing;
      const presentIds = buildVisibleCategories().map(c => c.id);
      nonAffitto.forEach(id => {
        assert.ok(presentIds.includes(id), `categoria "${id}" mancante con housing=${housing}`);
      });
    });
  });
});

describe('buildVisibleCategories — hint contestuali', () => {
  beforeEach(resetAnswers);

  it('hint affitto grande città (housing=0, city=0) ≥ 1000', () => {
    state.answers[HOUSING_IDX] = 0;
    state.answers[CITY_IDX] = 0;
    const cats = buildVisibleCategories();
    assert.ok(cats[0].hint >= 1000, `atteso ≥1000, ricevuto ${cats[0].hint}`);
  });

  it('hint affitto piccolo comune < hint affitto grande città (housing=0)', () => {
    state.answers[HOUSING_IDX] = 0;
    state.answers[CITY_IDX] = 0;
    const hintGrande = buildVisibleCategories()[0].hint;

    state.answers[CITY_IDX] = 2;
    const hintPiccolo = buildVisibleCategories()[0].hint;

    assert.ok(hintGrande > hintPiccolo);
  });

  it('hint trasporti con nessuna auto < hint con due+ auto', () => {
    state.answers[CARS_IDX] = 0;
    const hint0 = buildVisibleCategories().find(c => c.id === 'trasporti').hint;

    state.answers[CARS_IDX] = 2;
    const hint2 = buildVisibleCategories().find(c => c.id === 'trasporti').hint;

    assert.ok(hint2 > hint0);
  });

  it('hint salute con due+ figli > hint salute senza figli', () => {
    state.answers[CHILDREN_IDX] = 0;
    const hintSenza = buildVisibleCategories().find(c => c.id === 'salute').hint;

    state.answers[CHILDREN_IDX] = 2;
    const hintCon = buildVisibleCategories().find(c => c.id === 'salute').hint;

    assert.ok(hintCon > hintSenza);
  });

  it('hint spesa alimentare per nucleo solo < hint per partner+figli', () => {
    state.answers[FAMILY_IDX] = 0; // solo
    const hintSolo = buildVisibleCategories().find(c => c.id === 'spesa').hint;

    state.answers[FAMILY_IDX] = 2; // partner+figli
    const hintFamiglia = buildVisibleCategories().find(c => c.id === 'spesa').hint;

    assert.ok(hintFamiglia > hintSolo);
  });

  it('hint rata mutuo grande città (housing=1, city=0) > hint piccolo comune', () => {
    state.answers[HOUSING_IDX] = 1;
    state.answers[CITY_IDX] = 0;
    const hintGrande = buildVisibleCategories()[0].hint;

    state.answers[CITY_IDX] = 2;
    const hintPiccolo = buildVisibleCategories()[0].hint;

    assert.ok(hintGrande > hintPiccolo);
  });
});
