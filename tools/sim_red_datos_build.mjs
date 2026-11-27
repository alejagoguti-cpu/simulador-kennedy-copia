/* Genera data3d/sim_red_datos.js: datos fijos (sin azar) que usa el modelo semanal data3d/sim_vida.js para las tres reglas de game over.
   USO: node tools/sim_red_datos_build.mjs
   · RED VIAL y ZONAS: las mismas de data3d/viajes_mercados.js (construirRed sobre data3d/net.json; construirZonas: celdas de 500 m con los
     lotes del catastro de usos, data3d/usos_edif.json; población = hogares × 3).
   · FUENTES: Corabastos, Bavaria Común, salida hacia el relleno Doña Juana y los 35 mercados de data3d/mercados_red.js.
   · COSTO de cada zona a cada fuente por la red (km generalizados: vías arterias ×1, intermedias ×1,1, locales ×1,35) y largo real (km).
   · CIERRES DE VÍA: 6 vías principales de abastecimiento con su nombre de OpenStreetMap (tools/cache/kennedy_osm.json, name / alt_name):
     se marcan los tramos arteriales e intermedios de la red a menos de 18 m de la vía y se recalcula el costo con esos tramos cerrados.
     Para cada cierre se guarda, por zona y fuente, f = costo normal / costo con el cierre (1 = no cambia; 0 = sin ruta).
   · PARCHES de hábitat: 3 humedales, bosque de Bavaria, 24 parques más grandes (data3d/parques.json), huertas de parque agrupadas en celdas
     de 1,2 km (data3d/huertas_barrio.json), huertas de colegios (data3d/colegios_red.json), 8 grupos de cubiertas compartidas y la huerta
     central de Bavaria. */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..'), D = (f) => JSON.parse(readFileSync(join(REPO, 'data3d', f), 'utf8'));
const imp = (f) => import(pathToFileURL(join(REPO, 'data3d', f)).href);
const LC = { x: 5341.33, y: 3161.9 }, lw = (x, y) => [x - LC.x, LC.y - y], r1 = (v) => Math.round(v * 10) / 10;
const geo = (lat, lng) => lw((lng + 74.17) * 111320 * Math.cos(4.63 * Math.PI / 180) + 5193.24, (lat - 4.63) * 110540 + 2090.06); // mismo marco que geoLL (bavaria_pres.js)
const { construirRed, construirZonas, arbol, CORA, BAVC, PAR: PV } = await imp('viajes_mercados.js');
const { MERCADOS } = await imp('mercados_red.js');
const R = construirRed(D('net.json'), lw), Zs = construirZonas(D('usos_edif.json'), lw, R);
const ZONAS = Zs.map(z => [r1(z.x), r1(z.z), Math.round(z.hog * PV.PERS_HOG)]);
const DJ = [5200, 2900]; // relleno Doña Juana (fuera del mapa, al sureste): la ruta sale por el punto de la red más cercano
const FUENTES = [{ id: 'cora', n: 'Corabastos', x: CORA[0], z: CORA[1] }, { id: 'bav', n: 'Bavaria Común', x: BAVC[0], z: BAVC[1] }, { id: 'dj', n: 'Relleno Doña Juana', x: DJ[0], z: DJ[1] },
  ...MERCADOS.map(m => ({ id: m.id, n: m.n, x: m.x, z: m.z }))];
FUENTES.forEach(f => { const c = R.cercano(f.x, f.z); f.nodo = c.i; f.acc = c.d / 1000; });
// vías principales (OSM)
const VIAS = [['americas', 'Av. de las Américas', /Am[eé]ricas/i], ['boyaca', 'Av. Boyacá', /Boyac[aá]/i], ['cali', 'Av. Ciudad de Cali', /Ciudad de Cali/i],
  ['autosur', 'Autopista Sur', /Autopista Sur/i], ['mayo', 'Av. Primero de Mayo', /Primero de Mayo/i], ['agoberto', 'Av. Agoberto Mejía', /Agoberto/i]];
