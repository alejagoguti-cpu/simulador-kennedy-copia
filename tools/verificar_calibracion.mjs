/* Verificación breve de los cinco pares calibrados: node tools/verificar_calibracion.mjs */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import * as S from '../data3d/simulaciones12.js';
import { ORG_KG_HAB_DIA, FUENTES_PARES } from '../data3d/sim_fuentes.js';
import { PARCHES } from '../data3d/sim_red_datos.js';

await S.cargarDatos(u => JSON.parse(readFileSync(fileURLToPath(u), 'utf8')));
assert.equal(S.TOMTOM.congestion, 69.6);
assert.equal(S.BASURA_SUP.ORGANICO, 0.5132);
assert.ok(ORG_KG_HAB_DIA > 0.34 && ORG_KG_HAB_DIA < 0.36);
for (const [id, ha] of Object.entries({ burro: 18.84, vaca: 9.94, techo: 11.67 }))
  assert.equal(PARCHES.find(p => p.id === id).ha, ha);

for (let par = 2; par <= 6; par++) {
  assert.ok(FUENTES_PARES[par].length > 0);
  for (const propuesta of [false, true]) {
    const id = 2 * par - (propuesta ? 0 : 1), E = S.crear(id, 1);
    for (let sem = 0; sem < 120; sem++) S.paso(E);
    const I = S.ind(E);
    assert.equal(I.par, par);
    assert.ok(Number.isFinite(I.trafico) && Number.isFinite(I.humedalFuncional));
    if (par === 3) assert.ok(Number.isFinite(I.evaluacion.territorio.organicos));
    if (par === 5) assert.ok(Number.isFinite(I.especulacion.hogaresRiesgo));
    if (par === 6) assert.ok(Number.isFinite(I.gobernanza.coberturaMedia));
    console.log(`Par ${par} ${propuesta ? 'con' : 'sin'} propuesta: 120 semanas, OK`);
  }
}

