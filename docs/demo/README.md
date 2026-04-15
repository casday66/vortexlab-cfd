# Demo Outputs

This folder contains generated outputs from the C reference solver.

Current checked-in demo:

```bash
make demo
```

Generated files:

- `circle_re100_seeded_timeseries.csv`
- `circle_re100_seeded_analysis.json`
- `circle_re100_seeded_speed.ppm`
- `circle_re100_seeded_vorticity.ppm`

Current analysis summary:

```text
effective Re: 100.0
mean Cd proxy: 5.484
RMS Cl proxy: 0.0113
Strouhal: null
```

`Strouhal: null` means the checked-in C demo remains nearly steady after smoothing and does not contain a clean periodic shedding signal. Use the browser simulator or higher-resolution/longer batch runs to explore less stable wake cases.

The `.ppm` images can be opened by many image viewers. On macOS:

```bash
open docs/demo/circle_re100_seeded_speed.ppm
open docs/demo/circle_re100_seeded_vorticity.ppm
```

The force coefficients are proxy values from momentum exchange at bounce-back obstacle boundaries. They are useful for comparing cases inside this simulator, not for certification-grade engineering loads.

The Strouhal estimate is reported only when the selected signal has a clear periodic zero-crossing pattern after smoothing. If the signal is not periodic enough, the analysis intentionally returns `null` instead of inventing a frequency.
