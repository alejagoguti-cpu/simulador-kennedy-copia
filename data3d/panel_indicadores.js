/* ============ TABLERO DE INDICADORES (columna derecha, aside#lp-tablero) ============
   Caja con tres vistas: «Indicadores» (los tres macromodelos de la tabla de la autora, docs/indicadores_macromodelos.md) · «Estrategias» (las 9 de la
   propuesta) · «Variables» (los deslizadores de sim_ui.js, #su-der, que limpio.js mueve aquí).
   Datos: R.hist (corrida actual, un I por semana) y R.ecoBase (la otra mitad del par, misma semilla). Los valores salen de indicadores_macro.js
   (funciones puras, verificadas en node). Rendimiento: solo se dibujan las tarjetas visibles (IntersectionObserver) de la vista abierta, una vez
   por semana simulada como mucho cada 300 ms, en tiempo ocioso y por partes; las gráficas reutilizan sus nodos SVG.
   Paleta (2026-11-25, colores URBIA + morados de la portada, validada en graficas_arte.js): con propuesta #7d6bff continua o llena / sin propuesta #f2694a
   punteada o hueca; límites #ffd27a rotulados.
   2026-11-26 (comentario de la autora: «los diagramas no se entienden»): cada tarjeta responde UNA pregunta (QA), dice en grande si el indicador
   sube o baja desde el año 1 y si eso mejora o empeora (flecha + palabra + color, nunca color solo), y cuánto más/menos tiene la propuesta.
   2026-11-26 v5 («siguen asquerosos», «el panel tapa casi todo»): panel más angosto y plegable (pestaña a la derecha, se recuerda). Todas las
   tarjetas con la misma estructura: título · pregunta · cifra grande + chip (▲/▼ mejora/empeora vs año 1) · con | sin | diferencia ·
   UNA gráfica (Tendencia de 15 años, graficas_vivas.js). El diagrama de cuerdas de las interacciones no cambia. */
import { esc, num, año, tip, Tendencia } from './graficas_vivas.js?v=4';
import { ARTE, llave, contar, ponerTip } from './graficas_arte.js?v=3';
import { crearFichas } from './fichas_obras.js?v=2';
import { T, IND, INDK, MACROS, CLAVE, valor, clavePct, claveArea, acceso, ACCESO_SUP, ACCESO_R, hayEstaciones, SEM_REF } from './indicadores_macro.js?v=2';
import { FUENTES_PARES } from './sim_fuentes.js';
import { iniciarIndicadoresEscena } from './indicadores_escena.js?v=1';

const PASO = 2; // series de 15 años muestreadas cada 2 semanas
const ICO_FX = '<svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><path d="M8.6 4.2c-1.4 0-2 .9-2.3 2.4L5 15.1c-.3 1.4-.9 2-2 2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M4.2 8.4h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="m11.4 9 5 6.4M16.4 9l-5 6.4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
const ICO_PLEG = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICO_ABRIR = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2.5 13.5h11M4.5 11V7.5M8 11V3.5M11.5 11V6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
const PLEG_K = 'ken.tablero.plegado';
const ICO_MAPA_NO ='<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M1.5 3.5 5.5 2l5 1.5 4-1.5v10.5l-4 1.5-5-1.5-4 1.5z M5.5 2v10.5M10.5 3.5V14" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>';

/* ---------- ESTRATEGIAS (nombres y colores de estrategias.json / estrategias.js; qué hacen en el modelo: simulaciones12.js) ---------- */
const ESTR = [
  { id: 'E1', n: 'Bavaria Común', c: '#ef4444', hace: 'En el predio de Bavaria, en lugar del plan parcial: acopio de alimentos, formación de promotores y pasajes. Sin las torres del plan no hay fachadas de vidrio nuevas ni la tala de su bosque, y el suelo queda protegido.', ind: ['presion', 'verde', 'conect'] },
  { id: 'E2', n: 'Tiendas Barriales', c: '#38bdf8', hace: '460 tiendas, fruterías, panaderías y carnicerías existentes (OSM). En el modelo semanal no tienen parámetro propio: reparten lo que llega a la red local.', ind: ['cobertura'] },
  { id: 'E3', n: 'Corabastos reducido', c: '#fb923c', hace: 'Desmonte de bodegas por fases: cada borde liberado junto a La Vaca se restaura y madura en 3 años (corredores verdes «liberados»). A Corabastos se le pide menos porque la red de mercados toma parte de la carga.', ind: ['verde', 'conect', 'cobertura'] },
  { id: 'E4', n: 'Orgánicos y hongos', c: '#a78bfa', hace: 'Estaciones Circulares y distrito biotecnológico: los orgánicos separados se tratan como compost y sustrato que vuelve a las huertas en vez de ir a Doña Juana.', ind: ['aprov', 'saturacion'] },
  { id: 'E5', n: 'Corredor biótico', c: '#34d399', hace: 'Une El Burro, La Vaca y Techo: más árboles en los parques (+0,2 de densidad en 5 años), pasos de fauna con cerramiento en las vías principales (−54 % de atropellos al cruzar, años 2–5) y calles verdes pacificadas (30 % de las calles, −3 dB, años 2–8).', ind: ['conect', 'atrop', 'ruido', 'bienestar', 'shannon', 'clave', 'inter'] },
  { id: 'E6', n: 'Vivienda y actividad', c: '#e879f9', hace: '379 negocios en vivienda (OSM). En el modelo cuenta dentro de los instrumentos de gestión del suelo que frenan parte del alza de arriendos.', ind: ['presion'] },
  { id: 'E7', n: 'Plazas y conjuntos', c: '#facc15', hace: 'Plazas de mercado y conjuntos: los 35 mercados de barrio de la propuesta abren por fases (uno cada pocas semanas) y acercan la compra a pie.', ind: ['acceso', 'cobertura', 'autonomia'] },
  { id: 'E8', n: 'Red distribuida de producción alimentaria', c: '#84cc16', hace: 'Huertas en lotes baldíos, cubiertas y viviendas: módulos de huerta que se vuelven hábitat (corredores verdes nuevos) y producen comida local.', ind: ['autonomia', 'verde', 'clave', 'inter', 'conect'] },
  { id: 'E9', n: 'Manzanas del Cuidado', c: '#fb7185', hace: 'Jardines, salones comunales y centros de cuidado: asambleas que reparten recursos por necesidad y calles de la manzana pacificadas (parte del 30 % de calles verdes).', ind: ['ruido', 'bienestar'] }
];

