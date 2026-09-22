/**
 * FinanzaFacile — Local Node Server
 * ===================================
 * Agentic loop: riceve i dati utente dal browser, chiama Claude con tool use,
 * esegue le skill localmente, restituisce l'analisi finale.
 *
 * Avvio (dal terminale di Claude Code — API key già disponibile nell'ambiente):
 *   cd server && npm install && npm start
 *
 * Il browser chiama:
 *   POST http://localhost:3000/analyze         ← analisi completa
 *   POST http://localhost:3000/mortgage-offer  ← valutazione preventivo
 *   GET  http://localhost:3000/health          ← health check
 */

import Anthropic             from '@anthropic-ai/sdk';
import express               from 'express';
import cors                  from 'cors';
import { fileURLToPath }     from 'url';
import { dirname, join }     from 'path';
import { runSkill, setMarketRates } from './skills.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Legge ANTHROPIC_API_KEY dall'ambiente (iniettata da Claude Code o da .env)
if (!process.env.ANTHROPIC_API_KEY) {
  console.warn('⚠  ANTHROPIC_API_KEY non trovata. Avvia il server dal terminale di Claude Code.');
}

const client = new Anthropic();   // usa ANTHROPIC_API_KEY dall'ambiente
const app    = express();

app.use(cors());
app.use(express.json());

// Serve l'app statica da app/ (cartella padre del server)
app.use(express.static(join(__dirname, '..')));

// ── Tool schema (esposto a Claude) ───────────────────────────
const TOOLS = [
  {
    name: 'evaluate_quiz',
    description: 'Determina il livello finanziario e le aree di debolezza dai punteggi del quiz.',
    input_schema: {
      type: 'object',
      properties: {
        knowledge_score: { type: 'integer', description: 'Risposte corrette alle domande knowledge (0-5)' },
        lifestyle_score: { type: 'integer', description: 'Punteggio abitudini finanziarie (0-6)' },
      },
      required: ['knowledge_score', 'lifestyle_score'],
    },
  },
  {
    name: 'analyze_expenses',
    description: 'Analizza il breakdown mensile delle spese, calcola il risparmio netto e identifica categorie anomale.',
    input_schema: {
      type: 'object',
      properties: {
        income:   { type: 'number', description: 'Entrate mensili nette in euro' },
        expenses: { type: 'object', description: 'Oggetto categoria→importo (es. {"affitto": 800})' },
      },
      required: ['income', 'expenses'],
    },
  },
  {
    name: 'run_simulation',
    description: 'Simula la crescita del capitale a 5/10/20 anni in 3 scenari (0%, 2%, 5% annuo).',
    input_schema: {
      type: 'object',
      properties: {
        monthly_savings: { type: 'number', description: 'Risparmio mensile disponibile in euro' },
      },
      required: ['monthly_savings'],
    },
  },
  {
    name: 'get_tips',
    description: 'Restituisce consigli finanziari contestuali per livello e area di focus.',
    input_schema: {
      type: 'object',
      properties: {
        level:       { type: 'string', enum: ['principiante', 'intermedio', 'esperto'] },
        focus_areas: { type: 'array', items: { type: 'string' }, description: 'Aree prioritarie' },
      },
      required: ['level', 'focus_areas'],
    },
  },
  {
    name: 'propose_mortgage',
    description: 'Calcola la sostenibilità del mutuo e la tabella degli importi per durata.',
    input_schema: {
      type: 'object',
      properties: {
        income:          { type: 'number', description: 'Entrate mensili nette' },
        monthly_savings: { type: 'number', description: 'Risparmio mensile disponibile' },
      },
      required: ['income', 'monthly_savings'],
    },
  },
  {
    name: 'evaluate_mortgage_offer',
    description: 'Valuta un preventivo bancario con semafori su sostenibilità rata, LTV e tasso.',
    input_schema: {
      type: 'object',
      properties: {
        income:           { type: 'number' },
        amount:           { type: 'number' },
        property_value:   { type: 'number' },
        duration_years:   { type: 'integer' },
        rate:             { type: 'number' },
        taeg:             { type: 'number' },
        declared_payment: { type: 'number' },
        fees:             { type: 'number' },
        rate_type:        { type: 'string', enum: ['fisso', 'variabile', 'misto'] },
      },
      required: ['income', 'amount', 'duration_years', 'rate'],
    },
  },
];

// ── System prompt ─────────────────────────────────────────────
const SYSTEM_ANALYZE = `Sei un consulente finanziario personale, empatico e data-driven.
Ricevi il profilo di un utente con bassa o media conoscenza finanziaria.
Usa i tool a disposizione per raccogliere tutti i dati necessari, poi scrivi un report.

Processo consigliato:
1. evaluate_quiz        — determina livello e aree di debolezza
2. analyze_expenses     — calcola risparmio netto e anomalie
3. run_simulation       — proietta la crescita nel tempo (se c'è risparmio)
4. get_tips             — recupera consigli pertinenti per le aree deboli
5. propose_mortgage     — calcola sostenibilità mutuo (solo se l'utente è interessato)
6. Sintetizza in un report chiaro, incoraggiante, max 300 parole

Tono: semplice, concreto, positivo. Zero gergo tecnico non spiegato.
Adatta il linguaggio al livello rilevato dal tool evaluate_quiz.`;

