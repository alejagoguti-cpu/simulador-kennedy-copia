/* ============ RECORRIDO DE LA SIMULACIÓN 02 · MOVILIDAD (tres vistas) ============
   abrirRecorrido({ con }) / cerrarRecorrido(). Lo abre data3d/limpio.js al escoger «02 Movilidad».
   VISTA 1 · TERRITORIO: la cámara encuadra el área de la prueba; el contexto queda en gris (KEN_FOCO) y solo destellan, en el color del
     escenario, los lugares que sostienen los datos: la Av. de las Américas (vía que se cierra, OpenStreetMap), la Av. Primero de Mayo (la
     única vía principal paralela a 2,5 km o menos, OpenStreetMap, tools/cierre_desvios_datos.mjs) y Corabastos (destino de los camiones de
     alimentos, modelo del simulador). Botón «Explorar intervención».
   VISTA 2 · INTERVENCIÓN: la cámara vuela al corte A–A' de la Av. de las Américas (data3d/movilidad_corte.json, tools/movilidad_corte_datos.mjs):
     a la izquierda el corte esquemático con las medidas que trae OSM, la fuente y los límites; a la derecha el 3D (el encuadre se corre con
     camera.setViewOffset para que el panel no tape la vía). Botón «Cambiar variables».
   VISTA 3 · SIMULACIÓN: la cámara vuelve a la vista general gris; panel con los deslizadores del par 02 (los mismos de simulaciones12.js) y sus
     indicadores. Cada cambio corre el modelo semanal hasta el fin del cierre (proyección propia, misma semilla), sincroniza el deslizador del
     simulador (#su-der, que recalcula la corrida principal) y repinta el territorio (desvío, obra de KEN_CIERRE, parches con aves afectadas).
     Cada dato lleva su etiqueta: DATO (fuente verificable), MODELO (cálculo) o SUPUESTO.
   Regla: no se atribuye ninguna medida ni capacidad a un edificio o lugar que no venga de la fuente citada. */
import { RELOJ } from './reloj.js?v=5';

const COL = { sin: '#e76624', con: '#338ced' };
const SEMILLA = 1;
let T3 = null, THREE = null, M = null, CIE = null, VIAS = null, CORTE = null, PARCHES = null;
let st = null; // estado del recorrido abierto
let GR = null; const EXC = window.KEN_REC_EXCLUIR || (window.KEN_REC_EXCLUIR = []); // ambos recorridos comparten el blanco y negro

const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const nf = (v, d = 0) => (v == null || !isFinite(v)) ? '—' : (+v).toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d });
const movil = () => innerWidth < 760;

async function preparar() {
  T3 = window.KEN_T3; if (!T3 || !T3.camera || !T3.net) throw new Error('la maqueta aún no está lista');
  THREE = T3.THREE;
  if (!M) { M = await import('./simulaciones12.js?v=44'); if (M.cargarDatos) await M.cargarDatos(); }
  if (!VIAS || !CIE) { const m = await import('./cierre_gradual.js?v=7'); VIAS = m.VIAS; CIE = window.KEN_CIERRE || m.crearCierre({ T3, RELOJ }); }
  if (!PARCHES) PARCHES = (await import('./sim_red_datos.js?v=2')).PARCHES;
  if (!GR) GR = window.KEN_REC_GRIS || (window.KEN_REC_GRIS = (await import('./gris.js?v=1')).crearGris({ T3, excluir: EXC }));
  if (!CORTE) CORTE = await fetch('data3d/movilidad_corte.json?v=2').then(r => r.json());
}

/* ---------- geometría: polilíneas de una vía (marco mundo) ---------- */
function polis(via) { if (via === 'mayo') return CORTE.mayo; /* net.json solo trae 18 tramos sueltos de la Primero de Mayo: su trazado sale de OSM (movilidad_corte.json) */ const E = T3.net.edges, lw = T3.lw; return VIAS[via].e.filter(e => E[e]).map(e => E[e][1].map(q => lw(q[0], q[1]))); }
function caja(L) { let x0 = 1e9, z0 = 1e9, x1 = -1e9, z1 = -1e9; for (const P of L) for (const [x, z] of P) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); } return { x0, z0, x1, z1 }; }
function medio(L) { const T = L.flat(); T.sort((a, b) => a[0] - b[0]); return T[Math.floor(T.length / 2)]; }
function cinta(L, w, y) {
  let n = 0; for (const P of L) n += Math.max(0, P.length - 1); const pos = new Float32Array(n * 18); let k = 0;
  for (const P of L) for (let i = 1; i < P.length; i++) { const a = P[i - 1], b = P[i], dx = b[0] - a[0], dz = b[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l * w / 2, nz = dx / l * w / 2;
    const q = [[a[0] + nx, a[1] + nz], [a[0] - nx, a[1] - nz], [b[0] - nx, b[1] - nz], [a[0] + nx, a[1] + nz], [b[0] - nx, b[1] - nz], [b[0] + nx, b[1] + nz]];
    for (const [x, z] of q) { pos[k++] = x; pos[k++] = y; pos[k++] = z; } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); return g;
}
function muestras(L, paso) { const out = []; for (const P of L) { let resto = 0; for (let i = 1; i < P.length; i++) { const a = P[i - 1], b = P[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]); for (let s = resto; s < l; s += paso) out.push([a[0] + (b[0] - a[0]) * s / l, a[1] + (b[1] - a[1]) * s / l, b[0] - a[0], b[1] - a[1]]); resto = ((resto - l) % paso + paso) % paso; } } return out; }
let texPunto = null;
function punto() { if (texPunto) return texPunto; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.8)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  texPunto = new THREE.CanvasTexture(c); return texPunto; }

/* destellos de una vía: cinta que late + puntos de luz que corren a lo largo */
function destellos(L, color, ancho, nombre) {
  const y = (T3.viaY != null ? T3.viaY : 0.62) + 1.4, G = new THREE.Group(); G.name = nombre;
  const mC = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const cin = new THREE.Mesh(cinta(L, ancho, y), mC); cin.renderOrder = 8; G.add(cin);
  const S = muestras(L, 70), pos = new Float32Array(S.length * 3), g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mP = new THREE.PointsMaterial({ color, size: 46, map: punto(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true });
  const pts = new THREE.Points(g, mP); pts.renderOrder = 9; pts.frustumCulled = false; G.add(pts);
  G.userData = { cin, pts, S, y, base: 0.5, fase: Math.random() * 6 };
  return G;
}
function anillo(x, z, r, color, nombre) {
  const G = new THREE.Group(); G.name = nombre; const y = (T3.viaY != null ? T3.viaY : 0.62) + 2;
  const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  const a = new THREE.Mesh(new THREE.RingGeometry(r * 0.86, r, 64).rotateX(-Math.PI / 2), m); a.position.set(x, y, z); a.renderOrder = 9; G.add(a);
  const b = new THREE.Mesh(new THREE.RingGeometry(r * 0.3, r * 0.42, 48).rotateX(-Math.PI / 2), m.clone()); b.position.set(x, y, z); b.renderOrder = 9; G.add(b);
  G.userData = { a, b, r }; return G;
}
function planoCorte(color) {
  const P = CORTE.punto, nx = -P.uz, nz = P.ux, sMin = Math.min(...CORTE.cruces.map(c => c.s)) - 28, sMax = Math.max(...CORTE.cruces.map(c => c.s)) + 28, H = 26, y0 = T3.viaY != null ? T3.viaY : 0.6;
  const G = new THREE.Group(); G.name = 'rm-corte';
  const a = [P.x + nx * sMin, P.z + nz * sMin], b = [P.x + nx * sMax, P.z + nz * sMax];
  const pos = new Float32Array([a[0], y0, a[1], b[0], y0, b[1], b[0], y0 + H, b[1], a[0], y0, a[1], b[0], y0 + H, b[1], a[0], y0 + H, a[1]]);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pl = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide })); pl.renderOrder = 10; G.add(pl);
  const lg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(a[0], y0 + 0.5, a[1]), new THREE.Vector3(b[0], y0 + 0.5, b[1]), new THREE.Vector3(b[0], y0 + H, b[1]), new THREE.Vector3(a[0], y0 + H, a[1]), new THREE.Vector3(a[0], y0 + 0.5, a[1])]);
  G.add(new THREE.Line(lg, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.95, depthTest: false })));
  G.userData = { a, b, H, y0 }; return G;
}

/* Puente peatonal propuesto sobre las dos calzadas. Posición sobre el corte OSM;
   geometría y accesos ilustrativos, sin atribuirle dimensiones de proyecto. */
