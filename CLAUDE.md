# FinanzaFacile — istruzioni per Claude

## Prima di qualsiasi modifica al codice

Leggi sempre `agents/prompts/CODEBASE.md` prima di toccare qualsiasi file.
Contiene la mappa completa del progetto: a cosa serve ogni file, cosa esporta, e la guida rapida "dove metto X?" che ti dice esattamente dove intervenire senza scansionare il codebase.

## Stack

- **Frontend**: HTML + CSS + ES modules (no bundler) — `app/`
- **Server**: Node.js + Express — `app/server/`
- **Agenti AI**: Claude API con tool-use loop — `agents/`
- **Test**: Node test runner nativo (`.mjs`) — `tests/`

## Comandi utili

```bash
npm start        # avvia frontend + server in parallelo
npm test         # esegue la test suite
```

## Convenzioni

- I moduli JS usano ES modules (`import`/`export`), niente CommonJS nel frontend.
- Le skill del server sono funzioni pure in `app/server/skills/<nome>.js`.
- Ogni agente ha il proprio system prompt in `agents/prompts/<agente>.md`.
- Lo stato globale è centralizzato in `app/js/state.js` — non duplicare state altrove.
