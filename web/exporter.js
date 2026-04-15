(function () {
  function downloadText(filename, text, mime) {
    const blob = new Blob([text], { type: mime || "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function fieldCsv(sim, stride) {
    const step = stride || 2;
    const lines = ["x,y,solid,rho,ux,uy,speed,vorticity"];
    for (let y = 0; y < sim.ny; y += step) {
      for (let x = 0; x < sim.nx; x += step) {
        const i = y * sim.nx + x;
        const ux = sim.ux[i];
        const uy = sim.uy[i];
        const speed = Math.sqrt(ux * ux + uy * uy);
        const vort = VortexRenderer.vorticityAt(sim, x, y);
        lines.push([
          x,
          y,
          sim.solid[i],
          sim.rho[i].toFixed(7),
          ux.toFixed(7),
          uy.toFixed(7),
          speed.toFixed(7),
          vort.toFixed(7)
        ].join(","));
      }
    }
    return lines.join("\n");
  }

  function historyCsv(sim) {
    const lines = ["step,cd_proxy,cl_proxy,mass,kinetic_energy"];
    for (const row of sim.history) {
      lines.push([
        row.step,
        row.cd.toFixed(8),
        row.cl.toFixed(8),
        row.mass.toFixed(8),
        row.kinetic.toFixed(8)
      ].join(","));
    }
    return lines.join("\n");
  }

  window.VortexExporter = {
    downloadText,
    fieldCsv,
    historyCsv
  };
})();

