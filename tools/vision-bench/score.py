"""Scores the vision benchmark: accuracy with 95% intervals, Athens-bin accuracy, severity-weighted error,
confusion, calibration, latency, cost, and the on-device → cloud cascade.

Usage: python3 score.py            (reads manifest.json, classes.json, results/*.jsonl; writes results/summary.json and REPORT.md)
"""
import json, math, random, statistics
from collections import Counter, defaultdict

C = json.load(open("classes.json"))
CLASSES, BIN = C["classes"], C["bin"]
ITEMS = {i["id"]: i for i in json.load(open("manifest.json"))["items"]}
MODELS = {
    "siglip2-on-device": "SigLIP 2 · on device (quantized ONNX)",
    "google__gemma-4-26b-a4b-it": "Gemma 4 26B-A4B · open weights, via gateway",
    "google__gemini-3.5-flash-lite": "Gemini 3.5 Flash-Lite · cloud",
    "google__gemini-3.1-flash-lite": "Gemini 3.1 Flash-Lite · cloud (production default)",
}
CLOUD = ["google__gemini-3.1-flash-lite", "google__gemini-3.5-flash-lite", "google__gemma-4-26b-a4b-it"]


SYN = {"organic": "food", "biological": "food", "clothes": "textile", "clothing": "textile", "shoes": "textile", "fabric": "textile",
       "trash": "general", "rubbish": "general", "aluminium": "metal", "aluminum": "metal", "tin": "metal", "carton": "cardboard"}


def reparse(r):
    """Same lenient reading for every model: the first word of the "material" value, e.g. "textile (clothes, …)" → textile."""
    if r.get("pred") or not r.get("raw"):
        return r
    try:
        v = json.loads(r["raw"].strip().strip("`").removeprefix("json")).get("material", "")
    except Exception:
        v = r["raw"]
    word = str(v).lower().replace("(", " ").replace(",", " ").split()
    m = SYN.get(word[0], word[0]) if word else None
    r["pred"] = m if m in CLASSES else None
    return r


def load(name):
    rows = {}
    for line in open(f"results/{name}.jsonl"):
        r = reparse(json.loads(line))
        if r["id"] in ITEMS and not (r.get("error") and r["id"] in rows):
            rows[r["id"]] = r
    return rows


def wilson(k, n, z=1.96):
    if n == 0:
        return (0.0, 0.0, 0.0)
    p = k / n
    d = 1 + z * z / n
    c = (p + z * z / (2 * n)) / d
    h = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d
    return (p, max(0.0, c - h), min(1.0, c + h))


def severity(true_mat, pred_mat):
    """Harm of one decision at bin level (Athens rules). 0 = right bin."""
    if pred_mat is None:
        return 1.0  # no answer: the resident has to pick by hand
    t, p = BIN[true_mat], BIN[pred_mat]
    if t == p:
        return 0.0
    if t == "battery":
        return 10.0  # a battery in a household bin: fire and toxic risk
    if p in ("blue", "brown"):
        return 3.0  # contaminates a recycling or compost stream
    if p == "clothing":
        return 1.0  # wrong item in the clothing bank
    if p == "general":
        return 1.0  # recyclable / compostable lost to landfill
    return 0.5  # wasted trip to a special point


def boot_ci(values, n=1000, seed=7):
    rng = random.Random(seed)
    m = len(values)
    means = sorted(sum(values[rng.randrange(m)] for _ in range(m)) / m for _ in range(n))
    return means[int(0.025 * n)], means[int(0.975 * n)]


def pct(x):
    return f"{x * 100:.1f}%"