/* ---------- FÓRMULAS (MathML) ---------- */
const mi = (x) => `<mi>${x}</mi>`, mn = (x) => `<mn>${x}</mn>`, mo = (x) => `<mo>${x}</mo>`;
const frac = (a, b) => `<mfrac><mrow>${a}</mrow><mrow>${b}</mrow></mfrac>`, sub = (a, b) => `<msub>${a}${b}</msub>`, sup = (a, b) => `<msup>${a}${b}</msup>`;
const mtxt = (t) => `<mtext>${t}</mtext>`, math = (x) => `<math display="block"><mrow>${x}</mrow></math>`;
const sum = `<munder><mo>∑</mo><mi>i</mi></munder>`;
const F = {
  shannon: { f: math(`${mi("H'")}${mo('=')}${mo('−')}${sum}${sub(mi('p'), mi('i'))}${mo('⁢')}${mi('ln')}${mo('⁡')}${sub(mi('p'), mi('i'))}${mo(',')}${mspace()}${sub(mi('p'), mi('i'))}${mo('=')}${frac(sub(mi('A'), mi('i')), `${sum}${sub(mi('A'), mi('i'))}`)}`),
    t: [['H′', 'diversidad de Shannon (nats)'], ['pᵢ', 'proporción de la especie i'], ['Aᵢ', 'hectáreas de hábitat que ocupa la especie i (proxy de sus individuos)']],
    como: 'De la ocupación especie × corredor verde de la red trófica (23 especies de fauna × 71 corredores verdes): para cada especie se suman las hectáreas de los corredores verdes donde está. El modelo no cuenta individuos; con igual densidad por especie, los individuos son proporcionales al área ocupada (simulaciones12.js, biodiversidad.shannonArea).',
    fuente: 'Índice de Shannon (NIST, Dictionary of Algorithms and Data Structures). Cambio de fórmula documentado: antes pᵢ = corredores verdes ocupados, que iguala una cubierta de 0,1 ha con un humedal de 18 ha.' },
  clave: { f: math(`${mi('E')}${mo('=')}${frac(sub(mi('N'), mtxt('actual')), sub(mi('N'), mtxt('inicial')))}${mo('×')}${mn(100)}`),
    t: [['N actual', 'hectáreas ocupadas por la especie esta semana'], ['N inicial', `las del fin del año 1 (semana ${SEM_REF}), cuando el modelo ya se asentó`]],
    como: 'Una por grupo: abeja de miel, colibrí chillón y tingua moteada, con el área de los corredores verdes que ocupan (biodiversidad.areaEsp). El valor grande es el promedio de los tres.',
    fuente: 'Variación porcentual, adaptación del proyecto.' },
  inter: { f: math(`${mi('I')}${mo('=')}${sum}${sub(mi('interacciones'), mi('i'))}`),
    t: [['I', 'interacciones locales de la red biótica que ocurren esta semana'], ['interacciones', 'enlaces de la red (visita floral, depredación, dispersión…) cuyos dos extremos están en el mismo corredor verde o a su alcance de dispersión']],
    como: 'Modelo semanal: territorio.red (simulaciones12.js, interLocal). El diagrama de cuerdas muestra en vivo los encuentros que ocurren en el 3D ahora (biotica.js): quién interactúa con quién y de qué tipo.',
    fuente: 'Conteo de eventos, definición operativa del proyecto.' },
  verde: { f: math(`${sub(mi('A'), mi('v'))}${mo('=')}${sub(mi('A'), mn(1))}${mo('+')}${sub(mi('A'), mn(2))}${mo('+')}${mo('⋯')}${mo('+')}${sub(mi('A'), mi('n'))}`),
    t: [['A_v', 'área verde total'], ['Aᵢ', 'superficie de cada zona verde: parques, humedales, bosque, módulos de huerta, bordes liberados y huertas de los hogares']],
    como: 'territorio.verde = Σ π·r² de los corredores verdes (ind(s).verde) + las huertas de los hogares (50 m² cada una). 1 ha = 10.000 m².',
    fuente: 'Cálculo geométrico de superficies.' },
  conect: { f: math(`${mi('C')}${mo('=')}${frac(mtxt('corredores verdes conectados'), mtxt('corredores verdes totales'))}${mo('×')}${mn(100)}`),
    t: [['corredores verdes conectados', 'los del componente más grande de la red con enlaces de supervivencia ≥ 0,5 (no rotos por las vías)'], ['corredores verdes totales', 'todos los corredores verdes con área']],
    como: 'ind(s).verde.resumen: nConectados / nParches. Un enlace vale la supervivencia al cruzar las vías entre los dos corredores verdes × la calidad del menor × su madurez. Los pasos de fauna (E5) suben esa supervivencia.',
    fuente: 'Indicador simplificado propio, inspirado en métricas de conectividad del paisaje (Saura y Pascual-Hortal 2007, Landscape and Urban Planning 83: 91–103).' },
  atrop: { f: math(`${mi('A')}${mo('=')}${sum}${sub(mi('atropellamientos'), mi('i'))}`),
    t: [['A', 'animales atropellados acumulados desde el año 1']],
    como: 'Cada corredor verde ocupado por fauna terrestre emite un dispersante por semana; muere al cruzar con probabilidad 1 − e^(−c·Q), Q = vehículos/día de las vías que corta (Hels y Buchwald 2001). Cada vez que la suma llega a 1 se registra un atropello (ind(s).atropellos).',
    fuente: 'Conteo de eventos del simulador. Pasos de fauna: Rytwinski et al. 2016, PLoS ONE 11: e0166941 (−54 %).' },
  ruido: { f: math(`${sub(mi('L'), mtxt('Aeq'))}${mo('=')}${mn(10)}${mo('⁢')}${sub(mi('log'), mn(10))}${mo('⁡')}<mrow>${mo('(')}${frac(`${sum}${sup(mn(10), `<mrow>${sub(mi('L'), mi('i'))}${mo('/')}${mn(10)}</mrow>`)}`, mi('n'))}${mo(')')}</mrow>`),
    t: [['Lᵢ', 'nivel en dB(A) de cada celda de vía de 16 m'], ['n', 'número de celdas']],
    como: 'Promedio ENERGÉTICO de las mismas celdas del mapa de ruido (simulaciones12.js, ruidoLAeq): cada grupo de celdas se corre 10·log10(tráfico) dB y −3 dB en las calles pacificadas. Antes el tablero usaba el promedio aritmético (ruidoDb), que subestima las vías fuertes.',
    fuente: 'Nivel sonoro equivalente, FHWA e ISO 1996-1.' },
  bienestar: { f: math(`${mi('B')}${mo('=')}${frac(`${sum}${sub(mi('a'), mi('p'))}${mo('⁢')}${mi('b')}<mrow>${mo('(')}${sub(mi('L'), mi('p'))}${mo(')')}</mrow>`, `${sum}${sub(mi('a'), mi('p'))}`)}${mo('×')}${mn(100)}`) + math(`<mi>b</mi><mrow>${mo('(')}${mi('L')}${mo(')')}</mrow>${mo('=')}${mi('clip')}<mrow>${mo('(')}${mn(1)}${mo('−')}${frac(`${mi('L')}${mo('−')}${mn(50)}`, mn(25))}${mo(')')}</mrow>`),
    t: [['aₚ', 'aves presentes en el corredor verde p (especie × corredor verde)'], ['Lₚ', 'ruido en el corredor verde p (dB(A)), el de su vía principal más cercana'], ['b(L)', '1 hasta 50 dB(A), baja en línea recta y llega a 0 en 75 dB(A)']],
    como: 'ind(s).avesRuido.bienestarFauna: pondera por la exposición real (cuántas aves hay en cada corredor verde y cuánto ruido le llega). El modelo solo tiene efecto del ruido en las aves (no en abejas ni anfibios).',
    fuente: 'Shannon et al. 2016, «A synthesis of two decades of research documenting the effects of noise on wildlife», Biological Reviews 91: 982–1005: efectos desde ~40 dB(A), 20 % de los estudios bajo 50 dB(A). 75 dB(A) como pérdida total: supuesto (borde de vía principal; Reijnen et al. 1996).' },
  saturacion: { f: math(`${mi('S')}${mo('=')}${frac(mtxt('kg acumulados'), mtxt('capacidad máxima (kg)'))}${mo('×')}${mn(100)}`),
    t: [['kg acumulados', 'orgánicos pendientes de tratar en las Estaciones Circulares'], ['capacidad máxima', 'almacenamiento de las estaciones']],
    como: 'territorio.saturacion = pendientes / capacidadAlmacen; por estación: territorio.estaciones (par 03). Sin propuesta no hay Estaciones Circulares: lo recogido va al relleno Doña Juana y el indicador no aplica.',
    fuente: 'Porcentaje de ocupación de capacidad, adaptado al proyecto.' },
  aprov: { f: math(`${mi('R')}${mo('=')}${frac(mtxt('kg aprovechados'), mtxt('kg generados'))}${mo('×')}${mn(100)}`),
    t: [['kg aprovechados', 'orgánicos tratados en Estaciones Circulares (compost y sustrato)'], ['kg generados', 'orgánicos que produce Kennedy en la misma semana']],
    como: 'territorio.aprovechamiento = tratados / generados (sim_vida.js: o.desv / o.gen).',
    fuente: 'Tasa de desvío o aprovechamiento, metodología de la EPA (Facts and Figures about Materials, Waste and Recycling).' },
  llega: { f: math(`${mi('L')}${mo('=')}${frac(`${sub(mi('F'), mtxt('recibidos'))}${mo('+')}${sub(mi('O'), mtxt('otros'))}`, `${sub(mi('F'), mtxt('demandados'))}${mo('+')}${sub(mi('O'), mtxt('otros'))}`)}${mo('×')}${mn(100)}`),
    t: [['F', 'alimentos frescos que recibe / necesita Kennedy (0,65 kg/hab/día; Corabastos, mercados y autoconsumo)'], ['O', 'el resto de la comida y los otros canales: 1.100 − 702 t/día hoy, crece igual que los frescos; se supone que llega lo que se pide'], ['1.100 t/día', '1.080.742 hab × 1,02 kg/hab/día: toda la comida que llega hoy a Kennedy']],
    como: 'simulaciones12.js, rcPaso: comidaK.dem y comidaK.llega en todas las corridas. SIMULACIÓN 01 (v3): demanda = población × 0,951 kg/hab/día × consumo (984 t/día con 1.034.838 hab), sin «otros canales» (O = 0); recibido = autoconsumo + mercados + huertas hidropónicas + lo que despacha Corabastos. Corabastos lleva un inventario semanal: inventario final = inicial + ingresos (6.460 t/día) − despachos − pérdidas; si lo pedido por Kennedy y la región pasa lo disponible, todos reciben la misma fracción y baja lo que llega.',
    fuente: 'RAPE 2020 (1,02 kg/hab/día) y SED 2024 (1.080.742 hab.); DANE-SIPSA 2025 (frescos). No existe una medición oficial de toneladas que entran a la localidad: es demanda estimada (docs/fuentes_bodegas_residuos.md, §2).' },
  resK: { f: math(`${mi('R')}${mo('=')}${mn('922')}${mo('×')}${sup(mn('1,027'), mi('t'))}${mo('+')}${mn('0,19')}${mo('×')}<mrow>${mo('(')}${mi('C')}${mo('−')}${mn('1.100')}${mo(')')}</mrow>`) + math(`${mtxt('sin recoger')}${mo('=')}${mi('máx')}<mrow>${mo('(')}${mn(0)}${mo(',')}${mi('R')}${mo('−')}${mn('774')}${mo('−')}${mi('T')}${mo(')')}</mrow>`),
    t: [['R', 'residuos que genera Kennedy (t/día)'], ['t', 'años desde el inicio; 2,7 %/año (UAESP 2024–2026)'], ['C', 'comida que llega a Kennedy (t/día): más comida, más residuos. En la simulación 01 la referencia es la demanda de hoy, 984 t/día, en vez de 1.100'], ['0,19', 'parte de cada tonelada extra de comida que se desperdicia (UNEP 2024)'], ['774', 'recolección ordinaria fija (t/día)'], ['T', 'orgánicos que tratan las Estaciones Circulares (con propuesta)']],
    como: 'simulaciones12.js, rcPaso: residuosK.gen y residuosK.noRec. Lo que no se recoge va a puntos críticos (hoy 148 t/día). Game over de la simulación 01 (el mismo con y sin propuesta): 296 t/día sin recoger cuatro semanas seguidas; se ve en el panel izquierdo (Game over · Residuos), en la capa Residuos y en el informe. Con eso se degrada La Vaca: árboles e interacciones × (1 − 0,5·D). Con propuesta (simulación 01): 20 Estaciones Circulares de 20 t/día, una en cada sitio de mercado de la propuesta, que abren una cada 36 semanas desde el año 2 (400 t/día en el año 15); T no pasa del 51,3 % orgánico de R.',
    fuente: 'UAESP 2026 (6.769 t/día en Bogotá, 1.089 en puntos críticos), repartido por población: 922 t/día en Kennedy (derivado). UNEP Food Waste Index 2024. Umbral 2× los puntos críticos de hoy: criterio de diseño [supuesto]. Capacidad por estación: hasta 20 t/día, Centros Integrados de Recuperación de Recursos descentralizados (UNESCAP y Waste Concern; el primero trataba 3 t/día). Calendario y separación en la fuente suficiente: supuestos.' },
  cobertura: { f: math(`${mi('C')}${mo('=')}${mi('mín')}<mrow>${mo('(')}${mn(100)}${mo(',')}${frac(mtxt('kg recibidos'), mtxt('kg demandados'))}${mo('×')}${mn(100)}${mo(')')}</mrow>`),
    t: [['kg recibidos', 'alimentos que llegan a cada sector (Corabastos, mercados, huertas)'], ['kg demandados', 'lo que necesita su población']],
    como: 'Por sector: territorio.sectores[].valor (134 sectores de 500 m); Kennedy: territorio.cobertura, con tope de 100 %.',
    fuente: 'Porcentaje de satisfacción de demanda, adaptado al proyecto.' },
  autonomia: { f: math(`${mi('Au')}${mo('=')}${frac(mtxt('kg locales consumidos'), mtxt('kg demandados'))}${mo('×')}${mn(100)}`),
    t: [['kg locales', 'comida de las huertas de Kennedy que se consume en Kennedy'], ['kg demandados', 'demanda total de alimentos frescos']],
    como: 'territorio.autonomia (sim_vida.js: o.localConsumido / o.need).',
    fuente: 'Adaptación del concepto de autosuficiencia alimentaria de la FAO.' },
  acceso: { f: math(`${mi('Ac')}${mo('=')}${frac(mtxt('habitantes a ≤ 15 min de un mercado'), mtxt('habitantes totales'))}${mo('×')}${mn(100)}`),
    t: [['15 min', `a pie a 4,5 km/h = 1.125 m por la red; en línea recta 1.125 / 1,3 (circuidad) ≈ ${num(ACCESO_R)} m`], ['mercados', 'Corabastos, la Plaza Distrital de Kennedy y los mercados de barrio de la propuesta que ya abrieron'], ['habitantes', 'peso de cada sector = su demanda de alimentos (∝ población); Kennedy 1.080.742 hab.']],
    como: 'Nuevo en el tablero (indicadores_macro.js, acceso): distancia de cada sector al mercado abierto más cercano. Con propuesta los mercados abren por fases y el indicador sube.',
    fuente: 'Indicador de cobertura poblacional, adaptado al proyecto. Circuidad: Levinson y El-Geneidy 2009, Regional Science and Urban Economics 39: 732–738.' },
  presion: { f: math(`${mi('P')}${mo('=')}${frac(`${sub(mi('P'), mi('f'))}${mo('−')}${sub(mi('P'), mi('i'))}`, sub(mi('P'), mi('i')))}${mo('×')}${mn(100)}`),
    t: [['Pᵢ', 'índice de precio del suelo en la semana 1 (1 = hoy)'], ['P_f', 'índice de precio esta semana']],
    como: 'especulacion.indice (promedio de las zonas; sube junto al metro y a Bavaria, lo frena la protección del suelo de la propuesta).',
    fuente: 'Variación porcentual, no un índice específico de especulación.' }
};
function mspace() { return '<mspace width="0.8em"></mspace>'; }
/* mecanismos de la propuesta que mueven cada indicador (para el «Ver fórmula») */
const PROPM = {
  shannon: 'E5 + E8: los corredores y las huertas suman hábitat; las especies de humedal conservan su área y las generalistas no dominan tanto el área total.',
  clave: 'E8 huertas (flores para abejas y colibríes) y E5 corredor biótico (humedales conectados para la tingua).',
  inter: 'E8 y E5: más corredores verdes con flores y fauna, y conectados, son más relaciones locales.',
  verde: 'E8 módulos de huerta, E3 bordes liberados de Corabastos y E1 sin tala del bosque de Bavaria.',
  conect: 'E5: pasos de fauna (años 2–5) y conexiones vegetales; E8: módulos nuevos que sirven de escalones.',
  atrop: 'E5 pasos de fauna con cerramiento: −54 % de mortalidad al cruzar las vías principales, construidos de la semana 52 a la 260.',
  ruido: 'E5 + E9 calles verdes y pacificadas: 30 % de las calles con −3 dB, construidas de la semana 52 a la 416.',
  bienestar: 'E5 + E9 calles verdes y pacificadas (−3 dB en el 30 % de las calles, años 2–8); E3 menos camiones hacia Corabastos.',
  saturacion: 'E4: capacidad de tratamiento y almacenamiento de las Estaciones Circulares.',
  aprov: 'E4: las Estaciones Circulares tratan lo que se separa en la fuente.',
  cobertura: 'E7 mercados de barrio y E8 huertas reparten la demanda; Corabastos deja de ser el único camino.',
  llega: 'E7 mercados de barrio y E8 huertas: parte de la comida ya no pasa por las bodegas de Corabastos, que se llenan más despacio.',
  resK: 'E4: 20 Estaciones Circulares de barrio de 20 t/día (una cada 36 semanas desde el año 2) tratan orgánicos que ya no ocupan la recolección ordinaria; así lo sin recoger se queda cerca de los 148 t/día de hoy aunque la generación siga la tendencia de la ciudad.',
  autonomia: 'E8 red distribuida de producción alimentaria.',
  acceso: 'E7: 35 mercados de barrio que abren por fases cerca de los sectores peor servidos.',
  presion: 'E1 Bavaria Común y E6: suelo protegido e instrumentos de gestión del suelo.'
};

