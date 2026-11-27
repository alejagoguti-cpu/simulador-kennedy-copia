import * as S from './simulaciones12.js?v=44';

const listo = S.cargarDatos(url => fetch(url).then(r => {
  if (!r.ok) throw new Error(`Datos de residuos: HTTP ${r.status}`);
  return r.json();
}));
let ultimo = 0;

onmessage = async ({ data }) => {
  const token = ++ultimo;
  try {
    await listo;
    const E = S.crear(data.sim, 1, data.valores), serie = [];
    for (let sem = 1; sem <= 780; sem++) {
      S.paso(E);
      if (sem !== 1 && sem % 13 !== 0) continue;
      const I = S.ind(E), go = S.gameOver(E);
      serie.push({ sem:sem === 1 ? 0 : sem,
        estaciones:I.estaciones.filter(e => e.tipo === 'estacion').map(e => ({ n:e.n, x:e.x, z:e.z, tratado:e.tratado_t_dia })),
        organicos:I.circular.organicos_t_dia, compost:I.circular.compostado_t_dia,
        sinRecoger:I.basura.fraccionSinRecoger * 100, circular:I.circular.indice * 100,
        gameOver:go ? { sem:go.sem, regla:go.regla, motivo:go.motivo } : null });
    }
    if (token === ultimo) postMessage({ id:data.id, serie });
  } catch (error) { if (token === ultimo) postMessage({ id:data.id, error:String(error.message || error) }); }
};

