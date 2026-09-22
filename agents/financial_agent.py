"""
FinanzaFacile — Agentic Financial Advisor
==========================================
Flusso agentico con tool use (Anthropic SDK).

Claude riceve il profilo utente e decide autonomamente quali tool chiamare:
  1. valuta_profilo      — determina livello e punti deboli
  2. analizza_spese      — identifica categorie anomale
  3. calcola_simulazione — proietta la crescita nel tempo
  4. ottieni_consigli    — seleziona i tip pertinenti

Il loop continua finché Claude non ha abbastanza contesto per
produrre il report finale — senza che il developer decida l'ordine.

Installazione:
    pip install anthropic

Utilizzo:
    python financial_agent.py --key sk-ant-XXX

Oppure con dati custom:
    python financial_agent.py --key sk-ant-XXX --data '{"income":1800,...}'
"""

import argparse
import json
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

try:
    import anthropic
except ImportError:
    print("Errore: installa il package con  pip install anthropic")
    sys.exit(1)

from skill_router import run_skill


# ─────────────────────────────────────────────────────────────
# TOOL DEFINITIONS  (schema esposto a Claude)
# ─────────────────────────────────────────────────────────────

TOOLS = [
    {
        "name": "valuta_profilo",
        "description": (
            "Determina il livello finanziario dell'utente (principiante / intermedio / esperto) "
            "e identifica le sue aree di debolezza in base ai punteggi del quiz."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "punteggio_conoscenza": {
                    "type": "integer",
                    "description": "Risposte corrette alle domande di conoscenza finanziaria (0-3)"
                },
                "punteggio_lifestyle": {
                    "type": "integer",
                    "description": "Punteggio abitudini finanziarie (0-6)"
                }
            },
            "required": ["punteggio_conoscenza", "punteggio_lifestyle"]
        }
    },
    {
        "name": "analizza_spese",
        "description": (
            "Analizza il breakdown mensile delle spese, calcola il risparmio netto "
            "e identifica le categorie anomale o ottimizzabili rispetto alle entrate."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "entrate": {
                    "type": "number",
                    "description": "Entrate mensili nette in euro"
                },
                "spese": {
                    "type": "object",
                    "description": "Dizionario categoria→importo (es. {\"affitto\": 800, \"spesa\": 300})"
                }
            },
            "required": ["entrate", "spese"]
        }
    },
    {
        "name": "calcola_simulazione",
        "description": (
            "Simula la crescita del capitale con interesse composto e versamenti mensili costanti. "
            "Restituisce i valori proiettati a 5, 10 e 20 anni per tre scenari: "
            "risparmio puro (0%), conto deposito (2%), investimento moderato (5%)."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "versamento_mensile": {
                    "type": "number",
                    "description": "Importo risparmiato ogni mese in euro"
                }
            },
            "required": ["versamento_mensile"]
        }
    },
    {
        "name": "ottieni_consigli",
        "description": (
            "Restituisce i consigli finanziari più rilevanti per il profilo e le aree di debolezza "
            "identificate. Adatta il linguaggio al livello dell'utente."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "livello": {
                    "type": "string",
                    "enum": ["principiante", "intermedio", "esperto"]
                },
                "aree_focus": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "Aree prioritarie (es. [\"risparmio\", \"debiti\", \"investimenti\", \"budget\"])"
                }
            },
            "required": ["livello", "aree_focus"]
        }
    },
    {
        "name": "valuta_mutuo",
        "description": (
            "Calcola la sostenibilità di un mutuo in base al reddito e al risparmio mensile. "
            "Restituisce lo status di affordability e la tabella degli importi massimi per durata."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "entrate": {
                    "type": "number",
                    "description": "Entrate mensili nette in euro"
                },
                "risparmio_mensile": {
                    "type": "number",
                    "description": "Risparmio mensile disponibile in euro"
                }
            },
            "required": ["entrate", "risparmio_mensile"]
        }
    },
    {
        "name": "valuta_preventivo",
        "description": (
            "Valuta un preventivo bancario di mutuo con semafori su: sostenibilità rata, "
            "LTV (Loan To Value) e competitività del tasso rispetto al mercato."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "entrate":          {"type": "number", "description": "Entrate mensili nette"},
                "importo":          {"type": "number", "description": "Importo del mutuo richiesto"},
                "valore_immobile":  {"type": "number", "description": "Valore dell'immobile (per LTV)"},
                "durata_anni":      {"type": "integer", "description": "Durata del mutuo in anni"},
                "tasso":            {"type": "number", "description": "Tasso nominale annuo (%)"},
                "taeg":             {"type": "number", "description": "TAEG dichiarato (%)"},
                "rata_dichiarata":  {"type": "number", "description": "Rata mensile dichiarata dalla banca"},
                "spese_iniziali":   {"type": "number", "description": "Spese iniziali totali (istruttoria, perizia ecc.)"},
                "tipo_tasso":       {"type": "string", "enum": ["fisso", "variabile", "misto"]}
            },
            "required": ["entrate", "importo", "durata_anni", "tasso"]
        }
    }
]


