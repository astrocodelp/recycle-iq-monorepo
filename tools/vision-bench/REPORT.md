# Vision benchmark: SigLIP 2 (on device and cloud) vs Gemma 4 vs Gemini 3.5 Flash-Lite vs Gemini Decision

3170 photos scored by every model. 95% intervals: Wilson for proportions, bootstrap for the severity score.

## Headline

| Model | Material accuracy | Macro (per-class mean) | Athens bin accuracy | Severity per 100 items | Severe errors (≥3) | Batteries missed | Latency p50 / p95 | Cost per 1,000 scans |
|---|---|---|---|---|---|---|---|---|
| SigLIP 2 base · on device, 8-bit (until 22 Nov 2026) | 75.9% (74.4%–77.4%) | 75.2% | 83.4% (82.0%–84.6%) | 34.8 (31.3–38.5) | 9.0% | 11 | 104 / 129 ms | $0.000 |
| SigLIP 2 base · cloud (full precision, 224 px) | 83.4% (82.1%–84.7%) | 81.8% | 88.4% (87.2%–89.5%) | 23.5 (20.9–26.0) | 6.2% | 0 | 153 / 247 ms | $0.000 |
| Gemma 4 26B-A4B · open weights, via gateway | 92.4% (91.4%–93.2%) | 91.7% | 95.6% (94.8%–96.2%) | 14.7 (12.0–17.7) | 3.7% | 13 | 661 / 1107 ms | $0.053 |
| Gemini 3.5 Flash-Lite · cloud (production) | 94.3% (93.5%–95.1%) | 94.1% | 96.3% (95.6%–96.9%) | 10.7 (8.7–12.5) | 3.4% | 1 | 1221 / 1562 ms | $0.431 |
| Gemini Decision 1 · decision model, cloud | 90.1% (89.0%–91.1%) | 89.7% | 92.4% (91.4%–93.2%) | 22.0 (19.3–24.8) | 7.1% | 1 | 786 / 1094 ms | $0.122 |

Latency: SigLIP on device is one CPU thread on a cloud server (a phone will be slower); SigLIP cloud runs on 4 CPU cores, no GPU; Gemma and Gemini are full round trips from the benchmark machine through the Vercel AI Gateway.

## By dataset (material accuracy)

| Model | complex | garbage12 | trashnet |
|---|---|---|---|
| SigLIP 2 base · on device, 8-bit (until 22 Nov 2026) | 66.0% (n=50) | 79.2% (n=2400) | 65.4% (n=720) |
| SigLIP 2 base · cloud (full precision, 224 px) | 70.0% (n=50) | 85.7% (n=2400) | 76.8% (n=720) |
| Gemma 4 26B-A4B · open weights, via gateway | 94.0% (n=50) | 95.8% (n=2400) | 81.0% (n=720) |
| Gemini 3.5 Flash-Lite · cloud (production) | 94.0% (n=50) | 97.9% (n=2400) | 82.4% (n=720) |
| Gemini Decision 1 · decision model, cloud | 96.0% (n=50) | 92.5% (n=2400) | 81.8% (n=720) |

## Per class (material recall, 95% interval)

| Class | n | SigLIP 2 base · on device, 8-bit | SigLIP 2 base · cloud | Gemma 4 26B-A4B · open weights, via gateway | Gemini 3.5 Flash-Lite · cloud | Gemini Decision 1 · decision model, cloud |
|---|---|---|---|---|---|---|
| plastic | 320 | 73.8% (69–78) | 73.1% (68–78) | 92.5% (89–95) | 95.3% (92–97) | 97.2% (95–99) |
| paper | 330 | 72.7% (68–77) | 74.2% (69–79) | 90.6% (87–93) | 93.3% (90–96) | 88.2% (84–91) |
| cardboard | 320 | 94.4% (91–96) | 98.1% (96–99) | 93.4% (90–96) | 97.8% (96–99) | 98.8% (97–100) |
| metal | 320 | 83.8% (79–87) | 95.0% (92–97) | 95.0% (92–97) | 98.8% (97–100) | 98.1% (96–99) |
| glass | 730 | 79.7% (77–82) | 96.2% (95–97) | 97.0% (95–98) | 97.5% (96–98) | 96.3% (95–97) |
| food | 200 | 71.0% (64–77) | 85.0% (79–89) | 97.0% (94–99) | 99.0% (96–100) | 99.5% (97–100) |
| battery | 210 | 94.8% (91–97) | 100.0% (98–100) | 93.8% (90–96) | 99.5% (97–100) | 99.5% (97–100) |
| textile | 420 | 96.7% (94–98) | 98.6% (97–99) | 99.3% (98–100) | 100.0% (99–100) | 98.8% (97–99) |
| general | 320 | 9.7% (7–13) | 15.9% (12–20) | 66.9% (62–72) | 65.3% (60–70) | 30.9% (26–36) |