/* ---------- LA PREGUNTA de cada tarjeta (subtítulo en lenguaje llano) y qué mide exactamente ---------- */
const QA = {
  inter: { q: '¿Cuántas relaciones entre especies ocurren?', e: 'Polinizar, comer, dispersar semillas… entre especies que comparten corredor verde. Más relaciones = ecosistema más vivo.' },
  shannon: { q: '¿Qué tan variada y equilibrada es la fauna?', e: 'Junta cuántas especies de fauna hay y qué tan parejo se reparten el hábitat. Más alto = más especies y mejor repartidas; 0 = una sola especie.' },
  clave: { q: '¿Abejas, colibríes y tinguas ganan o pierden hábitat?', e: 'Hectáreas que ocupa cada especie frente al fin del año 1 (= 100 %). La cifra grande es el promedio de las tres.' },
  verde: { q: '¿Cuántas hectáreas verdes tiene Kennedy?', e: 'Parques, humedales, bosque, módulos de huerta, bordes liberados y huertas de los hogares.' },
  conect: { q: '¿Qué parte de las zonas verdes forma una sola red para la fauna?', e: '% de corredores verdes unidos al grupo conectado más grande, sin vías que corten el paso.' },
  atrop: { q: '¿Cuántos animales mueren atropellados?', e: 'La cifra grande es el total desde el año 1; las columnas, cuántos murieron cada año.' },
  ruido: { q: '¿Cuánto ruido hay en las vías?', e: 'Nivel promedio en dB(A). Las bandas dicen qué le hace ese ruido a la fauna.' },
  bienestar: { q: '¿Qué tan a salvo del ruido están las aves?', e: '100 % = todas viven bajo 50 dB(A); 0 % = todas sobre 75 dB(A). Pesa más el corredor verde con más aves.' },
  saturacion: { q: '¿Qué tan llenas están las Estaciones Circulares?', e: 'Orgánicos acumulados sin tratar frente a lo que caben. Sobre 85 % = alerta.' },
  aprov: { q: '¿Qué parte de los orgánicos se vuelve compost?', e: 'Del total de orgánicos que genera Kennedy cada día: cuánto se aprovecha, cuánto va al relleno y cuánto queda sin recoger.' },
  llega: { q: '¿Llega toda la comida que Kennedy necesita?', e: 'Toda la comida de Kennedy (≈1.100 t/día hoy): la que llega frente a la demanda, que sube cada año.' },
  resK: { q: '¿Cuántos residuos genera Kennedy y cuánto falta para el game over?', e: 'Toneladas al día. Lo que pasa de 774 t/día no se recoge y va a puntos críticos; en 1.070 t/día (296 sin recoger) es game over en la simulación 01.' },
  cobertura: { q: '¿Qué parte de la comida que necesita Kennedy le llega?', e: 'Kg de alimentos recibidos frente a kg necesitados, con tope de 100 %.' },
  autonomia: { q: '¿Qué parte de la comida fresca se cultiva en Kennedy?', e: 'Comida de huertas de Kennedy consumida en Kennedy frente a toda la demanda.' },
  acceso: { q: '¿Cuántos habitantes tienen un mercado a 15 min a pie?', e: '15 min a pie ≈ 865 m en línea recta. Cuenta Corabastos, la Plaza de Kennedy y los mercados de barrio abiertos.' },
  presion: { q: '¿Cuánto ha subido el precio del suelo?', e: 'Cambio del índice de precio desde la semana 1. Subir = más riesgo de desplazar hogares.' }
};
const UD = { 'anim.': 'animales' };

