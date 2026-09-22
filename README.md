# Hackathon — Financing Teams

## Team
- Flavio Spanò & Maria Sofia Iacopinelli
- Durata: 5 ore

## Obiettivo
Applicazione sequenziale di domande e risposte per la valutazione di richieste legate al tema **financing teams**.  
L'utente risponde a una serie di domande e il sistema valuta le risposte con un approccio ibrido (regole + AI).

## Struttura del progetto

```
hackathon_2209_financing_teams/
├── app/            — Applicazione web (HTML + JS): questionario sequenziale + valutazione
├── agents/         — Agenti AI per la valutazione delle risposte
├── presentation/   — Presentazione finale (HTML)
└── README.md
```

## Stack tecnologico
- **Frontend / App**: HTML + JavaScript (vanilla)
- **Presentazione**: HTML
- **Valutazione**: Ibrido — regole fisse per lo scoring base + agente AI (LLM) per spiegazione e suggerimenti

## Flusso applicativo
1. L'utente risponde a domande sequenziali (step-by-step)
2. Le risposte vengono elaborate da regole di scoring
3. Un agente AI analizza le risposte e genera una valutazione con spiegazione
4. Viene mostrato il risultato finale all'utente

## Presentazione
- File: `presentation/index.html`
- Tema: Accenture (viola #A100FF, sfondo nero)
- 6 slide, navigazione con frecce tastiera o click
- Tasto `N` per mostrare/nascondere la bozza del discorso (~5 minuti)
- Struttura: Cover → Problema → Soluzione → Architettura → Demo → Impatto

## Dominio
> ⚠️ Da definire: specificare il tema esatto del questionario e i criteri di valutazione.
