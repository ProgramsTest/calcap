class QadmARPL2 {
  constructor(Datos, B_min, B_max, dB, L, DF_min, DF_max, dF, Nfreatico, Beta = 0) {
    this.Datos = Datos;
    this.B_data = this.linspace(B_min, B_max, dB);
    this.DF_data = this.linspace(DF_min, DF_max, dF);
    this.L = L;
    this.Nfreatico = Nfreatico;
    this.Beta = Beta;

    // Inicializar estructuras de resultados
    this.matrix_B_Df = {
      Qu: [],
      Qa: [],
      Fcd: [],
      Fqd: [],
      Fgd: []
    };
    this.vector_B = {
      Fcs: [],
      Fqs: [],
      Fgs: []
    };
    this.scalars = {
      Fci: 0,
      Fqi: 0,
      Fgi: 0,
      Nq: 0,
      Nc: 0,
      Ng: 0
    };

    this.run();
  }

  linspace(min, max, step) {
    const result = [];
    for (let val = min; val <= max + 1e-6; val += step) {
      result.push(parseFloat(val.toFixed(6)));
    }
    return result;
  }

  run() {
    const Datos = this.Datos;
    const DF = this.DF_data;
    const B_data = this.B_data;
    const L = this.L;
    const Nfreatico = this.Nfreatico;
    const Beta = this.Beta;
    const Peso_agua = 1;

    const Num_1 = DF.length;
    const Num_2 = B_data.length;
    const Num_Estratos = Datos.length;

    for (let i = 0; i < Num_1; i++) {
      const Df = DF[i];
      this.matrix_B_Df.Qu[i] = [];
      this.matrix_B_Df.Qa[i] = [];
      this.matrix_B_Df.Fcd[i] = [];
      this.matrix_B_Df.Fqd[i] = [];
      this.matrix_B_Df.Fgd[i] = [];

      for (let j = 0; j < Num_2; j++) {
        const B = B_data[j];
        const Lval = L;

        // Identificar estrato en el que se encuentra la base de zapata
        let c, phi, Peso_especifico2, Peso_saturado2, Peso_sumergido2, ub;
        for (let k = 0; k < Num_Estratos; k++) {
          const D0 = k === 0 ? 0 : Datos[k - 1][0];
          const D1 = Datos[k][0];
          if (D1 > Df && D0 <= Df) {
            c = Datos[k][4];
            phi = Datos[k][3];
            Peso_especifico2 = Datos[k][1];
            Peso_saturado2 = Datos[k][2];
            Peso_sumergido2 = Peso_saturado2 - Peso_agua;
            ub = k + 1;
            break;
          }
        }

        let ganma, q = 0;
        if (Nfreatico <= Df) {
          ganma = Peso_sumergido2;
          for (let l = 0; l < ub; l++) {
            const ant = l === 0 ? 0 : Datos[l - 1][0];
            if (Datos[l][0] <= Nfreatico) {
              q += (Datos[l][0] - ant) * Datos[l][1];
            } else {
              if (l === ub - 1) {
                if (Datos[l - 1][0] > Nfreatico) {
                  q += (Df - ant) * (Datos[l][2] - Peso_agua);
                } else {
                  q += (Nfreatico - ant) * Datos[l][1] + (Df - Nfreatico) * (Datos[l][2] - Peso_agua);
                }
              } else {
                q += (Nfreatico - ant) * Datos[l][1] + (Datos[l][0] - Nfreatico) * (Datos[l][2] - Peso_agua);
              }
            }
          }
        } else {
          const d = Nfreatico - Df;
          if (d <= B) {
            const Peso_prima = Peso_sumergido2;
            ganma = Peso_prima + (d / B) * (Peso_especifico2 - Peso_prima);
          } else {
            ganma = Peso_especifico2;
          }
          for (let m = 0; m < ub; m++) {
            const ant = m === 0 ? 0 : Datos[m - 1][0];
            const altura = m === ub - 1 ? Df - ant : Datos[m][0] - ant;
            q += altura * Datos[m][1];
          }
        }

        // Factores de carga
        let Nc, Nq, Ng;
        if (phi === 0) {
          Nq = 1;
          Nc = 5.14;
          Ng = 0;
        } else {
          Nq = (Math.tan((Math.PI / 180) * (45 + phi / 2))) ** 2 * Math.exp(Math.PI * Math.tan((Math.PI / 180) * phi));
          Nc = (Nq - 1) / Math.tan((Math.PI / 180) * phi);
          Ng = (Nq - 1) * Math.tan((Math.PI / 180) * (1.4 * phi));
        }

        // Factores de forma
        const Kp = Math.tan((Math.PI / 180) * (phi / 2 + 45)) ** 2;
        const Fcs = phi === 0 ? 1 + 0.2 * B / Lval : 1 + 0.2 * Kp * B / Lval;
        const Fqs = phi === 0 ? 1 : 1 + 0.1 * Kp * B / Lval;
        const Fgs = phi === 0 ? 1 : 1 + 0.1 * Kp * B / Lval;

        // Factores de profundidad
        const Kp05 = Math.sqrt(Kp);
        const Fcd = 1 + (phi > 10 ? 0.2 * Kp05 * Df / B : 0.2 * Kp05 * Df / B);
        const Fqd = phi > 10 ? 1 + 0.1 * Kp05 * Df / B : 1;
        const Fgd = phi > 10 ? 1 + 0.1 * Kp05 * Df / B : 1;

        // Factores de inclinación
        const Fci = phi === 0 && Beta === 0 ? 1 : (1 - Beta / 90) ** 2;
        const Fqi = Fci;
        const Fgi = phi === 0 ? 1 : (1 - Beta / phi) ** 2;

        const qu = c * Nc * Fcs * Fcd * Fci + q * Nq * Fqs * Fqd * Fqi + 0.5 * ganma * B * Ng * Fgs * Fgd * Fgi;
        const qa = qu / 3;

        // Almacenar resultados
        this.matrix_B_Df.Qu[i][j] = qu;
        this.matrix_B_Df.Qa[i][j] = qa;
        this.matrix_B_Df.Fcd[i][j] = Fcd;
        this.matrix_B_Df.Fqd[i][j] = Fqd;
        this.matrix_B_Df.Fgd[i][j] = Fgd;

        if (i === 0) {
          this.vector_B.Fcs[j] = Fcs;
          this.vector_B.Fqs[j] = Fqs;
          this.vector_B.Fgs[j] = Fgs;
        }

        if (i === 0 && j === 0) {
          this.scalars = { Fci, Fqi, Fgi, Nq, Nc, Ng };
        }
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
        B_data: this.B_data,
      }
    };
  }
}

export { QadmARPL2 };
