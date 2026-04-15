(function () {
  const $ = (id) => document.getElementById(id);
  const state = {
    sim: null,
    running: false,
    obstacles: []
  };

  function init() {
    populateSelects();
    bindControls();
    loadPreset("semiWake");
    resetSimulation();
    requestAnimationFrame(loop);
  }

  function populateSelects() {
    const presetSelect = $("presetSelect");
    for (const [key, preset] of Object.entries(VortexPresets.simulations)) {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = preset.label;
      presetSelect.appendChild(option);
    }

    const fluidSelect = $("fluidSelect");
    for (const [key, fluid] of Object.entries(VortexPresets.fluids)) {
      const option = document.createElement("option");
      option.value = key;
      option.textContent = fluid.name;
      fluidSelect.appendChild(option);
    }
  }

  function bindControls() {
    $("presetSelect").addEventListener("change", () => {
      loadPreset($("presetSelect").value);
      resetSimulation();
    });

    for (const id of ["reInput", "uInput", "sizeInput", "xInput", "yInput", "angleInput"]) {
      $(id).addEventListener("input", updateOutputs);
    }
    for (const id of ["nxInput", "nyInput"]) {
      $(id).addEventListener("change", () => {
        clampObstacleSliders();
        resetSimulation();
      });
    }

    $("addObstacleBtn").addEventListener("click", () => {
      state.obstacles.push(buildObstacleFromUi());
      updateObstacleList();
      resetSimulation();
    });
    $("replaceObstacleBtn").addEventListener("click", () => {
      state.obstacles = [buildObstacleFromUi()];
      updateObstacleList();
      resetSimulation();
    });
    $("clearObstaclesBtn").addEventListener("click", () => {
      state.obstacles = [];
      updateObstacleList();
      resetSimulation();
    });

    $("runBtn").addEventListener("click", () => {
      state.running = true;
      $("statusText").textContent = "Running";
    });
    $("pauseBtn").addEventListener("click", () => {
      state.running = false;
      $("statusText").textContent = "Paused";
    });
    $("resetBtn").addEventListener("click", resetSimulation);
    $("viewSelect").addEventListener("change", render);
    $("fluidSelect").addEventListener("change", resetSimulation);
    $("profileSelect").addEventListener("change", resetSimulation);
    $("reInput").addEventListener("change", resetSimulation);
    $("uInput").addEventListener("change", resetSimulation);
    $("spfInput").addEventListener("change", resetSimulation);

    $("exportFieldBtn").addEventListener("click", () => {
      VortexExporter.downloadText("vortexlab_field.csv", VortexExporter.fieldCsv(state.sim, 2), "text/csv");
    });
    $("exportHistoryBtn").addEventListener("click", () => {
      VortexExporter.downloadText("vortexlab_history.csv", VortexExporter.historyCsv(state.sim), "text/csv");
    });
    $("exportConfigBtn").addEventListener("click", () => {
      VortexExporter.downloadText("vortexlab_config.json", JSON.stringify(readConfigFromUi(), null, 2), "application/json");
    });
  }

  function loadPreset(key) {
    const preset = VortexPresets.clone(VortexPresets.simulations[key]);
    $("presetSelect").value = key;
    $("fluidSelect").value = preset.fluidKey;
    $("nxInput").value = preset.domain.nx;
    $("nyInput").value = preset.domain.ny;
    $("reInput").value = preset.flow.reynolds;
    $("uInput").value = preset.flow.latticeVelocity;
    $("profileSelect").value = preset.flow.profile || "uniform";
    $("spfInput").value = preset.solver.stepsPerFrame || 8;
    state.obstacles = preset.obstacles;
    const first = state.obstacles[0] || { type: "semi", x: 78, y: 60, radius: 17, angleDeg: 0 };
    fillObstacleUi(first);
    clampObstacleSliders();
    updateOutputs();
    updateObstacleList();
  }

  function fillObstacleUi(obstacle) {
    $("shapeSelect").value = obstacle.type || "circle";
    $("xInput").value = Math.round(obstacle.x || 80);
    $("yInput").value = Math.round(obstacle.y || 60);
    $("angleInput").value = Math.round(obstacle.angleDeg || obstacle.angle_deg || 0);
    $("sizeInput").value = Math.round(obstacle.radius || obstacle.size || obstacle.rx || obstacle.chord / 2.5 || 18);
  }

  function clampObstacleSliders() {
    const nx = Number($("nxInput").value);
    const ny = Number($("nyInput").value);
    $("xInput").max = Math.max(40, nx - 40);
    $("yInput").max = Math.max(30, ny - 20);
    $("xInput").value = Math.min(Number($("xInput").value), Number($("xInput").max));
    $("yInput").value = Math.min(Number($("yInput").value), Number($("yInput").max));
    updateOutputs();
  }

  function updateOutputs() {
    $("reValue").textContent = $("reInput").value;
    $("uValue").textContent = Number($("uInput").value).toFixed(3);
    $("sizeValue").textContent = $("sizeInput").value;
    $("xValue").textContent = $("xInput").value;
    $("yValue").textContent = $("yInput").value;
    $("angleValue").textContent = `${$("angleInput").value} deg`;
  }

  function buildObstacleFromUi() {
    const type = $("shapeSelect").value;
    const x = Number($("xInput").value);
    const y = Number($("yInput").value);
    const size = Number($("sizeInput").value);
    const angleDeg = Number($("angleInput").value);
    if (type === "circle" || type === "semi") {
      return { type, x, y, radius: size, angleDeg };
    }
    if (type === "ellipse") {
      return { type, x, y, rx: size, ry: Math.max(6, Math.round(size * 0.62)), angleDeg };
    }
    if (type === "rectangle") {
      return { type, x, y, width: Math.round(size * 1.55), height: size, angleDeg };
    }
    if (type === "airfoil") {
      return { type, x, y, chord: Math.round(size * 2.5), thickness: 0.12, angleDeg };
    }
    return { type, x, y, size: Math.round(size * 1.5), angleDeg };
  }

  function updateObstacleList() {
    const list = $("obstacleList");
    list.innerHTML = "";
    if (state.obstacles.length === 0) {
      const empty = document.createElement("div");
      empty.className = "obstacle-chip";
      empty.textContent = "No obstacles. Add one to create a wake.";
      list.appendChild(empty);
      return;
    }
    state.obstacles.forEach((obstacle, index) => {
      const chip = document.createElement("div");
      chip.className = "obstacle-chip";
      const label = document.createElement("span");
      label.textContent = `${index + 1}. ${obstacle.type} at (${Math.round(obstacle.x)}, ${Math.round(obstacle.y)})`;
      const remove = document.createElement("button");
      remove.textContent = "remove";
      remove.addEventListener("click", () => {
        state.obstacles.splice(index, 1);
        updateObstacleList();
        resetSimulation();
      });
      chip.appendChild(label);
      chip.appendChild(remove);
      list.appendChild(chip);
    });
  }

  function readConfigFromUi() {
    return {
      label: "Custom interactive case",
      domain: {
        nx: Number($("nxInput").value),
        ny: Number($("nyInput").value)
      },
      fluidKey: $("fluidSelect").value,
      fluid: VortexPresets.fluids[$("fluidSelect").value],
      flow: {
        reynolds: Number($("reInput").value),
        latticeVelocity: Number($("uInput").value),
        profile: $("profileSelect").value,
        perturbation: 0.0012
      },
      solver: {
        stepsPerFrame: Number($("spfInput").value)
      },
      obstacles: VortexPresets.clone(state.obstacles)
    };
  }

  function resetSimulation() {
    state.running = false;
    $("statusText").textContent = "Ready";
    const config = readConfigFromUi();
    state.sim = new VortexLBM.LbmSimulator(config);
    updateStats();
    render();
  }

  function loop() {
    if (state.running && state.sim) {
      const steps = Math.max(1, Math.min(40, Number($("spfInput").value) || 8));
      for (let i = 0; i < steps; i++) {
        state.sim.step();
      }
      updateStats();
      render();
    }
    requestAnimationFrame(loop);
  }

  function updateStats() {
    const sim = state.sim;
    const latest = sim.latest();
    $("stepText").textContent = `step ${latest.step}`;
    $("effectiveReText").textContent = sim.effectiveRe.toFixed(1);
    $("tauText").textContent = sim.tau.toFixed(4);
    $("massText").textContent = latest.mass.toFixed(5);
    $("cdText").textContent = latest.cd.toFixed(3);
    $("clText").textContent = latest.cl.toFixed(3);
    const st = sim.estimateStrouhal();
    $("stText").textContent = st ? st.toFixed(3) : "-";
  }

  function render() {
    if (!state.sim) {
      return;
    }
    VortexRenderer.renderFlow(state.sim, $("flowCanvas"), $("viewSelect").value);
    VortexRenderer.renderChart(state.sim, $("chartCanvas"));
  }

  window.addEventListener("load", init);
})();
