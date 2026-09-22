"""
FinanzaFacile — Skill Router
=============================
Dispatcher centrale: mappa task names → skill functions.

Può essere usato:
  1. Dall'agentic loop (financial_agent.py) come backend dei tool Claude
  2. Direttamente da codice esterno (es. endpoint FastAPI, test unitari)
  3. Dalla CLI per testare singole skill in isolamento

Utilizzo:
    from skill_router import run_skill

    result = run_skill("evaluate_quiz",           {"knowledge_score": 2, "lifestyle_score": 4})
    result = run_skill("analyze_expenses",         {"income": 1800, "expenses": {...}})
    result = run_skill("run_simulation",           {"monthly_savings": 300})
    result = run_skill("get_tips",                 {"level": "intermedio", "focus_areas": ["investimenti"]})
    result = run_skill("propose_mortgage",         {"income": 2000, "monthly_savings": 400})
    result = run_skill("evaluate_mortgage_offer",  {"income": 2000, "amount": 150000, ...})
    result = run_skill("get_market_rates",         {})
    result = run_skill("suggest_expenses",         {"profile": {...}, "quiz_lifestyle": [...], "income": 1800, "already_filled": {}, "api_key": "sk-..."})
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "skills"))

from quiz_evaluator    import run             as _evaluate_quiz
from expense_analyzer  import run             as _analyze_expenses
from expense_analyzer  import run_simulation  as _run_simulation
from tip_generator     import run             as _get_tips
from mortgage_advisor  import run             as _propose_mortgage
from mortgage_advisor  import evaluate_offer  as _evaluate_mortgage_offer
from market_data       import fetch_rates     as _get_market_rates
from expense_suggestion import run            as _suggest_expenses


# ─────────────────────────────────────────────────────────────
# REGISTRY
# Each entry: fn (callable), desc (str), required (list[str])
# ─────────────────────────────────────────────────────────────

REGISTRY: dict = {
    "evaluate_quiz": {
        "fn": lambda d: _evaluate_quiz(
            knowledge_score=d["knowledge_score"],
            lifestyle_score=d["lifestyle_score"],
        ),
        "desc": "Valuta il profilo finanziario dell'utente dai punteggi del quiz",
        "required": ["knowledge_score", "lifestyle_score"],
    },
    "analyze_expenses": {
        "fn": lambda d: _analyze_expenses(
            income=d["income"],
            expenses=d["expenses"],
        ),
        "desc": "Analizza le spese mensili e identifica categorie anomale",
        "required": ["income", "expenses"],
    },
    "run_simulation": {
        "fn": lambda d: _run_simulation(
            monthly_savings=d["monthly_savings"],
        ),
        "desc": "Simula la crescita del capitale a 5/10/20 anni in 3 scenari",
        "required": ["monthly_savings"],
    },
    "get_tips": {
        "fn": lambda d: _get_tips(
            level=d["level"],
            focus_areas=d["focus_areas"],
        ),
        "desc": "Genera consigli finanziari contestuali per livello e area di focus",
        "required": ["level", "focus_areas"],
    },
    "propose_mortgage": {
        "fn": lambda d: _propose_mortgage(
            income=d["income"],
            monthly_savings=d["monthly_savings"],
        ),
        "desc": "Calcola sostenibilità e tabella importi/rate per durata del mutuo",
        "required": ["income", "monthly_savings"],
    },
    "evaluate_mortgage_offer": {
        "fn": lambda d: _evaluate_mortgage_offer(
            income=d["income"],
            amount=d["amount"],
            property_value=d.get("property_value", 0),
            duration_years=d["duration_years"],
            rate=d["rate"],
            taeg=d.get("taeg", 0),
            declared_payment=d.get("declared_payment", 0),
            fees=d.get("fees", 0),
            rate_type=d.get("rate_type", "fisso"),
        ),
        "desc": "Valuta un preventivo bancario: semafori su rata, LTV, competitività tasso",
        "required": ["income", "amount", "duration_years", "rate"],
    },
    "get_market_rates": {
        "fn": lambda _: _get_market_rates(),
        "desc": "Recupera tassi mutui IT e tasso BCE in tempo reale da BCE SDMX API",
        "required": [],
    },
    "suggest_expenses": {
        "fn": lambda d: _suggest_expenses(
            profile=d["profile"],
            quiz_lifestyle=d.get("quiz_lifestyle", []),
            income=d.get("income", 0),
            already_filled=d.get("already_filled", {}),
            api_key=d["api_key"],
        ),
        "desc": "Suggerisce spese mensili personalizzate via Claude basandosi sul profilo quiz",
        "required": ["profile", "api_key"],
    },
}


# ─────────────────────────────────────────────────────────────
# PUBLIC API
# ─────────────────────────────────────────────────────────────

def run_skill(task: str, data: dict) -> dict:
    """
    Esegue la skill identificata da `task` con i dati forniti.

    Args:
        task: nome della skill (chiave nel REGISTRY)
        data: parametri richiesti dalla skill

    Returns:
        dict con il risultato della skill

    Raises:
        ValueError: task non trovato o parametri mancanti
    """
    entry = REGISTRY.get(task)
    if not entry:
        available = list(REGISTRY.keys())
        raise ValueError(f"Skill '{task}' non trovata. Disponibili: {available}")

    missing = [k for k in entry["required"] if k not in data]
    if missing:
        raise ValueError(f"Parametri mancanti per '{task}': {missing}")

    return entry["fn"](data)


def list_skills() -> list:
    """Elenca le skill disponibili con descrizione e parametri richiesti."""
    return [
        {"task": t, "description": e["desc"], "required": e["required"]}
        for t, e in REGISTRY.items()
    ]


# ─────────────────────────────────────────────────────────────
# CLI — test rapido
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import json

    print("\n╔══════════════════════════════════╗")
    print("║   FinanzaFacile — Skill Router   ║")
    print("╚══════════════════════════════════╝\n")
    print("Skill disponibili:\n")
    for s in list_skills():
        print(f"  {s['task']:<30} {s['description']}")

    print("\n── Demo ─────────────────────────────────────────────────\n")

    demos = [
        ("evaluate_quiz",   {"knowledge_score": 1, "lifestyle_score": 2}),
        ("analyze_expenses", {
            "income": 1800,
            "expenses": {"affitto": 750, "spesa": 280, "ristoranti": 200,
                         "trasporti": 100, "bollette": 130, "abbonamenti": 60,
                         "shopping": 150, "salute": 30, "svago": 80, "altro": 50},
        }),
        ("run_simulation",   {"monthly_savings": 320}),
        ("get_tips",         {"level": "principiante", "focus_areas": ["conoscenza_finanziaria", "gestione_debiti"]}),
        ("propose_mortgage", {"income": 2000, "monthly_savings": 400}),
    ]

    for task, data in demos:
        result = run_skill(task, data)
        print(f"[{task}]")
        print(json.dumps(result, ensure_ascii=False, indent=2))
        print()
