"""
Skill: Expense Suggestion
Suggerisce spese mensili personalizzate basandosi sul profilo quiz dell'utente.
Usa Claude per generare stime coerenti con il livello finanziario e le abitudini dichiarate.

run(profile, quiz_lifestyle, income, already_filled, api_key)
  → suggested expenses dict + reasoning
"""

import json
import anthropic

CATEGORIES = ["affitto", "spesa", "ristoranti", "trasporti", "bollette",
              "abbonamenti", "shopping", "salute", "svago", "altro"]


def run(
    profile: dict,
    quiz_lifestyle: list[dict],
    income: float,
    already_filled: dict,
    api_key: str,
) -> dict:
    """
    Args:
        profile: risultato di quiz_evaluator.run() con level, description, ecc.
        quiz_lifestyle: lista di {question, answer} dalle domande stile di vita del quiz
        income: reddito netto mensile dell'utente (0 se non indicato)
        already_filled: spese già inserite dall'utente {categoria: importo} — non vengono sovrascritte
        api_key: Claude API key

    Returns:
        {
          "suggested": {categoria: importo, ...},
          "preserved": [categorie non toccate perché già inserite],
          "reasoning": str,
          "total_suggested": float,
          "savings_estimated": float
        }
    """
    preserved = list(already_filled.keys())

    lifestyle_text = "\n".join(
        f"- {item['question']}: \"{item['answer']}\""
        for item in quiz_lifestyle
    ) if quiz_lifestyle else "- Non disponibili"

    already_text = "\n".join(
        f"- {k}: €{v}" for k, v in already_filled.items()
    ) if already_filled else "- Nessun valore inserito"

    income_note = (
        f"Reddito netto mensile: €{income:.0f}. Il totale spese non dovrebbe superare €{income * 0.88:.0f}."
        if income > 0 else "Reddito non indicato."
    )

    prompt = f"""Sei un consulente finanziario italiano. Stima le spese mensili realistiche per questo utente.

PROFILO (dal quiz):
- Livello: {profile.get("level", "principiante")} — {profile.get("description", "")}
- Conoscenza finanziaria: {profile.get("knowledge_score", 0)}/3
- Gestione denaro: {profile.get("lifestyle_score", 0)}/6
- {income_note}

RISPOSTE STILE DI VITA:
{lifestyle_text}

VALORI GIÀ INSERITI DALL'UTENTE (preservali esattamente, non cambiare):
{already_text}

Stima importi mensili realistici per le categorie mancanti, coerenti con il profilo.
Per le categorie già inserite, usa esattamente quei valori.

Rispondi SOLO con JSON valido:
{{"affitto":0,"spesa":0,"ristoranti":0,"trasporti":0,"bollette":0,"abbonamenti":0,"shopping":0,"salute":0,"svago":0,"altro":0,"reasoning":"breve spiegazione in 1 frase"}}"""

    client = anthropic.Anthropic(api_key=api_key)
    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=300,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = message.content[0].text.strip()
    match_start = raw.find("{")
    match_end = raw.rfind("}") + 1
    parsed = json.loads(raw[match_start:match_end])

    reasoning = parsed.pop("reasoning", "Stime basate sul profilo finanziario dell'utente.")

    # Sovrascrive con i valori utente (hanno priorità assoluta)
    for cat, val in already_filled.items():
        parsed[cat] = val

    # Assicura che esistano tutte le categorie
    for cat in CATEGORIES:
        if cat not in parsed:
            parsed[cat] = 0

    total = sum(float(parsed.get(c, 0)) for c in CATEGORIES)
    savings = income - total if income > 0 else None

    return {
        "suggested": {c: round(float(parsed.get(c, 0))) for c in CATEGORIES},
        "preserved": preserved,
        "reasoning": reasoning,
        "total_suggested": round(total),
        "savings_estimated": round(savings) if savings is not None else None,
    }
