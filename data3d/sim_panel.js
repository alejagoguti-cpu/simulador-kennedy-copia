import { FUENTES_PARES, ORG_KG_HAB_DIA } from './sim_fuentes.js';
/* ============ PANEL DE LAS SIMULACIONES 02–06 (mismo formato que la 01 de data3d/ab01_panel.js) ============
   docs/todas_las_simulaciones.md, «Implementación» (2026-11-26). Va en #su-der (acordeón de limpio.js), debajo de los deslizadores de sim_ui.js:
   · ALERTA arriba del todo (degradé URBIA), con el estrés de la simulación; no tapa la franja de eventos (#su-feed baja).
   · EN VIVO: lo que se mueve solo con las semanas (barra turquesa), con su número.
   · GAME OVER · LÍMITES: las reglas del modelo que mueve esta prueba (REGLAS de simulaciones12.js), con su valor de la semana y las semanas
     seguidas fuera del límite (n/4). Mismos límites con y sin propuesta.
   · ƒx FÓRMULAS con los valores de la semana.
   · GRÁFICAS (4 + con frente a sin), paleta URBIA, esta corrida y la otra mitad del par punteada.
   Datos: I de simulaciones12.js (I.reglasV, I.rachas, I.rachaSector son de solo lectura). Aquí no se calcula ningún dato del modelo.
   La 01 sigue con data3d/ab01_panel.js (sin cambios). conclusion_par.js usa LIM y PAR_LIM de aquí. */
const ICO_ALERTA = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 2.5 18.5 17h-17z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 8v4.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="10" cy="14.6" r="1.05" fill="currentColor"/></svg>';
const ICO_X = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
const ICO_FX = '<svg viewBox="0 0 22 16" aria-hidden="true"><path d="M7.6 2.2c-1.6-.3-2.6.5-2.9 2.1L3.1 13.2c-.3 1.4-1.1 1.9-2.3 1.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M2.6 6h4.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M11 6l7 7M18 6l-7 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
export const COL = { vio: '#7d6bff', vio2: '#304ffe', cor: '#f2694a', tur: '#4fd1c5', oro: '#f5c451', lim: '#c9f27a', ok: '#c9f27a', amb: '#f5c451', mal: '#f2694a' };
export const nf = (v, d = 0) => (v == null || !isFinite(v) ? '—' : (+v).toLocaleString('es-CO', { maximumFractionDigits: d, minimumFractionDigits: d }));
const año = (sem) => Math.min(15, Math.floor((Math.max(1, sem) - 1) / 52) + 1);

/* ---------- LÍMITES = reglas de game over de simulaciones12.js (REGLAS, MALO, CERCA). S = escala de la barra ---------- */
export const LIM = {
  abasto: { n: 'Comida en el sector peor', u: '% de su demanda', v: (I) => I.comidaMin * 100, lim: 80, min: true, cerca: 87, S: 100, f: (v) => nf(v, 1) + ' %', r: (I) => Math.max(I.rachaSector || 0, (I.rachas || {}).abasto || 0), txt: 'un sector recibe menos del 80 % de la comida que necesita' },
  trafico: { n: 'Tráfico', u: '100 % = hoy', v: (I) => I.trafico * 100, lim: 130, cerca: 120, S: 150, f: (v) => nf(v) + ' %', r: (I) => (I.rachas || {}).trafico || 0, txt: 'circulan 30 % más vehículos que hoy' },
  ruido: { n: 'Ruido de las calles', u: 'dB sobre hoy', v: (I) => I.ruidoDb - I.ruidoDb0, lim: 3, cerca: 2, S: 4, f: (v) => (v < 0 ? '−' : '+') + nf(Math.abs(v), 1) + ' dB', r: (I) => (I.rachas || {}).ruido || 0, txt: 'el ruido promedio sube 3 dB' },
  fauna: { n: 'Especies de fauna', u: '% de las del inicio', v: (I) => I.fauna / Math.max(1, I.fauna0) * 100, lim: 90, min: true, cerca: 94, S: 100, f: (v, I) => I ? `${I.fauna} de ${I.fauna0}` : nf(v) + ' %', r: (I) => (I.rachas || {}).fauna || 0, txt: 'quedan menos del 90 % de las especies' },
  habitat: { n: 'Territorio con fauna', u: '% del inicio', v: (I) => I.pares / Math.max(1, I.pares0) * 100, lim: 70, min: true, cerca: 80, S: 130, f: (v) => nf(v) + ' %', r: (I) => (I.rachas || {}).habitat || 0, txt: 'la ocupación de los corredores verdes cae 30 %' },
  humedal: { n: 'Humedales que funcionan', u: '% del área de hoy', v: (I) => I.humedalFuncional, lim: 70, min: true, cerca: 80, S: 110, f: (v) => nf(v) + ' %', r: (I) => (I.rachas || {}).humedal || 0, txt: 'los humedales pierden 30 % de su área funcional' },
  residuos: { n: 'Orgánicos en las Estaciones', u: '% del almacenamiento', v: (I) => I.residuos * 100, lim: 100, cerca: 85, S: 130, f: (v) => nf(v) + ' %', r: (I) => (I.rachas || {}).residuos || 0, txt: 'los orgánicos pendientes pasan el almacenamiento' } };
export const malo = (k, v) => (LIM[k].min ? v < LIM[k].lim : v >= LIM[k].lim);
const cercaDe = (k, v) => (LIM[k].min ? v < LIM[k].cerca : v >= LIM[k].cerca);
/* límites que mueve cada prueba (las 7 reglas siguen activas en todas: si cae otra, se agrega su fila) */
export const PAR_LIM = { 2: ['abasto', 'ruido', 'trafico', 'fauna'], 3: ['residuos', 'humedal', 'fauna'], 4: ['fauna', 'habitat', 'humedal'], 5: ['trafico', 'humedal', 'ruido'], 6: ['humedal', 'abasto', 'habitat'] };

