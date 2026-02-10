# Geolocation Solver Performance Optimization

## Goal
Make the fusion-prep scenario (9 endpoints × ~100 entities) run faster than real time on M4 Mac Mini. Currently runs ~3× slower than real time due to the 3-pass solver pipeline (WLS → NLS Nelder-Mead → Parametric Bootstrap).

## Optimization Phases

| Phase | Optimization | Status | Per-solve Speedup | Cumulative |
|-------|-------------|--------|-------------------|------------|
| 0 | Baseline benchmark | DONE | — | 1× |
| 1 | BFGS + analytical Jacobian | DONE | 3.9× | 3.9× |
| 2 | Numba JIT compilation | DONE | 1.3× | 5.2× |
| 3 | Multiprocessing (conditional) | DONE | 2.8× (parallel) | 16× |
| 4 | Bootstrap tuning (15 samples, 60° gate) | DONE | 1.5× | **24×** |

## Phase 0 Results: Baseline (2026-02-09)

### Performance (per-solve timing, 100 solves each)
| Scenario | Measurements | Spread | Avg ms | P50 ms | P95 ms |
|----------|-------------|--------|--------|--------|--------|
| close_narrow | 100 | 8.2° | 35.5 | 34.3 | 39.9 |
| close_medium | 300 | 18.9° | 47.4 | 45.2 | 52.7 |
| close_wide | 800 | 47.8° | 79.5 | 77.3 | 88.1 |
| far_medium | 300 | 12.2° | 44.7 | 44.7 | 45.5 |
| far_wide | 800 | 26.8° | 73.5 | 72.5 | 83.0 |

### Accuracy (50 trials each)
| Scenario | Spread | Mean Err | Median Err | P90 Err | Bias |
|----------|--------|----------|------------|---------|------|
| close_narrow | 8.1° | 8.43 km | 8.31 km | 15.37 km | -3.85 km |
| close_medium | 18.8° | 1.60 km | 1.48 km | 3.07 km | -0.21 km |
| close_wide | 47.7° | 0.40 km | 0.37 km | 0.74 km | +0.10 km |
| far_medium | 12.1° | 5.52 km | 4.76 km | 12.38 km | -3.24 km |
| far_wide | 26.8° | 1.43 km | 1.20 km | 2.49 km | +0.19 km |

### Bootstrap Impact
| Scenario | Boot Rate | With (ms) | Without (ms) | Speedup | Err With | Err Without |
|----------|-----------|-----------|-------------|---------|----------|-------------|
| close_narrow | 100% | 33.3 | 1.1 | 31.7× | 9.35 km | 17.99 km |
| close_medium | 100% | 44.1 | 1.3 | 32.7× | 1.20 km | 3.35 km |
| close_wide | 100% | 77.7 | 2.3 | 34.2× | 0.44 km | 0.64 km |

### Fusion-Prep Scale (single window boundary)
- 100 entities, single endpoint: **25,153 ms** (251.5 ms/entity)
- Estimated 6 ALWAYS/SOMETIMES endpoints: **150,917 ms**
- Estimated 9-endpoint window boundary: **154,690 ms**
- Target: < 1,000 ms
- **Current shortfall: ~155×**

### Key Takeaways
- Bootstrap is the dominant cost: 31-34× slower than WLS+NLS alone
- Each bootstrap does 30 full WLS+NLS re-solves per entity
- Without bootstrap, per-entity solve is only ~1-2.3 ms (already fast!)
- Bootstrap is critical for accuracy at narrow spreads (halves error)
- The "alongside" scenario has anomalous results — needs investigation

## Phase 1 Results: BFGS (2026-02-09)

### Changes
- Extracted `_angular_cost` closure → module-level function with explicit `args` parameter
- Added `_angular_jacobian` with analytical gradient (∂arctan2/∂x = dy/r², ∂arctan2/∂y = -dx/r²)
- Replaced Nelder-Mead with BFGS + Nelder-Mead fallback
- All 81 tests pass

### Performance
| Scenario | Baseline (ms) | BFGS (ms) | Speedup |
|----------|--------------|-----------|---------|
| close_narrow | 35.5 | 35.4 | 1.0× |
| close_medium | 47.4 | 47.0 | 1.0× |
| close_wide | 79.5 | 65.0 | 1.2× |
| far_medium | 44.7 | 40.6 | 1.1× |
| far_wide | 73.5 | 72.1 | 1.0× |

### Fusion-Prep Scale
- Single endpoint: 25,153 → **6,439 ms** (**3.9× speedup**)
- Per-entity: 251.5 → 64.4 ms
- Estimated 9-endpoint: 154,690 → **39,602 ms**
- Still 40× over target

### Accuracy (unchanged — same cost function minimum)
| Scenario | Baseline Err | BFGS Err | Baseline Bias | BFGS Bias |
|----------|-------------|----------|---------------|-----------|
| close_narrow | 8.43 km | 8.56 km | -3.85 km | -4.28 km |
| close_medium | 1.60 km | 1.61 km | -0.21 km | -0.24 km |
| close_wide | 0.40 km | 0.40 km | +0.10 km | +0.09 km |
| far_medium | 5.52 km | 5.47 km | -3.24 km | -3.05 km |
| far_wide | 1.43 km | 1.44 km | +0.19 km | +0.25 km |

