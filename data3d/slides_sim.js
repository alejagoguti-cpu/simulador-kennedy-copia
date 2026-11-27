/* ============ DIAPOSITIVAS DE CADA SIMULACIÓN (vista limpia, data3d/limpio.js) ============
   Al tocar una de las 6 simulaciones del panel izquierdo se abre un mazo de diapositivas de vidrio con lo que el código dice de ese par:
   la pregunta y la prueba de estrés (simulaciones12.js PARES/SIMS), el modelo (comentarios de cabecera de simulaciones12.js), la cadena
   causa → efecto (sim_ui.js CADENA) y las capas que se prenden (sim_ui.js HISTORIA), los deslizadores con sus rangos y unidades (SIMS[].sliders),
   las reglas de game over con su umbral y su fuente (REGLAS) y lo que cambia con la propuesta. Nada inventado: solo textos del código.
   Navegación: anterior/siguiente, puntos, flechas del teclado, Esc cierra. Pista con scroll-snap nativo (se desliza con el dedo). */

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (v) => (Math.round(v * 1000) / 1000).toLocaleString('es-CO');

/* El modelo de cada par: cabecera de simulaciones12.js («LAS 12 SIMULACIONES = 6 PARES») y, para el 01, los deslizadores actuales del par
   (el comentario de cabecera del 01 todavía describe el corte de suministro anterior). */
const COMUN = 'Las dos corridas del par arrancan iguales, con la misma semilla, la misma prueba y los mismos deslizadores; la única diferencia es la infraestructura propuesta. El metro Línea 1 (contexto real) está en todas. Horizonte: 15 años (780 semanas), en tres plazos.';
const MODELO = {
  1: 'Cada semana: demanda de frescos de Kennedy = población (1.080.742 en 2026, DANE-SDP) × 0,65 kg/hab/día × «Demanda» × mes del año (patrón DANE-SIPSA 2025); el «Autoconsumo» sale de huertas y no se compra. A Corabastos le pide toda la ciudad y la región (6.460 t/día hoy, DANE-SIPSA 2025); la región manda el «Volumen» y la central recibe como mucho su tope (6.460 × (1 + «Tope»), inferencia SDDE-FAO 2018). Si no alcanza, todos los compradores reciben la misma fracción y en Kennedy pierden más las zonas lejos de Corabastos. Con propuesta, cada mercado (17 t/día, Contraloría 2025) vende a los hogares a 1 km y cubre parte de lo que falta. Las llegadas se reparten por tipo de vehículo (6,21 t por vehículo, SIPSA; mezcla SDM 2020) y por franja horaria (12–20 h, 20–24 h, 4–6 h).',
  2: 'Cierre temporal de la Av. de las Américas (cierre forzado de sim_vida.js + cierre gradual y desvíos). Con propuesta, los pasajes y conexiones de Bavaria Común y los mercados distribuidos suman una tercera ruta de desvío: el tráfico desviado se reparte en tres y no en dos [SUP].',
  3: 'Aumento de los residuos orgánicos: los kg/persona·día suben el porcentaje elegido, en un año desde la semana de inicio. Sin propuesta: relleno Doña Juana (capacidad de referencia). Con propuesta: Estaciones Circulares en los mercados nodo (compost de proximidad).',
  4: 'Pérdida de una parte de un corredor verde: la calidad del corredor verde para todas sus especies baja como la raíz del área que queda. Con propuesta: conexiones vegetales (+0,2 de árboles en parques en 5 años), refugios (los módulos de huertas son hábitat) y restauración (recuperación del humedal × 1,5) [SUP: acciones de la propuesta].',
  5: 'Presión inmobiliaria extra sobre los sectores que crecen (a 800 m de las estaciones y a 1 km del predio de Bavaria) y crecimiento de la población. Con propuesta: espacios productivos y comunitarios protegidos (mercados nodo, Bavaria Común) e instrumentos de gestión del suelo (solo actúan en la corrida con propuesta).',
  6: 'Recursos insuficientes para las necesidades de varios sectores (presupuesto en % de la necesidad). Sin propuesta: una coordinación central reparte por población, con la información de hace medio año. Con propuesta: las asambleas locales (una Junta de Acción Comunal por sector, IDPAC) presentan prioridades y una federación con vocerías rotativas reparte según la necesidad reportada.'
};
/* sim_ui.js CADENA: los pasos de la historia de cada par (las cifras en vivo están en el panel de datos) */
const CADENA = {
  1: ['Demanda de frescos de Kennedy', 'Lo que se le pide a Corabastos', 'Corabastos frente a su tope', 'Mercados y autoconsumo', 'Sector peor abastecido'],
  2: ['Vía cerrada', 'Tráfico en las calles del desvío', 'Comida en la zona peor servida', 'Ruido promedio', 'Interacciones entre especies'],
  3: ['Orgánicos generados', 'Tratados en estaciones / relleno', 'Economía circular', 'Basura sin recoger', 'Humedales que funcionan'],
  4: ['Corredor verde perdido', 'Corredores y refugios', 'Territorio con fauna', 'Especies de fauna', 'Interacciones entre especies'],
  5: ['Precio del suelo', 'Zonas desplazadas / que cambian de uso', 'Hogares en riesgo de desplazamiento', 'Tráfico'],
  6: ['Recursos que alcanzan', 'Equidad entre barrios', 'Decisiones tomadas', 'Equipamientos habilitados']
};
/* sim_ui.js HISTORIA: capas que quedan visibles mientras corre el par */
const HISTORIA = { 1: ['abasto_cont', 'basura', 'degradacion', 'predio', 'caminos'], 2: ['cierre', 'biotica', 'predio', 'caminos'], 3: ['residuos', 'basura', 'degradacion', 'predio', 'caminos'],
  4: ['biodiversidad', 'biotica', 'degradacion', 'predio', 'caminos'], 5: ['suelo', 'predio', 'caminos'], 6: ['gobernanza', 'caminos'] };
