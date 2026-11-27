/* Deriva los índices de los tramos afectados por los pasajes de Bavaria.
   node tools/extraer_sintaxis_02.mjs */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const base = new URL('../data3d/', import.meta.url);
const leer = nombre => JSON.parse(readFileSync(fileURLToPath(new URL(nombre, base)), 'utf8'));
const G = leer('giro_sim.json'), P = leer('sintaxis_proyecto.json');
let largo = 0, i0 = 0, c0 = 0, i1 = 0, c1 = 0, tramos = 0;
for (const [id, integracion, eleccion] of P.cambios) {
  const S = G.seg[id]; if (!S) throw new Error(`Tramo ${id} ausente en giro_sim.json`);
  largo += S.L; i0 += S.i * S.L; c0 += S.c * S.L; i1 += integracion * S.L; c1 += eleccion * S.L; tramos++;
}
const f = n => Number((n / largo).toFixed(6));
const datos = { tramos, pasajes: P.nuevos.length, largoMetros: Number(largo.toFixed(1)), integracionSin: f(i0), integracionCon: f(i1), eleccionSin: f(c0), eleccionCon: f(c1) };
const salida = `/* Generado por tools/extraer_sintaxis_02.mjs. Índices angulares previos al cierre, no aforos. */\nexport const SINTAXIS_02 = ${JSON.stringify(datos, null, 2)};\n`;
writeFileSync(fileURLToPath(new URL('sim_sintaxis_02.js', base)), salida);
console.log(datos);

