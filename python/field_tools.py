from __future__ import annotations

import csv
from pathlib import Path


def read_field_csv(path: Path) -> list[dict[str, float]]:
    with path.open("r", encoding="utf-8", newline="") as handle:
        reader = csv.DictReader(handle)
        return [{key: float(value) for key, value in row.items()} for row in reader]


def field_bounds(rows: list[dict[str, float]]) -> dict[str, float]:
    if not rows:
        return {
            "max_speed": 0.0,
            "max_abs_vorticity": 0.0,
            "fluid_cells": 0,
            "solid_cells": 0,
        }
    max_speed = max(row.get("speed", 0.0) for row in rows)
    max_abs_vorticity = max(abs(row.get("vorticity", 0.0)) for row in rows)
    solid_cells = sum(1 for row in rows if int(row.get("solid", 0.0)) == 1)
    return {
        "max_speed": max_speed,
        "max_abs_vorticity": max_abs_vorticity,
        "fluid_cells": len(rows) - solid_cells,
        "solid_cells": solid_cells,
    }

