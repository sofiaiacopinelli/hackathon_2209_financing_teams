/**
 * FinanzaFacile — Server
 * ======================
 * Entry point del server Express locale.
 * La logica delle route vive in `routes.js`; la logica degli agenti in `agents/`.
 *
 * Avvio:
 *   cd app/server && npm start
 *
 * Struttura:
 *   routes.js            — handler HTTP (GET /health, POST /analyze, ecc.)
 *   ../../agents/        — agenti specializzati (financial-analyzer, mortgage-advisor, ecc.)
 *   skills/              — skill pure (evaluate_quiz, analyze_expenses, ecc.)
 */

import express            from 'express';
import cors               from 'cors';
import { fileURLToPath }  from 'url';
import { dirname, join }  from 'path';
import { registerRoutes } from './routes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app       = express();

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '..')));

registerRoutes(app);

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log('\n=== FinanzaFacile Server ===');
  console.log(`  http://localhost:${PORT}`);
  console.log('  Backend: claude CLI (no API key needed)');
  console.log('  Endpoint: GET /health  POST /analyze  POST /mortgage-offer  POST /suggest-expenses  POST /quiz-feedback  POST /dispatch\n');
});
