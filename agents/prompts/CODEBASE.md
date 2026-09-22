# FILE-MAP — FinanzaFacile

Usa questo file come prima lettura prima di qualsiasi modifica.
Trova qui il file giusto senza scansionare l'intero progetto.

---

## Struttura radice

```
hackathon_2209_financing_teams/
├── app/                    → frontend (HTML/CSS/JS) + server Node
├── agents/                 → agenti AI e i loro prompt
├── tests/                  → test suite
├── presentation/           → slide della demo
├── package.json            → script npm radice (start, test)
└── TASKS.md                → backlog e task in corso
```

---

## Frontend — `app/`

### `app/index.html`
Entry point HTML. Contiene la struttura degli step (`#step-*`), i pulsanti con `onclick` che chiamano `window.app.*`, e i `<script type="module">`.

### `app/css/style.css`
Tutti gli stili. Organizzato per sezioni con commenti `/* === SECTION === */`.
→ **Modifica qui** per qualsiasi cambio visivo (colori, layout, animazioni).

---

### Moduli JS — `app/js/`

| File | Responsabilità | Esporta |
|---|---|---|
| `main.js` | Entry point. Assembla `window.app`, coordina tutti i moduli, registra la dipendenza circolare navigation↔quiz. | `app` (window) |
| `state.js` | Singleton mutabile dello stato globale (`quizStep`, `answers`, `scores`, `income`, `expenses`, `evalData`, …). | `state` |
| `constants.js` | Costanti statiche (domande quiz, PROFILES, categorie spese, ecc.). Nessuna dipendenza. | `QUESTIONS`, `PROFILES`, `EXPENSE_CATEGORIES`, … |
| `utils.js` | Funzioni pure: formattazione valuta/percentuale, calcoli finanziari, derivazioni da `state`. | `formatCurrency`, `formatPct`, `calcMortgage`, … |
| `navigation.js` | `showStep()` e gestione navigazione tra step HTML. Risolve la dipendenza circolare con quiz via callback. | `showStep`, `registerQuizNavigation` |
| `quiz.js` | Logica quiz: rendering domande, navigazione prev/next, feedback immediato, `computeScores()`. | `startQuiz`, `prevQuestion`, `nextQuestion`, `computeScores`, `backToQuiz` |
| `profile.js` | Renderizza lo step profilo con punteggi e riepilogo contesto di vita. | `renderProfile` |
| `expenses.js` | Step spese mensili: form dinamico, suggerimento AI, calcolo risparmio. | `goToExpenses`, `fillAverageValues`, `requestExpenseAI`, `updateSavings` |
| `simulation.js` | Step simulazione futura: grafico, metriche, tips educativi. | `goToSimulation` |
| `mortgage.js` | Step mutuo: affordability, simulatore interattivo, valutazione preventivo, richiesta AI. | `goToMortgage`, `updateMortgageSim`, `runEvaluation`, `requestEvalAI` |
| `ai.js` | Funzioni di chiamata al server AI locale (`/analyze`, `/quiz-feedback`, `/suggest-expenses`, `/mortgage-offer`). | `requestAIAnalysis`, costante `SERVER` |
| `market-rates.js` | Singleton mutabile dei tassi di mercato (aggiornato in background da BCE). | `MARKET_RATES` |
| `market-data.js` | `MarketDataSkill`: recupera tassi reali da BCE SDMX REST API. Avviato dopo il quiz. | `MarketDataSkill` |
| `app.js` | *(legacy)* Logica monolitica precedente al refactor in moduli. Ancora referenziata da alcune parti. |  |

---

## Server — `app/server/`

### `app/server/index.js`
Entry point Express. Monta le route, configura CORS e avvia il server sulla porta `.env`.

### `app/server/routes.js`
Definisce le route HTTP e le delega all'orchestratore:
- `GET  /health`
- `POST /analyze`        → analisi finanziaria completa
- `POST /quiz-feedback`  → feedback quiz
- `POST /suggest-expenses` → suggerimento spese
- `POST /mortgage-offer` → valutazione preventivo mutuo

### `app/server/skills.js`
Implementazioni JS dei tool richiamati da Claude nell'agentic loop (specchiano le skill in `app/server/skills/`).

### `app/server/skills/` — skill modulari