function crearPuente() {
  const P = CORTE.punto, nx = -P.uz, nz = P.ux;
  const s0 = Math.min(...CORTE.cruces.map(c => c.s)) - 19;
  const s1 = Math.max(...CORTE.cruces.map(c => c.s)) + 19;
  const largo = s1 - s0, centro = (s0 + s1) / 2, y0 = T3.viaY || .6, alto = y0 + 11;
  const G = new THREE.Group(); G.name = 'rm-puente-propuesto';
  G.position.set(P.x, 0, P.z); G.rotation.y = Math.atan2(-nz, nx);
  const azul = new THREE.MeshBasicMaterial({ color: 0x338ced, side: THREE.DoubleSide });
  const claro = new THREE.MeshBasicMaterial({ color: 0xc9ecff, side: THREE.DoubleSide });
  const vidrio = new THREE.MeshBasicMaterial({ color: 0x89d5ff, transparent: true, opacity: .4, depthWrite: false, side: THREE.DoubleSide });
  const pieza = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); G.add(m); return m; };
  pieza(new THREE.BoxGeometry(largo, .8, 5.4), azul, centro, alto, 0);
  pieza(new THREE.BoxGeometry(largo, .22, 4.5), claro, centro, alto + .52, 0);
  for (const z of [-2.65, 2.65]) {
    pieza(new THREE.BoxGeometry(largo, 1.25, .12), vidrio, centro, alto + 1.42, z);
    pieza(new THREE.BoxGeometry(largo, .16, .22), claro, centro, alto + 2.1, z);
    for (let s = s0; s <= s1; s += 8) pieza(new THREE.BoxGeometry(.18, 2, .22), claro, s, alto + 1.15, z);
  }
  for (const s of [s0, s1]) {
    pieza(new THREE.BoxGeometry(4, alto - y0, 4), vidrio, s, (alto + y0) / 2, 0);
    for (const z of [-2.3, 2.3]) pieza(new THREE.BoxGeometry(.3, alto - y0, .3), claro, s, (alto + y0) / 2, z);
    pieza(new THREE.BoxGeometry(7, .7, 7), azul, s, y0 + .35, 0);
  }
  return G;
}

/* ---------- EL PARO: bloqueo de la vía en el corte A–A' (ILUSTRACIÓN, no un conteo) ----------
   Gente parada de lado a lado de cada calzada con pancartas, y detrás, en cada carril, una fila de carros QUIETOS con las luces de parqueo
   titilando: los carros que llegan no pueden seguir. Cuántos carros y personas se dibujan es solo para leer la escena [ILUSTRACIÓN]; el ancho
   de carril que se usa para ponerlos (3,3 m) es de dibujo, no una medida de la vía (OSM no la trae). Los carriles por calzada sí son de OSM. */
function crearParo() {
  const P = CORTE.punto, ux = P.ux, uz = P.uz, nx = -uz, nz = ux, y0 = T3.viaY != null ? T3.viaY : 0.6, CAR = 3.3, G = new THREE.Group(); G.name = 'rm-paro';
  const rnd = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const autos = [], luces = [], gente = [], pancartas = [];
  for (const c of CORTE.cruces) { const nL = c.lanes || 2, dir = c.sentido || 1; // los carros llegan desde atrás de su sentido de marcha
    for (let l = 0; l < nL; l++) { const off = c.s + (l - (nL - 1) / 2) * CAR, nFila = 26 + Math.floor(rnd() * 14);
      for (let i = 0; i < nFila; i++) { const d = 14 + i * (6.4 + rnd() * 1.6), x = P.x + nx * off - ux * dir * d, z = P.z + nz * off - uz * dir * d, rot = Math.atan2(-uz * dir, ux * dir);
        autos.push([x, z, rot, rnd()]); const bx = -ux * dir * 2.25, bz = -uz * dir * 2.25; luces.push([x + bx + nx * 0.7, z + bz + nz * 0.7], [x + bx - nx * 0.7, z + bz - nz * 0.7]); } }
    // personas de lado a lado de la calzada, en 2–3 filas, y pancartas entre ellas
    const ancho = nL * CAR + 2;
    for (let f = 0; f < 3; f++) for (let k = 0; k < Math.round(ancho / 1.1); k++) { if (rnd() < 0.25) continue; const o = c.s - ancho / 2 + k * 1.1 + rnd() * 0.5, a = (f - 1) * 1.4 + rnd() * 0.6;
      gente.push([P.x + nx * o + ux * a, P.z + nz * o + uz * a, rnd()]); }
    for (let k = 0; k < Math.max(1, Math.floor(ancho / 6)); k++) { const o = c.s - ancho / 2 + 2 + k * 6; pancartas.push([P.x + nx * (o + 1.8) + ux * -1.6, P.z + nz * (o + 1.8) + uz * -1.6]); } }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0), pos = new THREE.Vector3(), colr = new THREE.Color();
  // carros: cuerpo + cabina en una sola geometría
  const gCar = (() => { const a = new THREE.BoxGeometry(4.3, 0.9, 1.8).translate(0, 0.75, 0), b = new THREE.BoxGeometry(2.3, 0.7, 1.6).translate(-0.2, 1.55, 0);
    const pa = a.toNonIndexed().attributes.position.array, pb = b.toNonIndexed().attributes.position.array, all = new Float32Array(pa.length + pb.length); all.set(pa); all.set(pb, pa.length);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(all, 3)); g.computeVertexNormals(); return g; })();
  const iCar = new THREE.InstancedMesh(gCar, new THREE.MeshLambertMaterial({ color: 0xffffff }), autos.length);
  const PAL = [0xd9dde0, 0x2b2f35, 0x8a9096, 0xb3261e, 0x1f4e8c, 0xe8e4da, 0x5b5f63, 0xc9a227];
  autos.forEach(([x, z, r, k], i) => { q.setFromAxisAngle(up, r); m4.compose(pos.set(x, y0 + 0.1, z), q, sc); iCar.setMatrixAt(i, m4); iCar.setColorAt(i, colr.setHex(k < 0.12 ? 0xf2c230 : PAL[Math.floor(k * PAL.length) % PAL.length])); });
  G.add(iCar);
  const mLuz = new THREE.MeshBasicMaterial({ color: 0xffa21f, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false });
  const iLuz = new THREE.InstancedMesh(new THREE.SphereGeometry(0.32, 8, 6), mLuz, luces.length); luces.forEach(([x, z], i) => { m4.makeTranslation(x, y0 + 1.0, z); iLuz.setMatrixAt(i, m4); }); G.add(iLuz);
  // personas: cuerpo + cabeza, ropa de colores
  const gPer = (() => { const a = new THREE.CylinderGeometry(0.22, 0.26, 1.15, 7).translate(0, 0.62, 0).toNonIndexed(), b = new THREE.SphereGeometry(0.17, 8, 6).translate(0, 1.42, 0).toNonIndexed();
    const pa = a.attributes.position.array, pb = b.attributes.position.array, all = new Float32Array(pa.length + pb.length); all.set(pa); all.set(pb, pa.length);
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(all, 3)); g.computeVertexNormals(); return g; })();
  const iPer = new THREE.InstancedMesh(gPer, new THREE.MeshLambertMaterial({ color: 0xffffff }), gente.length), ROPA = [0xe23b2e, 0xf2f2f2, 0x2a6fdb, 0xf4c20d, 0x1d1d1d, 0x2e9d57, 0xe76624];
  gente.forEach(([x, z, k], i) => { m4.compose(pos.set(x, y0, z), q.setFromAxisAngle(up, k * 6.28), sc.set(1, 0.9 + k * 0.25, 1)); iPer.setMatrixAt(i, m4); iPer.setColorAt(i, colr.setHex(ROPA[Math.floor(k * ROPA.length) % ROPA.length])); });
  sc.set(1, 1, 1); G.add(iPer);
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; { const g = cv.getContext('2d'); g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, 256, 64); g.fillStyle = '#c4271c'; g.font = '700 38px system-ui,sans-serif'; g.textAlign = 'center'; g.fillText('¡PARO!', 128, 46); }
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
  const gPan = new THREE.PlaneGeometry(3.6, 0.9), mPan = new THREE.MeshBasicMaterial({ map: tx, side: THREE.DoubleSide });
  for (const [x, z] of pancartas) { const m = new THREE.Mesh(gPan, mPan); m.position.set(x, y0 + 1.9, z); m.rotation.y = Math.atan2(-nz, nx) ; G.add(m); }
  G.userData = { luz: mLuz, autos: autos.length, gente: gente.length };
  return G;
}

/* ---------- cámara: vuelo nativo (T3.anim, lo admite camara_quieta.js porque sale de un clic) y corrimiento del encuadre ---------- */
/* vuelo propio: camara_quieta.js deja mover la cámara mientras T3.siguiendo está prendido (el vuelo siempre sale de un botón del recorrido) */
function volar(c, p, dur = 2.6) {
  const V = THREE.Vector3; T3.anim = null;
  st.vuelo = { t0: performance.now(), dur: dur * 1000, p0: T3.camera.position.clone(), c0: T3.orbit.target.clone(), p1: new V(p[0], p[1], p[2]), c1: new V(c[0], c[1], c[2]) };
  T3.siguiendo = true;
}
function pasoVuelo() { const F = st.vuelo; if (!F) return;
  const u = Math.min(1, (performance.now() - F.t0) / F.dur), k = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
  T3.orbit.target.lerpVectors(F.c0, F.c1, k); T3.camera.position.lerpVectors(F.p0, F.p1, k); T3.orbit.update();
  if (u >= 1) { st.vuelo = null; T3.siguiendo = false; } }
