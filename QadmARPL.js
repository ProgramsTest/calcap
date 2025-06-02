// Clase para calcular la capacidad portante admisible según el método ARPL
class QadmARPL {
  constructor(
    Datos_Estratos,     // Matriz con datos de estratos [profundidad, peso_esp, peso_sat, phi, cohesión]
    B_min, B_max, dB,    // Rango y paso para el ancho de la zapata
    L,                   // Largo de la zapata (valor fijo)
    DF_min, DF_max, dF,  // Rango y paso para profundidad de desplante
    Nfreatico,           // Nivel freático
    Beta = 0             // Ángulo de inclinación de la carga (grados)
  ) {
    // Almacenar datos de entrada
    this._Datos_Estratos = Datos_Estratos;
    this.B_data = this._buildArray(B_min, B_max, dB);
    this.L = L;
    this.DF_data = this._buildArray(DF_min, DF_max, dF);
    this.Nfreatico = Nfreatico;
    this.Beta = Beta;

    // Inicializar contenedores de salida
    this.matrix_B_Df = {
      Qu: this._initMatrix(this.DF_data.length, this.B_data.length),
      Qa: this._initMatrix(this.DF_data.length, this.B_data.length),
      Fcd: this._initMatrix(this.DF_data.length, this.B_data.length),
      Fqd: this._initMatrix(this.DF_data.length, this.B_data.length),
      Fgd: this._initMatrix(this.DF_data.length, this.B_data.length)
    };

    this.vector_B = {
      Fcs: Array(this.B_data.length).fill(0),
      Fqs: Array(this.B_data.length).fill(0),
      Fgs: Array(this.B_data.length).fill(0)
    };

    this.scalars = {
      Nc: 0, Nq: 0, Ng: 0,
      Fci: 0, Fqi: 0, Fgi: 0
    };

    this._procesaCap();
  }

  // Genera arreglo de min a max con paso
  _buildArray(min, max, step) {
    if (min === max) return [min];
    const arr = [];
    for (let v = min; v <= max + 1e-9; v += step) arr.push(+v.toFixed(10));
    return arr;
  }

  _initMatrix(rows, cols) {
    return Array.from({ length: rows }, () => Array(cols).fill(0));
  }

  _tand(deg) { return Math.tan(deg * Math.PI / 180); }
  _sind(deg) { return Math.sin(deg * Math.PI / 180); }
  _exp(x)    { return Math.exp(x); }

  // Lógica de cálculo principal
  _procesaCap() {
    const cols = this.B_data.length;
    const rows = this.DF_data.length;
    const Peso_agua = 1;
    const Datos = this._Datos_Estratos;

    for (let j = 0; j < cols; j++) {
      // Calculamos factores independientes de Df (vector_B)
      const B = this.B_data[j];
      const phi_dummy = Datos[0][3]; // si homogéneo, usar primer estrato
      const phiRad = phi_dummy * Math.PI / 180;
      this.vector_B.Fcs[j] = 1 + (B * Math.pow(Math.tan(Math.PI/4 + phiRad/2),2) * this._exp(Math.PI*this._tand(phi_dummy))) /
                            (this.L * ((Math.pow(Math.tan(Math.PI/4 + phiRad/2),2)*this._exp(Math.PI*this._tand(phi_dummy))-1)/this._tand(phi_dummy)));
      this.vector_B.Fqs[j] = 1 + (B * this._tand(phi_dummy)) / this.L;
      this.vector_B.Fgs[j] = 1 - 0.4 * B / this.L;
    }

    for (let i = 0; i < rows; i++) {
      const Df = this.DF_data[i];
      for (let j = 0; j < cols; j++) {
        const B = this.B_data[j];

        // Selección de propiedades del primer estrato (homogéneo)
        const [ , peso_esp, peso_sat, phi, c ] = Datos[0];
        const peso_sum = peso_sat - Peso_agua;

        // q y gamma
        let gamma_eff = (this.Nfreatico <= Df ? peso_sum : peso_esp);
        let q = Df * peso_esp;

        // Factores de capacidad (escalars)
        const phiRad = phi * Math.PI / 180;
        const tanPhi = Math.tan(phiRad);
        const sinPhi = Math.sin(phiRad);
        const Nq = phi === 0 ? 1 : Math.pow(Math.tan(Math.PI/4 + phiRad/2),2) * this._exp(Math.PI*tanPhi);
        const Nc = phi === 0 ? 5.14 : (Nq - 1) / tanPhi;
        const Ng = phi === 0 ? 0 : (Nq - 1) * this._tand(1.4 * phi);

        // Guardar escalares sólo al primer caso
        if (i === 0 && j === 0) {
          Object.assign(this.scalars, { Nq, Nc, Ng });
          this.scalars.Fci = Math.pow(1 - this.Beta/90,2);
          this.scalars.Fqi = this.scalars.Fci;
          this.scalars.Fgi = phi === 0 ? 1 : 1 - this.Beta/phi;
        }

        // Factores de profundidad
        const ratio = Df / B;
        const base = ratio <= 1 ? ratio : Math.atan(ratio);
        const Fqd = phi === 0 ? 1 : 1 + 2 * this._tand(phi) * Math.pow(1 - sinPhi,2) * base;
        const Fcd = phi === 0 ? 1 + 0.4 * base : Fqd - (1 - Fqd) / (Nc * tanPhi);
        const Fgd = 1;

        // Cálculo de Qu y Qa
        const Fcs = this.vector_B.Fcs[j];
        const Fqs = this.vector_B.Fqs[j];
        const Fgs = this.vector_B.Fgs[j];
        const { Fci, Fqi, Fgi } = this.scalars;

        const qu = c * Nc * Fcs * Fcd * Fci
                 + q * Nq * Fqs * Fqd * Fqi
                 + 0.5 * gamma_eff * B * Ng * Fgs * Fgd * Fgi;
        const qa = qu / 3;

        // Asignar a matrix_B_Df
        this.matrix_B_Df.Qu[i][j]  = qu;
        this.matrix_B_Df.Qa[i][j]  = qa;
        this.matrix_B_Df.Fcd[i][j]= Fcd;
        this.matrix_B_Df.Fqd[i][j]= Fqd;
        this.matrix_B_Df.Fgd[i][j]= Fgd;
      }
    }
  }

  // Devuelve resultados con la estructura solicitada
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

export { QadmARPL };
