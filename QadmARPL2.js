class QadmARPL2 {
    /**
     * Calcula Capacidad Portante usando parámetros del suelo, zapata y nivel freático.
     */
    
    constructor(datosEstratos, nf, beta, df, l, b) {
        this.mDatos_Estratos = datosEstratos;  // Datos de estratos
        this.mNF = nf;  // Nivel freático
        this.mBeta = beta;  // Ángulo de inclinación
        this.mDf = df;  // Profundidad de fundación
        this.mL = l;  // Longitud de la zapata
        this.mB = b;  // Ancho de la zapata
        this.procesaCap();  // Ejecuta el cálculo al instanciar
    }

    procesaCap() {
        const Datos = this.mDatos_Estratos;
        const Nfreatico = this.mNF;
        const Beta = this.mBeta;
        const DF = this.mDf;
        const L_data = this.mL;
        const B_data = this.mB;
        const Peso_agua = 1;  // Unidad convencional para simplificación

        const Num_1 = DF.length;
        const Num_2 = L_data.length;
        const Num_Estratos = Datos.length;

        // Initialize result matrices
        this.mQu_Resultados = Array(Num_1).fill().map(() => Array(Num_2).fill(0));
        this.mQa_Resultados = Array(Num_1).fill().map(() => Array(Num_2).fill(0));
        this.mNc = Array(Num_1).fill().map(() => Array(Num_2).fill(0));
        this.mNq = Array(Num_1).fill().map(() => Array(Num_2).fill(0));
        this.mNg = Array(Num_1).fill().map(() => Array(Num_2).fill(0));
        this.mFcs = Array(Num_1).fill().map(() => Array(Num_2).fill(0));
        this.mFqs = Array(Num_1).fill().map(() => Array(Num_2).fill(0));
        this.mFgs = Array(Num_1).fill().map(() => Array(Num_2).fill(0));
        this.mFcd = Array(Num_1).fill().map(() => Array(Num_2).fill(0));
        this.mFqd = Array(Num_1).fill().map(() => Array(Num_2).fill(0));
        this.mFgd = Array(Num_1).fill().map(() => Array(Num_2).fill(0));
        this.mFci = Array(Num_1).fill().map(() => Array(Num_2).fill(0));
        this.mFqi = Array(Num_1).fill().map(() => Array(Num_2).fill(0));
        this.mFgi = Array(Num_1).fill().map(() => Array(Num_2).fill(0));

        for (let i = 0; i < Num_1; i++) {
            const Df = DF[i];
            for (let j = 0; j < Num_2; j++) {
                const L = L_data[j];
                const B = B_data[j];

                let c, phi, Peso_especifico2, Peso_saturado2, Peso_sumergido2, ub;

                // Identificar el estrato donde se encuentra el fondo de la zapata
                for (let k = 0; k < Num_Estratos; k++) {
                    const D0 = k === 0 ? 0 : Datos[k-1][0];
                    const D1 = Datos[k][0];

                    if (D1 > Df && D0 <= Df) {
                        c = Datos[k][4];  // cohesión
                        phi = Datos[k][3];  // ángulo de fricción
                        Peso_especifico2 = Datos[k][1];
                        Peso_saturado2 = Datos[k][2];
                        Peso_sumergido2 = Peso_saturado2 - Peso_agua;
                        ub = k;
                        break;
                    }
                }

                let ganma, q;

                // Cálculo del peso específico y q dependiendo del nivel freático
                if (Nfreatico <= Df) {
                    ganma = Peso_sumergido2;
                    q = 0;
                    for (let l = 0; l <= ub; l++) {
                        const ant = l === 0 ? 0 : Datos[l-1][0];
                        if (Datos[l][0] <= Nfreatico) {
                            q += (Datos[l][0] - ant) * Datos[l][1];
                        } else {
                            if (l === ub) {
                                if (Datos[l-1][0] > Nfreatico) {
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
                    } else {
                        ganma = Peso_especifico2;
                    }

                    q = 0;
                    for (let m = 0; m <= ub; m++) {
                        const ant = m === 0 ? 0 : Datos[m-1][0];
                        const altura = m === ub ? Df - ant : Datos[m][0] - ant;
                        q += altura * Datos[m][1];
                    }
                }

                // Factores de carga
                let Nq, Nc, Ng;
                if (phi === 0) {
                    Nq = 1;
                    Nc = 5.14;
                    Ng = 0;
                } else {
                    const phi_rad = phi * Math.PI / 180;
                    Nq = Math.pow(Math.tan((45 + phi / 2) * Math.PI / 180), 2) * Math.exp(Math.PI * Math.tan(phi_rad));
                    Nc = (Nq - 1) / Math.tan(phi_rad);
                    Ng = (Nq - 1) * Math.tan(1.4 * phi_rad);  // Norma E.050
                }

                // Factores de forma
                const Kp = Math.pow(Math.tan(phi / 2 * Math.PI / 180 + Math.PI / 4), 2);
                let Fcs, Fqs, Fgs;
                if (phi === 0) {
                    Fcs = 1 + 0.2 * B / L;
                    Fqs = 1;
                    Fgs = 1;
                } else {
                    Fcs = 1 + 0.2 * Kp * B / L;
                    Fqs = 1 + 0.1 * Kp * B / L;
                    Fgs = 1 + 0.1 * Kp * B / L;
                }

                // Factores de profundidad
                let Fgd, Fqd, Fcd;
                if (phi > 10) {
                    Fgd = 1 + 0.1 * Math.pow(Kp, 0.5) * Df / B;
                    Fqd = 1 + 0.1 * Math.pow(Kp, 0.5) * Df / B;
                    Fcd = 1 + 0.2 * Math.pow(Kp, 0.5) * Df / B;
                } else {
                    Fgd = 1;
                    Fqd = 1;
                    Fcd = 1 + 0.2 * Math.pow(Kp, 0.5) * Df / B;
                }

                // Factores de inclinación
                let Fci, Fqi, Fgi;
                if (phi === 0 && Beta === 0) {
                    Fci = 1;
                    Fqi = 1;
                    Fgi = 1;
                } else {
                    Fci = Math.pow(1 - Beta / 90, 2);
                    Fqi = Fci;
                    Fgi = Math.pow(1 - Beta / phi, 2);
                }

                // Cálculo de capacidad portante
                const qu = c * Nc * Fcs * Fcd * Fci + q * Nq * Fqs * Fqd * Fqi + 0.5 * ganma * B * Ng * Fgs * Fgd * Fgi;
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

    // Getter methods to access results
    getQuResultados() {
        return this.mQu_Resultados;
    }

    getQaResultados() {
        return this.mQa_Resultados;
    }

    getNc() {
        return this.mNc;
    }

    getNq() {
        return this.mNq;
    }

    getNg() {
        return this.mNg;
    }

    getFactoresForma() {
        return {
            Fcs: this.mFcs,
            Fqs: this.mFqs,
            Fgs: this.mFgs
        };
    }

    getFactoresProfundidad() {
        return {
            Fcd: this.mFcd,
            Fqd: this.mFqd,
            Fgd: this.mFgd
        };
    }

    getFactoresInclinacion() {
        return {
            Fci: this.mFci,
            Fqi: this.mFqi,
            Fgi: this.mFgi
        };
    }
}

export { QadmARPL2 };
// Example usage:
/*
const datosEstratos = [
    [2.0, 18.0, 20.0, 30, 10],  // [depth, unit_weight, saturated_weight, friction_angle, cohesion]
    [5.0, 19.0, 21.0, 32, 15],
    [10.0, 20.0, 22.0, 35, 0]
];

const nivelFreatico = 3.0;
const anguloInclinacion = 0;
const profundidades = [1.0, 1.5, 2.0];
const longitudes = [2.0, 3.0, 4.0];
const anchos = [1.5, 2.0, 2.5];

const calculadora = new QadmARPL2(datosEstratos, nivelFreatico, anguloInclinacion, profundidades, longitudes, anchos);

console.log("Capacidad última:", calculadora.getQuResultados());
console.log("Capacidad admisible:", calculadora.getQaResultados());
*/