const CAPA_N = { abasto_cont: 'Medidores de capacidad (Corabastos y mercados)', basura: 'Basura', degradacion: 'Degradación', predio: 'Predio de Bavaria', caminos: 'Caminos', cierre: 'Cierre de vía',
  biotica: 'Red biótica', residuos: 'Residuos', biodiversidad: 'Biodiversidad', suelo: 'Suelo', gobernanza: 'Gobernanza' };
/* reglas cuyo indicador aparece en la cadena del par */
const REGLA_PAR = { 1: ['abasto'], 2: ['trafico', 'ruido', 'abasto'], 3: ['residuos', 'humedal'], 4: ['fauna', 'habitat'], 5: ['trafico'], 6: [] };

const ICO = {
  prev: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  next: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  x: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
  play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5v9l7-4.5z" fill="currentColor"/></svg>'
};

let M = null;
const cargar = () => M ? Promise.resolve(M) : import('./simulaciones12.js?v=45').then(m => (M = m));
/* par 01: diapositivas «Datos» y «Fuentes» con las cifras del dossier (docs/fuentes_abastecimiento.md; simulaciones12.js AB01 y AB01_FUENTES) */
function slides01() {
  const A = M.AB01, F = M.AB01_FUENTES || []; if (!A) return [];
  const fila = (n, v, f) => `<dt>${esc(n)}</dt><dd><b>${v}</b> <span class="sl-tenue">· ${esc(f)}</span></dd>`;
  const datos = `<p class="sl-kick">Datos del modelo · todos con fuente o marcados como supuesto</p><dl class="sl-dl">
    ${fila('Entra a Corabastos', '6.460 t/día (2.357.973 t en 2025)', 'DANE-SIPSA 2025 · alta')}
    ${fila('Mes más alto y más bajo', 'julio 6.839 · noviembre 6.097 t/día', 'DANE-SIPSA 2025 · alta')}
    ${fila('Vehículos de carga', '1.040 al día, 91,3 % pesados, 6,21 t cada uno', 'DANE-SIPSA 2025 · alta')}
    ${fila('Tipos de camión', `${A.TIPOS.map(T => `${T.n.replace(/ \(.*\)$/, '')} ${num(Math.round(T.p * 1000) / 10)} %`).join(' · ')}`, 'SDM 2020 × SIPSA · media; carga útil 0,8/5/9/17/30 t: supuesto')}
    ${fila('Franjas de ingreso', A.FRANJAS.map(Fr => `${Fr.n} ${num(Math.round(Fr.p * 1000) / 10)} %`).join(' · '), 'horarios de Corabastos × grupos SIPSA · confianza baja')}
    ${fila('Población de Kennedy', '1.080.742 hab (2026)', 'SED 2024, DANE-SDP · alta')}
    ${fila('Frescos por persona', '0,65 kg/día (0,61–0,69) ≈ 702 t/día en Kennedy', 'derivado de SIPSA × 85 % · baja-media')}
    ${fila('Tope de Corabastos', '+11 % sobre 6.460 t/día (rango 5–25 %)', 'ocupación 90 %, SDDE-FAO 2018 · inferencia')}
    ${fila('Plaza Distrital de Kennedy', '215 puestos, 131 ocupados ≈ 17 t/día', 'Contraloría 2025 · volumen derivado')}
    ${fila('Las 19 plazas distritales', '≈342 t/día', 'Contraloría 2025 con datos IPES 2024 · media-alta')}
    ${fila('Corabastos en Bogotá', '94 % de lo que entra a las centrales mayoristas; cerca de la mitad de todo lo que entra a la ciudad', 'SIPSA · alta / DTS 2022 · baja')}
    </dl><p class="sl-txt sl-tenue">Cambios frente a la versión anterior: población 1.034.000 → 1.080.742; 0,4 → 0,65 kg/hab/día (los 400 g de la OMS eran una recomendación, no un consumo); tope 22 % → 11 %; holgura del mayorista 10 % → 6 %; crecimiento 1,6 → 0,5 %/año; red de mercados 600 → ≈200 t/día.</p>`;
  const fuentes = `<p class="sl-kick">Fuentes · cita corta y enlace</p><ul class="sl-reglas">${F.map(f => `<li><div class="sl-rh"><b>${esc(f.c)}</b></div><p>${esc(f.d)}. <a href="${esc(f.u)}" target="_blank" rel="noopener">${esc(f.u.replace(/^https?:\/\//, '').split('/')[0])}</a></p></li>`).join('')}</ul>
    <p class="sl-txt sl-tenue">Detalle, cálculos y vacíos de información en docs/fuentes_abastecimiento.md y data3d/abasto_fuentes.json.</p>`;
  return [{ t: 'Datos', h: datos }, { t: 'Fuentes', h: fuentes }];
}

function slidesDe(par, con) {
  const P = M.PARES.find(p => p.par === par), S = M.SIMS.find(s => s.par === par && s.propuesta === con);
  if (!P || !S) return null;
  const nn = String(par).padStart(2, '0'), nombre = P.n.slice(3), sl = S.sliders || [];
  const lado = con ? 'con propuesta' : 'sin propuesta';
  const cad = CADENA[par] || [];
  const flujo = `<ol class="sl-flujo">
      <li class="ori"><small>Prueba de estrés</small><b>${esc(P.prueba)}</b></li>
      ${cad.map((t, i) => `<li><small>${String(i + 1).padStart(2, '0')}</small><b>${esc(t)}</b></li>`).join('')}
    </ol>`;
  const capas = (HISTORIA[par] || []).map(k => `<span class="sl-chip">${esc(CAPA_N[k] || k)}</span>`).join('');
  const vars = sl.map(s => { if (s.opciones) return `<li><div class="sl-vh"><b>${esc(s.n)}</b><span>${esc(s.opciones.find(o => o[0] === s.val)?.[1] || '—')}</span></div>${s.ayuda ? `<p>${esc(s.ayuda)}</p>` : ''}</li>`;
    const f = Math.max(0, Math.min(1, (s.val - s.min) / ((s.max - s.min) || 1)));
    return `<li><div class="sl-vh"><b>${esc(s.n)}</b><span>${num(s.val)} <small>${esc(s.unidad || '')}</small></span></div>
      <div class="sl-rango" style="--f:${(f * 100).toFixed(1)}%"><i></i></div>
      <div class="sl-vr"><span>${num(s.min)}</span><span>${num(s.max)}</span></div>
      ${s.ayuda ? `<p>${esc(s.ayuda)}</p>` : ''}</li>`; }).join('');
  const rel = REGLA_PAR[par] || [];
  const reglas = M.REGLAS.slice().sort((a, b) => (rel.includes(b.k) ? 1 : 0) - (rel.includes(a.k) ? 1 : 0)).map(r => `<li class="${rel.includes(r.k) ? 'rel' : ''}">
      <div class="sl-rh"><b>${esc(r.n)}</b><span>${num(r.umbral)} <small>${esc(r.unidad)}</small></span></div>
      <p>Game over si ${esc(r.txt)} durante ${r.semanas} semanas seguidas.</p>
      <details><summary>Fuente</summary><p>${esc(r.fuente)}</p></details></li>`).join('');
  return { titulo: `${nn} · ${nombre}`, kicker: `Simulación ${nn} · ${lado}`, slides: [
    { t: 'Pregunta', h: `<p class="sl-kick">Prueba de estrés</p><h3 class="sl-big">${esc(P.prueba)}</h3>
        <p class="sl-preg">${esc(S.pregunta)}</p>
        <dl class="sl-dl"><dt>Qué se ve en el mapa</dt><dd>${esc(P.visible)}</dd></dl>` },
    { t: 'Modelo', h: `<p class="sl-kick">Cómo se simula</p><p class="sl-txt">${esc(MODELO[par] || '')}</p>
        <p class="sl-txt sl-tenue">${esc(COMUN)}</p>
        <dl class="sl-dl"><dt>Escenario de esta corrida</dt><dd>${esc(S.desc)}</dd></dl>` },
    ...(par === 1 ? slides01().slice(0, 1) : []),
    { t: 'Cadena causa y efecto', h: `<p class="sl-kick">Cadena causa → efecto</p>${flujo}
        <p class="sl-kick">Capas que se prenden en el mapa</p><div class="sl-chips">${capas}</div>` },
    { t: 'Variables', h: `<p class="sl-kick">Variables · ${sl.length} deslizadores (valor inicial, rango)</p><ul class="sl-vars">${vars}</ul>
        <p class="sl-txt sl-tenue">Se ajustan en el bloque Variables del panel izquierdo; al moverlas el modelo se recalcula hasta la semana en curso.</p>` },
    { t: 'Reglas de game over', h: `<p class="sl-kick">Reglas de game over · iguales para las 12 simulaciones</p><ul class="sl-reglas">${reglas}</ul>
        ${rel.length ? '<p class="sl-txt sl-tenue">Marcadas: reglas cuyo indicador aparece en la cadena de este par.</p>' : ''}` },
    ...(par === 1 ? slides01().slice(1) : []),
    { t: 'Sin y con propuesta', h: `<p class="sl-kick">Qué cambia con la propuesta</p>
        <div class="sl-comp"><section class="${con ? '' : 'act'}"><h4>Kennedy sin propuesta</h4><p>${esc(P.sin)}</p><p class="sl-tenue">${esc(P.pregSin)}</p></section>
        <section class="con ${con ? 'act' : ''}"><h4>Kennedy con propuesta</h4><p>${esc(P.con)}</p><p class="sl-tenue">${esc(P.pregCon)}</p></section></div>
        <button type="button" class="sl-correr">${ICO.play}<span>Correr esta simulación</span></button>` }
  ] };
}

export function crearSlides({ alCorrer } = {}) {
  const box = document.createElement('section');
  box.id = 'lp-slides'; box.hidden = true; box.tabIndex = -1;
  box.setAttribute('aria-roledescription', 'carrusel'); box.setAttribute('aria-labelledby', 'sl-tit');
  document.body.appendChild(box);
  let n = 0, actual = 0, pendiente = null, volverA = null, clave = '';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const $ = (s) => box.querySelector(s);

  function pintar(d) {
    n = d.slides.length;
    box.innerHTML = `<header class="sl-cab"><div><p class="sl-kicker">${esc(d.kicker)}</p><h2 id="sl-tit">${esc(d.titulo)}</h2></div>
        <button type="button" class="sl-x" aria-label="Cerrar diapositivas">${ICO.x}</button></header>
      <div class="sl-track" role="group" aria-label="Diapositivas">${d.slides.map((s, i) => `<article class="sl" role="group" aria-roledescription="diapositiva" aria-label="${i + 1} de ${n}: ${esc(s.t)}"><div class="sl-in">${s.h}</div></article>`).join('')}</div>
      <footer class="sl-pie"><button type="button" class="sl-prev" aria-label="Diapositiva anterior">${ICO.prev}</button>
        <nav class="sl-puntos" aria-label="Escoger diapositiva">${d.slides.map((s, i) => `<button type="button" aria-label="Ir a ${i + 1}: ${esc(s.t)}"${i ? '' : ' aria-current="true"'}></button>`).join('')}</nav>
        <span class="sl-cont"><b>1</b> / ${n}</span>
        <button type="button" class="sl-next" aria-label="Diapositiva siguiente">${ICO.next}</button></footer>
      <p class="sl-oculto" role="status" aria-live="polite"></p>`;
    const tr = $('.sl-track');
    $('.sl-x').onclick = cerrar;
    $('.sl-prev').onclick = () => ir((pendiente ?? actual) - 1);
    $('.sl-next').onclick = () => ir((pendiente ?? actual) + 1);
    box.querySelectorAll('.sl-puntos button').forEach((b, i) => { b.onclick = () => ir(i); });
    const c = $('.sl-correr'); if (c) c.onclick = () => { cerrar(); if (alCorrer) alCorrer(); };
    let raf = 0;
    tr.addEventListener('scroll', () => { if (pendiente != null || raf) return; raf = requestAnimationFrame(() => { raf = 0; marcar(idx()); }); }, { passive: true });
    const asentar = () => { const i = idx(); pendiente = null; const antes = actual; actual = i; marcar(i); botones(); if (i !== antes) $('.sl-oculto').textContent = `Diapositiva ${i + 1} de ${n}`; };
    if ('onscrollend' in window) tr.addEventListener('scrollend', asentar);
    else { let t = 0; tr.addEventListener('scroll', () => { clearTimeout(t); t = setTimeout(asentar, 120); }, { passive: true }); }
    actual = 0; pendiente = null; botones();
  }
  const idx = () => { const tr = $('.sl-track'); return tr ? Math.max(0, Math.min(n - 1, Math.round(tr.scrollLeft / (tr.clientWidth || 1)))) : 0; };
  function marcar(i) { box.querySelectorAll('.sl-puntos button').forEach((b, k) => { if (k === i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); }); const c = $('.sl-cont b'); if (c) c.textContent = i + 1; }
  function botones() { const p = $('.sl-prev'), x = $('.sl-next'), i = pendiente ?? actual; if (!p) return;
    const fp = document.activeElement === p, fx = document.activeElement === x;
    p.disabled = i <= 0; x.disabled = i >= n - 1;
    if (fp && p.disabled) x.focus(); if (fx && x.disabled) p.focus(); }
  function ir(i) { const tr = $('.sl-track'); if (!tr) return; i = Math.max(0, Math.min(n - 1, i)); if (i === (pendiente ?? actual)) return;
    pendiente = i; marcar(i); botones();
    tr.scrollTo({ left: i * tr.clientWidth, behavior: reduce.matches ? 'auto' : 'smooth' });
    if (reduce.matches) setTimeout(() => { if (pendiente === i) { pendiente = null; actual = i; botones(); } }, 50); }

  async function abrir(par, con, desde) {
    await cargar(); const d = slidesDe(par, !!con); if (!d) return;
    const k = par + '|' + !!con, mismo = !box.hidden && clave.split('|')[0] === String(par), pos = mismo ? actual : 0; /* mismo par (otro lado): se queda en la misma diapositiva */
    clave = k; pintar(d); if (desde || !mismo) volverA = desde || document.activeElement;
    box.hidden = false; document.documentElement.classList.add('lp-slides-on');
    if (pos) requestAnimationFrame(() => { const tr = $('.sl-track'); tr.scrollLeft = pos * tr.clientWidth; actual = pos; marcar(pos); botones(); });
    box.focus({ preventScroll: true });
  }
  function cerrar() { if (box.hidden) return; box.hidden = true; clave = ''; document.documentElement.classList.remove('lp-slides-on');
    if (volverA && volverA.isConnected && volverA.focus) volverA.focus({ preventScroll: true }); volverA = null; }

  addEventListener('keydown', (e) => {
    if (box.hidden) return;
    if (e.key === 'Escape') { e.preventDefault(); cerrar(); return; }
    const t = e.target, tag = t && t.tagName;
    if (/INPUT|TEXTAREA|SELECT/.test(tag) || (t && t.isContentEditable)) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); ir((pendiente ?? actual) + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); ir((pendiente ?? actual) - 1); }
  });
  addEventListener('resize', () => { const tr = $('.sl-track'); if (tr && !box.hidden) tr.scrollLeft = actual * tr.clientWidth; });
  return { abrir, cerrar, get abierto() { return !box.hidden; } };
}

