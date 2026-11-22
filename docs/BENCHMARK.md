# Vision benchmark: which model should recognise the item?

3,170 photos, the same prompt and scoring (see the table), the same prompt and scoring (Gemini Decision through the Decisions API, one choice question). Full tables: [tools/vision-bench/REPORT.md](../tools/vision-bench/REPORT.md);
method and reproduction: [tools/vision-bench/README.md](../tools/vision-bench/README.md). Run on 21–22 Nov 2026; total model cost about $3.

| Model | Runs | Material accuracy (95% CI) | Athens bin accuracy | Severity / 100 items | Batteries missed (of 210) | Latency p50 | Cost / 1,000 scans |
|---|---|---|---|---|---|---|---|
| **The app as shipped** (4-bit SigLIP 2 on the phone, its own "sure" rule, Gemini 3.5 for the rest) | phone first, 37% to cloud | 90.2% | **94.8%** | | | | **$0.16** |
| SigLIP 2 base, 4-bit (in the app) | on the phone | 83.7% (82.3–84.9) | 88.9% | | 1 | ~0.4 s on a server CPU | $0 |
| SigLIP 2 base, 8-bit (the app until 22 Nov) | on the phone | 75.9% (74.4–77.4) | 83.4% | 34.8 | 11 | ~0.1 s on a server CPU | $0 |
| SigLIP 2 base, full precision | server | 83.4% (82.1–84.7) | 88.4% | 23.5 | 0 | 0.15 s (4 CPU cores) | $0 |
| SigLIP 2 so400m, full precision | server | 86.6% (85.3–87.7) | 89.9% | | 1 | 0.85 s (4 CPU cores) | $0 |
| Gemma 4 26B-A4B (open weights) | cloud via AI Gateway | 92.4% (91.4–93.2) | 95.6% | 14.7 | 13 | 0.66 s | $0.05 |
| Gemini Decision 1 (decision model) | cloud via AI Gateway | 90.1% (89.0–91.1) | 92.4% | 22.0 | **1** | 0.79 s | $0.12 |
| **Gemini 3.5 Flash-Lite** (server recognition) | cloud via AI Gateway | **94.3% (93.5–95.1)** | **96.3%** | **10.7** | **1** | 1.22 s | $0.43 |

The "app as shipped" row is `app-path-eval.mjs` (the app's exact on-device path: resize, 4-bit model, label scores, the
"sure" rule) plus Gemini 3.5 Flash-Lite for the photos the phone is not sure about, scored with `app-cascade.py` on all
3,170 photos: it answers 63.2% of photos on the phone, and when it answers the bin is right 94.9% of the time.

## What it says

- **Gemini 3.5 Flash-Lite is the most accurate** and the safest (one battery missed in 210, the lowest severity),
  at $0.43 per 1,000 scans. It is the production model.
- **Gemini Decision 1 is cheaper and faster but less accurate** (90.1%, $0.12, 0.8 s). It fails on mixed rubbish
  (31% right, mostly read as plastic). Its confidence is the best calibrated of all: at 0.9 or more it is right
  98–99% of the time. So **Decision first, Flash-Lite when Decision is below 0.9** matches Flash-Lite (94.3%) at
  58% of its cost.
- **Gemma 4 is close** (92.4%) at an eighth of Gemini's price and about twice as fast, and its weights are open
  (it could run on a municipal server), but it missed 13 of 210 batteries.
- **SigLIP 2 on the phone is free, private and instant but not good enough alone** (75.9%). Its confidence is
  honest: above 0.9 it is right 97–99% of the time, below 0.5 only 36%. That makes it a good first stage.
- **Phone first, cloud when unsure** keeps most of Gemini's accuracy (92.2% vs 94.3%, 94.9% right bin) at 39%
  of its cost ($0.17 per 1,000 scans), and the 61% of scans answered on the phone never leave it.
- **"General" (mixed, non-recyclable rubbish) is the weak class for every model** (SigLIP 10%, Gemini Decision 31%,
  Gemma 67%, Gemini Flash-Lite 65%): it is usually read as plastic or paper. That error puts rubbish into the blue bin, which is
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

> On 3,170 public waste photos, the app (on-device recognition, a cloud check when it is unsure) chose the right
> Athens bin 95% of the time (94.8%), at about €0.14 per 1,000 scans ($0.16); the Athens pilot will measure it on
> real local waste.

## 22 Nov 2026: what changed

- The phone's SigLIP 2 moved from the 8-bit to the 4-bit file (63 MB instead of 95 MB). The 8-bit file lost about
  9 points of accuracy to quantization; the image preprocessing made no difference.
- A confidence threshold in a benchmark is not the app's rule. With the 4-bit model, "escalate below 0.7" would
  suggest $0.10 per 1,000 scans; the app's real rule sends more photos to the cloud (37%), so the measured cost is $0.16.
- The server-side SigLIP 2 variants cost nothing in model fees but need a server we would run; the phone-first set-up
  beats them on accuracy and on cost.
