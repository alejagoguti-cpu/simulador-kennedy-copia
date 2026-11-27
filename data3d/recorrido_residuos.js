/* Recorrido de las simulaciones 5 y 6: territorio, corte esquemático y
   reproducción de las 780 semanas del modelo. Las ubicaciones y las fechas
   de apertura proceden de MERCADOS; las cantidades salen de simulaciones12. */
import { RELOJ } from './reloj.js?v=5';
import { crearGris } from './gris.js?v=1';
import { SIMS } from './simulaciones12.js?v=44';
import { MERCADOS } from './sim_red_datos.js?v=2';

let actual = null;
let GR = null;
const EXC = window.KEN_REC_EXCLUIR || (window.KEN_REC_EXCLUIR = []);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const num = (v, d = 1) => Number.isFinite(v) ? v.toLocaleString('es-CO', { minimumFractionDigits:d, maximumFractionDigits:d }) : '—';
const limitar = (x, a, b) => Math.max(a, Math.min(b, x));
const sitioSeleccionado = s => s.con ? MERCADOS[Math.max(0, +s.valores.estacionObjetivo)] : { x:1075,z:72 };

function estilos() {
  if (document.getElementById('rr-css')) return;
  const s = document.createElement('style'); s.id = 'rr-css'; s.textContent = `
  html.rr-on body > :not(#todo3d):not(#rr):not(script):not(style):not(link){opacity:0!important;pointer-events:none!important;visibility:hidden!important}
  #rr{position:fixed;inset:0;z-index:9999;pointer-events:none;font:13px/1.45 Inter,system-ui,sans-serif;color:#eaf2ee;--ac:#66ddaf}
  #rr.sin{--ac:#ffad6a}
  #rr canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
  #rr nav,#rr section,#rr .rr-salir{pointer-events:auto;background:rgba(10,20,21,.94);border:1px solid rgba(153,226,195,.3);box-shadow:0 24px 66px rgba(0,0,0,.45);backdrop-filter:blur(16px)}
  #rr nav{position:absolute;top:14px;left:50%;transform:translateX(-50%);display:flex;gap:4px;padding:5px;border-radius:13px}
  #rr nav button{padding:8px 12px;background:transparent;color:#b7c5bf;border:0}
  #rr nav button.on{color:#fff;background:color-mix(in srgb,var(--ac) 26%,transparent)}
  #rr .rr-salir{position:absolute;right:14px;top:14px;border-radius:12px;min-width:40px}
  #rr section{position:absolute;left:18px;bottom:18px;width:min(420px,calc(100vw - 36px));box-sizing:border-box;border-radius:17px;padding:20px 22px;max-height:calc(100vh - 80px);overflow:auto}
  #rr[data-fase="detalle"] section,#rr[data-fase="variables"] section{top:68px;bottom:18px;width:min(430px,36vw)}
  #rr[data-fase="variables"] section{left:auto;right:18px}
  #rr .rr-k{font:600 10px/1.4 monospace;letter-spacing:.13em;text-transform:uppercase;color:var(--ac)}
  #rr h2{font:400 29px/1.08 Georgia,serif;margin:12px 0}
  #rr p{color:#bacbc3;margin:0 0 13px}
  #rr .rr-dato{border-top:1px solid #3b5149;padding:10px 0;font:12px/1.45 monospace;color:#c6d7cd}
  #rr button{cursor:pointer;border-radius:9px;border:1px solid #658474;background:#192d26;color:#eaf2ee;padding:10px 12px;font:600 12px Inter,system-ui,sans-serif;min-height:40px}
  #rr button:hover,#rr button:focus-visible{outline:2px solid #fff;outline-offset:2px}
  #rr button.rr-pri{background:var(--ac);color:#10211a;border-color:var(--ac)}
  #rr .rr-acciones{display:flex;gap:8px;flex-wrap:wrap;margin-top:15px}
  #rr .rr-grid{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:#3b5149;border:1px solid #3b5149;margin:12px 0}
  #rr .rr-grid div{padding:10px;background:#142620}
  #rr .rr-grid b{display:block;font:400 21px Georgia,serif;color:var(--ac)}
  #rr .rr-grid small{font:10px monospace;text-transform:uppercase;color:#b3c5b8}
  #rr .rr-sl{display:block;margin:12px 0;font-size:12px}
  #rr .rr-sl span{display:flex;justify-content:space-between;gap:8px}
  #rr .rr-sl output{font:600 12px monospace;color:var(--ac);white-space:nowrap}
  #rr input[type=range]{width:100%;accent-color:var(--ac)}
  #rr select{width:100%;padding:10px;background:#193127;color:#eaf2ee;border:1px solid #658474;border-radius:8px;font:12px Inter,system-ui,sans-serif}
  #rr svg{width:100%;height:auto;display:block;background:#12221d;border:1px solid #3b5149;margin:13px 0}
  #rr .rr-go{color:#ff9a8d!important}
  @media(max-width:760px){#rr nav{top:8px;left:8px;transform:none}#rr nav button{padding:7px 8px;font-size:10px}#rr .rr-salir{top:8px;right:8px}#rr section,#rr[data-fase="detalle"] section,#rr[data-fase="variables"] section{left:8px;right:8px;top:auto;bottom:8px;width:auto;max-height:54vh;padding:14px 16px}#rr h2{font-size:22px}#rr[data-fase="detalle"] svg{max-height:125px}}
  @media(prefers-reduced-motion:reduce){#rr *{scroll-behavior:auto!important;transition:none!important}}`;
  document.head.appendChild(s);
}

