/**
 * @module market-data
 * MarketDataSkill — recupera dati finanziari aggiornati da fonti pubbliche.
 * Usa la BCE SDMX REST API (nessuna API key richiesta).
 * Viene avviato in background dopo il completamento del quiz e aggiorna MARKET_RATES.
 */

import { MARKET_RATES } from './market-rates.js';

/** @constant {string} URL base dell'API BCE SDMX REST */
const ECB_BASE = 'https://sdw-wsrest.ecb.europa.eu/service/data';

/**
 * Recupera una serie temporale dall'API BCE.
 * @param {string} path - Percorso della serie (es. 'FM/B.U2.EUR...')
 * @param {number} [lastN=1] - Numero di osservazioni recenti da recuperare
 * @returns {Promise<Object>} Risposta JSON della BCE
 */
async function fetchSeries(path, lastN = 1) {
  const url = `${ECB_BASE}/${path}?lastNObservations=${lastN}&format=jsondata`;
  const r = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`ECB ${r.status}`);
  return r.json();
}

/**
 * Estrae il valore e la data dell'ultima osservazione da una risposta BCE.
 * @param {Object} json - Risposta JSON della BCE
 * @returns {{ value: number, date: string }}
 */
function parseLatest(json) {
  const series = Object.values(json.dataSets[0].series)[0];
  const obsKeys = Object.keys(series.observations).sort((a, b) => +a - +b);
  const lastKey = obsKeys[obsKeys.length - 1];
  const value = series.observations[lastKey][0];
  const dateLabel = json.structure.dimensions.observation[0].values[+lastKey]?.name || '';
  return { value, date: dateLabel };
}

/**
 * Recupera in parallelo tutti i tassi di interesse dalla BCE.
 * Usa Promise.allSettled per tollerare errori parziali.
 * @returns {Promise<Object>} Oggetto con i valori dei tassi e la data di fetch
 */
async function fetchAll() {
  const [ecbRate, fixedMir, varMir, hicp] = await Promise.allSettled([
    fetchSeries('FM/B.U2.EUR.4F.KR.MRR_FR.LEV'),
    fetchSeries('MIR/M.IT.B.A2A.AM.R.A.2240.EUR.N', 2),
    fetchSeries('MIR/M.IT.B.A2C.AM.R.A.2240.EUR.N', 2),
    fetchSeries('ICP/M.IT.N.000000.4.ANR', 2)
  ]);

  return {
    bceRate:    ecbRate.status === 'fulfilled'    ? parseLatest(ecbRate.value)    : null,
    fisso:      fixedMir.status === 'fulfilled'   ? parseLatest(fixedMir.value)   : null,
    variabile:  varMir.status === 'fulfilled'     ? parseLatest(varMir.value)     : null,
    inflazione: hicp.status === 'fulfilled'       ? parseLatest(hicp.value)       : null,
    fetchedAt:  new Date().toLocaleString('it-IT')
  };
}

/**
 * Aggiorna MARKET_RATES con i dati reali ricevuti dalla BCE.
 * @param {Object} data - Dati restituiti da fetchAll()
 * @returns {boolean} true se almeno un valore è stato aggiornato
 */
function applyToMarketRates(data) {
  let anyFetched = false;
  if (data.fisso)      { MARKET_RATES.fisso      = parseFloat(data.fisso.value.toFixed(2));      anyFetched = true; }
  if (data.variabile)  { MARKET_RATES.variabile  = parseFloat(data.variabile.value.toFixed(2));  anyFetched = true; }
  if (data.bceRate)    { MARKET_RATES.bce        = parseFloat(data.bceRate.value.toFixed(2));    anyFetched = true; }
  if (data.inflazione) { MARKET_RATES.inflazione = parseFloat(data.inflazione.value.toFixed(1)); anyFetched = true; }
  if (anyFetched) {
    MARKET_RATES.live      = true;
    MARKET_RATES.fetchedAt = data.fetchedAt;
    MARKET_RATES.dateRef   = data.fisso?.date || data.variabile?.date || '';
  }
  return anyFetched;
}

/**
 * Costruisce il testo di riepilogo da mostrare all'utente sui dati di mercato.
 * @param {Object} data - Dati restituiti da fetchAll()
 * @param {boolean} anyFetched - Indica se almeno un dato è stato recuperato
 * @returns {string} Testo riepilogativo in italiano
 */
function buildSummaryText(data, anyFetched) {
  if (!anyFetched) {
    return `📋 Dati BCE non raggiungibili — in uso valori di riferimento:\n• Tasso fisso: ${MARKET_RATES.fisso}% · Variabile: ${MARKET_RATES.variabile}%`;
  }
  const lines = ['📡 Dati aggiornati (BCE / Banca d\'Italia):'];
  if (data.bceRate)    lines.push(`• Tasso BCE: ${data.bceRate.value.toFixed(2)}% (${data.bceRate.date})`);
  if (data.fisso)      lines.push(`• Tassi fissi mutui IT: ${data.fisso.value.toFixed(2)}% (${data.fisso.date})`);
  if (data.variabile)  lines.push(`• Tassi variabili mutui IT: ${data.variabile.value.toFixed(2)}% (${data.variabile.date})`);
  if (data.inflazione) lines.push(`• Inflazione IT (HICP): ${data.inflazione.value.toFixed(1)}% (${data.inflazione.date})`);
  return lines.join('\n');
}

/**
 * MarketDataSkill — entry point pubblico.
 * Avvia il recupero dati in background, aggiorna MARKET_RATES e restituisce un riepilogo.
 *
 * @namespace MarketDataSkill
 */
export const MarketDataSkill = {
  /**
   * Esegue il fetch dei dati BCE e aggiorna MARKET_RATES.
   * @returns {Promise<{ ok: boolean, summary: string, data: Object|null }>}
   */
  async run() {
    try {
      const data = await fetchAll();
      const anyFetched = applyToMarketRates(data);
      return { ok: anyFetched, summary: buildSummaryText(data, anyFetched), data };
    } catch (e) {
      return {
        ok: false,
        summary: `📋 BCE non raggiungibile — in uso valori di riferimento:\n• Tasso fisso: ${MARKET_RATES.fisso}% · Variabile: ${MARKET_RATES.variabile}%`,
        data: null
      };
    }
  }
};
