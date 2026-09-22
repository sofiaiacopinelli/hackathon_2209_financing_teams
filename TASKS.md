# FinanzaFacile — Task Board (Hackathon)

## Flusso app attuale

```
Landing → Quiz (8 domande) → Profilo → Spese → Simulazione → Mutuo Affordability → [Valuta Preventivo]
```

---

## ✅ Già implementato (non toccare)

| Cosa | File |
|------|------|
| Landing page + branding Accenture | `app/index.html` |
| Quiz 8 domande (3 conoscenza + 3 lifestyle + 2 mutuo) | `app/js/app.js` |
| Profilo utente (principiante / intermedio / esperto) | `app/js/app.js` |
| Form spese mensili + preview risparmio | `app/index.html`, `app/js/app.js` |
| Simulazione 3 scenari (0%, 2%, 5%) + grafico | `app/js/app.js` |
| Tips finanziarie per livello (interesse, tasso, inflazione, rata, TAEG) | `app/js/app.js` |
| Analisi AI generale (Claude Haiku) | `app/js/app.js` |
| **Step 5: Affordability mutuo** (tabella + simulatore slider) | `app/js/app.js`, `app/index.html` |
| **Step 6: Valuta preventivo** (form + semafori + banner AI) | `app/js/app.js`, `app/index.html` |
| Agent Python CLI | `agents/financial_agent.py` |
| CSS design system Accenture completo | `app/css/style.css` |

**Server:** `python3 -m http.server 8080 --directory app`

---

## 🟡 Task aperti — divisi tra i due

### FLAVIO — con Claude Code

| # | Task | File | Note |
|---|------|------|------|
| F1 | Fix: la card affordability (verde/giallo/rosso) non appare sopra la tabella mutuo | `app/js/app.js` → `renderMortgage()` | Controllare che `mortgageResultCard` riceva l'HTML con `.mortgage-status` |
| F2 | Aggiungere quarta domanda mutuo al quiz: "Qual è la tua situazione abitativa attuale?" (In affitto / Proprietario / Con famiglia) | `app/js/app.js` → array `QUIZ` | Tipo `mortgage_context`, non scorinata |
| F3 | Aggiungere chart Chart.js nello step mutuo: confronto risparmio base vs risparmio con rata mutuo a 20 anni | `app/js/app.js` → aggiungere canvas `#mortgageCompareChart` in `index.html` | Riusa `compoundGrowth()` già esistente |
| F4 | Aggiornare il prompt AI generale (step simulazione) per includere info mutuo: se surplus > 0, dire qual è la rata max e il mutuo stimato | `app/js/app.js` → `requestAIAnalysis()` | Usa `calcolaImportoMax()` già disponibile |
| F5 | Test fine-to-end flusso completo: quiz → spese → simulazione → mutuo → preventivo | — | Verifica con reddito €2.000, spese €1.400 |

---

### MARIA SOFIA — task indipendenti

| # | Task | File | Note |
|---|------|------|------|
| M1 | **Presentazione**: aggiornare slide 3 (Solution) per includere i 2 nuovi step: "Mutuo Affordability" e "Valuta Preventivo" | `presentation/index.html` | Aggiungere nella flow diagram accanto a "AI Agent" e "Report" |
| M2 | **Presentazione**: aggiornare slide 5 (Demo) con screenshot/mockup del nuovo step mutuo (tabella + slider) | `presentation/index.html` | Screenshot da `http://localhost:8080` dopo step 5 |
| M3 | **Presentazione**: aggiornare slide 6 (Impact) con KPI aggiornati al nuovo scope | `presentation/index.html` | Aggiungere: "100% comprensione TAEG e LTV", "Valutazione preventivo in 30 sec" |
| M4 | **App**: aggiungere footer nell'`index.html` con logo testuale "FinanzaFacile by Accenture · Hackathon 2026" e disclaimer "Strumento educativo, non consulenza finanziaria professionale" | `app/index.html`, `app/css/style.css` | Stile coerente con branding esistente |
| M5 | **App**: migliorare la schermata del Profilo (step 2) aggiungendo un terzo indicatore: "Propensione al mutuo" basato sulle domande M6/M7 del quiz | `app/js/app.js` → `renderProfile()` | Leggere `state.mortgageContext` |
| M6 | **App**: aggiungere testo introduttivo nello step spese, personalizzato in base al profilo quiz (principiante → messaggio incoraggiante, esperto → diretto) | `app/js/app.js` → `goToExpenses()` | Usa `state.level` |

---

## Istruzioni per avviare l'app

```bash
cd /Users/flavio.spano/Repository/hackathon_2209_financing_teams
python3 -m http.server 8080 --directory app
```

Poi aprire `http://localhost:8080`

Per la presentazione:
```bash
python3 -m http.server 8081 --directory presentation
```

Poi aprire `http://localhost:8081`

---

## Struttura file

```
app/
├── index.html       ← struttura HTML (6 step)
├── css/style.css    ← design system Accenture dark
└── js/app.js        ← tutta la logica (quiz, spese, simulazione, mutuo, preventivo)

agents/
└── financial_agent.py   ← agent Python CLI (Claude Haiku)

presentation/
└── index.html       ← presentazione 6 slide

.claude/
└── launch.json      ← config server (punta ad app/)
```

---

## Note tecniche utili

- **Claude API**: usa `claude-haiku-4-5-20251001`, chiamato direttamente dal browser con header `anthropic-dangerous-direct-browser-access: true`
- **Calcolo rata**: `calcolaRata(importo, tassoAnnuo%, durataAnni)` — disponibile globalmente
- **Calcolo importo max**: `calcolaImportoMax(rataMax, tassoAnnuo%, durataAnni)` — disponibile globalmente
- **State globale**: `state.income`, `state.expenses`, `state.level`, `state.mortgageContext`, `state.evalData`
- **Tassi di riferimento**: `MARKET_RATES = { fisso: 3.5, variabile: 2.8, taeg_medio: 4.2 }`
- **Aggiungere uno step**: creare `<div class="step" id="step-NOME">`, aggiungere `'NOME'` a `FLOW_ORDER`, creare `goToNOME()`, esporre nel `return` dell'IIFE
