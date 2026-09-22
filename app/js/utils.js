/**
 * @module utils
 * Funzioni pure di utilità: formattazione, calcoli finanziari e derivazioni dallo stato.
 * Non producono effetti collaterali tranne la lettura di `state` e `PROFILES`.
 */

import { state } from './state.js';
import { PROFILES } from './constants.js';

/**
 * Formatta un numero come valuta EUR in locale italiano (senza decimali).
 * @param {number} n - Il valore numerico da formattare
 * @returns {string} Stringa formattata, es. "1.200 €"
 */
export function fmt(n) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(n);
}

/**
 * Somma tutte le spese mensili presenti in state.expenses.
 * @returns {number} Totale spese mensili in euro
 */
export function totalExpenses() {
  return Object.values(state.expenses).reduce((s, v) => s + (parseFloat(v) || 0), 0);
}

/**
 * Calcola il risparmio mensile netto (entrate meno spese).
 * @returns {number} Risparmio mensile in euro (può essere negativo)
 */
export function monthlySavings() {
  return state.income - totalExpenses();
}

/**
 * Determina il profilo utente in base al punteggio totale (conoscenza + stile di vita).
 * @returns {{ id: string, icon: string, title: string, desc: string, range: [number, number] }}
 */
export function getProfile() {
  const total = state.knowledgeScore + state.lifestyleScore;
  return PROFILES.find(p => total >= p.range[0] && total <= p.range[1]) || PROFILES[0];
}

/**
 * Calcola la crescita con interesse composto dato un versamento mensile fisso.
 * Restituisce 0 se il versamento è <= 0.
 *
 * @param {number} pmt - Versamento mensile in euro
 * @param {number} years - Orizzonte temporale in anni
 * @param {number} annualRate - Tasso annuo in decimale (es. 0.05 per 5%)
 * @returns {number} Montante accumulato in euro
 */
export function compoundGrowth(pmt, years, annualRate) {
  if (pmt <= 0) return 0;
  const r = annualRate / 12;
  const n = years * 12;
  if (r === 0) return pmt * n;
  return pmt * ((Math.pow(1 + r, n) - 1) / r);
}

/**
 * Calcola la rata mensile di un mutuo con ammortamento alla francese.
 *
 * @param {number} importo - Capitale finanziato in euro
 * @param {number} tassoAnnuo - Tasso nominale annuo in percentuale (es. 3.5)
 * @param {number} durataAnni - Durata del mutuo in anni
 * @returns {number} Rata mensile in euro
 */
export function calcolaRata(importo, tassoAnnuo, durataAnni) {
  const r = tassoAnnuo / 100 / 12;
  const n = durataAnni * 12;
  if (r === 0) return importo / n;
  return importo * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

/**
 * Calcola l'importo massimo finanziabile dato un limite di rata mensile.
 *
 * @param {number} rataMax - Rata mensile massima sostenibile in euro
 * @param {number} tassoAnnuo - Tasso nominale annuo in percentuale (es. 3.5)
 * @param {number} durataAnni - Durata del mutuo in anni
 * @returns {number} Importo massimo finanziabile in euro
 */
export function calcolaImportoMax(rataMax, tassoAnnuo, durataAnni) {
  const r = tassoAnnuo / 100 / 12;
  const n = durataAnni * 12;
  if (r === 0) return rataMax * n;
  return rataMax * (Math.pow(1 + r, n) - 1) / (r * Math.pow(1 + r, n));
}
