// QadmARPL.js
// Meyerhof Bearing Capacity calculation class
// Inputs:
//   B_min, B_max, dB - generate B_data array
//   L_min, L_max, dL - generate L_data array
//   DF_min, DF_max, dF - generate DF array
//   Datos_Estratos - array of soil strata data [depth, gamma, gamma_sat, phi, cohesion]
//   Nfreatico - groundwater level depth
//   Beta - load inclination angle (degrees)
//
// Output properties (all matrices size DF.length x B_data.length):
//   Qu_resultados, Qa_resultados, Nq, Nc, Ng,
//   Fcs, Fqs, Fgs, Fcd, Fqd, Fgd, Fci, Fqi, Fgi

class QadmARPL {
  constructor(
    Datos_Estratos,
    B_min, B_max, dB,
    L, // L is now a single fixed value
    DF_min, DF_max, dF,
    Nfreatico,
    Beta = 0
  ) {
    // Build B_data
    this.B_data = this._buildArray(B_min, B_max, dB);
  
    // L is fixed, create an array of same length as B_data
    this.L_data = Array(this.B_data.length).fill(L);
  
    // Build DF array
    this.DF = this._buildArray(DF_min, DF_max, dF);
  
    this.Datos_Estratos = Datos_Estratos;
    this.Nfreatico = Nfreatico;
    this.Beta = Beta;
  
    // Initialize result matrices with proper sizes: [DF.length][B_data.length]
    const rows = this.DF.length;
    const cols = this.B_data.length;
  
    this.Qu_resultados = this._initMatrix(rows, cols);
    this.Qa_resultados = this._initMatrix(rows, cols);
  
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
  
    this._procesaCap();
  }

  _buildArray(min, max, step) {
    if (min === max) {
      // Return an array of length 1 with repeated min (or length 1)
      return [min];
    }
    const arr = [];
    for (let v = min; v <= max + 1e-9; v += step) {
      arr.push(Number(v.toFixed(10))); // avoid float errors
    }
    return arr;
  }

  _initMatrix(rows, cols) {
    return Array(rows).fill(0).map(() => Array(cols).fill(0));
  }

  _tand(deg) {
    return Math.tan(deg * Math.PI / 180);
  }

  _sind(deg) {
    return Math.sin(deg * Math.PI / 180);
  }

  _atan(x) {
    return Math.atan(x);
  }

  _exp(x) {
    return Math.exp(x);
  }

  _procesaCap() {
    const Datos = this.Datos_Estratos;
    const Nfreatico = this.Nfreatico;
    const Beta = this.Beta;
    const DF = this.DF;
    const L_data = this.L_data;
    const B_data = this.B_data;
    const Peso_agua = 1;

    const Num_1 = DF.length;
    const Num_2 = L_data.length;
    const Num_Estratos = Datos.length;

    for (let i = 0; i < Num_1; i++) {
      const Df = DF[i];
      for (let j = 0; j < Num_2; j++) {
        const L = L_data[j];
        const B = B_data[j];

        // Identify stratum under foundation level Df
        let c = 0, phi = 0, Peso_especifico2 = 0, Peso_saturado2 = 0, Peso_sumergido2 = 0;
        let ub = 0;
        for (let k = 0; k < Num_Estratos; k++) {
          const D0 = k === 0 ? 0 : Datos[k - 1][0];
          const D1 = Datos[k][0];
          if (D1 > Df && D0 <= Df) {
            c = Datos[k][4]; // cohesion
            phi = Datos[k][3]; // friction angle (deg)
            Peso_especifico2 = Datos[k][1];
            Peso_saturado2 = Datos[k][2];
            Peso_sumergido2 = Peso_saturado2 - Peso_agua;
            ub = k;
            break; // found the layer below foundation
          }
        }

        // Calculate q and ganma
        let ganma, q;
        if (Nfreatico <= Df) {
          ganma = Peso_sumergido2;
          q = 0;
          for (let l = 0; l <= ub; l++) {
            const ant = l === 0 ? 0 : Datos[l - 1][0];
            if (Datos[l][0] <= Nfreatico) {
              q += (Datos[l][0] - ant) * Datos[l][1];
            } else {
              if (l === ub) {
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
            ganma = Peso_prima + d / B * (Peso_especifico2 - Peso_prima);
            q = 0;
            for (let m = 0; m <= ub; m++) {
              const ant = m === 0 ? 0 : Datos[m - 1][0];
              let altura;
              if (m === ub) {
                altura = Df - ant;
              } else {
                altura = Datos[m][0] - ant;
              }
              q += altura * Datos[m][1];
            }
          } else {
            ganma = Peso_especifico2;
            q = 0;
            for (let m = 0; m <= ub; m++) {
              const ant = m === 0 ? 0 : Datos[m - 1][0];
              let altura;
              if (m === ub) {
                altura = Df - ant;
              } else {
                altura = Datos[m][0] - ant;
              }
              q += altura * Datos[m][1];
            }
          }
        }

        // Calculate load factors Nq, Nc, Ng
        let Nq, Nc, Ng;
        if (phi === 0) {
          Nq = 1;
          Nc = 5.14;
          Ng = 0;
        } else {
          Nq = Math.pow(this._tand(45 + phi / 2), 2) * this._exp(Math.PI * this._tand(phi));
          Nc = (Nq - 1) / this._tand(phi);
          Ng = 2 * (Nq + 1) * this._tand(phi);
          //Ng = (Nq - 1) * this._tand(1.4 * phi); // Alternative formula (E.050)
        }

        // Shape factors
        const Fcs = 1 + (B * Nq) / (L * Nc);
        const Fqs = 1 + (B * this._tand(phi)) / L;
        const Fgs = 1 - 0.4 * B / L;

        // Depth factors
        let Fcd, Fqd, Fgd;
        if (Df / B <= 1) {
          if (phi === 0) {
            Fcd = 1 + 0.4 * Df / B;
            Fqd = 1;
            Fgd = 1;
          } else {
            Fqd = 1 + 2 * this._tand(phi) * Math.pow(1 - this._sind(phi), 2) * (Df / B);
            Fcd = Fqd - (1 - Fqd) / (Nc * this._tand(phi));
            Fgd = 1;
          }
        } else {
          if (phi === 0) {
            Fcd = 1 + 0.4 * Math.atan(Df / B);
            Fqd = 1;
            Fgd = 1;
          } else {
            Fqd = 1 + 2 * this._tand(phi) * Math.pow(1 - this._sind(phi), 2) * Math.atan(Df / B);
            Fcd = Fqd - (1 - Fqd) / (Nc * this._tand(phi));
            Fgd = 1;
          }
        }

        // Inclination factors
        let Fci, Fqi, Fgi;
        if (phi === 0 && Beta === 0) {
          Fci = 1;
          Fqi = 1;
          Fgi = 1;
        } else {
          Fci = Math.pow(1 - Beta / 90, 2);
          Fqi = Fci;
          Fgi = 1 - Beta / phi;
        }

        // Ultimate bearing capacity
        const qu = c * Nc * Fcs * Fcd * Fci + q * Nq * Fqs * Fqd * Fqi + 0.5 * ganma * B * Ng * Fgs * Fgd * Fgi;

        // Allowable bearing capacity (factor of safety 3)
        const qa = qu / 3;

        // Save all values in matrices
        this.Qu_resultados[i][j] = qu;
        this.Qa_resultados[i][j] = qa;

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
      Qu: this.Qu_resultados,
      Qa: this.Qa_resultados,
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

export { QadmARPL };
