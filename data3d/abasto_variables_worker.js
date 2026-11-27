import * as S from './simulaciones12.js?v=45';

const listo = S.cargarDatos(url => fetch(url).then(r => {
  if (!r.ok) throw new Error(`Datos de abastecimiento: HTTP ${r.status}`);
  return r.json();
}));
let pendiente = null, programado = false;

async function calcular() {
  programado = false;
  const actual = pendiente;
  pendiente = null;
  if (!actual) return;
  try {
    await listo;
    const E = S.crear(2, 1, actual.valores), serie = [];
    const metaAutoconsumo = E.ab01.auto;
    const muestra = anio => {
      const I = S.ind(E), A = I.abasto, go = S.gameOver(E);
      return { anio, cobertura:A.ab01.cobK * 100,
        peorZona:A.ab01.zMin * 100, cargaCorabastos:A.cora.carga * 100,
        mercados:A.mercados.filter(m => m.activo).length,
        gameOver:go ? { regla:go.regla, sem:go.sem, motivo:go.motivo, lugar:go.lugar } : null };
    };
    E.ab01.auto = 0;
    S.paso(E); // semana 1 como lectura inicial; ind() requiere un paso previo
    serie.push(muestra(0));
    for (let i = 1; i < 520; i++) {
      E.ab01.auto = metaAutoconsumo * (i + 1) / 520;
      S.paso(E);
      if ((i + 1) % 52 !== 0) continue;
      serie.push(muestra((i + 1) / 52));
    }
    postMessage({ id: actual.id, serie });
  } catch (error) { postMessage({ id: actual.id, error: String(error.message || error) }); }
  if (pendiente && !programado) { programado = true; setTimeout(calcular, 0); }
}
onmessage = event => {
  pendiente = event.data;
  if (!programado) { programado = true; setTimeout(calcular, 0); }
};

