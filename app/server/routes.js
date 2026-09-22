/**
 * @module routes
 * Definizione delle route Express per il server FinanzaFacile.
 *
 * Ogni handler riceve la request, la delega all'orchestratore degli agenti
 * e restituisce il risultato come JSON.
 *
 * Route disponibili:
 *   GET  /health            — healthcheck (agents: 7)
 *   POST /analyze           — analisi finanziaria completa
 *   POST /mortgage-offer    — valutazione preventivo mutuo
 *   POST /suggest-expenses  — stima spese mensili (risposta JSON)
 *   POST /quiz-feedback     — feedback personalizzato su risposta quiz
 *   POST /tip-detail        — approfondimento AI su concetto finanziario
 *   POST /mortgage-coach    — piano AI miglioramento situazione per mutuo
 *   POST /dispatch          — routing automatico (task_type: 'auto' o noto)
 */

import { dispatch } from '../../agents/orchestrator.js';

/**
 * Registra tutte le route sull'istanza Express ricevuta.
 * @param {import('express').Application} app - Istanza Express.
 */
export function registerRoutes(app) {

  app.get('/health', (_req, res) => {
    res.json({ ok: true, backend: 'claude-cli', agents: 7 });
  });

  app.post('/analyze', async (req, res) => {
    console.log('\n[/analyze] richiesta ricevuta');
    try {
      const analysis = await dispatch('analyze', req.body);
      res.json({ ok: true, analysis });
    } catch (err) {
      console.error('[/analyze] errore:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/mortgage-offer', async (req, res) => {
    console.log('\n[/mortgage-offer] richiesta ricevuta');
    try {
      const analysis = await dispatch('mortgage-offer', req.body);
      res.json({ ok: true, analysis });
    } catch (err) {
      console.error('[/mortgage-offer] errore:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/suggest-expenses', async (req, res) => {
    console.log('\n[/suggest-expenses] richiesta ricevuta');
    try {
      const expenses = await dispatch('suggest-expenses', req.body);
      res.json({ ok: true, expenses });
    } catch (err) {
      console.error('[/suggest-expenses] errore:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/quiz-feedback', async (req, res) => {
    console.log('\n[/quiz-feedback] richiesta ricevuta');
    try {
      const feedback = await dispatch('quiz-feedback', req.body);
      res.json({ ok: true, feedback });
    } catch (err) {
      console.error('[/quiz-feedback] errore:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/mortgage-coach', async (req, res) => {
    console.log(`\n[/mortgage-coach] status="${req.body.status}" level="${req.body.level}"`);
    try {
      const advice = await dispatch('mortgage-coach', req.body);
      res.json({ ok: true, advice });
    } catch (err) {
      console.error('[/mortgage-coach] errore:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/mortgage-compare', async (req, res) => {
    console.log('\n[/mortgage-compare] richiesta ricevuta');
    try {
      const comparison = await dispatch('mortgage-compare', req.body);
      res.json({ ok: true, comparison });
    } catch (err) {
      console.error('[/mortgage-compare] errore:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  app.post('/tip-detail', async (req, res) => {
    console.log(`\n[/tip-detail] topic="${req.body.topic}" level="${req.body.level}"`);
    try {
      const detail = await dispatch('tip-detail', req.body);
      res.json({ ok: true, detail });
    } catch (err) {
      console.error('[/tip-detail] errore:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

  // Route generica per routing automatico o test senza conoscere il task type
  app.post('/dispatch', async (req, res) => {
    const { task_type = 'auto', ...data } = req.body;
    console.log(`\n[/dispatch] task_type="${task_type}"`);
    try {
      const result = await dispatch(task_type, data);
      res.json({ ok: true, result });
    } catch (err) {
      console.error('[/dispatch] errore:', err.message);
      res.status(500).json({ ok: false, error: err.message });
    }
  });

}
