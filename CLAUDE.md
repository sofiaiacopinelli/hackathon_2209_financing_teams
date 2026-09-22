# FinanzaFacile — istruzioni per Claude

## Prima di qualsiasi modifica al codice

Leggi sempre `agents/prompts/CODEBASE.md` prima di toccare qualsiasi file.
Contiene la mappa completa del progetto: a cosa serve ogni file, cosa esporta, e la guida rapida "dove metto X?" che ti dice esattamente dove intervenire senza scansionare il codebase.

---

## Stack

- **Frontend**: HTML + CSS + ES modules (no bundler) — `app/`
- **Server**: Node.js + Express — `app/server/`
- **Agenti AI**: Claude via `claude --print` subprocess — `agents/`
- **Test**: Node test runner nativo (`.mjs`) — `tests/`

---

## Avvio

```bash
# Prima volta: installa dipendenze server
cd app/server && npm install && cd ../..

# Avvia tutto (frontend + API sulla stessa porta 3000)
npm start

# Test
npm test
```

Il server Express serve anche i file statici del frontend — **una sola porta (3000), un solo comando**.
Non serve API key: usa `claude --print` CLI già autenticato.

---

## Architettura frontend

```
app/index.html
  └── <script type="module" src="js/main.js">
        ├── quiz.js          → step 1 quiz
        ├── expenses.js      → step 2 spese
        ├── profile.js       → step 3 profilo
        ├── simulation.js    → step 4 simulazione + tip card espandibili
        ├── mortgage.js      → step 5 mutuo + step 6 valutatore preventivo
        ├── ai.js            → chiamate HTTP al server locale (SERVER = localhost:3000)
        ├── market-data.js   → fetch tassi BCE (avviato dopo computeScores)
        ├── state.js         → stato globale singleton
        ├── constants.js     → costanti pure (QUIZ, TIPS, ACTIONS, CATEGORIES, ...)
        ├── utils.js         → funzioni pure (fmt, calcolaRata, monthlySavings, ...)
        └── navigation.js    → showStep(), FLOW_ORDER
```

**Regola**: ogni funzione chiamata da `onclick="app.xxx()"` nell'HTML **deve** essere aggiunta all'oggetto `app` in `main.js`.

---

## Architettura server + agenti

```
app/server/routes.js
  └── dispatch(taskType, data)       ← agents/orchestrator.js
        ├── 'analyze'          → agents/financial-analyzer.js
        ├── 'suggest-expenses' → agents/expense-suggester.js
        ├── 'mortgage-offer'   → agents/mortgage-advisor.js
        ├── 'quiz-feedback'    → agents/quiz-tutor.js
        └── 'tip-detail'       → agents/tip-explainer.js
```

Ogni agente:
1. Chiama `loadPrompt(name, vars)` — riempie `agents/prompts/<name>.md` con `{{PLACEHOLDER}}`
2. Passa il prompt a `callClaude()` — spawn di `claude --print` (nessuna API key necessaria)
3. Restituisce la risposta come stringa

Route disponibili: `GET /health`, `POST /analyze`, `POST /quiz-feedback`, `POST /suggest-expenses`, `POST /mortgage-offer`, `POST /tip-detail`, `POST /dispatch`

---

## Variabili CSS

Le variabili sono definite in `:root` in `app/css/style.css`. Usare sempre queste — mai colori hardcoded:

| Variabile | Valore | Uso |
|---|---|---|
| `--acc-purple` | #A100FF | Accent principale, pulsanti primari |
| `--acc-purple-mid` | #CC66FF | Testi accent su sfondo scuro |
| `--acc-purple-dim` | rgba(161,0,255,0.15) | Sfondi hover/selezionati |
| `--acc-purple-line` | rgba(161,0,255,0.35) | Bordi accent |
| `--success` | #22C55E | Valori positivi |
| `--danger` | #EF4444 | Valori negativi/errori |
| `--warning` | #F59E0B | Avvisi |
| `--bg-card` | #0d0d0d | Sfondo card |
| `--muted` | #999999 | Testi secondari |

**Non esiste `--accent`** — è una variabile non definita. Usare `--acc-purple` o `--acc-purple-mid`.

---

## Convenzioni

- I moduli JS usano ES modules (`import`/`export`), niente CommonJS nel frontend.
- Le skill del server sono funzioni pure in `app/server/skills/<nome>.js`.
- Ogni agente ha il proprio system prompt in `agents/prompts/<agente>.md`.
- Lo stato globale è centralizzato in `app/js/state.js` — non duplicare state altrove.
- Soft delete / side effects: nessuno — app stateless, nessun DB.

---

## Funzionalità implementate (al 2026-09-22)

- **Quiz adattivo**: 6 domande knowledge + lifestyle + contesto abitativo/mutuo; feedback immediato con AI (quiz-tutor)
- **Step spese**: form dinamico per categoria; suggerimento AI (expense-suggester); medie ISTAT; preview risparmio in tempo reale
- **Step profilo**: punteggio knowledge + lifestyle; livello (principiante/intermedio/esperto)
- **Step simulazione**: grafico Chart.js 20 anni (3 scenari); tip card cliccabili con expand AI (tip-explainer); metriche
- **Step mutuo**: affordability (status ok/warning/danger); profilo ottimale vs media italiana (Banca d'Italia 2023); simulatore interattivo con stress test; prossimi passi se warning/danger
- **Step valutatore preventivo**: analisi LTV, sostenibilità rata, competitività tasso; costo totale; parere AI (mortgage-advisor); pre-fill dal simulatore
- **Dati live BCE**: fetch automatico tassi reali all'avvio (market-data.js); fallback a dati stimati
