/**
 * FinanzaFacile — Local Node Server
 * ===================================
 * Chiama `claude --print` come subprocess: nessuna API key necessaria,
 * usa l'autenticazione di Claude Code gia' presente sul PC.
 *
 * Avvio:
 *   cd app/server && npm start
 *
 * Endpoint:
 *   GET  /health
 *   POST /analyze
 *   POST /mortgage-offer
 *   POST /suggest-expenses
 */

import { spawn }             from 'child_process';
import express               from 'express';
import cors                  from 'cors';
import { fileURLToPath }     from 'url';
import { dirname, join }     from 'path';
import { runSkill, setMarketRates } from './skills.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

// ── Istruzioni di stile per livello ─────────────────────────
const LEVEL_STYLE = {
  principiante: `
REGOLE DI LINGUAGGIO (livello principiante — priorità assoluta):
- Usa analogie della vita quotidiana (es. "come un salvadanaio", "come pagare l'affitto")
- Spiega ogni termine tecnico la prima volta che lo usi, tra parentesi (es. "TAEG (cioè il costo reale totale del prestito)")
- Frasi brevi. Un concetto per frase.
- Usa cifre concrete: "€200 al mese" invece di "un tasso di risparmio del 10%"
- Tono: amico che spiega, non esperto che valuta
- Evita: rendimento annualizzato, asset allocation, LTV, spread, Euribor (se li usi, spiegali)`,

  intermedio: `
REGOLE DI LINGUAGGIO (livello intermedio):
- Puoi usare TAEG, inflazione, rendimento, diversificazione senza spiegarli
- Spiega solo i concetti meno noti (es. LTV, PAC, ETF)
- Dai numeri concreti e percentuali
- Tono: consulente pragmatico
- Fai 1-2 confronti con situazioni reali o medie di mercato`,

  esperto: `
REGOLE DI LINGUAGGIO (livello esperto):
- Linguaggio tecnico diretto: LTV, TAEG, Euribor, spread, asset allocation, PAC, ETF
- Dati precisi con 1-2 decimali dove utile
- Confronta con benchmark di mercato
- Niente spiegazioni di base — l'utente le conosce già
- Tono: peer review tra professionisti`,
};

app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, '..')));

// ── Claude CLI subprocess ────────────────────────────────────
// Invia il prompt via stdin a `claude --print`, cattura stdout.
// Nessuna API key: usa l'autenticazione di Claude Code.
function callClaude(prompt) {
  return new Promise((resolve, reject) => {
    const isWin = process.platform === 'win32';

    const proc = spawn('claude', ['--print'], {
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: isWin,
    });

    proc.stdin.write(prompt, 'utf8');
    proc.stdin.end();

    let out = '', err = '';
    proc.stdout.on('data', d => { out += d; process.stdout.write('.'); });
    proc.stderr.on('data', d => { err += d; });

    proc.on('close', code => {
      process.stdout.write('\n');
      if (code === 0 && out.trim()) {
        resolve(out.trim());
      } else {
        reject(new Error(
          err.trim() ||
          `claude CLI ha restituito exit code ${code}. ` +
          `Assicurati che Claude Code sia installato e autenticato.`
        ));
      }
    });

    proc.on('error', e =>
      reject(new Error(`claude CLI non trovato: ${e.message}. Installa Claude Code.`))
    );
  });
}

// ── Skill runner locale ───────────────────────────────────────
function skill(name, input) {
  const result = runSkill(name, input);
  console.log(`  [skill] ${name}`);
  return result;
}

