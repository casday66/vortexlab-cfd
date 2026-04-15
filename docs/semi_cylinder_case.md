# Semi-Cylinder Wake Case

The semi-cylinder case is the main non-symmetric bluff-body example.

## Parameters

Suggested starting point:

```text
nx = 260
ny = 120
Re = 120
U = 0.055
radius = 17
angle = 0 deg
```

## Expected Behavior

The wake should begin as a transient separated region. After enough steps, alternating vortex structures may appear downstream, depending on grid resolution and numerical stability.

Changing `angle_deg` changes which side of the semi-cylinder faces the incoming flow, altering the wake symmetry and lift history.

