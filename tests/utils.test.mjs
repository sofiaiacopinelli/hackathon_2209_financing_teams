import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { state } from '../app/js/state.js';
import { fmt, totalExpenses, monthlySavings, getProfile, compoundGrowth, calcolaRata, calcolaImportoMax } from '../app/js/utils.js';

// ── fmt ─────────────────────────────────────────────────────────────────────

describe('fmt', () => {
  it('restituisce una stringa che contiene il simbolo €', () => {
    assert.ok(fmt(1000).includes('€'));
  });

  it('formatta 0 come stringa contenente 0 e €', () => {
    const result = fmt(0);
    assert.ok(result.includes('0'));
    assert.ok(result.includes('€'));
  });

  it('formatta valori positivi senza decimali', () => {
    const result = fmt(1500);
    assert.ok(!result.includes(','));
    assert.ok(result.includes('€'));
  });

  it('formatta correttamente 1.200 in locale it-IT', () => {
    const result = fmt(1200);
    // In it-IT il separatore migliaia è il punto
    assert.ok(result.includes('1'));
    assert.ok(result.includes('200'));
    assert.ok(result.includes('€'));
  });

  it('arrotonda i decimali senza mostrarli', () => {
    const result = fmt(1.9);
    assert.ok(!result.match(/[,\.]\d/)); // niente cifre dopo separatore decimale
    assert.ok(result.includes('€'));
  });

  it('gestisce valori negativi', () => {
    const result = fmt(-500);
    assert.ok(result.includes('500'));
    assert.ok(result.includes('€'));
  });

  it('gestisce valori grandi (milioni)', () => {
    const result = fmt(1000000);
    assert.ok(result.includes('€'));
    assert.ok(result.includes('000'));
  });
});

// ── totalExpenses ────────────────────────────────────────────────────────────

describe('totalExpenses', () => {
  beforeEach(() => {
    state.expenses = {};
  });

  it('restituisce 0 con expenses vuoto', () => {
    assert.equal(totalExpenses(), 0);
  });

  it('restituisce il valore di una singola spesa', () => {
    state.expenses = { affitto: 800 };
    assert.equal(totalExpenses(), 800);
  });

  it('somma correttamente più spese', () => {
    state.expenses = { affitto: 800, spesa: 300, bollette: 120 };
    assert.equal(totalExpenses(), 1220);
  });

  it('converte string numeriche con parseFloat', () => {
    state.expenses = { affitto: '750', spesa: '200' };
    assert.equal(totalExpenses(), 950);
  });

  it('ignora valori non numerici (trattati come 0)', () => {
    state.expenses = { affitto: 500, note: 'testo', extra: undefined };
    assert.equal(totalExpenses(), 500);
  });

  it('gestisce spese a zero', () => {
    state.expenses = { affitto: 0, spesa: 200 };
    assert.equal(totalExpenses(), 200);
  });
});

// ── monthlySavings ───────────────────────────────────────────────────────────

describe('monthlySavings', () => {
  beforeEach(() => {
    state.expenses = {};
    state.income = 0;
  });

  it('restituisce 0 con income 0 e nessuna spesa', () => {
    assert.equal(monthlySavings(), 0);
  });

  it('calcola il risparmio positivo correttamente', () => {
    state.income = 2000;
    state.expenses = { affitto: 800, spesa: 300 };
    assert.equal(monthlySavings(), 900);
  });

  it('restituisce un valore negativo se le spese superano il reddito', () => {
    state.income = 1000;
    state.expenses = { affitto: 1200 };
    assert.equal(monthlySavings(), -200);
  });

  it('risparmio con spese a zero è uguale al reddito', () => {
    state.income = 1500;
    assert.equal(monthlySavings(), 1500);
  });

  it('risparmio con reddito a zero e spese è negativo', () => {
    state.income = 0;
    state.expenses = { spesa: 300 };
    assert.equal(monthlySavings(), -300);
  });
});

// ── getProfile ───────────────────────────────────────────────────────────────

describe('getProfile', () => {
  beforeEach(() => {
    state.knowledgeScore = 0;
    state.lifestyleScore = 0;
  });

  it('restituisce il profilo principiante per score 0', () => {
    const p = getProfile();
    assert.equal(p.id, 'principiante');
  });

  it('restituisce il profilo principiante per score 5', () => {
    state.knowledgeScore = 3;
    state.lifestyleScore = 2;
    const p = getProfile();
    assert.equal(p.id, 'principiante');
  });

  it('restituisce il profilo intermedio per score 6', () => {
    state.knowledgeScore = 4;
    state.lifestyleScore = 2;
    const p = getProfile();
    assert.equal(p.id, 'intermedio');
  });

  it('restituisce il profilo intermedio per score 9', () => {
    state.knowledgeScore = 5;
    state.lifestyleScore = 4;
    const p = getProfile();
    assert.equal(p.id, 'intermedio');
  });

  it('restituisce il profilo esperto per score 10', () => {
    state.knowledgeScore = 6;
    state.lifestyleScore = 4;
    const p = getProfile();
    assert.equal(p.id, 'esperto');
  });

  it('restituisce il profilo esperto per score 11 (massimo)', () => {
    state.knowledgeScore = 6;
    state.lifestyleScore = 5;
    const p = getProfile();
    assert.equal(p.id, 'esperto');
  });

  it('il profilo restituito ha sempre i campi obbligatori', () => {
    const p = getProfile();
    assert.ok(p.id);
    assert.ok(p.icon);
    assert.ok(p.title);
    assert.ok(p.desc);
    assert.ok(Array.isArray(p.range));
  });

  it('fallback a PROFILES[0] per score fuori range', () => {
    state.knowledgeScore = 100;
    state.lifestyleScore = 100;
    const p = getProfile();
    assert.ok(p !== undefined);
  });
});

