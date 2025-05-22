class QadmARPL {
    constructor(Datos_Estratos, NF, Beta, Df, L, B) {
      this.mDatos_Estratos = Datos_Estratos;
      this.mNF = NF;
      this.mBeta = Beta;
  
      // Normalize all inputs to arrays
      this.mDf = Array.isArray(Df) ? Df : [Df];
      this.mL = Array.isArray(L) ? L : [L];
      this.mB = Array.isArray(B) ? B : [B];
  
      this.initResultArrays();
      this.Procesa_Cap();
    }
  
    initResultArrays() {
      const rows = this.mDf.length;
      const cols = this.mL.length;
      const zeroMatrix = () => Array.from({ length: rows }, () => Array(cols).fill(0));
  
      this.mQu_Resultados = zeroMatrix();
      this.mQa_Resultados = zeroMatrix();
      this.mNc = zeroMatrix();
      this.mNq = zeroMatrix();
      this.mNg = zeroMatrix();
      this.mFcs = zeroMatrix();
      this.mFqs = zeroMatrix();
      this.mFgs = zeroMatrix();
      this.mFcd = zeroMatrix();
      this.mFqd = zeroMatrix();
      this.mFgd = zeroMatrix();
      this.mFci = zeroMatrix();
      this.mFqi = zeroMatrix();
      this.mFgi = zeroMatrix();
    }
  
    Procesa_Cap() {
      const Datos = this.mDatos_Estratos;
      const Nfreatico = this.mNF;
      const Beta = this.mBeta;
      const DF = this.mDf;
      const L_data = this.mL;
      const B_data = this.mB;
      const Peso_agua = 1;
  
      for (let i = 0; i < DF.length; i++) {
        const Df = DF[i];
  
        for (let j = 0; j < L_data.length; j++) {
          const L = L_data[j];
          const B = B_data[j];
          let c = 0, phi = 0, Peso_especifico2 = 0, Peso_saturado2 = 0, Peso_sumergido2 = 0, ub = 0;
  
          for (let k = 0; k < Datos.length; k++) {
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
  
          let q = 0, ganma = 0;
  
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
            ganma = d <= B
              ? Peso_sumergido2 + (d / B) * (Peso_especifico2 - Peso_sumergido2)
              : Peso_especifico2;
  
            for (let m = 0; m < ub; m++) {
              const ant = m === 0 ? 0 : Datos[m - 1][0];
              const altura = m === ub - 1 ? Df - ant : Datos[m][0] - ant;
              q += altura * Datos[m][1];
            }
          }
  
          let Nc, Nq, Ng;
          if (phi === 0) {
            Nq = 1;
            Nc = 5.14;
            Ng = 0;
          } else {
            const phiRad = phi * Math.PI / 180;
            Nq = Math.pow(Math.tan(Math.PI / 4 + phiRad / 2), 2) * Math.exp(Math.PI * Math.tan(phiRad));
            Nc = (Nq - 1) / Math.tan(phiRad);
            Ng = 2 * (Nq + 1) * Math.tan(phiRad);
          }
  
          const Fcs = 1 + B * Nq / (L * Nc);
          const Fqs = 1 + B * Math.tan(phi * Math.PI / 180) / L;
          const Fgs = 1 - 0.4 * B / L;
  
          let Fcd, Fqd, Fgd;
          const Df_B = Df / B;
          if (Df_B <= 1) {
            if (phi === 0) {
              Fcd = 1 + 0.4 * Df_B;
              Fqd = 1;
              Fgd = 1;
            } else {
              const tanPhi = Math.tan(phi * Math.PI / 180);
              const sinPhi = Math.sin(phi * Math.PI / 180);
              Fqd = 1 + 2 * tanPhi * Math.pow(1 - sinPhi, 2) * Df_B;
              Fcd = Fqd - (1 - Fqd) / (Nc * tanPhi);
              Fgd = 1;
            }
          } else {
            if (phi === 0) {
              Fcd = 1 + 0.4 * Math.atan(Df_B);
              Fqd = 1;
              Fgd = 1;
            } else {
              const tanPhi = Math.tan(phi * Math.PI / 180);
              const sinPhi = Math.sin(phi * Math.PI / 180);
              Fqd = 1 + 2 * tanPhi * Math.pow(1 - sinPhi, 2) * Math.atan(Df_B);
              Fcd = Fqd - (1 - Fqd) / (Nc * tanPhi);
              Fgd = 1;
            }
          }
  
          let Fci, Fqi, Fgi;
          if (phi === 0 && Beta === 0) {
            Fci = 1;
            Fqi = 1;
            Fgi = 1;
          } else {
            Fci = Math.pow((1 - Beta / 90), 2);
            Fqi = Fci;
            Fgi = 1 - Beta / phi;
          }
  
          const qu = c * Nc * Fcs * Fcd * Fci +
                     q * Nq * Fqs * Fqd * Fqi +
                     0.5 * ganma * B * Ng * Fgs * Fgd * Fgi;
  
          const qadm = qu / 3;
  
          this.mQu_Resultados[i][j] = qu;
          this.mQa_Resultados[i][j] = qadm;
          this.mNc[i][j] = Nc;
          this.mNq[i][j] = Nq;
          this.mNg[i][j] = Ng;
          this.mFcs[i][j] = Fcs;
          this.mFqs[i][j] = Fqs;
          this.mFgs[i][j] = Fgs;
          this.mFcd[i][j] = Fcd;
          this.mFqd[i][j] = Fqd;
          this.mFgd[i][j] = Fgd;
          this.mFci[i][j] = Fci;
          this.mFqi[i][j] = Fqi;
          this.mFgi[i][j] = Fgi;
        }
      }
    }
  
    getResultados() {
      return {
        Qu: this.mQu_Resultados,
        Qa: this.mQa_Resultados,
        Nc: this.mNc,
        Nq: this.mNq,
        Ng: this.mNg,
        Fcs: this.mFcs,
        Fqs: this.mFqs,
        Fgs: this.mFgs,
        Fcd: this.mFcd,
        Fqd: this.mFqd,
        Fgd: this.mFgd,
        Fci: this.mFci,
        Fqi: this.mFqi,
        Fgi: this.mFgi
      };
    }
  }
  
  export { QadmARPL };
  
