// Clase para calcular la capacidad portante admisible según el método de Meyerhof
class QadmMeyerhof {
  constructor(
    Datos,            // Matriz con los datos de los estratos [profundidad, peso_esp, peso_sat, phi, cohesión]
    B_min, B_max, dB, // Rango y paso para el ancho de la zapata
    L,                // Largo de la zapata (valor fijo)
    DF_min, DF_max, dF, // Rango y paso para profundidad de desplante
    Nfreatico,        // Nivel freático
    Beta = 0          // Ángulo de inclinación de la carga (grados)
  ) {
    this.Datos = Datos;
    this.Nfreatico = Nfreatico;
    this.Peso_agua = 1;
    this.Beta = Beta;

    this.B_data = this.range(B_min, B_max, dB);
    this.L_data = Array(this.B_data.length).fill(L);
    this.DF_data = this.range(DF_min, DF_max, dF);

    this.numB = this.B_data.length;
    this.numDF = this.DF_data.length;

    this.initOutputContainers();
    this.calculate();
  }

  // Genera un arreglo con los valores entre min y max con el paso dado
  range(min, max, step) {
    if (min === max) return [min];
    return Array.from({ length: Math.floor((max - min) / step) + 1 }, (_, i) => min + i * step);
  }

  degToRad(deg) {
    return deg * Math.PI / 180;
  }

  // Inicializa contenedores para los diferentes tipos de salidas
  initOutputContainers() {
    const matrix = () => Array.from({ length: this.numDF }, () => Array(this.numB).fill(0));
    const vector = () => Array(this.numB).fill(0);

    this.matrix_B_Df = {
      Qu: matrix(),
      Qa: matrix(),
      Fcd: matrix(),
      Fqd: matrix(),
      Fgd: matrix(),
    };

    this.vector_B = {
      Fcs: vector(),
      Fqs: vector(),
      Fgs: vector(),
    };

    this.scalars = {
      Nc: 0,
      Nq: 0,
      Ng: 0,
      Fci: 0,
      Fqi: 0,
      Fgi: 0,
    };
  }

  calculate() {
    const { Datos, Nfreatico, Peso_agua, B_data, L_data, DF_data } = this;

    for (let i = 0; i < this.numDF; i++) {
      const Df = DF_data[i];

      for (let j = 0; j < this.numB; j++) {
        const B = B_data[j];
        const L = L_data[j];

        // Identificamos el estrato correspondiente según la profundidad Df
        let c, phi, Peso_esp, Peso_sat, Peso_sum, ub;
        for (let k = 0; k < Datos.length; k++) {
          const D0 = k === 0 ? 0 : Datos[k - 1][0];
          const D1 = Datos[k][0];
          if (D1 > Df && D0 <= Df) {
            Peso_esp = Datos[k][1];
            Peso_sat = Datos[k][2];
            phi = Datos[k][3];
            c = Datos[k][4];
            Peso_sum = Peso_sat - Peso_agua;
            ub = k;
            break;
          }
        }

        // Cálculo de q y γ efectivo según nivel freático
        let ganma, q = 0;
        if (Nfreatico <= Df) {
          ganma = Peso_sum;
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
          ganma = d <= B
            ? Peso_sum + (d / B) * (Peso_esp - Peso_sum)
            : Peso_esp;
          for (let m = 0; m <= ub; m++) {
            const ant = m === 0 ? 0 : Datos[m - 1][0];
            const altura = m === ub ? Df - ant : Datos[m][0] - ant;
            q += altura * Datos[m][1];
          }
        }

        // Cálculo de factores de carga
        const phiRad = this.degToRad(phi);
        const tanPhi = Math.tan(phiRad);
        const sinPhi = Math.sin(phiRad);

        const Nq = phi === 0 ? 1 : Math.pow(Math.tan(Math.PI / 4 + phiRad / 2), 2) * Math.exp(Math.PI * tanPhi);
        const Nc = phi === 0 ? 5.14 : (Nq - 1) / tanPhi;
        const Ng = phi === 0 ? 0 : (Nq - 1) * Math.tan(1.4 * phiRad);

        // Guardar escalares (solo una vez)
        if (i === 0 && j === 0) {
          this.scalars.Nq = Nq;
          this.scalars.Nc = Nc;
          this.scalars.Ng = Ng;
        }

        // Factores de forma (sólo una vez por B)
        if (i === 0) {
          this.vector_B.Fcs[j] = 1 + (B * Nq) / (L * Nc);
          this.vector_B.Fqs[j] = 1 + (B * tanPhi) / L;
          this.vector_B.Fgs[j] = 1 - 0.4 * B / L;
        }

        // Factores de profundidad
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

        // Factores de inclinación (constantes)
        const Fci = Math.pow(1 - this.Beta / 90, 2);
        const Fqi = Fci;
        const Fgi = phi === 0 ? 1 : 1 - this.Beta / phi;

        if (i === 0 && j === 0) {
          this.scalars.Fci = Fci;
          this.scalars.Fqi = Fqi;
          this.scalars.Fgi = Fgi;
        }

        // Cálculo de capacidad última y admisible
        const qu = c * Nc * this.vector_B.Fcs[j] * Fcd * Fci
          + q * Nq * this.vector_B.Fqs[j] * Fqd * Fqi
          + 0.5 * ganma * B * Ng * this.vector_B.Fgs[j] * Fgd * Fgi;

        const qa = qu / 3;

        // Guardar resultados
        this.matrix_B_Df.Qu[i][j] = qu;
        this.matrix_B_Df.Qa[i][j] = qa;
        this.matrix_B_Df.Fcd[i][j] = Fcd;
        this.matrix_B_Df.Fqd[i][j] = Fqd;
        this.matrix_B_Df.Fgd[i][j] = Fgd;
      }
    }
  }

  // Devuelve los resultados organizados por tipo
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

export { QadmMeyerhof };
