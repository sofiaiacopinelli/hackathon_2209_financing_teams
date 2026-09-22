/**
 * @module market-rates
 * Singleton mutabile dei tassi di mercato.
 * Viene aggiornato in background da MarketDataSkill con i dati reali BCE.
 * Esportato come oggetto così le mutazioni sono visibili in tutti i moduli importatori.
 */

/**
 * Tassi di mercato correnti. I valori di default sono stime di riferimento;
 * vengono sovrascritti da MarketDataSkill quando i dati BCE sono disponibili.
 *
 * @type {{
 *   fisso: number,
 *   variabile: number,
 *   taeg_medio: number,
 *   live?: boolean,
 *   bce?: number,
 *   inflazione?: number,
 *   fetchedAt?: string,
 *   dateRef?: string
 * }}
 */
export const MARKET_RATES = { fisso: 3.5, variabile: 2.8, taeg_medio: 4.2 };