const OSM = JSON.parse(readFileSync(join(REPO, 'tools', 'cache', 'kennedy_osm.json'), 'utf8')).elements.filter(e => e.type === 'way' && e.tags && e.tags.highway && e.geometry);
const segs = VIAS.map(([, , re]) => { const L = []; for (const w of OSM) { const t = w.tags, nm = [t.name, t.alt_name, t.local_name, t.official_name, t.old_name].filter(Boolean).join(' / ');
  if (!re.test(nm)) continue; const P = w.geometry.map(g => geo(g.lat, g.lon)); for (let i = 1; i < P.length; i++) L.push([P[i - 1], P[i]]); } return L; });
const dSeg = (p, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], l2 = dx * dx + dz * dz || 1, t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2)); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dz); };
const marca = VIAS.map(() => []);
for (let e = 0; e < R.M; e++) { if (R.eC[e] / Math.max(1e-6, R.eL[e]) > 1.11) continue; const P = R.eP[e], m = [(P[0][0] + P[1][0]) / 2, (P[0][1] + P[1][1]) / 2];
  // solo tramos A LO LARGO de la vía (dirección a menos de 30° de la de la vía): los pasos que la cruzan en las intersecciones siguen abiertos
  const ex = P[1][0] - P[0][0], ez = P[1][1] - P[0][1], el = Math.hypot(ex, ez) || 1;
  segs.forEach((L, k) => { for (const [a, b] of L) if (Math.abs(a[0] - m[0]) < 400 && Math.abs(a[1] - m[1]) < 400 && dSeg(m, a, b) < 18) {
    const sx = b[0] - a[0], sz = b[1] - a[1], cs = Math.abs(ex * sx + ez * sz) / (el * (Math.hypot(sx, sz) || 1)); if (el < 4 || cs >= 0.866) { if (el >= 4) marca[k].push(e); break; } } }); }
/* zonas y fuentes se conectan a la red por un nodo que NO toca las vías que se pueden cerrar (se entra por la calle lateral): así un cierre
   no deja aislado un punto que está pegado a la vía; solo cambia el camino */
const enVia = new Set(); marca.flat().forEach(e => { enVia.add(R.ea[e]); enVia.add(R.eb[e]); });
{ const T = arbol(R, FUENTES[0].nodo), libres = []; for (let i = 0; i < R.N; i++) if (isFinite(T.dist[i]) && !enVia.has(i)) libres.push(i);
  const fijar = (o) => { let bi = -1, bd = Infinity; for (const i of libres) { const d = (R.X[i] - o.x) ** 2 + (R.Z[i] - o.z) ** 2; if (d < bd) { bd = d; bi = i; } } o.nodo = bi; return Math.sqrt(bd) / 1000; };
  Zs.forEach(z => { z.acc = fijar(z) + PV.ACCESO_KM; }); FUENTES.forEach(f => { f.acc = fijar(f); }); }
const costo = (T, z) => isFinite(T.dist[z.nodo]) ? T.dist[z.nodo] / 1000 + z.acc : Infinity;
const base = FUENTES.map(f => arbol(R, f.nodo));
/* la red de SUMO no tiene todas las calles locales: un viaje corto puede salir 5-10 veces más largo que la línea recta. [SUP] el costo y el
   largo de cada viaje no pasan de 1,5 × la línea recta + 0,3 km (calles locales que no están en la red); los cierres solo cambian la parte por la red */
const RECTA = Zs.map(z => FUENTES.map(f => 1.5 * Math.hypot(z.x - f.x, z.z - f.z) / 1000 + 0.3));
const CN = Zs.map(z => base.map((T, j) => costo(T, z) + FUENTES[j].acc)); // costo por la red (los cierres se miden contra este, sin el tope)
const C0 = Zs.map((z, i) => base.map((T, j) => Math.min(RECTA[i][j], CN[i][j]))), L0 = Zs.map((z, i) => base.map((T, j) => Math.round(Math.min(RECTA[i][j], isFinite(T.lenR[z.nodo]) ? T.lenR[z.nodo] / 1000 + z.acc + FUENTES[j].acc : 99) * 100) / 100));
const eC0 = R.eC.slice(), CIERRES = [];
/* [SUP] si con la vía cerrada no queda ruta en la red del modelo (bolsillos que la red de SUMO solo une por la avenida), se supone que se
   llega por calles locales que no están en la red, con 3 km generalizados más que la ruta normal */