function figura(s) {
  const { THREE, T3, con } = s, G = new THREE.Group();
  const sitio = sitioSeleccionado(s); G.userData.sitio = sitio;
  const y = (T3.sueloY ?? 0.3) + 1.2;
  const base = new THREE.Mesh(new THREE.BoxGeometry(23, .8, 17), new THREE.MeshBasicMaterial({ color:0x758c81 })); base.position.set(sitio.x,y,sitio.z); G.add(base);
  const blanco = new THREE.MeshBasicMaterial({ color:0xe6f0e9 }), verde = new THREE.MeshBasicMaterial({ color:0x70d183 }), ambar = new THREE.MeshBasicMaterial({ color:0xf7b26d });
  for (let i=0;i<3;i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(4,4.3,5), blanco); b.position.set(sitio.x-6+i*6,y+2.5,sitio.z); G.add(b);
    const tapa = new THREE.Mesh(new THREE.BoxGeometry(4.4,.4,5.4), con ? verde : ambar); tapa.position.set(b.position.x,y+4.8,sitio.z); G.add(tapa);
  }
  if (con) { const cilindro = new THREE.Mesh(new THREE.CylinderGeometry(3,3,5,20), verde); cilindro.position.set(sitio.x+8,y+3,sitio.z-5); G.add(cilindro); }
  G.visible = false; G.name = 'recorrido-residuos-esquema'; T3.scene.add(G); return G;
}

function estaciones3D(s) {
  const G = new s.THREE.Group(); G.name = 'rr-estaciones-circulares';
  if (!s.con) return { G, nodos:[] };
  const T = s.THREE, y = (s.T3.sueloY ?? .3) + 1;
  const base = new T.BoxGeometry(20, .8, 15), nave = new T.BoxGeometry(13, 5, 9), techo = new T.BoxGeometry(15, .7, 11);
  const verde = new T.MeshBasicMaterial({ color:0x66ddaf }), blanco = new T.MeshBasicMaterial({ color:0xe4f7eb });
  const nodos = MERCADOS.map(m => {
    const g = new T.Group(); g.name = 'estacion-circular-' + m.id; g.position.set(m.x, y, m.z);
    const p = new T.Mesh(base, verde); p.position.y = .4; g.add(p);
    const n = new T.Mesh(nave, blanco); n.position.y = 3.2; g.add(n);
    const t = new T.Mesh(techo, verde); t.position.y = 6; g.add(t);
    g.visible = false; G.add(g); return { desde:m.desde, grupo:g };
  });
  s.T3.scene.add(G); return { G, nodos, geometrias:[base,nave,techo], materiales:[verde,blanco] };
}

function mostrarEstaciones(s) {
  const sem = s.fase === 'territorio' ? Infinity : s.fase === 'variables' ? s.anio * 52 : -1;
  for (const [k,n] of s.estaciones.nodos.entries()) n.grupo.visible = n.desde <= sem && (+s.valores.estacionObjetivo < 0 || k === +s.valores.estacionObjetivo);
}

