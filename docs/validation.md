# Validation

The current project focuses on layered validation rather than claiming industrial CFD accuracy.

## 1. Numerical Sanity Checks

- density should remain bounded near `rho = 1`
- the flow should not explode for stable Reynolds/grid combinations
- no-slip obstacles should visibly create wakes
- increasing viscosity should damp vortices

## 2. Channel Flow

A parabolic inlet profile can be used to test whether the solver maintains a channel-like flow structure.

## 3. Circular Cylinder Wake

At moderate Reynolds numbers, a circular cylinder should produce an alternating wake after a transient. The exact Strouhal number depends on grid resolution and boundary conditions, but the emergence of periodic lift oscillations is an important qualitative check.

## 4. Semi-Cylinder Wake

The semi-cylinder case should show wake asymmetry when the flat and curved sides interact differently with the inlet flow. Rotating the body should alter the separation and lift-history signal.

## 5. Force and Strouhal Analysis

The C and browser solvers estimate drag/lift using momentum exchange at bounce-back boundaries. The Python script estimates shedding frequency from lift-history zero crossings:

```bash
python3 python/analyze_wake.py docs/demo/semi_re120_timeseries.csv --length 34 --velocity 0.055
```

These values are best interpreted as trend metrics, not certification-grade force coefficients.