/* ---------- lo propio de cada simulación ---------- */
const desvio = (I) => (I.cierre && I.cierre.fase ? I.cierre.traficoDesvio : 1);
const equip = (I) => (I.gobernanza ? I.gobernanza.barrios.reduce((a, b) => a + b.equipamientos, 0) : 0);
const conect = (I) => (I.verde && I.verde.resumen && I.verde.resumen.nParches ? I.verde.resumen.nConectados / I.verde.resumen.nParches * 100 : null);
export const PAR_CFG = {
  2: { titulo: 'Cierre de la Av. de las Américas',
    alerta(I, val) { const t0 = val.cierreT0, d = val.cierreDur, s = I ? I.sem : 0;
      if (s < t0) return ['Se cerrará la Av. de las Américas', 'en ' + nf(t0 - s) + ' sem'];
      if (s < t0 + d) return ['Se cerró la Av. de las Américas', '+' + nf((desvio(I) - 1) * 100) + ' % en la 1.º de Mayo'];
      return ['Vía reabierta', 'cerró ' + nf(d) + ' sem']; },
    vivo: [['Tráfico en la Av. Primero de Mayo', (I) => desvio(I) * 100, 200, (v) => nf(v) + ' %'], ['Bienestar de las aves', (I) => I.avesRuido ? I.avesRuido.bienestarFauna * 100 : null, 100, (v) => nf(v, 1) + ' %'], ['Animales muertos esta semana', (I) => I.muertes ? I.muertes.semana : null, 100, (v) => nf(v)]],
    graf: [{ t: '¿Cuánto tráfico se desvía?', s: [{ f: (I) => desvio(I) * 100, n: 'Primero de Mayo' }], fmt: (v) => nf(v) + ' %', sub: (I) => `100 % = tráfico normal. Hoy: ${nf(desvio(I) * 100)} %; el ruido allí sube ${nf(10 * Math.log10(desvio(I)), 1)} dB.` },
      { t: '¿Llega la comida?', s: [{ f: (I) => I.comidaMin * 100, n: 'sector peor' }], lim: 80, limTxt: 'game over < 80 %', fmt: (v) => nf(v) + ' %', sub: (I) => `Las rutas por la vía cerrada se alargan: el sector peor recibe ${nf(I.comidaMin * 100, 1)} % de lo que necesita.` },
      { t: '¿Cómo están las aves?', s: [{ f: (I) => I.avesRuido ? I.avesRuido.bienestarFauna * 100 : null, n: 'bienestar' }], fmt: (v) => nf(v, 1) + ' %', sub: (I) => `Bienestar de las aves frente al ruido (1 hasta 50 dB, 0 en 75 dB). Ruido promedio donde viven: ${nf(I.avesRuido && I.avesRuido.dbAves, 1)} dB.` },
      { t: '¿Cuántos animales mueren?', s: [{ f: (I) => I.muertes ? I.muertes.total : null, n: 'acumulados' }], fmt: (v) => nf(v), sub: (I) => `Choques, atropellos, ruido y hambre desde el año 1. Por ruido: ${nf(I.muertes && I.muertes.porCausa.ruido)}.` }],
    fx: [['Tráfico desviado', (I) => nf(desvio(I) * 100) + ' %', (I, v) => `1 + «desvío a la Primero de Mayo» ${nf(v.desvioMayo)} % × fase del cierre ${nf(I.cierre ? I.cierre.fase : 0, 2)}${I.propuesta ? ' × 2/3 (tercera ruta por Bavaria Común, supuesto)' : ''}`],
      ['Ruido extra en el desvío', (I) => '+' + nf(10 * Math.log10(desvio(I)), 1) + ' dB', () => '10 × log10(tráfico desviado)'],
      ['Bienestar de las aves', (I) => nf(I.avesRuido && I.avesRuido.bienestarFauna * 100, 1) + ' %', () => 'Σ aves × B(L) ÷ Σ aves · B = 1 hasta 50 dB y 0 en 75 dB (Shannon et al. 2016; 75 dB supuesto) · los corredores verdes a 600 m del desvío reciben su tráfico × tráfico desviado'],
      ['Comida en el sector peor', (I) => nf(I.comidaMin * 100, 1) + ' %', () => 'recibido ÷ necesidad del sector · las rutas que pasan por la vía cerrada se alargan (sim_vida.js) · game over bajo 80 % 4 semanas'],
      ['Animales muertos', (I) => nf(I.muertes && I.muertes.total), () => 'Σ choques con vidrio + atropellos + poblaciones locales perdidas por ruido o hambre']] },
  3: { titulo: 'Aumento de los residuos orgánicos',
    alerta(I, val) { const t0 = val.orgT0, s = I ? I.sem : 0; if (s < t0) return ['Subirán los residuos orgánicos', 'en ' + nf(t0 - s) + ' sem']; return ['Suben los residuos orgánicos', '+' + nf(((I.fOrg || 1) - 1) * 100) + ' %']; },
    vivo: [['Orgánicos por persona', (I) => (I.fOrg || 1) * 100, 200, (v) => nf(v) + ' %'], ['Orgánicos generados', (I) => I.evaluacion && I.evaluacion.territorio.organicos, 1500, (v) => nf(v) + ' t/día'], ['Basura sin recoger', (I) => I.basura ? I.basura.fraccionSinRecoger * 100 : null, 100, (v) => nf(v, 1) + ' %']],
    graf: [{ t: '¿Cuánto se trata?', s: [{ f: (I) => I.evaluacion && I.evaluacion.territorio.organicos, n: 'generados' }, { f: (I) => I.evaluacion && I.evaluacion.territorio.tratados, n: 'tratados', c: COL.tur }], fmt: (v) => nf(v), sub: (I) => `t/día. Sin propuesta todo va al relleno Doña Juana; con propuesta las Estaciones Circulares compostan ${nf(I.evaluacion && I.evaluacion.territorio.tratados)} t/día.` },
      { t: '¿Se llenan las Estaciones?', s: [{ f: (I) => I.residuos * 100, n: 'almacenamiento' }], lim: 100, limTxt: 'game over > 100 %', fmt: (v) => nf(v) + ' %', sub: (I) => I.propuesta ? `Orgánicos pendientes ÷ almacenamiento de las Estaciones Circulares: ${nf(I.residuos * 100)} %.` : 'Sin propuesta no hay Estaciones: no se llenan, todo va al relleno.' },
      { t: '¿Aguantan los humedales?', s: [{ f: (I) => I.humedalFuncional, n: 'funcionan' }], lim: 70, limTxt: 'game over < 70 %', fmt: (v) => nf(v) + ' %', sub: (I) => `Área sin rellenar × calidad frente a la basura de sus bordes: ${nf(I.humedalFuncional)} % de hoy.` },
      { t: '¿Cuánta basura queda en la calle?', s: [{ f: (I) => I.basura ? I.basura.fraccionSinRecoger * 100 : null, n: 'sin recoger' }], fmt: (v) => nf(v, 1) + ' %', sub: (I) => `Parte de la basura que nadie recoge y termina en calles y bordes de humedales.` }],
    fx: [['Orgánicos por persona', (I) => '×' + nf(I.fOrg || 1, 2), (I, v) => `1 + aumento ${nf(v.orgAumento)} % × mín(1, (semana − ${nf(v.orgT0)}) ÷ 52)`],
      ['Orgánicos generados', (I) => nf(I.evaluacion && I.evaluacion.territorio.organicos) + ' t/día', () => `población × ${nf(ORG_KG_HAB_DIA, 3)} kg/persona/día × factor de la prueba. Proxy: residuos domiciliarios y grandes generadores recogidos en Kennedy (UAESP, junio 2025) × 51,32 % orgánico de Bogotá (caracterización 2017) ÷ población del modelo.`],
      ['Orgánicos en las Estaciones', (I) => nf(I.residuos * 100) + ' %', (I, v) => `pendientes ÷ almacenamiento (3 días de contenedores + 2 semanas de planta) · capacidad ${nf(v['P2.cap'])} kg/semana por Estación · hogares que separan ${nf(v['P2.frac'] * 100)} % · game over > 100 % 4 semanas`],
      ['Humedales que funcionan', (I) => nf(I.humedalFuncional) + ' %', () => 'Σ área sin rellenar × calidad ÷ área de hoy · calidad = 1 ÷ (1 + k × basura acumulada en el borde) · game over < 70 % 4 semanas (Ramsar, Decreto 624 de 2007; 30 % supuesto)'],
      ['Basura sin recoger', (I) => nf(I.basura && I.basura.fraccionSinRecoger * 100, 1) + ' %', (I, v) => `1 − recolección ${nf(v.recoleccion)} % [SUP, no medida en Kennedy]; crece con el arrojo clandestino`]] },
  4: { titulo: 'Pérdida de un corredor verde',
    alerta(I, val) { const s = I ? I.sem : 0, F = I && I.fragmento, n = ['El Burro', 'Techo', 'La Vaca', 'Bosque de Bavaria'][Math.max(1, Math.min(4, Math.round(val.parche))) - 1];
      if (s < val.parcheT0) return ['Se perderá parte de ' + n, 'en ' + nf(val.parcheT0 - s) + ' sem']; return ['Se perdió parte de ' + n, '−' + nf(val.parchePerdida) + ' %' + (F ? ' · ' + nf(F.haPerdidas, 1) + ' ha' : '')]; },
    vivo: [['Especies de fauna', (I) => I.fauna / Math.max(1, I.fauna0) * 100, 100, (v) => nf(v) + ' %'], ['Corredores verdes conectados', conect, 100, (v) => nf(v) + ' %'], ['Territorio con fauna', (I) => I.pares / Math.max(1, I.pares0) * 100, 130, (v) => nf(v) + ' %']],
    graf: [{ t: '¿Cuántas especies quedan?', s: [{ f: (I) => I.fauna / Math.max(1, I.fauna0) * 100, n: 'especies' }], lim: 90, limTxt: 'game over < 90 %', fmt: (v) => nf(v) + ' %', sub: (I) => `${I.fauna} de las ${I.fauna0} especies de fauna del inicio.` },
      { t: '¿Cuánto territorio ocupa la fauna?', s: [{ f: (I) => I.pares / Math.max(1, I.pares0) * 100, n: 'ocupación' }], lim: 70, limTxt: 'game over < 70 %', fmt: (v) => nf(v) + ' %', sub: (I) => `Pares especie × corredor verde ocupados frente al inicio: ${nf(I.pares)} de ${nf(I.pares0)}.` },
      { t: '¿Están conectados los corredores verdes?', s: [{ f: conect, n: 'conectados' }], fmt: (v) => nf(v) + ' %', sub: (I) => `Corredores verdes del componente más grande con conexiones sanas: ${nf(conect(I))} %.` },
      { t: '¿Aguantan los humedales?', s: [{ f: (I) => I.humedalFuncional, n: 'funcionan' }], lim: 70, limTxt: 'game over < 70 %', fmt: (v) => nf(v) + ' %', sub: (I) => `Área sin rellenar × calidad frente a la basura: ${nf(I.humedalFuncional)} % de hoy.` }],
    fx: [['Calidad del corredor verde perdido', (I, v) => nf(Math.sqrt(Math.max(0, 1 - v.parchePerdida / 100)) * 100) + ' %', (I, v) => `√(1 − ${nf(v.parchePerdida)} %) desde la semana ${nf(v.parcheT0)} (dependencia con el área de sim_vida.js)`],
      ['Especies de fauna', (I) => `${I.fauna} de ${I.fauna0}`, () => 'especies presentes ÷ las del inicio · game over < 90 % 4 semanas (Steffen et al. 2015; aplicado a las 23 especies: supuesto)'],
      ['Territorio con fauna', (I) => nf(I.pares / Math.max(1, I.pares0) * 100) + ' %', () => 'pares especie × corredor verde ocupados ÷ los del inicio (metapoblación de Levins) · game over ≤ 70 % 4 semanas'],
      ['Corredores verdes conectados', (I) => nf(conect(I)) + ' %', () => 'corredores verdes del componente más grande con conexiones f ≥ 0,5 ÷ corredores verdes'],
      ['Árboles en parques', (I) => nf(I.arboles, 2), (I, v) => `deslizador ${nf(v['P3.arboles'], 2)}${I.propuesta ? ' + 0,2 en 5 años (conexiones vegetales de la propuesta, supuesto)' : ' con tala neta del estado actual'}`]] },
  5: { titulo: 'Presión inmobiliaria',
    alerta(I) { return ['Sube el precio del suelo', '+' + nf(I ? (I.especulacion.indice - 1) * 100 : 0, 1) + ' %']; },
    vivo: [['Precio del suelo', (I) => (I.especulacion.indice - 1) * 100, 60, (v) => '+' + nf(v, 1) + ' %'], ['Hogares en riesgo', (I) => I.especulacion.hogaresRiesgo, 60000, (v) => nf(v)], ['Tráfico', (I) => I.trafico * 100, 150, (v) => nf(v) + ' %']],
    graf: [{ t: '¿Cuánto sube el suelo?', s: [{ f: (I) => (I.especulacion.indice - 1) * 100, n: 'alza' }], fmt: (v) => '+' + nf(v, 1) + ' %', sub: (I) => `Alza promedio junto al metro y al predio de Bavaria: ×${nf(I.especulacion.indice, 2)}.` },
      { t: '¿Cuántos hogares están en riesgo?', s: [{ f: (I) => I.especulacion.hogaresRiesgo, n: 'hogares' }], fmt: (v) => nf(v), sub: (I) => `Hogares arrendatarios que no podrían pagar el alza: ${nf(I.especulacion.hogaresRiesgo)}.` },
      { t: '¿Cuánto tráfico hay?', s: [{ f: (I) => I.trafico * 100, n: 'tráfico' }], lim: 130, limTxt: 'game over > 130 %', fmt: (v) => nf(v) + ' %', sub: (I) => `Más gente, más carros: ${nf(I.trafico * 100)} % del tráfico de hoy.` },
      { t: '¿Aguantan los humedales?', s: [{ f: (I) => I.humedalFuncional, n: 'funcionan' }], lim: 70, limTxt: 'game over < 70 %', fmt: (v) => nf(v) + ' %', sub: (I) => `La población que crece deja más basura en sus bordes: ${nf(I.humedalFuncional)} % de hoy.` }],
    fx: [['Precio del suelo', (I) => '×' + nf(I.especulacion.indice, 3), (I, v) => `1 + (13 % × metro + 25 % × plan parcial + ${nf(v.presionSuelo, 1)} %/año × años) × (1 − 0,5 × protección ${nf(I.especulacion.proteccion * 100)} %)`],
      ['Hogares en riesgo', (I) => nf(I.especulacion.hogaresRiesgo), () => 'Σ hogares × 55,1 % en arriendo (Encuesta Multipropósito 2025, Bogotá urbana: proxy para Kennedy) × mín(1, alza) × (1 − protección). La relación entre alza y riesgo es supuesta.'],
      ['Tráfico', (I) => nf(I.trafico * 100) + ' %', (I, v) => `carros ${nf(v.trafCrece, 1)} %/año × población (${nf(v.pobCrece, 1)} %/año) · metro −10 % junto al corredor · game over ≥ 130 % 4 semanas (meta del Plan de Movilidad 2023: 1 ÷ 0,77)`],
      ['Humedales que funcionan', (I) => nf(I.humedalFuncional) + ' %', () => 'área sin rellenar × calidad frente a la basura del borde · game over < 70 % 4 semanas']] },
  6: { titulo: 'Recursos insuficientes',
    alerta(I, val) { const G = I && I.gobernanza; return ['Los recursos no alcanzan', G ? 'cubren ' + nf(G.coberturaMedia * 100) + ' %' : nf(val.presupuesto) + ' % de lo que se pide']; },
    vivo: [['Necesidad cubierta', (I) => I.gobernanza ? I.gobernanza.coberturaMedia * 100 : null, 100, (v) => nf(v) + ' %'], ['Equidad del reparto', (I) => I.gobernanza ? I.gobernanza.equidad * 100 : null, 100, (v) => nf(v) + ' %'], ['Equipamientos abiertos', equip, 200, (v) => nf(v)]],
    graf: [{ t: '¿Alcanzan los recursos?', s: [{ f: (I) => I.gobernanza ? I.gobernanza.coberturaMedia * 100 : null, n: 'cubierto' }], fmt: (v) => nf(v) + ' %', sub: (I) => `Parte de la necesidad de los 8 sectores que se atiende en cada ronda.` },
      { t: '¿Se reparte con equidad?', s: [{ f: (I) => I.gobernanza ? I.gobernanza.equidad * 100 : null, n: 'equidad' }], fmt: (v) => nf(v) + ' %', sub: (I) => `1 − Gini de la cobertura de los sectores (100 % = todos igual).` },
      { t: '¿Cuántos equipamientos se abren?', s: [{ f: equip, n: 'equipamientos' }], fmt: (v) => nf(v), sub: (I) => `Huertas, Estaciones Circulares, parques y salones que habilitan los recursos acumulados.` },
      { t: '¿Aguantan los humedales?', s: [{ f: (I) => I.humedalFuncional, n: 'funcionan' }], lim: 70, limTxt: 'game over < 70 %', fmt: (v) => nf(v) + ' %', sub: (I) => `Área sin rellenar × calidad frente a la basura: ${nf(I.humedalFuncional)} % de hoy.` }],
    fx: [['Recursos de cada ronda', (I, v) => nf(v.presupuesto) + ' %', (I, v) => `presupuesto × necesidad total, cada ${nf(v.decisionCada)} semanas`],
      ['Reparto', (I) => I.propuesta ? 'asambleas' : 'central', (I, v) => I.propuesta ? `cada asamblea reporta su necesidad actual; calidad × (1 − 0,3 × rotación ${nf(v['P1.rotacion'])} ÷ 52); piso 40 % de lo proporcional a la población (supuestos)` : 'mitad por población, mitad por la necesidad de hace 26 semanas (supuesto)'],
      ['Necesidad cubierta', (I) => nf(I.gobernanza && I.gobernanza.coberturaMedia * 100) + ' %', () => 'Σ mín(1, asignado ÷ necesidad) × población ÷ población'],
      ['Equidad', (I) => nf(I.gobernanza && I.gobernanza.equidad * 100) + ' %', () => '1 − Gini de la cobertura de los sectores, ponderado por población'],
      ['Equipamientos', (I) => nf(equip(I)), () => 'uno cada 40 unidades acumuladas en un sector; cada uno baja 5 % su necesidad (supuesto)']] } };

