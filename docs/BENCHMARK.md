# Vision benchmark: which model should recognise the item?

3,170 photos, three models, the same prompt and scoring. Full tables: [tools/vision-bench/REPORT.md](../tools/vision-bench/REPORT.md);
method and reproduction: [tools/vision-bench/README.md](../tools/vision-bench/README.md). Run on 21 Nov 2026; total model cost $2.60 (four runs).

| Model | Runs | Material accuracy (95% CI) | Athens bin accuracy | Severity / 100 items | Batteries missed (of 210) | Latency p50 | Cost / 1,000 scans |
|---|---|---|---|---|---|---|---|
| SigLIP 2 (quantized, zero-shot) | on the phone | 75.9% (74.4–77.4) | 83.4% | 34.8 | 11 | ~0.1 s on a server CPU | $0 |
| Gemma 4 26B-A4B (open weights) | cloud via AI Gateway | 92.4% (91.4–93.2) | 95.6% | 14.7 | 13 | 0.66 s | $0.05 |
| Gemini 3.5 Flash-Lite | cloud via AI Gateway | 94.3% (93.5–95.1) | 96.3% | 10.7 | **1** | 1.22 s | $0.43 |
| **Gemini 3.1 Flash-Lite** (production default) | cloud via AI Gateway | **94.4% (93.6–95.2)** | **96.4%** | **10.1** | 2 | 1.21 s | $0.34 |
| SigLIP → Gemini 3.1 when confidence < 0.7 | phone first, 39% to cloud | 92.5% | 95.0% | 12.0 | | 0.12 s (p95 1.7 s) | $0.13 |
| SigLIP → Gemma when confidence < 0.8 | phone first, 49% to cloud | 92.0% | 95.1% | 13.9 | | 0.14 s (p95 0.95 s) | $0.03 |

## What it says

- **Gemini Flash-Lite is the most accurate.** 3.1 (what production runs) and 3.5 are statistically tied
  (94.4% vs 94.3%), and 3.1 is 22% cheaper: $0.34 per 1,000 scans. 3.5 missed 1 battery in 210, 3.1 missed 2.
- **Gemma 4 is close** (92.4%) at an eighth of Gemini's price and about twice as fast, and its weights are open
  (it could run on a municipal server), but it missed 13 of 210 batteries.
- **SigLIP 2 on the phone is free, private and instant but not good enough alone** (75.9%). Its confidence is
  honest: above 0.9 it is right 97–99% of the time, below 0.5 only 36%. That makes it a good first stage.
- **Phone first, cloud when unsure** keeps most of Gemini's accuracy (92.5% vs 94.4%, 95.0% right bin) at 39%
  of its cost ($0.13 per 1,000 scans), and the 61% of scans answered on the phone never leave it.
- **"General" (mixed, non-recyclable rubbish) is the weak class for every model** (SigLIP 10%, Gemma 67%,
  Gemini 65%): it is usually read as plastic or paper. That error puts rubbish into the blue bin, which is
  exactly the contamination the municipality wants to cut. The app's clarifying question should target it.

## Limits (read before quoting a number)

- **Not Greek waste, not field photos.** Web photos (2,400), studio photos (720) and only 50 real-scene
  photos. No Greek brands, few dirty, crushed or wet items, no night shots. Expect lower accuracy in Athens.
- **Public datasets may be in the models' training data**, which would flatter Gemma and Gemini.
- **Labels are the datasets' own** (some noise, e.g. "trash" is loosely defined).
- **Latency** for Gemma and Gemini is from a cloud machine through the gateway, not from a phone in Athens;
  SigLIP's is one server CPU thread, and a phone will be slower.
- **LLM confidence is self-reported**; it is less informative than SigLIP's (most answers say 0.97–1.0).

The next benchmark should use 2,000–3,000 photos of real Athens waste taken with residents' phones,
labelled by two people with the municipality's rules (see the plan in the review that started this work).

## Safe headline

> On 3,170 public waste photos, the phone-first set-up (on-device recognition, cloud check when unsure) chose
> the right Athens bin 95% of the time, at about €0.12 per 1,000 scans; the Athens pilot will measure it on
> real local waste.
