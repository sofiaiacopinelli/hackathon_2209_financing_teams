/**
 * FinanzaFacile — Base Agent
 * ==========================
 * Funzioni condivise da tutti gli agenti:
 * - callClaude: spawn `claude --print` via stdin/stdout (nessuna API key)
 * - loadPrompt: carica un template .md dalla cartella prompts/ e sostituisce i placeholder {{NOME}}
 * - LEVEL_STYLE: istruzioni di stile per livello utente
 */

import { spawn }          from 'child_process';
import { readFileSync }   from 'fs';
import { fileURLToPath }  from 'url';
import { dirname, join }  from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Istruzioni di stile per livello ─────────────────────────────
export const LEVEL_STYLE = {
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

// ── Caricamento template prompt ──────────────────────────────────
// Legge il file `prompts/<name>.md` e sostituisce ogni {{PLACEHOLDER}} con il
// valore corrispondente nell'oggetto vars. I placeholder non trovati in vars
// vengono rimpiazzati con stringa vuota.
export function loadPrompt(name, vars = {}) {
  const template = readFileSync(join(__dirname, 'prompts', `${name}.md`), 'utf8');
  return Object.entries(vars).reduce(
    (t, [k, v]) => t.replaceAll(`{{${k}}}`, v ?? ''),
    template
  );
}

// ── Claude CLI subprocess ─────────────────────────────────────────
// Invia il prompt via stdin a `claude --print`, cattura stdout.
// Nessuna API key: usa l'autenticazione di Claude Code già presente sul PC.
export function callClaude(prompt) {
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
