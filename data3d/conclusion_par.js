/* ============ CONCLUSIÓN GENERAL DE LAS SIMULACIONES 02–06 (informe.js) — misma lógica que la 01 (conclusion_abasto.js) ============
   conclusionPar({ H, B, go, def, parametros, completo }) → { estado, big, eye, frase, veredicto, html, pintar(root), textos }
   VEREDICTO BINARIO (docs/todas_las_simulaciones.md): No sostenible = game over (cualquier regla del modelo, 4 semanas seguidas);
   Sostenible = 15 años sin game over. PLANTILLA FIJA: 1 qué se cambió → 2 qué pasó → 3 si aguantó → 4 cuándo y dónde falló → 5 conclusión.
   Todo sale de la corrida (H) y de la otra mitad del par (B); los límites son LIM y PAR_LIM de data3d/sim_panel.js. */
import { LIM, PAR_LIM, PAR_CFG, malo, nf } from './sim_panel.js?v=5';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const añoDe = (sem) => Math.min(15, Math.floor((Math.max(1, sem) - 1) / 52) + 1);
const val = (f, h) => { try { const v = f(h); return v != null && isFinite(v) ? v : null; } catch (e) { return null; } };
export function conclusionPar({ H, B = null, go = null, def = {}, parametros = {}, completo = true }) {
  const C = PAR_CFG[def.par]; if (!C || !H || !H.length) return null;
  const L = H[H.length - 1], prop = !!def.propuesta, sl = def.sliders || [], A1 = H[Math.min(H.length - 1, 51)];
  const ks = PAR_LIM[def.par].slice(); if (go && LIM[go.regla] && !ks.includes(go.regla)) ks.unshift(go.regla);
  /* peor valor de cada límite y semanas fuera */
  const est = ks.map(k => { const Lm = LIM[k]; let peor = null, wP = null, fuera = 0;
    for (const h of H) { const v = val(Lm.v, h); if (v == null) continue; if (peor == null || (Lm.min ? v < peor : v > peor)) { peor = v; wP = h.sem; } if (malo(k, v)) fuera++; }
    const camino = peor == null ? 0 : Lm.min ? (100 - peor) / Math.max(1e-6, 100 - Lm.lim) : (peor - (k === 'trafico' ? 100 : 0)) / Math.max(1e-6, Lm.lim - (k === 'trafico' ? 100 : 0)); /* camino de hoy (tráfico 100 %, ruido +0 dB, Estaciones 0 %) al límite */
    return { k, Lm, peor, wP, fuera, camino: Math.max(0, camino) }; });
  const estado = go ? 'go' : 'sostenible', VERD = { go: 'Game over', sostenible: 'Sostenible' };
  /* 1 · qué se cambió */
  const dec = (s) => (s.paso < 1 ? 2 : 0);
  const valor = (s, v) => s.opciones ? (s.opciones.find(o => o[0] === +v)?.[1] || '—') : `${nf(v, dec(s))}${s.unidad ? ' ' + s.unidad : ''}`;
  const cambios = sl.filter(s => parametros[s.k] != null && Math.abs(+parametros[s.k] - s.val) > 1e-9).map(s => `${s.n}: ${valor(s, parametros[s.k])} (por defecto ${valor(s, s.val)})`);
  const t1 = cambios.length ? `Se cambió: ${cambios.join('; ')}. Lo demás quedó por defecto.` : `Valores por defecto: ${sl.map(s => `${s.n}: ${valor(s, s.val)}`).join('; ')}.`;
  /* 2 · qué pasó: cada gráfica del panel, del año 1 al final */
  const t2 = C.graf.map(g => { const q = g.s[0], a = val(q.f, A1), b = val(q.f, L); return a == null || b == null ? null : `${g.t.replace(/^¿|\?$/g, '')}: ${g.fmt(a)} en el año 1 → ${g.fmt(b)} en el año ${añoDe(L.sem)}`; }).filter(Boolean).join('. ') + '.';
  /* 3 · si aguantó */
  const t3 = est.map(e => `${e.Lm.n}: peor ${e.Lm.f(e.peor)} (año ${añoDe(e.wP || 1)}; límite ${e.Lm.f(e.Lm.lim)})${e.fuera ? `, ${nf(e.fuera)} semanas fuera` : ''}`).join('. ') + '.';
  /* 4 · cuándo y dónde */
  const cerca = est.slice().sort((a, b) => b.camino - a.camino)[0];
  const t4 = go ? `Game over en el año ${añoDe(go.sem)} (semana ${nf(go.sem)})${go.lugar && go.lugar !== 'Kennedy' ? ', en ' + go.lugar : ''}: ${String(go.motivo || go.regla).replace(/\bsector (Sector)\b/, '$1')}${/cuatro semanas/.test(go.motivo || '') ? '' : ', cuatro semanas seguidas'}.`
    : `No llegó a game over${completo ? ' en los 15 años' : ' hasta ahora'}. El límite más cercano: ${cerca.Lm.n.toLowerCase()}, a ${nf(Math.min(1, cerca.camino) * 100)} % del camino de hoy a su límite.`;
  /* 5 · conclusión, con la otra mitad del par */
  const goB = B && B.length ? (B[B.length - 1].evaluacion && B[B.length - 1].evaluacion.territorio.gameOver) : null;
  const otra = B && B.length ? (goB ? `${prop ? 'Sin' : 'Con'} propuesta, con los mismos valores, llega a game over en el año ${añoDe(goB.sem)} (${esc(goB.motivo || goB.regla)}).` : `${prop ? 'Sin' : 'Con'} propuesta, con los mismos valores, ${B.length >= 780 ? 'aguanta los 15 años' : 'no llega a game over hasta la semana ' + nf(B.length)}.`) : '';
  const decidio = go ? (LIM[go.regla] ? `Lo decidió: ${LIM[go.regla].n.toLowerCase()} (límite ${LIM[go.regla].f(LIM[go.regla].lim)}).` : '') : `Ningún límite se cruzó 4 semanas seguidas.`;
  const t5 = `${VERD[estado]}${completo || go ? '' : ' (hasta ahora)'}. ${decidio} ${otra}`.trim();
  const G = C.graf.find(g => go && g.lim != null && LIM[go.regla] && g.lim === LIM[go.regla].lim) || C.graf.find(g => g.lim != null) || C.graf[0];
  const pasos = (arr) => `<ol class="cp-ol">${arr.map(([k, t]) => `<li><b>${k}</b><span>${esc(t)}</span></li>`).join('')}</ol>`;
  const barras = est.map(e => { const w = (v) => Math.max(2, Math.min(100, v / e.Lm.S * 100)).toFixed(1); const m = e.peor != null && malo(e.k, e.peor);
    return `<div class="cp-b"><span>${esc(e.Lm.n)}</span><i><b style="width:${w(e.peor || 0)}%;background:${m ? 'var(--s-crit,#f2694a)' : 'var(--s-con,#7d6bff)'}"></b><em style="left:${(e.Lm.lim / e.Lm.S * 100).toFixed(1)}%"></em></i><span>${esc(e.Lm.f(e.peor))}</span></div>`; }).join('');
  const html = `<section class="cp" data-a style="--d:1300" aria-labelledby="cp-t"><div class="cp-h"><span class="i2-lab">Conclusión general</span><h3 id="cp-t" class="cp-v ${estado}">${VERD[estado]}${completo || go ? '' : ' · hasta el año ' + añoDe(L.sem)}</h3></div>
    <div class="cp-g"><article class="cp-c i2-panel"><h4>¿Qué pasó?</h4><p class="cp-s">${esc(G.t)} · esta corrida y la otra mitad del par (punteada).</p><div class="cp-fig" data-cp="1"></div>
        ${pasos([['1 · Qué se cambió', t1], ['2 · Qué pasó', t2]])}</article>
      <article class="cp-c i2-panel"><h4>¿Aguantó?</h4><p class="cp-s">Peor valor de cada límite en la corrida (raya = límite).</p><div class="cp-bs">${barras}</div>
        ${pasos([['3 · Si aguantó', t3], ['4 · Cuándo y dónde', t4], ['5 · Conclusión', t5]])}</article></div></section>`;
  /* figura: la gráfica clave del panel (la del límite que cayó, o la primera con límite) */
  function fig(w) { const h = 190, pl = 42, pr = 10, pt = 10, pb = 22, iw = w - pl - pr, ih = h - pt - pb, FIN = Math.max(52, Math.ceil(L.sem / 52) * 52), f = G.s[0].f;
    const M = H.filter((_, i) => i % 4 === 0).concat([L]), MB = B && B.length ? B.filter((h2, i) => i % 4 === 0 && h2.sem <= L.sem) : null;
    const vs = M.concat(MB || []).map(q => val(f, q)).filter(v => v != null); if (G.lim != null) vs.push(G.lim);
    let mn = Math.min(...vs), mx = Math.max(...vs); const pad = (mx - mn) * 0.12 || 1; mn = Math.max(0, mn - pad); mx += pad;
    const x = (s) => pl + (s - 1) / (FIN - 1) * iw, y = (v) => pt + ih - (v - mn) / (mx - mn) * ih;
    const lin = (A) => { let d = '', n = 0; for (const q of A) { const v = val(f, q); if (v == null) { n = 0; continue; } d += `${n++ ? 'L' : 'M'}${x(q.sem).toFixed(1)} ${y(v).toFixed(1)}`; } return d; };
    let s = `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="${esc(G.t)}">`;
    for (let i = 0; i <= 4; i++) { const v = mn + (mx - mn) * i / 4; s += `<line x1="${pl}" x2="${w - pr}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="var(--grid)"/><text x="${pl - 6}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${esc(G.fmt(v))}</text>`; }
    const nA = FIN / 52; for (let a = 1; a <= nA; a += (w < 420 || nA > 10 ? 2 : 1)) s += `<text x="${x((a - 1) * 52 + 1).toFixed(1)}" y="${h - 6}" text-anchor="middle">${a}</text>`;
    if (G.lim != null) s += `<line x1="${pl}" x2="${w - pr}" y1="${y(G.lim).toFixed(1)}" y2="${y(G.lim).toFixed(1)}" stroke="var(--s-lim,#f5c451)" stroke-width="1.5" stroke-dasharray="5 4"/><text x="${w - pr}" y="${(y(G.lim) - 4).toFixed(1)}" text-anchor="end">${esc(G.limTxt)}</text>`;
    if (MB) s += `<path d="${lin(MB)}" fill="none" stroke="${prop ? '#f2694a' : '#7d6bff'}" stroke-width="1.5" stroke-dasharray="4 3"/>`;
    s += `<path d="${lin(M)}" fill="none" stroke="${prop ? '#7d6bff' : '#f2694a'}" stroke-width="2.2"/>`;
    if (go) s += `<line x1="${x(go.sem).toFixed(1)}" x2="${x(go.sem).toFixed(1)}" y1="${pt}" y2="${pt + ih}" stroke="var(--s-crit,#f2694a)" stroke-dasharray="2 3"/>`;
    return s + `</svg><div class="cp-ley"><span><i style="border-color:${prop ? '#7d6bff' : '#f2694a'}"></i>${prop ? 'Con' : 'Sin'} propuesta</span>${MB ? `<span><i class="d" style="border-color:${prop ? '#f2694a' : '#7d6bff'}"></i>${prop ? 'Sin' : 'Con'} propuesta</span>` : ''}${G.lim != null ? '<span><i class="d" style="border-color:#f5c451"></i>Límite</span>' : ''}</div>`; }
  function pintar(root) { if (!document.getElementById('cp-css')) { const st = document.createElement('style'); st.id = 'cp-css'; st.textContent = CSS; document.head.appendChild(st); }
    root.querySelectorAll('[data-cp]').forEach(el => { el.innerHTML = fig(Math.max(260, Math.floor(el.clientWidth || 320))); }); }
  const frase = go ? null : `Sin game over${completo ? ' en los 15 años' : ''}: ${est.map(e => `${e.Lm.n.toLowerCase()} ${e.Lm.f(e.peor)} en su peor semana (límite ${e.Lm.f(e.Lm.lim)})`).join('; ')}.`;
  return { estado, big: VERD[estado], eye: go ? 'Game over · condición crítica sostenida' : `Resultado · ${VERD[estado]}`, frase, veredicto: VERD[estado], html, pintar, textos: [t1, t2, t3, t4, t5] };
}
const CSS = `
.inf2 .cp { margin-top: 18px; grid-column: 1 / -1; min-width: 0; }
.inf2 .cp-h { display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap; margin-bottom: 10px; }
.inf2 .cp-v { margin: 0; font: 300 clamp(26px, 3vw, 40px)/1 var(--num); letter-spacing: .04em; text-transform: uppercase; }
.inf2 .cp-v.go { color: #ff7a59; } .inf2 .cp-v.sostenible { color: #d5ff3f; }
.inf2 .cp-g { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; } @media (max-width: 900px) { .inf2 .cp-g { grid-template-columns: 1fr; } }
.inf2 .cp-c { padding: 16px 18px 14px; border-radius: 18px; min-width: 0; border-top: 2px solid rgba(125,107,255,.55); }
.inf2 .cp-c h4 { margin: 0; font: 300 26px/1.1 var(--num); letter-spacing: .06em; text-transform: uppercase; color: var(--ink); }
.inf2 .cp-s { font-size: 12.5px; color: var(--mut); margin: 4px 0 10px; }
.inf2 .cp-fig svg { display: block; max-width: 100%; height: auto; overflow: visible; } .inf2 .cp-fig text { font: 11px Geist, Inter, system-ui, sans-serif; fill: var(--mut); font-variant-numeric: tabular-nums; }
.inf2 .cp-ley { display: flex; flex-wrap: wrap; gap: 4px 14px; font-size: 11.5px; color: var(--ink2); margin: 6px 0 4px; } .inf2 .cp-ley span { display: inline-flex; align-items: center; gap: 6px; }
.inf2 .cp-ley i { width: 16px; height: 0; border-top: 2px solid; display: inline-block; } .inf2 .cp-ley i.d { border-top-style: dashed; }
.inf2 .cp-ol { list-style: none; margin: 12px 0 0; padding: 0; display: grid; gap: 9px; } .inf2 .cp-ol li { display: grid; gap: 2px; padding-top: 9px; border-top: 1px solid var(--line2); }
.inf2 .cp-ol b { font: 600 11px/1.2 Geist, Inter, system-ui, sans-serif; letter-spacing: .12em; text-transform: uppercase; color: var(--tone); } .inf2 .cp-ol span { font-size: 13.5px; line-height: 1.5; color: var(--ink2); }
.inf2 .cp-bs { display: grid; gap: 6px; margin-top: 4px; }
.inf2 .cp-b { display: grid; grid-template-columns: minmax(80px, 1fr) minmax(90px, 2fr) auto; gap: 8px; align-items: center; font-size: 12px; color: var(--ink2); }
.inf2 .cp-b i { position: relative; height: 8px; border-radius: 4px; background: var(--track); } .inf2 .cp-b i b { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 4px; }
.inf2 .cp-b i em { position: absolute; top: -3px; bottom: -3px; width: 2px; background: var(--s-lim, #f5c451); }`;