def evaluate(preds, ids):
    n = len(ids)
    ok = [preds[i]["pred"] == ITEMS[i]["label"] for i in ids]
    bin_ok = [preds[i]["pred"] is not None and BIN[preds[i]["pred"]] == BIN[ITEMS[i]["label"]] for i in ids]
    sev = [severity(ITEMS[i]["label"], preds[i]["pred"]) for i in ids]
    per_class = {}
    for c in CLASSES:
        cid = [i for i in ids if ITEMS[i]["label"] == c]
        if cid:
            k = sum(preds[i]["pred"] == c for i in cid)
            per_class[c] = {"n": len(cid), "acc": wilson(k, len(cid))}
    macro = statistics.mean(v["acc"][0] for v in per_class.values())
    conf = Counter((ITEMS[i]["label"], preds[i]["pred"] or "none") for i in ids)
    pairs = sorted(((v, a, b) for (a, b), v in conf.items() if a != b), reverse=True)[:5]
    sev_ci = boot_ci(sev)
    return {
        "n": n,
        "material": wilson(sum(ok), n),
        "macro": macro,
        "bin": wilson(sum(bin_ok), n),
        "severity_per_100": 100 * sum(sev) / n,
        "severity_ci": (100 * sev_ci[0], 100 * sev_ci[1]),
        "severe_errors": wilson(sum(s >= 3 for s in sev), n),
        "battery_missed": sum(1 for i in ids if ITEMS[i]["label"] == "battery" and preds[i]["pred"] != "battery"),
        "invalid": sum(preds[i]["pred"] is None for i in ids),
        "per_class": per_class,
        "top_confusions": [{"true": a, "pred": b, "count": v} for v, a, b in pairs],
        "confusion": {f"{a}->{b}": v for (a, b), v in conf.items()},
    }


def latency_cost(preds, ids):
    ms = sorted(preds[i].get("ms", 0) for i in ids if preds[i].get("ms") is not None)
    cost = [preds[i].get("cost", 0) or 0 for i in ids]
    q = lambda p: ms[min(len(ms) - 1, int(p * len(ms)))]
    return {"p50_ms": q(0.5), "p95_ms": q(0.95), "max_ms": ms[-1], "cost_per_1000_usd": 1000 * sum(cost) / len(ids)}


def calibration(preds, ids):
    bins = [(0, 0.5), (0.5, 0.7), (0.7, 0.9), (0.9, 0.97), (0.97, 1.01)]
    out = []
    for lo, hi in bins:
        sel = [i for i in ids if preds[i].get("confidence") is not None and lo <= preds[i]["confidence"] < hi]
        if sel:
            k = sum(preds[i]["pred"] == ITEMS[i]["label"] for i in sel)
            out.append({"range": f"{lo:.2f}–{min(hi, 1):.2f}", "n": len(sel), "acc": k / len(sel)})
    return out


