"""
Skill: Quiz Evaluator
Valuta le risposte del quiz e restituisce il profilo finanziario dell'utente.

Input:
    knowledge_score (int): risposte corrette alle domande knowledge (0-3)
    lifestyle_score (int): punteggio abitudini finanziarie (0-6)

Output:
    level, description, total_score, weak_areas, knowledge_pct, lifestyle_pct
"""

PROFILES = {
    "principiante": {
        "range": (0, 5),
        "desc": "Stai iniziando il percorso finanziario — ampi margini di miglioramento.",
    },
    "intermedio": {
        "range": (6, 9),
        "desc": "Buone basi, puoi ottimizzare ulteriormente le tue scelte.",
    },
    "esperto": {
        "range": (10, 11),
        "desc": "Solida comprensione finanziaria, pronto per strategie avanzate.",
    },
}


def run(knowledge_score: int, lifestyle_score: int) -> dict:
    total = knowledge_score + lifestyle_score

    level = "principiante"
    for name, profile in PROFILES.items():
        lo, hi = profile["range"]
        if lo <= total <= hi:
            level = name
            break

    weak_areas = []
    if knowledge_score < 2:
        weak_areas.append("conoscenza_finanziaria")
    if lifestyle_score < 3:
        weak_areas.append("abitudini_risparmio")
    if lifestyle_score <= 1:
        weak_areas.append("gestione_debiti")
    if not weak_areas:
        weak_areas.append("investimenti")

    return {
        "level": level,
        "description": PROFILES[level]["desc"],
        "total_score": total,
        "max_score": 9,
        "knowledge_score": knowledge_score,
        "lifestyle_score": lifestyle_score,
        "knowledge_pct": round(knowledge_score / 5 * 100),
        "lifestyle_pct": round(lifestyle_score / 6 * 100),
        "weak_areas": weak_areas,
    }
