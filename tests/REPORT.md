# Risultati test — FinanzaFacile

**Data**: 2026-09-22  
**Node.js**: v25.2.1  
**Runner**: `node:test` (built-in, zero dipendenze aggiuntive)

---

## Riepilogo

| Totale | Passati | Falliti | Saltati |
|--------|---------|---------|---------|
| 115    | 115     | 0       | 0       |

---

## Copertura per modulo

| Modulo | Suite | Test | Esito |
|--------|-------|------|-------|
| `utils.js` | 7 | 41 | ✅ |
| `constants.js` | 7 | 40 | ✅ |
| `state.js` | 2 | 17 | ✅ |
| `market-rates.js` | 1 | 10 | ✅ |
| `navigation.js` | 3 | 12 | ✅ |

---

## Funzioni/costanti testate

### utils.js
| Funzione | Casi testati |
|---|---|
| `fmt` | tipo stringa, simbolo €, locale it-IT, arrotondamento, negativi, milioni |
| `totalExpenses` | vuoto, singolo, multiplo, stringhe numeriche, NaN/undefined, zero |
| `monthlySavings` | positivo, negativo, reddito zero, spese zero |
| `getProfile` | range 0, 5, 6, 9, 10, 11 (tutti e tre i profili), campi obbligatori, fallback |
| `compoundGrowth` | pmt=0, pmt<0, tasso=0, crescita vs lineare, formula, orizzonte lungo, tasso alto |
| `calcolaRata` | tasso=0, confronto lineare, crescita con tasso, decrescita con durata, valori reali |
| `calcolaImportoMax` | tasso=0, inversa di calcolaRata, monotonia in rata/tasso/durata |

### constants.js
| Costante | Invarianti verificate |
|---|---|
| `MORTGAGE_DURATIONS` | tipo, valori, positivi, ordine crescente |
| `QUIZ` | tipi validi, campi obbligatori per tipo, section_break unico |
| `CATEGORIES` | 10 elementi, campi, unicità id, categorie fondamentali |
| `PROFILES` | 3 profili, campi, range senza overlap, range continui, id attesi |
| `TIPS` | 5 chiavi, icon/title/color, 3 livelli, colori esadecimali |
| `ACTIONS` | 3 livelli, ≥2 azioni ciascuno, title+text |
| `ISTAT_AVERAGES` | chiavi principali, valori positivi, allineamento con CATEGORIES |

### state.js
Struttura iniziale (12 campi), mutabilità diretta (income, expenses, answers, quizStep).

### market-rates.js
Struttura, valori default positivi, range realistico, taeg ≥ fisso, mutabilità.

### navigation.js
`FLOW_ORDER` (contenuto, unicità, ordine), `registerQuizNavigation` (accetta fn e null),  
`navigateBack` (guard targetIdx≥currentIdx, callback quiz, nessun callback null).

---

## Moduli esclusi dalla suite (dipendenze non testabili in Node.js)

| Modulo | Motivo |
|---|---|
| `navigation.js → showStep` | Usa `document`, `window` (DOM) |
| `market-data.js → fetchAll` | Usa `fetch` verso API BCE esterna |
| `app.js`, `quiz.js`, `profile.js` | Orchestrano DOM e dipendono da `document` |

---

## Bug sorgente rilevati

Nessuno. Tutti i test invarianti e di comportamento hanno passato al primo tentativo.
