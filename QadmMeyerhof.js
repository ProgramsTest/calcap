class QadmMeyerhof {
  constructor(
    Datos,
    B_min, B_max, dB,
    L, // L is now a single fixed value
    DF_min, DF_max, dF,
    Nfreatico,
    Beta = 0
  ) {
    this.Datos = Datos;
    this.Nfreatico = Nfreatico;
    this.Peso_agua = 1;
    this.Beta = Beta;
  
    this.B_data = this.range(B_min, B_max, dB);
    this.L_data = Array(this.B_data.length).fill(L); // L is fixed
    this.DF_data = this.range(DF_min, DF_max, dF);
  
    this.numB = this.B_data.length;
    this.numDF = this.DF_data.length;
  
    this.initOutputMatrices();

    this.calculate();
  }
  
  range(min, max, step) {
    if (min === max) return [min];
    return Array.from({ length: Math.floor((max - min) / step) + 1 }, (_, i) => min + i * step);
  }
  

  degToRad(deg) {
    return deg * Math.PI / 180;
  }

  initOutputMatrices() {
    const shape = () => Array.from({ length: this.numDF }, () => Array(this.numB).fill(0));

    this.Qu = shape();
    this.Qa = shape();

    this.Nq = shape();
    this.Nc = shape();
    this.Ng = shape();

    this.Fcs = shape();
    this.Fqs = shape();
    this.Fgs = shape();

    this.Fcd = shape();
    this.Fqd = shape();
    this.Fgd = shape();

    this.Fci = shape();
    this.Fqi = shape();
    this.Fgi = shape();
  }

  calculate() {
    const { Datos, Nfreatico, Peso_agua, B_data, L_data, DF_data } = this;
    const numEstratos = Datos.length;


    for (let i = 0; i < this.numDF; i++) {
      const Df = DF_data[i];

      for (let j = 0; j < this.numB; j++) {
        const B = B_data[j];
        const L = L_data[j];

        let c, phi, Peso_especifico2, Peso_saturado2, Peso_sumergido2, ub;

        for (let k = 0; k < numEstratos; k++) {
          const D0 = k === 0 ? 0 : Datos[k - 1][0];
          const D1 = Datos[k][0];

          if (D1 > Df && D0 < Df) {
            c = Datos[k][4];
            phi = Datos[k][3];
            Peso_especifico2 = Datos[k][1];
            Peso_saturado2 = Datos[k][2];
            Peso_sumergido2 = Peso_saturado2 - Peso_agua;
            ub = k;
            break;
          }
        }

        let ganma, q = 0;

        if (Nfreatico <= Df) {
          ganma = Peso_sumergido2;
          for (let l = 0; l <= ub; l++) {
            const ant = l === 0 ? 0 : Datos[l - 1][0];
            if (Datos[l][0] <= Nfreatico) {
              q += (Datos[l][0] - ant) * Datos[l][1];
            } else {
              q += (Nfreatico - ant) * Datos[l][1] + (Datos[l][0] - Nfreatico) * (Datos[l][2] - Peso_agua);
            }
          }
          if (Datos[ub][0] < Df) {
            q += (Df - Datos[ub][0]) * (Datos[ub][2] - Peso_agua);
          }
        } else {
          const d = Nfreatico - Df;
          if (d <= B) {
            const Peso_prima = Peso_sumergido2;
            ganma = Peso_prima + (d / B) * (Peso_especifico2 - Peso_prima);
          } else {
            ganma = Peso_especifico2;
          }
          for (let m = 0; m <= ub; m++) {
            const ant = m === 0 ? 0 : Datos[m - 1][0];
            const altura = m === ub ? Df - ant : Datos[m][0] - ant;
            q += altura * Datos[m][1];
          }
        }

        const phiRad = this.degToRad(phi);
        const tanPhi = Math.tan(phiRad);
        const sinPhi = Math.sin(phiRad);
        const Nq = Math.pow(Math.tan(Math.PI / 4 + phiRad / 2), 2) * Math.exp(Math.PI * tanPhi);
        const Nc = (Nq - 1) / tanPhi;
        const Ng = (Nq - 1) * Math.tan(1.4 * phiRad);

        const Fcs = 1 + (B * Nq) / (L * Nc);
        const Fqs = 1 + (B * tanPhi) / L;
        const Fgs = 1 - 0.4 * B / L;

        let Fcd, Fqd;
        if (Df / B <= 1) {
          if (phi === 0) {
            Fcd = 1 + 0.4 * Df / B;
            Fqd = 1;
          } else {
            Fqd = 1 + 2 * tanPhi * Math.pow(1 - sinPhi, 2) * (Df / B);
            Fcd = Fqd - (1 - Fqd) / (Nc * tanPhi);
          }
        } else {
          if (phi === 0) {
            Fcd = 1 + 0.4 * Math.atan(Df / B);
            Fqd = 1;
          } else {
            Fqd = 1 + 2 * tanPhi * Math.pow(1 - sinPhi, 2) * Math.atan(Df / B);
            Fcd = Fqd - (1 - Fqd) / (Nc * tanPhi);
          }
        }

        const Fgd = 1;

        const Fci = Math.pow(1 - this.Beta / 90, 2);
        const Fqi = Fci;
        const Fgi = 1 - this.Beta / phi;

        const qu = c * Nc * Fcs * Fcd * Fci + q * Nq * Fqs * Fqd * Fqi + 0.5 * ganma * B * Ng * Fgs * Fgd * Fgi;
        const qadm = qu / 3;

        console.log(L)

        // Store results
        this.Qu[i][j] = qu;
        this.Qa[i][j] = qadm;

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
      DF_data: this.DF_data,
      B_data: this.B_data,
    };
  }
}

export { QadmMeyerhof };
