document.getElementById('calculateBtn').addEventListener('click', () => {
  const rawData = document.getElementById('soilData').value.trim();
  const nfreatico = parseFloat(document.getElementById('nfreatico').value);
  const beta = parseFloat(document.getElementById('beta').value);
  const df = parseFloat(document.getElementById('df').value);
  const l = parseFloat(document.getElementById('l').value);
  const b = parseFloat(document.getElementById('b').value);

  const parsedData = parseSoilData(rawData);
  if (!parsedData) {
    alert('Error parsing soil data. Make sure the format is correct.');
    return;
  }

  const results = calcularCapacidadMeyerhof(parsedData, nfreatico, beta, df, l, b);
  displayResults(results);
});

function parseSoilData(data) {
  try {
    return data.split('\n').map(line =>
      line.trim().split(/\s+/).map(Number)
    );
  } catch (e) {
    return null;
  }
}

function calcularCapacidadMeyerhof(datos, nfreatico, beta, df, l, b) {
  const peso_agua = 1;
  let qu = 0;
  let qa = 0;

  let c, phi, peso_esp, peso_sat, peso_sum, ub;

  for (let k = 0; k < datos.length; k++) {
    const d0 = k === 0 ? 0 : datos[k - 1][0];
    const d1 = datos[k][0];

    if (d1 > df && d0 <= df) {
      c = datos[k][4];
      phi = datos[k][3];
      peso_esp = datos[k][1];
      peso_sat = datos[k][2];
      peso_sum = peso_sat - peso_agua;
      ub = k;
    }
  }

  let gamma, q = 0;
  if (nfreatico <= df) {
    gamma = peso_sum;
    for (let i = 0; i <= ub; i++) {
      const ant = i === 0 ? 0 : datos[i - 1][0];
      if (datos[i][0] <= nfreatico) {
        q += (datos[i][0] - ant) * datos[i][1];
      } else {
        if (i === ub) {
          q += (df - ant) * (datos[i][2] - peso_agua);
        } else {
          q += (nfreatico - ant) * datos[i][1] + (datos[i][0] - nfreatico) * (datos[i][2] - peso_agua);
        }
      }
    }
  } else {
    const d = nfreatico - df;
    gamma = d <= b
      ? peso_sum + (d / b) * (peso_esp - peso_sum)
      : peso_esp;

    for (let i = 0; i <= ub; i++) {
      const ant = i === 0 ? 0 : datos[i - 1][0];
      const altura = i === ub ? df - ant : datos[i][0] - ant;
      q += altura * datos[i][1];
    }
  }

  // Factores de carga
  let nq = 1, nc = 5.14, ng = 0;
  if (phi !== 0) {
    nq = Math.pow(Math.tan((45 + phi / 2) * Math.PI / 180), 2) * Math.exp(Math.PI * Math.tan(phi * Math.PI / 180));
    nc = (nq - 1) / Math.tan(phi * Math.PI / 180);
    ng = (nq - 1) * Math.tan(1.4 * phi * Math.PI / 180);
  }

  // Factores de forma
  const fcs = 1 + (b * nq) / (l * nc);
  const fqs = 1 + (b * Math.tan(phi * Math.PI / 180)) / l;
  const fgs = 1 - 0.4 * b / l;

  // Factores de profundidad
  let fcd, fqd, fgd;
  if (df / b <= 1) {
    if (phi === 0) {
      fcd = 1 + 0.4 * df / b;
      fqd = 1;
    } else {
      fqd = 1 + 2 * Math.tan(phi * Math.PI / 180) * Math.pow(1 - Math.sin(phi * Math.PI / 180), 2) * (df / b);
      fcd = fqd - (1 - fqd) / (nc * Math.tan(phi * Math.PI / 180));
    }
    fgd = 1;
  } else {
    if (phi === 0) {
      fcd = 1 + 0.4 * Math.atan(df / b);
      fqd = 1;
    } else {
      fqd = 1 + 2 * Math.tan(phi * Math.PI / 180) * Math.pow(1 - Math.sin(phi * Math.PI / 180), 2) * Math.atan(df / b);
      fcd = fqd - (1 - fqd) / (nc * Math.tan(phi * Math.PI / 180));
    }
    fgd = 1;
  }

  // Factores de inclinación
  const fci = Math.pow(1 - beta / 90, 2);
  const fqi = fci;
  const fgi = phi !== 0 ? (1 - beta / phi) : 1;

  // Capacidad portante última y admisible
  qu = c * nc * fcs * fcd * fci + q * nq * fqs * fqd * fqi + 0.5 * gamma * b * ng * fgs * fgd * fgi;
  qa = qu / 3;

  return { qu, qa };
}

function displayResults({ qu, qa }) {
  document.getElementById('results').innerHTML = `
    <h2>Resultados</h2>
    <p><strong>Capacidad última (qu):</strong> ${qu.toFixed(3)} t/m²</p>
    <p><strong>Capacidad admisible (qa):</strong> ${qa.toFixed(3)} t/m²</p>
  `;
}
