/**
 * FinanzaFacile — Local Node Server
 * ===================================
 * Server HTTP che delega tutta la logica di analisi all'orchestratore.
 * La costruzione dei prompt e la chiamata a Claude Code vivono in `agents/`.
 *
 * Avvio:
 *   cd app/server && npm start
 *
 * Endpoint:
 *   GET  /health
 *   POST /analyze
 *   POST /mortgage-offer
 *   POST /suggest-expenses
 *   POST /quiz-feedback
 *   POST /dispatch          ← routing automatico (task_type: 'auto' o noto)
 */

import express          from 'express';
import cors             from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { dispatch }     from '../../agents/orchestrator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '..')));

// ── Salute ────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ ok: true, backend: 'claude-cli', skills: 6 });
});

// ── Analisi finanziaria completa ──────────────────────────────
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

// ── Valutazione preventivo mutuo ──────────────────────────────
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

// ── Suggerimento spese mensili ────────────────────────────────
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

// ── Feedback quiz ─────────────────────────────────────────────
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

// ── Dispatch generico (routing automatico o esplicito) ────────
// Accetta { task_type: 'auto' | 'analyze' | ..., ...dati }
// Utile per demo e test senza conoscere a priori il tipo di task.
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

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log('\n=== FinanzaFacile Server ===');
  console.log(`  http://localhost:${PORT}`);
  console.log('  Backend: claude CLI (no API key needed)');
  console.log('  Endpoint: GET /health  POST /analyze  POST /mortgage-offer  POST /suggest-expenses  POST /quiz-feedback  POST /dispatch\n');
});