const SIN_RUTA_KM = 3;
VIAS.forEach(([id, n], k) => { if (!marca[k].length) { console.log('sin tramos en la red del modelo (queda fuera del sorteo):', n); return; } for (const e of marca[k]) R.eC[e] = Infinity; const F = [];
  FUENTES.forEach((f, j) => { const T = arbol(R, f.nodo); Zs.forEach((z, i) => { const c = costo(T, z) + f.acc, r = isFinite(c) ? CN[i][j] / c : CN[i][j] / (CN[i][j] + SIN_RUTA_KM); if (r < 0.99) F.push([i, j, Math.round(r * 1000) / 1000]); }); });
  for (let e = 0; e < R.M; e++) R.eC[e] = eC0[e]; CIERRES.push({ id, n, tramos: marca[k].length, f: F }); });
// parches
const P = [];
P.push({ id: 'burro', n: 'Humedal El Burro', t: 'humedal', x: 2095.7, z: -109.1, ha: 18.84, k: 1 });
P.push({ id: 'vaca', n: 'Humedal La Vaca', t: 'humedal', x: 760, z: 1160, ha: 9.94, k: 0.8 });
{ const t = geo(4.645179, -74.141652); P.push({ id: 'techo', n: 'Humedal de Techo', t: 'humedal', x: r1(t[0]), z: r1(t[1]), ha: 11.67, k: 0.9 }); }
P.push({ id: 'bosqueBav', n: 'Bosque de Bavaria', t: 'bosque', x: 4100, z: 60, ha: 5 });
const near = (x, z) => ZONAS.some(q => Math.hypot(q[0] - x, q[1] - z) < 700);
const parq = D('parques.json').map(p => { let A = 0, cx = 0, cy = 0; const s = p.pts; for (let i = 0; i < s.length; i++) { const a = s[i], b = s[(i + 1) % s.length], c = a[0] * b[1] - b[0] * a[1]; A += c; cx += (a[0] + b[0]) * c; cy += (a[1] + b[1]) * c; }
  A /= 2; if (!A) return null; const w = lw(cx / (6 * A), cy / (6 * A)); return { n: p.nombre, ha: Math.abs(A) / 1e4, x: w[0], z: w[1] }; }).filter(p => p && isFinite(p.x) && near(p.x, p.z) && !/humedal/i.test(p.n));
parq.sort((a, b) => b.ha - a.ha).slice(0, 24).forEach((p, i) => P.push({ id: 'pq' + (i + 1), n: p.n, t: 'parque', x: r1(p.x), z: r1(p.z), ha: Math.round(p.ha * 10) / 10 }));
const dB = (x, z) => Math.hypot(x - BAVC[0], z - BAVC[1]), MOD = [];
const HB = D('huertas_barrio.json').huertas.filter(h => h.tipo === 'parque'), gr = new Map();
for (const h of HB) { const k = Math.floor(h.c[0] / 1200) + ',' + Math.floor(h.c[1] / 1200); let g = gr.get(k); if (!g) gr.set(k, g = { n: 0, x: 0, z: 0 }); g.n++; g.x += h.c[0]; g.z += h.c[1]; }
[...gr.values()].forEach((g, i) => MOD.push({ id: 'hp' + (i + 1), n: `Huertas de parque (${g.n})`, t: 'modParque', x: r1(g.x / g.n), z: r1(g.z / g.n), ha: Math.round(g.n * 0.05 * 100) / 100 }));
(D('colegios_red.json').huertas || []).forEach((h, i) => MOD.push({ id: 'co' + (i + 1), n: 'Huerta del colegio · ' + h.n, t: 'modColegio', x: r1(h.c[0]), z: r1(h.c[1]), ha: 0.3 }));
const cub = []; for (const q of ZONAS.slice().sort((a, b) => b[2] - a[2])) { if (cub.every(c => Math.hypot(c[0] - q[0], c[1] - q[1]) >= 1200)) cub.push(q); if (cub.length >= 8) break; }
cub.forEach((q, i) => MOD.push({ id: 'cu' + (i + 1), n: 'Cubiertas compartidas ' + (i + 1), t: 'modCubierta', x: q[0], z: q[1], ha: 0.6 }));
MOD.sort((a, b) => dB(a.x, a.z) - dB(b.x, b.z)).forEach((m, i, L) => { m.cuota = Math.round((i + 0.5) / L.length * 1000) / 1000; P.push(m); }); // se incorporan de Bavaria hacia afuera
P.push({ id: 'huertaBav', n: 'Huerta central de Bavaria (B)', t: 'modBavaria', x: 4170, z: 30, ha: 2.9 });
/* BODEGAS de Corabastos a menos de 120 m del humedal La Vaca (data3d/corabastos.json, campo dh; las mismas de data3d/corabastos_plan.js),
   en orden de desmonte: de la más cercana al humedal a la más lejana. area = huella (m²); borde = huella + 10 m alrededor (calles y patios
   de carga que también se liberan) [SUP]. AREA_NAVES = huella de todas las bodegas de la central. */
