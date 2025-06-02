// main.js - Calculadora de Capacidad Portante con Interfaz
// Importar las clases desde sus archivos respectivos
import { QadmMeyerhof } from './QadmMeyerhof.js';
import { QadmARPL2 } from './QadmARPL2.js';
import { QadmARPL } from './QadmARPL.js';


/**
 * Calculadora principal de capacidad portante
 */
class BearingCapacityCalculator {
    constructor() {
        this.availableMethods = {
            'meyerhof': QadmMeyerhof,
            'arpl2': QadmARPL2,
            'arpl': QadmARPL
        };
        this.initializeInterface();
    }

    initializeInterface() {
        // Inicializar tabla de estratos
        this.updateEstratoTable();
        
        // Configurar event listeners
        document.getElementById('procesaBtn').addEventListener('click', () => this.procesarCalculo());
        document.getElementById('numEstratos').addEventListener('change', () => this.updateEstratoTable());
        
        // Cargar valores por defecto
        this.loadDefaultValues();
    }

    updateEstratoTable() {
        const numEstratos = parseInt(document.getElementById('numEstratos').value);
        const tbody = document.getElementById('estratosBody');
        tbody.innerHTML = '';

        for (let i = 0; i < numEstratos; i++) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="number" step="0.01" value="${this.getDefaultCota(i)}" id="cota_${i}"></td>
                <td><input type="number" step="0.01" value="1.80" id="pesoEsp_${i}"></td>
                <td><input type="number" step="0.01" value="1.80" id="pesoSat_${i}"></td>
                <td><input type="number" step="0.01" value="22" id="angFriccion_${i}"></td>
                <td><input type="number" step="0.01" value="0" id="cohesion_${i}"></td>
            `;
            tbody.appendChild(row);
        }
    }

    getDefaultCota(index) {
        const defaultCotas = [0.80, 1.40, 8.00, 8.00, 10.00, 12.00, 15.00, 18.00, 20.00, 25.00];
        return defaultCotas[index] || (index + 1) * 2;
    }

    loadDefaultValues() {
        // Valores por defecto del ejemplo
        const defaults = {
            cotaNivelFreatico: 7,
            beta: 0,
            dimMenorZapata: 2.2,
            incrementoLB: 1,
            profundidadMenorDf: 1.5,
            incrementoDf: 0.5,
            formulaEmplear: 'arpl2',
            unidadesResultados: 'tn/m2'
        };

        Object.entries(defaults).forEach(([key, value]) => {
            const element = document.getElementById(key);
            if (element) {
                element.value = value;
            }
        });
    }

    getDatosEstratos() {
        const numEstratos = parseInt(document.getElementById('numEstratos').value);
        const datos = [];

        for (let i = 0; i < numEstratos; i++) {
            const cota = parseFloat(document.getElementById(`cota_${i}`).value);
            const pesoEsp = parseFloat(document.getElementById(`pesoEsp_${i}`).value);
            const pesoSat = parseFloat(document.getElementById(`pesoSat_${i}`).value);
            const angFriccion = parseFloat(document.getElementById(`angFriccion_${i}`).value);
            const cohesion = parseFloat(document.getElementById(`cohesion_${i}`).value);

            datos.push([cota, pesoEsp, pesoSat, angFriccion, cohesion]);
        }

        return datos;
    }

    getParametros() {

        return {
            Nfreatico: parseFloat(document.getElementById('cotaNivelFreatico').value),
            beta: parseFloat(document.getElementById('beta').value),
            L: parseFloat(document.getElementById('L').value),
            B_min: parseFloat(document.getElementById('Bmin').value),
            B_max: parseFloat(document.getElementById('Bmax').value),
            dB: parseFloat(document.getElementById('dB').value),
            DF_min: parseFloat(document.getElementById('DFmin').value),
            DF_max: parseFloat(document.getElementById('DFmax').value),
            dF: parseFloat(document.getElementById('incrementoDf').value),
            formula: document.getElementById('formulaEmplear').value,
            unidades: document.getElementById('unidadesResultados').value
        };
    }

    // generarDimensiones(params) {
    //     // Generar arrays de dimensiones basados en los parámetros
    //     const df = [params.profundidadMenorDf]; // Por ahora solo una profundidad
    //     const b = [params.dimMenorZapata]; // Ancho de zapata
    //     const l = [params.dimMenorZapata * params.incrementoLB]; // Largo = ancho * incremento

    //     return { df, l, b };
    // }

    async procesarCalculo() {
        try {
            // Mostrar estado de carga
            document.getElementById('procesaBtn').classList.add('loading');
            document.getElementById('procesaBtn').disabled = true;
            document.getElementById('procesaBtn').textContent = 'PROCESANDO...';

            // Obtener datos de entrada
            const datosEstratos = this.getDatosEstratos();
            const params = this.getParametros();
            
            // const { df, l, b } = this.generarDimensiones(params);

            console.log('Datos de entrada:', {
                datosEstratos,
                nfreatico: params.Nfreatico,
                beta: params.beta,
                // df, l, b,
                formula: params.formula
            });

            // Realizar cálculo 
            const result = this.calculate(
                params.formula,
                datosEstratos,
                params.B_min,
                params.B_max,
                params.dB,
                params.L,
                params.DF_min,
                params.DF_max,
                params.dF,
                params.Nfreatico,
                params.beta
            );


            // Mostrar resultados
            this.mostrarResultados(result, params);

        } catch (error) {
            console.error('Error en el cálculo:', error);
            alert('Error en el cálculo: ' + error.message);
        } finally {
            // Restaurar botón
            document.getElementById('procesaBtn').classList.remove('loading');
            document.getElementById('procesaBtn').disabled = false;
            document.getElementById('procesaBtn').textContent = 'PROCESA';
        }
    }

    calculate(method, datosEstratos, B_min, B_max, dB, L, DF_min, DF_max, dF, Nfreatico, beta) {
        const MethodClass = this.availableMethods[method.toLowerCase()];
        
        if (!MethodClass) {
            throw new Error(`Método '${method}' no disponible. Métodos disponibles: ${Object.keys(this.availableMethods).join(', ')}`);
        }

        return new MethodClass(datosEstratos, B_min, B_max, dB, L, DF_min, DF_max, dF, Nfreatico, beta);
    }

    mostrarResultados(result, params) {
        // Obtener resultados
        const {matrix_B_Df, vector_B, scalars, metadata} = result.getResults();
        // , Fcs, Fqs, Fgs, DF_data, B_data}
        
        const { Qu, Qa, Fcd, Fqd, Fgd } = matrix_B_Df;
        const { Nq, Nc, Ng, Fci, Fqi, Fgi } = scalars;
        const { Fcs, Fqs, Fgs } = vector_B;
        const { DF_data, B_data } = metadata;
        
        console.log("QU", matrix_B_Df.Qu, metadata.DF_data, metadata.B_data);
    
        const qu = result.getQuResultados ? result.getQuResultados() : result.resultados_qu;
        const qa = result.getQaResultados ? result.getQaResultados() : result.resultados_qa;
    
        console.log('Resultados obtenidos:', { qu, qa });
    
        // Actualizar tabla de resultados
        const tbody = document.getElementById('resultsBody');
        tbody.innerHTML = ''; // Limpiar contenido previo
    
        // Obtener factores si están disponibles
        let factores = {};
        if (result.getNc) {
            factores.nc = result.getNc();
            factores.nq = result.getNq();
            factores.ng = result.getNg();
        }
    
        // Crear filas de resultados
        const rows = [
            { label: 'Nc', values: factores.nc || [['-']], unit: '' },
            { label: 'Nq', values: factores.nq || [['-']], unit: '' },
            { label: 'NY', values: factores.ng || [['-']], unit: '' },
            { label: 'Qu', values: qu, unit: this.getUnidadDisplay(params.unidades) },
            { label: 'Qa', values: qa, unit: this.getUnidadDisplay(params.unidades) }
        ];
    
        // TODO: render `rows` into `resultsBody` as needed (your original logic not shown)
    
        // Actualizar headers de dimensiones con valores reales
        this.actualizarHeadersDimensiones(params);
    
        // --- NUEVO: Actualizar la tabla de dimensiones con Qu, DF_data y B_data ---
    
        const headerRow = document.getElementById('tableHeader');
        const tableBody = document.getElementById('dimensionsBody');
    
        // Limpiar cabecera y cuerpo previos
        headerRow.innerHTML = '';
        tableBody.innerHTML = '';
    
        // Crear cabecera
        const emptyTh = document.createElement('th');
        emptyTh.textContent = 'Df \\ B';
        headerRow.appendChild(emptyTh);
    
        B_data.forEach(b => {
            const th = document.createElement('th');
            th.textContent = b;
            headerRow.appendChild(th);
        });
    
        // Crear filas del cuerpo
        DF_data.forEach((df, i) => {
            const row = document.createElement('tr');
    
            const dfCell = document.createElement('td');
            dfCell.textContent = df;
            dfCell.className = 'df-label';
            row.appendChild(dfCell);
    
            B_data.forEach((_, j) => {
                const cell = document.createElement('td');
                cell.textContent = Qu[i]?.[j]?.toFixed(2) ?? '';
                row.appendChild(cell);
            });
    
            tableBody.appendChild(row);
        });
    }

    // mostrarResultados(result, params) {
    //     // Obtener resultados
    //     const {Qu, Qa, Nq, Nc, Ng, Fcs, Fqs, Fgs, Fcd, Fqd, Fgd, Fci, Fqi, Fgi, DF_data, B_data} = result.getResults()
    //     console.log("QU",Qu, DF_data, B_data)
    //     const qu = result.getQuResultados ? result.getQuResultados() : result.resultados_qu;
    //     const qa = result.getQaResultados ? result.getQaResultados() : result.resultados_qa;
        
    //     console.log('Resultados obtenidos:', { qu, qa });

    //     // Actualizar tabla de resultados
    //     const tbody = document.getElementById('resultsBody');
        
    //     // Limpiar contenido previo
    //     tbody.innerHTML = '';

    //     // Obtener factores si están disponibles
    //     let factores = {};
    //     if (result.getNc) {
    //         factores.nc = result.getNc();
    //         factores.nq = result.getNq();
    //         factores.ng = result.getNg();
    //     }

    //     // Crear filas de resultados
    //     const rows = [
    //         { label: 'Nc', values: factores.nc || [['-']], unit: '' },
    //         { label: 'Nq', values: factores.nq || [['-']], unit: '' },
    //         { label: 'NY', values: factores.ng || [['-']], unit: '' },
    //         { label: 'Qu', values: qu, unit: this.getUnidadDisplay(params.unidades) },
    //         { label: 'Qa', values: qa, unit: this.getUnidadDisplay(params.unidades) }
    //     ];



    //     // Actualizar headers de dimensiones con valores reales
    //     this.actualizarHeadersDimensiones(params);
    // }

    actualizarHeadersDimensiones(params) {
        const table = document.getElementById('dimensionsTable');
        const headers = table.querySelectorAll('thead th');
        
        if (headers.length >= 4) {
            headers[1].textContent = `Largo: ${(params.dimMenorZapata * params.incrementoLB).toFixed(1)}m`;
            headers[2].textContent = `Ancho: ${params.dimMenorZapata}m`;
            headers[3].textContent = `Df: ${params.profundidadMenorDf}m`;
        }
    }

    getUnidadDisplay(unidad) {
        const unidades = {
            'tn/m2': 'Tn/m²',
            'kg/cm2': 'Kg/cm²',
            'kpa': 'KPa'
        };
        return unidades[unidad] || unidad;
    }

    getAvailableMethods() {
        return Object.keys(this.availableMethods);
    }
}

// Función global para actualizar tabla de estratos (llamada desde HTML)
window.updateEstratoTable = function() {
    if (window.calculator) {
        window.calculator.updateEstratoTable();
    }
};

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.calculator = new BearingCapacityCalculator();
    console.log('Calculadora de Capacidad Portante inicializada');
    console.log('Métodos disponibles:', window.calculator.getAvailableMethods());
});

// Exportar para uso en otros módulos
export { BearingCapacityCalculator };
