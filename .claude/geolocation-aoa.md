# AOA Geolocation — Development Notes

## Architecture

### Solver Pipeline (geolocation.py)
`solve_wls_bearings()` runs a 3-pass pipeline for ALWAYS/SOMETIMES modes:

1. **Pass 1 — WLS**: Linearized bearing-line intersection (Cartesian least squares). Fast initial estimate. Includes bearing-density diversity weighting (1/sqrt(N) per bin) for SPG scenarios.
2. **Pass 2 — NLS**: Direct angular nonlinear least squares (Nelder-Mead). Minimizes angular residuals directly, avoiding Cartesian linearization bias. Seeded from WLS estimate.
3. **Pass 3 — Parametric Bootstrap**: Bias correction for limited angular diversity. Generates 30 synthetic measurement sets from the NLS estimate, re-solves each with WLS+NLS, subtracts estimated bias. Only fires when bearing spread < 80°.

NEVER mode uses only Pass 1 (plain WLS, no diversity weighting).

Prior-update fusion (`update_with_prior`) combines successive window estimates using information-form Gaussian fusion.

### Key Files
- `geolocation.py` — 3-pass solver (`solve_wls_bearings`) + bootstrap debiasing (`_bootstrap_debias`) + prior-update fusion (`update_with_prior`)
- `track_manager.py` — per-endpoint track lifecycle, calls solver at observation window boundaries
- `aoa_model.py` — bearing/sigma computation, FOV checks (vectorized numpy)
- `noise_model.py` — signal noise application
- `enhanced_measurement_model.py` — enhanced pipeline orchestration (per-tick observation generation)
- `visibility_check.py` — range + radio horizon checks

## Key Design Decisions

### Bearing-density diversity weighting (1/sqrt(N) per bin)
- SPG (single-platform geolocation) accumulates measurements over time
- A northbound platform looking east gets many bearings near ~90° but few at other angles
- Without weighting, dense clusters at ~90° drown out rare cross-bearing measurements
- 1/sqrt(N) gives each direction sqrt(N) total weight — balances noise averaging vs diversity
- Only used in ALWAYS/SOMETIMES modes (`diversity_weighted=True`)

### Bearing spread quality gate (10°)
- WLS with near-parallel bearing lines "solves" by finding intersection near observer centroid
- Linearized covariance is misleadingly small — doesn't reflect true along-bearing uncertainty
- Bearing spread directly measures geometric diversity
- DEFAULT_MIN_BEARING_SPREAD_DEG = 10.0 in TrackManager
- Also has DEFAULT_MIN_REPORT_COUNT = 200

### Direct Angular NLS Refinement — Feb 2026

**Problem:** Cartesian WLS linearizes bearing constraints as `cos(θ)*x - sin(θ)*y = RHS`, which minimizes perpendicular km distance to bearing lines — NOT angular error. With measurement noise, this creates systematic near-field bias pulling estimates toward observers. Bias scales as σ² (sigma=1° → ~0.7km, sigma=2° → ~3.6km, sigma=5° → ~20km).

**Why IRLS (range-reweighting) failed:** We first tried iterative range-reweighted least squares (Gauss-Newton, reweight by 1/range²). In SPG geometry, all observations come from similar range, so reweighting doesn't change relative weights. IRLS converged in 2 iterations with essentially zero shift from plain WLS. The bias is in the linearization itself, not in range differences.

**Solution:** Direct angular nonlinear least squares using scipy's Nelder-Mead optimizer:
- Minimizes `Σ (angular_residual / σ)² * density_weight` directly
- Seeded from WLS initial estimate
- No Jacobian needed (derivative-free optimizer)
- `NLS_MAX_ITERATIONS = 2000` (function evaluations)
- Convergence tolerances: `xatol=0.001` km, `fatol=1e-10`
- Falls back to WLS if NLS doesn't improve cost
- Only runs in ALWAYS/SOMETIMES modes (`diversity_weighted=True`)
- NEVER mode is completely unchanged (uses plain WLS)
- Covariance still computed from linearized WLS weights (approximation)
- Requires `scipy>=1.11` (added to requirements.txt)

**Performance:** NLS adds negligible overhead — live system runs at 0.1% CPU utilization with 1 entity at 1s ticks.

**NLS alone was NOT enough — persistent near-field bias at realistic speed:**
The 50-trial test that declared NLS "unbiased" used 0.74 km/tick (2664 km/h) — 6.7× faster than the live system's 400 km/h. At that unrealistic speed, measurements span 80°+ of angular diversity where bias is naturally negligible. At realistic speed (300 ticks = 33 km transit, ~27° spread), the NLS still had -1.03 km bias with only 6% of estimates beyond the target.

