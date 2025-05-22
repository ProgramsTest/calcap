let pyodide = null;

// Load Pyodide and Python script
async function loadPyodideAndPackages() {
  pyodide = await loadPyodide();
  const response = await fetch("meyerhof.py");
  const pythonCode = await response.text();
  pyodide.runPython(pythonCode);
}

// Call this once on page load
loadPyodideAndPackages();

async function runCalculation() {
  // Get values from input fields
  const profundidad = parseFloat(document.getElementById("profundidad").value);
  const largo = parseFloat(document.getElementById("largo").value);
  const ancho = parseFloat(document.getElementById("ancho").value);
  const nfreatico = parseFloat(document.getElementById("nfreatico").value);
  const beta = parseFloat(document.getElementById("beta").value);

  // Define the stratigraphy (for simplicity, using hardcoded sample here)
  const datos = [
    [0.80, 1.80, 1.80, 22, 0],
    [1.40, 1.80, 1.80, 22, 0],
    [8.00, 1.80, 1.80, 22, 0]
  ];

  // Make datos a Python-compatible string
  const datosStr = JSON.stringify(datos);

  // Run the calculation
  const code = `
import json
from meyerhof import MeyerhofCalculator

datos = json.loads('''${datosStr}''')
calc = MeyerhofCalculator(datos, ${nfreatico}, ${beta}, [${profundidad}], [${largo}], [${ancho}])
resultados = {
    "qu": calc.resultados_qu[0],
    "qa": calc.resultados_qa[0]
}
`;

  await pyodide.runPythonAsync(code);
  const result = pyodide.globals.get("resultados").toJs();

  // Display results
  document.getElementById("resultado").innerHTML = `
    <strong>Capacidad Última (qu):</strong> ${result.qu.toFixed(2)} kPa<br>
    <strong>Capacidad Admisible (qa):</strong> ${result.qa.toFixed(2)} kPa
  `;
}