/* ---------- estilos (mismo vidrio y paleta que la 01) ---------- */
const CSS = `
#sp-fuentes{margin:10px 0;padding:9px 11px;border:1px solid rgba(79,209,197,.3);border-radius:10px;font:12px/1.45 var(--ui-sans,Inter,system-ui,sans-serif)}
#sp-fuentes summary{cursor:pointer;font-weight:700;color:#4fd1c5}
#sp-fuentes ul{margin:9px 0;padding-left:18px}#sp-fuentes li{margin:5px 0}#sp-fuentes a{color:inherit;text-decoration:underline}#sp-fuentes small{display:block;opacity:.72}#sp-fuentes p{margin:8px 0 0;opacity:.8}
#sp-alerta{position:fixed;top:8px;left:50%;transform:translateX(-50%);z-index:46;display:flex;gap:9px;align-items:center;max-width:calc(100vw - 32px);white-space:nowrap;padding:6px 6px 6px 12px;border-radius:12px;
  background:linear-gradient(100deg,#304ffe 0%,#3d8fe6 55%,#4fd1c5 100%);border:1px solid rgba(255,255,255,.28);box-shadow:0 6px 22px rgba(20,40,110,.35);text-shadow:0 1px 2px rgba(10,20,60,.45);color:#fff;overflow:hidden;font:400 11.5px/1.35 var(--ui-sans,Inter,system-ui,sans-serif)}
#sp-alerta[hidden]{display:none}#sp-alerta>svg{width:16px;height:16px;flex:none;animation:spIco 1.1s ease-in-out infinite}
#sp-alerta span{font:500 12px var(--ui-sans,Inter,sans-serif);overflow:hidden;text-overflow:ellipsis}
#sp-alerta b{font:600 10px/1 var(--ui-mono,'JetBrains Mono',monospace);letter-spacing:.14em;text-transform:uppercase;color:rgba(255,255,255,.85)}
#sp-alerta strong{font:600 17px/1 'Barlow Condensed',var(--ui-sans,Inter),sans-serif}
#sp-alerta button{all:unset;cursor:pointer;width:22px;height:22px;display:grid;place-items:center;border-radius:6px} #sp-alerta button:hover{background:rgba(255,255,255,.18)} #sp-alerta button svg{width:12px;height:12px}
#sp-alerta.go{background:linear-gradient(100deg,#7d1f3a 0%,#c63a3a 55%,#f2694a 100%);padding-right:12px} #sp-alerta .go4{font:400 10.5px var(--ui-sans,Inter,sans-serif);opacity:.85}
@media (max-width:760px){#sp-alerta{top:6px;max-width:calc(100vw - 16px)}#sp-alerta span{max-width:38vw}}
@keyframes spIco{0%,100%{opacity:1}50%{opacity:.55}} @media(prefers-reduced-motion:reduce){#sp-alerta>svg{animation:none}}
#sp-vivo,#sp-go,#sp-graf{margin:8px 0 6px;padding:8px 10px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
#sp-vivo h6,#sp-go h6,#sp-graf h6{margin:0 0 6px;font:600 10px/1.2 var(--ui-mono,'JetBrains Mono',monospace);letter-spacing:.12em;text-transform:uppercase;color:var(--ui-tx2,#c9cfc4)}
#sp-vivo .r,#sp-go .r{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:3px 8px;align-items:center;font:400 10.5px/1.25 var(--ui-sans,Inter,sans-serif);color:var(--ui-tx2,#c9cfc4);padding:3px 0}
#sp-vivo .r i,#sp-go .r i{grid-column:1 / -1;position:relative;display:block;height:6px;border-radius:3px;background:rgba(255,255,255,.1)}
#sp-vivo .r i u,#sp-go .r i u{position:absolute;left:0;top:0;bottom:0;border-radius:3px;background:${COL.ok}} #sp-vivo .r i u{background:${COL.tur}}
#sp-go .r i s{position:absolute;top:-3px;bottom:-3px;width:2px;background:${COL.mal}}
#sp-vivo .r b,#sp-go .r b{font:600 13px/1 'Barlow Condensed',var(--ui-sans,Inter),sans-serif;color:#fff;white-space:nowrap} #sp-go .r b em{font-style:normal;font:500 9.5px var(--ui-sans,Inter,sans-serif);opacity:.65;margin-left:3px}
#sp-vivo .r{position:relative;padding-left:9px} #sp-vivo .r::before{content:"";position:absolute;left:0;top:4px;bottom:2px;width:2px;border-radius:2px;background:${COL.tur};opacity:.8}
#sp-go .r.mal b{color:#ff9b85} #sp-go .r.mal span{color:#ffb8a8}
#sp-go .r.go{outline:1.5px solid ${COL.mal};outline-offset:2px;border-radius:4px;animation:spGo 1s ease-in-out infinite}#sp-go .r.go span{color:#ff9b85;font-weight:600}
@keyframes spGo{0%,100%{background:rgba(242,105,74,.22)}50%{background:rgba(242,105,74,.04)}}
#sp-fx{all:unset;box-sizing:border-box;cursor:pointer;display:inline-flex;align-items:center;gap:6px;margin:8px 0 2px;padding:5px 10px;border-radius:9px;border:1px solid rgba(125,107,255,.55);background:rgba(125,107,255,.14);font:600 11px/1 var(--ui-sans,Inter,sans-serif);color:#e8e5ff}
#sp-fx svg{width:18px;height:13px} #sp-fx:hover{background:rgba(125,107,255,.26)} #sp-fx:focus-visible{outline:2px solid ${COL.vio};outline-offset:2px} @media (pointer:coarse){#sp-fx{padding:9px 12px}}
#sp-fxp{position:fixed;z-index:60;left:50%;top:50%;transform:translate(-50%,-50%);width:min(560px,calc(100vw - 32px));max-height:min(80dvh,720px);overflow:auto;padding:16px 18px 14px;border-radius:16px;
  background:rgba(14,16,30,.86);backdrop-filter:blur(18px) saturate(1.2);-webkit-backdrop-filter:blur(18px) saturate(1.2);border:1px solid rgba(169,156,255,.28);box-shadow:0 18px 50px rgba(0,0,0,.5);color:#eef0ff;font:400 12px/1.45 var(--ui-sans,Inter,sans-serif)}
#sp-fxp[hidden]{display:none} #sp-fxp h3{margin:0 0 2px;font:500 20px/1.1 'Barlow Condensed',var(--ui-sans,Inter),sans-serif;letter-spacing:.04em;text-transform:uppercase}
#sp-fxp>p{margin:0 0 10px;color:rgba(238,240,255,.65);font-size:11px} #sp-fxp .x{all:unset;cursor:pointer;position:absolute;top:10px;right:10px;width:28px;height:28px;display:grid;place-items:center;border-radius:8px} #sp-fxp .x:hover{background:rgba(255,255,255,.1)} #sp-fxp .x svg{width:13px;height:13px}
#sp-fxp h4{margin:12px 0 4px;font:600 10px/1.2 var(--ui-mono,'JetBrains Mono',monospace);letter-spacing:.12em;text-transform:uppercase;color:${COL.tur}}
#sp-fxp dl{margin:0;display:grid;gap:6px} #sp-fxp dl>div{padding:7px 10px;border-radius:10px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06)}
#sp-fxp dt{font:600 11.5px/1.3 var(--ui-sans,Inter,sans-serif);display:flex;justify-content:space-between;gap:8px} #sp-fxp dt b{font:600 15px/1 'Barlow Condensed',var(--ui-sans,Inter),sans-serif;color:${COL.lim};white-space:nowrap}
#sp-fxp dd{margin:2px 0 0;font:400 11px/1.45 var(--ui-mono,'JetBrains Mono',monospace);color:rgba(238,240,255,.72)}
#sp-graf .tabs{display:flex;gap:3px;margin:0 0 6px} #sp-graf .tabs button{all:unset;box-sizing:border-box;cursor:pointer;flex:1;text-align:center;padding:4px 0;border-radius:7px;border:1px solid rgba(255,255,255,.12);font:600 11px/1 'Barlow Condensed',var(--ui-sans,Inter),sans-serif;color:var(--ui-tx2,#c9cfc4)}
#sp-graf .tabs button[aria-selected="true"]{background:rgba(125,107,255,.22);border-color:rgba(125,107,255,.7);color:#fff} #sp-graf .tabs button:focus-visible{outline:2px solid ${COL.vio};outline-offset:1px} @media (pointer:coarse){#sp-graf .tabs button{padding:8px 0}}
#sp-graf h5{margin:0 0 1px;font:600 12.5px/1.25 var(--ui-sans,Inter,sans-serif);color:#f4f3ff} #sp-graf p{margin:0 0 4px;font:400 10px/1.35 var(--ui-sans,Inter,sans-serif);color:var(--ui-tx3,#bcc4b5)}
#sp-graf svg{display:block;width:100%;height:auto;overflow:visible}
#sp-graf svg text{font:500 8px var(--ui-sans,Inter,sans-serif);fill:rgba(238,240,255,.55);font-variant-numeric:tabular-nums} #sp-graf svg text.v{font:600 10.5px 'Barlow Condensed',var(--ui-sans,Inter),sans-serif;fill:#fff}
#sp-graf ul{list-style:none;margin:5px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:2px 10px}
#su-der #sp-graf li{display:inline-flex;gap:5px;align-items:center;font:400 10px/1.3 var(--ui-sans,Inter,sans-serif);color:var(--ui-tx2,#c9cfc4);background:none;border:0;padding:0;min-height:0} #su-der #sp-graf li::before{display:none}
#su-der #sp-graf li i{display:block;width:14px;height:0;border-top:2px solid} #su-der #sp-graf li i.d{border-top-style:dashed} #su-der #sp-graf li i.b{height:8px;border:0;border-radius:2px}`;

