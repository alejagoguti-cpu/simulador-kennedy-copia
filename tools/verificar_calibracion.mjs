/* Verificación breve de los cinco pares calibrados: node tools/verificar_calibracion.mjs */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import * as S from '../data3d/simulaciones12.js';
import { ORG_KG_HAB_DIA, FUENTES_PARES } from '../data3d/sim_fuentes.js';
import { PARCHES } from '../data3d/sim_red_datos.js';
import { SINTAXIS_02 } from '../data3d/sim_sintaxis_02.js';

await S.cargarDatos(u => JSON.parse(readFileSync(fileURLToPath(u), 'utf8')));
assert.equal(S.TOMTOM.congestion, 69.6);
assert.equal(S.BASURA_SUP.ORGANICO, 0.5132);
assert.ok(ORG_KG_HAB_DIA > 0.34 && ORG_KG_HAB_DIA < 0.36);
assert.equal(SINTAXIS_02.pasajes, 20);
assert.ok(SINTAXIS_02.integracionCon > SINTAXIS_02.integracionSin);
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
    if (par === 4) assert.equal(S.gameOver(E), null, 'el deterioro no ha cumplido cuatro semanas de pérdida por especie');
    if (par === 5) assert.ok(I.poblacionKennedy > 1034838);
    console.log(`Par ${par} ${propuesta ? 'con' : 'sin'} propuesta: 120 semanas, OK`);
  }
}
for (const id of [7, 8]) {
  const E = S.crear(id, 1);
  for (let semana = 0; semana < 200 && !S.gameOver(E); semana++) S.paso(E);
  const go = S.gameOver(E);
  assert.equal(go?.regla, 'especie');
  assert.ok(go.sem >= 104 && go.inicio === go.sem - 3);
}
assert.ok(S.SIMS.find(s => s.id === 11).sliders.some(s => s.k === 'barrioPrioritario'));
assert.ok(S.SIMS.find(s => s.id === 12).sliders.some(s => s.k === 'barrioPrioritario'));

// Cada prueba extrema debe detenerse por una regla persistente antes del año 15.
const casosCriticos = [
  [3, { cierreT0: 1, cierreDur: 520, desvioMayo: 100, trafCrece: 3, mitiga: 0 }],
  [5, { orgAumento: 100, orgT0: 1, recoleccion: 50, 'P2.cap': 1000, 'P2.frac': 0 }],
  [7, { parchePerdida: 100, parcheT0: 1, 'P3.arboles': 0, 'P3.rec': 0 }],
  [9, { pobCrece: 3, presionSuelo: 10, proteccion: 0, trafCrece: 3 }],
  [11, { presupuesto: 10, decisionCada: 52, pobCrece: 3, 'P1.cupos': 0 }]
];
for (const [id, valores] of casosCriticos) {
  const E = S.crear(id, 1, valores);
  for (let sem = 0; sem < 15 * 52 && !S.gameOver(E); sem++) S.paso(E);
  const go = S.gameOver(E);
  assert.ok(go, `simulación ${id}: falta Game Over antes de 15 años`);
  assert.equal(go.inicio, go.sem - 3, `simulación ${id}: deben ser cuatro semanas consecutivas`);
  assert.ok(go.sem <= 15 * 52);
  console.log(`Simulación ${id}: Game Over ${go.regla} en semana ${go.sem}`);
}

