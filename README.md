# VortexLab-CFD

`VortexLab-CFD` is an interactive computational fluid dynamics laboratory for studying two-dimensional flow around configurable obstacles. The project combines a browser-based Lattice Boltzmann simulator, a C reference solver, and Python post-processing scripts for wake analysis and data export.

The goal is to make a simulation environment that behaves like a small STEM/CFD lab:

- change the fluid, Reynolds number, inlet velocity, domain size, and obstacle geometry
- observe the velocity field, vorticity field, wake growth, and vortex shedding in real time
- export field data and force-history data for later analysis
- run a native C solver for repeatable batch experiments
- analyze wake frequency and estimate Strouhal number with Python

This is an educational and research-oriented reduced-order simulator. It is not a replacement for OpenFOAM, ANSYS Fluent, SU2, or other industrial CFD systems.

## Main Features

- Browser simulator using `HTML`, `CSS`, and plain `JavaScript`
- D2Q9 Lattice Boltzmann Method solver
- Multiple obstacle types: circle, semi-cylinder, ellipse, rectangle, triangle, NACA-style airfoil, and multi-obstacle presets
- Fluid presets: air, water, light oil, and custom parameter entry
- Adjustable `Re`, inlet speed, obstacle size, obstacle angle, and visualization mode
- Realtime canvas rendering for speed, vorticity, density, and obstacle mask
- CSV/JSON export from the browser
- C99 batch solver that writes `.csv` and `.ppm` outputs
- Python wake analysis script for lift-history frequency and Strouhal estimation
- Documentation for theory, geometry, validation, and applications

## Quick Start

### 1. Run the interactive web simulator

Open this file in a browser:

```text
web/index.html
```

On macOS:

```bash
open web/index.html
```

Then use the controls to select a preset, obstacle type, Reynolds number, and visualization mode.

### 2. Run the C reference solver

Compile:

```bash
make all
```

Run a semi-cylinder wake case:

```bash
./build/lbm2d --nx 260 --ny 120 --steps 1800 --re 120 --u 0.055 --obstacle semi --output docs/demo/semi_re120
```

This writes:

```text
docs/demo/semi_re120_timeseries.csv
docs/demo/semi_re120_speed.ppm
docs/demo/semi_re120_vorticity.ppm
```

### 3. Analyze wake frequency

```bash
python3 python/analyze_wake.py docs/demo/semi_re120_timeseries.csv --length 34 --velocity 0.055 --signal cl_proxy --smooth 21
```

### 4. Run tests

```bash
make test
```

### 5. Generate the checked-in demo outputs

```bash
make demo
```

Then inspect `docs/demo/README.md`.

## Repository Structure

```text
web/
  index.html        Interactive simulator UI
  app.js            UI wiring and animation loop
  lbm.js            Browser D2Q9 LBM solver
  geometry.js       Configurable obstacle masks
  renderer.js       Canvas renderer
  exporter.js       CSV/JSON export helpers
  presets.js        Fluids and simulation presets

core/
  lbm2d.c           C99 reference solver

python/
  analyze_wake.py   Strouhal/frequency analysis
  field_tools.py    CSV field helpers

configs/
  *.json            Reproducible simulation presets

docs/
  theory.md
  numerical_method.md
  geometry_system.md
  validation.md
  applications.md
  semi_cylinder_case.md
```

## What Makes This More Than a Static Demo

The simulator recomputes the flow field from the current physical and numerical parameters. Changing the Reynolds number, viscosity, obstacle geometry, angle, or inlet speed changes the resulting wake.

For example:

- Low `Re`: wake remains steady or weakly separated
- Moderate `Re`: asymmetric wake and periodic vortex shedding can emerge
- Semi-cylinder: separation differs between curved and flat sides
- Multiple obstacles: wake interactions appear downstream
- Higher viscosity: vortices diffuse faster and the wake stabilizes

## Numerical Method

The first solver uses the D2Q9 Lattice Boltzmann Method:

- collision: BGK relaxation toward equilibrium
- streaming: distribution functions move along lattice directions
- no-slip walls and obstacles: bounce-back boundary condition
- inlet: imposed velocity equilibrium
- outlet: zero-gradient distribution copy

See `docs/numerical_method.md` for details.

## Validation Strategy

The project is designed to be validated in layers:

- mass conservation trend
- stable Poiseuille/channel-flow behavior
- qualitative lid-driven cavity vortex structure
- circular-cylinder wake behavior around moderate Reynolds numbers
- semi-cylinder wake asymmetry and vortex shedding
- Strouhal estimate from lift-history zero crossings
- field and force-proxy export from the C solver

See `docs/validation.md`.

## Limitations

- The browser solver is optimized for clarity and interactivity, not high-fidelity industrial CFD.
- The current model is 2D and weakly compressible through LBM density variation.
- Turbulence modeling is not included.
- High Reynolds number cases can become unstable on coarse grids.
- Force coefficients are momentum-exchange estimates, useful for trends but not precision engineering certification.
