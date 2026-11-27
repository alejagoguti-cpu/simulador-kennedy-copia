/* Recorrido E8: contexto en gris, cubiertas catastrales en verde y acercamiento
   a la construcción de 15 pisos verificada más próxima a Corabastos. */
export function crearFocoCubiertas({ THREE, T3, techos, hidro }) {
  const canvas3d = T3.renderer.domElement;
  const filtroAnterior = canvas3d.style.filter;
  const overlay = document.createElement('canvas');
  overlay.id = 'cubiertas-destellos';
  overlay.setAttribute('aria-hidden', 'true');
  const ctx = overlay.getContext('2d');
  const style = document.createElement('style');
  style.textContent = `
#cubiertas-destellos{position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:24}
#cubiertas-foco{position:fixed;z-index:9999;left:18px;bottom:82px;width:min(410px,calc(100vw - 36px));box-sizing:border-box;padding:20px 22px;border-radius:16px;
  background:var(--ui-glass,rgba(22,27,25,.6));border:1px solid var(--ui-glass-bd,rgba(255,255,255,.2));box-shadow:var(--ui-glass-sh,0 18px 44px rgba(0,0,0,.22));
  -webkit-backdrop-filter:var(--ui-glass-fx,blur(24px));backdrop-filter:var(--ui-glass-fx,blur(24px));color:var(--ui-tx,#f1f3ee);font-family:var(--ui-sans,Inter,system-ui,sans-serif);text-shadow:0 1px 2px rgba(0,0,0,.4)}
#cubiertas-foco .cf-kicker{font:500 10.5px/1.4 var(--ui-mono,monospace);letter-spacing:.16em;text-transform:uppercase;color:var(--ui-acc-tx,#e3f1cd)}
#cubiertas-foco h2{font:400 clamp(24px,2.6vw,32px)/1.05 var(--ui-tit,'Barlow Condensed',sans-serif);margin:10px 0 10px;letter-spacing:.01em}
#cubiertas-foco p{font-size:13px;line-height:1.55;color:var(--ui-tx2,#c9cfc4);margin:0 0 14px}
#cubiertas-foco .cf-data{font:11.5px/1.45 var(--ui-mono,monospace);color:var(--ui-tx2,#c9cfc4);border-top:1px solid var(--ui-bd,rgba(255,255,255,.12));padding-top:10px;margin-bottom:14px}
#cubiertas-foco button{appearance:none;border:0;border-radius:10px;background:var(--ui-acc,#d4ecb0);color:var(--ui-acc-ink,#1e2918);font:600 13px/1.2 var(--ui-sans,Inter,system-ui,sans-serif);padding:12px 16px;cursor:pointer;min-height:44px;text-shadow:none}
#cubiertas-foco button:hover,#cubiertas-foco button:focus-visible{filter:brightness(1.06);outline:2px solid #fff;outline-offset:2px}
#cubiertas-foco .cf-return{background:rgba(255,255,255,.06);color:var(--ui-acc-tx,#e3f1cd);border:1px solid var(--ui-bd2,rgba(212,236,176,.38));margin-left:9px}
#cubiertas-foco .cf-section{display:none}
#cubiertas-foco .cf-variables{display:none}
#cubiertas-foco[data-phase="detail"]{top:0;bottom:0;left:0;width:min(36vw,460px);box-sizing:border-box;overflow:auto;border-top:0;border-bottom:0;border-left:0;padding:clamp(24px,4vw,52px) clamp(22px,3vw,38px)}
#cubiertas-foco[data-phase="detail"] .cf-overview{display:none}
#cubiertas-foco[data-phase="detail"] .cf-section{display:block}
#cubiertas-foco[data-phase="variables"]{top:0;bottom:0;left:0;width:min(36vw,460px);box-sizing:border-box;overflow:auto;border-top:0;border-bottom:0;border-left:0;padding:clamp(24px,4vw,52px) clamp(22px,3vw,38px)}
#cubiertas-foco[data-phase="variables"] .cf-overview{display:none}
#cubiertas-foco[data-phase="variables"] .cf-variables{display:block}
#cubiertas-foco .cf-slider{display:block;margin:0 0 13px;font-size:12px;color:#d7e5d8}
#cubiertas-foco .cf-slider span{display:flex;justify-content:space-between;gap:8px;margin-bottom:4px}
#cubiertas-foco .cf-slider output{color:#a8ed87;font:600 12px monospace;white-space:nowrap}
#cubiertas-foco input[type=range]{width:100%;accent-color:#b5f584;cursor:pointer}
#cubiertas-foco .cf-metrics{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:15px 0}
#cubiertas-foco .cf-metrics div{background:rgba(255,255,255,.05);border:1px solid var(--ui-bd,rgba(255,255,255,.12));border-radius:10px;padding:11px 12px}
#cubiertas-foco .cf-metrics strong{display:block;font:400 26px/1.05 var(--ui-tit,'Barlow Condensed',sans-serif);color:var(--ui-acc,#d4ecb0)}
#cubiertas-foco .cf-metrics small{font:10px/1.3 monospace;text-transform:uppercase;color:#aebdad}
#cubiertas-foco .cf-trace{height:58px;display:flex;align-items:end;gap:4px;margin:12px 0 17px;border-bottom:1px solid #536b58}
#cubiertas-foco .cf-trace i{display:block;flex:1;min-width:5px;background:#8dcb6c;opacity:.55}
#cubiertas-foco .cf-trace i[data-active="1"]{opacity:1;background:#d4ff9c}
#cubiertas-foco .cf-trace i[data-go="1"]{background:#ef7268}
#cubiertas-foco .cf-go{color:#ffaaa1!important;font-weight:600}
#cubiertas-foco svg{display:block;width:100%;height:auto;margin:18px 0 12px;background:rgba(10,14,13,.35);border:1px solid var(--ui-bd,rgba(255,255,255,.12));border-radius:10px}
#cubiertas-foco .cf-note{font-size:11px;color:#9dad9e}
body:has(#cubiertas-foco[data-phase="detail"]) #hid-red{display:none!important}
body:has(#cubiertas-foco[data-phase="variables"]) #hid-red{display:none!important}
@media(max-width:760px){#cubiertas-foco{left:10px;bottom:90px;width:calc(100vw - 20px);padding:15px 17px}#cubiertas-foco h2{font-size:23px}#cubiertas-foco[data-phase="detail"],#cubiertas-foco[data-phase="variables"]{top:auto;bottom:0;width:100vw;max-height:44vh;min-height:0;padding:15px 18px;border-radius:16px 16px 0 0}#cubiertas-foco[data-phase="detail"] svg{max-height:110px}#cubiertas-foco[data-phase="detail"] h2{margin:6px 0}#cubiertas-foco[data-phase="detail"] p{margin-bottom:7px}#cubiertas-foco[data-phase="detail"] .cf-data{margin-bottom:8px}}
`;
  document.head.appendChild(style);
  document.body.appendChild(overlay);

  const mercado = T3.llAMundo(-74.15916, 4.63069);
  const centro = t => [t.W.reduce((s, p) => s + p[0], 0) / t.W.length, t.W.reduce((s, p) => s + p[1], 0) / t.W.length];
  const exactos = techos.filter(t => t.pisos === 15);
  const ordenes = hidro.ordenes();
  const planos = techos.map((techo, i) => ({ techo, orden: ordenes.get(i) })).filter(x => x.orden != null);
  /* las cubiertas catastrales son las primeras de la lista de instalación (data3d/estrategias.js): su fase llega hasta kCat < 1. El recorrido
     reparte esas cubiertas en sus 10 años: fracción del recorrido × kCat = fracción que se pide a huertas_hidro.js */
  const kCat = Math.max(1e-6, ...planos.map(x => x.orden));
  const elegido = exactos.sort((a, b) => {
    const ca = centro(a), cb = centro(b);
    return Math.hypot(ca[0] - mercado[0], ca[1] - mercado[1]) - Math.hypot(cb[0] - mercado[0], cb[1] - mercado[1]);
  })[0];
  const km = elegido ? (Math.hypot(elegido.longitud - (-74.15916), elegido.latitud - 4.63069) * 111).toFixed(2).replace('.', ',') : null;
  const panel = document.createElement('section');
  panel.id = 'cubiertas-foco';
  panel.setAttribute('aria-label', 'Recorrido por cubiertas hidropónicas');
  panel.innerHTML = `<div class="cf-overview"><div class="cf-kicker">E8 / Kennedy · abastecimiento</div>
    <h2>Las cubiertas que pueden cambiar la red alimentaria</h2>
    <p>Las cubiertas en verde corresponden a construcciones catastrales de 15 pisos o más. La huerta es una propuesta visual pendiente de revisión técnica.</p>
    <div class="cf-data">${techos.length} cubiertas localizadas · Catastro Distrital / IDECA</div>
    <button type="button" id="cf-ir" ${elegido ? '' : 'disabled'}>Explorar una cubierta de 15 pisos →</button></div>
    <div class="cf-section"><div class="cf-kicker">01 / Corte de cubierta · 15 pisos</div>
    <h2>Huerta hidropónica en altura</h2>
    <p>Construcción verificada más próxima a Corabastos entre las de exactamente 15 pisos. Distancia al punto de referencia: ${km || 'sin dato'} km.</p>
    <div class="cf-data">Catastro: ${elegido?.identificadorCatastral || 'sin selección'}<br>Altura física y capacidad estructural: pendientes</div>
    <svg viewBox="0 0 360 230" role="img" aria-label="Corte esquemático de una cubierta con torres hidropónicas y quince niveles">
      <g stroke="#557067" stroke-width="1"><path d="M32 208H334M48 31V208M191 31V208M48 31H191"/>${Array.from({length:15},(_,i)=>`<path d="M48 ${40+i*11}H191"/>`).join('')}</g>
      <rect x="35" y="27" width="226" height="6" fill="#c3c8c3"/><path d="M35 25V13M261 25V13" stroke="#bdc9c1" stroke-width="3"/>
      ${[87,133,179,225].map(x=>`<g><rect x="${x-10}" y="17" width="20" height="10" rx="3" fill="#e8efeb"/><rect x="${x-3}" y="-2" width="6" height="20" fill="#f2f4ee"/><circle cx="${x-8}" cy="7" r="5" fill="#70c456"/><circle cx="${x+8}" cy="6" r="5" fill="#94da6e"/></g>`).join('')}
      <text x="276" y="23" fill="#b4e898" font-size="9" font-family="monospace">2,10 m</text><text x="204" y="58" fill="#94a99a" font-size="9" font-family="monospace">CUBIERTA</text><text x="204" y="194" fill="#94a99a" font-size="9" font-family="monospace">15 PISOS</text>
    </svg>
    <p class="cf-note">Corte esquemático, sin escala vertical del edificio. Módulos blancos como referencia visual aportada.</p>
    <button type="button" id="cf-variables-ir">Cambiar variables →</button><button type="button" class="cf-return" id="cf-volver">← Ver todas</button></div>
    <div class="cf-variables"><div class="cf-kicker">02 / Simulación · 10 años</div><h2>¿Qué cambia al intervenir?</h2>
    <p>Al reproducir, las cubiertas planas con módulos aparecen una a una durante diez años. Los indicadores salen del modelo semanal. El autoconsumo es un supuesto independiente que puedes ajustar.</p>
    <div id="cf-controles">Cargando variables…</div>
    <button type="button" id="cf-play">▶ Reproducir 10 años</button>
    <div class="cf-data" id="cf-instaladas" aria-live="polite">0 / ${planos.length} cubiertas instaladas</div>
    <div class="cf-trace" id="cf-trace" aria-label="Cobertura de la zona peor servida, años uno a diez"></div>
    <div class="cf-metrics" aria-live="polite"><div><strong id="cf-cob">—</strong><small>Cobertura Kennedy</small></div><div><strong id="cf-peor">—</strong><small>Zona peor servida</small></div><div><strong id="cf-cora">—</strong><small>Carga de Corabastos</small></div><div><strong id="cf-merc">—</strong><small>Mercados activos</small></div></div>
    <div class="cf-data" id="cf-estado">Esperando cálculo…</div>
    <button type="button" class="cf-return" id="cf-corte">← Volver al corte</button></div>`;
  document.body.appendChild(panel);
  panel.style.display = 'none'; overlay.style.display = 'none'; // escondido hasta ver(true) (simulación 02 con propuesta)
  panel.querySelector('#cf-ir').addEventListener('click', mostrarDetalle);
  panel.querySelector('#cf-volver').addEventListener('click', mostrarTodas);
  panel.querySelector('#cf-variables-ir').addEventListener('click', mostrarVariables);
  panel.querySelector('#cf-corte').addEventListener('click', mostrarDetalle);
  panel.querySelector('#cf-play').addEventListener('click', reproducir);

  let activo = false, fase = 'overview', frame = 0, vistaGeneral = null;
  let worker = null, solicitud = 0, demora = null, variablesListas = false, fraccionVisual = 0;
  let serie = [], reproduccion = null, valoresActuales = {};
  const p = new THREE.Vector3();
  const modulos = (() => {
    if (!elegido) return [];
    const W = elegido.W, xs = W.map(q => q[0]), zs = W.map(q => q[1]);
    const dentro = (x,z) => { let ok = false; for (let i=0,j=W.length-1;i<W.length;j=i++) if ((W[i][1]>z)!==(W[j][1]>z) && x<(W[j][0]-W[i][0])*(z-W[i][1])/(W[j][1]-W[i][1])+W[i][0]) ok=!ok; return ok; };
    const out = [];
    for (let z=Math.min(...zs)+1.2;z<Math.max(...zs)-1.2 && out.length<100;z+=2.1)
      for (let x=Math.min(...xs)+1.2;x<Math.max(...xs)-1.2 && out.length<100;x+=1.55)
        if (dentro(x,z)) out.push([x,z]);
    return out;
  })();
  const dpr = () => Math.min(2, window.devicePixelRatio || 1);
  function dibujar(tiempo) {
    if (!activo) return;
    const ratio = dpr(), ancho = window.innerWidth, alto = window.innerHeight;
    if (overlay.width !== Math.round(ancho * ratio) || overlay.height !== Math.round(alto * ratio)) {
      overlay.width = Math.round(ancho * ratio); overlay.height = Math.round(alto * ratio);
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, ancho, alto);
    const rect = canvas3d.getBoundingClientRect();
    const pulso = 0.5 + 0.5 * Math.sin(tiempo * .003);
    const visibles = fase === 'detail' ? (elegido ? [elegido] : []) : fase === 'variables' ? planos.filter(x => x.orden <= fraccionVisual * kCat + 1e-9).map(x => x.techo) : techos;
    for (const t of visibles) {
      const puntos = t.W.map(([x,z]) => {
        p.set(x,t.h - .7,z).project(T3.camera);
        return [rect.left + (p.x+1)*rect.width/2, rect.top + (1-p.y)*rect.height/2, p.z];
      });
      if (!puntos.length || puntos.every(q => q[2] > 1 || q[2] < -1)) continue;
      ctx.beginPath(); puntos.forEach((q,i) => i ? ctx.lineTo(q[0],q[1]) : ctx.moveTo(q[0],q[1])); ctx.closePath();
      ctx.shadowColor = '#50ff69'; ctx.shadowBlur = 10 + 13*pulso;
      ctx.fillStyle = `rgba(82,255,93,${fase === 'detail' ? .16+.07*pulso : .38+.25*pulso})`; ctx.fill();
      ctx.lineWidth = 1.6 + pulso; ctx.strokeStyle = '#a7ff82'; ctx.stroke();
      const [cx,cz] = centro(t); p.set(cx,t.h,cz).project(T3.camera);
      const sx = rect.left + (p.x+1)*rect.width/2, sy = rect.top + (1-p.y)*rect.height/2;
      if (p.z >= -1 && p.z <= 1) { ctx.beginPath(); ctx.arc(sx,sy,4+2*pulso,0,Math.PI*2); ctx.fillStyle='#baff83'; ctx.fill(); }
    }
    if (fase === 'detail' && elegido) {
      const proyectar = (x,y,z) => { p.set(x,y,z).project(T3.camera); return [rect.left+(p.x+1)*rect.width/2,rect.top+(1-p.y)*rect.height/2,p.z]; };
      for (const [x,z] of modulos) {
        const b=proyectar(x,elegido.h+.05,z), a=proyectar(x,elegido.h+2.1,z), lado=proyectar(x+.39,elegido.h+.05,z);
        if (b[2]<-1 || b[2]>1 || a[2]<-1 || a[2]>1) continue;
        const r=Math.max(1.2,Math.min(9,Math.abs(lado[0]-b[0])));
        ctx.shadowBlur=0; ctx.fillStyle='#f4f7ed'; ctx.beginPath(); ctx.ellipse(b[0],b[1],r,Math.max(1,r*.35),0,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='#f4f7ed'; ctx.lineWidth=Math.max(1.2,r*.52); ctx.beginPath(); ctx.moveTo(b[0],b[1]);ctx.lineTo(a[0],a[1]);ctx.stroke();
        for (const h of [.55,.9,1.25,1.6,1.95]) { const q=proyectar(x,elegido.h+h,z); ctx.fillStyle=h%2<1?'#4baf57':'#9bdd73'; ctx.beginPath(); ctx.arc(q[0]-r*.8,q[1],Math.max(1,r*.65),0,Math.PI*2);ctx.arc(q[0]+r*.8,q[1]-1,Math.max(1,r*.65),0,Math.PI*2);ctx.fill(); }
      }
    }
    ctx.shadowBlur = 0;
    frame = requestAnimationFrame(dibujar);
  }
  function mostrarTodas() {
    if (!activo) return;
    pausar();
    destacarTorres(false);
    if (fase !== 'overview' && vistaGeneral) {
      T3.anim = { t:0, dur:2.1, p0:T3.camera.position.clone(), c0:T3.orbit.target.clone(), p1:vistaGeneral.p.clone(), c1:vistaGeneral.c.clone() };
    }
    fase = 'overview'; panel.dataset.phase = fase;
    canvas3d.style.filter = 'grayscale(1) brightness(.72)';
    overlay.style.display = 'block';
    cancelAnimationFrame(frame); frame = requestAnimationFrame(dibujar);
  }
  function mostrarDetalle() {
    if (!elegido || !activo) return;
    pausar();
    hidro.fraccion(kCat); // el edificio elegido debe mostrar sus módulos aunque la línea de tiempo esté en el año 1
    destacarTorres(true);
    if (!vistaGeneral) vistaGeneral = { p:T3.camera.position.clone(), c:T3.orbit.target.clone() };
    fase = 'detail'; panel.dataset.phase = fase;
    cancelAnimationFrame(frame); overlay.style.display = 'block'; frame = requestAnimationFrame(dibujar);
    canvas3d.style.filter = filtroAnterior;
    const [x,z] = centro(elegido), h = elegido.h;
    const p1 = new THREE.Vector3(x+35,h+45,z+40), c1 = new THREE.Vector3(x,h-17,z);
    T3.anim = { t:0, dur:2.4, p0:T3.camera.position.clone(), c0:T3.orbit.target.clone(), p1, c1 };
  }
  async function mostrarVariables() {
    if (!activo) return;
    destacarTorres(false);
    fase = 'variables'; panel.dataset.phase = fase;
    hidro.fraccion(0); fraccionVisual = 0;
    canvas3d.style.filter = 'grayscale(1) brightness(.72)';
    if (vistaGeneral) T3.anim = { t:0, dur:2.2, p0:T3.camera.position.clone(), c0:T3.orbit.target.clone(), p1:vistaGeneral.p.clone(), c1:vistaGeneral.c.clone() };
    overlay.style.display = 'block'; cancelAnimationFrame(frame); frame = requestAnimationFrame(dibujar);
    if (variablesListas) { recalcular(); return; }
    variablesListas = true;
    try {
      const sim = await import('./simulaciones12.js?v=45');
      const controles = panel.querySelector('#cf-controles');
      const sliders = sim.SIMS.find(s => s.id === 2).sliders;
      controles.innerHTML = sliders.map(s => `<label class="cf-slider"><span>${s.n}<output data-v="${s.k}">${s.val} ${s.unidad}</output></span><input type="range" data-k="${s.k}" min="${s.min}" max="${s.max}" step="${s.paso}" value="${s.val}" aria-label="${s.n}" title="${s.ayuda}"></label>`).join('') + '<label class="cf-slider"><span>Año de lectura<output data-v="anio">0</output></span><input type="range" data-k="anio" min="0" max="10" step="0.001" value="0" aria-label="Año de lectura"></label>';
      worker = new Worker(new URL('./abasto_variables_worker.js?v=4', import.meta.url), { type:'module' });
      worker.onmessage = ({data}) => {
        if (data.id !== solicitud || !activo || fase !== 'variables') return;
        const estado = panel.querySelector('#cf-estado');
        if (data.error) { estado.textContent = 'No se pudo calcular: ' + data.error; return; }
        serie = data.serie;
        panel.querySelector('#cf-trace').innerHTML = serie.slice(1).map((p,i) => `<i data-year="${i+1}" data-go="${p.gameOver?1:0}" style="height:${Math.max(4,Math.min(100,p.peorZona))}%" title="Año ${i+1}: zona peor servida ${p.peorZona.toFixed(1)} %"></i>`).join('');
        mostrarAnio();
      };
      controles.addEventListener('input', event => {
        const input = event.target.closest('input[data-k]'); if (!input) return;
        const meta = sliders.find(s => s.k === input.dataset.k);
        controles.querySelector(`[data-v="${input.dataset.k}"]`).textContent = input.value + (meta ? ' ' + meta.unidad : '');
        if (input.dataset.k === 'anio') { pausar(); mostrarAnio(); }
        else { pausar(); clearTimeout(demora); demora = setTimeout(recalcular, 180); }
      });
      recalcular();
    } catch (error) { panel.querySelector('#cf-controles').textContent = 'No se pudieron cargar las variables: ' + error.message; }
  }
  function recalcular() {
    if (!worker) return;
    const valores = {}, inputs = panel.querySelectorAll('#cf-controles input[data-k]');
    for (const input of inputs) if (input.dataset.k !== 'anio') valores[input.dataset.k] = Number(input.value);
    valoresActuales = valores; serie = [];
    panel.querySelector('#cf-estado').textContent = 'Calculando las 520 semanas…';
    worker.postMessage({ id:++solicitud, valores });
    mostrarAnio();
  }
  function mostrarAnio() {
    const input = panel.querySelector('#cf-controles input[data-k="anio"]'); if (!input) return;
    const anio = Number(input.value), anterior = serie[Math.floor(anio)], siguiente = serie[Math.ceil(anio)];
    fraccionVisual = Math.max(0, Math.min(1, anio / 10));
    hidro.fraccion(fraccionVisual * kCat);
    panel.querySelector('#cf-instaladas').textContent = `${planos.filter(x => x.orden <= fraccionVisual * kCat + 1e-9).length} / ${planos.length} cubiertas instaladas · despliegue visual supuesto`;
    panel.querySelector('#cf-controles [data-v="anio"]').textContent = anio.toFixed(1).replace('.', ',');
    panel.querySelectorAll('#cf-trace i').forEach((el,i) => el.dataset.active = i+1 === Math.ceil(anio) ? '1' : '0');
    if (!anterior || !siguiente) return;
    const f = anio - Math.floor(anio), interp = k => anterior[k] + (siguiente[k] - anterior[k]) * f;
    const pct = x => Number.isFinite(x) ? x.toFixed(1).replace('.', ',') + ' %' : '—';
    panel.querySelector('#cf-cob').textContent = pct(interp('cobertura'));
    panel.querySelector('#cf-peor').textContent = pct(interp('peorZona'));
    panel.querySelector('#cf-cora').textContent = pct(interp('cargaCorabastos'));
    panel.querySelector('#cf-merc').textContent = String(Math.round(interp('mercados')));
    const estado = panel.querySelector('#cf-estado');
    const gameOver = siguiente.gameOver && anio >= siguiente.gameOver.sem / 52 ? siguiente.gameOver : null;
    estado.classList.toggle('cf-go', !!gameOver);
    estado.textContent = gameOver ? `GAME OVER · semana ${gameOver.sem} · ${gameOver.motivo}` : `Año ${anio.toFixed(1).replace('.', ',')} · escenario en curso · cálculo semanal`;
  }
  function pausar() {
    if (reproduccion) cancelAnimationFrame(reproduccion);
    reproduccion = null;
    panel.querySelector('#cf-play').textContent = '▶ Reproducir 10 años';
  }
  function reproducir() {
    if (reproduccion) { pausar(); return; }
    if (!serie.length) return;
    const input = panel.querySelector('#cf-controles input[data-k="anio"]');
    if (Number(input.value) >= 10) { input.value = '0'; mostrarAnio(); }
    const desde = Number(input.value), inicio = performance.now();
    const primerGameOver = serie.find(p => p.gameOver)?.gameOver;
    const fin = primerGameOver ? Math.min(10, primerGameOver.sem / 52) : 10;
    if (desde >= fin) { input.value = '0'; mostrarAnio(); }
    const origen = Number(input.value);
    panel.querySelector('#cf-play').textContent = 'Ⅱ Pausar';
    const avanzar = ahora => {
      input.value = String(Math.min(fin, origen + (ahora - inicio) / 1600));
      mostrarAnio();
      if (Number(input.value) >= fin - .001) {
        input.value = String(Math.ceil(fin * 1000) / 1000);
        mostrarAnio();
        pausar();
      }
      else reproduccion = requestAnimationFrame(avanzar);
    };
    reproduccion = requestAnimationFrame(avanzar);
  }
  function destacarTorres(on) {
    for (const im of hidro.grupo.children) if (im.userData.tipo === 'torre') {
      im.material.depthTest = !on;
      im.material.depthWrite = !on;
      im.material.needsUpdate = true;
      im.renderOrder = on ? 100 : 0;
    }
  }
  return { ver(on) {
    if (activo === on) return;
    activo = on; panel.style.display = on ? 'block' : 'none';
    if (on) { fase = 'overview'; vistaGeneral = null; mostrarTodas(); }
    else { pausar(); cancelAnimationFrame(frame); overlay.style.display='none'; canvas3d.style.filter=filtroAnterior; destacarTorres(false); }
  }, elegido };
}