// ── /analyze ─────────────────────────────────────────────────
function buildAnalyzePrompt(d) {
  if (d.market_rates) setMarketRates(d.market_rates);

  const quiz   = skill('evaluate_quiz',   { knowledge_score: d.knowledge_score ?? 0, lifestyle_score: d.lifestyle_score ?? 0 });
  const exp    = skill('analyze_expenses', { income: d.income ?? 0, expenses: d.expenses ?? {} });
  const sim    = exp.monthly_savings > 0
    ? skill('run_simulation', { monthly_savings: exp.monthly_savings })
    : null;
  const tips   = skill('get_tips', { level: quiz.level, focus_areas: quiz.weak_areas });
  const mort   = d.mortgage_interest
    ? skill('propose_mortgage', { income: d.income ?? 0, monthly_savings: exp.monthly_savings })
    : null;

  const levelStyle = LEVEL_STYLE[quiz.level] || LEVEL_STYLE.principiante;
  const parts = [
    `Sei un consulente finanziario personale. Scrivi un'analisi in italiano, max 280 parole, tono positivo e concreto.`,
    levelStyle,
    '',
    `PROFILO UTENTE`,
    `- Livello: ${quiz.level} (score ${quiz.total_score}/${quiz.max_score})`,
    `- Aree di miglioramento: ${quiz.weak_areas.join(', ')}`,
    '',
    `SITUAZIONE ECONOMICA`,
    `- Entrate: €${exp.income}/mese`,
    `- Spese totali: €${exp.total_expenses}/mese`,
    `- Risparmio netto: €${exp.monthly_savings}/mese (${exp.savings_rate_pct}%)`,
    exp.anomalies.length ? `- Spese elevate: ${exp.anomalies.map(a => `${a.category} (${a.pct_of_income}% del reddito)`).join(', ')}` : '',
  ];

  if (sim) {
    parts.push('', 'PROIEZIONE RISPARMIO (investimento moderato 5%/anno)');
    parts.push(`- 5 anni: €${sim.scenarios.investimento_moderato['5yr'].toLocaleString('it-IT')}`);
    parts.push(`- 10 anni: €${sim.scenarios.investimento_moderato['10yr'].toLocaleString('it-IT')}`);
    parts.push(`- 20 anni: €${sim.scenarios.investimento_moderato['20yr'].toLocaleString('it-IT')}`);
    parts.push(`- Guadagno vs risparmio puro (10 anni): +€${sim.investment_gain_10yr.toLocaleString('it-IT')}`);
  }

  if (tips.tips.length) {
    parts.push('', 'CONSIGLI PERSONALIZZATI');
    tips.tips.forEach(t => parts.push(`- [${t.area}] ${t.tip}`));
  }

  if (mort) {
    parts.push('', 'FATTIBILITA\' MUTUO');
    parts.push(`- Stato: ${mort.status_label}`);
    parts.push(`- Rata max sostenibile: €${mort.max_rata_realistic}/mese`);
    if (mort.table_by_duration.length) {
      const best = mort.table_by_duration[mort.table_by_duration.length - 1];
      parts.push(`- Importo stimabile (${best.years} anni): €${best.max_amount.toLocaleString('it-IT')}`);
    }
  }

  if (d.market_data) parts.push('', d.market_data);

  parts.push('', 'Struttura: 1 frase di valutazione complessiva, 2 punti di forza, 2 aree di miglioramento con numeri, 1 messaggio motivante finale.');
  return parts.filter(l => l !== undefined).join('\n');
}

// ── /mortgage-offer ──────────────────────────────────────────
function buildMortgagePrompt(d) {
  if (d.market_rates) setMarketRates(d.market_rates);

  const eval_ = skill('evaluate_mortgage_offer', {
    income:           d.income,
    amount:           d.amount,
    property_value:   d.property_value ?? 0,
    duration_years:   d.duration_years,
    rate:             d.rate,
    taeg:             d.taeg ?? 0,
    declared_payment: d.declared_payment ?? 0,
    fees:             d.fees ?? 0,
    rate_type:        d.rate_type ?? 'fisso',
  });

  const levelStyle = LEVEL_STYLE[d.level] || LEVEL_STYLE.principiante;
  const parts = [
    `Sei un consulente mutui italiano. Esprimi un parere in italiano, max 200 parole.`,
    levelStyle,
    '',
    `PREVENTIVO ANALIZZATO`,
    `- Importo: €${d.amount} | Durata: ${d.duration_years} anni | Tipo: ${d.rate_type ?? 'fisso'}`,
    `- Tasso: ${d.rate}% | TAEG: ${d.taeg ?? '—'}%`,
    `- Rata dichiarata: €${d.declared_payment ?? '—'} | Rata calcolata: €${eval_.computed_payment}`,
    eval_.payment_delta !== null ? `- Delta rata: €${eval_.payment_delta > 0 ? '+' : ''}${eval_.payment_delta}` : '',
    '',
    `INDICATORI`,
    ...eval_.indicators.map(i => `- ${i.name}: ${i.value} → ${i.status.toUpperCase()} (${i.detail})`),
    '',
    `VALUTAZIONE COMPLESSIVA: ${eval_.overall_label}`,
  ];

  parts.push('', 'Dai: 1 giudizio sintetico, cosa è positivo, cosa negoziare, 1 consiglio pratico prima di firmare.');
  return parts.filter(l => l !== undefined).join('\n');
}

