"""
Skill: Mortgage Advisor
Calcola la sostenibilità del mutuo e valuta un preventivo bancario.

run(income, monthly_savings)              → affordability + tabella importi per durata
evaluate_offer(income, amount, ...)       → semafori su sostenibilità rata, LTV, tasso
"""
import math

MARKET_RATE_FISSO = 3.5
DURATIONS = [10, 15, 20, 25, 30]


def _monthly_payment(amount: float, annual_rate_pct: float, years: int) -> float:
    r = annual_rate_pct / 100 / 12
    n = years * 12
    if r == 0:
        return amount / n
    return amount * (r * math.pow(1 + r, n)) / (math.pow(1 + r, n) - 1)


def _max_amount(max_payment: float, annual_rate_pct: float, years: int) -> float:
    r = annual_rate_pct / 100 / 12
    n = years * 12
    if r == 0:
        return max_payment * n
    return max_payment * (math.pow(1 + r, n) - 1) / (r * math.pow(1 + r, n))


def run(income: float, monthly_savings: float) -> dict:
    """Calcola affordability e tabella importi/rate per durata."""
    max_rata_30 = income * 0.30
    max_rata_realistic = max(0.0, monthly_savings * 0.50)
    affordability_pct = (max_rata_realistic / income * 100) if income > 0 else 0

    if affordability_pct >= 20:
        status, label = "ok",      "Situazione favorevole per un mutuo"
    elif affordability_pct >= 10:
        status, label = "warning", "Margine limitato — valuta con attenzione"
    else:
        status, label = "danger",  "Da rafforzare prima di accendere un mutuo"

    table = []
    for dur in DURATIONS:
        max_imp = _max_amount(max_rata_realistic, MARKET_RATE_FISSO, dur)
        rata = _monthly_payment(max_imp, MARKET_RATE_FISSO, dur)
        table.append({
            "years": dur,
            "max_amount": round(max_imp),
            "monthly_payment": round(rata),
        })

    return {
        "status": status,
        "status_label": label,
        "max_rata_30pct_rule": round(max_rata_30),
        "max_rata_realistic": round(max_rata_realistic),
        "affordability_pct": round(affordability_pct, 1),
        "reference_rate_pct": MARKET_RATE_FISSO,
        "table_by_duration": table,
    }


def evaluate_offer(
    income: float,
    amount: float,
    property_value: float,
    duration_years: int,
    rate: float,
    taeg: float = 0,
    declared_payment: float = 0,
    fees: float = 0,
    rate_type: str = "fisso",
) -> dict:
    """Valuta un preventivo bancario con semafori su 3 indicatori."""
    computed_payment = _monthly_payment(amount, rate, duration_years)
    ltv = (amount / property_value * 100) if property_value > 0 else None
    payment_pct = (declared_payment / income * 100) if income > 0 and declared_payment > 0 else None

    def traffic_light(value, ok_thresh, warn_thresh):
        if value is None:
            return "neutral"
        return "ok" if value <= ok_thresh else ("warning" if value <= warn_thresh else "danger")

    indicators = [
        {
            "name": "Sostenibilità rata",
            "value": f"{payment_pct:.1f}% del reddito" if payment_pct else "—",
            "status": traffic_light(payment_pct, 30, 40),
            "detail": (
                "Sotto la soglia del 30% — buono" if (payment_pct or 0) < 30
                else "Supera il 30% del reddito — rischio elevato"
            ) if payment_pct else "Completa il quiz con il reddito",
        },
        {
            "name": "LTV (Loan To Value)",
            "value": f"{ltv:.1f}%" if ltv else "—",
            "status": traffic_light(ltv, 80, 90),
            "detail": (
                "Sotto l'80%: condizioni più favorevoli" if (ltv or 0) < 80
                else "Sopra l'80%: potrebbero servire garanzie aggiuntive"
            ) if ltv else "Inserisci il valore dell'immobile",
        },
        {
            "name": "Competitività tasso",
            "value": f"{rate:.2f}% (benchmark: {MARKET_RATE_FISSO}%)",
            "status": traffic_light(rate, MARKET_RATE_FISSO, MARKET_RATE_FISSO + 0.5),
            "detail": (
                "In linea o sotto la media di mercato"
                if rate <= MARKET_RATE_FISSO
                else "Prova a negoziare — sopra la media di mercato"
            ),
        },
    ]

    statuses = [i["status"] for i in indicators if i["status"] != "neutral"]
    overall = "danger" if "danger" in statuses else ("warning" if "warning" in statuses else "ok")

    suggestions = []
    if payment_pct and payment_pct > 30:
        suggestions.append("Riduci l'importo o allunga la durata per abbassare la rata mensile.")
    if ltv and ltv > 80:
        suggestions.append("Aumenta l'anticipo per portare l'LTV sotto l'80%.")
    if rate > MARKET_RATE_FISSO:
        suggestions.append("Negozia il tasso o confronta offerte di altri istituti.")

    return {
        "indicators": indicators,
        "overall_status": overall,
        "overall_label": {
            "ok":      "Preventivo complessivamente buono",
            "warning": "Preventivo accettabile con riserve",
            "danger":  "Preventivo da rivedere o negoziare",
        }[overall],
        "computed_payment": round(computed_payment),
        "declared_payment": declared_payment,
        "payment_delta": round(declared_payment - computed_payment) if declared_payment else None,
        "suggestions": suggestions,
    }
