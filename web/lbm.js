(function () {
  const CX = [0, 1, 0, -1, 0, 1, -1, -1, 1];
  const CY = [0, 0, 1, 0, -1, 1, 1, -1, -1];
  const W = [4 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 9, 1 / 36, 1 / 36, 1 / 36, 1 / 36];
  const OPP = [0, 3, 4, 1, 2, 7, 8, 5, 6];

  class LbmSimulator {
    constructor(config) {
      this.configure(config);
    }

    configure(config) {
      this.config = JSON.parse(JSON.stringify(config));
      this.nx = Number(config.domain.nx);
      this.ny = Number(config.domain.ny);
      this.n = this.nx * this.ny;
      this.uIn = Number(config.flow.latticeVelocity || 0.05);
      this.reynolds = Number(config.flow.reynolds || 100);
      this.profile = config.flow.profile || "uniform";
      this.perturbation = Number(config.flow.perturbation || 0.001);
      this.obstacles = config.obstacles || [];
      this.characteristicLength = VortexGeometry.characteristicLength(this.obstacles);
      const rawNu = this.uIn * this.characteristicLength / this.reynolds;
      this.nu = Math.max(0.0045, Math.min(0.18, rawNu));
      this.effectiveRe = this.uIn * this.characteristicLength / this.nu;
      this.tau = 0.5 + 3.0 * this.nu;
      this.omega = 1.0 / this.tau;
      this.solid = VortexGeometry.buildSolidMask(this.nx, this.ny, this.obstacles, true);
      this.f = new Float32Array(this.n * 9);
      this.fNext = new Float32Array(this.n * 9);
      this.rho = new Float32Array(this.n);
      this.ux = new Float32Array(this.n);
      this.uy = new Float32Array(this.n);
      this.time = 0;
      this.history = [];
      this.resetDistributions();
    }

    index(d, i) {
      return d * this.n + i;
    }

    inletVelocity(y) {
      if (this.profile === "parabolic") {
        const yn = Math.max(0, Math.min(1, (y - 1) / Math.max(1, this.ny - 3)));
        return 1.5 * this.uIn * 4 * yn * (1 - yn);
      }
      return this.uIn;
    }

    equilibrium(d, rho, ux, uy) {
      const eu = CX[d] * ux + CY[d] * uy;
      const u2 = ux * ux + uy * uy;
      return W[d] * rho * (1 + 3 * eu + 4.5 * eu * eu - 1.5 * u2);
    }

    setEquilibriumCell(x, y, rho, ux, uy) {
      const i = y * this.nx + x;
      for (let d = 0; d < 9; d++) {
        this.f[this.index(d, i)] = this.equilibrium(d, rho, ux, uy);
      }
      this.rho[i] = rho;
      this.ux[i] = ux;
      this.uy[i] = uy;
    }

    resetDistributions() {
      for (let y = 0; y < this.ny; y++) {
        for (let x = 0; x < this.nx; x++) {
          const i = y * this.nx + x;
          const ux = this.solid[i] ? 0 : this.inletVelocity(y);
          const wakeSeed = Math.exp(-Math.pow((x - this.nx * 0.28) / Math.max(1, this.nx * 0.18), 2));
          const uy = this.solid[i] ? 0 : this.perturbation * Math.sin(2 * Math.PI * y / this.ny) * wakeSeed;
          this.rho[i] = 1.0;
          this.ux[i] = ux;
          this.uy[i] = uy;
          for (let d = 0; d < 9; d++) {
            this.f[this.index(d, i)] = this.equilibrium(d, 1.0, ux, uy);
          }
        }
      }
      this.time = 0;
      this.history = [];
    }

    applyBoundaries() {
      for (let y = 1; y < this.ny - 1; y++) {
        const u = this.inletVelocity(y);
        this.setEquilibriumCell(0, y, 1.0, u, 0.0);
        this.setEquilibriumCell(1, y, 1.0, u, 0.0);

        const out = y * this.nx + (this.nx - 1);
        const prev = y * this.nx + (this.nx - 2);
        for (let d = 0; d < 9; d++) {
          this.f[this.index(d, out)] = this.f[this.index(d, prev)];
        }
      }
    }

    step() {
      this.fNext.fill(0);
      let forceX = 0;
      let forceY = 0;
      let mass = 0;
      let kinetic = 0;

      for (let y = 0; y < this.ny; y++) {
        for (let x = 0; x < this.nx; x++) {
          const i = y * this.nx + x;
          if (this.solid[i]) {
            this.rho[i] = 1.0;
            this.ux[i] = 0.0;
            this.uy[i] = 0.0;
            continue;
          }

          let rho = 0;
          let ux = 0;
          let uy = 0;
          for (let d = 0; d < 9; d++) {
            const value = this.f[this.index(d, i)];
            rho += value;
            ux += value * CX[d];
            uy += value * CY[d];
          }

          if (rho <= 1e-9 || !Number.isFinite(rho)) {
            rho = 1.0;
            ux = this.inletVelocity(y);
            uy = 0.0;
          } else {
            ux /= rho;
            uy /= rho;
          }

          const speed2 = ux * ux + uy * uy;
          if (speed2 > 0.20) {
            const scale = Math.sqrt(0.20 / speed2);
            ux *= scale;
            uy *= scale;
          }

          this.rho[i] = rho;
          this.ux[i] = ux;
          this.uy[i] = uy;
          mass += rho;
          kinetic += 0.5 * rho * (ux * ux + uy * uy);

          for (let d = 0; d < 9; d++) {
            const feq = this.equilibrium(d, rho, ux, uy);
            const post = this.f[this.index(d, i)] - this.omega * (this.f[this.index(d, i)] - feq);
            const nx2 = x + CX[d];
            const ny2 = y + CY[d];
            if (nx2 < 0 || nx2 >= this.nx || ny2 < 0 || ny2 >= this.ny) {
              this.fNext[this.index(OPP[d], i)] += post;
              continue;
            }
            const j = ny2 * this.nx + nx2;
            if (this.solid[j]) {
              this.fNext[this.index(OPP[d], i)] += post;
              forceX += 2 * post * CX[d];
              forceY += 2 * post * CY[d];
            } else {
              this.fNext[this.index(d, j)] += post;
            }
          }
        }
      }

      const tmp = this.f;
      this.f = this.fNext;
      this.fNext = tmp;
      this.applyBoundaries();
      this.time += 1;

      const norm = Math.max(1e-9, 0.5 * this.uIn * this.uIn * this.characteristicLength);
      const cd = forceX / norm;
      const cl = forceY / norm;
      const record = {
        step: this.time,
        cd,
        cl,
        mass: mass / Math.max(1, this.n - this.countSolids()),
        kinetic
      };
      this.history.push(record);
      if (this.history.length > 2400) {
        this.history.shift();
      }
      return record;
    }

    countSolids() {
      if (this._solidCount !== undefined) {
        return this._solidCount;
      }
      let count = 0;
      for (let i = 0; i < this.solid.length; i++) {
        count += this.solid[i] ? 1 : 0;
      }
      this._solidCount = count;
      return count;
    }

    estimateStrouhal() {
      if (this.history.length < 80) {
        return null;
      }
      const values = this.history.slice(Math.floor(this.history.length * 0.35));
      const crossings = [];
      for (let i = 1; i < values.length; i++) {
        const a = values[i - 1].cl;
        const b = values[i].cl;
        if ((a <= 0 && b > 0) || (a >= 0 && b < 0)) {
          crossings.push(values[i].step);
        }
      }
      if (crossings.length < 4) {
        return null;
      }
      const periods = [];
      for (let i = 2; i < crossings.length; i++) {
        periods.push(crossings[i] - crossings[i - 2]);
      }
      const avgPeriod = periods.reduce((a, b) => a + b, 0) / periods.length;
      const frequency = 1.0 / avgPeriod;
      return frequency * this.characteristicLength / this.uIn;
    }

    latest() {
      return this.history[this.history.length - 1] || {
        step: 0,
        cd: 0,
        cl: 0,
        mass: 1,
        kinetic: 0
      };
    }
  }

  window.VortexLBM = {
    LbmSimulator,
    constants: { CX, CY, W, OPP }
  };
})();