function panel(s, html) { s.caja.innerHTML = html; s.caja.querySelectorAll('[data-ir]').forEach(b => b.onclick = () => vista(s, b.dataset.ir)); }
function cabecera(s, paso) { return `<div class="rr-k">Simulación ${s.con ? '6 · con propuesta' : '5 · sin propuesta'} / ${paso}</div>`; }
function vista(s, fase) {
  if (actual !== s) return;
  if (s.fase === 'variables' && fase !== 'variables') pausar(s);
  s.fase = fase; s.root.dataset.fase = fase;
  s.root.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.ir === fase));
  s.modelo.visible = fase === 'detalle';
  if (fase === 'detalle') GR.off(); else GR.on();
  mostrarEstaciones(s);
  if (fase !== 'detalle' && s.general) T3vuelo(s, s.general.p, s.general.c);
  if (fase === 'territorio') {
    panel(s, `${cabecera(s,'01 / Territorio')}<h2>¿Dónde van los orgánicos?</h2><p>${s.con ? +s.valores.estacionObjetivo < 0 ? `El modelo ubica ${MERCADOS.length} Estaciones Circulares propuestas en los mercados de barrio. Sus puntos se iluminan cuando abren.` : `La intervención se concentra en ${esc(sitioSeleccionado(s).n)}. Su estación se ilumina al abrir y los recorridos se dirigen allí.` : 'Sin la red propuesta, los orgánicos siguen su recorrido hacia el relleno Doña Juana.'}</p><div class="rr-dato">Puntos de la red: datos del modelo · calendario de apertura: supuesto de simulación</div><div class="rr-acciones"><button class="rr-pri" data-ir="detalle">Explorar un punto →</button></div>`);
  } else if (fase === 'detalle') {
    const sitio = sitioSeleccionado(s);
    T3vuelo(s, new s.THREE.Vector3(sitio.x+48,(s.T3.sueloY??0)+70,sitio.z+58),new s.THREE.Vector3(sitio.x,(s.T3.sueloY??0)+3,sitio.z));
    panel(s, `${cabecera(s,'02 / Corte y 3D')}<h2>${s.con ? 'Estación Circular · ' + esc(sitio.n) : 'Residuos sin estación local'}</h2><p>${s.con ? 'La estación elegida recibe orgánicos, los trata y envía compost a la red de huertas.' : 'El corte muestra la separación y la salida de orgánicos hacia el relleno; aquí no aparece una Estación Circular.'}</p>
    <svg viewBox="0 0 360 150" role="img" aria-label="Corte esquemático del proceso de residuos"><path d="M12 119H346" stroke="#81988a" stroke-width="2"/><rect x="24" y="58" width="72" height="61" fill="#e6f0e9"/><path d="M16 58h88" stroke="#a9bdb0" stroke-width="8"/><text x="60" y="137" text-anchor="middle" fill="#d4e2d7" font-size="10">orgánicos</text><path d="M101 88h62" stroke="${s.con?'#66ddaf':'#ffad6a'}" stroke-width="3" marker-end="url(#flecha)"/><defs><marker id="flecha" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5 0 7" fill="${s.con?'#66ddaf':'#ffad6a'}"/></marker></defs>${s.con ? '<rect x="172" y="38" width="80" height="81" rx="10" fill="#66ddaf"/><path d="M208 47v62" stroke="#2d7656" stroke-width="10"/><text x="212" y="137" text-anchor="middle" fill="#d4e2d7" font-size="10">tratamiento</text><path d="M260 88h47" stroke="#66ddaf" stroke-width="3" marker-end="url(#flecha)"/><text x="321" y="96" fill="#d4e2d7" font-size="10">compost</text>' : '<rect x="172" y="55" width="136" height="64" rx="7" fill="#7d6b5a"/><text x="240" y="91" text-anchor="middle" fill="#fff" font-size="12">relleno Doña Juana</text>'}</svg>
    <div class="rr-dato">Corte y volúmenes 3D esquemáticos, sin medidas de obra. Capacidad y tratamiento: modelo semanal.</div><div class="rr-acciones"><button data-ir="territorio">← Territorio</button><button class="rr-pri" data-ir="variables">Cambiar variables →</button></div>`);
  } else {
    const def = SIMS.find(x => x.id === (s.con ? 6 : 5));
    const controles = def.sliders.map(sl => `<label class="rr-sl"><span>${esc(sl.n)}<output data-v="${esc(sl.k)}">${sl.opciones ? esc(sl.opciones.find(o=>o[0]===s.valores[sl.k])?.[1]||'—') : num(s.valores[sl.k], sl.paso<1?1:0)+' '+esc(sl.unidad)}</output></span>${sl.opciones ? `<select data-k="${esc(sl.k)}" title="${esc(sl.ayuda)}">${sl.opciones.map(([v,n])=>`<option value="${v}" ${v===s.valores[sl.k]?'selected':''}>${esc(n)}</option>`).join('')}</select>` : `<input type="range" data-k="${esc(sl.k)}" min="${sl.min}" max="${sl.max}" step="${sl.paso}" value="${s.valores[sl.k]}" title="${esc(sl.ayuda)}">`}</label>`).join('');
    panel(s, `${cabecera(s,'03 / Simulación · 15 años')}<h2>Ver el cambio en el tiempo</h2><p>Play avanza semana a semana. ${s.con ? 'Las estaciones se activan según el calendario del modelo.' : 'Sin propuesta, el número de estaciones permanece en cero.'} Los indicadores y el game over responden a las variables.</p><div class="rr-grid" aria-live="polite"><div><b id="rr-org">—</b><small>Orgánicos t/día</small></div><div><b id="rr-comp">—</b><small>Compost t/día</small></div><div><b id="rr-est">—</b><small>Estaciones activas</small></div><div><b id="rr-sin">—</b><small>Sin recoger</small></div></div><div id="rr-estado" class="rr-dato">Calculando…</div><label class="rr-sl"><span>Año<output id="rr-anio">0,0</output></span><input id="rr-tiempo" type="range" min="0" max="15" step="0.001" value="${s.anio}"></label><div class="rr-acciones"><button class="rr-pri" id="rr-play">▶ Reproducir</button><button data-ir="detalle">← Corte</button></div><div class="rr-dato">${s.con ? 'Estaciones y fechas: calendario del modelo, no obras confirmadas.' : 'Sin estaciones propuestas.'} Horizonte: 780 semanas.</div>${controles}`);
    const tiempo=s.caja.querySelector('#rr-tiempo'); tiempo.oninput=()=>{ pausar(s); s.anio=+tiempo.value; pintar(s); };
    s.caja.querySelector('#rr-play').onclick=()=>reproducir(s);
    s.caja.querySelectorAll('input[data-k],select[data-k]').forEach(i=>{ const sl=def.sliders.find(x=>x.k===i.dataset.k); i.oninput=()=>{ const o=s.caja.querySelector(`output[data-v="${CSS.escape(i.dataset.k)}"]`); o.textContent=sl.opciones ? sl.opciones.find(x=>x[0]===+i.value)?.[1]||'—' : `${num(+i.value,sl.paso<1?1:0)} ${sl.unidad}`; }; i.onchange=()=>{ pausar(s); s.valores[i.dataset.k]=+i.value; if(i.dataset.k==='estacionObjetivo'){const viejo=s.modelo.userData.sitio,nuevo=sitioSeleccionado(s);s.modelo.position.set(nuevo.x-viejo.x,0,nuevo.z-viejo.z);mostrarEstaciones(s);} const main=document.querySelector(`#su-der [data-k="${CSS.escape(i.dataset.k)}"]`); if(main){main.value=i.value;main.dispatchEvent(new Event('input',{bubbles:true}));main.dispatchEvent(new Event('change',{bubbles:true}));} recalcular(s); }; });
    if (s.serie.length) pintar(s); else recalcular(s);
  }
}