// ── compoundGrowth ────────────────────────────────────────────────────────────

describe('compoundGrowth', () => {
  it('restituisce 0 se pmt è 0', () => {
    assert.equal(compoundGrowth(0, 10, 0.05), 0);
  });

  it('restituisce 0 se pmt è negativo', () => {
    assert.equal(compoundGrowth(-100, 10, 0.05), 0);
  });

  it('con tasso 0 restituisce pmt × mesi (crescita lineare)', () => {
    assert.equal(compoundGrowth(100, 5, 0), 6000); // 100 × 60 mesi
  });

  it('cresce più del lineare con tasso positivo', () => {
    const lineare = compoundGrowth(100, 10, 0);
    const composto = compoundGrowth(100, 10, 0.05);
    assert.ok(composto > lineare);
  });

  it('calcola correttamente 1000€/mese per 1 anno al 5% annuo', () => {
    const r = 0.05 / 12;
    const n = 12;
    const atteso = 1000 * ((Math.pow(1 + r, n) - 1) / r);
    const risultato = compoundGrowth(1000, 1, 0.05);
    assert.ok(Math.abs(risultato - atteso) < 0.01);
  });

  it('orizzonte più lungo produce montante maggiore (a parità di tutto)', () => {
    const breve = compoundGrowth(200, 5, 0.05);
    const lungo = compoundGrowth(200, 20, 0.05);
    assert.ok(lungo > breve);
  });

  it('tasso più alto produce montante maggiore (a parità di tutto)', () => {
    const basso = compoundGrowth(200, 10, 0.03);
    const alto = compoundGrowth(200, 10, 0.07);
    assert.ok(alto > basso);
  });
});

// ── calcolaRata ───────────────────────────────────────────────────────────────

describe('calcolaRata', () => {
  it('con tasso 0 restituisce importo diviso numero di mesi', () => {
    const rata = calcolaRata(120000, 0, 10);
    assert.ok(Math.abs(rata - 1000) < 0.01); // 120000 / 120 mesi
  });

  it('con tasso > 0 la rata è maggiore del rimborso lineare', () => {
    const lineare = 200000 / (20 * 12);
    const rata = calcolaRata(200000, 3.5, 20);
    assert.ok(rata > lineare);
  });

  it('rata cresce al crescere del tasso', () => {
    const rata3 = calcolaRata(150000, 3, 25);
    const rata5 = calcolaRata(150000, 5, 25);
    assert.ok(rata5 > rata3);
  });

  it('rata decresce al crescere della durata', () => {
    const rata20 = calcolaRata(200000, 3.5, 20);
    const rata30 = calcolaRata(200000, 3.5, 30);
    assert.ok(rata30 < rata20);
  });

  it('mutuo 200k a 3.5% su 20 anni ha rata attorno a 1.160€', () => {
    const rata = calcolaRata(200000, 3.5, 20);
    assert.ok(rata > 1100 && rata < 1200);
  });

  it('importo maggiore produce rata maggiore', () => {
    const r100 = calcolaRata(100000, 3.5, 20);
    const r200 = calcolaRata(200000, 3.5, 20);
    assert.ok(Math.abs(r200 - r100 * 2) < 0.01);
  });
});

// ── calcolaImportoMax ─────────────────────────────────────────────────────────

describe('calcolaImportoMax', () => {
  it('con tasso 0 restituisce rataMax × mesi', () => {
    const importo = calcolaImportoMax(1000, 0, 10);
    assert.ok(Math.abs(importo - 120000) < 0.01);
  });

  it('è la funzione inversa di calcolaRata', () => {
    const importoOriginale = 180000;
    const tasso = 3.5;
    const durata = 25;
    const rata = calcolaRata(importoOriginale, tasso, durata);
    const importoCalcolato = calcolaImportoMax(rata, tasso, durata);
    assert.ok(Math.abs(importoCalcolato - importoOriginale) < 0.01);
  });

  it('rata più alta → importo massimo più alto', () => {
    const i800 = calcolaImportoMax(800, 3.5, 20);
    const i1200 = calcolaImportoMax(1200, 3.5, 20);
    assert.ok(i1200 > i800);
  });

  it('tasso più alto → importo massimo più basso (a parità di rata)', () => {
    const iBasso = calcolaImportoMax(1000, 2, 20);
    const iAlto = calcolaImportoMax(1000, 5, 20);
    assert.ok(iBasso > iAlto);
  });

  it('durata più lunga → importo massimo più alto (a parità di rata)', () => {
    const i20 = calcolaImportoMax(1000, 3.5, 20);
    const i30 = calcolaImportoMax(1000, 3.5, 30);
    assert.ok(i30 > i20);
  });
});
