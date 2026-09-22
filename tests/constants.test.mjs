import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  MORTGAGE_DURATIONS,
  QUIZ,
  CATEGORIES,
  PROFILES,
  TIPS,
  ACTIONS,
  ISTAT_AVERAGES
} from '../app/js/constants.js';

// ── MORTGAGE_DURATIONS ────────────────────────────────────────────────────────

describe('MORTGAGE_DURATIONS', () => {
  it('è un array', () => {
    assert.ok(Array.isArray(MORTGAGE_DURATIONS));
  });

  it('contiene le 5 durate standard in anni', () => {
    assert.deepStrictEqual(MORTGAGE_DURATIONS, [10, 15, 20, 25, 30]);
  });

  it('tutti gli elementi sono numeri positivi', () => {
    MORTGAGE_DURATIONS.forEach(d => {
      assert.ok(typeof d === 'number' && d > 0);
    });
  });

  it('è ordinato in modo crescente', () => {
    for (let i = 1; i < MORTGAGE_DURATIONS.length; i++) {
      assert.ok(MORTGAGE_DURATIONS[i] > MORTGAGE_DURATIONS[i - 1]);
    }
  });
});

// ── QUIZ ──────────────────────────────────────────────────────────────────────

describe('QUIZ', () => {
  const VALID_TYPES = new Set(['knowledge', 'lifestyle', 'lifestyle_context', 'mortgage_context', 'section_break']);

  it('è un array non vuoto', () => {
    assert.ok(Array.isArray(QUIZ) && QUIZ.length > 0);
  });

  it('ogni item ha il campo type', () => {
    QUIZ.forEach((q, i) => {
      assert.ok(q.type, `item ${i} manca di type`);
    });
  });

  it('ogni type è uno dei valori validi', () => {
    QUIZ.forEach((q, i) => {
      assert.ok(VALID_TYPES.has(q.type), `item ${i} ha type non valido: ${q.type}`);
    });
  });

  it('le domande di tipo knowledge hanno: text, options, correct, partial, feedback', () => {
    const qs = QUIZ.filter(q => q.type === 'knowledge');
    assert.ok(qs.length > 0, 'nessuna domanda knowledge trovata');
    qs.forEach((q, i) => {
      assert.ok(q.text,    `knowledge[${i}] manca text`);
      assert.ok(Array.isArray(q.options) && q.options.length >= 2, `knowledge[${i}] options insufficienti`);
      assert.ok(typeof q.correct === 'number', `knowledge[${i}] manca correct`);
      assert.ok(typeof q.partial === 'number', `knowledge[${i}] manca partial`);
      assert.ok(q.feedback?.correct, `knowledge[${i}] manca feedback.correct`);
      assert.ok(q.feedback?.wrong,   `knowledge[${i}] manca feedback.wrong`);
    });
  });

  it('le domande di tipo lifestyle hanno: text, options, scores', () => {
    const qs = QUIZ.filter(q => q.type === 'lifestyle');
    assert.ok(qs.length > 0, 'nessuna domanda lifestyle trovata');
    qs.forEach((q, i) => {
      assert.ok(q.text, `lifestyle[${i}] manca text`);
      assert.ok(Array.isArray(q.options), `lifestyle[${i}] manca options`);
      assert.ok(Array.isArray(q.scores), `lifestyle[${i}] manca scores`);
      assert.equal(q.options.length, q.scores.length, `lifestyle[${i}] options e scores hanno lunghezze diverse`);
    });
  });

  it('le domande lifestyle_context hanno: text, options', () => {
    const qs = QUIZ.filter(q => q.type === 'lifestyle_context');
    assert.ok(qs.length > 0);
    qs.forEach((q, i) => {
      assert.ok(q.text, `lifestyle_context[${i}] manca text`);
      assert.ok(Array.isArray(q.options) && q.options.length >= 2, `lifestyle_context[${i}] options insufficienti`);
    });
  });

  it('c\'è esattamente un section_break', () => {
    const breaks = QUIZ.filter(q => q.type === 'section_break');
    assert.equal(breaks.length, 1);
  });

  it('il section_break ha: icon, title, description, nextLabel', () => {
    const sb = QUIZ.find(q => q.type === 'section_break');
    assert.ok(sb.icon);
    assert.ok(sb.title);
    assert.ok(sb.description);
    assert.ok(sb.nextLabel);
  });
});

// ── CATEGORIES ────────────────────────────────────────────────────────────────