# ─────────────────────────────────────────────────────────────
# TOOL ROUTER  (delega alle skill via skill_router)
# ─────────────────────────────────────────────────────────────

# Mappa: nome tool Claude → (skill_task, fn di traduzione parametri)
_TOOL_MAP = {
    "valuta_profilo": (
        "evaluate_quiz",
        lambda i: {"knowledge_score": i["punteggio_conoscenza"],
                   "lifestyle_score": i["punteggio_lifestyle"]},
    ),
    "analizza_spese": (
        "analyze_expenses",
        lambda i: {"income": i["entrate"], "expenses": i["spese"]},
    ),
    "calcola_simulazione": (
        "run_simulation",
        lambda i: {"monthly_savings": i["versamento_mensile"]},
    ),
    "ottieni_consigli": (
        "get_tips",
        lambda i: {"level": i["livello"], "focus_areas": i["aree_focus"]},
    ),
    "valuta_mutuo": (
        "propose_mortgage",
        lambda i: {"income": i["entrate"], "monthly_savings": i["risparmio_mensile"]},
    ),
    "valuta_preventivo": (
        "evaluate_mortgage_offer",
        lambda i: {
            "income":            i["entrate"],
            "amount":            i["importo"],
            "property_value":    i.get("valore_immobile", 0),
            "duration_years":    i["durata_anni"],
            "rate":              i["tasso"],
            "taeg":              i.get("taeg", 0),
            "declared_payment":  i.get("rata_dichiarata", 0),
            "fees":              i.get("spese_iniziali", 0),
            "rate_type":         i.get("tipo_tasso", "fisso"),
        },
    ),
}


def execute_tool(name: str, inputs: dict) -> dict:
    entry = _TOOL_MAP.get(name)
    if not entry:
        return {"errore": f"Tool sconosciuto: {name}"}
    task, translate = entry
    return run_skill(task, translate(inputs))


# ─────────────────────────────────────────────────────────────
# AGENTIC LOOP
# ─────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """Sei un consulente finanziario personale che usa un approccio data-driven.

Ricevi il profilo di un utente con bassa o media conoscenza finanziaria e devi produrre
un'analisi personalizzata usando i tool a tua disposizione.

Processo consigliato:
1. Valuta il profilo dell'utente (valuta_profilo)
2. Analizza le spese e calcola il risparmio (analizza_spese)
3. Se c'è risparmio positivo, simula la crescita nel tempo (calcola_simulazione)
4. Recupera i consigli più pertinenti per le sue aree di debolezza (ottieni_consigli)
5. Se l'utente è interessato al mutuo, calcola la sostenibilità (valuta_mutuo)
6. Se l'utente ha già un preventivo, valutalo con i semafori (valuta_preventivo)
7. Sintetizza tutto in un report chiaro, diretto e incoraggiante (max 300 parole)