/* ---------- alerta arriba ---------- */
function alertaArriba() { let a = document.getElementById('sp-alerta');
  if (!a) { a = document.createElement('div'); a.id = 'sp-alerta'; a.setAttribute('role', 'status'); a.title = 'Prueba de estrés de esta simulación';
    a.innerHTML = `${ICO_ALERTA}<b>Alerta</b><span data-sp="t"></span><strong data-sp="v"></strong><button type="button" aria-label="Cerrar la alerta">${ICO_X}</button>`; document.body.appendChild(a);
    a.querySelector('button').onclick = () => { a.hidden = true; feedBajo(); }; }
  feedBajo(); return a; }
function feedBajo() { const f = document.getElementById('su-feed'), a = document.getElementById('sp-alerta'), e = document.getElementById('lp-esc'), on = !!(a && !a.hidden);
  if (!a) return;
  if (on) { const r = e && e.getClientRects().length ? e.getBoundingClientRect() : null, top = r && r.bottom > 0 && r.bottom < 140 ? Math.round(r.bottom + 6) : 8, left = r ? Math.round(r.left + r.width / 2) : null;
    if (a.style.top !== top + 'px') a.style.top = top + 'px'; const L = left != null && innerWidth > 760 ? left + 'px' : '50%'; if (a.style.left !== L) a.style.left = L; }
  if (f) { const t = on ? Math.round(a.getBoundingClientRect().bottom + 8) + 'px' : ''; if (f.style.top !== t) f.style.top = t; } }