### Key Insight
The big win is NOT in per-solve NLS time (BFGS vs NM both fast for numpy). It's in the **bootstrap multiplier**: each of the 30 bootstrap re-solves also uses BFGS, so the improvement compounds across the full pipeline. The 3.9× at fusion-prep scale reflects this compounding.

## Phase 2 Results: Numba (2026-02-09)

### Changes
- Added `numba>=0.59` to requirements.txt
- Graceful import fallback when numba not installed
- JIT-compiled `_angular_cost_kernel` and `_angular_jacobian_kernel` with `@njit(cache=True)`
- Scalar loops (faster than numpy dispatch for N=100-800 when JIT'd)
- Module-level warmup to avoid first-call latency
- All 81 tests pass (20% faster test suite: 112s vs 136s)

### Fusion-Prep Scale
- Single endpoint: 25,153 → 6,439 → **4,816 ms** (cumulative **5.2×**)
- Per-entity: 251.5 → 64.4 → 48.2 ms

### Key Insight
Numba gives a modest 1.3× incremental gain because the NLS cost/jacobian evals (now JIT'd) are no longer the bottleneck. With BFGS (~50 evals), the NLS pass is already fast. The remaining time is dominated by **Python-level bootstrap orchestration** (creating 30 sets of BearingMeasurement objects, computing centroids, building A/b matrices). This overhead can't be JIT'd because it involves Python objects and list comprehensions.

The real wins from here are: (a) parallelizing entity solves across cores (Phase 3) and (b) reducing the 30× bootstrap multiplier (Phase 4).

## Phase 3 Results: Multiprocessing (2026-02-09)

### Changes
- Added `solve_batch_parallel()` in geolocation.py using `ProcessPoolExecutor`
- Lazy pool init with `min(8, cpu_count - 2)` workers (8 workers on 10-core M4)
- Min batch size threshold (8) to avoid overhead for small batches
- Refactored `TrackManager._generate_reports()` to batch collect → parallel solve → assemble
- All 52 tests pass (track manager + geolocation + bias)

### Fusion-Prep Scale
- Sequential: 4,451 ms → **Parallel: 1,575 ms** (**2.8× parallel speedup**)
- Baseline → current: 25,153 → 1,575 ms (**16× cumulative**)
- Estimated 9-endpoint: 154,690 → **9,687 ms**

### Key Insight
Parallel speedup is 2.8× rather than theoretical 8× because pickle serialization of BearingMeasurement lists (100-800 measurements per entity) has significant overhead (~5-10ms per entity). With 100 entities, the serialize/deserialize cost eats into the gains. At 10× scale (1000 entities), the amortization would improve.

## Phase 4 Results: Bootstrap Tuning (2026-02-09)

### A/B Test Results (50 trials each, 6 configurations × 3 spread levels)
| Config | close_narrow err | close_medium err | close_wide err | close_narrow ms | close_medium ms | close_wide ms |
|--------|-----------------|-----------------|---------------|----------------|----------------|--------------|
| n=30, gate=80° | 9.10 km | 1.43 km | 0.41 km | 27.3 | 37.1 | 60.7 |
| n=20, gate=80° | 8.86 km | 1.45 km | 0.42 km | 18.7 | 25.6 | 41.2 |
| n=15, gate=80° | 9.11 km | 1.50 km | 0.40 km | 14.3 | 19.5 | 32.1 |
| n=30, gate=60° | 8.97 km | 1.46 km | 0.40 km | 28.0 | 37.5 | 59.1 |
| n=20, gate=60° | 9.04 km | 1.46 km | 0.42 km | 19.3 | 25.3 | 40.3 |
| **n=15, gate=60°** | **8.89 km** | **1.48 km** | **0.41 km** | **16.1** | **19.0** | **31.5** |

### Chosen Configuration: n=15, gate=60°
- **No measurable accuracy loss** across any scenario
- **~2× faster** per-solve (30→15 samples halves bootstrap cost)
- All 96 tests pass

### Final Fusion-Prep Scale (all optimizations combined)
| Metric | Baseline | Final | Speedup |
|--------|---------|-------|---------|
| Single EP sequential | 25,153 ms | 2,413 ms | 10.4× |
| Single EP parallel | — | 1,038 ms | **24×** |
| Per-entity | 251.5 ms | 10.4 ms | 24× |
| Est. 9-endpoint | 154,690 ms | 6,384 ms | **24×** |
| Test suite time | 136 s | 89 s | 1.5× |

### Remaining Gap
Still 6.4× from the 1,000 ms target for a 9-endpoint window boundary. However:
- Window boundaries occur every 10 ticks (1 second each)
- The 6.4s is amortized: 640ms/tick average across the 10-tick window
- Non-window-boundary ticks are nearly instant (~10ms for AOA accumulation)
- The system should run very close to real time

## Key Files
- Benchmark script: `disco_data_emulator/benchmarks/solver_performance.py`
- Benchmark results: `disco_data_emulator/benchmarks/results.json`
- Solver: `disco_data_emulator/endpoint_emulator/simulation/tracking/geolocation.py`
- Track manager: `disco_data_emulator/endpoint_emulator/simulation/tracking/track_manager.py`
- Test suite: `disco_data_emulator/tests/test_geolocation.py`, `test_bias_investigation.py`
