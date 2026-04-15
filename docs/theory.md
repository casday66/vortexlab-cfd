# Theory

`VortexLab-CFD` studies incompressible-like two-dimensional flow around bluff bodies. The central nondimensional parameter is the Reynolds number:

```text
Re = U L / nu
```

where:

- `U` is the inlet velocity
- `L` is a characteristic obstacle length
- `nu` is the kinematic viscosity

Low Reynolds numbers are dominated by viscous diffusion. Higher Reynolds numbers make inertial effects stronger, which can produce boundary-layer separation, wake instability, and vortex shedding.

## Flow Around Bluff Bodies

A bluff body is an object whose shape causes separated flow and a large wake. Examples include bridge piers, offshore piles, building edges, cylinders, semi-cylinders, and vortex flow meter bodies.

Important quantities:

- velocity magnitude `|u|`
- vorticity `omega = dv/dx - du/dy`
- drag proxy `Cd`
- lift proxy `Cl`
- vortex shedding frequency `f`
- Strouhal number `St = f L / U`

## Semi-Cylinder Motivation

A semi-cylinder has a curved side and a flat side. This breaks symmetry and changes the separation mechanism compared with a circular cylinder. Rotating the semi-cylinder changes how the incoming flow meets the flat and curved faces, making it a useful geometry for studying wake asymmetry.

