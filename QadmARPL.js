// QadmARPL.js

class QadmARPL {
  constructor(Datos, B_min, B_max, dB, L, DF_min, DF_max, dF, Nfreatico, Beta = 0) {
    this.Datos = Datos;
    this.L = L;
    this.Nfreatico = Nfreatico;
    this.Beta = Beta;

    this.B_data = this.range(B_min, B_max, dB);
    this.DF_data = this.range(DF_min, DF_max, dF);

    const numDf = this.DF_data.length;
    const numB = this.B_data.length;

    const initMatrix = () => Array.from({ length: numDf }, () => Array(numB).fill(0));
    this.matrix_B_Df = {
      Qu: initMatrix(),
      Qa: initMatrix(),
      Fcd: initMatrix(),
      Fqd: initMatrix(),
      Fgd: initMatrix()
    };
    this.vector_B = {
      Fcs: Array(numB).fill(0),
      Fqs: Array(numB).fill(0),
      Fgs: Array(numB).fill(0)
    };
    this.scalars = {};

    this.run();
  }

  run() {
    const gammaAgua = 1;

    for (let i = 0; i < this.DF_data.length; i++) {
      const Df = this.DF_data[i];
      for (let j = 0; j < this.B_data.length; j++) {
        const B = this.B_data[j];
        const L = this.L;

        const { phi, c, Peso_especifico, Peso_saturado, ub } = this.getSoilLayer(Df);
        const Peso_sumergido = Peso_saturado - gammaAgua;

        const ganma = this.calcGamma(Df, B, Peso_especifico, Peso_sumergido);
        const q = this.calcQ(Df, Peso_especifico, Peso_saturado, gammaAgua, ub);

        let Nq, Nc, Ng;
        if (phi === 0) {
          Nq = 1;
          Nc = 5.14;
          Ng = 0;
        } else {
          const phiRad = this.degToRad(phi);
          Nq = Math.pow(Math.tan(Math.PI / 4 + phiRad / 2), 2) * Math.exp(Math.PI * Math.tan(phiRad));
          Nc = (Nq - 1) / Math.tan(phiRad);
          Ng = 2 * (Nq + 1) * Math.tan(phiRad);
        }

        const Fcs = 1 + (B * Nq) / (L * Nc);
        const Fqs = 1 + (B * Math.tan(this.degToRad(phi))) / L;
        const Fgs = 1 - 0.4 * (B / L);
        this.vector_B.Fcs[j] = Fcs;
        this.vector_B.Fqs[j] = Fqs;
        this.vector_B.Fgs[j] = Fgs;

        let Fcd, Fqd, Fgd;
        if (Df / B <= 1) {
          if (phi === 0) {
            Fcd = 1 + 0.4 * Df / B;
            Fqd = 1;
            Fgd = 1;
          } else {
            const phiRad = this.degToRad(phi);
            Fqd = 1 + 2 * Math.tan(phiRad) * Math.pow(1 - Math.sin(phiRad), 2) * (Df / B);
            Fcd = Fqd - (1 - Fqd) / (Nc * Math.tan(phiRad));
            Fgd = 1;
          }
        } else {
          if (phi === 0) {
            Fcd = 1 + 0.4 * Math.atan(Df / B);
            Fqd = 1;
            Fgd = 1;
          } else {
            const phiRad = this.degToRad(phi);
            Fqd = 1 + 2 * Math.tan(phiRad) * Math.pow(1 - Math.sin(phiRad), 2) * Math.atan(Df / B);
            Fcd = Fqd - (1 - Fqd) / (Nc * Math.tan(phiRad));
            Fgd = 1;
          }
        }

        if (i === 0 && j === 0) {
          let Fci = 1, Fqi = 1, Fgi = 1;
          if (phi !== 0 || this.Beta !== 0) {
            Fci = Math.pow(1 - this.Beta / 90, 2);
            Fqi = Fci;
            Fgi = 1 - this.Beta / phi;
          }
          this.scalars = { Fci, Fqi, Fgi, Nc, Nq, Ng };
        }

        const { Fci, Fqi, Fgi } = this.scalars;
        const qu = c * Nc * Fcs * Fcd * Fci + q * Nq * Fqs * Fqd * Fqi + 0.5 * ganma * B * Ng * Fgs * Fgd * Fgi;
        const qa = qu / 3;

        this.matrix_B_Df.Qu[i][j] = qu;
        this.matrix_B_Df.Qa[i][j] = qa;
        this.matrix_B_Df.Fcd[i][j] = Fcd;
        this.matrix_B_Df.Fqd[i][j] = Fqd;
        this.matrix_B_Df.Fgd[i][j] = Fgd;
      }
    }
  }

  getResults() {
    return {
      matrix_B_Df: this.matrix_B_Df,
      vector_B: this.vector_B,
      scalars: this.scalars,
      metadata: {
        DF_data: this.DF_data,
        B_data: this.B_data
      }
    };
  }

  range(min, max, step) {
    const result = [];
    for (let v = min; v <= max + 1e-6; v += step) {
      result.push(parseFloat(v.toFixed(10)));
    }
    return result;
  }

  degToRad(deg) {
    return (deg * Math.PI) / 180;
  }

  getSoilLayer(Df) {
    const datos = this.Datos;
    let D0 = 0;
    for (let k = 0; k < datos.length; k++) {
      const D1 = datos[k][0];
      if (D1 > Df && D0 <= Df) {
        return {
          phi: datos[k][3],
          c: datos[k][4],
          Peso_especifico: datos[k][1],
          Peso_saturado: datos[k][2],
          ub: k + 1
        };
      }
      D0 = D1;
    }
    const k = datos.length - 1;
    return {
      phi: datos[k][3],
      c: datos[k][4],
      Peso_especifico: datos[k][1],
      Peso_saturado: datos[k][2],
      ub: datos.length
    };
  }

  calcQ(Df, Peso_esp, Peso_sat, gammaAgua, ub) {
    const datos = this.Datos;
    const Nf = this.Nfreatico;
    let q = 0;

    for (let l = 0; l < ub; l++) {
      const ant = l === 0 ? 0 : datos[l - 1][0];
      const h = Math.min(Df, datos[l][0]) - ant;

      if (Nf <= Df) {
        if (datos[l][0] <= Nf) {
          q += h * datos[l][1];
        } else if (l === ub - 1) {
          if (datos[l - 1][0] > Nf) {
            q += (Df - ant) * (datos[l][2] - gammaAgua);
          } else {
            q += (Nf - ant) * datos[l][1] + (Df - Nf) * (datos[l][2] - gammaAgua);
          }
        } else {
          q += (Nf - ant) * datos[l][1] + (datos[l][0] - Nf) * (datos[l][2] - gammaAgua);
        }
      } else {
        q += h * datos[l][1];
      }
    }

    return q;
  }

  calcGamma(Df, B, Peso_esp, Peso_sumergido) {
    const Nf = this.Nfreatico;
    const d = Nf - Df;
    if (Nf <= Df) {
      return Peso_sumergido;
    } else if (d <= B) {
      return Peso_sumergido + (d / B) * (Peso_esp - Peso_sumergido);
    } else {
      return Peso_esp;
    }
  }
}

export { QadmARPL };
