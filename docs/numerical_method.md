# Numerical Method

The first solver uses the D2Q9 Lattice Boltzmann Method (LBM). Instead of solving the Navier-Stokes equations directly for pressure and velocity, LBM evolves distribution functions on a lattice.

## D2Q9 Lattice

D2Q9 uses nine discrete velocity directions:

```text
0: rest
1: east       2: north       3: west       4: south
5: northeast 6: northwest    7: southwest 8: southeast
```

At every cell, the solver stores nine distribution values `f_i`.

Macroscopic density and velocity are recovered by:

```text
rho = sum_i f_i
u = (sum_i f_i c_i) / rho
```

## Collision

The BGK collision model relaxes distributions toward equilibrium:

```text
f_i* = f_i - omega (f_i - f_i_eq)
```

where `omega = 1 / tau`.

The lattice viscosity is:

```text
nu = (tau - 0.5) / 3
```

The code computes `tau` from the target Reynolds number, inlet velocity, and obstacle length.

## Streaming

After collision, each distribution moves to its neighboring cell along direction `c_i`.

## Boundary Conditions

- Obstacles and walls use bounce-back no-slip boundaries.
- Inlet cells are reset to an equilibrium distribution with the target inlet velocity.
- Outlet cells copy distributions from the previous interior column as a zero-gradient approximation.

## Stability Notes

The browser simulator clamps the lattice viscosity to avoid the most unstable parameter ranges. High Reynolds number cases still require finer grids and smaller effective velocities.