function T3vuelo(s, p, c) { s.T3.anim={t:0,dur:2.1,p0:s.T3.camera.position.clone(),c0:s.T3.orbit.target.clone(),p1:p.clone(),c1:c.clone()}; }
function recalcular(s) {
  if (!s.worker) { s.worker = new Worker(new URL('./residuos_variables_worker.js?v=5',import.meta.url),{type:'module'}); s.worker.onmessage=({data})=>{ if(actual!==s||data.id!==s.solicitud)return; const estado=s.caja.querySelector('#rr-estado'); if(data.error){if(estado)estado.textContent='No se pudo calcular: '+data.error;return;} s.serie=data.serie; pintar(s); }; }
  s.serie=[]; const estado=s.caja.querySelector('#rr-estado'); if(estado)estado.textContent='Calculando las 780 semanas…'; s.worker.postMessage({id:++s.solicitud,sim:s.con?6:5,valores:{...s.valores}});
}
function datos(s) {
  if (!s.serie.length) return null;
  const sem=s.anio*52, i=limitar(Math.floor(sem/13),0,s.serie.length-1), j=Math.min(s.serie.length-1,i+1), a=s.serie[i], b=s.serie[j], f=j===i?0:limitar((sem-a.sem)/(b.sem-a.sem),0,1);
  return { sem, organicos:a.organicos+(b.organicos-a.organicos)*f, compost:a.compost+(b.compost-a.compost)*f, sinRecoger:a.sinRecoger+(b.sinRecoger-a.sinRecoger)*f, estaciones:s.con?MERCADOS.filter((m,k)=>m.desde<=sem && (+s.valores.estacionObjetivo<0||k===+s.valores.estacionObjetivo)).length:0 };
}
function pintar(s) {
  if (s.fase!=='variables') return;
  const d=datos(s); const q=id=>s.caja.querySelector(id); if(!d)return;
  q('#rr-tiempo').value=String(s.anio); q('#rr-anio').textContent=num(s.anio,1);
  q('#rr-org').textContent=num(d.organicos,0); q('#rr-comp').textContent=num(d.compost,1);
  q('#rr-est').textContent=String(d.estaciones); q('#rr-sin').textContent=num(d.sinRecoger,1)+' %';
  mostrarEstaciones(s);
  const go=s.serie.find(x=>x.gameOver)?.gameOver, ocurrido=go&&d.sem>=go.sem;
  q('#rr-estado').classList.toggle('rr-go',!!ocurrido);
  q('#rr-estado').textContent=ocurrido?`GAME OVER · semana ${go.sem} · ${go.motivo}`:`Año ${num(s.anio,1)} · ${d.estaciones} / ${s.con?(+s.valores.estacionObjetivo<0?MERCADOS.length:1):0} estaciones activas`;
}
function pausar(s) { if(s.play){cancelAnimationFrame(s.play);s.play=0;} const b=s.caja.querySelector('#rr-play');if(b)b.textContent='▶ Reproducir'; }
function reproducir(s) {
  if(s.play){pausar(s);return;} if(!s.serie.length)return;
  const go=s.serie.find(x=>x.gameOver)?.gameOver, fin=go?Math.min(15,go.sem/52):15;
  if(s.anio>=fin-.001)s.anio=0;
  const desde=s.anio,inicio=performance.now(),b=s.caja.querySelector('#rr-play');b.textContent='Ⅱ Pausar';
  const paso=ahora=>{if(actual!==s||s.fase!=='variables')return;s.anio=Math.min(fin,desde+(ahora-inicio)/1600);pintar(s);if(s.anio>=fin-.001){s.anio=Math.ceil(fin*1000)/1000;pintar(s);pausar(s);}else s.play=requestAnimationFrame(paso);};
  s.play=requestAnimationFrame(paso);
}
function cuadro(s,tiempo) {
  if(actual!==s)return; const ratio=Math.min(2,devicePixelRatio||1),w=innerWidth,h=innerHeight,cv=s.overlay;
  if(cv.width!==Math.round(w*ratio)||cv.height!==Math.round(h*ratio)){cv.width=Math.round(w*ratio);cv.height=Math.round(h*ratio);}
  const ctx=s.ctx;ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,w,h);
  const rect=s.canvas3d.getBoundingClientRect(),p=s.p,pulso=.5+.5*Math.sin(tiempo*.003);
  const marca=(x,z,radio,color,solido)=>{p.set(x,(s.T3.sueloY??.3)+6,z).project(s.T3.camera);if(p.z<-1||p.z>1)return;const px=rect.left+(p.x+1)*rect.width/2,py=rect.top+(1-p.y)*rect.height/2;if(px<0||px>w||py<0||py>h)return;ctx.beginPath();ctx.arc(px,py,radio+2*pulso,0,Math.PI*2);ctx.shadowColor=color;ctx.shadowBlur=solido?20:8;ctx.fillStyle=solido?color:'rgba(255,255,255,.09)';ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=color;ctx.stroke();};
  if(s.fase==='detalle'){const t=sitioSeleccionado(s);marca(t.x,t.z,16,s.con?'#66ddaf':'#ffad6a',true);}
  else if(s.con){const sem=s.fase==='variables'?s.anio*52:Infinity;for(const [k,m] of MERCADOS.entries())if(+s.valores.estacionObjetivo<0||k===+s.valores.estacionObjetivo)marca(m.x,m.z,5,m.desde<=sem?'#66ddaf':'#9caf9d',m.desde<=sem);}
  else {marca(1075,72,12,'#ffad6a',true);marca(896,1146,7,'#ffad6a',true);}
  ctx.shadowBlur=0;s.frame=requestAnimationFrame(t=>cuadro(s,t));
}

