/* Lectura espacial automática de las simulaciones 02–06 sobre la ciudad.
   Se enciende sola al correr (sin «Ver en mapa») y dibuja SOLO datos con coordenadas del modelo semanal (R.hist):
   02 cierre y desvío (red vial real de cierre_gradual.js) · 03 generación, recorridos y acumulación de residuos ·
   04 parches, desplazamientos, especies y corredores · 05 ocupación y presión del suelo · 06 necesidad, asignación y cobertura.
   Encima va el indicador elegido en el tablero («Ver en mapa» cambia de indicador; no apaga la lectura del escenario).
   Un solo lienzo 2D proyectado con la cámara: no agrega geometría a la escena WebGL (los carros y la escena siguen igual). */
import { INDK, valor, T } from './indicadores_macro.js?v=2';
import { VIAS } from './cierre_gradual.js?v=7';
import { ZONAS, PARCHES } from './sim_red_datos.js?v=2';

const POR_DEFECTO = { 2: 'ruido', 3: 'aprov', 4: 'conect', 5: 'presion', 6: 'cobertura' };
const TIT = { 2: 'Movilidad · cierre y desvíos', 3: 'Residuos · generación, recorridos y acumulación', 4: 'Biodiversidad · desplazamiento, especies y conectividad', 5: 'Suelo · ocupación y presión', 6: 'Gobernanza · necesidad, asignación y cobertura' };
const LEY = {
  2: [['#d99370', 'vía cerrada'], ['#e8c46a', 'desvío · flujo ∝ tráfico'], ['#c9f27a', 'puntos de conflicto']],
  3: [['#d99370', 'acumulación sin recoger'], ['#e8c46a', 'recorridos ∝ t/día'], ['#c9f27a', 'estación · tratado/capacidad']],
  4: [['#9bbb82', 'parche · calidad'], ['#c9f27a', 'especies (riqueza)'], ['#d99370', 'desplazamiento / atropello'], ['#8dbcb7', 'corredor']],
  5: [['#d99370', 'presión del suelo'], ['#e8c46a', 'cambia de uso'], ['#9bbb82', 'suelo protegido']],
  6: [['#d99370', 'necesidad sin cubrir'], ['#c9f27a', 'asignado'], ['#8dbcb7', 'asamblea activa · equipamiento']]
};