const off = { x: 0, y: 0, mx: 0, my: 0 };
function aplicarOffset() { const cam = T3.camera, W = innerWidth, H = innerHeight;
  if (Math.abs(off.x) < 1e-4 && Math.abs(off.y) < 1e-4) { if (cam.view && cam.view.enabled) cam.clearViewOffset(); return; }
  cam.setViewOffset(W, H, -off.x * W, -off.y * H, W, H); }
function vistaGeneral() {
  // la Américas, Corabastos y el tramo de la Primero de Mayo que corre a su lado (misma franja este–oeste)
  const A = polis('americas'), BA = caja(A), My = polis('mayo').map(P => P.filter(p => p[0] >= BA.x0 && p[0] <= BA.x1)).filter(P => P.length);
  const B = caja([...A, ...My, [[896, 1146]]]), cx = (B.x0 + B.x1) / 2, cz = (B.z0 + B.z1) / 2, ext = Math.max(B.x1 - B.x0, (B.z1 - B.z0) * 1.5);
  const d = Math.min(4200, ext * (movil() ? 1.15 : 0.7));
  // los controles limitan la distancia de la cámara (index.html: 2600 m en Kennedy): se amplía mientras el recorrido está abierto
  if (st && st.maxDist0 == null) st.maxDist0 = T3.orbit.maxDistance; T3.orbit.maxDistance = Math.max(st.maxDist0, d * 1.3);
  return { c: [cx, 0, cz], p: [cx, d * 1.0, cz + d * 0.55] };
}
function vistaCorte() {
  const P = CORTE.punto, nx = -P.uz, nz = P.ux, sC = (Math.min(...CORTE.cruces.map(c => c.s)) + Math.max(...CORTE.cruces.map(c => c.s))) / 2, cx = P.x + nx * sC, cz = P.z + nz * sC;
  // de lado y desde el sur-occidente, a ~45°: se ven las dos calzadas, el separador y la obra a lo largo de la vía
  const d = movil() ? 330 : 270, px = cx - nx * d * 0.62 - P.ux * d * 0.62, pz = cz - nz * d * 0.62 - P.uz * d * 0.62;
  return { c: [cx, 0, cz], p: [px, d * 0.62, pz] };
}

/* ---------- etiquetas HTML pegadas a puntos del 3D ---------- */
function etiqueta(txt, xyz, cls = '') { const e = document.createElement('div'); e.className = 'rm-et ' + cls; e.innerHTML = txt; st.capaEt.appendChild(e); const o = { e, p: new THREE.Vector3(...xyz) }; st.ets.push(o); return o; }
function limpiarEts() { for (const o of st.ets) o.e.remove(); st.ets = []; }

/* ---------- proyección del modelo (misma semilla que la corrida principal) ---------- */
function proyectar(val, listo) {
  const id = st.con ? 4 : 3, t0 = Math.round(val.cierreT0), dur = Math.round(val.cierreDur), fin = t0 + dur + 6, e = M.crear(id, SEMILLA, val);
  const R = { t0, dur, serie: [], antes: null, pico: null, trafMax: 1, dbMax: 0, congMax: 0, t10Max: 0, comidaMin: 1, comidaMinSem: null, faunaMin: 1, muertesCierre: 0, muertesAntes: 0, atrCierre: 0, atrAntes: 0, xDesMin: new Float32Array(PARCHES.length).fill(1), pedidoMin: null, tope: null, nBajo: 0 };
  let w = 0; const tok = st.tok = (st.tok || 0) + 1;
  const tanda = () => {
    if (!st || st.tok !== tok) return; // otra proyección empezó (el deslizador se movió otra vez)
    const hasta = Math.min(fin, w + 40);
    for (; w < hasta; w++) { M.paso(e); const s = w + 1; // semana del modelo que acaba de correr
      const x = M.ind(e), dentro = x.cierre && x.cierre.fase > 0;
      R.serie.push({ sem:s, fase:x.cierre?.fase || 0, trafico:x.cierre?.traficoDesvio || 1,
        ruido:x.cierre?.ruidoExtraDb || 0, congestion:x.congestion, tiempo:x.tiempo10km,
        comida:x.comidaMin, fauna:x.avesRuido?.bienestarFauna, gameOver:M.gameOver(e) });
      if (s < t0 - 8) continue;
      if (s < t0) { R.antes = x; R.muertesAntes += (x.muertes && x.muertes.semana) || 0; R.atrAntes += (x.atropellos && x.atropellos.semana) || 0; continue; }
      if (!dentro) continue;
      R.trafMax = Math.max(R.trafMax, x.cierre.traficoDesvio || 1); R.dbMax = Math.max(R.dbMax, x.cierre.ruidoExtraDb || 0);
      if (x.congestion > R.congMax) { R.congMax = x.congestion; R.t10Max = x.tiempo10km; }
      if (x.comidaMin < R.comidaMin) { R.comidaMin = x.comidaMin; R.comidaMinSem = s - t0 + 1; }
      const bf = x.avesRuido ? x.avesRuido.bienestarFauna : null; if (bf != null) R.faunaMin = Math.min(R.faunaMin, bf);
      R.muertesCierre += (x.muertes && x.muertes.semana) || 0; R.atrCierre += (x.atropellos && x.atropellos.semana) || 0;
      if (e.xDes) for (let p = 0; p < R.xDesMin.length; p++) R.xDesMin[p] = Math.min(R.xDesMin[p], e.xDes[p]);
      if (x.cierre.fase >= 1) R.pico = x;
    }
    if (w < fin) { if (st.alProgreso) st.alProgreso(w / fin); setTimeout(tanda, 0); return; }
    R.muertesAntes *= dur / 8; R.atrAntes *= dur / 8; // mismo número de semanas que el cierre
    listo(R);
  };
  setTimeout(tanda, 0);
}