## Top five confusions (true → predicted, count)

- **SigLIP 2 base · on device, 8-bit (until 22 Nov 2026)**: general → plastic (118); general → paper (75); glass → plastic (62); paper → cardboard (40); general → battery (36)
- **SigLIP 2 base · cloud (full precision, 224 px)**: general → textile (80); general → plastic (74); plastic → glass (35); paper → cardboard (33); general → glass (33)
- **Gemma 4 26B-A4B · open weights, via gateway**: general → plastic (65); general → paper (27); plastic → glass (19); glass → plastic (18); paper → cardboard (16)
- **Gemini 3.5 Flash-Lite · cloud (production)**: general → plastic (68); general → paper (32); paper → cardboard (17); glass → plastic (16); plastic → glass (9)
- **Gemini Decision 1 · decision model, cloud**: general → plastic (178); general → paper (30); glass → plastic (25); paper → cardboard (22); paper → textile (9)

## Calibration (accuracy within each confidence band)

- **SigLIP 2 base · on device, 8-bit (until 22 Nov 2026)**: 0.00–0.50: 36.4% of 698; 0.50–0.70: 61.2% of 541; 0.70–0.90: 88.1% of 773; 0.90–0.97: 97.3% of 525; 0.97–1.00: 99.4% of 633
- **SigLIP 2 base · cloud (full precision, 224 px)**: 0.00–0.50: 25.7% of 276; 0.50–0.70: 48.2% of 309; 0.70–0.90: 74.3% of 435; 0.90–0.97: 92.8% of 503; 0.97–1.00: 99.2% of 1647
- **Gemma 4 26B-A4B · open weights, via gateway**: 0.50–0.70: 0.0% of 2; 0.70–0.90: 32.6% of 43; 0.90–0.97: 76.0% of 701; 0.97–1.00: 98.2% of 2424
- **Gemini 3.5 Flash-Lite · cloud (production)**: 0.70–0.90: 33.3% of 15; 0.90–0.97: 75.2% of 505; 0.97–1.00: 98.3% of 2650
- **Gemini Decision 1 · decision model, cloud**: 0.00–0.50: 49.4% of 154; 0.50–0.70: 58.8% of 240; 0.70–0.90: 80.8% of 551; 0.90–0.97: 98.1% of 885; 0.97–1.00: 99.0% of 1340

## Cascade: SigLIP 2 on device, 8-bit, escalate to Gemini 3.5 Flash-Lite when confidence < τ

| τ | Escalated | Material accuracy | Bin accuracy | Severity / 100 | Cost / 1,000 | p50 / p95 latency |
|---|---|---|---|---|---|---|
| 0.00 | 0.0% | 75.9% | 83.4% | 34.8 | $0.000 | 104 / 129 ms |
| 0.30 | 4.5% | 78.6% | 85.5% | 30.7 | $0.020 | 105 / 156 ms |
| 0.40 | 12.5% | 83.0% | 88.7% | 23.7 | $0.054 | 106 / 1370 ms |
| 0.50 | 22.0% | 87.2% | 91.6% | 18.6 | $0.095 | 108 / 1432 ms |
| 0.60 | 30.2% | 89.9% | 93.3% | 14.5 | $0.130 | 110 / 1481 ms |
| 0.70 | 39.1% | 92.2% | 94.9% | 12.3 | $0.168 | 115 / 1518 ms |
| 0.80 | 49.1% | 93.4% | 95.6% | 11.1 | $0.211 | 138 / 1545 ms |
| 0.90 | 63.5% | 94.1% | 96.1% | 10.5 | $0.273 | 1232 / 1600 ms |
| 0.95 | 73.8% | 94.3% | 96.2% | 10.7 | $0.318 | 1271 / 1614 ms |
| 0.99 | 88.9% | 94.3% | 96.2% | 10.7 | $0.383 | 1306 / 1644 ms |
| 1.01 | 100.0% | 94.3% | 96.3% | 10.7 | $0.431 | 1326 / 1670 ms |