### Parametric Bootstrap Bias Correction — Feb 2026

**Root cause:** Bearing-only localization has an inherent finite-sample near-field bias. Noise in bearing angles maps asymmetrically to range errors, pulling the MLE (and WLS) toward the observer. The bias is significant at bearing spreads below ~50° and vanishes above ~80°.

**Bias vs bearing spread (before bootstrap):**
| Spread | Bias | Far-side % |
|--------|------|-----------|
| 10.5°  | -8.88 km | 0% |
| 17.6°  | -2.57 km | 7% |
| 26.9°  | -1.11 km | 7% |
| 49.0°  | -0.23 km | 13% |
| 81.4°  | -0.06 km | 33% |
| 127.9° | +0.02 km | 60% |

**Solution:** Parametric bootstrap bias correction (Pass 3 after WLS+NLS):
1. Treat the NLS estimate x_hat as the "true" position
2. Generate 30 synthetic measurement sets (same observer positions, new noise)
3. Re-solve each with full WLS+NLS pipeline (without bootstrap — `_apply_bootstrap=False`)
4. Bias estimate = mean(bootstrap solutions) - x_hat
5. Corrected = x_hat - bias

**Key detail:** The bootstrap must use the full WLS+NLS pipeline (not NLS-only) for each synthetic sample. NLS-only from x_hat doesn't properly explore the bias structure. The `_apply_bootstrap` flag prevents infinite recursion.

**Bearing-spread gate:** Bootstrap only applied when bearing spread < 80° (where bias > 0.1 km). Above 80°, bias is negligible and the 30× NLS overhead is unnecessary. This keeps unit tests fast.

**After bootstrap:**
| Spread | Bias | Far-side % |
|--------|------|-----------|
| 10.5°  | -1.41 km | 40% |
| 17.6°  | +0.09 km | 57% |
| 26.9°  | -0.12 km | 37% |
| 49.0°  | -0.01 km | 57% |

**Live system verification (debug-single, 30 reports):**
- 47% beyond target, 53% near-field (ideal: 50/50)
- Mean bias: +0.08 km (essentially zero)
- Std: 0.44 km
- Both sides of truth represented

**Test coverage:**
- `TestMLEIterativeRefinement` in test_geolocation.py (existing, all pass)
- `test_bias_investigation.py` — comprehensive stages 1-7 investigation
- All 189 tests pass in ~80 seconds

## debug-single Scenario
- 1 ALWAYS endpoint at (14.5°N, 115.0°E) heading north at 400 km/h
- 1 stationary target at (15.0°N, 115.5°E) — moved closer during investigation
- Alongside geometry with boresight roughly toward target
- Transit reversal: `onArrival: "reverse"` between (14.5, 115) and (16.0, 115)
- min_report_count: 2, observation_window: 10
- Good for testing SPG convergence and bias

## Querying Entity Reports from Surrogate
- Entity reports API: `GET http://localhost:8765/apidocs/entities/getLatest?max_count=100`
- Response uses `tasks` as the JSON key (not `entity_reports` or `items`)
- Each item has `position.latitude`, `position.longitude`, `source_entity_uuid`, etc.

## Lessons Learned
- Don't rabbit-hole on surrogate server TypeScript issues when investigating emulator geolocation
- Python stdout buffering: use `PYTHONUNBUFFERED=1` when running emulator to see logs in real time
- Surrogate server start command: `npx tsx server.ts` from surrogate directory
- Emulator start: `cd disco_data_emulator && source .venv/bin/activate && PYTHONUNBUFFERED=1 PYTHONPATH="$(pwd)" python -m endpoint_emulator.emulator_server`
- Entity reports path is `/apidocs/entities/` (NOT `/apidocs/entityreports/`)
- IRLS (range-reweighting) doesn't help SPG bias — the bias is in linearization, not range differences
- Single-run correlation: reports from one noise realization share most measurements, so apparent bias in one run doesn't mean the estimator is biased
- When restarting emulator after code changes, must fully kill old process (kill -9) and verify port is free with `lsof -ti:8766`
- **CRITICAL: Unit tests must use realistic speeds.** The original 50-trial "unbiased" test used 6.7× real speed, masking the bias. Always match test conditions to live system parameters.
- Bearing-only TMA near-field bias is inherent to the MLE — it's not a bug in the cost function or a spherical/flat-earth mismatch. The fix must be a bias correction technique, not a different cost function.
- Parametric bootstrap correction must use the full estimation pipeline (WLS+NLS) for each sample, not just NLS. NLS starting from x_hat doesn't properly explore the bias.
