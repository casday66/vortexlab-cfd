(function () {
  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function colorRamp(value) {
    const v = clamp(value, 0, 1);
    const r = Math.floor(255 * Math.max(0, 1.7 * v - 0.45));
    const g = Math.floor(255 * Math.sin(Math.PI * clamp(v, 0, 1)));
    const b = Math.floor(255 * Math.max(0, 1.2 - 1.4 * v));
    return [r, g, b];
  }

  function signedRamp(value) {
    const v = clamp((value + 1) * 0.5, 0, 1);
    if (v < 0.5) {
      const t = v / 0.5;
      return [
        Math.floor(15 + 80 * t),
        Math.floor(75 + 130 * t),
        Math.floor(160 + 70 * t)
      ];
    }
    const t = (v - 0.5) / 0.5;
    return [
      Math.floor(230 + 25 * t),
      Math.floor(230 - 120 * t),
      Math.floor(220 - 190 * t)
    ];
  }

  function vorticityAt(sim, x, y) {
    if (x <= 0 || y <= 0 || x >= sim.nx - 1 || y >= sim.ny - 1) {
      return 0;
    }
    const left = y * sim.nx + x - 1;
    const right = y * sim.nx + x + 1;
    const down = (y - 1) * sim.nx + x;
    const up = (y + 1) * sim.nx + x;
    return 0.5 * (sim.uy[right] - sim.uy[left]) - 0.5 * (sim.ux[up] - sim.ux[down]);
  }

  function renderFlow(sim, canvas, mode) {
    if (canvas.width !== sim.nx || canvas.height !== sim.ny) {
      canvas.width = sim.nx;
      canvas.height = sim.ny;
    }
    const ctx = canvas.getContext("2d");
    const image = ctx.createImageData(sim.nx, sim.ny);
    const scaleSpeed = Math.max(0.06, sim.uIn * 2.6);
    const scaleVort = Math.max(0.012, sim.uIn * 0.55);

    for (let y = 0; y < sim.ny; y++) {
      for (let x = 0; x < sim.nx; x++) {
        const i = y * sim.nx + x;
        const p = i * 4;
        let rgb;
        if (sim.solid[i]) {
          rgb = [2, 8, 10];
        } else if (mode === "mask") {
          rgb = [16, 227, 207];
        } else if (mode === "density") {
          rgb = signedRamp((sim.rho[i] - 1.0) / 0.04);
        } else if (mode === "vorticity") {
          rgb = signedRamp(vorticityAt(sim, x, y) / scaleVort);
        } else {
          const speed = Math.sqrt(sim.ux[i] * sim.ux[i] + sim.uy[i] * sim.uy[i]);
          rgb = colorRamp(speed / scaleSpeed);
        }
        image.data[p] = rgb[0];
        image.data[p + 1] = rgb[1];
        image.data[p + 2] = rgb[2];
        image.data[p + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
    drawVectorOverlay(sim, ctx);
  }

  function drawVectorOverlay(sim, ctx) {
    const stride = Math.max(8, Math.floor(sim.ny / 12));
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 0.65;
    for (let y = stride; y < sim.ny - stride / 2; y += stride) {
      for (let x = stride; x < sim.nx - stride / 2; x += stride) {
        const i = Math.floor(y) * sim.nx + Math.floor(x);
        if (sim.solid[i]) {
          continue;
        }
        const ux = sim.ux[i];
        const uy = sim.uy[i];
        const scale = 75;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + ux * scale, y + uy * scale);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function renderChart(sim, canvas) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#08151a";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#24404a";
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i++) {
      const y = i * h / 5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    const data = sim.history.slice(-900);
    if (data.length < 2) {
      return;
    }
    let maxAbs = 1e-6;
    for (const row of data) {
      maxAbs = Math.max(maxAbs, Math.abs(row.cl));
    }
    ctx.strokeStyle = "#1ee3cf";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
      const x = i * w / Math.max(1, data.length - 1);
      const y = h / 2 - (data[i].cl / maxAbs) * (h * 0.42);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
    ctx.strokeStyle = "#ffb454";
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  window.VortexRenderer = {
    renderFlow,
    renderChart,
    vorticityAt
  };
})();