## Cascade: SigLIP 2 on device, 8-bit, escalate to Gemini Decision 1 when confidence < τ

| τ | Escalated | Material accuracy | Bin accuracy | Severity / 100 | Cost / 1,000 | p50 / p95 latency |
|---|---|---|---|---|---|---|
| 0.00 | 0.0% | 75.9% | 83.4% | 34.8 | $0.000 | 104 / 129 ms |
| 0.30 | 4.5% | 78.0% | 84.9% | 32.4 | $0.006 | 105 / 156 ms |
| 0.40 | 12.5% | 81.7% | 87.4% | 27.7 | $0.015 | 106 / 929 ms |
| 0.50 | 22.0% | 85.3% | 89.7% | 24.4 | $0.027 | 108 / 1000 ms |
| 0.60 | 30.2% | 87.3% | 90.7% | 22.4 | $0.037 | 110 / 1038 ms |
| 0.70 | 39.1% | 88.9% | 91.7% | 21.6 | $0.048 | 115 / 1062 ms |
| 0.80 | 49.1% | 89.7% | 92.1% | 21.4 | $0.060 | 138 / 1093 ms |
| 0.90 | 63.5% | 90.0% | 92.3% | 21.6 | $0.077 | 798 / 1133 ms |
| 0.95 | 73.8% | 90.2% | 92.3% | 21.9 | $0.090 | 839 / 1154 ms |
| 0.99 | 88.9% | 90.1% | 92.3% | 22.0 | $0.109 | 872 / 1179 ms |
| 1.01 | 100.0% | 90.1% | 92.4% | 22.0 | $0.122 | 891 / 1199 ms |

## Cascade: SigLIP 2 on device, 8-bit, escalate to Gemma 4 26B-A4B when confidence < τ

| τ | Escalated | Material accuracy | Bin accuracy | Severity / 100 | Cost / 1,000 | p50 / p95 latency |
|---|---|---|---|---|---|---|
| 0.00 | 0.0% | 75.9% | 83.4% | 34.8 | $0.000 | 104 / 129 ms |
| 0.30 | 4.5% | 78.4% | 85.2% | 31.7 | $0.002 | 105 / 156 ms |
| 0.40 | 12.5% | 82.5% | 88.4% | 25.2 | $0.007 | 106 / 790 ms |
| 0.50 | 22.0% | 86.4% | 91.3% | 20.5 | $0.012 | 108 / 839 ms |
| 0.60 | 30.2% | 88.9% | 92.8% | 16.9 | $0.016 | 110 / 877 ms |
| 0.70 | 39.1% | 90.9% | 94.3% | 14.7 | $0.021 | 115 / 916 ms |
| 0.80 | 49.1% | 92.0% | 95.1% | 13.9 | $0.026 | 138 / 951 ms |
| 0.90 | 63.5% | 92.4% | 95.5% | 13.9 | $0.034 | 703 / 1020 ms |
| 0.95 | 73.8% | 92.4% | 95.6% | 14.0 | $0.039 | 730 / 1063 ms |
| 0.99 | 88.9% | 92.4% | 95.6% | 14.4 | $0.047 | 753 / 1154 ms |
| 1.01 | 100.0% | 92.4% | 95.6% | 14.7 | $0.053 | 766 / 1207 ms |

## Severity weights (Athens bins)

Right bin 0 · battery into any household bin 10 · anything wrong into the blue or brown bin 3 · wrong item into the clothing bank 1 · recyclable or food lost to general waste 1 · wasted trip to a special point 0.5 · no answer 1.