addEventListener('resize', () => feedBajo());
let GO = null, PAR = null, VAL = {}, VISTA = 0;
export function quitar() { const a = document.getElementById('sp-alerta'); if (a) { a.remove(); const f = document.getElementById('su-feed'); if (f && !document.getElementById('ab-alerta')) f.style.top = ''; }
  const p = document.getElementById('sp-fxp'); if (p) p.remove(); GO = null; PAR = null; }
const GO_N = { abasto: 'Abastecimiento', trafico: 'Tráfico', ruido: 'Ruido', fauna: 'Fauna', habitat: 'Hábitat', humedal: 'Humedales', residuos: 'Residuos' };
export function gameOver(g) { GO = g || null; const a = alertaArriba(); a.hidden = false; a.classList.toggle('go', !!GO);
  if (GO) { const L = LIM[GO.regla], v = GO.valor != null ? (GO.regla === 'trafico' ? GO.valor * 100 : GO.valor) : null;
    a.innerHTML = `${ICO_ALERTA}<b>Game over · año ${año(GO.sem)}</b><span>${GO_N[GO.regla] || GO.regla}${GO.lugar && GO.lugar !== 'Kennedy' ? ' · ' + GO.lugar : ''}</span><strong>${L && v != null ? L.f(v) : ''}</strong><span class="go4">4 semanas seguidas</span>`; }
  feedBajo(); const der = document.getElementById('su-der'); if (der) marcarGo(der); }