| File | Skill | Descrizione |
|---|---|---|
| `index.js` | registry | Esporta tutte le skill come mappa `{ nome: fn }` |
| `quiz.js` | `evaluate_quiz` | Calcola il profilo finanziario dai punteggi quiz |
| `expenses.js` | `analyze_expenses` | Analizza distribuzione spese vs reddito |
| `simulation.js` | `run_simulation` | Proietta risparmio su orizzonti con 3 scenari di rendimento |
| `mortgage.js` | `propose_mortgage`, `evaluate_mortgage_offer` | Affordability e valutazione offerta mutuo |
| `tips.js` | `get_tips` | Consigli personalizzati per livello e aree di debolezza |

### `app/server/.env.example`
Template variabili d'ambiente (porta, API key Claude, ecc.).
→ Copiare in `.env` per avviare il server.

---

## Agenti AI — `agents/`

| File | Agente | Descrizione |
|---|---|---|
| `orchestrator.js` | Orchestratore | Riceve la request, sceglie l'agente giusto, coordina il tool-use loop |
| `base-agent.js` | Base | Classe base con logica comune (chiamata Claude, tool dispatch) |
| `financial-analyzer.js` | FinancialAnalyzer | Analisi finanziaria completa, usa skill `evaluate_quiz` + `run_simulation` + `get_tips` |
| `expense-suggester.js` | ExpenseSuggester | Suggerisce ottimizzazione spese, usa skill `analyze_expenses` |
| `mortgage-advisor.js` | MortgageAdvisor | Valuta affordability e offerte mutuo, usa skill `propose_mortgage` + `evaluate_mortgage_offer` |
| `quiz-tutor.js` | QuizTutor | Genera feedback didattico sul quiz, usa skill `evaluate_quiz` |

---

## Prompt degli agenti — `agents/prompts/`

| File | Agente che lo usa | Cosa contiene |
|---|---|---|
| `financial-analyzer.md` | `financial-analyzer.js` | System prompt per l'analisi finanziaria |
| `expense-suggester.md` | `expense-suggester.js` | System prompt per il suggerimento spese |
| `mortgage-advisor.md` | `mortgage-advisor.js` | System prompt per il consulente mutuo |
| `quiz-tutor.md` | `quiz-tutor.js` | System prompt per il tutor del quiz |
| `test-generator.md` | — | Prompt per generare nuovi test |
| `aggiorna-dati-mercato.md` | — | Istruzioni per aggiornare i dati di mercato |
| `FILE-MAP.md` | ← sei qui | Mappa di tutti i file del progetto |

---

## Test — `tests/`

| File | Cosa testa |
|---|---|
| `constants.test.mjs` | Invarianti delle costanti (QUESTIONS, PROFILES, EXPENSE_CATEGORIES) |
| `state.test.mjs` | Struttura e valori default dello stato |
| `utils.test.mjs` | Funzioni pure di calcolo e formattazione |
| `market-rates.test.mjs` | Struttura e mutabilità di MARKET_RATES |
| `navigation.test.mjs` | Logica di navigazione tra step |
| `REPORT.md` | Ultimo report di esecuzione dei test |

Comando per eseguire: `npm test` dalla radice.

---

## Guida rapida "dove metto X?"

| Voglio modificare… | File |
|---|---|
| Stili / layout / colori | `app/css/style.css` |
| Struttura HTML / step | `app/index.html` |
| Logica quiz (domande, punteggi) | `app/js/quiz.js` + `app/js/constants.js` |
| Calcoli finanziari (rata, affordability) | `app/js/utils.js` o `app/js/mortgage.js` |
| Stato globale | `app/js/state.js` |
| Navigazione tra step | `app/js/navigation.js` |
| Step spese | `app/js/expenses.js` |
| Step simulazione | `app/js/simulation.js` |
| Step mutuo | `app/js/mortgage.js` |
| Chiamate al server AI | `app/js/ai.js` |
| Tassi di mercato (fetch BCE) | `app/js/market-data.js` + `app/js/market-rates.js` |
| Route HTTP del server | `app/server/routes.js` |
| Tool/skill del server | `app/server/skills/<nome>.js` |
| Prompt di un agente AI | `agents/prompts/<agente>.md` |
| Logica di un agente AI | `agents/<agente>.js` |
| Orchestrazione agenti | `agents/orchestrator.js` |
| Test | `tests/<modulo>.test.mjs` |
