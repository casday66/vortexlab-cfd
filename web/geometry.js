(function () {
  function degToRad(deg) {
    return deg * Math.PI / 180;
  }

  function localPoint(obstacle, x, y) {
    const angle = -degToRad(obstacle.angleDeg || obstacle.angle_deg || 0);
    const dx = x - obstacle.x;
    const dy = y - obstacle.y;
    const c = Math.cos(angle);
    const s = Math.sin(angle);
    return {
      x: c * dx - s * dy,
      y: s * dx + c * dy
    };
  }

  function insideTriangle(px, py, size) {
    const h = size * Math.sqrt(3) / 2;
    const ax = -size / 2;
    const ay = h / 3;
    const bx = size / 2;
    const by = h / 3;
    const cx = 0;
    const cy = -2 * h / 3;
    const d1 = sign(px, py, ax, ay, bx, by);
    const d2 = sign(px, py, bx, by, cx, cy);
    const d3 = sign(px, py, cx, cy, ax, ay);
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(hasNeg && hasPos);
  }

  function sign(px, py, ax, ay, bx, by) {
    return (px - bx) * (ay - by) - (ax - bx) * (py - by);
  }

  function insideAirfoil(px, py, chord, thickness) {
    const x = px + chord / 2;
    if (x < 0 || x > chord) {
      return false;
    }
    const xc = Math.max(0.0001, Math.min(0.9999, x / chord));
    const t = thickness || 0.12;
    const yt = 5 * t * chord * (
      0.2969 * Math.sqrt(xc)
      - 0.1260 * xc
      - 0.3516 * xc * xc
      + 0.2843 * xc * xc * xc
      - 0.1015 * xc * xc * xc * xc
    );
    return Math.abs(py) <= Math.max(1.0, yt);
  }

  function contains(obstacle, x, y) {
    const p = localPoint(obstacle, x, y);
    const type = obstacle.type;
    if (type === "circle") {
      const r = obstacle.radius || obstacle.size || 16;
      return p.x * p.x + p.y * p.y <= r * r;
    }
    if (type === "semi") {
      const r = obstacle.radius || obstacle.size || 16;
      return p.x >= 0 && p.x * p.x + p.y * p.y <= r * r;
    }
    if (type === "ellipse") {
      const rx = obstacle.rx || obstacle.radius || obstacle.size || 18;
      const ry = obstacle.ry || obstacle.radius || obstacle.size * 0.65 || 12;
      return (p.x * p.x) / (rx * rx) + (p.y * p.y) / (ry * ry) <= 1;
    }
    if (type === "rectangle") {
      const w = obstacle.width || obstacle.w || (obstacle.size || 18) * 1.5;
      const h = obstacle.height || obstacle.h || obstacle.size || 18;
      return Math.abs(p.x) <= w / 2 && Math.abs(p.y) <= h / 2;
    }
    if (type === "triangle") {
      return insideTriangle(p.x, p.y, obstacle.size || 28);
    }
    if (type === "airfoil") {
      return insideAirfoil(p.x, p.y, obstacle.chord || (obstacle.size || 24) * 2.5, obstacle.thickness || 0.12);
    }
    return false;
  }

  function characteristicLength(obstacles) {
    let length = 20;
    for (const obstacle of obstacles) {
      if (obstacle.type === "airfoil") {
        length = Math.max(length, obstacle.chord || 50);
      } else if (obstacle.type === "ellipse") {
        length = Math.max(length, 2 * Math.max(obstacle.rx || 12, obstacle.ry || 12));
      } else if (obstacle.type === "rectangle") {
        length = Math.max(length, Math.max(obstacle.width || 24, obstacle.height || 24));
      } else if (obstacle.type === "triangle") {
        length = Math.max(length, obstacle.size || 28);
      } else {
        length = Math.max(length, 2 * (obstacle.radius || obstacle.size || 16));
      }
    }
    return length;
  }

  function buildSolidMask(nx, ny, obstacles, includeChannelWalls) {
    const solid = new Uint8Array(nx * ny);
    const walls = includeChannelWalls !== false;
    for (let y = 0; y < ny; y++) {
      for (let x = 0; x < nx; x++) {
        const i = y * nx + x;
        if (walls && (y === 0 || y === ny - 1)) {
          solid[i] = 1;
          continue;
        }
        for (const obstacle of obstacles) {
          if (contains(obstacle, x + 0.5, y + 0.5)) {
            solid[i] = 1;
            break;
          }
        }
      }
    }
    return solid;
  }

  window.VortexGeometry = {
    contains,
    buildSolidMask,
    characteristicLength
  };
})();