const CSS = `
#lp-tablero.pi-montado{padding:0!important}
.pi{--pi-pad:12px;--tb-sur:#1b1f24;--tb-grid:rgba(255,255,255,.06);--tb-axis:rgba(255,255,255,.16);--pi-v:#7d6bff;--pi-v2:#a99cff;--pi-v3:#d4ceff;--pi-ink:#f4f3ef;--pi-ok:var(--ui-acc,#c9f27a);--pi-mal:#ff8f9c;--pi-num:'Barlow Condensed','Arial Narrow',system-ui,sans-serif;font:400 12px/1.45 var(--ui-sans,'Inter',system-ui,sans-serif);color:var(--ui-tx,#f1f3ee);font-variant-numeric:tabular-nums;text-shadow:none;min-width:0}
.pi *{box-sizing:border-box}
.pi-hd{position:sticky;top:0;z-index:4;padding:10px var(--pi-pad) 0;background:linear-gradient(180deg,rgba(28,32,36,.9),rgba(24,28,32,.84));border-bottom:1px solid rgba(255,255,255,.12);-webkit-backdrop-filter:blur(24px) saturate(1.8);backdrop-filter:blur(24px) saturate(1.8)}
.pi-l1{display:flex;align-items:center;gap:8px}
.pi-tit{font:500 14px/1 var(--ui-tit,'Barlow Condensed',sans-serif);letter-spacing:.16em;text-transform:uppercase}
.pi-sem{margin-left:auto;font:400 10px/1.2 var(--ui-mono,'JetBrains Mono',monospace);color:var(--ui-tx2,#c9cfc4);white-space:nowrap}
.pi-sem b{font-weight:500;color:var(--pi-ink)}
.pi-pleg{all:unset;box-sizing:border-box;flex:none;display:grid;place-items:center;width:28px;height:28px;border-radius:8px;border:1px solid rgba(255,255,255,.14);color:var(--ui-tx2,#c9cfc4);cursor:pointer}
.pi-pleg:hover{color:var(--pi-ink);border-color:var(--ui-bd2,rgba(201,242,122,.4))}
.pi-pleg:focus-visible{outline:2px solid var(--ui-acc,#c9f27a);outline-offset:2px}
@media(max-width:1099px){.pi-pleg{display:none}}
.pi-esc{margin:3px 0 0;font-size:10.5px;color:var(--ui-tx2,#c9cfc4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pi-esc b{font-weight:600;color:var(--pi-ink)}
.pi-go{margin:6px 0 0;padding:5px 8px;border-radius:8px;border:1px solid rgba(255,143,156,.5);background:rgba(255,143,156,.1);font-size:10.5px;line-height:1.35}
.pi-tabs{display:flex;margin:8px calc(-1 * var(--pi-pad)) 0;padding:0 var(--pi-pad);border-top:1px solid rgba(255,255,255,.07)}
.pi-tab{all:unset;box-sizing:border-box;position:relative;flex:1;text-align:center;padding:9px 4px 8px;cursor:pointer;font:500 12px/1 var(--ui-tit,'Barlow Condensed',sans-serif);letter-spacing:.14em;text-transform:uppercase;color:var(--ui-tx3,#a5ae9f)}
.pi-tab:hover,.pi-tab[aria-selected=true]{color:var(--pi-ink)}
.pi-tab[aria-selected=true]::after{content:'';position:absolute;left:18%;right:18%;bottom:0;height:2px;border-radius:2px;background:var(--ui-acc,#c9f27a)}
.pi-tab:focus-visible{outline:1px solid var(--pi-v2);outline-offset:-3px;border-radius:6px}
.pi-nav{display:flex;flex-wrap:wrap;gap:4px;margin:0 calc(-1 * var(--pi-pad));padding:7px var(--pi-pad);overflow-x:auto;scrollbar-width:none;border-top:1px solid rgba(255,255,255,.06)}
.pi-nav[hidden]{display:none}
.pi-nav button{all:unset;box-sizing:border-box;flex:1 0 auto;display:inline-flex;justify-content:center;align-items:baseline;gap:5px;padding:5px 9px;border-radius:99px;border:1px solid rgba(255,255,255,.12);font:500 10.5px/1 var(--ui-sans,'Inter',sans-serif);color:var(--ui-tx2,#c9cfc4);cursor:pointer}
.pi-nav button i{font:400 9px/1 var(--ui-mono,'JetBrains Mono',monospace);font-style:normal;color:var(--ui-tx3,#a5ae9f)}
.pi-nav button:hover,.pi-nav button.on{border-color:var(--ui-bd2,rgba(201,242,122,.4));color:var(--pi-ink);background:rgba(255,255,255,.05)}
.pi-nav button:focus-visible{outline:1px solid var(--pi-v2);outline-offset:2px}
.pi-ley{display:flex;flex-wrap:wrap;align-items:center;gap:3px 12px;font-size:10px;color:var(--ui-tx2,#c9cfc4);padding:9px 0 0}
.pi-ley span{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
.pi-ley b{font-weight:600;color:var(--pi-ink)}
.pi-v{padding:2px 10px 16px}
.pi-v[hidden]{display:none}
.pi-vacio{font-size:11.5px;color:var(--ui-tx2,#c9cfc4);padding:16px 2px}
.pi-mac{scroll-margin-top:var(--pi-hd,120px)}
.pi-mac>h2{display:flex;align-items:baseline;gap:8px;margin:16px 2px 8px;font:500 12px/1.1 var(--ui-tit,'Barlow Condensed',sans-serif);letter-spacing:.16em;text-transform:uppercase;color:var(--ui-tx2,#c9cfc4)}
.pi-mac>h2 i{font:300 20px/.8 var(--pi-num);font-style:normal;letter-spacing:0;color:var(--ui-acc,#c9f27a)}
.pi-mac>h2 small{margin-left:auto;font:400 9.5px var(--ui-mono,'JetBrains Mono',monospace);letter-spacing:.04em;text-transform:none;color:var(--ui-tx3,#a5ae9f)}
/* tarjeta: título · pregunta · cifra grande + dirección · con / sin · una gráfica */
.pi-card{position:relative;border:1px solid rgba(255,255,255,.11);border-radius:14px;background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02));box-shadow:inset 0 1px 0 rgba(255,255,255,.09);padding:11px 12px 10px;margin:0 0 8px;scroll-margin-top:var(--pi-hd,120px);container-type:inline-size}
.pi-card.pi-flash{animation:pi-flash 1.2s ease}@keyframes pi-flash{0%{border-color:var(--ui-acc,#c9f27a)}100%{border-color:rgba(255,255,255,.11)}}
.pi-ch{display:flex;align-items:center;gap:8px}
.pi-ch h3{flex:1;min-width:0;margin:0;font:500 12.5px/1.15 var(--ui-tit,'Barlow Condensed',sans-serif);letter-spacing:.12em;text-transform:uppercase;color:var(--pi-ink)}
.pi-fx{all:unset;box-sizing:border-box;flex:none;display:inline-flex;align-items:center;gap:4px;height:24px;padding:0 8px 0 6px;border-radius:99px;border:1px solid rgba(255,255,255,.12);font:500 10px/1 var(--ui-sans,'Inter',sans-serif);color:var(--ui-tx3,#a5ae9f);cursor:pointer;white-space:nowrap}
.pi-fx:hover,.pi-fx[aria-expanded=true]{color:var(--pi-ink);border-color:rgba(169,156,255,.7);background:rgba(125,107,255,.14)}
.pi-fx:focus-visible{outline:1px solid var(--pi-v2);outline-offset:2px}
.pi-card.pi-consultable .pi-ch h3,.pi-card.pi-consultable .pi-val{cursor:pointer}
.pi-card.pi-consultable .pi-ch h3:hover,.pi-card.pi-consultable .pi-val:hover{color:var(--pi-v2)}
.pi-card.pi-consultable :is(.pi-ch h3,.pi-val):focus-visible{outline:1px solid var(--pi-v2);outline-offset:3px;border-radius:3px}
.pi-form a{color:var(--pi-v3);text-decoration:underline;text-underline-offset:2px}
@container (max-width:260px){.pi-fx span{display:none}}
.pi-q{margin:3px 0 0;font:400 11px/1.35 var(--ui-sans,'Inter',sans-serif);color:var(--ui-tx2,#c9cfc4)}
.pi-e{margin:6px 0 0;font-size:10.5px;line-height:1.45;color:var(--ui-tx3,#a5ae9f)}
.pi-kpi{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:4px 10px;margin:8px 0 0}
.pi-val{display:flex;align-items:baseline;gap:4px;margin:0;min-width:0}
.pi-val .v{font:300 34px/.9 var(--pi-num);letter-spacing:.01em;color:var(--pi-ink);font-variant-numeric:proportional-nums}
.pi-val small{font:400 13px var(--pi-num);letter-spacing:.06em;color:var(--ui-tx3,#a5ae9f);text-transform:uppercase}
.pi-dir{display:flex;flex-direction:column;align-items:flex-end;gap:3px;margin:0 0 1px auto;min-width:0;text-align:right}
.pi-chip{display:inline-flex;align-items:center;gap:4px;padding:2px 8px 2px 6px;border-radius:99px;font:600 10.5px/1.3 var(--ui-sans,'Inter',sans-serif);letter-spacing:.01em;border:1px solid rgba(255,255,255,.16);color:var(--ui-tx2,#c9cfc4);background:rgba(255,255,255,.05);white-space:nowrap}
.pi-chip svg{flex:none}
.pi-chip.ok{color:var(--pi-ok);border-color:rgba(201,242,122,.42);background:rgba(201,242,122,.1)}
.pi-chip.mal{color:var(--pi-mal);border-color:rgba(255,143,156,.45);background:rgba(255,143,156,.1)}
.pi-dd{font:400 10px/1.2 var(--ui-mono,'JetBrains Mono',monospace);color:var(--ui-tx3,#a5ae9f);white-space:nowrap}
.pi-dd b{font-weight:500;color:var(--pi-ink)}
.pi-cs{display:grid;grid-template-columns:1fr 1fr auto;gap:8px;margin:9px 0 2px;padding:7px 0 0;border-top:1px solid rgba(255,255,255,.07)}
.pi-cs>span{display:flex;flex-direction:column;gap:2px;min-width:0}
.pi-cs small{display:flex;align-items:center;gap:5px;font:400 9px/1 var(--ui-mono,'JetBrains Mono',monospace);letter-spacing:.08em;text-transform:uppercase;color:var(--ui-tx3,#a5ae9f);white-space:nowrap}
.pi-cs b{font:400 17px/1.05 var(--pi-num);letter-spacing:.02em;color:var(--pi-ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pi-cs b u{text-decoration:none;font-size:11px;color:var(--ui-tx3,#a5ae9f);margin-left:2px}
.pi-cs .d{align-items:flex-end;text-align:right}
.pi-cs .d b.ok{color:var(--pi-ok)}.pi-cs .d b.mal{color:var(--pi-mal)}
.pi-cs .na{font:400 10.5px/1.35 var(--ui-sans,'Inter',sans-serif);color:var(--ui-tx3,#a5ae9f);grid-column:1/-1}
.pi-viz{min-width:0;overflow:hidden;margin-top:6px}
.pi-nota{margin:5px 0 0;font-size:10.5px;line-height:1.4;color:var(--ui-tx2,#c9cfc4)}
.pi-nota b{font-weight:600;color:var(--pi-ink)}
.pi-esp{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0 0}
.pi-esp span{display:inline-flex;align-items:center;gap:4px;padding:2px 7px 2px 5px;border-radius:99px;border:1px solid rgba(255,255,255,.12);font:400 10px/1.3 var(--ui-sans,'Inter',sans-serif);color:var(--ui-tx2,#c9cfc4);white-space:nowrap}
.pi-esp span.ok svg{color:var(--pi-ok)}.pi-esp span.mal svg{color:var(--pi-mal)}
.pi-esp b{font:500 10px var(--ui-mono,'JetBrains Mono',monospace);color:var(--pi-ink)}
.pi svg.tb-svg{display:block;overflow:visible;touch-action:pan-y;max-width:100%;height:auto}
.pi svg.tb-svg text{font:9px var(--ui-sans,'Inter',system-ui,sans-serif);fill:var(--ui-tx3,#a5ae9f)}
.pi svg.tb-svg text.tb-tv{fill:var(--pi-ink);font:500 10px var(--ui-mono,'JetBrains Mono',monospace)}
.pi svg.tb-svg text.tb-ax{font:400 8.5px var(--ui-mono,'JetBrains Mono',monospace);fill:rgba(244,243,239,.5);letter-spacing:.04em}
.pi svg.tb-svg text.tb-ref{font:500 8.5px var(--ui-sans,'Inter',sans-serif);fill:#ffd27a;letter-spacing:.02em;paint-order:stroke;stroke:rgba(27,31,36,.85);stroke-width:3px;stroke-linejoin:round}
.pi svg.tb-svg:focus-visible{outline:1px solid var(--pi-v2);outline-offset:2px;border-radius:3px}
.pi .tb-ten{cursor:crosshair}
.pi [data-tt]{cursor:crosshair}
.pi-cuerda{position:relative;margin:8px 0 0}
.pi-cuerda canvas{display:block;width:100%!important;max-width:320px;margin:0 auto}
.pi-hero{background:radial-gradient(90% 45% at 50% 62%,rgba(125,107,255,.13),transparent 70%),linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.02));border-color:rgba(169,156,255,.28)}
.pi-cuerda .pie{font-size:10px;line-height:1.4;color:var(--ui-tx3,#a5ae9f);margin:4px 0 0;min-height:2.8em;text-align:center}
.pi-tipos{display:flex;flex-wrap:wrap;justify-content:center;gap:3px 10px;margin:4px 0 0;font-size:10px;color:var(--ui-tx2,#c9cfc4)}
.pi-tipos span{display:inline-flex;align-items:center;gap:5px;white-space:nowrap}
.pi-tipos i{width:8px;height:8px;border-radius:50%;flex:none}
.pi-tipos b{font:500 10px var(--ui-mono,'JetBrains Mono',monospace);color:var(--pi-ink)}
.pi-enc{display:flex;align-items:baseline;justify-content:center;gap:6px;font:400 10px var(--ui-sans,'Inter',sans-serif);color:var(--ui-tx3,#a5ae9f)}
.pi-enc b{font:300 22px/1 var(--pi-num);color:var(--pi-v3)}
.pi-form{margin:8px 0 2px;padding:11px 11px 9px;border-radius:12px;background:linear-gradient(180deg,rgba(125,107,255,.1),rgba(255,255,255,.03));border:1px solid rgba(169,156,255,.22)}
.pi-form[hidden]{display:none}
.pi-form math{font-size:13.5px;font-family:var(--ui-sans,'Inter',sans-serif);color:var(--pi-ink);margin:2px 0 8px;max-width:100%}
.pi-form math :is(mi,mn,mo,mtext){font-family:var(--ui-sans,'Inter',sans-serif);text-transform:none;font-style:normal}
.pi-form math mi{color:var(--pi-v3)}
.pi-form h4{margin:9px 0 3px;font:500 10px var(--ui-mono,'JetBrains Mono',monospace);letter-spacing:.12em;text-transform:uppercase;color:var(--pi-v2)}
.pi-form dl{display:grid;grid-template-columns:auto 1fr;gap:3px 10px;margin:0;font-size:11px}
.pi-form dt{font:500 11px var(--ui-mono,'JetBrains Mono',monospace);color:var(--pi-v3);white-space:nowrap}
.pi-form dd{margin:0;color:var(--ui-tx2,#c9cfc4)}
.pi-form table{width:100%;border-collapse:collapse;font-size:10.5px}
.pi-form td,.pi-form th{padding:3px 4px;border-bottom:1px solid rgba(255,255,255,.07);text-align:right;font:400 10.5px var(--ui-mono,'JetBrains Mono',monospace);color:var(--pi-ink)}
.pi-form th{font:500 9.5px var(--ui-sans,'Inter',sans-serif);color:var(--ui-tx3,#a5ae9f)}
.pi-form td:first-child,.pi-form th:first-child{text-align:left;font-family:var(--ui-sans,'Inter',sans-serif);color:var(--ui-tx2,#c9cfc4)}
.pi-form p{margin:0;font-size:11px;line-height:1.5;color:var(--ui-tx2,#c9cfc4)}
/* estrategias */
.pi-est{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:8px}
.pi-est li{border:1px solid rgba(255,255,255,.13);border-radius:14px;padding:10px 11px;background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.025))}
.pi-est li.on{border-color:var(--c)}
.pi-est{gap:6px}
.pi-est li{padding:8px 10px;transition:border-color .2s}
.pi-est .h{display:flex;align-items:center;gap:6px}
.pi-est .h .ir{all:unset;box-sizing:border-box;flex:1;min-width:0;display:flex;align-items:center;gap:9px;cursor:pointer;border-radius:8px}
.pi-est .h i{flex:none;width:10px;height:10px;border-radius:3px;background:var(--c)}
.pi-est .h .t{min-width:0;display:grid;gap:1px}
.pi-est .h b{font:500 12.5px/1.25 var(--ui-sans,'Inter',sans-serif);color:var(--pi-ink)}
.pi-est .h small{font:400 10px var(--ui-mono,'JetBrains Mono',monospace);color:var(--c);margin-right:4px}
.pi-est .h em{font:400 11px/1.3 var(--ui-sans,'Inter',sans-serif);font-style:normal;color:var(--ui-tx2,#c9cfc4)}
.pi-est .info{all:unset;box-sizing:border-box;flex:none;width:24px;height:24px;display:grid;place-items:center;border-radius:50%;color:var(--ui-tx3,#a5ae9f);cursor:pointer}
.pi-est .info:hover,.pi-est .info[aria-expanded=true]{color:var(--pi-ink)}
.pi-est .h .mapa{padding:0;width:28px;height:28px;justify-content:center;border-radius:50%}
.pi-est .det{margin:6px 0 2px;font-size:11px;line-height:1.5;color:var(--ui-tx2,#c9cfc4)}
.pi-est .ch{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}
.pi-est .ch>button{padding:1px 7px;font-size:10px}
.pi-estbar{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:10px 0 0;font-size:11px;color:var(--ui-tx3,#a5ae9f);min-height:26px}
.pi-volver{all:unset;box-sizing:border-box;display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:99px;border:1px solid rgba(255,255,255,.2);font:500 11px var(--ui-sans,'Inter',sans-serif);color:var(--pi-ink);cursor:pointer}
.pi-volver[hidden]{display:none}
.pi-sec{margin:14px 0 0;font:500 9.5px var(--ui-mono,'JetBrains Mono',monospace);letter-spacing:.12em;text-transform:uppercase;color:var(--ui-tx3,#a5ae9f)}
.pi-nota{margin:8px 0 0;font-size:11px;color:var(--ui-tx2,#c9cfc4)}.pi-nota[hidden]{display:none}
.pi-volver:focus-visible{outline:1px solid var(--pi-v2);outline-offset:2px}
.pi-est .ch button,.pi-est .mapa{all:unset;box-sizing:border-box;padding:3px 8px;border-radius:99px;border:1px solid rgba(255,255,255,.12);font:400 10.5px var(--ui-sans,'Inter',sans-serif);color:var(--ui-tx2,#c9cfc4);cursor:pointer}
.pi-est .ch button:hover,.pi-est .mapa:hover{color:var(--pi-ink);border-color:var(--pi-v2)}
.pi-est .mapa{display:inline-flex;align-items:center;gap:5px;flex:none}
.pi-est .mapa[aria-pressed=true]{color:var(--pi-ink);border-color:var(--c);background:rgba(255,255,255,.06)}
.pi-est :is(button,.mapa):focus-visible{outline:1px solid var(--pi-v2);outline-offset:2px}
.pi-int{font-size:11px;line-height:1.5;color:var(--ui-tx2,#c9cfc4);margin:10px 0 0}
/* variables (sim_ui.js #su-der dentro del tablero) */
html.limpio body #lp-tablero #su-der{position:static!important;display:block!important;width:auto!important;max-height:none!important;overflow:visible!important;margin:8px 0 0!important;padding:0!important;background:none!important;border:0!important;border-radius:0!important;box-shadow:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important;font-family:var(--ui-sans)!important;z-index:auto!important}
html.limpio body #lp-tablero #su-der > h4{margin:12px 0 8px!important;font:500 13px/1 var(--ui-tit)!important;letter-spacing:.1em!important;text-transform:uppercase;color:var(--ui-tx2)!important;opacity:1}
html.limpio body #lp-tablero #su-der > h4.lp-par{color:var(--ui-tx)!important;margin-top:4px!important}
html.limpio body #lp-tablero #su-der .pre{font:400 11.5px/1.45 var(--ui-sans)!important;color:var(--ui-tx2)!important;opacity:1!important}
html.limpio body #lp-tablero #su-der .lp-det>summary{display:flex;align-items:center;gap:8px;cursor:pointer;list-style:none;padding:6px 0;border-top:1px solid rgba(255,255,255,.08)}
html.limpio body #lp-tablero #su-der .lp-det>summary::-webkit-details-marker{display:none}
html.limpio body #lp-tablero #su-der .lp-dt{font:500 13px/1 var(--ui-tit);letter-spacing:.1em;text-transform:uppercase;color:var(--ui-tx)}
html.limpio body #lp-tablero #su-der .lp-ds{flex:1;min-width:0;text-align:right;font:400 10.5px/1.2 var(--ui-mono);color:var(--ui-tx3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#tb-tip{position:fixed;z-index:10050;pointer-events:none;display:none;min-width:140px;max-width:270px;padding:8px 10px;border-radius:11px;background:linear-gradient(180deg,rgba(28,26,48,.97),rgba(16,17,24,.97));border:1px solid rgba(169,156,255,.35);box-shadow:0 12px 30px rgba(0,0,0,.5);color:#f4f3ef;font:11px/1.45 var(--ui-sans,'Inter',system-ui,sans-serif);font-variant-numeric:tabular-nums}
#tb-tip .t{color:#d4ceff;font-size:10px;letter-spacing:.02em;margin-bottom:3px}
#tb-tip .r{display:flex;align-items:center;gap:6px;white-space:nowrap}
#tb-tip .r b{font:500 11px var(--ui-mono,'JetBrains Mono',monospace)}
#tb-tip .r span{color:#b9bccb}
`;

/* ---------- utilidades ---------- */
const fija = (e, at) => { for (const k in at) { const v = String(at[k]); if (e.getAttribute(k) !== v) e.setAttribute(k, v); } };
/* flecha de dirección del chip (SVG en línea, color = currentColor): triángulo arriba / abajo o dos rayas si no cambia */
const tri = (s) => `<svg viewBox="0 0 10 10" width="9" height="9" aria-hidden="true">${s > 0 ? '<path d="M5 1.5 9 8.2H1z" fill="currentColor"/>' : s < 0 ? '<path d="M5 8.5 9 1.8H1z" fill="currentColor"/>' : '<path d="M1.5 3.6h7M1.5 6.4h7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>'}</svg>`;
const sig = (x, d) => { const r = +Math.abs(x).toFixed(d); return (r === 0 ? '±' : x > 0 ? '+' : '−') + num(Math.abs(x), d); };

