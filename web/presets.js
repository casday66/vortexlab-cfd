(function () {
  const fluids = {
    water: {
      name: "Water",
      density: 997.0,
      kinematicViscosity: 1.0e-6
    },
    air: {
      name: "Air",
      density: 1.225,
      kinematicViscosity: 1.5e-5
    },
    lightOil: {
      name: "Light oil",
      density: 860.0,
      kinematicViscosity: 5.0e-5
    },
    custom: {
      name: "Custom / lattice units",
      density: 1.0,
      kinematicViscosity: 1.0
    }
  };

  const simulations = {
    semiWake: {
      label: "Water semi-cylinder wake",
      domain: { nx: 260, ny: 120 },
      fluidKey: "water",
      flow: { reynolds: 120, latticeVelocity: 0.055, profile: "uniform", perturbation: 0.0012 },
      solver: { stepsPerFrame: 8 },
      obstacles: [
        { type: "semi", x: 78, y: 60, radius: 17, angleDeg: 0 }
      ]
    },
    cylinderWake: {
      label: "Circular cylinder wake",
      domain: { nx: 280, ny: 130 },
      fluidKey: "air",
      flow: { reynolds: 110, latticeVelocity: 0.052, profile: "uniform", perturbation: 0.0012 },
      solver: { stepsPerFrame: 8 },
      obstacles: [
        { type: "circle", x: 82, y: 65, radius: 17, angleDeg: 0 }
      ]
    },
    airfoil: {
      label: "Airfoil at angle of attack",
      domain: { nx: 310, ny: 140 },
      fluidKey: "air",
      flow: { reynolds: 260, latticeVelocity: 0.043, profile: "uniform", perturbation: 0.0010 },
      solver: { stepsPerFrame: 6 },
      obstacles: [
        { type: "airfoil", x: 98, y: 70, chord: 58, thickness: 0.12, angleDeg: 9 }
      ]
    },
    multi: {
      label: "Multi-obstacle channel",
      domain: { nx: 320, ny: 150 },
      fluidKey: "water",
      flow: { reynolds: 160, latticeVelocity: 0.050, profile: "parabolic", perturbation: 0.0012 },
      solver: { stepsPerFrame: 7 },
      obstacles: [
        { type: "circle", x: 90, y: 62, radius: 14, angleDeg: 0 },
        { type: "ellipse", x: 158, y: 92, rx: 13, ry: 24, angleDeg: 25 },
        { type: "triangle", x: 220, y: 70, size: 32, angleDeg: -12 }
      ]
    },
    viscousOil: {
      label: "High-viscosity damping",
      domain: { nx: 250, ny: 115 },
      fluidKey: "lightOil",
      flow: { reynolds: 45, latticeVelocity: 0.045, profile: "uniform", perturbation: 0.0005 },
      solver: { stepsPerFrame: 9 },
      obstacles: [
        { type: "rectangle", x: 82, y: 58, width: 26, height: 38, angleDeg: 20 }
      ]
    }
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  window.VortexPresets = {
    fluids,
    simulations,
    clone,
    defaultConfig() {
      return clone(simulations.semiWake);
    }
  };
})();