const CO = D('corabastos.json'), BODEGAS = CO.naves.map((n, i) => ({ i, n })).filter(o => o.n.dh < 120).sort((a, b) => a.n.dh - b.n.dh || a.i - b.i)
  .map(({ i, n }) => { const w = lw(n.c[0], n.c[1]); return { i, x: r1(w[0]), z: r1(w[1]), dh: n.dh, area: Math.round(n.L * n.W), borde: Math.round((n.L + 20) * (n.W + 20)) }; });
const AREA_NAVES = Math.round(CO.naves.reduce((s, n) => s + n.L * n.W, 0));
{ const cx = BODEGAS.reduce((s, b) => s + b.x, 0) / BODEGAS.length, cz = BODEGAS.reduce((s, b) => s + b.z, 0) / BODEGAS.length;
  P.push({ id: 'bordeVaca', n: 'Borde restaurado de La Vaca (antes bodegas de Corabastos)', t: 'humedal', x: r1(cx), z: r1(cz), ha: 1, dyn: true }); } // su área cambia con el desmonte (sim_vida)
const MERC = MERCADOS.map(m => ({ id: m.id, n: m.n, tipo: m.tipo, x: m.x, z: m.z, cap: m.cap, desde: m.desde }));
const txt = `/* GENERADO por tools/sim_red_datos_build.mjs (no editar a mano). Datos fijos del modelo semanal data3d/sim_vida.js.
   ZONAS: [x, z, población] (zonas de 500 m de data3d/viajes_mercados.js). FUENTES: Corabastos, Bavaria, Doña Juana y los mercados (en ese orden).
   COSTO / LARGO: por zona y fuente, por la red vial (km generalizados / km). CIERRES: por vía, [zona, fuente, costo normal / costo con la vía cerrada].
   PARCHES: hábitat (humedales, bosque de Bavaria, parques, módulos de C, huerta central de B). */
export const ZONAS = ${JSON.stringify(ZONAS)};
export const FUENTES = ${JSON.stringify(FUENTES.map(f => ({ id: f.id, n: f.n })))};
export const COSTO = ${JSON.stringify(C0.map(r => r.map(v => isFinite(v) ? Math.round(v * 100) / 100 : 99)))};
export const LARGO = ${JSON.stringify(L0)};
export const CIERRES = ${JSON.stringify(CIERRES)};
export const MERCADOS = ${JSON.stringify(MERC)};
export const PARCHES = ${JSON.stringify(P)};
export const BODEGAS = ${JSON.stringify(BODEGAS)};
export const AREA_NAVES = ${AREA_NAVES};
`;
writeFileSync(join(REPO, 'data3d', 'sim_red_datos.js'), txt);
console.log('zonas', ZONAS.length, 'pob', ZONAS.reduce((s, q) => s + q[2], 0), 'fuentes', FUENTES.length, 'parches', P.length);
CIERRES.forEach(c => { const z = new Set(c.f.map(q => q[0])); const peor = c.f.reduce((m, q) => Math.min(m, q[2]), 1);
  const porF = (j) => { const v = c.f.filter(q => q[1] === j).map(q => q[2]); return v.length ? `${v.length} zonas, min ${Math.min(...v).toFixed(2)}` : '-'; };
  console.log(c.id, 'tramos', c.tramos, 'pares afectados', c.f.length, 'zonas', z.size, 'peor f', peor.toFixed(3), '| cora', porF(0), '| bav', porF(1), '| dj', porF(2)); });

