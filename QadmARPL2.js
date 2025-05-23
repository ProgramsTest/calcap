// QadmARPL2.js
class QadmARPL2 {
  constructor(
    mDatos,
    B_min, B_max, dB,
    L,
    DF_min, DF_max, dF,
    Nfreatico,
    Beta = 0
  ) {
    this.B_data = this._buildArray(B_min, B_max, dB);
    this.L_data = Array(this.B_data.length).fill(L);
    this.DF = DF_min === DF_max
      ? Array(1).fill(DF_min)
      : this._buildArray(DF_min, DF_max, dF);

    this.Datos = mDatos;
    this.Nfreatico = Nfreatico;
    this.Beta = Beta;
    this.Peso_agua = 1;

    const rows = this.DF.length;
    const cols = this.B_data.length;

    this.Qu = this._initMatrix(rows, cols);
    this.Qa = this._initMatrix(rows, cols);
    this.Nq = this._initMatrix(rows, cols);
    this.Nc = this._initMatrix(rows, cols);
    this.Ng = this._initMatrix(rows, cols);
    this.Fcs = this._initMatrix(rows, cols);
    this.Fqs = this._initMatrix(rows, cols);
    this.Fgs = this._initMatrix(rows, cols);
    this.Fcd = this._initMatrix(rows, cols);
    this.Fqd = this._initMatrix(rows, cols);
    this.Fgd = this._initMatrix(rows, cols);
    this.Fci = this._initMatrix(rows, cols);
    this.Fqi = this._initMatrix(rows, cols);
    this.Fgi = this._initMatrix(rows, cols);

    this._computeBearingCapacity();
  }

  _buildArray(min, max, step) {
    const arr = [];
    for (let v = min; v <= max + 1e-9; v += step) {
      arr.push(Number(v.toFixed(10)));
    }
    return arr;
  }

  _initMatrix(rows, cols) {
    return Array.from({ length: rows }, () => Array(cols).fill(0));
  }

  _tand(deg) {
    return Math.tan((deg * Math.PI) / 180);
  }

  _exp(x) {
    return Math.exp(x);
  }

  _computeBearingCapacity() {
    const { Datos, Nfreatico, Beta, DF, L_data, B_data, Peso_agua } = this;
    const Num_Estratos = Datos.length;

    for (let i = 0; i < DF.length; i++) {
      const Df = DF[i];
      for (let j = 0; j < B_data.length; j++) {
        const B = B_data[j];
        const L = L_data[j];

        // Get soil layer properties
        let c = 0, phi = 0, γ = 0, γ_sat = 0;
        for (let k = 0; k < Num_Estratos; k++) {
          const D0 = k === 0 ? 0 : Datos[k - 1][0];
          const D1 = Datos[k][0];
          if (D1 > Df && D0 <= Df) {
            c = Datos[k][4];
            phi = Datos[k][3];
            γ = Datos[k][1];
            γ_sat = Datos[k][2];
            break;
          }
        }

        const γ_sub = γ_sat - Peso_agua;

        // Effective overburden pressure q
        let q = 0, γ_eff = 0;
        if (Nfreatico <= Df) {
          γ_eff = γ_sub;
          for (let l = 0; l < Num_Estratos; l++) {
            const z0 = l === 0 ? 0 : Datos[l - 1][0];
            const z1 = Datos[l][0];
            if (z1 <= Nfreatico) {
              q += (z1 - z0) * Datos[l][1];
            } else {
              const h1 = Math.max(0, Nfreatico - z0);
              const h2 = Math.max(0, Df - Math.max(Nfreatico, z0));
              q += h1 * Datos[l][1] + h2 * (Datos[l][2] - Peso_agua);
              break;
            }
          }
        } else {
          const d = Nfreatico - Df;
          γ_eff = d <= B
            ? γ_sub + (d / B) * (γ - γ_sub)
            : γ;
          for (let m = 0; m < Num_Estratos; m++) {
            const z0 = m === 0 ? 0 : Datos[m - 1][0];
            const z1 = Datos[m][0];
            if (z1 <= Df) {
              q += (z1 - z0) * Datos[m][1];
            } else {
              q += (Df - z0) * Datos[m][1];
              break;
            }
          }
        }

        // Bearing capacity factors
        let Nq = 1, Nc = 5.14, Ng = 0;
        if (phi !== 0) {
          Nq = Math.pow(this._tand(45 + phi / 2), 2) * this._exp(Math.PI * this._tand(phi));
          Nc = (Nq - 1) / this._tand(phi);
          Ng = (Nq - 1) * this._tand(1.4 * phi); // E.050
        }

        // Shape factors
        const Kp = Math.pow(this._tand(phi / 2 + 45), 2);
        const Fcs = phi === 0 ? 1 + 0.2 * B / L : 1 + 0.2 * Kp * B / L;
        const Fqs = phi === 0 ? 1 : 1 + 0.1 * Kp * B / L;
        const Fgs = phi === 0 ? 1 : 1 + 0.1 * Kp * B / L;

        // Depth factors
        const sqrtKp = Math.sqrt(Kp);
        const Fcd = 1 + 0.2 * sqrtKp * Df / B;
        const Fqd = phi > 10 ? 1 + 0.1 * sqrtKp * Df / B : 1;
        const Fgd = phi > 10 ? 1 + 0.1 * sqrtKp * Df / B : 1;

        // Inclination factors
        const Fci = phi === 0 && Beta === 0 ? 1 : Math.pow(1 - Beta / 90, 2);
        const Fqi = Fci;
        const Fgi = phi === 0 ? 1 : Math.pow(1 - Beta / phi, 2);

        // Bearing capacity
        const qu = c * Nc * Fcs * Fcd * Fci +
                    q * Nq * Fqs * Fqd * Fqi +
                    0.5 * γ_eff * B * Ng * Fgs * Fgd * Fgi;

        const qa = qu / 3;

        // Store
        this.Qu[i][j] = qu;
        this.Qa[i][j] = qa;
        this.Nq[i][j] = Nq;
        this.Nc[i][j] = Nc;
        this.Ng[i][j] = Ng;
        this.Fcs[i][j] = Fcs;
        this.Fqs[i][j] = Fqs;
        this.Fgs[i][j] = Fgs;
        this.Fcd[i][j] = Fcd;
        this.Fqd[i][j] = Fqd;
        this.Fgd[i][j] = Fgd;
        this.Fci[i][j] = Fci;
        this.Fqi[i][j] = Fqi;
        this.Fgi[i][j] = Fgi;
      }
    }
  }
  getResults() {
      return {
        Qu: this.Qu,
        Qa: this.Qa,
        Nq: this.Nq,
        Nc: this.Nc,
        Ng: this.Ng,
        Fcs: this.Fcs,
        Fqs: this.Fqs,
        Fgs: this.Fgs,
        Fcd: this.Fcd,
        Fqd: this.Fqd,
        Fgd: this.Fgd,
        Fci: this.Fci,
        Fqi: this.Fqi,
        Fgi: this.Fgi,
        DF_data: this.DF,
        B_data: this.B_data,
        };
    }
}

export { QadmARPL2 };
