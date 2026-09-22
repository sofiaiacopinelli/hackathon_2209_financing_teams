# Aggiorna Dati di Mercato

Aggiorna i dati finanziari hardcoded nell'app FinanzaFacile con valori reali e aggiornati.
Usa il web per cercare le informazioni più recenti, poi modifica direttamente `app/js/app.js`.

## Cosa aggiornare

### 1. Tassi mutui italiani (`MARKET_RATES` in app.js)
Cerca online i tassi correnti per i mutui ipotecari in Italia:
- Tasso fisso medio (nuovi mutui)
- Tasso variabile medio (Euribor + spread)
- TAEG medio di mercato

Fonti preferite (in ordine):
- Banca d'Italia — Bollettino Statistico (tassi MIR)
- BCE SDMX: `sdw-wsrest.ecb.europa.eu`
- Mutuionline.it, Facile.it, o simili comparatori italiani
- FABI / ABI comunicati stampa

### 2. Medie spese famiglie italiane (`ISTAT_AVERAGES` in app.js)
Cerca le spese medie mensili delle famiglie italiane per queste categorie:
- affitto/mutuo, spesa alimentare, ristoranti/bar, trasporti, bollette
- abbonamenti digitali, shopping abbigliamento, salute/farmacia, svago/hobby

Fonti preferite:
- ISTAT — Indagine sui consumi delle famiglie (ultima disponibile)
- ISTAT.it sezione "Statistiche" > "Famiglie e comportamenti sociali"
- Confcommercio, Federconsumatori report annuali

## Come procedere

1. **Cerca** i tassi mutui correnti con WebSearch
2. **Cerca** i dati ISTAT sui consumi delle famiglie con WebSearch
3. **Verifica** i valori trovati (confronta almeno 2 fonti)
4. **Aggiorna** in `app/js/app.js`:
   - La costante `MARKET_RATES` (righe vicino all'inizio del file)
   - La costante `ISTAT_AVERAGES` (nella sezione `// ── Spese ──`)
   - Il testo del commento accanto a `ISTAT_AVERAGES` con fonte e data
5. **Riporta** un riepilogo delle modifiche con le fonti usate e la data di riferimento dei dati

## Formato atteso in app.js

```js
const MARKET_RATES = { fisso: X.XX, variabile: X.XX, taeg_medio: X.XX };
// fonte: [nome fonte] — [mese anno]

const ISTAT_AVERAGES = {
  affitto: XXX, spesa: XXX, ristoranti: XXX, trasporti: XXX,
  bollette: XXX, abbonamenti: XXX, shopping: XXX, salute: XXX, svago: XXX, altro: XXX
};
// fonte: ISTAT Indagine consumi famiglie [anno] — valori mensili medi single/coppia
```

## Note
- Arrotonda tutti i valori: tassi a 2 decimali, spese all'intero più vicino
- Se un dato non è trovabile con certezza, mantieni il valore precedente e segnalalo
- Indica sempre la data di riferimento del dato (es. "giugno 2025")