function marcarGo(der) { der.querySelectorAll('#sp-go .r').forEach(e => e.classList.toggle('go', !!GO && e.dataset.go === GO.regla));
  const h = der.querySelector('#sp-go h6'); if (h) h.textContent = GO ? `Game over: ${GO_N[GO.regla] || GO.regla}` : 'Game over · límites'; }

/* ---------- HTML y montaje ---------- */
const filaLim = (k) => { const L = LIM[k]; return `<div class="r" data-go="${k}" title="Game over si ${L.txt} 4 semanas seguidas"><span>${L.n}</span><b>—</b><i><u></u><s style="left:${(L.lim / L.S * 100).toFixed(1)}%"></s></i></div>`; };
export function htmlAbajo(def) { const C = PAR_CFG[def && def.par]; if (!C) return '';
  return `<div id="sp-vivo"><h6>En vivo · se mueve solo</h6>${C.vivo.map(([n], i) => `<div class="r" data-vi="${i}"><span>${n}</span><b>—</b><i><u></u></i></div>`).join('')}</div>
    <details id="sp-fuentes"><summary>Datos de partida · fuentes</summary><ul>${(FUENTES_PARES[def.par] || []).map(F => `<li><a href="${F.url}" target="_blank" rel="noopener noreferrer">${F.n}: ${F.v}</a><small>${F.alcance}</small></li>`).join('')}</ul><p>Los cambios de la prueba, las tasas sin medición y los límites de game over son supuestos del modelo.</p></details>
    <button type="button" id="sp-fx" aria-haspopup="dialog" title="Cómo se calcula cada variable y cada gráfica">${ICO_FX}<span>Fórmulas</span></button>
    <div id="sp-go" aria-live="polite"><h6 title="4 semanas seguidas pasando un límite = game over. Mismos límites con y sin propuesta.">Game over · límites</h6>${PAR_LIM[def.par].map(filaLim).join('')}</div>
    <div id="sp-graf"><h6>Gráficas</h6><div class="tabs" role="tablist">${[...C.graf, { t: '¿Qué cambia con la propuesta?' }].map((g, i) => `<button type="button" role="tab" data-g="${i}" aria-selected="${i === VISTA}" title="${g.t}">${i + 1}</button>`).join('')}</div>
      <h5 data-sp="gt"></h5><p data-sp="gs"></p><svg viewBox="0 0 260 132" role="img" aria-label="Gráfica de la simulación"></svg><ul data-sp="gl"></ul></div>`; }
