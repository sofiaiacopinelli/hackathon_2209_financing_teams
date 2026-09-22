"""
Skill: Market Data
Recupera tassi finanziari aggiornati da fonti pubbliche (BCE SDMX REST API).
Non richiede API key: usa endpoint pubblici.

fetch_rates()  → tassi mutui IT, tasso BCE, inflazione HICP
"""

import urllib.request
import json

ECB_BASE = "https://sdw-wsrest.ecb.europa.eu/service/data"


def _fetch_series(path: str, last_n: int = 2) -> dict:
    url = f"{ECB_BASE}/{path}?lastNObservations={last_n}&format=jsondata"
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=8) as r:
        return json.loads(r.read())


def _parse_latest(data: dict) -> dict:
    series = list(data["dataSets"][0]["series"].values())[0]
    obs_keys = sorted(series["observations"].keys(), key=int)
    last_key = obs_keys[-1]
    value = series["observations"][last_key][0]
    date_vals = data["structure"]["dimensions"]["observation"][0]["values"]
    date = date_vals[int(last_key)].get("name", "")
    return {"value": round(float(value), 2), "date": date}


def fetch_rates() -> dict:
    """
    Fetcha in parallelo i principali tassi di interesse italiani da BCE.
    Ogni campo è None se la fonte non è raggiungibile.

    Returns:
        {
          "fisso":      {"value": float, "date": str} | None,
          "variabile":  {"value": float, "date": str} | None,
          "bce":        {"value": float, "date": str} | None,
          "inflazione": {"value": float, "date": str} | None,
          "source":     str,
          "ok":         bool
        }
    """
    series_map = {
        "bce":        "FM/B.U2.EUR.4F.KR.MRR_FR.LEV",
        "fisso":      "MIR/M.IT.B.A2A.AM.R.A.2240.EUR.N",
        "variabile":  "MIR/M.IT.B.A2C.AM.R.A.2240.EUR.N",
        "inflazione": "ICP/M.IT.N.000000.4.ANR",
    }

    result = {k: None for k in series_map}
    result["source"] = "BCE SDMX REST API"

    for key, path in series_map.items():
        try:
            raw = _fetch_series(path)
            result[key] = _parse_latest(raw)
        except Exception:
            pass

    result["ok"] = any(result[k] is not None for k in series_map)
    return result