/* ---------- íconos (trazo de 1,6 px, 24×24, heredan el color) ---------- */
const IC = {
  mapa: '<path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5V4l-6 2.5L9 4Z"/><path d="M9 4v13M15 6.5v13"/>',
  corte: '<path d="M3 17h18"/><path d="M5 17v-4h5v4M14 17v-4h5v4"/><path d="M12 3v18" stroke-dasharray="2 2.5"/>',
  ajustes: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  flecha: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  atras: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.01"/>',
  barrera: '<rect x="3" y="8" width="18" height="5" rx="1"/><path d="M7 8l3 5M12 8l3 5M17 8l3 5"/><path d="M6 13v6M18 13v6"/>',
  puente: '<path d="M2 11h20M3 8h18M5 11v9M19 11v9M5 15h14M8 8V5m8 3V5"/>',
  desvio: '<path d="M5 20V9a4 4 0 0 1 4-4h8"/><path d="M14 2l3 3-3 3"/><path d="M5 20h0"/><circle cx="5" cy="20" r="1.4"/>',
  bodega: '<path d="M3 10 12 4l9 6v10H3V10Z"/><path d="M7 20v-6h10v6M7 17h10"/>',
  carriles: '<path d="M5 21 8 3M19 21 16 3"/><path d="M12 5v3M12 11v3M12 17v3"/>',
  regla: '<path d="M3 15 15 3l6 6L9 21l-6-6Z"/><path d="M7 11l2 2M10 8l2 2M13 5l2 2"/>',
  velocidad: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l4-5"/><circle cx="12" cy="17" r="1.3"/>',
  altura: '<path d="M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4"/>',
  sentido: '<path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4"/>',
  pin: '<path d="M12 21s-6-5.6-6-11a6 6 0 1 1 12 0c0 5.4-6 11-6 11Z"/><circle cx="12" cy="10" r="2.2"/>',
  calendario: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  carro: '<path d="M5 16V11l2-5h10l2 5v5"/><path d="M4 16h16v2H4z"/><circle cx="8" cy="13" r="1"/><circle cx="16" cy="13" r="1"/>',
  ruido: '<path d="M4 10v4h4l5 4V6L8 10H4Z"/><path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  canasta: '<path d="M4 10h16l-2 10H6L4 10Z"/><path d="M8 10l4-6 4 6M10 14v3M14 14v3"/>',
  ave: '<path d="M3 13c3 0 5-2 7-5 1 3 3 5 6 5l5-3-2 5c-2 3-6 4-10 3l-6-5Z"/><circle cx="15.5" cy="9.5" r=".6"/>',
  huella: '<circle cx="7" cy="9" r="1.8"/><circle cx="12" cy="6.5" r="1.8"/><circle cx="17" cy="9" r="1.8"/><path d="M8 16c0-3 2-5 4-5s4 2 4 5-2 3-4 3-4 0-4-3Z"/>',
  hoja: '<path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15"/><path d="M5 19 14 10"/>'
};
const ico = (k, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${IC[k] || ''}</svg>`;
const TIPO = { d: ['dato', 'Dato con fuente'], m: ['modelo', 'Cálculo del modelo'], s: ['supuesto', 'Supuesto del modelo'] };
const marca = t => `<i class="mk ${t}" title="${TIPO[t][1]}" aria-label="${TIPO[t][1]}"></i>`;

/* ---------- estilos ---------- */
function estilos() {
  if (document.getElementById('rm-css')) return; const s = document.createElement('style'); s.id = 'rm-css';
  s.textContent = `
  html.rm-on body > :not(#todo3d):not(#rm):not(script):not(style):not(link){opacity:0!important;pointer-events:none!important;visibility:hidden!important;transition:opacity .4s}
  #rm{position:fixed;inset:0;z-index:60;pointer-events:none;font:400 13px/1.4 var(--ui-sans,'Inter',system-ui,sans-serif);color:var(--ui-tx,#e9ebec);--rm:${COL.sin};--g1:rgba(255,255,255,.06);--g2:rgba(255,255,255,.12)}
  #rm.con{--rm:${COL.con}}
  #rm .ic{width:18px;height:18px;flex:none;display:block}
  #rm .rm-box{pointer-events:auto;background:var(--ui-glass,rgba(13,15,18,.8));border:1px solid var(--ui-glass-bd,rgba(255,255,255,.16));box-shadow:var(--ui-glass-sh,0 20px 50px rgba(0,0,0,.35));backdrop-filter:var(--ui-glass-fx,blur(20px));-webkit-backdrop-filter:var(--ui-glass-fx,blur(20px));border-radius:20px}
  #rm .rm-box{animation:rmIn .45s cubic-bezier(.2,.8,.2,1)}
  @keyframes rmIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
  #rm .chip{display:inline-flex;align-items:center;gap:6px;font:600 10px/1 var(--ui-mono,monospace);letter-spacing:.1em;text-transform:uppercase;color:var(--rm);background:color-mix(in srgb,var(--rm) 14%,transparent);border:1px solid color-mix(in srgb,var(--rm) 40%,transparent);padding:5px 8px;border-radius:99px}
  #rm h2{margin:10px 0 4px;font:650 21px/1.15 var(--ui-sans,system-ui);letter-spacing:-.015em}
  #rm .sub{margin:0;color:var(--ui-tx2,#c3cace);font-size:12.5px}
  #rm button{font:600 12.5px var(--ui-sans,system-ui);border-radius:12px;padding:10px 14px;cursor:pointer;border:1px solid var(--g2);background:var(--g1);color:var(--ui-tx,#eee);display:inline-flex;align-items:center;gap:8px;transition:background .2s,transform .15s}
  #rm button:hover{background:var(--g2)} #rm button:active{transform:scale(.97)} #rm button:focus-visible{outline:2px solid var(--rm);outline-offset:2px}
  #rm button.pri{background:var(--rm);border-color:var(--rm);color:#15110e}
  #rm button.pri:hover{filter:brightness(1.08)}
  #rm button.ico{padding:9px;border-radius:12px}
  #rm .acc{display:flex;gap:8px;margin-top:14px;align-items:center}
  #rm .acc .esp{flex:1}
  /* barra superior */
  #rm-top{position:fixed;top:14px;left:50%;transform:translateX(-50%);display:flex;gap:4px;padding:4px;pointer-events:auto;border-radius:14px;z-index:2}
  #rm-top button{border:0;background:none;padding:7px 11px;border-radius:10px;color:var(--ui-tx2,#c3cace);font:500 11.5px var(--ui-sans,system-ui)}
  #rm-top button b{font:600 10px var(--ui-mono,monospace);opacity:.7}
  #rm-top button.on{background:color-mix(in srgb,var(--rm) 20%,transparent);color:#fff;box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--rm) 60%,transparent)}
  #rm-top button.on .ic{color:var(--rm)}
  #rm-salir{position:fixed;top:14px;right:14px;z-index:2;pointer-events:auto}
  /* chips de lugar (vista 1) */
  #rm .lug{display:grid;gap:8px;margin:14px 0 0}
  #rm .lug div{display:grid;grid-template-columns:36px 1fr;align-items:center;gap:10px;padding:8px 10px;border-radius:14px;background:var(--g1);border:1px solid rgba(255,255,255,.07)}
  #rm .lug .bol{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;color:var(--rm);background:color-mix(in srgb,var(--rm) 16%,transparent);box-shadow:0 0 18px color-mix(in srgb,var(--rm) 30%,transparent)}
  #rm .lug b{display:block;font-weight:600;font-size:13px} #rm .lug small{color:var(--ui-tx3,#949da3);font-size:11.5px}
  /* mosaico de medidas y tarjetas de indicador */
  #rm .mos{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px}
  #rm .t{position:relative;padding:10px 10px 9px;border-radius:14px;background:var(--g1);border:1px solid rgba(255,255,255,.07);min-width:0}
  #rm .t .ic{color:var(--ui-tx2,#c3cace);width:17px;height:17px}
  #rm .t b{display:block;margin-top:7px;font:650 17px/1.05 var(--ui-mono,monospace);color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #rm .t span{display:block;margin-top:3px;font-size:11px;color:var(--ui-tx3,#949da3);line-height:1.25}
  #rm .t .mk{position:absolute;top:10px;right:10px}
  #rm .kpis{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-top:10px}
  #rm .kpis .t{cursor:help} #rm .kpis .t b{font-size:20px}
  #rm .kpis .t.alto .ic{color:var(--rm)}
  #rm .kpis .t em{display:block;font:500 10.5px var(--ui-mono,monospace);font-style:normal;color:var(--ui-tx2,#c3cace);margin-top:4px}
  #rm .kpis.carga .t{opacity:.45}
  #rm .mk{display:inline-block;width:8px;height:8px;border-radius:50%;flex:none}
  #rm .mk.d{background:#6fd39b;box-shadow:0 0 0 3px rgba(111,211,155,.15)} #rm .mk.m{background:#e9ebec;box-shadow:0 0 0 3px rgba(255,255,255,.1)} #rm .mk.s{background:none;border:1.6px dashed #f2c96b;width:9px;height:9px}
  #rm .ley{display:flex;gap:12px;flex-wrap:wrap;margin-top:10px;font-size:10.5px;color:var(--ui-tx3,#949da3)} #rm .ley span{display:inline-flex;align-items:center;gap:5px}
  /* deslizadores */
  #rm .sl{display:grid;grid-template-columns:30px 1fr auto;align-items:center;gap:4px 10px;padding:9px 0;border-top:1px solid rgba(255,255,255,.07)}
  #rm .sl .bol{width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:var(--g1);color:var(--ui-tx2,#c3cace)}
  #rm .sl label{font-size:12.5px;font-weight:500;display:flex;align-items:center;gap:7px;min-width:0}
  #rm .sl output{font:650 13px var(--ui-mono,monospace);color:var(--rm);white-space:nowrap}
  #rm .sl input{grid-column:2/4;width:100%;accent-color:var(--rm);margin:0;height:18px}
  /* plegables */
  #rm details{margin-top:12px;border-radius:14px;background:rgba(0,0,0,.12);border:1px solid rgba(255,255,255,.06)}
  #rm summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:8px;padding:9px 11px;font:500 11.5px var(--ui-sans,system-ui);color:var(--ui-tx2,#c3cace)}
  #rm summary::-webkit-details-marker{display:none} #rm summary::after{content:'+';margin-left:auto;font:500 15px var(--ui-mono,monospace)} #rm details[open] summary::after{content:'–'}
  #rm details > div{padding:0 12px 11px;font-size:11.5px;color:var(--ui-tx2,#c3cace)} #rm details ul{margin:0;padding-left:16px} #rm details li{margin:3px 0}
  #rm .fu{font:400 10px/1.45 var(--ui-mono,monospace);color:var(--ui-tx3,#949da3);margin-top:6px}
  #rm .prog{height:2px;background:rgba(255,255,255,.08);border-radius:2px;overflow:hidden;margin-top:12px} #rm .prog i{display:block;height:100%;width:0;background:var(--rm);transition:width .2s}
  #rm .tit{display:flex;align-items:center;gap:8px;margin-top:16px;font:600 10px/1 var(--ui-mono,monospace);letter-spacing:.12em;text-transform:uppercase;color:var(--ui-tx3,#949da3)}
  #rm svg.rm-svg{width:100%;height:auto;display:block;margin:10px 0 0;border-radius:14px;background:rgba(0,0,0,.18)}
  /* paneles */
  #rm-v1{position:fixed;left:22px;bottom:22px;width:min(360px,calc(100vw - 32px));padding:18px}
  #rm-v2{position:fixed;left:16px;top:70px;bottom:16px;width:min(520px,42vw);padding:18px;overflow:auto}
  #rm-v3{position:fixed;right:16px;top:70px;bottom:16px;width:min(380px,32vw);padding:18px;overflow:auto}
  #rm-v2::-webkit-scrollbar,#rm-v3::-webkit-scrollbar{width:6px} #rm-v2::-webkit-scrollbar-thumb,#rm-v3::-webkit-scrollbar-thumb{background:rgba(255,255,255,.18);border-radius:3px}
  /* etiquetas del 3D */
  #rm .rm-et{position:fixed;left:0;top:0;pointer-events:none;white-space:nowrap;display:flex;align-items:center;gap:7px;font:600 11.5px var(--ui-sans,system-ui);color:#fff;padding:5px 10px 5px 6px;border-radius:99px;background:rgba(12,13,16,.82);border:1px solid color-mix(in srgb,var(--rm) 70%,transparent);box-shadow:0 0 16px color-mix(in srgb,var(--rm) 40%,transparent);margin-top:-12px}
  #rm .rm-et .ic{width:15px;height:15px;color:var(--rm)}
  #rm .rm-et small{font:500 10.5px var(--ui-mono,monospace);color:var(--ui-tx2,#c3cace);margin-left:2px}
  #rm .rm-et::after{content:'';position:absolute;left:50%;bottom:-9px;width:1px;height:9px;background:var(--rm)}
  @media (max-width:759px){
    #rm-top{top:10px;left:10px;transform:none} #rm-top button{padding:7px 9px} #rm-top button span{display:none}
    #rm-salir{top:10px;right:10px}
    #rm-v1{left:10px;right:10px;bottom:10px;width:auto;padding:15px}
    #rm-v2{left:8px;right:8px;top:58px;bottom:auto;max-height:44vh;width:auto;padding:14px}
    #rm-v3{left:8px;right:8px;top:auto;bottom:8px;max-height:58vh;width:auto;padding:14px}
    #rm .mos{grid-template-columns:repeat(3,minmax(0,1fr));gap:6px} #rm .t{padding:8px} #rm .t b{font-size:15px}
    #rm h2{font-size:18px}
    #rm .rm-et small{display:none}
  }
  @media (prefers-reduced-motion:reduce){#rm *{animation:none!important;transition:none!important}}`;
  document.head.appendChild(s);
}

/* ---------- corte esquemático A–A' (SVG). Solo lo que trae OSM; lo que no trae se dibuja rayado. ---------- */
function svgCorte(val) {
  const C = CORTE.cruces.slice().sort((a, b) => a.s - b.s), W = 520, H = 200, yS = 118, lane = 15, gap = 120;
  const cal = C.map(c => ({ ...c, w: (c.lanes || 1) * lane })), sep = C.length > 1 ? C[C.length - 1].s - C[0].s : 0;
  const ancho = cal.reduce((a, c) => a + c.w, 0) + gap * (cal.length - 1), x0 = (W - ancho) / 2, col = st.con ? COL.con : COL.sin;
  let x = x0, out = `<defs><pattern id="rm-h" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="rgba(255,255,255,.2)" stroke-width="2"/></pattern></defs>`;
  out += `<text x="14" y="${yS + 4}" fill="#949da3" font-size="9.5" font-family="monospace" letter-spacing="1">S</text><text x="${W - 14}" y="${yS + 4}" text-anchor="end" fill="#949da3" font-size="9.5" font-family="monospace" letter-spacing="1">N</text>`;
  out += `<line x1="26" y1="${yS}" x2="${W - 26}" y2="${yS}" stroke="rgba(255,255,255,.28)"/>`;
  out += `<rect x="${x0 - 40}" y="${yS - 6}" width="32" height="6" fill="url(#rm-h)"/><rect x="${x0 + ancho + 8}" y="${yS - 6}" width="32" height="6" fill="url(#rm-h)"/>`;
  const ejes = [];
  cal.forEach((c, i) => {
    const xa = x, cx = xa + c.w / 2; ejes.push(cx);
    out += `<rect x="${xa}" y="${yS - 6}" width="${c.w}" height="6" fill="#4a5057"/>`;
    for (let k = 1; k < (c.lanes || 1); k++) out += `<line x1="${xa + k * lane}" y1="${yS - 6}" x2="${xa + k * lane}" y2="${yS}" stroke="#e9ebec" stroke-dasharray="2 2"/>`;
    for (let k = 0; k < (c.lanes || 1); k++) { const q = xa + k * lane + lane / 2; out += `<path d="M${q - 4} ${yS - 6}L${q} ${yS - 19}L${q + 4} ${yS - 6}Z" fill="${col}"/><line x1="${q - 2.4}" y1="${yS - 11.5}" x2="${q + 2.4}" y2="${yS - 11.5}" stroke="#fff" stroke-width="1.3"/>`; }
    const der = (c.sentido > 0) === (CORTE.punto.ux < 0); // ¿va hacia el occidente?
    out += `<text x="${cx}" y="${yS + 20}" text-anchor="middle" fill="#fff" font-size="15" font-weight="700" font-family="monospace">${c.lanes || '?'}</text>`;
    out += `<text x="${cx}" y="${yS + 34}" text-anchor="middle" fill="#949da3" font-size="9.5">${c.sentido ? (der ? '← occidente' : 'oriente →') : 'doble'}</text>`;
    x += c.w;
    if (i < cal.length - 1) { out += `<rect x="${x}" y="${yS - 4}" width="${gap}" height="4" fill="url(#rm-h)"/><text x="${x + gap / 2}" y="${yS + 20}" text-anchor="middle" fill="#646c71" font-size="9.5">separador sin dato</text>`; x += gap; }
  });
  if (ejes.length > 1) { const a = ejes[0], b = ejes[ejes.length - 1], yD = 44;
    out += `<path d="M${a} ${yS - 26}V${yD + 4}M${b} ${yS - 26}V${yD + 4}" stroke="rgba(255,255,255,.25)" stroke-dasharray="3 3"/>`;
    out += `<path d="M${a} ${yD}H${b}M${a} ${yD - 5}v10M${b} ${yD - 5}v10" stroke="#e9ebec"/>`;
    out += `<rect x="${(a + b) / 2 - 34}" y="${yD - 11}" width="68" height="22" rx="11" fill="#15171b" stroke="rgba(255,255,255,.2)"/><text x="${(a + b) / 2}" y="${yD + 4}" text-anchor="middle" fill="#fff" font-size="12" font-weight="700" font-family="monospace">${nf(sep)} m</text>`; }
  out += `<rect x="${x0}" y="${yS - 27}" width="${ancho}" height="3" rx="1.5" fill="${col}"/>`;
  if (st.con) out += `<path d="M${x0 - 28} ${yS - 9}V${yS - 44}H${x0 + ancho + 28}V${yS - 9}" fill="none" stroke="${col}" stroke-width="5" stroke-linejoin="round"/><path d="M${x0 - 28} ${yS - 39}H${x0 + ancho + 28}" stroke="#c9ecff" stroke-width="2"/><text x="${W / 2}" y="${yS - 51}" text-anchor="middle" fill="#c9ecff" font-size="10" font-weight="700">PUENTE PEATONAL PROPUESTO</text>`;
  out += `<text x="${W / 2}" y="${H - 10}" text-anchor="middle" fill="#646c71" font-size="9" font-family="monospace">esquema sin escala · OSM no trae anchos</text>`;
  return `<svg class="rm-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Corte esquemático de la Av. de las Américas: ${C.map(c => c.lanes + ' carriles').join(' y ')}, ${nf(sep)} metros entre ejes de calzada, cerrada en la prueba">${out}</svg>`;
}

/* ---------- vistas ---------- */
/* vista 2 (de cerca al bloqueo): los carros grabados del simulador siguen su recorrido y pasarían por encima del paro; se esconden ahí */
function carrosSim(ver) { if (!ver && !st.vehOcultos) { st.vehOcultos = T3.scene.children.filter(o => o.name === 'vehiculos' && o.visible); st.vehOcultos.forEach(o => { o.visible = false; }); }
  else if (ver && st.vehOcultos) { st.vehOcultos.forEach(o => { o.visible = true; }); st.vehOcultos = null; } }
function paso(n) { pausarPlay(); st.v = n; st.root.querySelectorAll('#rm-top button').forEach(b => { const on = +b.dataset.ir === n; b.classList.toggle('on', on); b.setAttribute('aria-current', on ? 'step' : 'false'); }); }
/* gris = true: contexto en blanco y negro y en color solo los destellos y la obra; false: el 3D en color (vista 2). KEN_FOCO (atenúa y deja en
   color las capas que pide sim_ui.js) se mantiene apagado mientras el recorrido está abierto. */
function encender(gris) { st.gris = gris; EXC.length = 0; EXC.push(st.G); if (CIE.grupo) EXC.push(CIE.grupo); if (gris) GR.on(); else GR.off(); if (window.KEN_FOCO && window.KEN_FOCO.activo) window.KEN_FOCO.off({ dur: 0.3 }); }
const leyenda = () => `<div class="ley"><span>${marca('d')}dato</span><span>${marca('m')}modelo</span><span>${marca('s')}supuesto</span></div>`;
const tile = (ic, v, n, t, tip = '') => `<div class="t" title="${esc(tip || TIPO[t][1])}">${ico(ic)}${marca(t)}<b>${v}</b><span>${n}</span></div>`;

function v1() {
  paso(1); limpiarEts(); st.panel.innerHTML = ''; off.mx = movil() ? 0 : 0.12; off.my = movil() ? -0.17 : 0;
  CIE.quitar(); st.plano.visible = false; st.gParo.visible = false; carrosSim(true);
  for (const g of [st.gAm, st.gMa, st.gCo]) g.visible = true; st.gPar.visible = false;
  st.gAm.userData.base = 0.55; st.gMa.userData.base = 0.45;
  encender(true);
  const g = vistaGeneral(); volar(g.c, g.p, 2.8);
  const div = document.createElement('section'); div.id = 'rm-v1'; div.className = 'rm-box'; div.setAttribute('aria-labelledby', 'rm-v1-t');
  div.innerHTML = `<span class="chip">${ico('mapa')}02 Movilidad · ${st.con ? 'con' : 'sin'} propuesta</span>
    <h2 id="rm-v1-t">Paro en la Av. de las Américas</h2>
    <p class="sub">En color, solo lo que sostienen los datos.</p>
    <div class="lug">
      <div title="OpenStreetMap: ${nf(CORTE.ejeAmericas_km, 1)} km de eje en el extracto"><i class="bol">${ico('barrera')}</i><span><b>Av. de las Américas</b><small>bloqueada · ${nf(CORTE.ejeAmericas_km, 1)} km</small></span></div>
      <div title="Única vía principal paralela a 2,5 km o menos (OpenStreetMap, tools/cierre_desvios_datos.mjs)"><i class="bol">${ico('desvio')}</i><span><b>Av. Primero de Mayo</b><small>recibe el desvío</small></span></div>
      <div title="Destino de los camiones de alimentos (modelo del simulador)"><i class="bol">${ico('bodega')}</i><span><b>Corabastos</b><small>llegada de alimentos</small></span></div>
      ${st.con ? `<div title="Intervención propuesta: posición ilustrativa sobre el corte; sin medidas de diseño"><i class="bol">${ico('puente')}</i><span><b>Puente peatonal</b><small>cruza las dos calzadas</small></span></div>` : ''}
    </div>
    <details><summary>${ico('info')}Fuente${st.con ? ' y supuesto' : ''}</summary><div><div class="fu">Vías: OpenStreetMap (base 2026-06-01, ODbL) · tools/cierre_desvios_datos.mjs<br>Corabastos: modelo del simulador (sim_red_datos.js)</div>${st.con ? '<p class="fu">Con propuesta el modelo suma una 3.ª ruta (pasajes de Bavaria Común): supuesto, sin trazado propio.</p>' : ''}</div></details>
    <div class="acc"><button type="button" class="pri" data-ir="2">Explorar intervención ${ico('flecha')}</button></div>`;
  st.panel.appendChild(div);
  const Y = (T3.viaY || 0.6) + 30;
  etiqueta(ico('barrera') + 'Américas · paro', [CORTE.punto.x, Y, CORTE.punto.z]);
  const mm = medio(polis('mayo')); etiqueta(ico('desvio') + 'Primero de Mayo', [mm[0], Y, mm[1]]);
  etiqueta(ico('bodega') + 'Corabastos', [896, Y, 1146]);
  if (st.con) etiqueta(ico('puente') + 'Puente propuesto', [CORTE.punto.x, Y, CORTE.punto.z]);
  enlazar(); div.querySelector('button.pri').focus({ preventScroll: true });
}

function v2() {
  paso(2); limpiarEts(); st.panel.innerHTML = '';
  off.mx = movil() ? 0 : 0.21; off.my = movil() ? 0.24 : 0;
  st.gAm.userData.base = 0.25; st.gMa.userData.base = 0.25; st.gPar.visible = false; st.plano.visible = true; st.gParo.visible = true; carrosSim(false);
  const tr = 1 + st.val.desvioMayo / 100 * (st.con ? 2 / 3 : 1);
  CIE.poner({ via: 'americas', fase: 1, ruidoExtraDb: 10 * Math.log10(tr), traficoDesvio: tr });
  encender(false);
  const c = vistaCorte(); volar(c.c, c.p, 3.0);
  const C = CORTE.cruces, sep = C.length > 1 ? Math.max(...C.map(q => q.s)) - Math.min(...C.map(q => q.s)) : null, ms = C.find(q => q.maxspeed), mh = C.find(q => q.maxheight);
  const lado = q => q.s < 0 ? 'sur' : 'norte';
  const div = document.createElement('section'); div.id = 'rm-v2'; div.className = 'rm-box'; div.setAttribute('aria-labelledby', 'rm-v2-t');
  div.innerHTML = `<span class="chip">${ico('corte')}Corte A–A'</span>
    <h2 id="rm-v2-t">${st.con ? 'Un puente cruza el bloqueo' : 'La vía se bloquea'}</h2>
    <p class="sub">${st.con ? 'La propuesta incorpora un puente peatonal sobre las dos calzadas mientras el tráfico queda detenido.' : 'El paro corta las dos calzadas: los carros quedan quietos en fila.'}</p>
    ${svgCorte(st.val)}
    <div class="mos">
      ${tile('carriles', C.map(q => q.lanes).join('+'), 'carriles', 'd', 'OpenStreetMap: lanes de cada calzada')}
      ${sep != null ? tile('regla', nf(sep) + ' m', 'entre ejes', 'm', 'Medido sobre la geometría de OSM; no es un ancho') : ''}
      ${tile('sentido', '1 vía', 'por calzada', 'd', 'OpenStreetMap: oneway=yes')}
      ${ms ? tile('velocidad', ms.maxspeed, 'km/h · ' + lado(ms), 'd', 'OpenStreetMap: maxspeed (la otra calzada no lo etiqueta)') : ''}
      ${mh ? tile('altura', String(mh.maxheight).replace('.', ',') + ' m', 'gálibo · ' + lado(mh), 'd', 'OpenStreetMap: maxheight') : ''}
      ${tile('pin', nf(CORTE.punto.aCorabastos_m / 1000, 1) + ' km', 'a Corabastos', 'm', 'Medido al centro de Corabastos del modelo')}
    </div>
    <div class="mos" style="grid-template-columns:1fr">${tile('calendario', 'sem. ' + nf(st.val.cierreT0) + ' · ' + nf(st.val.cierreDur) + ' sem.', 'bloqueo por paro', 's', 'Supuesto de la prueba de estrés: semana y duración se cambian en la vista 3')}</div>
    ${leyenda()}
    <details><summary>${ico('info')}Límites y fuente</summary><div><ul>
      <li>OSM no trae anchos de carriles, andenes ni separador: el esquema no está a escala.</li>
      <li>Andenes «mapeados aparte» que no vienen en el extracto; sin datos de TransMilenio ni ciclorruta.</li>
      <li>Sin aforos: SUMO es un modelo, no un conteo.</li>
      <li>Personas y carros detenidos del 3D: ilustración del bloqueo, no un conteo; el ancho de carril con que se ubican es de dibujo.</li>
      <li>El modelo semanal reparte el cierre en 3 fases (regla de obra [SUP]); un paro corta de una vez.</li></ul>
      ${st.con ? '<p>El puente es una propuesta visual: su posición sigue el corte OSM; altura, apoyos y accesos son ilustrativos, no un diseño técnico ni un efecto calculado en los indicadores.</p>' : ''}
      <div class="fu">${esc(CORTE.fuente)} · ${esc(CORTE.herramienta)}</div></div></details>
    <div class="acc"><button type="button" class="ico" data-ir="1" title="Vista general" aria-label="Vista general">${ico('mapa')}</button><span class="esp"></span><button type="button" class="pri" data-ir="3">${ico('ajustes')}Cambiar variables</button></div>`;
  st.panel.appendChild(div);
  const P = CORTE.punto, nx = -P.uz, nz = P.ux, ux2 = P.ux, uz2 = P.uz, sm = Math.min(...C.map(q => q.s)) - 28;
  etiqueta(ico('barrera') + 'Paro', [P.x + ux2 * 18, (T3.viaY || 0.6) + 12, P.z + uz2 * 18]); etiqueta(ico('corte') + "A–A'", [P.x + nx * sm, (T3.viaY || 0.6) + 30, P.z + nz * sm]);
  if (st.con) etiqueta(ico('puente') + 'Puente peatonal propuesto', [P.x + nx * -32, (T3.viaY || .6) + 23, P.z + nz * -32]);
  enlazar(); div.querySelector('button.pri').focus({ preventScroll: true });
}

const SL_IC = { cierreT0: 'calendario', cierreDur: 'reloj', desvioMayo: 'desvio', trafCrece: 'carro', mitiga: 'hoja', 'P1.capAcopio': 'bodega' };
const SL_N = { cierreT0: 'Semana del cierre', cierreDur: 'Duración', desvioMayo: 'Desvío a la Primero de Mayo', trafCrece: 'Crecimiento del tráfico', mitiga: 'Calles pacificadas', 'P1.capAcopio': 'Acopio de mercados' };
const SL_T = { cierreT0: 's', cierreDur: 's', desvioMayo: 's', trafCrece: 'd', mitiga: 's', 'P1.capAcopio': 's' };
const SL_U = { cierreT0: v => 'sem. ' + nf(v), cierreDur: v => nf(v) + ' sem.', desvioMayo: v => nf(v) + ' %', trafCrece: v => nf(v, 1) + ' %/año', mitiga: v => nf(v) + ' %', 'P1.capAcopio': v => nf(v) + ' t/día' };

function v3() {
  paso(3); limpiarEts(); st.panel.innerHTML = '';
  off.mx = movil() ? 0 : -0.14; off.my = movil() ? -0.22 : 0;
  st.plano.visible = false; st.gPar.visible = true; st.gParo.visible = true; carrosSim(true); { const tr = 1 + st.val.desvioMayo / 100 * (st.con ? 2 / 3 : 1); CIE.poner({ via: 'americas', fase: 1, ruidoExtraDb: 10 * Math.log10(tr), traficoDesvio: tr }); } // la obra existe antes del gris: queda excluida
  encender(true);
  const g = vistaGeneral(); volar(g.c, g.p, 2.8);
  const sl = M.SIMS.find(s => s.id === (st.con ? 4 : 3)).sliders.filter(s => st.con || s.k !== 'P1.capAcopio');
  const div = document.createElement('section'); div.id = 'rm-v3'; div.className = 'rm-box'; div.setAttribute('aria-labelledby', 'rm-v3-t');
  div.innerHTML = `<span class="chip">${ico('ajustes')}Simulación</span>
    <h2 id="rm-v3-t">Durante el cierre</h2>
    <div class="prog" aria-hidden="true"><i></i></div>
    <div class="kpis" id="rm-inds" aria-live="polite"></div>
    <div class="acc"><button type="button" class="pri" id="rm-play">▶ Reproducir cierre</button><span id="rm-tiempo" class="fu">Semana anterior al cierre</span></div>
    ${leyenda()}
    <div class="tit">${ico('ajustes')}Variables</div>
    ${sl.map(s => `<div class="sl" title="${esc(s.ayuda || '')}"><i class="bol">${ico(SL_IC[s.k] || 'ajustes')}</i><label for="rm-${s.k}">${esc(SL_N[s.k] || s.n)} ${marca(SL_T[s.k] || 's')}</label><output data-v="${s.k}"></output><input id="rm-${s.k}" type="range" min="${s.min}" max="${s.max}" step="${s.paso}" value="${st.val[s.k]}" data-k="${s.k}"></div>`).join('')}
    <details><summary>${ico('info')}De dónde sale cada número</summary><div><ul>
      <li>${marca('d')} Vías y paralelas: OpenStreetMap (2026-06-01).</li>
      <li>${marca('d')} Congestión Bogotá 2025: 69,9 %, 31 min 45 s / 10 km (TomTom); crece con la curva BPR.</li>
      <li>${marca('d')} Parque automotor 2020–2024: +1,5 %/año.</li>
      <li>${marca('s')} Cierre, desvío, calles pacificadas, fauna y abasto: reglas [SUP] de simulaciones12.js.</li>
      <li>Cada cambio corre el modelo semanal hasta el fin del cierre y pasa el valor a la simulación principal.</li></ul></div></details>
    <div class="acc"><button type="button" class="ico" data-ir="1" title="Vista general" aria-label="Vista general">${ico('mapa')}</button><span class="esp"></span><button type="button" data-ir="2">${ico('corte')}Volver al corte</button></div>`;
  st.panel.appendChild(div);
  div.querySelector('#rm-play').onclick = reproducirCierre;
  div.querySelectorAll('input[type=range]').forEach(inp => {
    const s = sl.find(x => x.k === inp.dataset.k), o = div.querySelector(`output[data-v="${CSS.escape(s.k)}"]`), pinta = () => { o.textContent = (SL_U[s.k] || (v => nf(v) + ' ' + (s.unidad || '')))(+inp.value); };
    pinta(); inp.oninput = pinta;
    inp.onchange = () => { st.val[s.k] = +inp.value; sincronizar(s.k, +inp.value); calcular(); };
  });
  enlazar(); calcular();
}

/* el deslizador del simulador principal (#su-der, sim_ui.js) recibe el mismo valor y recalcula su corrida */
function sincronizar(k, v) { const i = document.querySelector(`#su-der input[data-k="${CSS.escape(k)}"]`); if (!i) return; i.value = v; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); }

function calcular() {
  pausarPlay();
  const box = document.getElementById('rm-inds'); if (!box) return; box.classList.add('carga');
  const bar = st.root.querySelector('.prog i'); if (bar) bar.style.width = '0%';
  st.alProgreso = f => { if (bar) bar.style.width = Math.round(f * 100) + '%'; };
  proyectar({ ...st.val }, R => {
    if (!st || st.v !== 3) return; if (bar) bar.style.width = '100%'; box.classList.remove('carga');
    st.R = R; pintarInds(R); pintarTerritorio(R);
    const b = st.root.querySelector('#rm-play'); if (b) b.disabled = !R.serie.length;
  });
}

function pausarPlay() {
  if (!st) return;
  if (st.play) cancelAnimationFrame(st.play);
  st.play = 0;
  const b = st.root.querySelector('#rm-play'); if (b) b.textContent = '▶ Reproducir cierre';
}
function reproducirCierre() {
  if (!st || !st.R?.serie?.length) return;
  if (st.play) { pausarPlay(); return; }
  const R = st.R, L = R.serie, go = L.findIndex(p => p.gameOver), ultimo = go >= 0 ? go : L.length - 1;
  CIE.poner({ via:'americas', fase:0, ruidoExtraDb:0, traficoDesvio:1 });
  const inicio = performance.now(), boton = st.root.querySelector('#rm-play'); boton.textContent = 'Ⅱ Pausar';
  const correr = ahora => {
    if (!st || st.v !== 3) return;
    const i = Math.min(ultimo, Math.floor((ahora - inicio) / 12000 * (ultimo + 1)));
    const x = L[i], tr = x.trafico || 1;
    CIE.poner({ via:'americas', fase:x.fase, ruidoExtraDb:x.ruido, traficoDesvio:tr });
    st.gMa.userData.base = .25 + .6 * Math.min(1, Math.max(0, tr - 1));
    st.root.querySelector('.prog i').style.width = Math.round((i + 1) / (ultimo + 1) * 100) + '%';
    const estado = st.root.querySelector('#rm-tiempo');
    estado.textContent = x.gameOver ? `GAME OVER · semana ${x.gameOver.sem} · ${x.gameOver.motivo}` : `Semana ${x.sem} · cierre ${Math.round(x.fase * 100)} %`;
    st.root.querySelector('#rm-inds').innerHTML =
      `<div class="t"><b>+${nf((tr - 1) * 100)} %</b><span>tráfico en el desvío</span></div>` +
      `<div class="t"><b>+${nf(x.ruido,1)} dB</b><span>ruido del desvío</span></div>` +
      `<div class="t"><b>${nf(x.comida * 100)} %</b><span>comida en la zona peor</span></div>` +
      `<div class="t"><b>${nf(x.congestion)} %</b><span>congestión</span></div>`;
    if (i >= ultimo) pausarPlay(); else st.play = requestAnimationFrame(correr);
  };
  st.play = requestAnimationFrame(correr);
}

function pintarInds(R) {
  const A = R.antes || {}, sgn = (v, d = 1) => v == null || !isFinite(v) ? '' : (v >= 0 ? '+' : '−') + nf(Math.abs(v), d);
  const k = (ic, v, n, d, t, tip, alto) => `<div class="t${alto ? ' alto' : ''}" title="${esc(tip)}" tabindex="0">${ico(ic)}${marca(t)}<b>${v}</b><span>${n}</span>${d ? `<em>${d}</em>` : ''}</div>`;
  const dC = R.congMax - A.congestion, dT = R.t10Max - A.tiempo10km, bf0 = A.avesRuido ? A.avesRuido.bienestarFauna : null;
  document.getElementById('rm-inds').innerHTML =
    k('carro', '+' + nf((R.trafMax - 1) * 100) + ' %', 'tráfico en la Primero de Mayo', null, 'm', `En el cierre total. Sale del supuesto «desvío» (${nf(st.val.desvioMayo)} %)${st.con ? ', repartido en tres rutas con la propuesta' : ''}.`, true) +
    k('ruido', '+' + nf(R.dbMax, 1) + ' dB', 'ruido junto al desvío', null, 'm', 'Regla de energía: 10·log10(tráfico con desvío / tráfico de hoy).', true) +
    k('reloj', nf(R.t10Max, 1) + ' min', 'por cada 10 km', `${sgn(dT)} min · congestión ${nf(R.congMax, 0)} %`, 'm', `Pico del cierre frente a la semana anterior (${nf(A.tiempo10km, 1)} min, ${nf(A.congestion, 1)} %). Base: TomTom 2025.`, dT > 0.05) +
    k('canasta', nf(R.comidaMin * 100) + ' %', 'comida en la zona peor servida', `semana ${nf(R.comidaMinSem)} del cierre`, 'm', 'Las rutas desde Corabastos se alargan: llega menos comida (sim_vida.js).', R.comidaMin < 0.8) +
    k('ave', nf(R.faunaMin * 100) + ' %', 'bienestar de la fauna', bf0 != null ? `antes ${nf(bf0 * 100)} %` : null, 'm', 'Mínimo durante el cierre, por ruido. Coeficientes de riesgo: supuestos del modelo.', bf0 != null && R.faunaMin < bf0 - 0.005) +
    k('huella', nf(R.muertesCierre), 'animales muertos', `antes ${nf(R.muertesAntes)} · atropellos ${nf(R.atrCierre)}`, 's', 'Índice del modelo, no un conteo. «Antes» = el mismo número de semanas previas al cierre.', R.muertesCierre > R.muertesAntes);
}

function pintarTerritorio(R) {
  const fr = Math.max(0, Math.min(1, (R.trafMax - 1)));
  st.gMa.userData.base = 0.25 + 0.6 * fr;
  CIE.poner({ via: 'americas', fase: 1, ruidoExtraDb: R.dbMax, traficoDesvio: R.trafMax });
  // parches con aves afectadas por el ruido del desvío (xDes < 1): disco proporcional a la pérdida de calidad del hábitat
  const g = st.gPar; while (g.children.length) { const c = g.children.pop(); c.geometry.dispose(); c.material.dispose(); }
  limpiarEts();
  const Y = (T3.viaY || 0.6) + 1.8, col = st.con ? COL.con : COL.sin, af = [];
  PARCHES.forEach((p, i) => { const perd = 1 - R.xDesMin[i]; if (perd < 0.01) return; af.push([perd, p]);
    const r = 30 + 160 * perd, m = new THREE.Mesh(new THREE.CircleGeometry(r, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.set(p.x, Y, p.z); m.renderOrder = 8; g.add(m); });
  af.sort((a, b) => b[0] - a[0]);
  const Yl = Y + 28, mm = medio(polis('mayo'));
  etiqueta(`${ico('carro')}Primero de Mayo<small>+${nf(fr * 100)} %</small>`, [mm[0], Yl, mm[1]]);
  etiqueta(`${ico('barrera')}Paro · Américas<small>${nf(st.val.cierreDur)} sem.</small>`, [CORTE.punto.x, Yl, CORTE.punto.z]);
  etiqueta(`${ico('canasta')}Corabastos<small>${nf(R.comidaMin * 100)} %</small>`, [896, Yl, 1146]);
  for (const [perd, p] of af.slice(0, movil() ? 1 : 2)) etiqueta(`${ico('ave')}${esc(p.n)}<small>−${nf(perd * 100)} %</small>`, [p.x, Yl, p.z]);
}

function enlazar() { st.root.querySelectorAll('[data-ir]').forEach(b => b.onclick = () => ir(+b.dataset.ir)); }
function ir(n) { if (!st) return; if (n === 1) v1(); else if (n === 2) v2(); else v3(); }

/* ---------- cuadro: latidos, puntos que corren, etiquetas y corrimiento del encuadre ---------- */
function cuadro() {
  if (!st) return;
  pasoVuelo();
  /* sim_ui.js prende su propio foco (focoHistoria) y la obra puede crearse después: cada segundo se apaga el foco y se excluye la obra del gris */
  if (performance.now() - (st.tFoco || 0) > 1000) { st.tFoco = performance.now(); if (window.KEN_FOCO && window.KEN_FOCO.activo) window.KEN_FOCO.off({ dur: 0.3 }); if (CIE.grupo && !EXC.includes(CIE.grupo)) EXC.push(CIE.grupo); }
  const t = performance.now() / 1000;
  for (const G of [st.gAm, st.gMa]) { const U = G.userData; U.cin.material.opacity = U.base * (0.7 + 0.3 * Math.sin(t * 2.4 + U.fase));
    const P = U.pts.geometry.attributes.position, S = U.S; for (let i = 0; i < S.length; i++) { const f = (t * 0.35 + i * 0.37) % 1, s = S[i]; P.array[i * 3] = s[0] + s[2] * f; P.array[i * 3 + 1] = U.y + 1; P.array[i * 3 + 2] = s[1] + s[3] * f; }
    P.needsUpdate = true; U.pts.material.opacity = Math.min(1, U.base * 1.6); }
  if (st.gParo.visible) st.gParo.userData.luz.opacity = (t * 1.5) % 1 < 0.55 ? 1 : 0.08; // luces de parqueo
  { const U = st.gCo.userData, k = (t * 0.6) % 1; U.a.scale.setScalar(0.6 + 0.6 * k); U.a.material.opacity = 0.8 * (1 - k); U.b.material.opacity = 0.55 + 0.25 * Math.sin(t * 3); }
  const a = 0.08; off.x += (off.mx - off.x) * a; off.y += (off.my - off.y) * a; if (Math.abs(off.mx - off.x) < 1e-4) off.x = off.mx; if (Math.abs(off.my - off.y) < 1e-4) off.y = off.my; aplicarOffset();
  // etiquetas: se esconden si caen fuera de la pantalla o debajo de un panel
  const v = new THREE.Vector3(), W = innerWidth, H = innerHeight, pan = st.panel.firstElementChild, rp = pan ? pan.getBoundingClientRect() : null, top = st.root.querySelector('#rm-top').getBoundingClientRect();
  const tapa = (x, y) => (rp && x > rp.left - 110 && x < rp.right + 110 && y > rp.top - 4 && y < rp.bottom + 30) || (y < top.bottom + 30 && x > top.left - 60 && x < top.right + 60);
  for (const o of st.ets) { v.copy(o.p).project(T3.camera); const x = (v.x + 1) / 2 * W, y = (1 - v.y) / 2 * H, vis = v.z < 1 && x > 50 && x < W - 50 && y > 40 && y < H - 10 && !tapa(x, y);
    o.e.style.display = vis ? '' : 'none'; if (vis) o.e.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%)`; }
  if ((st.v === 2 || st.v === 3 && !st.play) && performance.now() - st.tCie > 1500) { st.tCie = performance.now(); // la corrida principal puede quitar la obra (está antes del cierre): se vuelve a poner
    const R = st.R, tr = st.v === 3 && R ? R.trafMax : 1 + st.val.desvioMayo / 100 * (st.con ? 2 / 3 : 1); CIE.poner({ via: 'americas', fase: 1, ruidoExtraDb: 10 * Math.log10(tr), traficoDesvio: tr }); }
}

export async function abrirRecorrido({ con = false } = {}) {
  if (st) { if (st.con === con) return; cerrarRecorrido(); }
  await preparar(); estilos();
  RELOJ.pausarAños(true);
  const html = document.documentElement; html.classList.remove('lp-izq-abierto', 'lp-tab-abierto'); html.classList.add('rm-on');
  const root = document.createElement('div'); root.id = 'rm'; root.className = con ? 'con' : ''; root.setAttribute('role', 'region'); root.setAttribute('aria-label', 'Recorrido de la simulación 02 Movilidad');
  root.innerHTML = `<nav id="rm-top" class="rm-box" aria-label="Vistas del recorrido"><button type="button" data-ir="1" title="Territorio">${ico('mapa')}<span>Territorio</span></button><button type="button" data-ir="2" title="Intervención">${ico('corte')}<span>Intervención</span></button><button type="button" data-ir="3" title="Simulación">${ico('ajustes')}<span>Simulación</span></button></nav>
    <button type="button" id="rm-salir" class="rm-box ico" title="Salir del recorrido (Esc)" aria-label="Salir del recorrido">${ico('x')}</button><div id="rm-panel"></div><div id="rm-et" aria-hidden="true"></div>`;
  document.body.appendChild(root);
  const col = new THREE.Color(con ? COL.con : COL.sin);
  const G = new THREE.Group(); G.name = 'recorrido-movilidad'; T3.scene.add(G);
  const gAm = destellos(polis('americas'), col, 44, 'rm-americas'), gMa = destellos(polis('mayo'), col, 18, 'rm-mayo'), gCo = anillo(896, 1146, 230, col, 'rm-corabastos');
  const gPar = new THREE.Group(); gPar.name = 'rm-parches'; const plano = planoCorte(col); plano.visible = false;
  const gParo = crearParo(); gParo.visible = false;
  const gPu = con ? crearPuente() : null;
  G.add(gAm, gMa, gCo, gPar, plano, gParo); if (gPu) G.add(gPu);
  // valores: los que tenga el simulador en sus deslizadores; si no, los de simulaciones12.js
  const def = M.SIMS.find(s => s.id === (con ? 4 : 3)), val = {};
  for (const s of def.sliders) { const i = document.querySelector(`#su-der input[data-k="${CSS.escape(s.k)}"]`); val[s.k] = i ? +i.value : s.val; }
  st = { con, root, panel: root.querySelector('#rm-panel'), capaEt: root.querySelector('#rm-et'), ets: [], G, gAm, gMa, gCo, gPar, plano, gParo, gPu, vehOcultos: null, val, v: 0, tCie: 0, R: null };
  st.quitarCuadro = RELOJ.alDibujar(cuadro);
  st.onKey = e => { if (e.key === 'Escape') cerrarRecorrido(); }; addEventListener('keydown', st.onKey);
  root.querySelector('#rm-salir').onclick = () => cerrarRecorrido();
  enlazar(); v1();
}

export function cerrarRecorrido() {
  if (!st) return; const s = st; st = null;
  if (s.play) cancelAnimationFrame(s.play);
  if (s.vehOcultos) s.vehOcultos.forEach(o => { o.visible = true; }); if (s.maxDist0 != null) T3.orbit.maxDistance = s.maxDist0;
  s.quitarCuadro(); if (s.vuelo) T3.siguiendo = false; removeEventListener('keydown', s.onKey);
  GR.off();
  CIE.quitar();
  s.G.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); T3.scene.remove(s.G);
  off.x = off.y = off.mx = off.my = 0; aplicarOffset();
  s.root.remove(); document.documentElement.classList.remove('rm-on');
  dispatchEvent(new Event('rm-cerrado'));
}
export const abierto = () => !!st;
addEventListener('resize', () => { if (st) aplicarOffset(); });