// ── /suggest-expenses ────────────────────────────────────────
function buildSuggestPrompt(d) {
  const filled = Object.entries(d.already_filled ?? {}).map(([k, v]) => `${k}: €${v}`).join(', ') || 'nessuno';

  const ctxLines = [];
  if (d.lifestyle_context && Object.keys(d.lifestyle_context).length) {
    Object.entries(d.lifestyle_context).forEach(([q, a]) => ctxLines.push(`  - ${q}: ${a}`));
  }
  if (d.lifestyle_answers?.length) {
    d.lifestyle_answers.forEach(({ question, answer }) => ctxLines.push(`  - ${question}: ${answer}`));
  }

  return [
    `Sei un consulente finanziario italiano. Stima le spese mensili realistiche per questo utente in base al suo profilo.`,
    `Profilo: ${d.level ?? 'principiante'}, reddito €${d.income ?? 0}/mese`,
    ctxLines.length ? `Risposte dal quiz:\n${ctxLines.join('\n')}` : '',
    `Valori gia' inseriti dall'utente (NON modificare): ${filled}`,
    ``,
    `Rispondi SOLO con JSON valido, senza testo aggiuntivo:`,
    `{"affitto":0,"spesa":0,"ristoranti":0,"trasporti":0,"bollette":0,"abbonamenti":0,"shopping":0,"salute":0,"svago":0,"altro":0}`,
  ].filter(Boolean).join('\n');
}

// ── Routes ────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ ok: true, backend: 'claude-cli', skills: 6 });
});

app.post('/analyze', async (req, res) => {
  console.log('\n[/analyze] richiesta ricevuta');
  try {
    const prompt   = buildAnalyzePrompt(req.body);
    const analysis = await callClaude(prompt);
    res.json({ ok: true, analysis });
  } catch (err) {
    console.error('[/analyze] errore:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/mortgage-offer', async (req, res) => {
  console.log('\n[/mortgage-offer] richiesta ricevuta');
  try {
    const prompt   = buildMortgagePrompt(req.body);
    const analysis = await callClaude(prompt);
    res.json({ ok: true, analysis });
  } catch (err) {
    console.error('[/mortgage-offer] errore:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/quiz-feedback', async (req, res) => {
  const { question, options, selected_idx, correct_idx, answer_type } = req.body;
  const selected = options?.[selected_idx] ?? '';
  const correct  = options?.[correct_idx]  ?? '';

  const level = req.body.level ?? 'principiante';
  const levelStyle = LEVEL_STYLE[level] || LEVEL_STYLE.principiante;

  const prompt = [
    `Sei un tutor di educazione finanziaria. Un utente ha risposto in modo ${answer_type === 'partial' ? 'parzialmente corretto' : 'errato'} a una domanda.`,
    levelStyle,
    ``,
    `Domanda: "${question}"`,
    `Risposta selezionata: "${selected}"`,
    `Risposta corretta: "${correct}"`,
    ``,
    `Scrivi una spiegazione in italiano di massimo 2 frasi: prima spiega perche' la risposta e' ${answer_type === 'partial' ? 'incompleta' : 'sbagliata'}, poi spiega cosa bisogna sapere. Tono incoraggiante.`,
  ].join('\n');

  try {
    const feedback = await callClaude(prompt);
    res.json({ ok: true, feedback });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/suggest-expenses', async (req, res) => {
  console.log('\n[/suggest-expenses] richiesta ricevuta');
  try {
    const prompt = buildSuggestPrompt(req.body);
    const raw    = await callClaude(prompt);
    const match  = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Risposta non parsabile come JSON');
    res.json({ ok: true, expenses: JSON.parse(match[0]) });
  } catch (err) {
    console.error('[/suggest-expenses] errore:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────
const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log('\n=== FinanzaFacile Server ===');
  console.log(`  http://localhost:${PORT}`);
  console.log('  Backend: claude CLI (no API key needed)');
  console.log('  Endpoint: GET /health  POST /analyze  POST /mortgage-offer  POST /suggest-expenses\n');
});
