"""
Skill: Tip Generator
Genera consigli finanziari contestuali per livello e area di focus.

Input:
    level (str): "principiante" | "intermedio" | "esperto"
    focus_areas (list): es. ["conoscenza_finanziaria", "gestione_debiti"]

Output:
    tips (list of {area, tip}), count
"""

TIPS_DB: dict[str, dict[str, str]] = {
    "conoscenza_finanziaria": {
        "principiante": "Inizia dai concetti base: tasso, inflazione, TAEG, rata. Capirli ti protegge da scelte costose.",
        "intermedio":   "Studia la differenza tra tasso nominale e reale, e come l'inflazione erode il potere d'acquisto.",
        "esperto":      "Approfondisci la fiscalità degli investimenti: PIR, fondi pensione, regime dichiarativo vs. amministrato.",
    },
    "abitudini_risparmio": {
        "principiante": "Smetti di risparmiare quello che avanza — metti da parte subito e spendi il resto.",
        "intermedio":   "Automatizza il risparmio: un bonifico programmato il giorno stesso dell'accredito stipendio.",
        "esperto":      "Monitora il tasso di risparmio mensile come KPI principale della tua salute finanziaria.",
    },
    "gestione_debiti": {
        "principiante": "Evita le carte revolving — TAEG spesso >20%. Paga sempre il saldo totale ogni mese.",
        "intermedio":   "Ordina i debiti per TAEG decrescente e estingui prima i più costosi (metodo avalanche).",
        "esperto":      "Valuta se il TAEG del debito è inferiore al rendimento atteso prima di estinguere anticipatamente.",
    },
    "investimenti": {
        "principiante": "Prima crea un fondo di emergenza (3-6 mesi di spese). Solo dopo inizia a investire.",
        "intermedio":   "Apri un PAC su ETF globali come MSCI World con versamenti mensili fissi.",
        "esperto":      "Definisci una asset allocation target (es. 70% azionario, 25% obbligazionario) e ribilancia annualmente.",
    },
    "budget": {
        "principiante": "Traccia ogni spesa per un mese con un'app (Wallet, Spendee). Scoprirai dove i soldi spariscono.",
        "intermedio":   "Rivedi le spese fisse ogni anno: assicurazioni, utenze, abbonamenti.",
        "esperto":      "Implementa un budget a busta (envelope budgeting) con tetti mensili per categoria.",
    },
    "risparmio": {
        "principiante": "Inizia mettendo da parte il 10% dello stipendio prima di spendere.",
        "intermedio":   "Applica la regola 50-30-20: 50% necessità, 30% desideri, 20% risparmio/investimento.",
        "esperto":      "Ottimizza il risparmio con strumenti fiscalmente efficienti: fondi pensione, PIR.",
    },
}


def run(level: str, focus_areas: list) -> dict:
    if level not in ("principiante", "intermedio", "esperto"):
        level = "principiante"

    tips = []
    for area in focus_areas:
        area_db = TIPS_DB.get(area, {})
        if not area_db:
            continue
        text = area_db.get(level) or area_db.get("principiante", "")
        tips.append({"area": area, "tip": text})

    return {
        "level": level,
        "tips": tips,
        "count": len(tips),
    }
