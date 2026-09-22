# FinanzaFacile

Personal finance advisor — Accenture Hackathon 22/09/2026  
Team: Flavio Spanò & Maria Sofia Iacopinelli

---

## Avvio rapido

```bash
# 1. Installa le dipendenze del server (solo la prima volta)
cd app/server && npm install && cd ../..

# 2. Avvia tutto
npm start
```

Apri **http://localhost:3000** nel browser.

Il server Express serve sia il frontend (file statici) sia le API AI sulla stessa porta.  
Non serve configurare nulla — usa `claude` CLI già installato, senza API key.

---

## Prerequisiti

- Node.js 18+
- Claude CLI installato e autenticato (`claude --version` deve funzionare)

---

## Struttura del progetto

```
hackathon_2209_financing_teams/
├── app/
│   ├── index.html          — entry point SPA
│   ├── css/style.css       — stili (Accenture dark theme)
│   ├── js/                 — moduli ES frontend
│   │   ├── main.js         — inizializzazione + window.app
│   │   ├── quiz.js         — step 1: quiz adattivo (6 domande)
│   │   ├── expenses.js     — step 2: inserimento spese per categoria
│   │   ├── profile.js      — step 3: punteggio profilo
│   │   ├── simulation.js   — step 4: grafico 20 anni + tip card AI
│   │   ├── mortgage.js     — step 5/6: affordability + valutatore preventivo
│   │   ├── ai.js           — chiamate HTTP al server locale
│   │   ├── state.js        — stato globale singleton
│   │   ├── constants.js    — costanti (QUIZ, TIPS, CATEGORIES, ...)
│   │   ├── utils.js        — funzioni pure (fmt, calcolaRata, ...)
│   │   └── navigation.js   — showStep(), FLOW_ORDER
│   └── server/
│       ├── index.js        — Express entry point (porta 3000)
│       ├── routes.js       — route HTTP
│       └── skills/         — skill pure server-side
├── agents/
│   ├── orchestrator.js     — routing task → agente
│   ├── base-agent.js       — callClaude() via claude --print
│   ├── financial-analyzer.js
│   ├── mortgage-advisor.js
│   ├── expense-suggester.js
│   ├── quiz-tutor.js
│   ├── tip-explainer.js
│   ├── mortgage-coach.js
│   └── prompts/            — template .md con {{PLACEHOLDER}}
├── tests/                  — test suite Node nativa
├── CLAUDE.md               — istruzioni per Claude Code
└── package.json            — npm start + npm test
```

---

## Flusso utente

1. **Quiz** — 6 domande su conoscenza finanziaria, stile di vita e contesto abitativo
2. **Spese** — inserimento spese mensili per categoria con suggerimento AI
3. **Profilo** — punteggio knowledge/lifestyle, livello (principiante/intermedio/esperto)
4. **Simulazione** — grafico 20 anni con 6 scenari (pessimistico → ottimistico → realistico con imprevisti → crescita stipendio); tip card cliccabili con approfondimento AI
5. **Mutuo** — affordability checker (ok/warning/danger); simulatore interattivo; se warning/danger → prossimi passi generati da AI in base al profilo
6. **Valutatore preventivo** — analisi LTV, sostenibilità rata, competitività tasso; parere AI

---

## Architettura AI

Il frontend chiama il server locale (localhost:3000) via fetch. Il server usa `claude --print` come subprocess — nessuna API key, nessun costo.

```
Browser → POST /tip-detail     → tip-explainer.js   → claude --print
       → POST /analyze         → financial-analyzer.js
       → POST /mortgage-offer  → mortgage-advisor.js
       → POST /suggest-expenses → expense-suggester.js
       → POST /quiz-feedback   → quiz-tutor.js
       → POST /mortgage-coach  → mortgage-coach.js
```

Ogni agente: `buildPrompt(data)` → `loadPrompt('nome', vars)` → `callClaude()` → stringa risposta.

---

## Script disponibili

```bash
npm start   # avvia server (porta 3000) + frontend
npm test    # esegue test suite
```
