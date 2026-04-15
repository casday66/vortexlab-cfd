# Geometry System

The simulator builds a solid-mask field from configurable obstacle definitions. Each obstacle is evaluated in local coordinates after rotation.

Supported shapes:

- `circle`
- `semi`
- `ellipse`
- `rectangle`
- `triangle`
- `airfoil`

Each obstacle has a center position:

```json
{
  "type": "semi",
  "x": 80,
  "y": 60,
  "radius": 18,
  "angle_deg": 0
}
```

## Local Rotation

For an obstacle angle `theta`, a point is transformed into obstacle-local coordinates before testing containment. This makes angle sweeps possible without changing the solver.

## Multi-Obstacle Cases

The mask is the union of all obstacles. This allows wake interaction experiments such as tandem cylinders, staggered bodies, or mixed bluff-body arrays.

## Custom Extensions

New shapes can be added by implementing a containment test in `web/geometry.js` and `core/lbm2d.c`.