Il tono deve essere: semplice, concreto, positivo. Zero gergo tecnico non spiegato.
Adatta il linguaggio al livello rilevato dal tool valuta_profilo."""


def run_agent(user_data: dict, api_key: str, verbose: bool = False) -> str:
    client = anthropic.Anthropic(api_key=api_key)

    initial_message = (
        f"Analizza la situazione finanziaria di questo utente:\n\n"
        f"Quiz:\n"
        f"  - Risposte corrette (conoscenza): {user_data.get('knowledge_score', 0)}/3\n"
        f"  - Punteggio abitudini: {user_data.get('lifestyle_score', 0)}/6\n\n"
        f"Economia mensile:\n"
        f"  - Entrate nette: €{user_data.get('income', 0):.0f}\n"
        f"  - Spese dettagliate: {json.dumps(user_data.get('expenses', {}), ensure_ascii=False)}\n\n"
        f"Produci un'analisi personalizzata completa."
    )

    messages = [{"role": "user", "content": initial_message}]
    step = 0

    while True:
        step += 1
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages
        )

        if verbose:
            print(f"\n── Step {step} | stop_reason: {response.stop_reason} ──")

        # Claude ha finito — estrai il testo finale
        if response.stop_reason == "end_turn":
            for block in response.content:
                if hasattr(block, "text"):
                    return block.text
            return "(nessuna risposta testuale)"

        # Claude vuole usare uno o più tool
        if response.stop_reason == "tool_use":
            messages.append({"role": "assistant", "content": response.content})

            tool_results = []
            for block in response.content:
                if block.type != "tool_use":
                    continue

                if verbose:
                    print(f"   → Tool: {block.name}({json.dumps(block.input, ensure_ascii=False)})")

                result = execute_tool(block.name, block.input)

                if verbose:
                    print(f"   ← Risultato: {json.dumps(result, ensure_ascii=False)[:200]}…")

                tool_results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": json.dumps(result, ensure_ascii=False)
                })

            messages.append({"role": "user", "content": tool_results})
            continue

        # stop_reason inatteso
        break

    return "Analisi non completata."


# ─────────────────────────────────────────────────────────────
# DEMO DATA  (usata se non si passa --data)
# ─────────────────────────────────────────────────────────────

DEMO_USER = {
    "knowledge_score": 1,
    "lifestyle_score": 2,
    "income": 1800,
    "expenses": {
        "affitto":    750,
        "spesa":      280,
        "ristoranti": 200,
        "trasporti":  100,
        "bollette":   130,
        "abbonamenti": 60,
        "shopping":   150,
        "salute":      30,
        "svago":       80,
        "altro":       50
    }
}


# ─────────────────────────────────────────────────────────────
# ENTRYPOINT
# ─────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="FinanzaFacile — Agentic Financial Advisor")
    parser.add_argument("--key",     required=True, help="Claude API key (sk-ant-…)")
    parser.add_argument("--data",    help="Dati utente in JSON string (opzionale, default: dati demo)")
    parser.add_argument("--verbose", action="store_true", help="Mostra i tool call intermedi")
    args = parser.parse_args()

    user_data = json.loads(args.data) if args.data else DEMO_USER

    print("\n╔══════════════════════════════════════════════════════════╗")
    print("║   FinanzaFacile — Analisi Agentica                       ║")
    print("╚══════════════════════════════════════════════════════════╝")
    print(f"\nUtente: entrate €{user_data.get('income', 0):.0f} | "
          f"conoscenza {user_data.get('knowledge_score', 0)}/3 | "
          f"abitudini {user_data.get('lifestyle_score', 0)}/6\n")

    if args.verbose:
        print("── Flusso agentico ─────────────────────────────────────────")

    result = run_agent(user_data, args.key, verbose=args.verbose)

    print("\n── Analisi ─────────────────────────────────────────────────\n")
    print(result)
    print("\n────────────────────────────────────────────────────────────\n")


if __name__ == "__main__":
    main()