export function iniciarIndicadoresEscena({ R, getM, T3 }) {
  if (!T3?.camera || !T3.THREE) return { elegir() {} };
  const caja = document.createElement('div'); caja.id = 'ie-capa'; caja.setAttribute('aria-live', 'polite');
  caja.innerHTML = '<canvas aria-hidden="true"></canvas><div class="ie-rotulo"><span>LECTURA EN EL TERRITORIO</span><b></b><small></small><ul></ul></div>';
  document.body.appendChild(caja);
  const css = document.createElement('style'); css.textContent = `
    #ie-capa{position:fixed;inset:0;z-index:37;pointer-events:none;font-family:var(--ui-sans,system-ui);display:none}
    #ie-capa.on{display:block}#ie-capa canvas{position:absolute;inset:0;width:100%;height:100%}
    #ie-capa .ie-rotulo{position:absolute;bottom:96px;left:50%;transform:translateX(-50%);width:max-content;max-width:min(560px,calc(100vw - 32px));padding:8px 12px;background:var(--ui-glass);border:1px solid var(--ui-glass-bd);border-radius:10px;box-shadow:var(--ui-glass-sh);backdrop-filter:var(--ui-glass-fx);-webkit-backdrop-filter:var(--ui-glass-fx);text-align:center;color:#e5eee7}
    #ie-capa .ie-rotulo span{display:block;font:600 9px var(--ui-mono);letter-spacing:.1em;color:var(--ui-acc-tx)}
    #ie-capa .ie-rotulo b{display:block;font:600 13px var(--ui-sans);margin:2px 0}
    #ie-capa .ie-rotulo small{font:11px var(--ui-mono);color:#d2e3bf}
    #ie-capa .ie-rotulo ul{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 12px;margin:5px 0 0;padding:0;list-style:none;font:10px var(--ui-mono);color:#cfd8d2}
    #ie-capa .ie-rotulo li::before{content:'';display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px;background:var(--c);vertical-align:-1px}
    .pi-card .pi-mapa{border:1px solid var(--ui-bd2);background:var(--ui-glass);color:var(--ui-acc-tx);border-radius:7px;padding:5px 8px;font:600 10px var(--ui-mono);cursor:pointer}
    .pi-card .pi-mapa[aria-pressed="true"]{background:var(--ui-acc-bg);border-color:var(--ui-acc)}
    @media(max-width:760px){#ie-capa .ie-rotulo{bottom:118px;padding:6px 9px}#ie-capa .ie-rotulo b{font-size:11px}#ie-capa .ie-rotulo ul{display:none}}
  `; document.head.appendChild(css);
  const cv = caja.querySelector('canvas'), g = cv.getContext('2d'), title = caja.querySelector('b'), detail = caja.querySelector('small'), ley = caja.querySelector('ul');
  const V = new T3.THREE.Vector3(), reducido = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let clave = null, elegida = false, parPintado = 0, semana = -1, I = null, suave = new Map(), viasCache = null;
  const ok = (p) => p && Number.isFinite(p.x) && Number.isFinite(p.z);
  const lerp = (k, v) => { const a = suave.has(k) ? suave.get(k) : v, b = a + (v - a) * 0.08; suave.set(k, b); return b; }; // semana a semana sin saltos
  let W = 0, H = 0, dpr = 1, ultimoFrame = 0;
  function tam() { dpr = Math.min(1.5, devicePixelRatio || 1); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; }
  addEventListener('resize', tam); tam();
  const P = (x, z, y = 4) => { V.set(x, y, z).project(T3.camera); return { x: (V.x + 1) * W / 2, y: (1 - V.y) * H / 2, v: V.z < 1 && V.z > -1 && V.x > -1.2 && V.x < 1.2 && V.y > -1.2 && V.y < 1.2 }; };
  const escala = (x, z, m) => { const a = P(x, z), b = P(x + m, z); return Math.max(1.5, Math.hypot(b.x - a.x, b.y - a.y)); }; // metros del mundo -> píxeles en ese punto
  const circ = (x, y, r, fill, stroke, w = 1.5) => { g.beginPath(); g.arc(x, y, r, 0, 6.2832); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = w; g.stroke(); } };
  const texto = (s, x, y, col = '#ecf2e9') => { g.font = '600 11px ui-monospace,monospace'; g.lineWidth = 3; g.strokeStyle = '#0a1514'; g.strokeText(s, x, y); g.fillStyle = col; g.fillText(s, x, y); };
  function flujo(a, b, n, t, col, r = 2.4) { // partículas que recorren a->b; n ∝ magnitud del modelo
    if (!a.v && !b.v) return; g.strokeStyle = col + '66'; g.lineWidth = 3.5; g.setLineDash([9, 7]); g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke(); g.setLineDash([]);
    for (let i = 0; i < n; i++) { const u = (t + i / n) % 1; const x=a.x+(b.x-a.x)*u,y=a.y+(b.y-a.y)*u; flecha(x,y,Math.atan2(b.y-a.y,b.x-a.x),col,Math.max(9,r*3)); }
  }
  function flecha(x,y,a,col,size=11){g.save();g.translate(x,y);g.rotate(a);g.fillStyle='#0a1514';g.beginPath();g.moveTo(size+3,0);g.lineTo(-size*.65,-size*.68-3);g.lineTo(-size*.65,size*.68+3);g.closePath();g.fill();g.fillStyle=col;g.beginPath();g.moveTo(size,0);g.lineTo(-size*.65,-size*.68);g.lineTo(-size*.65,size*.68);g.closePath();g.fill();g.restore();}
  function alerta(x,y,label,col='#d99370'){g.save();g.translate(x,y);g.fillStyle='#0a1514e8';g.strokeStyle=col;g.lineWidth=2.5;g.beginPath();g.moveTo(0,-17);g.lineTo(16,13);g.lineTo(-16,13);g.closePath();g.fill();g.stroke();g.fillStyle=col;g.font='bold 17px ui-monospace,monospace';g.textAlign='center';g.fillText('!',0,8);g.textAlign='left';g.restore();if(label)texto(label,x+20,y+4,col);}
  function rutaVial(L,col,w,t,rotulo){let marcada=false;for(const pts of L){const q=pts.map(([x,z])=>P(x,z,3));if(q.length<2||!q.some(p=>p.v))continue;g.lineCap='round';g.lineJoin='round';g.strokeStyle='#09110e';g.lineWidth=w+6;g.beginPath();q.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));g.stroke();g.strokeStyle=col;g.lineWidth=w;g.setLineDash([18,10]);g.lineDashOffset=reducido?0:-t*40;g.stroke();g.setLineDash([]);for(let i=1;i<q.length;i++){const a=q[i-1],b=q[i],d=Math.hypot(b.x-a.x,b.y-a.y);if(d<36)continue;for(let m=35+(reducido?0:t*22%45);m<d;m+=70)flecha(a.x+(b.x-a.x)*m/d,a.y+(b.y-a.y)*m/d,Math.atan2(b.y-a.y,b.x-a.x),col,11);if(!marcada&&d>70){texto(rotulo,(a.x+b.x)/2,(a.y+b.y)/2-18,col);marcada=true;}}}g.lineCap='butt';}
  function vias() { // polilíneas en el mundo de la vía cerrada y el desvío (aristas reales de la red, cierre_gradual.js)
    if (viasCache || !T3.net?.edges || !T3.lw) return viasCache;
    const lin = (k) => (VIAS[k]?.e || []).map((e) => T3.net.edges[e]?.[1]).filter(Boolean).map((pts) => pts.map(([x, y]) => T3.lw(x, y)));
    viasCache = { americas: lin('americas'), mayo: lin('mayo') }; return viasCache;
  }
  function polilinea(L, col, w, dash, off = 0) { g.strokeStyle = col; g.lineWidth = w; g.setLineDash(dash || []); g.lineDashOffset = off; for (const pts of L) { g.beginPath(); pts.forEach(([x, z], i) => { const q = P(x, z, 3); i ? g.lineTo(q.x, q.y) : g.moveTo(q.x, q.y); }); g.stroke(); } g.setLineDash([]); g.lineDashOffset = 0; }

  /* ---------- lectura propia de cada escenario ---------- */
  const ESC = {
    2(t) { const v = vias(), C = I.cierre, f = lerp('cf', C?.fase || 0), tr = lerp('tr', C?.traficoDesvio || 1);
      if(v){if(f>0.01){rutaVial(v.americas,'#d99370',Math.max(8,13*f),t,'VÍA CERRADA');rutaVial(v.mayo,'#e8c46a',Math.max(6,8*tr),t*tr,'DESVÍO');const tramo=v.americas.find(pts=>pts.length>1&&pts.some(([x,z])=>P(x,z,3).v));if(tramo){const q=P(tramo[Math.floor(tramo.length/2)][0],tramo[Math.floor(tramo.length/2)][1],3);if(q.v)alerta(q.x,q.y-25,'CIERRE ACTIVO');}}else rutaVial(v.americas,'#e8c46a',5,t,'CIERRE PROGRAMADO');}
      for (const a of (I.atropellos?.lista || []).filter((a) => ok(a) && a.sem > I.sem - 12).slice(-30)) { const q = P(a.x, a.z); if (q.v) alerta(q.x,q.y,'CONFLICTO','#c9f27a'); }
      return C?.fase ? `${C.via} cerrada · desvío ×${(C.traficoDesvio || 1).toFixed(2)} por ${C.vias_desvio?.map((d) => d.n).join(', ') || '—'} · 10 km: ${Math.round(I.tiempoDesvio10km || I.tiempo10km || 0)} min`
        : `Av. de las Américas abierta · tráfico ×${(I.trafico || 1).toFixed(2)} · 10 km: ${Math.round(I.tiempo10km || 0)} min`; },
    3(t) { const pts = (I.basura?.puntos || []).filter(ok), mx = Math.max(1, ...pts.map((p) => p.acumulada || 0));
      for (const [i, p] of pts.entries()) { const q = P(p.x, p.z); if (!q.v) continue; const a = lerp('b' + i, p.acumulada || 0), r = 9 + 27 * Math.sqrt(a / mx);
        circ(q.x, q.y, r, `rgba(217,147,112,${0.18 + 0.5 * Math.min(1, (p.sinRecoger_t_dia || 0) / Math.max(1, p.t_dia || 1) * 4)})`, '#d99370', 1);
        if ((p.sinRecoger_t_dia||0)>0) alerta(q.x,q.y-r-22,'RESIDUOS'); }
      const rec = (I.recorridos || []).filter((r) => ok(r.de) && ok(r.a)), mt = Math.max(0.01, ...rec.map((r) => r.t_dia));
      for (const r of rec) flujo(P(r.de.x, r.de.z), P(r.a.x, r.a.z), Math.max(1, Math.round(6 * r.t_dia / mt)), reducido ? 0.5 : t * 0.25, '#e8c46a');
      for (const e of (I.estaciones || []).filter(ok)) { const q = P(e.x, e.z); if (!q.v) continue; const u = e.cap_t_dia ? Math.min(1.2, e.tratado_t_dia / e.cap_t_dia) : 0;
        g.fillStyle = '#0a1514cc'; g.fillRect(q.x - 11, q.y - 24, 22, 24); g.fillStyle = u > 1 ? '#d99370' : '#c9f27a'; g.fillRect(q.x - 10, q.y - 2 - 20 * Math.min(1, u), 20, 20 * Math.min(1, u));texto('TRATAMIENTO',q.x+15,q.y-12,'#c9f27a'); }
      const gen = I.residuosK?.gen, sr = pts.reduce((s, p) => s + (p.sinRecoger_t_dia || 0), 0);
      return `Generación ${gen != null ? Math.round(gen).toLocaleString('es-CO') + ' t/día' : 'sin dato'} · sin recoger ${Math.round(sr)} t/día · ${(I.estaciones || []).filter((e) => e.tipo === 'estacion').length} estaciones`; },
    4(t) { const par = (I.verde?.parches || []).filter(ok);
      for (const p of par) { const q = P(p.x, p.z); if (!q.v) continue; const r = escala(p.x, p.z, lerp('r' + p.id, p.r || 0)); circ(q.x, q.y, r, `rgba(155,187,130,${0.08 + 0.25 * (p.calidad || 0)})`, p.r < p.r0 ? '#d99370' : '#9bbb82', p.r < p.r0 ? 5 : 3);if(p.r<p.r0)alerta(q.x,q.y-r-22,'HÁBITAT'); }
      for (const d of (I.evaluacion?.diversidad?.porParche || []).filter(ok)) { const q = P(d.x, d.z); if (!q.v) continue; const n = Math.min(12, Math.round((d.riqueza || 0) / 2));
        for (let k = 0; k < n; k++) { const a = k / n * 6.2832 + (reducido ? 0 : t * 0.6); circ(q.x + Math.cos(a) * 9, q.y + Math.sin(a) * 5, 1.6, '#c9f27a'); } }
      for (const c of I.corredores || []) { const [a, b] = c.puntos.map(([x, z]) => P(x, z)); const u = c.fase || 0; g.strokeStyle = '#8dbcb7'; g.lineWidth = 8; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u); g.stroke();if(u>0.05)flecha(a.x+(b.x-a.x)*u,a.y+(b.y-a.y)*u,Math.atan2(b.y-a.y,b.x-a.x),'#8dbcb7',14); }
      for (const [i, d] of (I.desplazamientos || []).entries()) if (ok(d.de) && ok(d.a)) flujo(P(d.de.x, d.de.z), P(d.a.x, d.a.z), 1, reducido ? 0.5 : (t * 0.2 + i * 0.13), '#d99370', 3);
      for (const a of (I.atropellos?.lista || []).filter((a) => ok(a) && a.sem > I.sem - 8).slice(-40)) { const q = P(a.x, a.z); if (!q.v) continue; g.strokeStyle = '#d99370'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(q.x - 3, q.y - 3); g.lineTo(q.x + 3, q.y + 3); g.moveTo(q.x + 3, q.y - 3); g.lineTo(q.x - 3, q.y + 3); g.stroke(); }
      for (const r of (I.refugios || []).filter(ok)) { const q = P(r.x, r.z); if (q.v) circ(q.x, q.y, 5, null, '#8dbcb7', 2); }
      return `${par.length} parches · conectividad ${Math.round(T(I).conectados ?? 0)} % · ${(I.desplazamientos || []).length} desplazamientos · ${(I.atropellos?.lista || []).filter((a) => a.sem > I.sem - 8).length} atropellos (8 sem)` + (I.fragmento ? ` · ${I.fragmento.nombre} −${I.fragmento.haPerdidas.toFixed(1)} ha` : ''); },
    5(t) { const Z = (I.suelo?.zonas || []).filter(ok), mx = Math.max(1e-4, ...Z.map((z) => z.presion || 0));
      for (const [i, z] of Z.entries()) { const q = P(z.x, z.z); if (!q.v) continue; const u = lerp('p' + i, (z.presion || 0) / mx), s = escala(z.x, z.z, 120);
        g.fillStyle = `rgba(217,147,112,${0.08 + 0.55 * u})`; g.fillRect(q.x - s, q.y - s * 0.6, 2 * s, 1.2 * s);
        if (z.estado && z.estado !== 'permanece') { g.strokeStyle = '#e8c46a'; g.lineWidth = 4; g.setLineDash([8, 5]); g.lineDashOffset = reducido ? 0 : -t * 20; g.strokeRect(q.x - s, q.y - s * 0.6, 2 * s, 1.2 * s); g.setLineDash([]);alerta(q.x,q.y-s*.6-22,'CAMBIO DE USO'); } }
      for (const p of (I.suelo?.protegidos || []).filter(ok)) { const q = P(p.x, p.z); if (q.v) { circ(q.x, q.y, 16, 'rgba(155,187,130,.35)', '#9bbb82', 4);texto('PROTEGIDO',q.x+20,q.y,'#9bbb82'); } }
      return `${Z.length} zonas · cambian de uso ${I.suelo?.cambian ?? 0} · desplazadas ${I.suelo?.desplazadas ?? 0} · ${(I.suelo?.protegidos || []).length} suelos protegidos`; },
    6(t) { const G = I.gobernanza; if (!G) return 'Sin datos de gobernanza en esta corrida';
      for (const b of (G.barrios || []).filter(ok)) { const q = P(b.x, b.z); if (!q.v) continue; const r = 10 + Math.sqrt(b.necesidad || 0) * 1.6, c = lerp('c' + b.n, Math.min(1, b.cobertura || 0));
        circ(q.x, q.y, r, 'rgba(217,147,112,.22)', '#d99370', 3);if(b.cobertura<.5)alerta(q.x,q.y-r-23,'SIN COBERTURA'); g.strokeStyle = '#c9f27a'; g.lineWidth = 4; g.beginPath(); g.arc(q.x, q.y, r, -1.5708, -1.5708 + 6.2832 * c); g.stroke();
        texto(`${Math.round(c * 100)}%`, q.x + r + 3, q.y + 4); }
      for (const [i, a] of (G.asambleas || []).filter(ok).entries()) { const q = P(a.x, a.z); if (!q.v || !a.activa) continue; const u = reducido ? 0.5 : (t * 0.5 + i * 0.2) % 1; circ(q.x, q.y, 4 + 14 * u, null, `rgba(141,188,183,${1 - u})`, 1.5); circ(q.x, q.y, 7, '#8dbcb7','#0a1514',2); }
      for (const e of (G.equipamientos || []).filter((e) => ok(e) && (e.sem == null || e.sem <= I.sem))) { const q = P(e.x, e.z); if (q.v) { g.fillStyle = '#8dbcb7'; g.fillRect(q.x - 6, q.y - 6, 12, 12); } }
      return `Cobertura media ${Math.round(((G.barrios || []).reduce((s, b) => s + Math.min(1, b.cobertura || 0), 0) / Math.max(1, (G.barrios || []).length)) * 100)} % · ${G.decisiones ?? 0} decisiones · ${(G.equipamientos || []).filter((e) => e.sem == null || e.sem <= I.sem).length} equipamientos`; }
  };
  /* La selección usa lugares de la red y las celdas del modelo, nunca posiciones sorteadas. */
  let coraPoly=null;fetch('data3d/corabastos.json?v=3').then(r=>r.ok?r.json():null).then(d=>{if(d?.poly&&T3.lw)coraPoly=d.poly.map(([x,z])=>T3.lw(x,z));}).catch(()=>{});
  function poligono(pts,col,t,fill='rgba(201,242,122,.12)'){if(!pts?.length)return;const q=pts.map(([x,z])=>P(x,z,5));if(!q.some(p=>p.v))return;g.beginPath();q.forEach((p,i)=>i?g.lineTo(p.x,p.y):g.moveTo(p.x,p.y));g.closePath();g.fillStyle=fill;g.fill();g.strokeStyle='#08100c';g.lineWidth=10;g.stroke();g.strokeStyle=col;g.lineWidth=5;g.setLineDash([16,8]);g.lineDashOffset=reducido?0:-t*30;g.stroke();g.setLineDash([]);}
  function celda(x,z,col,t){const h=250;poligono([[x-h,z-h],[x+h,z-h],[x+h,z+h],[x-h,z+h]],col,t);}
  function etiqueta(q,n,val,col){if(!q?.v)return;const label=(n+(val?' · '+val:'')).toUpperCase();g.font='700 13px ui-monospace,monospace';const w=Math.min(370,g.measureText(label).width+24),x=Math.max(8,Math.min(W-w-8,q.x+18)),y=Math.max(30,Math.min(H-25,q.y-28));g.fillStyle='#0b1411ee';g.fillRect(x,y-18,w,29);g.strokeStyle=col;g.lineWidth=2;g.strokeRect(x,y-18,w,29);g.fillStyle=col;g.fillText(label,x+10,y+1,w-20);g.beginPath();g.moveTo(q.x,q.y);g.lineTo(x,y);g.stroke();}
  function parcheElegido(){const ids={1:'burro',2:'techo',3:'vaca',4:'bosqueBav'},id=ids[+R.valores?.parche]||I.fragmento?.parche||'burro';return (I.verde?.parches||[]).find(p=>p.id===id)||PARCHES.find(p=>p.id===id);}
  function referencia(){const par=R.def?.par;
    if(par===2){const p=(vias()?.americas||[]).flat(),q=p[Math.floor(p.length/2)];return q?{x:q[0],z:q[1],n:'AV. DE LAS AMÉRICAS'}:null;}
    if(par===3){const p=[...(I.basura?.puntos||[])].filter(ok).sort((a,b)=>(b.sinRecoger_t_dia||0)-(a.sinRecoger_t_dia||0))[0];return p?{x:p.x,z:p.z,n:p.nombre||'FOCO DE RESIDUOS'}:null;}
    if(par===4){const p=parcheElegido();return p?{x:p.x,z:p.z,n:p.n||'CORREDOR VERDE'}:null;}
    if(par===5){const p=[...(I.suelo?.zonas||[])].filter(ok).sort((a,b)=>(b.presion||0)-(a.presion||0))[0];return p?{x:p.x,z:p.z,n:'ZONA DE SUELO MODELADA'}:null;}
    if(par===6){const B=(I.gobernanza?.barrios||[]).filter(ok),ix=+R.valores?.barrioPrioritario,p=ix>=0?B[ix]:[...B].sort((a,b)=>(a.cobertura||0)-(b.cobertura||0))[0];return p?{x:p.x,z:p.z,n:p.n||'SECTOR COMUNITARIO'}:null;}
    return null;}
  function dibujarIndicador(t){if(!clave||!INDK[clave])return;const par=R.def?.par,col='#c9f27a',ref=referencia();if(!ref)return;const d=INDK[clave],v=valor(clave,I,{H:R.hist,M:getM()}),val=v==null?'':v.toLocaleString('es-CO',{maximumFractionDigits:d.d})+(d.u?' '+d.u:'');
    if(par===2){const roads=vias();if(roads)rutaVial(roads.americas,col,12,t,'INDICADOR · '+d.n.toUpperCase());}
    if(par===3){if(coraPoly)poligono(coraPoly,col,t);for(const p of [...(I.basura?.puntos||[])].filter(ok).sort((a,b)=>(b.sinRecoger_t_dia||0)-(a.sinRecoger_t_dia||0)).slice(0,8)){const q=P(p.x,p.z,6);if(q.v){const r=Math.max(17,Math.min(56,8+Math.sqrt(Math.max(0,p.acumulada||0))*3));circ(q.x,q.y,r,'rgba(217,147,112,.25)','#d99370',3);if((p.sinRecoger_t_dia||0)>0)alerta(q.x,q.y-r-20,'');}}}
    if(par===4){const p=parcheElegido();if(p){const q=P(p.x,p.z,6),r=Math.max(34,Math.min(160,escala(p.x,p.z,p.r||p.r0||Math.sqrt((p.ha||1)*10000/Math.PI))));if(q.v){circ(q.x,q.y,r,'rgba(201,242,122,.10)','#09120c',10);g.setLineDash([18,8]);g.lineDashOffset=reducido?0:-t*32;circ(q.x,q.y,r,null,col,5);g.setLineDash([]);if(+R.valores?.parchePerdida>0)alerta(q.x,q.y-r-22,'PÉRDIDA '+R.valores.parchePerdida+' %');}}}
    if(par===5)for(const z of [...(I.suelo?.zonas||[])].filter(ok).sort((a,b)=>(b.presion||0)-(a.presion||0)).slice(0,18))celda(z.x,z.z,z.estado&&z.estado!=='permanece'?'#d99370':col,t);
    if(par===6){const B=(I.gobernanza?.barrios||[]).filter(ok),ix=+R.valores?.barrioPrioritario,A=ix>=0&&B[ix]?[B[ix]]:[...B].sort((a,b)=>(a.cobertura||0)-(b.cobertura||0)).slice(0,3);for(const barrio of A)for(const zi of barrio.zonas||[]){const z=ZONAS[zi];if(z)celda(z[0],z[1],(barrio.cobertura||0)<.5?'#d99370':col,t);}}
    const q=P(ref.x,ref.z,8);if(q.v){const u=reducido?.5:(t*.5)%1;circ(q.x,q.y,20+22*u,null,'rgba(201,242,122,'+(1-u)+')',3);flecha(q.x,q.y-18,Math.PI/2,col,14);etiqueta(q,ref.n,val,col);}
  }
  function enfocarIndicador(){if(!T3.camera||!T3.orbit||!I)return;const r=referencia();if(!r)return;const V3=T3.THREE.Vector3,c=new V3(r.x,12,r.z),dist=Math.max(360,Math.min(900,T3.camera.position.distanceTo(T3.orbit.target)*.45));T3.anim={t:0,dur:1.25,p0:T3.camera.position.clone(),c0:T3.orbit.target.clone(),p1:c.clone().add(new V3(dist*.55,dist*.6,dist*.8)),c1:c};}
  document.addEventListener('change',e=>{if(['parche','barrioPrioritario','zonaSuelo'].includes(e.target?.dataset?.k)&&R.def?.par>=2&&R.def?.par<=6)requestAnimationFrame(enfocarIndicador);});
  function marcarBotones() { document.querySelectorAll('.pi-mapa').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mapa === clave))); }
  function frame(ms) {
    requestAnimationFrame(frame);
    if(ms-ultimoFrame<45)return;ultimoFrame=ms;
    const par = R.def?.par, hay = R.hist?.length, visible = !!(hay && par >= 2 && par <= 6 && !document.body.classList.contains('ra-recorrido'));
    if (caja.classList.contains('on') !== visible) caja.classList.toggle('on', visible);
    if (!visible) { if (!hay) { suave.clear(); semana = -1; } return; }
    if (par !== parPintado) { parPintado = par; suave.clear(); if (!elegida) clave = POR_DEFECTO[par]; marcarBotones(); ley.innerHTML = (LEY[par] || []).map(([c, n]) => `<li style="--c:${c}">${n}</li>`).join(''); }
    I = R.hist.at(-1); const t = ms / 1000;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    let resumen = ''; try { resumen = ESC[par](t); dibujarIndicador(t); } catch (e) { if (!frame.avisado) { frame.avisado = 1; console.warn('lectura espacial:', e); } }
    { semana = I.sem;
      const d = INDK[clave], gl = d ? valor(clave, I, { H: R.hist, M: getM() }) : null;
      const tx = `${TIT[par]}${d ? ' · ' + d.n + ': ' + (gl == null ? 'sin dato' : gl.toLocaleString('es-CO', { maximumFractionDigits: d.d }) + (d.u ? ' ' + d.u : '')) : ''}`;
      if (title.textContent !== tx) title.textContent = tx; const dt = `Semana ${I.sem} · ${resumen}`; if (detail.textContent !== dt) detail.textContent = dt; }
  }
  requestAnimationFrame(frame);
  return { elegir(k) { elegida = true; clave = k; marcarBotones(); enfocarIndicador(); } };
}