def main():
    data = {m: load(m) for m in MODELS}
    common = sorted(set(ITEMS).intersection(*[set(d) for d in data.values()]))
    summary = {"n_common": len(common), "models": {}, "cascade": {}}
    datasets = sorted({ITEMS[i]["dataset"] for i in common})
    for m, label in MODELS.items():
        p = data[m]
        res = {"label": label, "all": evaluate(p, common), "by_dataset": {}}
        for ds in datasets:
            res["by_dataset"][ds] = evaluate(p, [i for i in common if ITEMS[i]["dataset"] == ds])
        res["latency_cost"] = latency_cost(p, common)
        res["calibration"] = calibration(p, common)
        summary["models"][m] = res

    # Cascade: SigLIP on the phone answers when its confidence ≥ τ, otherwise the cloud model answers.
    sig = data["siglip2-on-device"]
    for cloud in CLOUD:
        rows = []
        for tau in [0, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95, 0.99, 1.01]:
            preds, esc, cost, lat = {}, 0, 0.0, []
            for i in common:
                if sig[i]["confidence"] >= tau:
                    preds[i] = sig[i]
                    lat.append(sig[i]["ms"])
                else:
                    preds[i] = data[cloud][i]
                    esc += 1
                    cost += data[cloud][i].get("cost", 0) or 0
                    lat.append(sig[i]["ms"] + data[cloud][i].get("ms", 0))
            ev = evaluate(preds, common)
            lat.sort()
            rows.append({
                "tau": tau,
                "escalated": esc / len(common),
                "material": ev["material"],
                "bin": ev["bin"],
                "severity_per_100": ev["severity_per_100"],
                "cost_per_1000_usd": 1000 * cost / len(common),
                "p50_ms": lat[len(lat) // 2],
                "p95_ms": lat[int(0.95 * len(lat))],
            })
        summary["cascade"][cloud] = rows

    json.dump(summary, open("results/summary.json", "w"), indent=1, ensure_ascii=False)
    write_report(summary, datasets)
    print(open("REPORT.md").read())


def write_report(s, datasets):
    L = []
    w = L.append
    w("# Vision benchmark: SigLIP 2 on device vs Gemma 4 vs Gemini Flash-Lite (3.1 and 3.5)\n")
    w(f"{s['n_common']} photos scored by every model. 95% intervals: Wilson for proportions, bootstrap for the severity score.\n")
    w("## Headline\n")
    w("| Model | Material accuracy | Macro (per-class mean) | Athens bin accuracy | Severity per 100 items | Severe errors (≥3) | Batteries missed | Latency p50 / p95 | Cost per 1,000 scans |")
    w("|---|---|---|---|---|---|---|---|---|")
    for m, r in s["models"].items():
        a, lc = r["all"], r["latency_cost"]
        w(
            f"| {r['label']} | {pct(a['material'][0])} ({pct(a['material'][1])}–{pct(a['material'][2])}) | {pct(a['macro'])} | "
            f"{pct(a['bin'][0])} ({pct(a['bin'][1])}–{pct(a['bin'][2])}) | {a['severity_per_100']:.1f} ({a['severity_ci'][0]:.1f}–{a['severity_ci'][1]:.1f}) | "
            f"{pct(a['severe_errors'][0])} | {a['battery_missed']} | {lc['p50_ms']:.0f} / {lc['p95_ms']:.0f} ms | ${lc['cost_per_1000_usd']:.3f} |"
        )
    w("\nLatency: SigLIP is one CPU thread on a cloud server (a phone will be slower); Gemma and Gemini are full round trips from the benchmark machine through the Vercel AI Gateway.\n")
    w("## By dataset (material accuracy)\n")
    w("| Model | " + " | ".join(datasets) + " |")
    w("|---|" + "---|" * len(datasets))
    for m, r in s["models"].items():
        w(f"| {r['label']} | " + " | ".join(f"{pct(r['by_dataset'][d]['material'][0])} (n={r['by_dataset'][d]['n']})" for d in datasets) + " |")
    w("\n## Per class (material recall, 95% interval)\n")
    w("| Class | n | " + " | ".join(r["label"].split(" ·")[0] for r in s["models"].values()) + " |")
    w("|---|---|" + "---|" * len(s["models"]))
    first = next(iter(s["models"].values()))
    for c, v in first["all"]["per_class"].items():
        cells = []
        for r in s["models"].values():
            p, lo, hi = r["all"]["per_class"][c]["acc"]
            cells.append(f"{pct(p)} ({lo * 100:.0f}–{hi * 100:.0f})")
        w(f"| {c} | {v['n']} | " + " | ".join(cells) + " |")
    w("\n## Top five confusions (true → predicted, count)\n")
    for m, r in s["models"].items():
        w(f"- **{r['label']}**: " + "; ".join(f"{x['true']} → {x['pred']} ({x['count']})" for x in r["all"]["top_confusions"]))
    w("\n## Calibration (accuracy within each confidence band)\n")
    for m, r in s["models"].items():
        w(f"- **{r['label']}**: " + "; ".join(f"{b['range']}: {pct(b['acc'])} of {b['n']}" for b in r["calibration"]))
    for cloud, rows in s["cascade"].items():
        name = s["models"][cloud]["label"].split(" ·")[0]
        w(f"\n## Cascade: SigLIP 2 on device, escalate to {name} when confidence < τ\n")
        w("| τ | Escalated | Material accuracy | Bin accuracy | Severity / 100 | Cost / 1,000 | p50 / p95 latency |")
        w("|---|---|---|---|---|---|---|")
        for x in rows:
            w(f"| {x['tau']:.2f} | {pct(x['escalated'])} | {pct(x['material'][0])} | {pct(x['bin'][0])} | {x['severity_per_100']:.1f} | ${x['cost_per_1000_usd']:.3f} | {x['p50_ms']:.0f} / {x['p95_ms']:.0f} ms |")
    w("\n## Severity weights (Athens bins)\n")
    w("Right bin 0 · battery into any household bin 10 · anything wrong into the blue or brown bin 3 · wrong item into the clothing bank 1 · recyclable or food lost to general waste 1 · wasted trip to a special point 0.5 · no answer 1.")
    open("REPORT.md", "w").write("\n".join(L) + "\n")


if __name__ == "__main__":
    main()