export function iniciarPanelIndicadores({ R, getM, getFIN, T3 }) {
  const lecturaMapa = iniciarIndicadoresEscena({ R, getM, T3 });
  const FI = crearFichas(); // fichas «qué hizo» de cada obra (data3d/fichas_obras.js)
  if (!document.getElementById('pi-css')) { const st = document.createElement('style'); st.id = 'pi-css'; st.textContent = CSS; document.head.appendChild(st); }
  ponerTip((html, x, y) => (html == null ? tip().ocultar() : tip().mostrar(html, x, y)));
  let root = null, wrap = null, hd = null, vista = 'ind', simHecho, H0 = null, nHecho = -1, nBase = -1, ultimo = 0, sucio = true, pendiente = false, espera0 = performance.now(), goHecho = null;
  const CACHE = new Map(), cards = new Map(); let io = null;
  /* PLEGAR (escritorio): el tablero queda como una pestaña angosta a la derecha y el mapa libre; se recuerda entre visitas (urbia.css, html.pi-plegado) */
  const html = document.documentElement;
  let abrirB = document.getElementById('pi-abrir');
  if (!abrirB) { abrirB = document.createElement('button'); abrirB.id = 'pi-abrir'; abrirB.type = 'button'; abrirB.setAttribute('aria-controls', 'lp-tablero'); abrirB.setAttribute('aria-expanded', 'false');
    abrirB.setAttribute('aria-label', 'Abrir el tablero'); abrirB.title = 'Abrir el tablero'; abrirB.innerHTML = ICO_ABRIR + '<span>Tablero</span>'; document.body.appendChild(abrirB); }
  function plegar(on, foco) {
    html.classList.toggle('pi-plegado', on); try { localStorage.setItem(PLEG_K, on ? '1' : '0'); } catch (e) { /* sin almacenamiento: solo esta visita */ }
    abrirB.setAttribute('aria-expanded', String(!on)); const b = wrap && wrap.querySelector('.pi-pleg'); if (b) b.setAttribute('aria-expanded', String(!on));
    if (on) { window.KEN_CUERDA_VIVA = false; tip().ocultar(); } else { sucio = true; ultimo = 0; }
    if (foco) (on ? abrirB : b) && (on ? abrirB : b).focus();
  }
  abrirB.onclick = () => plegar(false, true);
  { let g = false; try { g = localStorage.getItem(PLEG_K) === '1'; } catch (e) { /* sin almacenamiento */ } if (g) html.classList.add('pi-plegado'); }

  function montar() {
    let s = document.getElementById('lp-tablero');
    if (!s && performance.now() - espera0 > 6000) { s = document.createElement('aside'); s.id = 'lp-tablero'; s.setAttribute('aria-label', 'Tablero'); s.style.cssText = 'position:fixed;top:66px;right:14px;bottom:14px;width:min(440px,92vw);overflow-y:auto;z-index:40;background:var(--ui-glass,rgba(22,27,25,.9));border-radius:16px'; document.body.appendChild(s); }
    if (!s) return false;
    if (s !== root || !wrap || !s.contains(wrap)) { root = s; s.classList.add('pi-montado'); s.querySelectorAll(':scope > .tb, :scope > .pi').forEach((e) => e.remove()); wrap = document.createElement('div'); wrap.className = 'pi'; root.appendChild(wrap); esqueleto();
      root.addEventListener('pointermove', (e) => { const g = e.target.closest && e.target.closest('[data-tt]'); if (g && !e.target.closest('svg.tb-lin, svg.ar-rad')) { const [t0, ...rs] = g.getAttribute('data-tt').split('|'); tip().mostrar(`<div class="t">${esc(t0)}</div>${rs.map((x) => `<div class="r">${esc(x)}</div>`).join('')}`, e.clientX, e.clientY); } else if (!e.target.closest || !e.target.closest('svg.tb-lin, svg.ar-rad')) tip().ocultar(); });
      root.addEventListener('pointerleave', () => tip().ocultar());
      if ('ResizeObserver' in window) new ResizeObserver(() => { sucio = true; if (hd) wrap.style.setProperty('--pi-hd', hd.offsetHeight + 8 + 'px'); }).observe(wrap); }
    return true;
  }

  /* ---------- esqueleto ---------- */
  const VISTAS = [['ind', 'Indicadores'], ['est', 'Estrategias']]; /* las variables van en el acordeón de cada simulación (panel izquierdo, limpio.js) */
  function esqueleto() {
    wrap.innerHTML = `<header class="pi-hd"><div class="pi-l1"><span class="pi-tit">Tablero</span><span class="pi-sem"></span><button type="button" class="pi-pleg" aria-controls="lp-tablero" aria-expanded="true" aria-label="Plegar el tablero" title="Plegar el tablero (deja libre el mapa)">${ICO_PLEG}</button></div><p class="pi-esc"></p><p class="pi-go" hidden></p>`
      + `<div class="pi-tabs" role="tablist" aria-label="Contenido del tablero">${VISTAS.map(([id, n]) => `<button type="button" role="tab" class="pi-tab" id="pi-t-${id}" data-v="${id}" aria-selected="${id === vista}" tabindex="${id === vista ? 0 : -1}">${n}</button>`).join('')}</div>`
      + `<nav class="pi-nav" aria-label="Macromodelos"><span style="flex-basis:100%;width:100%;font:600 10px/1.2 var(--ui-mono,monospace);letter-spacing:.14em;text-transform:uppercase;color:var(--ui-tx3,#a5ae9f);margin:2px 0 4px">Macromodelos</span>${MACROS.map((m, i) => `<button type="button" data-m="${m.id}"><i>0${i + 1}</i>${m.c}</button>`).join('')}</nav></header>`
      + `<div class="pi-v" role="tabpanel" id="pi-v-ind" aria-labelledby="pi-t-ind"${vista === 'ind' ? '' : ' hidden'}><div class="pi-ley"><span>${llave('lin', ARTE.con)}Con propuesta</span><span>${llave('pun', ARTE.sin)}Sin propuesta</span></div><p class="pi-vacio" hidden></p><div class="pi-macs"></div></div>`
      + `<div class="pi-v" role="tabpanel" id="pi-v-est" aria-labelledby="pi-t-est"${vista === 'est' ? '' : ' hidden'}></div>`
      ;
    hd = wrap.querySelector('.pi-hd');
    const pb = wrap.querySelector('.pi-pleg'); pb.setAttribute('aria-expanded', String(!html.classList.contains('pi-plegado'))); pb.addEventListener('click', () => plegar(true, true));
    const tl = wrap.querySelector('.pi-tabs');
    tl.addEventListener('click', (e) => { const b = e.target.closest('[role=tab]'); if (b) elegir(b.dataset.v); });
    tl.addEventListener('keydown', (e) => { const ids = VISTAS.map((v) => v[0]), i = ids.indexOf(vista), k = { ArrowRight: 1, ArrowLeft: -1, Home: -99, End: 99 }[e.key]; if (k == null) return; e.preventDefault();
      const j = Math.max(0, Math.min(ids.length - 1, k === -99 ? 0 : k === 99 ? ids.length - 1 : i + k)); elegir(ids[j]); wrap.querySelector(`#pi-t-${ids[j]}`).focus(); });
    wrap.querySelector('.pi-nav').addEventListener('click', (e) => { const b = e.target.closest('[data-m]'); if (!b) return; const m = wrap.querySelector(`#pi-m-${b.dataset.m}`); if (m) m.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); });
    construirIndicadores(); construirEstrategias();
    if (vista !== 'ind') wrap.querySelector('.pi-nav').hidden = true;
    dispatchEvent(new Event('pi-listo'));
  }
  function elegir(id) {
    if (id === vista) return; vista = id;
    wrap.querySelectorAll('[role=tab]').forEach((b) => { const on = b.dataset.v === id; b.setAttribute('aria-selected', on); b.tabIndex = on ? 0 : -1; });
    wrap.querySelectorAll('.pi-v').forEach((p) => { p.hidden = p.id !== 'pi-v-' + id; });
    wrap.querySelector('.pi-nav').hidden = id !== 'ind'; tip().ocultar(); root.scrollTop = 0; sucio = true; ultimo = 0; programar();
  }

  /* ---------- contexto de un dibujo ---------- */
  const ctxDe = () => {
    const H = R.hist, n = H.length, I = H[n - 1], B = R.ecoBase || R.base || null, prop = !!(R.def && R.def.propuesta), M = getM();
    const W = Math.max(220, Math.floor((wrap.querySelector('.pi-macs').clientWidth || 330) - 26));
    const Bk = B && B.length ? B[Math.min(n, B.length) - 1] : null;
    return { H, n, I, B, Bk: Bk && Bk.sem === I.sem ? Bk : null, prop, M, FIN: getFIN(), W, CA: { H, M }, CB: { H: B || [], M }, I1: H[Math.min(SEM_REF, n) - 1] };
  };
  function serie(c, k, f) {
    let S = CACHE.get(k); if (!S || S.H !== c.H) { S = { H: c.H, a: [], B: null, b: [] }; CACHE.set(k, S); }
    for (let i = S.a.length * PASO; i < c.n; i += PASO) S.a.push(f(c.H[i], c.CA));
    if (S.B !== c.B) { S.B = c.B; S.b = []; }
    if (c.B) for (let i = S.b.length * PASO; i < Math.min(c.B.length, c.n); i += PASO) S.b.push(f(c.B[i], c.CB));
    const xs = S.a.map((_, j) => j * PASO + 1), a = S.a.slice(), b = S.a.map((_, j) => (j < S.b.length ? S.b[j] : null)), u = c.n - 1;
    if (u % PASO !== 0) { xs.push(u + 1); a.push(f(c.H[u], c.CA)); b.push(c.B && c.B[u] ? f(c.B[u], c.CB) : null); }
    return { xs, a, b, con: c.prop ? a : b, sin: c.prop ? b : a };
  }
  const vK = (k) => (I, C) => valor(k, I, C);

  /* ---------- tarjetas ---------- */
  function tarjeta(sec, k, viz) {
    const d = INDK[k], a = document.createElement('article'); a.className = 'pi-card'; a.id = 'pi-c-' + k; a.dataset.k = k;
    const qa = QA[k] || {};
    a.innerHTML = `<header class="pi-ch"><h3>${k === 'inter' ? 'Interacciones bióticas' : esc(d.n)}</h3><button type="button" class="pi-mapa" data-mapa="${k}" aria-pressed="false" aria-label="Ver ${esc(d.n)} animado en el mapa">Ver en mapa</button><button type="button" class="pi-fx" aria-expanded="false" aria-controls="pi-f-${k}" aria-label="Ver fórmula de ${esc(d.n)}" title="Ver fórmula">${ICO_FX}<span>Ver fórmula</span></button></header>`
      + `<p class="pi-q">${esc(qa.q || '')}</p>`
      + `<div class="pi-kpi"><p class="pi-val"><b class="v">—</b><small>${esc(d.u)}</small></p><p class="pi-dir"></p></div><div class="pi-cs"></div><div class="pi-viz"></div><p class="pi-e" hidden>${esc(qa.e || '')}</p><div class="pi-form" id="pi-f-${k}" hidden></div>`;
    sec.appendChild(a);
    if (k === 'inter') a.classList.add('pi-hero');
    const C = { k, el: a, vis: false, abierta: false, up: viz ? viz(a.querySelector('.pi-viz'), a) : null };
    const alternarFormula = () => { C.abierta = !C.abierta; a.querySelector('.pi-fx').setAttribute('aria-expanded', C.abierta); a.querySelector('.pi-form').hidden = !C.abierta; a.querySelector('.pi-e').hidden = !C.abierta; if (C.abierta && R.hist.length) { try { formula(C, ctxDe()); } catch (er) { console.warn('tablero:', er); } } };
    a.querySelector('.pi-fx').addEventListener('click', alternarFormula);
    a.querySelector('.pi-mapa').addEventListener('click', () => lecturaMapa.elegir(k));
    for (const el of [a.querySelector('.pi-ch h3'), a.querySelector('.pi-val')]) {
      el.addEventListener('click', () => { if (R.def && R.def.par >= 2 && R.def.par <= 6) alternarFormula(); });
      el.addEventListener('keydown', (e) => { if (R.def && R.def.par >= 2 && R.def.par <= 6 && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); alternarFormula(); } });
    }
    cards.set(k, C); if (io) io.observe(a); return C;
  }
  /* dirección del cambio: palabra + flecha + color (nunca color solo) y si eso es bueno o malo para ESTE indicador */
  const pon = (e, t) => { if (e._k !== t) { e._k = t; e.innerHTML = t; } };
  const uTxt = (d) => (d.u === '%' ? ' pts' : d.u ? ' ' + (UD[d.u] || d.u) : '');
  const uVal = (d) => (d.u === '%' ? ' %' : d.u ? ' ' + (UD[d.u] || d.u) : '');
  const cero = (dx, dd) => Math.abs(dx) < Math.pow(10, -dd) / 2;
  /* chip: flecha = hacia dónde se mueve el valor; palabra y color = si eso es bueno para ESTE indicador */
  function dirTxt(d, a, b, desde, det) {
    const dx = b - a, z = cero(dx, d.d), s = z ? 0 : Math.sign(dx), bien = z ? null : d.sube ? dx > 0 : dx < 0;
    return `<span class="pi-chip ${bien == null ? '' : bien ? 'ok' : 'mal'}" title="${esc(det)}">${tri(s)}${bien == null ? 'estable' : bien ? 'mejora' : 'empeora'}</span><span class="pi-dd"><b>${z ? '±0' : sig(dx, d.d)}${esc(uTxt(d))}</b> ${desde}</span>`;
  }
  const neutro = (t, dd) => `<span class="pi-chip">${tri(0)}${t}</span><span class="pi-dd">${dd}</span>`;
  function cabecera(C, c) {
    const d = INDK[C.k], v = valor(C.k, c.I, c.CA), v1 = c.n > SEM_REF ? valor(C.k, c.I1, c.CA) : null, vo = c.Bk ? valor(C.k, c.Bk, c.CB) : null, el = C.el;
    const consultable = R.def && R.def.par >= 2 && R.def.par <= 6;
    el.classList.toggle('pi-consultable', !!consultable);
    for (const control of [el.querySelector('.pi-ch h3'), el.querySelector('.pi-val')]) { control.tabIndex = consultable ? 0 : -1; if (consultable) { control.setAttribute('role', 'button'); control.setAttribute('aria-label', `Ver fórmula y fuentes de ${d.n}`); } else { control.removeAttribute('role'); control.removeAttribute('aria-label'); } }
    const f = (x) => (x == null ? '—' : (d.k === 'presion' && x > 0 ? '+' : '') + num(x, d.d) + uVal(d));
    contar(el.querySelector('.v'), v, (x) => (d.k === 'presion' && x > 0 ? '+' : '') + num(x, d.d));
    /* 1 · dirección desde el año 1 (esta corrida) */
    let dt;
    if (d.acum) { /* atropellos: el total solo crece; la tendencia es por año (último año completo frente al año 1) */
      const P = c.I.atropellos && c.I.atropellos.porAño || [], y = Math.floor((c.I.sem - 1) / 52);
      dt = y >= 2 ? dirTxt({ ...d, u: 'anim./año' }, P[0] || 0, P[y - 1] || 0, 'vs año 1', `año 1: ${num(P[0] || 0)} → año ${y}: ${num(P[y - 1] || 0)} animales`) : neutro(`año ${y + 1}`, 'tendencia desde el año 3'); }
    else if (v != null && v1 != null) dt = dirTxt(d, v1, v, 'vs año 1', `año 1: ${f(v1)} → hoy: ${f(v)}`);
    else if (v == null && d.k === 'saturacion') dt = neutro('no aplica', 'sin Estaciones Circulares');
    else dt = c.n <= SEM_REF ? neutro('año 1', `base: semana ${SEM_REF}`) : neutro('sin dato', '');
    pon(el.querySelector('.pi-dir'), dt);
    /* 2 · con frente a sin propuesta, misma semana y misma semilla: dos cifras y la diferencia */
    const vc = c.prop ? v : vo, vs = c.prop ? vo : v, u = esc(d.u), cif = (x) => (x == null ? '—' : `${(d.k === 'presion' && x > 0 ? '+' : '') + num(x, d.d)}<u>${u}</u>`);
    let tx = `<span><small>${llave('lin', ARTE.con)}Con</small><b>${cif(vc)}</b></span><span><small>${llave('pun', ARTE.sin)}Sin</small><b>${vs == null && d.k === 'saturacion' ? 'no aplica' : cif(vs)}</b></span>`;
    if (vc == null || vs == null) tx += `<span class="d"><small>diferencia</small><b>—</b></span>`;
    else { const dx = vc - vs, z = cero(dx, d.d), bien = z ? null : d.sube ? dx > 0 : dx < 0;
      tx += `<span class="d" title="con propuesta menos sin propuesta"><small>${z ? 'diferencia' : bien ? 'propuesta mejor' : 'propuesta peor'}</small><b class="${bien == null ? '' : bien ? 'ok' : 'mal'}">${z ? 'iguales' : sig(dx, d.d) + `<u>${esc(d.u === '%' ? 'pts' : d.u)}</u>`}</b></span>`; }
    pon(el.querySelector('.pi-cs'), tx);
    return { v, vo, v1 };
  }
  /* ---------- «Ver fórmula»: fórmula, términos, valores de esta semana, cómo se calcula, fuente ---------- */
  function formula(C, c) {
    const f = F[C.k], d = INDK[C.k], box = C.el.querySelector('.pi-form'); if (!f) return;
    const filas = vivos(C.k, c);
    const html = f.f + `<h4>Términos</h4><dl>${f.t.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl>`
      + `<h4>Valores de esta semana · semana ${c.I.sem}</h4><table><thead><tr><th></th><th>${c.prop ? 'Con (esta)' : 'Sin (esta)'}</th><th>${c.prop ? 'Sin' : 'Con'}</th></tr></thead><tbody>${filas.map((r) => `<tr><td>${esc(r[0])}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}</tbody></table>`
      + `<h4>Cómo se calcula en el simulador</h4><p>${esc(f.como)}</p><h4>Qué hace la propuesta</h4><p>${esc(PROPM[C.k] || '')}</p><h4>Fuente del método</h4><p>${esc(f.fuente)}</p>`
      + ((R.def && R.def.par >= 2 && R.def.par <= 6) ? `<h4>Datos de partida y alcance · simulación ${String(R.def.par).padStart(2, '0')}</h4><ul>${(FUENTES_PARES[R.def.par] || []).map(s => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.n)}: ${esc(s.v)}</a> · ${esc(s.alcance)}</li>`).join('')}</ul><p>La cifra de esta tarjeta sale de las variables de la semana y de la fórmula anterior. Los controles de la prueba y los umbrales sin medición son supuestos.</p><p><a href="https://github.com/alejagoguti-cpu/simulador-kennedy-copia/blob/main/docs/calibracion_02_06.md" target="_blank" rel="noopener noreferrer">Ver trazabilidad completa</a> · <a href="https://github.com/alejagoguti-cpu/simulador-kennedy-copia/blob/main/data3d/indicadores_macro.js" target="_blank" rel="noopener noreferrer">Cálculo de índices</a> · <a href="https://github.com/alejagoguti-cpu/simulador-kennedy-copia/blob/main/data3d/simulaciones12.js" target="_blank" rel="noopener noreferrer">Modelo semanal</a></p>` : '');
    if (box._h !== html) { box._h = html; box.innerHTML = html; }
  }
  function vivos(k, c) {
    const A = c.I, B = c.Bk, CA = c.CA, CB = c.CB, n = (x, d = 0, u = '') => (x == null || !isFinite(x) ? '—' : num(x, d) + u), dos = (lab, f, d, u) => [lab, n(f(A, CA), d, u), B ? n(f(B, CB), d, u) : '—'];
    const t = (I) => T(I);
    switch (k) {
      case 'shannon': return [dos('Especies presentes (riqueza)', (I) => I.biodiversidad.riqueza), dos('Σ Aᵢ (ha ocupadas, todas)', (I) => Object.values(I.biodiversidad.areaEsp || {}).reduce((p, q) => p + q, 0), 1), dos('Equitatividad H′/ln S', (I) => { const s = I.biodiversidad.riqueza; return s > 1 ? I.biodiversidad.shannonArea / Math.log(s) : null; }, 3), dos("H′", (I) => I.biodiversidad.shannonArea, 3)];
      case 'clave': return CLAVE.flatMap((e) => [dos(`${e.larga}: N actual (ha)`, (I) => claveArea(I, e.id), 1), dos(`${e.larga}: N inicial (ha)`, (I, C) => claveArea(C.H[Math.min(SEM_REF, C.H.length) - 1], e.id), 1), dos(`${e.larga}: %`, (I, C) => clavePct(I, e.id, C), 0, ' %')]);
      case 'inter': return [dos('I (interacciones locales)', (I) => t(I).red), dos('Interacciones en la semana 0', (I) => I.red0), ['Encuentros en el 3D ahora', n(window.KEN_ENC), '—']];
      case 'verde': return [dos('A_v (ha)', (I) => t(I).verde, 1), dos('A_v (m²)', (I) => t(I).verde * 1e4), dos('Corredores verdes', (I) => I.verde && I.verde.resumen.nParches), dos('Módulos nuevos', (I) => I.verde && I.verde.resumen.nNuevos)];
      case 'conect': return [dos('Corredores verdes conectados', (I) => I.verde && I.verde.resumen.nConectados), dos('Corredores verdes totales', (I) => I.verde && I.verde.resumen.nParches), dos('Enlaces rotos', (I) => I.verde && I.verde.resumen.nRotas), dos('C', (I) => t(I).conectados, 1, ' %')];
      case 'atrop': return [dos('A (acumulados)', (I) => I.atropellos.total), dos('Este año', (I) => I.atropellos.porAño[Math.min(14, Math.floor((I.sem - 1) / 52))]), dos('Esta semana', (I) => I.atropellos.semana), dos('Índice (dispersantes muertos/sem.)', (I) => I.atropellosIndice, 1)];
      case 'ruido': return [dos('L_Aeq (energético)', (I) => I.ruidoLAeq, 1, ' dB(A)'), dos('Promedio aritmético (antes)', (I) => I.ruidoDb, 1, ' dB'), dos('L_Aeq del inicio', (I) => I.ruidoLAeq0, 1, ' dB(A)'), dos('Calles pacificadas', (I) => (I.mitiga || 0) * 100, 0, ' %'), dos('Tráfico (1 = hoy)', (I) => I.trafico, 3)];
      case 'bienestar': return [dos('Σ aₚ (aves × corredor verde)', (I) => (I.avesRuido.porParche || []).reduce((p, q) => p + q.aves, 0) || null), dos('Ruido al que están expuestas', (I) => I.avesRuido.dbAves, 1, ' dB(A)'), dos('Aves en corredores verdes > 60 dB', (I) => I.avesRuido.expuestas * 100, 0, ' %'), dos('B', (I) => I.avesRuido.bienestarFauna * 100, 1, ' %')];
      case 'saturacion': return [dos('kg acumulados', (I) => hayEstaciones(I) ? t(I).pendientes * 1000 : null), dos('Capacidad máxima (kg)', (I) => hayEstaciones(I) ? t(I).capacidadAlmacen * 1000 : null), dos('Estaciones', (I) => (t(I).estaciones || []).length || null), dos('S', (I) => valor('saturacion', I, null), 1, ' %')];
      case 'aprov': return [dos('kg aprovechados/día', (I) => t(I).tratados * 1000), dos('kg generados/día', (I) => t(I).organicos * 1000), dos('Compost (kg/día)', (I) => t(I).compost * 1000), dos('R', (I) => t(I).aprovechamiento, 2, ' %')];
      case 'llega': return [dos('Demanda de Kennedy (t/día)', (I) => I.comidaK && I.comidaK.dem), dos('Frescos recibidos (t/día)', (I) => I.comidaK && I.comidaK.frescosRec), dos('Otros canales (t/día)', (I) => I.comidaK && I.comidaK.otros), dos('Llega (t/día)', (I) => I.comidaK && I.comidaK.llega), dos('L', (I) => valor('llega', I), 1, ' %')];
      case 'resK': return [dos('R generados (t/día)', (I) => I.residuosK && I.residuosK.gen), dos('T tratados en Estaciones (t/día)', (I) => I.residuosK && I.residuosK.trat, 1), dos('Estaciones Circulares abiertas (20 t/día c/u)', (I) => I.residuosK && I.residuosK.nEst),dos('Sin recoger (t/día)', (I) => I.residuosK && I.residuosK.noRec), dos('Degradación de La Vaca D', (I) => I.residuosK && I.residuosK.D * 100, 0, ' %'), ['Umbral de game over (sin recoger)', '296 t/día', '296 t/día']];
      case 'cobertura': return [dos('kg recibidos/día', (I) => Math.min(1, t(I).cobertura / 100) * t(I).demanda * 1000), dos('kg demandados/día', (I) => t(I).demanda * 1000), dos('Sectores bajo 80 %', (I) => (t(I).sectores || []).filter((s) => s.valor < 80).length), dos('C', (I) => valor('cobertura', I), 1, ' %')];
      case 'autonomia': return [dos('kg locales consumidos/día', (I) => t(I).autonomia / 100 * t(I).demanda * 1000), dos('kg producidos/día', (I) => t(I).produccion * 1000), dos('kg demandados/día', (I) => t(I).demanda * 1000), dos('Au', (I) => t(I).autonomia, 2, ' %')];
      case 'acceso': { const aA = acceso(A, c.M), aB = B ? acceso(B, c.M) : null, q = (o, f, d = 0, u = '') => (o ? n(f(o), d, u) : '—');
        return [['Habitantes cubiertos', q(aA, (o) => o.cubiertos), q(aB, (o) => o.cubiertos)], ['Habitantes totales', q(aA, (o) => o.total), q(aB, (o) => o.total)], ['Mercados abiertos', q(aA, (o) => o.mercados.length), q(aB, (o) => o.mercados.length)], ['Radio en línea recta', n(ACCESO_R, 0, ' m'), n(ACCESO_R, 0, ' m')], ['Ac', q(aA, (o) => o.pct, 1, ' %'), q(aB, (o) => o.pct, 1, ' %')]]; }
      case 'presion': return [dos('Pᵢ (semana 1)', (I, C) => C.H[0] && C.H[0].especulacion.indice, 3), dos('P_f (esta semana)', (I) => I.especulacion.indice, 3), dos('Hogares en riesgo', (I) => I.especulacion.hogaresRiesgo), dos('P', (I, C) => valor('presion', I, C), 2, ' %')];
    }
    return [];
  }

  /* ---------- UNA gráfica por tarjeta (dataviz, choosing-a-form: la pregunta de casi todas es «¿sube o baja con los años y cuánto separa la propuesta?»)
     Tendencia de 15 años (graficas_vivas.js): con propuesta = línea violeta con lavado, sin propuesta = coral punteada, valores finales a la derecha.
     Umbral rotulado solo donde decide algo (game over de residuos, alerta de las estaciones, demanda completa). La cuerda de interacciones no cambia. */
  const div = (h, cls) => { const e = document.createElement('div'); if (cls) e.className = cls; h.appendChild(e); return e; };
  const nota = (h) => { const e = document.createElement('p'); e.className = 'pi-nota'; h.appendChild(e); return e; };
  const Ic = (c) => (c.prop ? c.I : c.Bk), Is = (c) => (c.prop ? c.Bk : c.I), Cc = (c) => (c.prop ? c.CA : c.CB), Cs = (c) => (c.prop ? c.CB : c.CA);
  const tend = (h, k, op = {}) => { const d = INDK[k], L = new Tendencia(h, { n: d.n, u: UD[d.u] || d.u, d: d.d, cero: op.cero, alto: op.alto, fmt: op.fmt });
    return (c) => { const S = serie(c, k, vK(k)); L.update({ W: c.W, FIN: c.FIN, xs: S.xs, con: S.con, sin: S.sin, run: c.prop ? 'con' : 'sin', ref: op.ref ? op.ref(c) : null }); }; };
  const solo = (k, op) => (h) => tend(h, k, op);
  const VIZ = {
    inter: (h) => { const box = div(h, 'pi-cuerda');
      box.innerHTML = '<div class="pi-enc"><b>0</b><span>encuentros ahora en el 3D</span></div><div class="pi-cv"></div><p class="pie">Pasa sobre una especie para ver con quién se relaciona.</p><div class="pi-tipos"></div>';
      let tiposN = 0;
      const vivo = () => { const cv = document.getElementById('tb-cuerda'), slot = box.querySelector('.pi-cv'); if (cv && cv.parentNode !== slot) slot.appendChild(cv);
        const on = !!cv && vista === 'ind' && cards.get('inter').vis && !!root && root.getClientRects().length > 0 && !document.hidden; window.KEN_CUERDA_VIVA = on;
        if (!on) return; box.querySelector('.pi-enc b').textContent = num(window.KEN_ENC || 0);
        const p1 = document.getElementById('tb-pie1'); if (p1 && p1.textContent) box.querySelector('.pie').innerHTML = p1.innerHTML;
        const bio = window.KEN_T3 && window.KEN_T3.bio; if (bio && bio.TIPOS) { const E = bio.ENCL || bio.ENC || [];
          if (tiposN !== bio.TIPOS.length) { tiposN = bio.TIPOS.length; box.querySelector('.pi-tipos').innerHTML = bio.TIPOS.map((t, i) => `<span><i style="background:${t.c}"></i>${esc(t.n)} <b data-i="${i}">0</b></span>`).join(''); }
          box.querySelectorAll('.pi-tipos b').forEach((b) => { const v = E[+b.dataset.i] || 0, tx = num(v); if (b.textContent !== tx) b.textContent = tx; }); } };
      const iv = setInterval(() => { if (!box.isConnected) { clearInterval(iv); return; } vivo(); }, 400);
      return () => vivo(); },
    shannon: solo('shannon'),
    /* promedio de las tres especies en la línea; debajo, cada especie frente al año 1 (con propuesta) */
    clave: (h) => { const L = tend(h, 'clave'), e = div(h, 'pi-esp');
      return (c) => { L(c); if (c.n <= SEM_REF) { pon(e, ''); return; }
        pon(e, CLAVE.map((s) => { const v = clavePct(Ic(c), s.id, Cc(c)); if (v == null) return `<span>${esc(s.n)} —</span>`; const p = v - 100, z = Math.abs(p) < 0.5, sg = z ? 0 : Math.sign(p);
          return `<span class="${z ? '' : p > 0 ? 'ok' : 'mal'}" title="${esc(s.larga)}: ${num(v)} % del área del año 1, con propuesta">${tri(sg)}${esc(s.n)} <b>${z ? '±0' : (p > 0 ? '+' : '−') + num(Math.abs(p))} %</b></span>`; }).join('')); }; },
    verde: solo('verde'),
    conect: solo('conect'),
    atrop: solo('atrop', { cero: true }),
    ruido: solo('ruido'),
    bienestar: solo('bienestar'),
    saturacion: (h) => { const L = tend(h, 'saturacion', { cero: true, ref: () => ({ v: 85, txt: 'alerta 85 %' }) }), f = nota(h);
      return (c) => { L(c); pon(f, vC(c, 'saturacion') == null ? 'Sin propuesta no hay Estaciones Circulares: lo recogido va a Doña Juana.' : ''); }; },
    aprov: solo('aprov', { cero: true }),
    /* residuos frente a la generación con la que lo sin recoger llega al game over */
    resK: (h) => { const L = tend(h, 'resK', { ref: (c) => { const r = c.I.residuosK, t = r ? r.trat || 0 : 0; return { v: 774 + 296 + t, txt: 'game over' }; } }), f = nota(h);
      return (c) => { L(c); const r = c.I.residuosK; pon(f, r ? `Sin recoger: <b>${num(r.noRec)} de 296 t/día</b> · La Vaca degradada <b>${num(r.D * 100)} %</b>` : ''); }; },
    llega: (h) => { const L = tend(h, 'llega', { ref: () => ({ v: 100, txt: 'demanda completa' }) }), f = nota(h);
      return (c) => { L(c); const I = c.I.comidaK; pon(f, I && I.llega < I.dem - 0.5 ? `Esta semana faltan <b>${num(I.dem - I.llega)} t/día</b> de ${num(I.dem)}.` : ''); }; },
    cobertura: solo('cobertura'),
    autonomia: solo('autonomia', { cero: true }),
    acceso: solo('acceso'),
    presion: solo('presion', { cero: true, fmt: (v) => (v > 0 ? '+' : '') + num(v, 1) })
  };
  const vC = (c, k) => valor(k, Ic(c), Cc(c));

  function construirIndicadores() {
    const box = wrap.querySelector('.pi-macs'); cards.clear();
    if (io) io.disconnect();
    io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => { for (const e of es) { const C = cards.get(e.target.dataset.k); if (!C) continue; const ant = C.vis; C.vis = e.isIntersecting; if (C.vis && !ant) { sucio = true; programar(); } } }, { root: root, rootMargin: '200px 0px' }) : null;
    MACROS.forEach((m, i) => { const s = document.createElement('section'); s.className = 'pi-mac'; s.id = 'pi-m-' + m.id; s.setAttribute('aria-labelledby', 'pi-h-' + m.id);
      const nI = IND.filter((x) => x.macro === m.id).length;
      s.innerHTML = `<h2 id="pi-h-${m.id}"><i>${String(i + 1).padStart(2, '0')}</i><span>${esc(m.c)}</span><small>${nI} indicadores</small></h2>`; box.appendChild(s);
      for (const d of IND.filter((x) => x.macro === m.id)) { const C = tarjeta(s, d.k, VIZ[d.k]); if (!io) C.vis = true; } });
  }

  /* ---------- ESTRATEGIAS ---------- */
  function construirEstrategias() {
    const v = wrap.querySelector('#pi-v-est');
    const CORTO = { E1: 'Acopio y promotores en vez de torres', E2: 'Tiendas existentes reparten a la red local', E3: 'Bodegas se desmontan y el borde se restaura', E4: 'Compost y sustrato vuelven a las huertas', E5: 'Árboles, pasos de fauna y calles verdes', E6: 'Negocios en vivienda frenan el alza de arriendos', E7: 'Mercados de barrio abren por fases', E8: 'Huertas en baldíos, cubiertas y viviendas', E9: 'Cuidado y calles pacificadas por manzana' };
    const SVG_MAPA = '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true"><circle cx="8" cy="8" r="2.2" fill="currentColor"/><path d="M8 1.5V4M8 12v2.5M1.5 8H4M12 8h2.5" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
    const SVG_INFO = '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M8 7.2v4M8 4.7v.1" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
    const SVG_FX = '<svg viewBox=\"0 0 16 16\" width=\"14\" height=\"14\" aria-hidden=\"true\"><path d=\"M3.5 6 8 10.5 12.5 6\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.6\" stroke-linecap=\"round\" stroke-linejoin=\"round\"/></svg>';
    const SVG_VOLVER = '<svg viewBox="0 0 16 16" width="13" height="13" aria-hidden="true"><path d="M6.5 3 2.5 7l4 4M3 7h6.5a4 4 0 0 1 0 8H8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    /* obras de la propuesta (lo construido en «con propuesta»): cada una se ubica al hacer clic (ver ubicarObra) */
    const OBRAS = [
      { id: 'O1', n: 'Corabastos al 50 % y La Vaca', c: '#fb923c', t: 'Bodegas fuera; humedal con ecotono y árboles' },
      { id: 'O2', n: 'Puente de fauna', c: '#f97316', t: 'Ecoducto sobre la vía entre los humedales' },
      { id: 'O8', n: 'Árboles en vías', c: '#34d399', t: 'Calles verdes que unen parques' },
      { id: 'O9', n: 'Árboles en bordes de humedales', c: '#10b981', t: 'Copa y hábitat en El Burro, La Vaca y Techo' },
      { id: 'O3', n: 'Mercados barriales', c: '#facc15', t: 'Mercados de barrio que abren por fases' },
      { id: 'O4', n: 'Estaciones Circulares', c: '#a78bfa', t: 'Orgánicos a compost en cada mercado' },
      { id: 'O5', n: 'Huertas hidropónicas', c: '#22d3ee', t: 'Cultivos sobre cubiertas de edificios' },
      { id: 'O6', n: 'Huertas en parques', c: '#84cc16', t: 'Huertas de barrio que abren por años' },
      { id: 'O10', n: 'Humedal y SUDS de Bavaria', c: '#4fd1c5', t: 'Lluvia por biofiltros a un humedal de 6 celdas' },
      { id: 'O11', n: 'Ciclorrutas de Bavaria', c: '#c9f27a', t: 'Carril en bici dentro del plan parcial' },
      { id: 'O7', n: 'Árboles nuevos en parques', c: '#34d399', t: 'Corredores verdes nativos en los parques' }
    ];
    const fila = (id, n, c, t, cod, ch, det) => `<li data-e="${id}" style="--c:${c}"><div class="h"><button type="button" class="ir" aria-label="Ver ${esc(n)} en el mapa"><i></i><span class="t"><b>${cod ? `<small>${cod}</small> ` : ''}${esc(n)}</b><em>${esc(t)}</em></span></button>${det ? `<button type="button" class="info" aria-label="Qué hace en el modelo" aria-expanded="false">${SVG_INFO}</button>` : ''}<button type="button" class="mapa" aria-label="Ver en el mapa" title="Ver en el mapa">${SVG_MAPA}</button>${FI.tiene(id) ? `<button type="button" class="fx" aria-expanded="false" aria-label="Ver qué hizo (ficha)" title="Ficha: qué hizo">${SVG_FX}</button>` : ""}</div>${FI.tiene(id) ? FI.esqueleto(id) : ""}${det ? `<p class="det" hidden>${esc(det)}</p>` : ''}${ch ? `<div class="ch">${ch.map((k) => `<button type="button" data-k="${k}">${esc(INDK[k].c)}</button>`).join('')}</div>` : ''}</li>`;
    v.innerHTML = '<div class="pi-estbar"><span>Toca una para verla en el mapa</span><button type="button" class="pi-volver" hidden>' + SVG_VOLVER + 'Volver</button></div>'
      + '<h4 class="pi-sec">Estrategias</h4><ul class="pi-est">' + ESTR.map((e) => fila(e.id, e.n, e.c, CORTO[e.id], e.id, e.ind, e.hace)).join('') + '</ul>'
      + '<h4 class="pi-sec">Obras de la propuesta</h4><ul class="pi-est">' + OBRAS.map((o) => fila(o.id, o.n, o.c, o.t, '', null, '')).join('') + '</ul>'
      + '<p class="pi-nota" hidden></p>';
    /* dónde está cada estrategia en la propuesta: centro y extensión (percentiles 10–90, para que un lote lejano no arrastre el encuadre) */
    let GEO = null;
    const cargarGeo = () => GEO || (GEO = (window.cargarJSON ? window.cargarJSON('data3d/estrategias.json?v=5') : fetch('data3d/estrategias.json?v=5').then((r) => r.json())).then((D) => {
      const esc5 = D.escala || 0.5, G = {};
      const foco = (P) => { if (!P.length) return null;
        const rango = (i) => { const a = P.map((p) => p[i]).sort((x, y) => x - y), q = (f) => a[Math.min(a.length - 1, Math.floor(f * (a.length - 1)))]; return [q(0.1), q(0.9)]; };
        const [x0, x1] = rango(0), [y0, y1] = rango(1); const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2; let m = P[0], dm = Infinity; /* se ancla al elemento real más cercano al centro: si hay varios focos, no cae entre ellos */
        for (const p of P) { const d = (p[0] - cx) ** 2 + (p[1] - cy) ** 2; if (d < dm) { dm = d; m = p; } }
        return { x: m[0], y: m[1], ext: Math.max(x1 - x0, y1 - y0) }; };
      for (const s of D.estrategias) { const P = [];
        s.capas.forEach((c, i) => { const Q = []; for (const l of c.lotes || []) for (let k = 0; k + 1 < l.length; k += 2) Q.push([l[k] * esc5, l[k + 1] * esc5]); for (const q of c.puntos || []) Q.push([q[0] * esc5, q[1] * esc5]); G[s.id + '.' + i] = foco(Q); P.push(...Q); });
        const f = foco(P); if (f) G[s.id] = f; }
      G.E1 = { x: 9227, y: 2986, ext: 600 }; /* predio de Bavaria (data3d/bavaria.json) */
      return G; }).catch(() => ({})));
    const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
    let activa = null, tok = 0, voló = false;
    const volverBtn = v.querySelector('.pi-volver');
    const marcarActiva = (id) => { activa = id; v.querySelectorAll('.pi-est li').forEach((li) => li.classList.toggle('on', li.dataset.e === id)); volverBtn.hidden = !id; };
    /* centro (en el mundo) del objeto 3D de un módulo: el hijo más cercano al centro del conjunto, para no caer entre focos */
    const deGrupo = (gr) => { try { if (!gr) return null; const P = [];
      gr.traverse((o) => { if (o.isInstancedMesh && o.instanceMatrix) { const e = o.instanceMatrix.array, n = Math.min(o.count, 4000); for (let i = 0; i < n; i++) P.push([e[i * 16 + 12], e[i * 16 + 14]]); } else if (o.isMesh) { o.updateMatrixWorld(); P.push([o.matrixWorld.elements[12], o.matrixWorld.elements[14]]); } });
      if (!P.length) return null; const med = (i) => { const a = P.map((p) => p[i]).sort((x, y) => x - y); return a[a.length >> 1]; }, cx = med(0), cz = med(1);
      const lo = (i) => { const a = P.map((p) => p[i]).sort((x, y) => x - y); return [a[Math.floor(a.length * 0.1)], a[Math.floor(a.length * 0.9)]]; }, [x0, x1] = lo(0), [z0, z1] = lo(1);
      let m = P[0], dm = Infinity; for (const p of P) { const d = (p[0] - cx) ** 2 + (p[1] - cz) ** 2; if (d < dm) { dm = d; m = p; } }
      return isFinite(m[0]) ? { w: [m[0], m[1]], ext: Math.max(x1 - x0, z1 - z0) } : null; } catch (err) { return null; } };
    async function ubicarObra(id, G, lw) {
      const m = (g) => g && { w: lw(g.x, g.y), ext: g.ext };
      if (id === 'O1') return m(G.E3);
      if (id === 'O5') return m(G['E8.1']);
      if (id === 'O3' || id === 'O4') { const M = window.KEN_MERCADOS && window.KEN_MERCADOS.todos; if (!M || !M.length) return null;
        const xs = M.map((q) => q.x), zs = M.map((q) => q.z), cx = xs.reduce((a, b) => a + b, 0) / M.length, cz = zs.reduce((a, b) => a + b, 0) / M.length;
        const q = id === 'O4' ? [...M].sort((a, b) => a.d - b.d)[0] : M.reduce((a, b) => (Math.hypot(a.x - cx, a.z - cz) < Math.hypot(b.x - cx, b.z - cz) ? a : b));
        return { w: [q.x, q.z], ext: id === 'O3' ? 1200 : 300 }; }
      if (id === 'O6') return deGrupo(window.KEN_HBAR && window.KEN_HBAR.grupo);
      if (id === 'O7') return deGrupo(window.KEN_PARCHES && window.KEN_PARCHES.grupo);
      if (id === 'O8' || id === 'O9' || id === 'O10' || id === 'O11') { const P = window.KEN_PROP01, L = (P && P.obras ? P.obras() : []), pk = { O9: (o) => o.id === 'borde_burro', O10: (o) => o.id === 'humedal_bavaria', O11: (o) => o.id === 'ciclo_bavaria', O8: (o) => /calle/i.test(o.id + ' ' + o.n) }[id], o = L.find(pk);
        return o ? { w: [o.x, o.z], ext: id === 'O11' ? 900 : id === 'O8' ? 1200 : Math.max(200, o.radio * 2) } : null; }
      if (id === 'O2') { const P = window.KEN_PROP01, i = P && P.info ? P.info() : null, s = (P && P.puente) || (i && i.puente) || window.KEN_PUENTE_FAUNA || null;
        if (!s) return null; const x = s.x != null ? s.x : s.pos && s.pos[0], z = s.z != null ? s.z : s.pos && s.pos[2] != null ? s.pos[2] : s.pos && s.pos[1];
        return isFinite(x) && isFinite(z) ? { w: [x, z], ext: 200 } : null; }
      return null;
    }
    const nota = v.querySelector('.pi-nota');
    async function verEnMapa(id) {
      const e = ESTR.find((x) => x.id === id) || OBRAS.find((x) => x.id === id), t = ++tok; if (!e) return;
      marcarActiva(id); nota.hidden = true;
      const con = document.querySelector('#lp-esc [data-e=con]');
      if (con && !con.classList.contains('on')) { con.click(); await esperar(2500); if (t !== tok) return; } /* primero «Kennedy con propuesta» */
      const G = await cargarGeo(), lw = window.KEN_T3 && window.KEN_T3.lw;
      if (!lw || !window.KEN_OJO) return;
      const g = id[0] === 'E' ? (G[id] ? { w: lw(G[id].x, G[id].y), ext: G[id].ext } : null) : await ubicarObra(id, G, lw);
      if (!g) { if (t === tok) { marcarActiva(null); volverBtn.hidden = !voló; nota.textContent = e.n + ': todavía no está disponible en el mapa.'; nota.hidden = false; } return; }
      const op = { x: g.w[0], z: g.w[1], titulo: id + ' ' + e.n, color: e.c, sinTarjeta: true, cenital: g.ext > 900, rapido: false };
      /* la cámara solo vuela tras una acción de la persona (data3d/camara_quieta.js, ventana de 2,5 s): tras el cambio de escenario la ventana pudo vencer, y la acción fue este toque */
      const tocar = () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Shift' }));
      voló = true;
      try { tocar(); if (!(await window.KEN_OJO.ir(op)) && t === tok) { await esperar(800); if (t === tok) { tocar(); await window.KEN_OJO.ir(op); } } } catch (err) { console.warn('estrategia en el mapa:', err); }
    }
    async function volver() { tok++; voló = false; marcarActiva(null); nota.hidden = true; try { if (window.KEN_OJO) await window.KEN_OJO.cerrar(); } catch (err) { console.warn(err); } }
    volverBtn.addEventListener('click', volver);
    v.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b || b === volverBtn) return; const li = b.closest('li'); if (!li) return;
      if (b.dataset.k) { elegir('ind'); const C = cards.get(b.dataset.k); if (C) { C.el.scrollIntoView({ block: 'start' }); C.el.classList.remove('pi-flash'); void C.el.offsetWidth; C.el.classList.add('pi-flash'); } return; }
      if (b.classList.contains('fx')) { const fi = li.querySelector('.fi'); fi.hidden = !fi.hidden; b.setAttribute('aria-expanded', String(!fi.hidden)); if (!fi.hidden) { try { FI.actualizar(fi, fi.dataset.f, ctxDe()); } catch (err) { console.warn(err); } } return; }
      if (b.classList.contains('info')) { const d = li.querySelector('.det'); d.hidden = !d.hidden; b.setAttribute('aria-expanded', String(!d.hidden)); return; }
      verEnMapa(li.dataset.e); });
  }

  /* ---------- encabezado ---------- */
  function encabezado(c) {
    const d = R.def || {}, I = c.I;
    wrap.querySelector('.pi-sem').innerHTML = `Semana <b>${I.sem}</b> · año <b>${año(I.sem)}</b> de 15`;
    wrap.querySelector('.pi-esc').innerHTML = d.par ? `<b>${esc((d.parN || '').replace(/^\d+\s*/, ''))}</b> · ${c.prop ? 'con propuesta' : 'sin propuesta'}` : `<b>${esc(d.n || 'Kennedy')}</b> · sin prueba de estrés`;
    const g = T(I).gameOver || R.go, pg = wrap.querySelector('.pi-go'); pg.hidden = !g; if (g) pg.textContent = `Game over en la semana ${g.sem}: ${g.motivo || g.regla}.`;
  }

  /* ---------- ciclo ---------- */
  function pintar() {
    if (simHecho !== R.sim) { simHecho = R.sim; CACHE.clear(); }
    const H = R.hist, vac = wrap.querySelector('.pi-vacio'), macs = wrap.querySelector('.pi-macs');
    if (!R.sim || !H || !H.length) { vac.hidden = false; vac.textContent = R.sim ? 'Calculando la primera semana…' : 'Dale play: aquí aparecen, semana a semana, los indicadores de los tres macromodelos.'; macs.style.display = 'none'; nHecho = 0; return null; }
    vac.hidden = true; macs.style.display = '';
    if (H !== H0) CACHE.clear();
    const c = ctxDe(); encabezado(c); nHecho = H.length; H0 = H; nBase = (R.ecoBase || R.base || []).length; goHecho = R.go;
    if (vista === 'est') wrap.querySelectorAll('.fi:not([hidden])').forEach((el) => FI.actualizar(el, el.dataset.f, c));
    if (vista !== 'ind') return null;
    return { c, cola: [...cards.values()].filter((C) => C.vis), i: 0 };
  }
  let tarea = null;
  function trabajar(dl) {
    while (tarea && tarea.i < tarea.cola.length) { const C = tarea.cola[tarea.i++]; try { cabecera(C, tarea.c); if (C.up) C.up(tarea.c); if (C.abierta) formula(C, tarea.c); } catch (e) { console.warn('tablero:', C.k, e); } if (dl && !dl.didTimeout && dl.timeRemaining() < 3) break; }
    if (tarea && tarea.i >= tarea.cola.length) tarea = null;
  }
  const ocio = window.requestIdleCallback ? (f) => requestIdleCallback(f, { timeout: 500 }) : (f) => setTimeout(() => f(null), 16);
  function programar() { if (pendiente) return; pendiente = true;
    const paso = (dl) => { if (!tarea) { ultimo = performance.now(); try { tarea = pintar(); } catch (e) { console.warn('tablero:', e); tarea = null; } } trabajar(dl); if (tarea) ocio(paso); else pendiente = false; }; ocio(paso); }
  function tick() {
    if (document.hidden || !getM() || !montar()) return;
    if (!root.isConnected || !root.getClientRects().length) { window.KEN_CUERDA_VIVA = false; return; } // cajón cerrado (celular): no se dibuja
    const H = R.hist || [], nb = (R.ecoBase || R.base || []).length, ahora = performance.now();
    const cambio = simHecho !== R.sim || H !== H0 || sucio || R.go !== goHecho || H.length !== nHecho || (nb !== nBase && ahora - ultimo > 2000);
    if (!cambio || ahora - ultimo < 300) return; sucio = false; programar();
  }
  setInterval(tick, 250);
  const api = { pintar: () => { sucio = true; ultimo = 0; tarea = null; if (montar()) programar(); }, vista: (id) => { if (wrap) elegir(id); }, cards };
  window.KEN_PI = api;
  return api;
}


