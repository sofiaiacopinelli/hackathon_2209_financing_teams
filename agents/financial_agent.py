"""
FinanzaFacile — Agente AI di analisi finanziaria
Usa Claude (Anthropic) per generare un'analisi personalizzata
basata sul profilo e le spese dell'utente.

Utilizzo:
    python financial_agent.py --key sk-ant-XXX --profile principiante \
        --knowledge 1 --lifestyle 2 --income 1800 --savings 150

Oppure passando i dati via JSON:
    python financial_agent.py --key sk-ant-XXX --json '{"profile": "principiante", ...}'
"""

import argparse
import json
import sys

try:
    import anthropic
except ImportError:
    print("Installa il package: pip install anthropic")
    sys.exit(1)


def build_prompt(data: dict) -> str:
    income   = data.get("income", 0)
    expenses = data.get("total_expenses", 0)
    savings  = income - expenses
    level    = data.get("level", "principiante")
    profile  = data.get("profile_title", "Esploratore Finanziario")
    k_score  = data.get("knowledge_score", 0)
    l_score  = data.get("lifestyle_score", 0)
    exp_detail = data.get("expenses_detail", {})

    expense_lines = "\n".join(
        f"  - {k}: €{v:.0f}" for k, v in exp_detail.items() if v > 0
    ) or "  (nessun dettaglio disponibile)"

    return f"""Sei un consulente finanziario che parla in modo semplice e diretto con persone comuni.

L'utente ha completato un questionario sulla sua situazione finanziaria. Ecco i dati:

PROFILO: {profile} (livello: {level})
- Conoscenza finanziaria: {k_score}/3
- Gestione denaro: {l_score}/6

SITUAZIONE ECONOMICA MENSILE:
- Entrate nette: €{income:.0f}
- Uscite totali: €{expenses:.0f}
- Risparmio mensile: €{savings:.0f}

DETTAGLIO SPESE PRINCIPALI:
{expense_lines}

Fornisci un'analisi personalizzata di massimo 200 parole che:
1. Valuti la situazione dell'utente con tono positivo e incoraggiante
2. Evidenzi 1-2 punti di forza concreti
3. Suggerisca 1-2 aree di miglioramento con numeri specifici
4. Concluda con un messaggio motivante

Usa linguaggio semplice, adatto al livello "{level}". Niente gergo tecnico eccessivo. Sii diretto e pratico.
"""


def analyze(api_key: str, data: dict) -> str:
    client = anthropic.Anthropic(api_key=api_key)

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=400,
        messages=[{"role": "user", "content": build_prompt(data)}]
    )

    return message.content[0].text


def main():
    parser = argparse.ArgumentParser(description="FinanzaFacile AI Agent")
    parser.add_argument("--key",       required=True, help="Claude API key")
    parser.add_argument("--json",      help="Dati utente in formato JSON string")
    parser.add_argument("--income",    type=float, default=0)
    parser.add_argument("--expenses",  type=float, default=0)
    parser.add_argument("--savings",   type=float, default=0)
    parser.add_argument("--level",     default="principiante")
    parser.add_argument("--profile",   default="Esploratore Finanziario")
    parser.add_argument("--knowledge", type=int, default=0)
    parser.add_argument("--lifestyle", type=int, default=0)
    args = parser.parse_args()

    if args.json:
        data = json.loads(args.json)
    else:
        data = {
            "income": args.income,
            "total_expenses": args.expenses,
            "level": args.level,
            "profile_title": args.profile,
            "knowledge_score": args.knowledge,
            "lifestyle_score": args.lifestyle,
            "expenses_detail": {}
        }

    result = analyze(args.key, data)
    print("\n── Analisi AI ──────────────────────────────────────────────\n")
    print(result)
    print("\n────────────────────────────────────────────────────────────\n")


if __name__ == "__main__":
    main()
