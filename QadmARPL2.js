// Clase para calcular la capacidad portante admisible según el método ARPL2
class QadmARPL2 {
  constructor(
    Datos_Estratos,     // Matriz con datos de estratos [profundidad, peso_esp, peso_sat, phi, cohesión]
    B_min, B_max, dB,    // Rango y paso para el ancho de la zapata
    L,                   // Largo de la zapata (valor fijo)
    DF_min, DF_max, dF,  // Rango y paso para profundidad de desplante
    Nfreatico,           // Nivel freático
    Beta = 0             // Ángulo de inclinación de la carga (grados)
  ) {
    // Almacenamos datos iniciales
    this._Datos_Estratos = Datos_Estratos;
    this.Beta = Beta;
    this.Nfreatico = Nfreatico;
    this.Peso_agua = 1;

    // Construcción de vectores B y DF
    this.B_data = this._buildArray(B_min, B_max, dB);
    this.L = L;
    this.DF_data = DF_min === DF_max ? [DF_min] : this._buildArray(DF_min, DF_max, dF);

    // Inicialización de contenedores de resultados
    const rows = this.DF_data.length;
    const cols = this.B_data.length;
    const initMat = () => Array.from({ length: rows }, () => Array(cols).fill(0));

    this.matrix_B_Df = {
      Qu: initMat(),
      Qa: initMat(),
      Fcd: initMat(),
      Fqd: initMat(),
      Fgd: initMat()
    };

    this.vector_B = {
      Fcs: Array(cols).fill(0),
      Fqs: Array(cols).fill(0),
      Fgs: Array(cols).fill(0)
    };

    this.scalars = {
      Nq: 0, Nc: 0, Ng: 0,
      Fci: 0, Fqi: 0, Fgi: 0
    };

    // Cálculo principal
    this._computeBearingCapacity();
  }

  // Genera arreglo de min a max con paso
  _buildArray(min, max, step) {
    const arr = [];
    for (let v = min; v <= max + 1e-9; v += step) arr.push(+v.toFixed(10));
    return arr;
  }

  _tand(deg) { return Math.tan(deg * Math.PI / 180); }
  _sind(deg) { return Math.sin(deg * Math.PI / 180); }
  _exp(x)    { return Math.exp(x); }

  // Lógica de cálculo análoga a QadmARPL pero con separación de salidas
  _computeBearingCapacity() {
    const cols = this.B_data.length;
    const rows = this.DF_data.length;
    const Datos = this._Datos_Estratos;

    // Vector_B: factores de forma independientes de Df (usamos primer estrato)
    const [ , , , phi0 ] = Datos[0];
    const phiRad0 = phi0 * Math.PI / 180;
    for (let j = 0; j < cols; j++) {
      const B = this.B_data[j];
      // Shape factors
      const Nq0 = phi0 === 0 ? 1 : Math.pow(this._tand(45 + phi0/2),2) * this._exp(Math.PI*this._tand(phi0));
      const Nc0 = phi0 === 0 ? 5.14 : (Nq0 - 1)/this._tand(phi0);
      this.vector_B.Fcs[j] = 1 + (B * Nq0)/(this.L * Nc0);
      this.vector_B.Fqs[j] = 1 + (B * this._tand(phi0))/this.L;
      this.vector_B.Fgs[j] = 1 - 0.4 * B / this.L;
    }

    // Barrido sobre Df y B para matrices
    for (let i = 0; i < rows; i++) {
      const Df = this.DF_data[i];
      for (let j = 0; j < cols; j++) {
        const B = this.B_data[j];
        const L = this.L;

        // Propiedades del estrato activo (homogéneo: primer estrato)
        const [ , gamma, gamma_sat, phi, c ] = Datos[0];
        const gamma_sub = gamma_sat - this.Peso_agua;

        // q y gamma efectivo
        let q = Df * gamma;
        let gamma_eff = this.Nfreatico <= Df ? gamma_sub : gamma;

        // Bearing capacity factors (escalars)
        const phiRad = phi * Math.PI / 180;
        const tanPhi = this._tand(phi);
        const sinPhi = this._sind(phi);
        const Nq = phi === 0 ? 1 : Math.pow(Math.tan(Math.PI/4 + phiRad/2),2) * this._exp(Math.PI*tanPhi);
        const Nc = phi === 0 ? 5.14 : (Nq - 1)/tanPhi;
        const Ng = phi === 0 ? 0 : (Nq - 1)*this._tand(1.4*phi);

        if (i===0 && j===0) {
          Object.assign(this.scalars, { Nq, Nc, Ng });
          this.scalars.Fci = Math.pow(1 - this.Beta/90,2);
          this.scalars.Fqi = this.scalars.Fci;
          this.scalars.Fgi = phi===0?1:1 - this.Beta/phi;
        }

        // Depth factors
        const ratio = Df/B;
        const base = ratio <= 1? ratio: Math.atan(ratio);
        const Fqd = phi===0?1:1 + 2 * this._tand(phi)*Math.pow(1-sinPhi,2)*base;
        const Fcd = phi===0? 1 + 0.4*base : Fqd - (1-Fqd)/(Nc*tanPhi);
        const Fgd = 1;

        // Recuperar shape factors y scalars
        const { Fcs, Fqs, Fgs } = this.vector_B;
        const { Fci, Fqi, Fgi } = this.scalars;

        // Cálculo Qu y Qa
        const qu = c * Nc * Fcs[j] * Fcd * Fci
                 + q * Nq * Fqs[j] * Fqd * Fqi
                 + 0.5 * gamma_eff * B * Ng * Fgs[j] * Fgd * Fgi;
        const qa = qu/3;

        // Asignar a matrices
        this.matrix_B_Df.Qu[i][j]  = qu;
        this.matrix_B_Df.Qa[i][j]  = qa;
        this.matrix_B_Df.Fcd[i][j]= Fcd;
        this.matrix_B_Df.Fqd[i][j]= Fqd;
        this.matrix_B_Df.Fgd[i][j]= Fgd;
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