describe('CATEGORIES', () => {
  it('è un array di 10 categorie', () => {
    assert.equal(CATEGORIES.length, 10);
  });

  it('ogni categoria ha id, label, icon, hint', () => {
    CATEGORIES.forEach((c, i) => {
      assert.ok(c.id,                `CATEGORIES[${i}] manca id`);
      assert.ok(c.label,             `CATEGORIES[${i}] manca label`);
      assert.ok(c.icon,              `CATEGORIES[${i}] manca icon`);
      assert.ok(typeof c.hint === 'number' && c.hint > 0, `CATEGORIES[${i}] hint non valido`);
    });
  });

  it('gli id sono unici', () => {
    const ids = CATEGORIES.map(c => c.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  it('contiene le categorie fondamentali (affitto, spesa, bollette)', () => {
    const ids = new Set(CATEGORIES.map(c => c.id));
    assert.ok(ids.has('affitto'));
    assert.ok(ids.has('spesa'));
    assert.ok(ids.has('bollette'));
  });
});

// ── PROFILES ──────────────────────────────────────────────────────────────────

describe('PROFILES', () => {
  it('contiene esattamente 3 profili', () => {
    assert.equal(PROFILES.length, 3);
  });

  it('ogni profilo ha id, icon, title, desc, range', () => {
    PROFILES.forEach((p, i) => {
      assert.ok(p.id,                   `PROFILES[${i}] manca id`);
      assert.ok(p.icon,                 `PROFILES[${i}] manca icon`);
      assert.ok(p.title,                `PROFILES[${i}] manca title`);
      assert.ok(p.desc,                 `PROFILES[${i}] manca desc`);
      assert.ok(Array.isArray(p.range) && p.range.length === 2, `PROFILES[${i}] range non valido`);
    });
  });

  it('i range coprono lo score 0', () => {
    const covre0 = PROFILES.some(p => p.range[0] === 0);
    assert.ok(covre0);
  });

  it('i range non si sovrappongono', () => {
    const sorted = [...PROFILES].sort((a, b) => a.range[0] - b.range[0]);
    for (let i = 1; i < sorted.length; i++) {
      assert.ok(sorted[i].range[0] > sorted[i - 1].range[1],
        `Overlap tra profilo ${sorted[i-1].id} e ${sorted[i].id}`);
    }
  });

  it('i range sono continui (nessun gap)', () => {
    const sorted = [...PROFILES].sort((a, b) => a.range[0] - b.range[0]);
    for (let i = 1; i < sorted.length; i++) {
      assert.equal(sorted[i].range[0], sorted[i - 1].range[1] + 1,
        `Gap tra profilo ${sorted[i-1].id} e ${sorted[i].id}`);
    }
  });

  it('contiene i profili principiante, intermedio, esperto', () => {
    const ids = new Set(PROFILES.map(p => p.id));
    assert.ok(ids.has('principiante'));
    assert.ok(ids.has('intermedio'));
    assert.ok(ids.has('esperto'));
  });
});

// ── TIPS ──────────────────────────────────────────────────────────────────────

describe('TIPS', () => {
  const EXPECTED_KEYS = ['interesse', 'tasso', 'inflazione', 'rata', 'taeg'];
  const LEVELS = ['principiante', 'intermedio', 'esperto'];

  it('contiene le 5 chiavi attese', () => {
    EXPECTED_KEYS.forEach(k => {
      assert.ok(k in TIPS, `TIPS manca la chiave: ${k}`);
    });
  });

  it('ogni tip ha icon, title, color', () => {
    Object.entries(TIPS).forEach(([key, tip]) => {
      assert.ok(tip.icon,  `TIPS.${key} manca icon`);
      assert.ok(tip.title, `TIPS.${key} manca title`);
      assert.ok(tip.color, `TIPS.${key} manca color`);
    });
  });

  it('ogni tip ha contenuti per tutti e tre i livelli', () => {
    Object.entries(TIPS).forEach(([key, tip]) => {
      LEVELS.forEach(lvl => {
        assert.ok(tip[lvl], `TIPS.${key} manca il livello ${lvl}`);
        assert.ok(tip[lvl].simple,  `TIPS.${key}.${lvl} manca simple`);
        assert.ok(tip[lvl].example, `TIPS.${key}.${lvl} manca example`);
      });
    });
  });

  it('i colori sono stringhe esadecimali valide', () => {
    Object.entries(TIPS).forEach(([key, tip]) => {
      assert.ok(/^#[0-9A-Fa-f]{6}$/.test(tip.color), `TIPS.${key} color non è un hex valido: ${tip.color}`);
    });
  });
});

// ── ACTIONS ───────────────────────────────────────────────────────────────────

describe('ACTIONS', () => {
  const LEVELS = ['principiante', 'intermedio', 'esperto'];

  it('ha le chiavi per tutti e tre i livelli', () => {
    LEVELS.forEach(lvl => {
      assert.ok(lvl in ACTIONS, `ACTIONS manca il livello: ${lvl}`);
    });
  });

  it('ogni livello ha almeno 2 azioni', () => {
    LEVELS.forEach(lvl => {
      assert.ok(Array.isArray(ACTIONS[lvl]) && ACTIONS[lvl].length >= 2,
        `ACTIONS.${lvl} ha meno di 2 azioni`);
    });
  });

  it('ogni azione ha title e text', () => {
    LEVELS.forEach(lvl => {
      ACTIONS[lvl].forEach((a, i) => {
        assert.ok(a.title, `ACTIONS.${lvl}[${i}] manca title`);
        assert.ok(a.text,  `ACTIONS.${lvl}[${i}] manca text`);
      });
    });
  });
});

// ── ISTAT_AVERAGES ────────────────────────────────────────────────────────────

describe('ISTAT_AVERAGES', () => {
  it('contiene almeno le categorie di spesa principali', () => {
    ['affitto', 'spesa', 'bollette', 'trasporti'].forEach(k => {
      assert.ok(k in ISTAT_AVERAGES, `ISTAT_AVERAGES manca: ${k}`);
    });
  });

  it('tutti i valori sono numeri positivi', () => {
    Object.entries(ISTAT_AVERAGES).forEach(([key, val]) => {
      assert.ok(typeof val === 'number' && val > 0, `ISTAT_AVERAGES.${key} non è un numero positivo: ${val}`);
    });
  });

  it('le chiavi di ISTAT_AVERAGES coincidono con gli id di CATEGORIES', () => {
    const catIds = new Set(CATEGORIES.map(c => c.id));
    Object.keys(ISTAT_AVERAGES).forEach(k => {
      assert.ok(catIds.has(k), `ISTAT_AVERAGES ha chiave non presente in CATEGORIES: ${k}`);
    });
  });
});