const SYSTEM_MORTGAGE = `Sei un consulente esperto in mutui italiani.
Usa evaluate_mortgage_offer per analizzare il preventivo, poi dai un parere chiaro.
Max 200 parole. Sii diretto e pratico. Adatta il linguaggio al livello indicato.`;

// ── Agentic loop ──────────────────────────────────────────────
async function runAgent(systemPrompt, userMessage) {
  const messages = [{ role: 'user', content: userMessage }];

  while (true) {
    const res = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system:     systemPrompt,
      tools:      TOOLS,
      messages,
    });

    if (res.stop_reason === 'end_turn') {
      return res.content.find(b => b.type === 'text')?.text ?? '';
    }

    if (res.stop_reason === 'tool_use') {
      messages.push({ role: 'assistant', content: res.content });

      const results = res.content
        .filter(b => b.type === 'tool_use')
        .map(b => {
          const result = runSkill(b.name, b.input);
          console.log(`  → ${b.name}(${JSON.stringify(b.input).slice(0, 80)}…)`);
          return { type: 'tool_result', tool_use_id: b.id, content: JSON.stringify(result) };
        });

      messages.push({ role: 'user', content: results });
    } else {
      break;
    }
  }

  return 'Analisi non completata.';
}

// ── Helper: build user message ────────────────────────────────
function buildAnalyzeMessage(d) {
  const lines = [
    'Analizza la situazione finanziaria di questo utente:',
    '',
    `Quiz — conoscenza: ${d.knowledge_score ?? 0}/5, abitudini: ${d.lifestyle_score ?? 0}/6`,
    `Economia — entrate: €${d.income ?? 0}, spese: ${JSON.stringify(d.expenses ?? {})}`,
  ];
  if (d.lifestyle_context && Object.keys(d.lifestyle_context).length) {
    lines.push(`Contesto vita: ${JSON.stringify(d.lifestyle_context)}`);
  }
  if (d.mortgage_interest) lines.push('Obiettivo: acquisto casa con mutuo');
  if (d.market_data)       lines.push(`Dati di mercato live: ${d.market_data}`);
  lines.push('', 'Produci un\'analisi personalizzata completa.');
  return lines.join('\n');
}

function buildMortgageMessage(d) {
  return `Valuta questo preventivo per un utente livello "${d.level ?? 'principiante'}":
Reddito: €${d.income} | Surplus mensile: €${d.monthly_savings ?? 0}
Importo: €${d.amount} | Valore immobile: €${d.property_value ?? 0}
Durata: ${d.duration_years} anni | Tipo: ${d.rate_type ?? 'fisso'}
Tasso nominale: ${d.rate}% | TAEG: ${d.taeg ?? '—'}%
Rata dichiarata: €${d.declared_payment ?? '—'} | Spese iniziali: €${d.fees ?? 0}
Dai un parere onesto e pratico.`;
}

// ── Routes ────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ ok: true, model: 'claude-haiku-4-5-20251001', skills: 6 });
});

app.post('/analyze', async (req, res) => {
  console.log('\n[/analyze] nuova richiesta');
  if (req.body.market_rates) setMarketRates(req.body.market_rates);
  try {
    const analysis = await runAgent(SYSTEM_ANALYZE, buildAnalyzeMessage(req.body));
    res.json({ ok: true, analysis });
  } catch (err) {
    console.error('[/analyze] errore:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/mortgage-offer', async (req, res) => {
  console.log('\n[/mortgage-offer] nuova richiesta');
  if (req.body.market_rates) setMarketRates(req.body.market_rates);
  try {
    const analysis = await runAgent(SYSTEM_MORTGAGE, buildMortgageMessage(req.body));
    res.json({ ok: true, analysis });
  } catch (err) {
    console.error('[/mortgage-offer] errore:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Chiamata one-shot (no tool loop): stima spese personalizzata dal profilo quiz
app.post('/suggest-expenses', async (req, res) => {
  console.log('\n[/suggest-expenses] nuova richiesta');
  try {
    const d = req.body;
    const prompt = `Sei un consulente finanziario italiano. Stima spese mensili realistiche per questo profilo.

PROFILO: ${d.level ?? 'principiante'} — reddito €${d.income ?? 0}/mese
STILE DI VITA (dal quiz): ${d.lifestyle_context ? JSON.stringify(d.lifestyle_context) : '—'}
VALORI GIÀ INSERITI (preservali esattamente): ${d.already_filled ? JSON.stringify(d.already_filled) : '{}'}

Rispondi SOLO con un oggetto JSON valido, zero testo extra:
{"affitto":0,"spesa":0,"ristoranti":0,"trasporti":0,"bollette":0,"abbonamenti":0,"shopping":0,"salute":0,"svago":0,"altro":0}`;

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 250,
      messages: [{ role: 'user', content: prompt }],
    });
    const raw = msg.content[0]?.text?.trim() ?? '{}';
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Risposta AI non riconosciuta');
    res.json({ ok: true, expenses: JSON.parse(match[0]) });
  } catch (err) {
    console.error('[/suggest-expenses] errore:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  const hasKey = !!process.env.ANTHROPIC_API_KEY;
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║   FinanzaFacile — Local Server           ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`\n  http://localhost:${PORT}`);
  console.log(`  API key: ${hasKey ? '✓  (ambiente Claude Code)' : '✗  mancante — avvia dal terminale Claude Code'}`);
  console.log('\n  Endpoint:');
  console.log('    GET  /health');
  console.log('    POST /analyze');
  console.log('    POST /mortgage-offer\n');
});