export async function abrirRecorridoResiduos({ con=false }={}) {
  if(actual){if(actual.con===con)return;cerrarRecorridoResiduos();}
  const T3=window.KEN_T3;if(!T3?.camera||!T3?.renderer)throw new Error('Maqueta 3D no disponible');
  estilos();RELOJ.pausarAños(true);
  const root=document.createElement('div');root.id='rr';root.className=con?'':'sin';root.setAttribute('role','region');root.setAttribute('aria-label','Recorrido de residuos');
  root.innerHTML='<canvas aria-hidden="true"></canvas><nav aria-label="Vistas"><button data-ir="territorio">Territorio</button><button data-ir="detalle">Corte y 3D</button><button data-ir="variables">Simulación</button></nav><button class="rr-salir" aria-label="Salir del recorrido">✕</button><section></section>';
  document.body.appendChild(root);document.documentElement.classList.add('rr-on');
  const def=SIMS.find(x=>x.id===(con?6:5)),valores={};for(const sl of def.sliders){const main=document.querySelector(`#su-der [data-k="${CSS.escape(sl.k)}"]`);valores[sl.k]=main?+main.value:sl.val;}
  const s={root,caja:root.querySelector('section'),overlay:root.querySelector('canvas'),ctx:root.querySelector('canvas').getContext('2d'),canvas3d:T3.renderer.domElement,filtro:T3.renderer.domElement.style.filter,T3,THREE:T3.THREE,con,valores,anio:0,serie:[],solicitud:0,worker:null,play:0,frame:0,p:new T3.THREE.Vector3(),general:{p:T3.camera.position.clone(),c:T3.orbit.target.clone()}};
  s.modelo=figura(s);s.estaciones=estaciones3D(s);EXC.length=0;EXC.push(s.estaciones.G,s.modelo);
  GR=window.KEN_REC_GRIS || (window.KEN_REC_GRIS=crearGris({T3,excluir:EXC}));actual=s;
  root.querySelector('.rr-salir').onclick=cerrarRecorridoResiduos;
  s.tecla=e=>{if(e.key==='Escape')cerrarRecorridoResiduos();};addEventListener('keydown',s.tecla);
  root.querySelectorAll('nav button').forEach(b=>b.onclick=()=>vista(s,b.dataset.ir));
  vista(s,'territorio');s.frame=requestAnimationFrame(t=>cuadro(s,t));
}
export function cerrarRecorridoResiduos() {
  const s=actual;if(!s)return;actual=null;pausar(s);cancelAnimationFrame(s.frame);s.worker?.terminate();removeEventListener('keydown',s.tecla);
  GR.off();GR=null;EXC.length=0;s.canvas3d.style.filter=s.filtro;s.T3.anim={t:0,dur:1.5,p0:s.T3.camera.position.clone(),c0:s.T3.orbit.target.clone(),p1:s.general.p,c1:s.general.c};
  s.modelo.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});s.T3.scene.remove(s.modelo);
  s.T3.scene.remove(s.estaciones.G);for(const g of s.estaciones.geometrias||[])g.dispose();for(const m of s.estaciones.materiales||[])m.dispose();
  s.root.remove();document.documentElement.classList.remove('rr-on');
}
export const abierto=()=>!!actual;

