#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
from pathlib import Path
from statistics import mean


def read_timeseries(path: Path) -> list[dict[str, float]]:
    rows: list[dict[str, float]] = []
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        for row in reader:
            rows.append({key: float(value) for key, value in row.items() if value != ""})
    return rows


def moving_average(values: list[tuple[float, float]], window: int) -> list[tuple[float, float]]:
    if window <= 1 or len(values) <= window:
        return values
    half = window // 2
    smoothed: list[tuple[float, float]] = []
    for idx in range(len(values)):
        low = max(0, idx - half)
        high = min(len(values), idx + half + 1)
        smoothed.append((values[idx][0], mean(value for _, value in values[low:high])))
    return smoothed


def zero_crossing_periods(values: list[tuple[float, float]], min_amplitude: float) -> list[float]:
    crossings: list[float] = []
    for idx in range(1, len(values)):
        t0, y0 = values[idx - 1]
        t1, y1 = values[idx]
        if abs(y0) < min_amplitude and abs(y1) < min_amplitude:
            continue
        if (y0 < 0 < y1) or (y0 > 0 > y1):
            frac = abs(y0) / max(abs(y1 - y0), 1e-12)
            crossings.append(t0 + frac * (t1 - t0))
    periods: list[float] = []
    for idx in range(2, len(crossings)):
        periods.append(crossings[idx] - crossings[idx - 2])
    return periods


def analyze(
    rows: list[dict[str, float]],
    length: float,
    velocity: float,
    discard_fraction: float,
    signal: str = "cl_proxy",
    smooth: int = 9,
) -> dict[str, float | int | str | None]:
    if not rows:
        return {
            "samples": 0,
            "mean_cd": None,
            "rms_cl": None,
            "signal": signal,
            "frequency_lattice_steps": None,
            "strouhal": None,
        }
    start = int(len(rows) * discard_fraction)
    window = rows[start:]
    raw_signal = [(row["step"], row[signal]) for row in window if signal in row]
    if raw_signal:
        signal_mean = mean(value for _, value in raw_signal)
        raw_signal = [(step, value - signal_mean) for step, value in raw_signal]
    cl_values = moving_average(raw_signal, smooth)
    cd_values = [row["cd_proxy"] for row in window]
    max_signal = max((abs(value) for _, value in cl_values), default=0.0)
    periods = zero_crossing_periods(cl_values, min_amplitude=max_signal * 0.05)
    rms_cl = (sum(row["cl_proxy"] ** 2 for row in window) / len(window)) ** 0.5
    if periods:
      period = mean(periods)
      frequency = 1.0 / period
      strouhal = frequency * length / velocity
    else:
      frequency = None
      strouhal = None
    return {
        "samples": len(rows),
        "analysis_samples": len(window),
        "signal": signal,
        "smooth_window": smooth,
        "mean_cd": mean(cd_values),
        "rms_cl": rms_cl,
        "frequency_lattice_steps": frequency,
        "strouhal": strouhal,
        "zero_crossing_periods": len(periods),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Analyze VortexLab-CFD lift history and estimate wake frequency.")
    parser.add_argument("csv", type=Path, help="timeseries CSV produced by the C solver or browser export")
    parser.add_argument("--length", type=float, required=True, help="characteristic length in lattice cells")
    parser.add_argument("--velocity", type=float, required=True, help="inlet lattice velocity")
    parser.add_argument("--discard", type=float, default=0.35, help="fraction of transient samples to discard")
    parser.add_argument("--signal", default="cl_proxy", help="CSV signal column used for frequency estimation")
    parser.add_argument("--smooth", type=int, default=9, help="moving-average smoothing window for frequency signal")
    parser.add_argument("--json", type=Path, default=None, help="optional JSON output path")
    args = parser.parse_args()

    rows = read_timeseries(args.csv)
    result = analyze(
        rows,
        length=args.length,
        velocity=args.velocity,
        discard_fraction=args.discard,
        signal=args.signal,
        smooth=args.smooth,
    )
    print(json.dumps(result, indent=2))
    if args.json:
        args.json.parent.mkdir(parents=True, exist_ok=True)
        args.json.write_text(json.dumps(result, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