export function montar(der, { def, R } = {}) {
  if (!document.getElementById('sp-css')) { const st = document.createElement('style'); st.id = 'sp-css'; st.textContent = CSS; document.head.appendChild(st); }
  if (PAR !== def.par) VISTA = 0; PAR = def.par; VAL = R ? R.valores : {}; GO = null; alertaArriba().classList.remove('go');
  der.querySelectorAll('#sp-graf [data-g]').forEach(b => { b.setAttribute('aria-selected', +b.dataset.g === VISTA); b.onclick = () => { VISTA = +b.dataset.g; der.querySelectorAll('#sp-graf [data-g]').forEach(x => x.setAttribute('aria-selected', x === b)); if (der._spRepinta) der._spRepinta(); }; });
  const fx = der.querySelector('#sp-fx'); if (fx) fx.onclick = () => abrirFx(der);
}
/* ---------- fórmulas ---------- */
function abrirFx(der) { let p = document.getElementById('sp-fxp');
  if (!p) { p = document.createElement('div'); p.id = 'sp-fxp'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Fórmulas de la simulación'); document.body.appendChild(p); }
  p.hidden = false; der._spFx = true; pintarFx(der); const x = p.querySelector('.x'); if (x) x.focus(); }
function cerrarFx() { const p = document.getElementById('sp-fxp'); if (p) p.hidden = true; const d = document.getElementById('su-der'); if (d) { d._spFx = false; const b = d.querySelector('#sp-fx'); if (b) b.focus(); } }
addEventListener('keydown', (e) => { if (e.key === 'Escape') { const p = document.getElementById('sp-fxp'); if (p && !p.hidden) cerrarFx(); } });
function pintarFx(der) { const p = document.getElementById('sp-fxp'); if (!p || p.hidden) return;
  const H = der._spH || [], I = H[H.length - 1], C = PAR_CFG[PAR]; if (!C) return;
  const f = (n, v, t) => `<div><dt>${n}<b>${v}</b></dt><dd>${t}</dd></div>`;
  let h = `<button type="button" class="x" aria-label="Cerrar las fórmulas">${ICO_X}</button><h3>Fórmulas · ${C.titulo}</h3><p>${I ? `Semana ${nf(I.sem)} (año ${año(I.sem)}), ${I.propuesta ? 'con' : 'sin'} propuesta.` : 'Dale play: los valores aparecen semana a semana.'} Fuentes y supuestos: docs/todas_las_simulaciones.md.</p>`;
  if (I) { h += `<h4>Variables</h4><dl>${C.fx.map(([n, v, t]) => { let a = '—', b = ''; try { a = v(I, VAL); b = t(I, VAL); } catch (e) { /* dato que falta */ } return f(n, a, b); }).join('')}</dl>`;
    h += `<h4>Límites · game over</h4><dl>${PAR_LIM[PAR].map(k => { const L = LIM[k]; return f(L.n, L.f(L.v(I), k === 'fauna' ? I : null), `game over si ${L.txt} 4 semanas seguidas · límite ${L.f(L.lim)}`); }).join('')}</dl>`;
    h += `<h4>Gráficas</h4><dl>${C.graf.map((g, i) => f(`${i + 1} · ${g.t}`, '', g.sub(I))).join('')}${f(`${C.graf.length + 1} · Con frente a sin`, '', 'los mismos límites en la misma semana de las dos corridas (mismos valores de las variables)')}</dl>`; }
  if (p._h !== h) { p.innerHTML = h; p._h = h; p.querySelector('.x').onclick = cerrarFx; } }

/* ---------- repintar (sim_ui.js, como mucho 4 veces por segundo) ---------- */
export function actualizar(der, H, FIN = 780, B = null, def = {}) {
  const C = PAR_CFG[def.par], g = der && der.querySelector('#sp-graf svg'); if (!C || !g) return;
  der._spRepinta = () => actualizar(der, H, FIN, B, def); der._spH = H; PAR = def.par;
  const I = H && H.length ? H[H.length - 1] : null, prop = !!def.propuesta;
  if (GO && (!H || H.length < GO.sem)) { GO = null; const a = document.getElementById('sp-alerta'); if (a) a.remove(); }
  const a = alertaArriba(); if (!GO) { const [t, v] = C.alerta(I, VAL); const pt = a.querySelector('[data-sp="t"]'), pv = a.querySelector('[data-sp="v"]'); if (pt && pt.textContent !== t) pt.textContent = t; if (pv && pv.textContent !== v) pv.textContent = v; } feedBajo();
  // en vivo
  C.vivo.forEach(([n, f, mx, fmt], i) => { const e = der.querySelector(`#sp-vivo [data-vi="${i}"]`); if (!e) return; let v = null; try { v = I ? f(I) : null; } catch (x) { v = null; }
    const b = e.querySelector('b'), t = v == null ? '—' : fmt(v); if (b.textContent !== t) b.textContent = t; e.querySelector('u').style.width = (v == null ? 0 : Math.max(0, Math.min(100, v / mx * 100))).toFixed(1) + '%'; });
  // límites (y la regla de un game over que no esté en la lista)
  const ks = PAR_LIM[def.par].slice(); if (GO && LIM[GO.regla] && !ks.includes(GO.regla)) { ks.push(GO.regla); if (!der.querySelector(`#sp-go [data-go="${GO.regla}"]`)) der.querySelector('#sp-go').insertAdjacentHTML('beforeend', filaLim(GO.regla)); }
  for (const k of ks) { const e = der.querySelector(`#sp-go [data-go="${k}"]`); if (!e) continue; const L = LIM[k];
    const v = I ? L.v(I) : null, m = v != null && malo(k, v), c = v != null && cercaDe(k, v), r = GO && GO.regla === k ? 4 : I ? Math.min(4, L.r(I)) : 0;
    e.classList.toggle('mal', !!m); const u = e.querySelector('u'); u.style.width = (v == null ? 0 : Math.max(0, Math.min(100, v / L.S * 100))).toFixed(1) + '%'; u.style.background = m ? COL.mal : c ? COL.amb : COL.ok;
    const b = e.querySelector('b'), h = v == null ? '—' : `${L.f(v, k === 'fauna' ? I : null)}${r ? `<em>${r}/4 sem</em>` : ''}`; if (b.innerHTML !== h) b.innerHTML = h; }
  marcarGo(der);
  if (der._spFx) pintarFx(der);
  // gráfica
  const put = (k, s) => { const e = der.querySelector(`#sp-graf [data-sp="${k}"]`); if (e && e.innerHTML !== s) e.innerHTML = s; };
  const G = C.graf[VISTA]; put('gt', `${VISTA + 1} · ${G ? G.t : '¿Qué cambia con la propuesta?'}`);
  if (!I) { g.innerHTML = '<text x="130" y="66" text-anchor="middle">Dale play: la gráfica se arma semana a semana</text>'; put('gs', ''); put('gl', ''); return; }
  const r = G ? lineas(H, FIN, B, prop, I, G) : cmp(H, B, I, def.par);
  g.innerHTML = r.svg; put('gs', r.sub); put('gl', r.ley.map(([c, n, cl]) => `<li><i class="${cl || ''}" style="${cl === 'b' ? 'background' : 'border-color'}:${c}"></i>${n}</li>`).join(''));
}
/* ---------- gráficas (viewBox 260 × 132), mismas reglas que la 01: una pregunta, valor rotulado al final ---------- */
const W = 260, HH = 132, PL = 30, PR = 52, PT = 8, PB = 16, IW = W - PL - PR, IH = HH - PT - PB;
const muestra = (H) => { const r = [], p = Math.max(1, Math.floor(H.length / 160)); for (let i = 0; i < H.length; i += p) r.push(H[i]); if (r[r.length - 1] !== H[H.length - 1]) r.push(H[H.length - 1]); return r; };
const ejeX = (x) => { let s = ''; for (const a of [1, 5, 10, 15]) s += `<text x="${x((a - 1) * 52 + 1).toFixed(1)}" y="${HH - 3}" text-anchor="middle">año ${a}</text>`; return s; };
const val = (f, h) => { try { const v = f(h); return v != null && isFinite(v) ? v : null; } catch (e) { return null; } };
function serie(M, f, x, y) { let d = '', n = 0; for (const h of M) { const v = val(f, h); if (v == null) { n = 0; continue; } d += (n++ ? 'L' : 'M') + x(h.sem).toFixed(1) + ' ' + y(v).toFixed(1); } return d; }
function rotulos(items) { items.sort((a, b) => a.y - b.y); for (let i = 1; i < items.length; i++) if (items[i].y - items[i - 1].y < 23) items[i].y = items[i - 1].y + 23;
  return items.map(o => `<circle cx="${o.x.toFixed(1)}" cy="${o.y0.toFixed(1)}" r="2.6" fill="${o.c}"/><text class="v" x="${(W - PR + 5).toFixed(1)}" y="${(o.y + 1).toFixed(1)}" style="fill:${o.c}">${o.v}</text><text x="${(W - PR + 5).toFixed(1)}" y="${(o.y + 9).toFixed(1)}">${o.n}</text>`).join(''); }
function lineas(H, FIN, B, prop, I, G) {
  const M = muestra(H), MB = B && B.length ? muestra(B.slice(0, Math.min(B.length, I.sem))) : null, x = (s) => PL + (s - 1) / (FIN - 1) * IW;
  const cA = prop ? COL.vio : COL.cor, cB = prop ? COL.cor : COL.vio, S = G.s.map((q, i) => ({ ...q, c: q.c || (i ? COL.tur : cA) }));
  const vs = []; for (const q of S) for (const h of M) { const v = val(q.f, h); if (v != null) vs.push(v); } if (MB) for (const h of MB) { const v = val(S[0].f, h); if (v != null) vs.push(v); } if (G.lim != null) vs.push(G.lim);
  let mn = Math.min(...vs), mx = Math.max(...vs); const pad = Math.max(1e-6, (mx - mn) * 0.15) || 1; mn = Math.max(0, mn - pad); mx = mx + pad; if (mx - mn < 1e-6) mx = mn + 1;
  const y = (v) => PT + IH - (v - mn) / (mx - mn) * IH; let svg = '';
  for (let i = 0; i <= 3; i++) { const v = mn + (mx - mn) * i / 3; svg += `<line x1="${PL}" x2="${W - PR}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}" stroke="rgba(255,255,255,.07)"/><text x="${PL - 3}" y="${(y(v) + 3).toFixed(1)}" text-anchor="end">${G.fmt(v).replace(/ %$/, '')}</text>`; }
  svg += ejeX(x);
  if (G.lim != null) svg += `<line x1="${PL}" x2="${W - PR}" y1="${y(G.lim).toFixed(1)}" y2="${y(G.lim).toFixed(1)}" stroke="${COL.oro}" stroke-width="1.5" stroke-dasharray="5 3"/><text x="${PL + 3}" y="${(y(G.lim) - 3).toFixed(1)}" style="fill:${COL.oro}">${G.limTxt}</text>`;
  if (MB) svg += `<path d="${serie(MB, S[0].f, x, y)}" fill="none" stroke="${cB}" stroke-width="1.4" stroke-dasharray="3 3" stroke-opacity=".8"/>`;
  const d0 = serie(M, S[0].f, x, y), x1 = x(I.sem); if (d0) svg += `<path d="${d0}L${x1.toFixed(1)} ${PT + IH}L${x(M[0].sem).toFixed(1)} ${PT + IH}Z" fill="${S[0].c}" fill-opacity=".14"/>`;
  S.forEach((q, i) => { svg += `<path d="${serie(M, q.f, x, y)}" fill="none" stroke="${q.c}" stroke-width="${i ? 2 : 2.4}" stroke-linecap="round"/>`; });
  const rot = S.map(q => { const v = val(q.f, I); return v == null ? null : { x: x1, y0: y(v), y: y(v), c: q.c, v: G.fmt(v), n: q.n }; }).filter(Boolean);
  const vb = MB && MB.length ? val(S[0].f, MB[MB.length - 1]) : null; if (vb != null) rot.push({ x: x1, y0: y(vb), y: y(vb), c: cB, v: G.fmt(vb), n: prop ? 'sin propuesta' : 'con propuesta' });
  svg += rotulos(rot);
  const ley = [[S[0].c, (prop ? 'Con propuesta' : 'Sin propuesta') + (S.length > 1 ? ' · ' + S[0].n : '')], ...S.slice(1).map(q => [q.c, q.n]), ...(MB ? [[cB, prop ? 'Sin propuesta' : 'Con propuesta', 'd']] : []), ...(G.lim != null ? [[COL.oro, 'Límite', 'd']] : [])];
  return { svg, sub: G.sub(I), ley }; }
/* con frente a sin: cada límite del par en la misma semana, en la escala de su barra */
function cmp(H, B, I, par) { const sem = I.sem, Bh = B && B.length ? B[Math.min(B.length, sem) - 1] : null, prop = !!I.propuesta, S = prop ? Bh : I, C = prop ? I : Bh;
  const ks = PAR_LIM[par], fila = Math.min(42, (HH - 6) / ks.length), x0 = 4, x1 = W - 60, xs = (k, v) => x0 + Math.max(0, Math.min(1.05, v / LIM[k].S)) / 1.05 * (x1 - x0); let svg = '';
  ks.forEach((k, i) => { const L = LIM[k], y0 = 2 + i * fila, vs = S ? L.v(S) : null, vc = C ? L.v(C) : null;
    svg += `<text x="${x0}" y="${(y0 + 7).toFixed(1)}" style="fill:#eef0ff">${L.n}</text><line x1="${xs(k, L.lim).toFixed(1)}" x2="${xs(k, L.lim).toFixed(1)}" y1="${(y0 + 9).toFixed(1)}" y2="${(y0 + fila - 4).toFixed(1)}" stroke="${COL.oro}" stroke-dasharray="2 2"/>`;
    const bh = Math.max(5, (fila - 14) / 2 - 1);
    [[vs, COL.cor, 'sin'], [vc, COL.vio, 'con']].forEach(([v, c, n], j) => { const yy = y0 + 10 + j * (bh + 2); if (v == null) { svg += `<text x="${x0}" y="${(yy + bh - 1).toFixed(1)}" style="opacity:.5">${n}: calculando…</text>`; return; }
      svg += `<rect x="${x0}" y="${yy.toFixed(1)}" width="${Math.max(1, xs(k, v) - x0).toFixed(1)}" height="${bh.toFixed(1)}" rx="2.5" fill="${c}"/><text class="v" x="${(Math.min(xs(k, v), x1) + 4).toFixed(1)}" y="${(yy + bh - 0.5).toFixed(1)}" style="font-size:9.5px;fill:${c}">${L.f(v)} · ${n}</text>`; }); });
  return { svg, sub: `Semana ${nf(sem)} de las dos corridas, mismos valores. Raya dorada = límite.`, ley: [[COL.cor, 'Sin propuesta', 'b'], [COL.vio, 'Con propuesta', 'b']] }; }

