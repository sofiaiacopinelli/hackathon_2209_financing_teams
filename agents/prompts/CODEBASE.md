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
└── package.json            → script npm radice (start, test)
```

---

## Frontend — `app/`

### `app/index.html`
Entry point HTML. Contiene la struttura degli step (`#step-*`), i pulsanti con `onclick` che chiamano `window.app.*`, e i `<script type="module">`.

Step disponibili: `landing` → `quiz` → `expenses` → `profile` → `simulation` → `mortgage` → `evaluator`

### `app/css/style.css`
Tutti gli stili. Organizzato per sezioni con commenti `/* === SECTION === */`.
→ **Modifica qui** per qualsiasi cambio visivo (colori, layout, animazioni).

Variabili CSS principali: `--acc-purple` (#A100FF), `--acc-purple-mid` (#CC66FF), `--acc-purple-dim`, `--acc-purple-line`, `--success`, `--danger`, `--warning`, `--bg`, `--bg-card`, `--muted`, `--border`.

---

### Moduli JS — `app/js/`

| File | Responsabilità | Esporta (nomi reali) |
|---|---|---|
| `main.js` | Entry point. Assembla `window.app`, coordina tutti i moduli, registra la dipendenza circolare navigation↔quiz. | `app` (window) |
| `state.js` | Singleton mutabile dello stato globale. | `state` |
| `constants.js` | Costanti statiche. Nessuna dipendenza. | `QUIZ`, `PROFILES`, `CATEGORIES`, `ISTAT_AVERAGES`, `MORTGAGE_DURATIONS`, `ACTIONS`, `MORTGAGE_IMPROVEMENT_ACTIONS` |
| `utils.js` | Funzioni pure: formattazione valuta, calcoli finanziari, derivazioni da `state`. | `fmt`, `totalExpenses`, `monthlySavings`, `getProfile`, `compoundGrowth`, `calcolaRata`, `calcolaImportoMax` |
| `navigation.js` | `showStep()` e gestione navigazione tra step HTML. Risolve la dipendenza circolare con quiz via callback. | `showStep`, `registerQuizNavigation`, `FLOW_ORDER` |
| `quiz.js` | Logica quiz: rendering domande, navigazione prev/next, feedback immediato, `computeScores()`. | `startQuiz`, `prevQuestion`, `nextQuestion`, `computeScores`, `backToQuiz`, `renderQuestion`, `showKnowledgeFeedback`, `selectAnswer` |
| `profile.js` | Renderizza lo step profilo con punteggi e riepilogo contesto di vita. | `renderProfile` |
| `expenses.js` | Step spese mensili: form dinamico, suggerimento AI, calcolo risparmio. | `goToExpenses`, `fillAverageValues`, `requestExpenseAI`, `updateSavings`, `buildVisibleCategories`, `renderExpenseForm` |
| `simulation.js` | Step simulazione futura: grafico Chart.js, metriche, tip card cliccabili con expand AI. | `goToSimulation`, `renderTips` |
| `mortgage.js` | Step mutuo: affordability, profilo ottimale vs media IT, simulatore interattivo, valutazione preventivo, prossimi passi, navigazione al valutatore. | `goToMortgage`, `updateMortgageSim`, `runEvaluation`, `requestEvalAI`, `goToEvaluator` |
| `ai.js` | Funzioni di chiamata al server AI locale. | `requestAIAnalysis`, `SERVER` (costante URL) |
| `market-rates.js` | Singleton mutabile dei tassi di mercato (aggiornato in background da BCE). | `MARKET_RATES` |
| `market-data.js` | `MarketDataSkill`: recupera tassi reali da BCE SDMX REST API. Avviato dopo il quiz. | `MarketDataSkill` |

**`state` contiene:** `quizStep`, `answers`, `knowledgeScore`, `lifestyleScore`, `mortgageContext`, `lifestyleContext`, `level`, `income`, `expenses`, `evalData`, `chart`, `marketDataReady`, `marketDataSummary`, `weakAreas`

---

## Server — `app/server/`

### `app/server/index.js`
Entry point Express. Monta le route, configura CORS e avvia il server sulla porta `.env`.

### `app/server/routes.js`
Definisce le route HTTP e le delega all'orchestratore:
- `GET  /health`
- `POST /analyze`           → analisi finanziaria completa
- `POST /quiz-feedback`     → feedback quiz
- `POST /suggest-expenses`  → suggerimento spese
- `POST /mortgage-offer`    → valutazione preventivo mutuo
- `POST /tip-detail`        → approfondimento AI su concetto finanziario
- `POST /dispatch`          → routing automatico (task_type: auto o noto)

### `app/server/skills.js`
Implementazioni JS dei tool usati da Claude: `evaluate_quiz`, `analyze_expenses`, `run_simulation`, `get_tips`, `propose_mortgage`, `evaluate_mortgage_offer`, `optimal_mortgage_profile`.

### `app/server/skills/` — skill modulari

| File | Skill |
|---|---|
| `index.js` | registry — esporta tutte le skill come mappa |
| `quiz.js` | `evaluate_quiz` |
| `expenses.js` | `analyze_expenses` |
| `simulation.js` | `run_simulation` |
| `mortgage.js` | `propose_mortgage`, `evaluate_mortgage_offer` |
| `tips.js` | `get_tips` |

---

## Agenti AI — `agents/`

| File | Agente | Task type |
|---|---|---|
| `orchestrator.js` | Orchestratore | routing `dispatch(taskType, data)` |
| `base-agent.js` | Base | `callClaude()`, `loadPrompt(name, vars)`, `LEVEL_STYLE` |
| `financial-analyzer.js` | FinancialAnalyzer | `'analyze'` |
| `expense-suggester.js` | ExpenseSuggester | `'suggest-expenses'` |
| `mortgage-advisor.js` | MortgageAdvisor | `'mortgage-offer'` |
| `quiz-tutor.js` | QuizTutor | `'quiz-feedback'` |
| `tip-explainer.js` | TipExplainer | `'tip-detail'` |

Ogni agente: `loadPrompt(name, vars)` riempe il template `.md` con `{{PLACEHOLDER}}` → passa a `callClaude()` (spawn `claude --print`).

---

## Prompt degli agenti — `agents/prompts/`

| File | Agente |
|---|---|
| `financial-analyzer.md` | `financial-analyzer.js` |
| `expense-suggester.md` | `expense-suggester.js` |
| `mortgage-advisor.md` | `mortgage-advisor.js` |
| `quiz-tutor.md` | `quiz-tutor.js` |
| `tip-explainer.md` | `tip-explainer.js` |
| `test-generator.md` | — (generazione test) |
| `CODEBASE.md` | ← sei qui |

---

## Test — `tests/`

| File | Cosa testa |
|---|---|
| `constants.test.mjs` | Invarianti delle costanti (QUIZ, PROFILES, CATEGORIES) |
| `state.test.mjs` | Struttura e valori default dello stato |
| `utils.test.mjs` | Funzioni pure di calcolo e formattazione |
| `market-rates.test.mjs` | Struttura e mutabilità di MARKET_RATES |
| `navigation.test.mjs` | Logica di navigazione tra step |
| `REPORT.md` | Ultimo report di esecuzione dei test |

---

## Guida rapida "dove metto X?"

| Voglio modificare… | File |
|---|---|
| Stili / layout / colori | `app/css/style.css` |
| Struttura HTML / step | `app/index.html` |
| Costanti quiz, profili, categorie | `app/js/constants.js` |
| Calcoli finanziari (rata, affordability) | `app/js/utils.js` o `app/js/mortgage.js` |
| Stato globale | `app/js/state.js` |
| Navigazione tra step | `app/js/navigation.js` |
| Step spese | `app/js/expenses.js` |
| Step simulazione / tip card | `app/js/simulation.js` |
| Step mutuo / valutatore preventivo | `app/js/mortgage.js` |
| Chiamate al server AI | `app/js/ai.js` |
| Tassi di mercato (fetch BCE) | `app/js/market-data.js` + `app/js/market-rates.js` |
| Route HTTP del server | `app/server/routes.js` |
| Tool/skill del server | `app/server/skills/<nome>.js` |
| Prompt di un agente AI | `agents/prompts/<agente>.md` |
| Logica di un agente AI | `agents/<agente>.js` |
| Orchestrazione agenti | `agents/orchestrator.js` |
| Test | `tests/<modulo>.test.mjs` |
