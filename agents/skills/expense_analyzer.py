"""
Skill: Expense Analyzer
Analizza spese mensili e simula la crescita del capitale con interesse composto.

run(income, expenses)          → breakdown spese, risparmio, anomalie
run_simulation(monthly_savings) → proiezione a 5/10/20 anni in 3 scenari
"""
import math

SPENDING_THRESHOLDS = {
    "affitto":     0.40,
    "ristoranti":  0.10,
    "abbonamenti": 0.05,
    "shopping":    0.10,
    "svago":       0.08,
}


def run(income: float, expenses: dict) -> dict:
    total_exp = sum(float(v) for v in expenses.values())
    savings = income - total_exp
    savings_rate = (savings / income * 100) if income > 0 else 0

    anomalies = []
    for cat, amount in expenses.items():
        amount = float(amount)
        if amount <= 0 or income <= 0:
            continue
        pct = amount / income
        threshold = SPENDING_THRESHOLDS.get(cat, 0.15)
        if pct > threshold:
            anomalies.append({
                "category": cat,
                "amount": amount,
                "pct_of_income": round(pct * 100, 1),
                "suggested_max_pct": round(threshold * 100, 1),
            })

    top_cat = max(expenses.items(), key=lambda x: float(x[1]), default=("—", 0))

    return {
        "income": income,
        "total_expenses": total_exp,
        "monthly_savings": savings,
        "annual_savings": savings * 12,
        "savings_rate_pct": round(savings_rate, 1),
        "top_category": {"name": top_cat[0], "amount": float(top_cat[1])},
        "anomalies": anomalies,
        "balanced": savings >= 0,
    }


def run_simulation(monthly_savings: float) -> dict:
    def compound_growth(pmt, years, annual_rate):
        if pmt <= 0:
            return 0.0
        if annual_rate == 0:
            return pmt * years * 12
        r = annual_rate / 12
        n = years * 12
        return pmt * ((math.pow(1 + r, n) - 1) / r)

    scenarios = {}
    for name, rate in [
        ("risparmio_puro", 0.0),
        ("conto_deposito", 0.02),
        ("investimento_moderato", 0.05),
    ]:
        scenarios[name] = {
            "annual_rate_pct": rate * 100,
            "5yr":  round(compound_growth(monthly_savings, 5,  rate)),
            "10yr": round(compound_growth(monthly_savings, 10, rate)),
            "20yr": round(compound_growth(monthly_savings, 20, rate)),
        }

    gain_10 = scenarios["investimento_moderato"]["10yr"] - scenarios["risparmio_puro"]["10yr"]
    gain_20 = scenarios["investimento_moderato"]["20yr"] - scenarios["risparmio_puro"]["20yr"]

    return {
        "monthly_savings": monthly_savings,
        "scenarios": scenarios,
        "investment_gain_10yr": round(gain_10),
        "investment_gain_20yr": round(gain_20),
        "note": "Rendimenti lordi, versamenti costanti, inflazione non inclusa.",
    }
