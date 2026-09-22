import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MARKET_RATES } from '../app/js/market-rates.js';

describe('MARKET_RATES — struttura e valori default', () => {
  it('è un oggetto', () => {
    assert.ok(MARKET_RATES !== null && typeof MARKET_RATES === 'object');
  });

  it('ha il campo fisso (tasso fisso mutui)', () => {
    assert.ok('fisso' in MARKET_RATES);
  });

  it('ha il campo variabile (tasso variabile mutui)', () => {
    assert.ok('variabile' in MARKET_RATES);
  });

  it('ha il campo taeg_medio', () => {
    assert.ok('taeg_medio' in MARKET_RATES);
  });

  it('fisso è un numero positivo', () => {
    assert.ok(typeof MARKET_RATES.fisso === 'number' && MARKET_RATES.fisso > 0);
  });

  it('variabile è un numero positivo', () => {
    assert.ok(typeof MARKET_RATES.variabile === 'number' && MARKET_RATES.variabile > 0);
  });

  it('taeg_medio è un numero positivo', () => {
    assert.ok(typeof MARKET_RATES.taeg_medio === 'number' && MARKET_RATES.taeg_medio > 0);
  });

  it('i tassi sono in un range realistico (0.1% – 15%)', () => {
    [MARKET_RATES.fisso, MARKET_RATES.variabile, MARKET_RATES.taeg_medio].forEach(t => {
      assert.ok(t >= 0.1 && t <= 15, `Tasso fuori range: ${t}`);
    });
  });

  it('taeg_medio è >= del tasso fisso (il TAEG include tutti i costi)', () => {
    assert.ok(MARKET_RATES.taeg_medio >= MARKET_RATES.fisso);
  });

  it('è mutabile: la modifica di un campo è visibile', () => {
    const original = MARKET_RATES.fisso;
    MARKET_RATES.fisso = 2.0;
    assert.equal(MARKET_RATES.fisso, 2.0);
    MARKET_RATES.fisso = original; // ripristina
  });
});
