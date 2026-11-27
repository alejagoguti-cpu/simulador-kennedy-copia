/* Revisión ecológica: se eliminan los descuentos de mortalidad y restauración activados únicamente por E.prop.
   Los coeficientes de riesgo existentes siguen siendo supuestos, no estimaciones de abundancia observada. */
/* ============ LAS 12 SIMULACIONES · módulo ES para el navegador y para node ============
   Reúne el modelo semanal data3d/sim_vida.js (abastecimiento por zona, residuos orgánicos, hábitat de Levins) con la red trófica compartida
   data3d/red_trofica.js (23 especies de fauna × 71 de flora × enlaces de la red) y los modificadores de la instalación
   (tools/escenarios_instalacion.mjs), y añade ruido, tráfico, atropellos, eventos de extinción y SEIS reglas de game over iguales para las 12.
   Sin DOM ni fs: los datos pesados vienen precalculados en data3d/simulaciones_datos.json (tools/simulaciones_datos.mjs) y se cargan con
   cargarDatos(cargar). Todo es determinista con la semilla. HORIZONTE: SEMANAS_FIN = 1040 semanas = 20 años de 52 semanas (antes 520 = 10 años),
   en tres FASES (corto plazo años 1–5, mediano 6–10, largo 11–20). Semana 0 = hoy (nov-2026).
   Regla del proyecto: nada inventado; todo supuesto va marcado [SUP] con su porqué; cifras con su fuente.

   USO:
     import * as S from './data3d/simulaciones12.js';
     await S.cargarDatos(url => fetch(url).then(r => r.json()));       // en node: url => JSON.parse(readFileSync(fileURLToPath(url)))
     const e = S.crear(7, 1, { metroRed: 10 }); for (let i = 0; i < S.SEMANAS_FIN; i++) { S.paso(e); const x = S.ind(e); const go = S.gameOver(e); }

   20 AÑOS · qué pasa después de la semana 520 (revisado): el tráfico sigue creciendo año a año (carros +1,5 %/año compuesto, sim_vida.js: V = 1,23
   en el año 20); el metro (semana 114), el cierre de Corabastos (52), el cierre de vía (104–129), los techos (3 años), el montaje de B y C
   (calendario de mercados_red.js, 3 años de superficies) y el desmonte de bodegas (una fase cada 13 semanas como mucho) ocurren dentro de
   los primeros años y después el modelo sigue con su dinámica; el plan parcial (D) termina su obra en el año 10 (las 10 etapas del decreto)
   y del año 11 al 20 el predio queda construido y habitado. Los deslizadores de semana llegan hasta la 1040.

   REESTRUCTURA (2026-11-23): las 12 simulaciones son 6 PARES (ver PARES y SIMS): id 2k−1 sin propuesta (A) e id 2k con propuesta (C), misma prueba de
   estrés y mismos deslizadores. Capas nuevas de ind(): abasto, estaciones/recorridos, fragmento/corredores/refugios/desplazamientos, suelo, gobernanza
   (null cuando no tocan), par, propuesta. Las simulaciones anteriores (plan parcial, metro + alimentadores, techos...) ya no existen; su código queda
   para tools/ y se puede volver a usar (predio = null).

   NUEVO (2026-11-23):
   · congestion (%) y tiempo10km (min): CALIBRADOS CON EL TOMTOM TRAFFIC INDEX (ver TOMTOM abajo). congestion = tiempo extra de viaje frente a flujo libre,
     como lo define TomTom. Semana 0 = la cifra publicada de Bogotá (2025: 69,6 %, 31 min 45 s por 10 km). Crece con la curva BPR:
     congestion = C₀·trafico⁴ (Bureau of Public Roads 1964, exponente 4, el estándar de asignación de tráfico).
   · predio: el predio del Plan Parcial Fábrica Bavaria (sim. 4) o el instituto en Bavaria (sims. 2, 9, 10, 11); null en las demás. Ver PREDIO abajo.
   · eventos: avisos NUEVOS de la semana para la interfaz (casi siempre vacío). Ver AVISOS abajo.
   · basura {total_t_dia, puntos[{x,z,t_dia,fuente}], acumulada, acumulada0, sinRecoger_t_dia}, ratas / ratas0, humedalHa / humedalHa0: ver BASURA abajo.
   · cierre (sims. 8 y 9) {via, sem, dur, on, fase 0–1, vias_desvio[{id,n}], traficoDesvio, ruidoExtraDb}: ver CIERRE GRADUAL abajo.
   · presion y recuperacion (0–1) para las láminas 3D; comidaLocal (% de la gente que comería de las huertas); ref (referencia del año 1, ver REF).
   · humedalFuncional (% del área funcional de hoy), humedales [{id, nombre, x, z, ha, ha0, calidad}], arboles / arbolesPerdidos, basura.puntos con fuente 'humedal'
     (bordes de El Burro, La Vaca y Techo) y acumulada por punto, basura.fraccionSinRecoger, basura.captura; regla de game over nueva «humedal»; la regla «habitat»
     se compara con el año 1 (ver REGLAS y ESTADO ACTUAL QUE SE DEGRADA).
   · metro {fase 'obra'|'opera', desde, avance, reduccion, estaciones[{n,x,z,terminada,peatonesDia}]} (Línea 1 en TODAS las simulaciones; sim. 7 = metro +
     alimentadores y ciclorrutas), circular {organicos_t_dia, compostado_t_dia, indice, comidaLocal_t_dia, flujos[{de,a,t_dia,tipo}]}, especulacion {indice, hogaresRiesgo,
     proteccion, zonas[{x,z,indice}]}: ver METRO_SUP, ECONOMÍA CIRCULAR y SUELO_SUP. Deslizadores nuevos: proteccion (todas), P2.frac (2, 3, 10, 11).
   · SIMS[i].grupo ('actual' | 'propuesta') y preguntas «¿Qué pasaría si …?»; 5 a 7 deslizadores por simulación (EXTRA_SL).

   ÍNDICES QUE NO ESTÁN EN sim_vida.js (cómo se calculan aquí):
   · trafico: índice de vehículos V de sim_vida.js (carros +1,5 %/año, motos y camiones 0 %; 1 = hoy; en D suma los carros del plan parcial),
     × (1 − reducción del metro × fracción del flujo vial que pasa a 800 m o menos del eje) desde que opera. El flujo sale de la grabación SUMO.
   · ruidoDb: promedio de los niveles de todas las celdas de vía de 16 m (como el panel de ruido del simulador, data3d/capas_escenario.js:
     «Ruido promedio» = promedio de los niveles de todas las celdas de vía). Nivel de hoy por celda = fórmula del simulador (tools/simulaciones_datos.mjs);
     cada semana se le suma 10·log10(factor de tráfico de la celda) (regla de energía del simulador: dB = 10·log10(propuesta/hoy)).
     [SUP] un cierre de vía no cambia el ruido ni el índice de tráfico (los mismos vehículos se desvían; el modelo semanal no reparte el desvío).
   · callesRuidosas: % de celdas de vía con 65 dB o más (banda «naranja · ruidoso» del simulador, que cuenta 65 como ruidoso). callesOMS: % con 53 dB o más
     (la OMS 2018 recomienda menos de 53 dB Lden). Ojo: la fórmula del simulador limita el desvío a +5 dB, así que muchas calles locales quedan justo
     en 65,0 dB: un cambio pequeño de tráfico mueve muchas celdas de banda.
   · atropellos: ÍNDICE [SUP], no un conteo observado. Probabilidad de morir al cruzar = 1 − e^(−c·Q) (Hels y Buchwald 2001, c = 1,3·10⁻⁴ por veh/día,
     el mismo de sim_vida.js), Q = flujo de las vías principales que corta la línea entre dos parches (data3d/exposicion_trafico.js) × tráfico de la semana.
     [SUP] cada parche ocupado por una especie terrestre (rana, serpiente, curí, lagartija, comadreja, rata, caracol) emite UN dispersante por semana,
     que va a otro parche con el mismo núcleo de dispersión de sim_vida.js (e^(−d/D)·√ha). atropellos = dispersantes que se espera mueran esa semana.
   · zonas.soporteEco: 1 − Π_parches (1 − r_p·e^(−d/300 m)), r_p = fracción de las 23 especies de fauna presentes en el parche. 300 m: distancia
     lineal de acceso a un espacio verde que recomienda la OMS (WHO Europe 2016, Urban green spaces and health; indicador «espacio verde de
     0,5–1 ha a 300 m»: https://www.who.int/europe/publications/i/item/WHO-EURO-2016-3352-43111-60341). [SUP] usar ese radio como alcance del soporte.
   · zonas.comercio: de lo que la zona COMPRA (todo lo que recibe menos lo de sus huertas), fracción que vende la red local (mercados de barrio,
     plazoletas o Bavaria) en vez de Corabastos; 0 si no compra nada. zonas.cora: fracción de lo que necesita que llega de Corabastos.
   · red: INTERACCIONES LOCALES = suma sobre parches de los enlaces de la red cuyos dos extremos están en ese parche (o el otro extremo al alcance
     de dispersión del grupo de la especie de fauna, la regla de recursos de red_trofica.js); red0 = la de la semana 0. redTipos / redTipos0 = el
     conteo anterior (enlaces distintos realizados en algún parche, máximo 249). poliniz = pares especie × parche ocupados por polinizadores
     (especies con enlace de visita floral/polinización, tipo 5 de biotica.json: abeja, colibrí, ...); poliniz0 = semana 0; polinizEsp = especies.
   · extinciones: una especie desaparece de TODA Kennedy esa semana; parche = su último parche (si eran varios a la vez, el de más área);
     motivo = el que anotó data3d/red_trofica.js al extinguirse en ese parche (sin recursos de la red, tráfico y ruido, tala, humedal degradado o
     azar demográfico). */
import { redCompleta, evaluarEstado } from './evaluacion_ecologica.js?v=2';
import * as V from './sim_vida.js?v=ab02';
import { crearRed, MOTIVOS } from './red_trofica.js?v=3';
import { ZONAS, PARCHES, CIERRES, BODEGAS, MERCADOS, COSTO } from './sim_red_datos.js?v=2';
import { EXPO } from './exposicion_trafico.js?v=1';
import { PLAN_BAV } from './plan_bavaria_datos.js?v=2'; // la misma instancia que usa sim_vida.js
import { ORG_KG_HAB_DIA } from './sim_fuentes.js';

const NZ = ZONAS.length, NP = PARCHES.length;
export const ZONAS_XZ = ZONAS.map(z => [z[0], z[1]]); // centro de cada zona de 500 m, marco MUNDO del simulador (x este, z sur)
export const SEMANAS_FIN = 780; // 20 años de 52 semanas
export const SEMANAS = SEMANAS_FIN; // nombre anterior (compatibilidad)
export const FASES = [{ n: 'Corto plazo', a0: 1, a1: 5 }, { n: 'Mediano plazo', a0: 6, a1: 10 }, { n: 'Largo plazo', a0: 11, a1: 20 }];

/* ---------- TOMTOM: calibración de la congestión ----------
   TomTom Traffic Index, Bogotá, año 2025: nivel de congestión 69,6 %, 31 min 45 s para recorrer 10 km, séptima ciudad
   más congestionada del mundo, 153 horas perdidas en hora pico; +7,7 puntos frente a 2024 (≈ 61,9 %) y casi dos minutos más por 10 km
   (2024: 29 min 23 s según Portafolio; 2023: 25 min 30 s, puesto 19 de 387).
     https://www.tomtom.com/traffic-index/bogota-traffic/
     https://www.portafolio.co/economia/regiones/bogota-cada-ano-con-un-trafico-que-sigue-empeorando-nivel-de-congestion-en-la-ciudad-crecio-7-7-en-487350
     https://www.elcarrocolombiano.com/movilidad/bogotanos-pierden-cinco-dias-al-ano-en-el-trafico-segun-indice-tomtom-2023/
   No se usa la API de TomTom (no hay llave): solo las cifras publicadas.
   · congestión de TomTom = tiempo de viaje / tiempo en flujo libre − 1  →  flujo libre = 31,75 / 1,696 = 18,7 min por 10 km.
   · curva BPR: tiempo / flujo libre = 1 + α·(v/c)^β, β = 4 (Bureau of Public Roads 1964, Traffic Assignment Manual). La congestión es entonces
     proporcional a (v/c)^4 y, con la capacidad vial fija, a trafico^4: congestion = 69,6 %·trafico⁴. [SUP] la capacidad vial no cambia en 20 años
     (ninguna vía nueva en el modelo salvo las internas del plan parcial) y el índice de tráfico del modelo representa la demanda vehicular de Bogotá.
   · tendencia: con el crecimiento del parque de sim_vida.js (+1,5 %/año los carros) el modelo da +3 puntos de congestión el primer año; TomTom midió
     +7,7 puntos en 2025 y +6 %/año en tiempo por 10 km entre 2023 y 2025, años con las obras del metro y de las troncales (Av. 68, Calle 13) que
     quitan capacidad. [SUP] el modelo no suma ese efecto de obra: es la proyección CONSERVADORA (sin obras); se reporta la diferencia. */
export const TOMTOM = { anio: 2025, congestion: 69.6, min10km: 31.75, libre: 31.75 / 1.696, beta: 4, prevAnio: 2024, prevCongestion: 61.9,
  fuentes: ['https://www.tomtom.com/traffic-index/bogota-traffic/',
    'https://www.portafolio.co/economia/regiones/bogota-cada-ano-con-un-trafico-que-sigue-empeorando-nivel-de-congestion-en-la-ciudad-crecio-7-7-en-487350'] };

/* ---------- PREDIO del Plan Parcial Fábrica Bavaria (sim. 4) e instituto en Bavaria (sims. 2, 9, 10, 11) ----------
   Datos del plan (Decreto Distrital 448 de 2023): data3d/plan_bavaria_datos.js (viviendas por año 1–10, 14.002 en total; 2,76 personas por hogar;
   0,31 autos por hogar) y data3d/plan_bavaria.json, resumido por tools/predio_bavaria_datos.mjs en PREDIO_PLAN (tramos de calzada que se abren
   cada año, m² de comercio que abren cada año, distancia de cada parche cercano a la calzada abierta más cercana).
   VIAJES (vehículos que entran o salen del predio por día, por las vías nuevas):
   · vivienda: viviendas terminadas × 0,31 autos × VIAJES_AUTO viajes por día × (1 + EXTRA_VIV).
   · comercio: m² de comercio abiertos × VIAJES_COM.
   · obra: viviendas de la etapa en curso × CAMIONES_VIV camiones por día (solo mientras se construye; años 1–10).
   TRÁFICO alrededor del predio: Q₀ = flujo de la vía principal más cercana al bosque de Bavaria en la grabación SUMO (data3d/exposicion_trafico.js:
     10.291 veh/día) × índice de tráfico de Kennedy; en la ENTRADA más cargada predio.trafico = (Q₀·trafico + viajes nuevos / accesos) / Q₀ (deslizador
     planAccesos, 2 por defecto); trafico0 = 1. vehiculosDia = todos los viajes nuevos del predio.
   RUIDO en las entradas del predio: la fórmula del simulador (data3d/capas_escenario.js) para una vía principal, L = 74 dB + 10·log10(Q / 14.049),
     14.049 veh/día = mediana de las vías principales de la grabación (EXPO.medianaVia); un camión = 4 carros (capas_escenario.js). ruidoDb0 = hoy.
     Subir el flujo × k sube el ruido 10·log10(k) dB (regla de energía). Mientras hay obra, el frente de obra (OBRA_DB) también cuenta para la fauna.
   FAUNA (sale de las reglas del modelo, sin forzar):
   · NIDOS: la tala del plan (árboles del bosque de Bavaria que caen por etapa, data3d/plan_bavaria.json) ya baja la calidad del bosque en sim_vida.js
     y quita los nodos de flora talados de la red trófica (red_trofica.js): menos lugares de anidación y refugio.
   · RUIDO: cada vía nueva crea su zona de efecto con la misma regla de las vías de hoy (sim_vida.js, Reijnen y Foppen 1997: distancia de efecto
     ∝ Q^0,4, 300 m con el flujo mediano de hoy; 25 % menos densidad de aves dentro). Flujo de la vía nueva más cargada = S_VIA × viajes nuevos.
     Fracción de cada parche cercano dentro de esa zona (círculo del área del parche, distancia a la calzada abierta más cercana); el factor extra
     (1 − 0,25·máx(f_nueva, f_hoy)) / (1 − 0,25·f_hoy) multiplica la calidad del parche para las aves (s.red.xAve, red_trofica.js).
   · especiesFuera: especies cuya ocupación de los parches del predio (a PREDIO_RADIO m o menos del centro) es menor que al inicio; causa = 'ruido'
     si es ave y el factor de ruido de alguno de sus parches iniciales bajó 10 % o más, 'nidos' si estaba en el bosque de Bavaria y ya se taló 10 %
     o más de sus árboles, 'ambas' si las dos. Las salidas sin ninguna de esas causas (azar demográfico) no se listan.
   INSTITUTO (B): no hay viviendas ni vías nuevas; los camiones del acopio: lo que reparte Bavaria (kg/semana) / 7 / CARGA_CAMION × 4 (la carga
     entra y sale, y cada camión va y vuelve). La huerta central de B es hábitat desde que monta 20 % de sus superficies (sim_vida.js). */
export const PREDIO_SUP = {
  VIAJES_AUTO: 2,      // [SUP] cada auto sale y vuelve una vez al día (ida y vuelta = 2 movimientos en las entradas)
  EXTRA_VIV: 0.3,      // [SUP] +30 % por taxis, domicilios, visitas y motos de los hogares nuevos (sin cifra por hogar en la Encuesta de Movilidad 2023)
  VIAJES_COM: 0.06,    // [SUP] viajes en vehículo por m² de comercio y día: ITE Trip Generation (centro comercial, ~0,4 viajes/m²·día en EE. UU.) × 15 %
                       //       (participación del auto en Bogotá, Encuesta de Movilidad 2023, ~13–15 %)
  CAMIONES_VIV: 0.07,  // [SUP] movimientos de camión por vivienda en obra y día: ~70 m² por vivienda × ~1 m³ de concreto y material por m², 8 m³ por viaje,
                       //       250 días hábiles al año = 0,035 viajes, ida y vuelta = 0,07
  CAMION_EQ: 4,        // un camión suena como 4 carros (la regla de data3d/capas_escenario.js)
  S_VIA: 0.5,          // [SUP] la vía nueva más cargada lleva la mitad de los viajes (dos accesos principales en el plano del decreto)
  L_PRINCIPAL: 74,     // dB de una vía principal con el flujo mediano (LREF de capas_escenario.js)
  CARGA_CAMION: 8000,  // [SUP] kg por camión del acopio de Bavaria
  PREDIO_RADIO: 1000,  // m: parches «del predio o junto a él» (centro del predio, data3d/plan_bavaria_datos.js)
  OBRA_DB: 80,         // dB(A) a 15 m de un frente de obra: FHWA Roadway Construction Noise Model (2006), excavadora 81, mezcladora 79, volqueta 76 dB(A) a 50 ft
                       //   (https://www.fhwa.dot.gov/environment/noise/construction_noise/rcnm/). Para la zona de efecto se pasa a flujo equivalente de vía
                       //   principal: 14.049·10^((80 − 74)/10) ≈ 56.000 veh/día, mientras haya obra.
  OBRA_VIV: 1000       // [SUP] el frente de obra completo corresponde a 1.000 viviendas en obra o más en el año (menos viviendas, frente proporcional)
};
// generado por tools/predio_bavaria_datos.mjs (índice = año del plan − 1)
const PREDIO_PLAN = { vias: [9, 8, 14, 15, 8, 7, 7, 7, 1, 4], com: [0, 0, 49456, 0, 0, 42208, 0, 0, 0, 0],
  dist: { bosqueBav: [11, 11, 11, 11, 11, 11, 11, 11, 11, 11], pq6: [747, 709, 709, 709, 709, 709, 709, 709, 709, 709], pq17: [634, 634, 546, 533, 439, 359, 359, 359, 359, 359],
    cu8: [250, 185, 184, 184, 184, 184, 184, 184, 184, 184], hp1: [479, 414, 336, 336, 213, 128, 128, 128, 128, 128], hp14: [622, 596, 584, 584, 368, 368, 368, 368, 368, 368],
    huertaBav: [61, 41, 14, 14, 14, 14, 14, 14, 14, 14] }, haPredio: 69.3 };
const PI_BOSQUE = PARCHES.findIndex(p => p.id === 'bosqueBav');
const PRED_P = PARCHES.map((p, i) => [i, Math.hypot(p.x - PLAN_BAV.CENTRO[0], p.z - PLAN_BAV.CENTRO[1])]).filter(a => a[1] <= PREDIO_SUP.PREDIO_RADIO).map(a => a[0]);
const RP_M = PARCHES.map(p => Math.sqrt(Math.max(0.05, p.ha) * 1e4 / Math.PI)); // radio del círculo con el área del parche (como sim_vida.js)
const Q0_PREDIO = EXPO.parches[PI_BOSQUE] ? EXPO.parches[PI_BOSQUE][1] : EXPO.medianaVia;
const dBvia = (Q) => PREDIO_SUP.L_PRINCIPAL + 10 * Math.log10(Math.max(1, Q) / EXPO.medianaVia);
const cl01 = (v) => v < 0 ? 0 : v > 1 ? 1 : v;
const fZonaP = (d, r, D) => cl01((D - (d - r)) / (2 * r));

/* ---------- BASURA: Corabastos, mercado de flores y vivienda alrededor ----------
   Generación (t/día):
   · Corabastos: CORA_T = 100 t/día (contextoganadero.com: «diariamente salen 100 toneladas de residuos», 65 % orgánico; el Observatorio Ambiental
     de Bogotá da 50,9 t/día solo de residuos vegetales: https://oab2.ambientebogota.gov.co/documents/10184/506375/Gesti%C3%B3n+de+los+residuos+org%C3%A1nicos+en+las+plazas+de+mercado+de+Bogot%C3%A1.pdf).
     Se escala con lo que mueve Corabastos (dependencia de Corabastos de sim_vida.js frente a la semana 1): si la red o el instituto le quitan
     carga, o Corabastos cierra (sim. 5), genera menos.
   · mercado de flores junto a Corabastos: FLORES_T = 5 t/día [SUP: no se encontró cifra; flores y follaje que no se venden]. Posición aproximada [SUP].
   · vivienda: KG_HAB = 0,72 kg/persona·día = 5.680 t/día del servicio ordinario de Bogotá (UAESP, abril 2026: https://bogota.gov.co/mi-ciudad/habitat/aumenta-la-produccion-de-residuos-solidos-en-bogota-segun-uaesp)
     / 7,9 millones de habitantes. Puntos = zonas de 500 m con centro a RADIO m o menos de Corabastos; total_t_dia suma toda Kennedy.
   · crecimiento: 2,7 %/año (UAESP: +5,5 % en el relleno Doña Juana entre 2024 y 2026). Deslizador basuraCrece.
   SIN RECOGER: 1 − recolección; 84 % es una hipótesis del modelo. Las 1.089 t/día en puntos críticos también fueron recogidas,
   por lo que no permiten estimar la fracción no recolectada. No hay una medición local comparable para este parámetro.
     En B y C la fracción orgánica que separa la red (sep / gen de sim_vida.js × 51,32 % orgánico, proxy UAESP 2017 para Bogotá) ya no queda en la calle.
   ACUMULADA (t): cada punto acumula lo que no se recoge y la limpieza de puntos críticos retira LIMPIEZA = 1/8 por semana [SUP: un punto crítico dura
     unas 5–6 semanas]. Arranca en equilibrio con la generación de hoy (acumulada0).
   EFECTOS (salen del modelo, parámetros [SUP]):
   · ratas = acumulada / acumulada0 (índice, 1 = hoy) y el hábitat de la rata en la red trófica se multiplica por ese índice (s.red.fRata).
   · aves cerca de Corabastos: la calidad para las aves de los parches a 1.000 m o menos se divide por 1 + AVE_RATA·(ratas − 1)·e^(−d/500)
     [SUP AVE_RATA = 0,5: las ratas depredan nidos y la basura espanta aves; no se encontró una relación dosis-efecto].
   · humedales: cada humedal pierde área por relleno con basura al ritmo HA_T × Σ (t/día sin recoger de cada punto × e^(−d/500)) por semana
     [SUP HA_T = 3,3·10⁻⁵ ha por semana por t/día: con el estado actual el humedal La Vaca pierde ~1 ha en 20 años; no hay tasa medida]. El área perdida
     baja el hábitat de todas las especies del humedal como √(área / área inicial) (s.red.xH; la misma dependencia con √área de sim_vida.js).
     humedalHa suma el borde restaurado de La Vaca (desmonte de bodegas) cuando existe. */
export const BASURA_SUP = { CORA_T: 100, FLORES_T: 5, KG_HAB: 0.72, CRECE: 0.027, RECOLECCION: 0.84, LIMPIEZA: 1 / 8, RADIO: 1500, ORGANICO: 0.5132, AVE_RATA: 0.5, HA_T: 3.3e-5, D_EXP: 500,
  ARROJO_EXTRA: 0.032, HUM_T: 7, K_CONT: 0.35, TALA_URB: 0.005 };
/* ESTADO ACTUAL QUE SE DEGRADA (2026-11-23):
   · arrojo clandestino que crece más rápido que la basura: 968 t/día arrojadas a la calle (UAESP citada por El Tiempo,
     https://www.eltiempo.com/bogota/en-bogota-tiran-968-toneladas-de-basura-a-las-calles-todos-los-dias-uaesp-reporta-un-aumento-del-19-en-el-arrojo-clandestino-de-desechos-3521912 ,
     con +19 % de arrojo clandestino) → 1.089 t/día en puntos críticos y arrojo (UAESP, abril 2026): ≈ +6 %/año frente a +2,7 %/año de la basura →
     la fracción sin recoger crece ARROJO_EXTRA = 1,06 / 1,027 − 1 ≈ 3,2 %/año [SUP: dos años entre las dos cifras].
   · basura en los bordes de los humedales (puntos fuente 'humedal'): HUM_T = 7 t/día hoy repartidas entre El Burro, La Vaca y Techo según √área
     [SUP: ~5 % de lo que Kennedy arroja en puntos críticos, 1.089 t/día × 13 % (población de Kennedy en Bogotá)]; crece con el arrojo clandestino.
     La basura acumulada en el borde baja la calidad del humedal para toda su fauna como 1 / (1 + K_CONT·(acumulada / acumulada de hoy − 1))
     [SUP K_CONT = 0,35: no hay relación dosis-efecto publicada; con él el estado actual pierde ~30 % del área funcional hacia los años 12–14].
     Área funcional = Σ área × calidad / Σ área de hoy (+ el borde restaurado de La Vaca cuando existe): regla de game over «humedal».
   · la red de la propuesta (B y C: mercados y Bavaria Común con compost) recoge la fracción orgánica (51,32 %, proxy distrital UAESP 2017) de lo que antes se arrojaba, en
     proporción a los nodos abiertos (calendario de mercados_red.js) [SUP]; los techos (sim. 12) compostan en casa solo los orgánicos de los hogares con huerta (≈ 0,3 % de Kennedy: casi no cambia el arrojo).
   · árboles: TALA_URB = 0,5 %/año menos árboles en los parques del estado actual [SUP: en 2024 se autorizaron 4.390 intervenciones de árboles por
     riesgo y se cayeron 609 (https://bogota.gov.co/mi-ciudad/ambiente/emergencias-por-arboles-atendidas-en-bogota-balance-durante-de-2024), ~0,2–0,3 % de
     ~1,5 millones; las compensaciones se siembran sobre todo fuera de la localidad, en Usme y Sumapaz (U. Nacional, vía Radio Nacional 2025:
     https://radionacional.co/actualidad/medio-ambiente/preocupante-deficit-de-arboles-en-la-capital-del-pais), y Kennedy tiene obras del metro, Av. 68 y
     Primero de Mayo]. En las simulaciones de la propuesta (B, C, techos) la tala se compensa dentro de Kennedy (módulos con árboles nativos) [SUP]. */

/* ---------- CIERRE GRADUAL Y DESVÍOS (sims. 8 y 9) ----------
   El cierre de sim_vida.js corta la vía de una vez para el abastecimiento. Aquí se agrega la OBRA por fases: [SUP] los carriles se cierran en 3 fases
   iguales durante el primer 30 % del cierre (fase 1/3, 2/3, 1) y se reabren en 3 fases durante el último 20 %. El tráfico de la vía cerrada se
   reparte entre las vías principales paralelas a 2,5 km o menos (tools/cierre_desvios_datos.mjs, OpenStreetMap): para la Av. de las Américas,
   SOLO la Av. Primero de Mayo. CORRECCIÓN 2026-11-26: antes figuraba también la «Av. Calle 6», pero en OpenStreetMap los 5,3 km de vía principal
   llamados «Avenida Calle 6» en Kennedy tienen alt_name «Avenida de las Américas»: son la MISMA vía que se cierra (comprobado con
   instalacion/maqueta/fuentes/osm_calles_kennedy.json), así que el desvío iba por la vía cerrada. traficoDesvio = 1 + DESV·fase, con DESV = parte
   del tráfico de la vía cerrada que absorbe la Primero de Mayo [SUP, deslizador «desvioMayo», 50 % por defecto: el resto se reparte por la red
   local, que el 3D dibuja con los desvíos de data3d/cierre_gradual.js]; ruidoExtraDb = 10·log10(traficoDesvio). Fauna: cada parche a 600 m o menos de una vía de desvío recibe la zona de efecto de su tráfico
   (la regla de sim_vida.js, distancia ∝ Q^0,4, 25 % menos aves dentro). */
export const DESVIO_SUP = { DESV: 0.5, SUBE: 0.3, SUBE_MAX: 13, BAJA: 0.2, RADIO: 600 }; /* SUBE_MAX [SUP]: la obra cierra en 3 fases en el menor entre el 30 % del cierre y 13 semanas (un trimestre); sim_vida.js usa el mismo lapso para que las rutas de comida se alarguen poco a poco */
// generado por tools/cierre_desvios_datos.mjs: distancia (m) de cada parche (orden de sim_red_datos.js) a cada vía
const DESVIOS = { americas: { n: 'Av. de las Américas', desvio: ['mayo'] },
  vias: { mayo: { n: 'Av. Primero de Mayo', dist: [2458, 1484, 2857, 2413, 3075, 4699, 618, 1008, 1003, 1976, 3261, 1556, 2914, 4812, 2829, 1666, 2771, 894, 413, 3335, 2860, 3907, 1913, 2397, 271, 342, 204, 947, 2201, 2900, 2422, 1660, 2869, 2016, 3614, 2472, 3499, 940, 2174, 299, 924, 3119, 3712, 1189, 2968, 113, 395, 558, 593, 3182, 2835, 4283, 1052, 3707, 4073, 372, 1492, 283, 3789, 643, 2408, 3323, 4086, 3012, 1471, 1046, 126, 370, 675, 2467, 1474] } } };
if (DESVIOS.vias.mayo.dist.length !== NP) throw new Error('DESVIOS no corresponde a los parches de sim_red_datos.js (correr tools/cierre_desvios_datos.mjs)');

/* ---------- METRO LÍNEA 1 EN TODAS LAS SIMULACIONES (proyecto real en obra) ----------
   Estaciones en Kennedy (data3d/metro_l1.js, posiciones sobre el eje real de OpenStreetMap; tools/metro_eje.mjs): obra con 83,7 % de avance en sep-2026,
   estaciones terminadas en la semana 52 (2027) y operación comercial desde la semana 114 (15-mar-2028) [SUP de metro_l1.js]. Efecto: METRO_RED menos
   vehículos a 800 m o menos del eje (SUP_SIMS). La sim. 7 pasa a «Metro + alimentadores y ciclorrutas» con una reducción mayor (deslizador metroRed).
   PEATONES alrededor de cada estación: personas a 800 m × VIAJES_PERS × PART_METRO [SUP: 2 viajes por persona y día y 10 % en metro; Encuesta de
   Movilidad 2023: ~2 viajes por persona; la participación del metro es supuesta]. */
export const METRO_SUP = { EST: [{ n: 'Portal Américas', x: -242, z: 1269 }, { n: 'Ciudad Kennedy', x: 299, z: 2069 }, { n: 'Timiza', x: 982, z: 2637 },
  { n: 'Hospital de Kennedy', x: 2128, z: 2434 }, { n: 'Avenida Boyacá', x: 3243, z: 2400 }], SEM_EST: 52, AVANCE: 83.7, VIAJES_PERS: 2, PART_METRO: 0.10, RADIO: 800 };

/* ---------- ECONOMÍA CIRCULAR ----------
   indice = fracción de los orgánicos de Kennedy que vuelve como abono a huertas = (tratado en las plantas de compost de la red + compost casero) / orgánicos
   generados (sim_vida.js: desv, gen; en A el 2 % × adopción se composta en casa). Flujos: orgánicos de los hogares al relleno Doña Juana (A) o a Bavaria
   Común / los mercados nodo (B, C); compost de vuelta a las huertas; alimentos de las huertas a los mercados y de los mercados/Corabastos a los hogares. */

/* ---------- ESPECULACIÓN DEL SUELO ----------
   Índice de precio del suelo por zona (1 = hoy, en términos reales frente al resto de Bogotá):
   · metro: los predios a menos de 800 m de las estaciones de la Línea 1 ya subieron 11,7 % en la fase de anuncio (2019) y 8,8 % en la de construcción
     (2023) (BogoTank, U. de los Andes y ProBogotá, con catastro; https://www.infobae.com/colombia/2026/02/21/el-metro-de-bogota-aun-no-arranca-y-ya-disparo-la-valorizacion-inmobiliaria-en-zonas-aledanas-estas-son-las-cifras/):
     eso ya está en el «hoy». Al operar se suma P_METRO = 13 % (la extensión de TransMilenio subió 13–14 % los precios de oferta en su zona de influencia:
     Rodríguez y Mojica, Lincoln Institute, https://www.lincolninst.edu/es/publications/articles/efecto-del-sistema-autobus-transporte-rapido-sobre-el-valor-del-suelo/),
     en 2 años desde la apertura [SUP], con peso 1 − d/800 m.
   · plan parcial (sim. 4): P_PLAN = 25 % a 1 km o menos del predio, en proporción a las viviendas terminadas [SUP: renovación urbana con 14.000 viviendas y
     comercio; no se encontró una cifra medida para Bogotá].
   · hogaresRiesgo = hogares de la zona × 55,1 % en arriendo (Encuesta Multipropósito 2025, Bogotá urbana; https://www.valoraanalitik.com/?p=623882) ×
     mín(1, K_DESP·(índice − 1)) × (1 − protección) [SUP K_DESP = 1: cada 10 % de alza deja al 10 % de los arrendatarios con riesgo de no poder pagar].
   · protección (deslizador «Vivienda protegida y captura de plusvalías»): parte del alza que no llega a los arriendos (captura de plusvalías del Distrito,
     vivienda de interés social protegida, suelo comunitario). Por defecto 0 en las simulaciones del estado actual y 30 % en las de la propuesta (Bavaria
     Común como instituto y suelo comunitario, mercados comunitarios) [SUP]. El alza del índice se reduce a la mitad de la protección (la plusvalía capturada). */
export const SUELO_SUP = { P_METRO: 0.13, RAMPA: 104, P_PLAN: 0.25, RADIO_PLAN: 1000, ARRIENDO: 0.551, K_DESP: 1, PROT_PROP: 30 };

/* ---------- supuestos de este módulo ---------- */
export const SUP_SIMS = {
  METRO_SEM: 114,      // [SUP] la Línea 1 opera desde la semana 114 (la que usa data3d/metro_l1.js y el Escenario 1 de index.html)
  METRO_RED: 0.10,     // [SUP] 10 % menos vehículos cerca del corredor desde que opera (el mismo de index.html, commit bb69d22). No hay cifra oficial. Vale para TODAS las simulaciones.
  METRO_RED_ALIM: 0.25, // [SUP] sim. 7: metro + buses alimentadores reorganizados + ciclorrutas a las estaciones: 25 % (el doble y medio; sin cifra oficial)
  METRO_RADIO: 800,    // [SUP] «cerca del corredor» = 800 m o menos del eje (caminata típica a una estación; el de tools/escenarios_instalacion.mjs)
  SIN_CORA: 52,        // [SUP] e5: Corabastos deja de abastecer en la semana 52 (hipotético; no hay plan oficial de cierre)
  DESM_LIB: 1,         // [SUP] e6: la carga liberada de Corabastos tiende a 1 (el desmonte sigue el calendario de B y C)
  CIERRE_VIA: 'americas', CIERRE_T0: 4, CIERRE_DUR: 260, // [SUP] e8, e9, sim. 02: cierre forzado de la Av. de las Américas desde la semana 4 y durante 5 años (pedido de la autora, 2026-11-26)
  TECHOS_M2: 49000,    // e12: 4,9 ha de techos y balcones (desglose de P1.sup = 9,8 ha en data3d/sim_modelos.js: parques y lotes ~2 ha, techos y balcones ~4,9 ha, Bavaria ~2,9 ha)
  TECHOS_SEM: 156,     // e12: las superficies se montan en 3 años (la misma regla [SUP] de sim_vida.js para supF)
  M2_HUERTA: 50,       // m² por huerta (documento, sim_modelos.js area0): para contar los techos como huertas equivalentes
  RADIO_ECO: 300,      // m, ver zonas.soporteEco arriba (OMS 2016)
  CIERRES_AL_AZAR: false // [SUP] como en tools/escenarios_instalacion.mjs: cierres al azar sorteados pero sin efecto, para que las 12 se distingan
};

/* ---------- LAS 12 SIMULACIONES = 6 PARES (2026-11-23) ----------
   Cada par es una PRUEBA DE ESTRÉS. Las dos corridas del par arrancan iguales, con la misma semilla, la misma prueba y los MISMOS deslizadores; la única
   diferencia es la infraestructura propuesta: id 2k−1 = sin propuesta (escenario A de sim_vida.js: Corabastos, relleno Doña Juana, coordinación central),
   id 2k = con propuesta (escenario C: red distribuida de mercados de barrio con bodega y Estación Circular de compost, módulos de huertas, Bavaria Común
   forma promotores). El metro Línea 1 (contexto real) está en todas. Las pruebas:
   01 Abastecimiento · corte temporal de una parte del suministro externo: la capacidad de Corabastos (s.Kc de sim_vida.js) queda limitada a (1 − corte)
      de la que tenía al empezar, durante las semanas del corte (deslizadores corte, corteT0, corteDur).
   02 Movilidad · cierre temporal de la Av. de las Américas (cierre forzado de sim_vida.js + cierre gradual y desvíos). Con propuesta, [SUP] los pasajes y
      conexiones de Bavaria Común y los mercados distribuidos suman una tercera ruta de desvío: el tráfico desviado se reparte en tres y no en dos.
   03 Residuos · aumento de los residuos orgánicos (los kg/persona·día de SUP.KG_ORG de sim_vida.js suben orgAumento %, en un año desde orgT0).
      Sin: relleno Doña Juana (capacidad de referencia). Con: Estaciones Circulares en los mercados nodo (compost de proximidad).
   04 Biodiversidad · pérdida de una parte de un parche ecológico (parche, parchePerdida %, parcheT0): la calidad del parche para todas sus especies baja
      como √(área que queda) (la dependencia con el área de sim_vida.js). Con: conexiones vegetales (+0,2 de árboles en parques en 5 años), refugios
      (los módulos de huertas de C son hábitat) y restauración (recuperación del humedal × 1,5) [SUP: acciones de la propuesta].
   05 Población y especulación · presión inmobiliaria extra sobre los sectores que crecen (a 800 m de las estaciones y a 1 km del predio de Bavaria) y
      crecimiento de la población. Con: espacios productivos y comunitarios protegidos (mercados nodo, Bavaria Común) e instrumentos de gestión del suelo
      (deslizador proteccion: solo actúa en la corrida con propuesta).
   06 Gobernanza · recursos insuficientes para las necesidades de varios sectores (presupuesto % de la necesidad). Sin: una coordinación central reparte
      por población, con la información de hace medio año. Con: las asambleas locales (una Junta de Acción Comunal por sector, IDPAC) presentan
      prioridades y una federación con vocerías rotativas reparte según la necesidad reportada (ver GOBERNANZA abajo). */
export const PARES = [
  { par: 1, n: '01 Abastecimiento', prueba: 'La demanda de alimentos crece y Corabastos tiene un tope', capa: 'abasto',
    sin: 'Todo pasa por Corabastos: lo que se le pide crece con la ciudad y se acerca a su tope; más carga, más basura junto a los humedales.', con: 'La Plaza Distrital de Kennedy y los mercados de barrio de la propuesta (hasta 28 t/día cada uno) se abren con los años y reparten la demanda: a Corabastos entra menos.',
    visible: 'Un medidor de vidrio sobre Corabastos que se llena con la carga de cada franja horaria frente a su tope; con propuesta, un medidor por mercado.',
    pregSin: '¿Qué pasaría si Kennedy necesita cada año más comida y todo sigue pasando por Corabastos, que tiene un tope?', pregCon: '¿Qué pasaría si la comida que Kennedy necesita cada año se reparte entre Corabastos y los mercados de barrio, las huertas y los puntos de acopio?' },
  { par: 2, n: '02 Movilidad', prueba: 'Cierre temporal de una vía estratégica (Av. de las Américas)', capa: 'movilidad',
    sin: 'Los vehículos buscan rutas en la red existente.', con: 'Se evalúa la respuesta con mercados distribuidos, accesos y conexiones propuestas.',
    visible: 'Vías, vehículos y congestión: rutas, velocidades y acumulación de vehículos.',
    pregSin: '¿Qué pasaría si se cierra la Av. de las Américas y los carros solo tienen las vías de hoy?', pregCon: '¿Qué pasaría si se cierra la Av. de las Américas y ya existen los mercados distribuidos y las conexiones nuevas?' },
  { par: 3, n: '03 Residuos', prueba: 'Aumento de residuos orgánicos', capa: 'residuos',
    sin: 'Continúa la capacidad de tratamiento de referencia.', con: 'Se habilita una red de Estaciones Circulares distribuidas y compostaje de proximidad.',
    visible: 'Estaciones Circulares y residuos: nodos de tratamiento, acumulación y recorridos.',
    pregSin: '¿Qué pasaría si aumentan los residuos orgánicos y todo sigue yendo al relleno Doña Juana?', pregCon: '¿Qué pasaría si aumentan los residuos orgánicos y hay Estaciones Circulares de compost en los barrios?' },
  { par: 4, n: '04 Biodiversidad', prueba: 'Fragmentación o pérdida de un corredor verde', capa: 'biodiversidad',
    sin: 'Las especies responden al hábitat y las barreras existentes.', con: 'Se incorporan conexiones vegetales, refugios y restauración de hábitat.',
    visible: 'Hábitat, especies y conexiones: ocupación de corredores verdes y desplazamientos posibles.',
    pregSin: '¿Qué pasaría si se pierde parte de un humedal o del bosque de Bavaria y las especies solo tienen los corredores verdes de hoy?', pregCon: '¿Qué pasaría si se pierde parte de un humedal o del bosque de Bavaria y hay conexiones vegetales, refugios y restauración?' },
  { par: 5, n: '05 Población y especulación', prueba: 'Aumento de la población bajo las mismas condiciones en ambos escenarios', capa: 'suelo',
    sin: 'Los inmuebles y actividades responden a la presión de mercado bajo las reglas de referencia.', con: 'Se implementan espacios productivos y comunitarios protegidos e instrumentos de gestión del suelo.',
    visible: 'Usos del suelo y presión inmobiliaria: actividades que permanecen, se desplazan o cambian de uso.',
    pregSin: '¿Qué pasaría si aumenta la población y los predios siguen cambiando de uso sin protección colectiva?', pregCon: '¿Qué pasaría si aumenta igual la población y las manzanas colectivas protegen usos productivos, comunitarios y ecológicos?' },
  { par: 6, n: '06 Gobernanza política', prueba: 'Recursos insuficientes para atender simultáneamente las necesidades de varios barrios', capa: 'gobernanza',
    sin: 'Una coordinación central decide dónde asignarlos.', con: 'Las asambleas locales presentan prioridades y una federación con vocerías rotativas coordina su distribución.',
    visible: 'Asambleas, recursos y decisiones: acuerdos, asignaciones y equipamientos que se habilitan.',
    pregSin: '¿Qué pasaría si no alcanzan los recursos para todos los barrios y una oficina central decide a dónde van?', pregCon: '¿Qué pasaría si no alcanzan los recursos y las asambleas de cada barrio, con una federación de vocerías rotativas, deciden cómo repartirlos?' }];
const capAc = Math.round(V.CAP_RED_TDIA * 10) / 10;
const sArb = { k: 'P3.arboles', n: 'Densidad de árboles en parques', min: 0, max: 1, paso: 0.05, val: 0.4, unidad: '0–1', ayuda: 'Sube la calidad de los parques como hábitat (sim_vida.js: 0,3 + 0,3·tamaño + 0,2·árboles).' };
const sRec = { k: 'P3.rec', n: 'Recuperación del humedal', min: 0, max: 0.1, paso: 0.005, val: 0.02, unidad: '/semana', ayuda: 'Qué tan rápido se recupera la calidad de los humedales frente a la presión urbana.' };
const sCap = { k: 'P1.capAcopio', n: 'Capacidad de acopio de los mercados', min: 20, max: 300, paso: 5, val: capAc, unidad: 't/día', ayuda: 'Frutas y verduras que pueden mover los mercados de barrio de la propuesta (los 35 de mercados_red.js). Sin propuesta no hay red.' };
const sCapRed = { ...sCap, val: 200, ayuda: 'Frutas y verduras que pueden mover los mercados de barrio y puntos de acopio de la propuesta; en un corte compran directo a productores de la región hasta esta capacidad [SUP: 200 t/día, ampliada desde 132 t/día de mercados_red.js]. Sin propuesta no hay red.' };
const sComp = { k: 'P2.cap', n: 'Capacidad de cada Estación Circular', min: 1000, max: 15000, paso: 500, val: 6000, unidad: 'kg/semana', ayuda: 'Orgánicos que trata cada Estación Circular de la propuesta. Sin propuesta todo va al relleno.' };
const sT0 = { k: 'cierreT0', n: 'Semana en que se cierra la vía', min: 1, max: 1000, paso: 1, val: SUP_SIMS.CIERRE_T0, unidad: 'semana', ayuda: 'Cierre forzado de la Av. de las Américas.' };
const sDur = { k: 'cierreDur', n: 'Duración del cierre', min: 1, max: 520, paso: 1, val: SUP_SIMS.CIERRE_DUR, unidad: 'semanas', ayuda: 'Las rutas que pasan por la vía se alargan: llega menos comida y se recogen menos orgánicos.' };
/* · trafCrece: crecimiento anual de los carros (V = 0,70·carros + 0,22·motos + 0,08·camiones, sim_vida.js). Por defecto 1,5 %/año (Registro Distrital Automotor).
   · pobCrece: crecimiento anual de la población (más comida, más orgánicos y [SUP] más carros en la misma proporción).
   · mitiga: % de calles pacificadas y con barreras verdes: [SUP] −3 dB en ellas (EEA 2010, https://www.eea.europa.eu/publications/eea_technical_report_2010_11). */
const sTraf = { k: 'trafCrece', n: 'Crecimiento anual del tráfico', min: 0, max: 3, paso: 0.1, val: 1.5, unidad: '%/año', ayuda: 'Carros nuevos cada año. 1,5 % = el parque automotor de Bogotá 2020–2024; la congestión parte de la medida de 2025 (69,6 %).' };
const sPob = (val = 0) => ({ k: 'pobCrece', n: 'Crecimiento de la población', min: -1, max: 3, paso: 0.1, val, unidad: '%/año', ayuda: 'Expansión y densificación de Kennedy: más comida necesaria, más orgánicos y más carros.' });
const sRuido = { k: 'mitiga', n: 'Calles pacificadas y con barreras verdes', min: 0, max: 100, paso: 5, val: 0, unidad: '%', ayuda: 'Calles a 30 km/h y con franjas verdes: unos 3 dB menos en ellas; menos ruido para las aves.' };
const sRecol = { k: 'recoleccion', n: 'Recolección de la basura', min: 50, max: 100, paso: 1, val: 84, unidad: '%', ayuda: '84 % es un supuesto de sensibilidad: no hay una tasa local de basura sin recoger. UAESP reporta también como RECOGIDOS los residuos de puntos críticos; no son el 16 % sin recoger.' };
const sFrac = { k: 'P2.frac', n: 'Hogares que separan los orgánicos', min: 0, max: 1, paso: 0.05, val: 0.4, unidad: '0–1', ayuda: 'Fracción de los hogares cubiertos que separa sus orgánicos para las Estaciones Circulares (sim_modelos.js: 0,4).' };
const PAR_SL = {
  /* par 01 (2026-11-25, docs/fuentes_abastecimiento.md): valores por defecto con fuente; rangos justificados en la ayuda de cada uno.
     «mercados» solo existe en la corrida con propuesta (ver SIMS abajo). */
  /* v3 (2026-11-26, docs/sim01_abastecimiento_v3.md): «Población de Kennedy» y «Demanda alimentaria» van ligadas (demanda = población × 0,951 kg ×
     consumo); su mínimo es el valor de hoy y se mueven solas con los años (ab01_panel.js). «demanda» pasa a ser el consumo por habitante. */
  1: [{ k: 'pobK', n: 'Población de Kennedy', min: 1034838, max: 1600000, paso: 1000, val: 1034838, unidad: 'hab', ayuda: 'Mínimo: 1.034.838 habitantes (dato de la autora). Crece sola con «Crecimiento de la población»; si la mueves, desde esa semana parte del valor elegido.' },
    { k: 'demT', n: 'Demanda alimentaria', min: 984, max: 1522, paso: 1, val: 984, unidad: 't/día', ayuda: 'Demanda = población × 0,951 kg/hab/día × consumo. Mínimo: la demanda de hoy (984 t/día). Ligada a la población: mover una mueve la otra.' },
    { k: 'demanda', n: 'Consumo por habitante', min: 70, max: 160, paso: 5, val: 100, unidad: '% de 0,951 kg/día', ayuda: '100 % = 0,951 kg por habitante al día: referencia de abastecimiento per cápita (mide abastecimiento, no consumo observado). Más de 100 % es una prueba de estrés declarada.' },
    { k: 'volumen', n: 'Ingreso a Corabastos', min: 60, max: 120, paso: 1, val: 100, unidad: '% de 6.460 t/día', ayuda: 'Lo que entra a Corabastos cada día. Se mueve solo: sube con la comida que piden Kennedy y la región y baja con lo que compran directo los mercados de la propuesta. 6.460 t/día en 2025 (DANE-SIPSA). Si lo mueves, la región manda esa proporción más (o menos) de lo pedido desde esa semana.' },
    { k: 'coraTope', n: 'Tope de ingreso diario', min: 5, max: 25, paso: 1, val: 11, unidad: '% sobre 6.460 t/día', ayuda: 'Lo máximo que pueden descargar sus puertas en un día (inferencia, no cifra oficial: ocupación del 90 % → 11 %, SDDE-FAO 2018). La capacidad de almacenamiento es aparte: 14.000 t.' },
    { k: 'autoconsumo', n: 'Comida que producen los hogares', min: 0, max: 30, paso: 1, val: 0, unidad: '% de la demanda', ayuda: 'Parte de la comida que las familias cultivan en casa (patios, materas, solares) y no compran. Es aparte de las huertas hidropónicas de la propuesta. 0 % por defecto: no hay dato para Kennedy (Bogotá entera produce 4,5 % de lo que come, DTS logística 2022).' },
    { ...sPob(0.5), min: -0.5, max: 3, n: 'Crecimiento de la población', ayuda: 'Kennedy y la región que compra en Corabastos. 0,5 %/año = tendencia DANE 2017–2022; la proyección SDP 2024–2028 da ≈0 %. Más de 1 %/año es estrés declarado.' }],
  2: [sT0, sDur, { k: 'desvioMayo', n: 'Desvío a la Av. Primero de Mayo', min: 0, max: 100, paso: 5, val: 50, unidad: '%' /* 2026-11-26: menos texto; % del tráfico de la vía cerrada */, ayuda: 'Supuesto: no hay aforo del desvío. Es la única vía principal paralela a 2,5 km o menos en OpenStreetMap; el resto del tráfico se reparte por calles locales.' }, sTraf, sRuido, sCapRed],
  3: [{ k: 'orgAumento', n: 'Aumento de los residuos orgánicos', min: 0, max: 100, paso: 5, val: 30, unidad: '%', ayuda: 'Más orgánicos por persona (más consumo de frescos, más población flotante) [SUP: la prueba]; se alcanza en un año.' },
    { k: 'orgT0', n: 'Semana en que empieza el aumento', min: 1, max: 1000, paso: 1, val: 52, unidad: 'semana', ayuda: 'Desde esta semana los orgánicos suben durante un año hasta el aumento elegido.' }, sComp, sFrac, sRecol],
  4: [{ k: 'parche', n: 'Corredor verde que se pierde', val: 1, opciones: [[1,'Humedal El Burro'],[2,'Humedal de Techo'],[3,'Humedal La Vaca'],[4,'Bosque de Bavaria']], ayuda: 'El lugar elegido recibe la pérdida de área y cambia la red de especies.' },
    { k: 'parchePerdida', n: 'Área del corredor verde que se pierde', min: 10, max: 100, paso: 5, val: 50, unidad: '%', ayuda: 'Relleno, obra o fragmentación: la calidad del corredor verde baja como la raíz del área que queda.' },
    { k: 'parcheT0', n: 'Semana en que se pierde', min: 1, max: 1000, paso: 1, val: 104, unidad: 'semana', ayuda: 'Semana del modelo en que ocurre la pérdida.' }, sArb, sRec],
  5: [{ ...sPob(1), n: 'Aumento de la población · prueba compartida', ayuda: 'La misma tasa anual se aplica con y sin propuesta; cambia la densidad, la demanda y la presión sobre predios. El 1 % inicial es un supuesto de estrés.' },
    { k: 'presionSuelo', n: 'Presión inmobiliaria adicional', min: 0, max: 10, paso: 0.5, val: 3, unidad: '%/año', ayuda: 'Supuesto de sensibilidad sobre el precio del suelo, adicional al crecimiento poblacional. Se aplica igual en ambos escenarios.' },
    { k: 'proteccion', n: 'Instrumentos de gestión del suelo (propuesta)', min: 0, max: 100, paso: 5, val: 50, unidad: '%', ayuda: 'Solo en la corrida con propuesta: captura de plusvalías, vivienda protegida y suelo comunitario; frena esa parte del alza en arriendos.' }, sTraf],
  6: [{ k: 'presupuesto', n: 'Recursos disponibles', min: 10, max: 100, paso: 5, val: 50, unidad: '% de la necesidad', ayuda: 'Recursos de cada ronda frente a lo que piden todos los sectores juntos [SUP: la prueba].' },
    { k: 'decisionCada', n: 'Semanas entre rondas de asignación', min: 4, max: 52, paso: 1, val: 13, unidad: 'semanas', ayuda: 'Cada cuánto se reparten los recursos.' },
    { k: 'P1.rotacion', n: 'Rotación de vocerías', min: 2, max: 52, paso: 1, val: 12, unidad: 'semanas', ayuda: 'Cada cuánto rota la vocería de las asambleas (con propuesta): rotar seguido evita el desgaste de las vocerías.' }, sPob(), { k: 'P1.cupos', n: 'Promotores por cohorte', min: 0, max: 40, paso: 1, val: 12, unidad: 'por trimestre', ayuda: 'Promotores que forma Bavaria Común cada 13 semanas (con propuesta).' }] };
const SL_MERC = { k: 'mercados', n: 'Cantidad de mercados', min: 0, max: 50, paso: 1, val: 44, unidad: 'mercados', ayuda: 'Mercados de barrio de la propuesta: abren uno tras otro hasta el año 13,5. Capacidad de cada uno 28 t/día (215 puestos como la Plaza Distrital de Kennedy, Contraloría 2025); trabajan hasta 70 %. En parques, al sur de Corabastos y junto a torres con huertas.' };
/* v3: huertas hidropónicas activas (solo con propuesta). Producción por huerta = 50 m² (SUP_SIMS.M2_HUERTA) × 6 kg/m²·año (P1.rend de sim_modelos.js)
   [SUP: no hay rendimiento verificado de hidroponía en el proyecto, docs/escenario01_estado.md]. Por defecto «auto» (se instalan solas con los años en las cubiertas aptas, primero las más altas); si se mueve, el número es la meta al año 10 (instalación progresiva). */
const SL_HUERTAS = { k: 'huertasH', n: 'Huertas hidropónicas (auto o meta al año 10)', min: 0, max: 2132, paso: 10, val: -1, unidad: 'huertas', ayuda: 'Auto por defecto: se instalan solas con los años (primero las cubiertas más altas). Al moverlo, el número es la meta al año 10 y se instalan de forma progresiva. Cada una de 50 m² produce 0,82 kg/día (6 kg/m²·año, valor del modelo de huertas; supuesto: sin rendimiento verificado de hidroponía). Su producción baja la demanda que no cubre la red.' };
const SL_CUBIERTAS = { k: 'tipoCubierta', n: 'Cubiertas donde instalar huertas', val: 0, opciones: [[0,'Edificios de 15 pisos · Catastro'],[1,'Edificios de 2 pisos · altura estimada']], ayuda: 'Cambia las cubiertas elegibles. Las de 2 pisos se identifican por los 6 m del modelo 3D, no por catastro verificado.' };
const SL_ESTACION = { k: 'estacionObjetivo', n: 'Dónde instalar Estaciones Circulares', val: -1, opciones: [[-1,'Toda la red de mercados'], ...MERCADOS.map((M,k) => [k,M.n])], ayuda: 'Elegir un mercado limita la intervención, la capacidad y los recorridos a ese punto.' };
const SL_SUELO = { k: 'zonaSuelo', n: 'Zona de presión y protección', val: -1, opciones: [[-1,'Todas las zonas de crecimiento'], ...METRO_SUP.EST.map((S,k) => [k,'Metro · '+S.n]), [METRO_SUP.EST.length,'Entorno de Bavaria']], ayuda: 'La presión extra y, con propuesta, la protección se aplican en el entorno elegido.' };
const SL_BARRIO = { k: 'barrioPrioritario', n: 'Sector al que asignar prioridad', val: -1, opciones: [[-1,'Todos los sectores']], ayuda: 'La persona elige el mismo sector en las dos corridas. Su peso se duplica al repartir los recursos; sin propuesta decide la oficina central y con propuesta las asambleas federadas.' };
export const SIMS = [];
for (const P of PARES) for (const prop of [false, true]) SIMS.push({ id: 2 * P.par - (prop ? 0 : 1), par: P.par, propuesta: prop, parN: P.n, prueba: P.prueba, capa: P.capa,
  n: P.n.slice(3) + (prop ? ' · con propuesta' : ' · sin propuesta'), corto: P.n.slice(3) + (prop ? ' · con' : ' · sin'), base: prop ? 'C' : 'A', grupo: prop ? 'propuesta' : 'actual',
  pregunta: prop ? P.pregCon : P.pregSin, desc: prop ? P.con : P.sin, visible: P.visible, sliders: P.par === 1 && prop ? [...PAR_SL[1], SL_MERC, SL_HUERTAS, SL_CUBIERTAS] : P.par === 3 && prop ? [...PAR_SL[3], SL_ESTACION] : P.par === 5 ? [...PAR_SL[5], SL_SUELO] : P.par === 6 ? [...PAR_SL[6], SL_BARRIO] : PAR_SL[P.par] });
/* SIMULACIONES BASE (fondo que siempre corre), sin prueba de estrés: 13 = Kennedy hoy (escenario D de sim_vida.js: estado actual + plan parcial Bavaria),
   14 = Kennedy con propuesta (escenario C). Condiciones normales: población +0,5 %/año [SUP: crecimiento moderado, Kennedy ya es una localidad consolidada], carros +1,5 %/año, recolección 84 %; sin corte,
   sin cierre, sin pérdida de parche, sin aumento de orgánicos, sin presión inmobiliaria extra ni falta de recursos. Las reglas de game over siguen activas. */
const BASE_SL = [sPob(0.5), sTraf, sRecol];
SIMS.push({ id: 13, par: 0, propuesta: false, parN: '00 Base', prueba: 'Sin prueba de estrés: Kennedy en condiciones normales', capa: null, n: 'Kennedy sin propuesta', corto: 'Kennedy sin propuesta', base: 'D', grupo: 'actual',
  pregunta: '¿Qué pasaría con Kennedy en 15 años si sigue como hoy, con el plan parcial Bavaria?', desc: 'Estado actual con el plan parcial Bavaria, el metro y el crecimiento normal de la población y del tráfico.', visible: 'Todo el territorio.', sliders: BASE_SL },
  { id: 14, par: 0, propuesta: true, parN: '00 Base', prueba: 'Sin prueba de estrés: Kennedy en condiciones normales', capa: null, n: 'Kennedy con propuesta', corto: 'Kennedy con propuesta', base: 'C', grupo: 'propuesta',
  pregunta: '¿Qué pasaría con Kennedy en 15 años con la red de mercados, huertas, Estaciones Circulares y Bavaria Común?', desc: 'La red distribuida de la propuesta con el metro y el crecimiento normal de la población y del tráfico.', visible: 'Todo el territorio.', sliders: BASE_SL });

export const MITIGA_DB = 3; // dB menos en las calles pacificadas (ver mitiga arriba) [SUP]
/* MECANISMOS DE LA PROPUESTA (2026-11-25, docs/indicadores_macromodelos.md «Cambios de fórmula»). Solo en las corridas con propuesta (id par y 14);
   cada uno es una OBRA con calendario (fase 0 → 1), no un descuento por etiqueta: la corrida sin propuesta no cambia.
   · PASOS DE FAUNA (E5 Corredor biótico): pasos bajo/sobre las vías principales con cerramiento que guía a la fauna, en las vías principales que cortan las
     rutas de dispersión entre parches (EXPO.cruce > 0; el núcleo de dispersión decide cuáles se usan). Se construyen de la semana 52 a la 260 (años 2–5). Reducen la mortalidad al cruzar 54 %:
     Rytwinski et al. 2016, PLoS ONE 11(11): e0166941, «How effective is road mitigation at reducing road-kill? A meta-analysis» (cerramiento con o sin
     pasos: −54 % de atropellos). Supervivencia al cruzar = e^(−c·Q·(1 − 0,54·fase)). Afecta los atropellos, la conectividad (supervivencia de los
     enlaces del corredor) y los destinos alcanzables.
   · CALLES VERDES Y PACIFICADAS (E5 corredor + calles verdes entre módulos + E9 Manzanas del Cuidado): [SUP] 30 % de las calles a 30 km/h y con franjas
     verdes, construidas de la semana 52 a la 416 (años 2–8); cada una −3 dB (MITIGA_DB, EEA 2010). Se combina con el deslizador «mitiga» del par 02:
     mit = 1 − (1 − deslizador)·(1 − 0,30·fase). */
export const PROP_SUP = { PASO_RED: 0.54, PASO_T0: 52, PASO_T1: 260, MIT: 0.30, MIT_T0: 52, MIT_T1: 416 };
const faseObra = (t, t0, t1) => Math.max(0, Math.min(1, (t - t0) / (t1 - t0)));
function mecanismosProp(E, t) {
  if (!E.prop) return; const S = PROP_SUP;
  E.traf.mit = 1 - (1 - E.traf.mit0) * (1 - S.MIT * faseObra(t, S.MIT_T0, S.MIT_T1));
  const f = faseObra(t, S.PASO_T0, S.PASO_T1); if (f <= 0) return;
  const k = Math.round(f * 100); if (E.S0 && E.pasoK === k) return; E.pasoK = k;
  const C = V.TRAFICO.C_ATROP, S0 = E.S0 || (E.S0 = new Float32Array(NP * NP)), r = 1 - S.PASO_RED * k / 100;
  for (let p = 0; p < NP; p++) for (let q = 0; q < NP; q++) { const i = p * NP + q, cr = EXPO.cruce[i] || 0;
    S0[i] = cr ? Math.exp(-C * cr * r) : PRE.S0[i]; } }
const S0de = (E) => E.S0 || PRE.S0;

/* ---------- MECANISMOS DE LA PROPUESTA · OBRAS (2026-11-26, docs/indicadores_macromodelos.md «Mecanismos de la propuesta») ----------
   Lo que «Kennedy con propuesta» construye en el 3D entra al modelo con los MISMOS datos y calendarios, precalculados en data3d/propuesta_obras.json
   por tools/propuesta_obras_datos.mjs (mundo del simulador, el marco de PARCHES). Solo en las corridas con propuesta (E.obras); sin propuesta nada
   de esto existe y la corrida es idéntica. Cada obra se suma por fases desde su propia semana. Reglas (las del modelo, no paralelas):
   · ÁREA → HÁBITAT: el modelo hace depender la extinción y la colonización de √(área) (sim_vida.js SQA, KER) y la pérdida de humedal se aplica como
     √(área / área inicial) sobre el factor de hábitat E.xH (basuraPaso). Una obra que agrega ΔA ha al parche p usa la misma regla:
     xObra[p] = √(1 + ΔA_p(t) / ha_p), que multiplica E.xH (red trófica: todas las especies del parche).
       El Burro: tablero y taludes del ecoducto (cubierta verde, años 1,3–3) + copa de los árboles de borde. La Vaca: franjas de pradera húmeda,
       juncos y agua del predio liberado de Corabastos (cada celda desde la semana en que se quita su nave, 0,6 años de obra y 4 de crecimiento)
       menos el borde que ya restaura sim_vida.js (bordeVaca), + barrera de árboles + copa de borde. Techo: copa de borde. Bosque de Bavaria: celdas
       del humedal artificial (agua años 3–4, plantas 3–6). Par 01: huertas hidropónicas sobre lo que el modelo ya monta en cubiertas.
       [SUP] la copa de árboles nativos junto al humedal cuenta como área de hábitat del parche (el modelo no separa franjas dentro de un parche).
   · ÁRBOLES EN PARQUES → calidad de los parques (sim_vida.js: 0,3 + 0,3·tamaño + 0,2·árboles): P3.arboles = valor inicial + copa nueva en parques /
     ha de parques del modelo [SUP: densidad ≈ fracción de copa].
   · CALLES VERDES → corredores entre zonas verdes (ind(s).verde y conectividad del marco ecocéntrico): par de zonas unido por filas de árboles
     adultos (tools/propuesta_obras_datos.mjs: 50 m de brecha, ≤ 2.000 m) [SUP; las aves de bosque urbano evitan cruzar claros de decenas de metros
     y usan las calles arboladas como corredores: Tremblay y St. Clair 2009, J. Appl. Ecol. 46: 1314–1322; Fernández-Juricic 2000, Conserv. Biol. 14: 513–521].
     El núcleo de dispersión de la red trófica (red_trofica.js) no cambia: los corredores no mueven la colonización (pendiente, ver docs).
     Ruido para la fauna: la fase 2 (la fase 1 ya está en PROP_SUP.MIT) baja OBRA_DB dB en cada zona verde × fracción de árboles de calle a 100 m que
     son de fase 2 × madurez [SUP 1 dB: una fila de árboles atenúa del orden de 1 dB o menos; franjas anchas y densas logran más; Van Renterghem et al. 2015,
     «Using natural means to reduce surface transport noise during propagation outdoors», Applied Acoustics 92: 86–101]; para
     las aves también por la zona de efecto (misma regla de zonaPredio). El ruido de las calles (ruidoDb, L_Aeq) no cambia por los árboles.
   · ÁREA VERDE (ind(s).verde): nodos nuevos «Puente de fauna», «Humedal La Vaca ampliado» (reemplaza los bordes liberados de sim_vida.js para no
     contarlos dos veces) y «Humedal artificial de Bavaria». La copa de las calles no se suma al área verde (está sobre andenes), sí al carbono.
   · HUMEDALES: humedalHa y área funcional suman La Vaca ampliada (agua, juncos, pradera húmeda) y las celdas de Bavaria.
   · AUTONOMÍA (par 01): lo que producen las huertas hidropónicas también es comida local consumida. */
export const OBRA_SUP = { OBRA_DB: 1, ADULTO_CV: 3.5 };
const smooth = (a, b, x) => { const u = cl01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const gArb = (dt, adulto, e0) => dt <= 0 ? 0 : e0 + (1 - e0) * Math.min(1, dt / adulto);                  // tamaño de un árbol sembrado hace dt años (0 → e0 → 1)
const gCoh = (años, a0, a1, adulto, e0) => { let s = 0; for (let k = 0; k < 5; k++) s += gArb(años - (a0 + (a1 - a0) * (k + 0.5) / 5), adulto, e0); return s / 5; }; // cohorte sembrada entre a0 y a1
function obrasPrep(J) {
  const ix = (id) => PARCHES.findIndex(p => p.id === id);
  const pares = J.calles.pares.map(([a, b, s]) => [ix(a), ix(b), s]).filter(r => r[0] >= 0 && r[1] >= 0);
  const ruido = Object.entries(J.calles.ruido).map(([id, L]) => [ix(id), L]).filter(r => r[0] >= 0);
  const cub = PARCHES.map((p, i) => p.t === 'modCubierta' ? i : -1).filter(i => i >= 0), cubHa = cub.reduce((a, p) => a + PARCHES[p].ha, 0);
  return { J, pares, ruido, cub, cubHa, burro: ix('burro'), vaca: ix('vaca'), techo: ix('techo'), bosque: ix('bosqueBav'), pq4: ix('pq4') }; }
function obrasPaso(E, t) {
  const O = E.obras; if (!O) return; const OB = OBRAS, J = OB.J, años = t / V.AÑO, B = J.bordes.porParche, Vc = J.vaca;
  const eco = J.ecoducto.ha * (años >= J.ecoducto.obra ? smooth(J.ecoducto.cubierta[0], J.ecoducto.cubierta[1], años) : 0);
  const gB = gCoh(años, J.bordes.siembra[0], J.bordes.siembra[1], J.bordes.adulto, J.bordes.e0), cb = (id) => (B[id] ? B[id].copaHa : 0) * gB;
  let wet = 0, bar = 0; Vc.semanas.forEach((s, k) => { const la = años - s / V.AÑO; wet += (Vc.bandas.pradera[k] + Vc.bandas.juncos[k] + Vc.bandas.agua[k]) * cl01((la - Vc.obra) / Vc.crece);
    bar += Vc.bandas.barrera[k] * gCoh(la, Vc.arboles.siembra, Vc.arboles.siembra + 1.5, Vc.arboles.adulto, Vc.arboles.e0); });
  const o = E.o, bsv = o && o.cora ? (o.cora.borde || 0) / 1e4 * (o.cora.mad || 0) : 0, wetX = Math.max(0, wet - bsv); // lo que sim_vida.js ya restaura no se cuenta dos veces
  const Bv = J.bavaria, bav = Bv.agua * cl01(años - Bv.llena[0]) + Bv.vegetacion * cl01((años - Bv.plantas[0]) / (Bv.plantas[1] - Bv.plantas[0]));
  const P = J.parques, pqC = P.copaHa * gCoh(años, P.siembra[0], P.siembra[1], P.adulto, P.e0) + P.anillo.copaHa * gCoh(años, P.anillo.siembra[0], P.anillo.siembra[1], P.anillo.adulto, P.anillo.e0);
  let cv = 0; for (const [s, , c] of J.calles.calles) cv += c * gArb(años - s / V.AÑO, J.calles.adulto, J.calles.e0);
  // huertas hidropónicas del par 01 sobre las cubiertas que ya monta el modelo (escenario C: P1.sup × supF incluye 4,9 ha de techos)
  const hid = E.ab01 && E.ab01.nH ? Math.max(0, E.ab01.nH * SUP_SIMS.M2_HUERTA - SUP_SIMS.TECHOS_M2 * E.s.supF) / 1e4 : 0;
  const X = O.x; X.fill(1); O.dHa.fill(0); const ha = (p) => Math.max(0.05, PARCHES[p].ha), sq = (p, d) => { if (p >= 0) X[p] *= Math.sqrt(1 + d / ha(p)); };
  sq(OB.burro, eco + cb('burro')); sq(OB.vaca, wetX + bar + cb('vaca')); sq(OB.techo, cb('techo')); sq(OB.bosque, bav);
  if (hid > 0 && OB.cubHa > 0) for (const p of OB.cub) X[p] *= Math.sqrt(1 + hid / OB.cubHa);
  if (OB.burro >= 0) O.dHa[OB.burro] = eco; if (OB.vaca >= 0) O.dHa[OB.vaca] = wetX; if (OB.bosque >= 0) O.dHa[OB.bosque] = bav;
  // ruido para la fauna: fase 2 de las calles verdes junto a cada zona verde
  O.dDb.fill(0); for (const [p, L] of OB.ruido) { let f = 0; for (const [s, fr] of L) f += fr * gArb(años - s / V.AÑO, J.calles.adulto, J.calles.e0); O.dDb[p] = OBRA_SUP.OBRA_DB * f; }
  E.arbObra = O.arb0 + pqC / P.haParquesModelo; if (E.par !== 4) E.PAR.P3.arboles = Math.min(1, E.arbObra);
  Object.assign(O, { eco, bordes: cb('burro') + cb('vaca') + cb('techo'), wet, wetX, bar, bav, pqC, cv, hid, años }); }
/* factor extra para las aves por la fase 2 de las calles verdes (zona de efecto de la vía con Q × 10^(−ΔL/10), la regla de zonaPredio) */
function obrasAve(E, t) { const O = E.obras; if (!O) return; const X = O.xAve; X.fill(1);
  const Vg = V.crecimiento(t).V * factorTraf(E, t), mit = Math.pow(10, -MITIGA_DB / 10 * E.traf.mit), RZ = V.TRAFICO.RED_ZONA, Dh = V.TRAFICO.ZONA_HOY * Math.pow(Vg * mit, V.TRAFICO.B_DIST);
  for (const [p] of OBRAS.ruido) { const e = EXPO.parches[p], d = O.dDb[p]; if (!e || !(d > 0)) continue; const Dn = Dh * Math.pow(Math.pow(10, -d / 10), V.TRAFICO.B_DIST), fh = fZonaP(e[0], RP_M[p], Dh), fn = fZonaP(e[0], RP_M[p], Dn);
    X[p] = (1 - RZ * fn) / (1 - RZ * fh); } }
/* corredores de calle verde hechos en la semana t: [p, q, f] (f = madurez de la calle más tardía del camino) */
const corredoresCV = (E, t) => !E.obras ? [] : OBRAS.pares.filter(r => t >= r[2]).map(([p, q, s]) => [p, q, Math.min(1, (t - s) / (OBRA_SUP.ADULTO_CV * V.AÑO))]);

/* ---------- REGLAS DE GAME OVER: siete, iguales para las 12; cualquiera cumplida 4 semanas seguidas = game over ---------- */
export const REGLAS = [
  { k: 'fauna', n: 'Fauna', txt: 'quedan menos del 90 % de las especies de fauna presentes al inicio', umbral: 90, unidad: '% de las especies del inicio', semanas: 4,
    fuente: 'Steffen et al. 2015, Planetary boundaries (Science 347, doi 10.1126/science.1259855): límite de integridad de la biosfera = mantener el Biodiversity Intactness Index en 90 % o más (https://www.stockholmresilience.org/research/planetary-boundaries/quantitative-evolution-of-boundaries.html). [SUP] se aplica a la riqueza local de las 23 especies de la red: perder 3 = salir del límite.' },
  { k: 'habitat', n: 'Hábitat', txt: 'la presencia especie × corredor verde en Kennedy cae 30 % frente al inicio', umbral: 70, unidad: '% de la ocupación del año 1', semanas: 4,
    fuente: 'La regla de hábitat de data3d/sim_vida.js (caída de 30 %), aplicada a la ocupación de la metapoblación de Levins en vez de a la riqueza (que ya mide la regla de fauna). Referencia: semana cero. Umbral de prueba del proyecto. [SUP heredado de sim_vida.js]' },
  { k: 'humedal', n: 'Humedales', txt: 'el área funcional de los humedales (área que queda sin rellenar × calidad frente a la basura acumulada en su borde) cae 30 % o más frente a hoy', umbral: 70, unidad: '% del área funcional de hoy', semanas: 4,
    fuente: 'Convención de Ramsar (Colombia la adoptó por la Ley 357 de 1997): mantener las características ecológicas de los humedales y su uso racional, sin pérdida neta (https://www.ramsar.org/about/wise-use-wetlands). Política de Humedales del Distrito Capital (Decreto 624 de 2007, https://www.ambientebogota.gov.co/politica-de-humedales-del-distrito-capital): conservar y recuperar los humedales de Bogotá, incluidos El Burro, La Vaca y Techo. [SUP] umbral 30 %, el mismo de la regla de hábitat; la pérdida sale de la basura arrojada en los bordes (ver BASURA_SUP).' },
  { k: 'abasto', n: 'Abastecimiento', txt: 'Kennedy recibe menos del 80 % de los alimentos que necesita', umbral: 80, unidad: '% de la demanda de Kennedy', semanas: 4,
    fuente: 'Regla de data3d/sim_vida.js, medida por zona. Necesidad: 0,65 kg/hab/día de frescos (6.460 t/día que entran a Corabastos, DANE-SIPSA 2025, × 85 % que se queda en la ciudad / población servida; derivado, rango 0,61–0,69). Umbral de 80 %: umbral de prueba del proyecto [SUP].' },
  { k: 'residuos', n: 'Residuos', txt: 'los orgánicos pendientes de tratamiento superan la capacidad de almacenamiento', umbral: 100, unidad: '% del almacenamiento', semanas: 4,
    fuente: 'Regla de data3d/sim_vida.js (3 días de contenedores y calle + 2 semanas de planta).' },
  { k: 'ruido', n: 'Ruido', txt: 'el ruido promedio de las calles sube 3 dB o más frente al inicio (el doble de energía sonora: el doble de tráfico)', umbral: 3, unidad: 'dB sobre el inicio', semanas: 4,
    fuente: 'OMS 2018, Environmental Noise Guidelines for the European Region: tráfico vial < 53 dB Lden (https://www.who.int/europe/publications/i/item/9789289053563). En el modelo HOY ya el 76 % de las celdas de vía supera 53 dB, así que ese nivel absoluto no puede ser game over (se reporta en callesOMS). Se usa el cambio: +3 dB = el doble de energía, el menor cambio perceptible en ruido ambiental (FHWA, Highway Traffic Noise: Analysis and Abatement Guidance 2011, https://www.fhwa.dot.gov/environment/noise/regulations_and_guidance/analysis_and_abatement_guidance/). [SUP] umbral de cambio y no de nivel.' },
  { k: 'trafico', n: 'Tráfico', txt: 'circulan 30 % más vehículos que hoy (índice de tráfico 1,30 o más)', umbral: 1.3, unidad: 'índice (1 = hoy)', semanas: 4,
    fuente: 'Plan de Movilidad Sostenible y Segura de Bogotá (2023): 77 % de los viajes en modos sostenibles en 2035; hoy ~70 % (Encuesta de Movilidad 2023, https://bogota.gov.co/mi-ciudad/movilidad/movilidad-en-bogota-asi-se-movilizan-los-capitalinos-segun-encuesta ; https://www.larepublica.co/economia/claudia-lopez-presento-el-nuevo-plan-de-movilidad-para-bogota-con-metas-a-2035-3741556). Los viajes no sostenibles deben pasar de 30 % a 23 % (× 0,77). [SUP] game over cuando el tráfico se aleja de hoy tanto como la meta pide bajar, en sentido contrario: 1 / 0,77 ≈ 1,30.' }
];
const VALOR = { fauna: (x) => x.fauna / Math.max(1, x.fauna0) * 100, habitat: (x) => x.pares / Math.max(1, x.pares0) * 100, abasto: (x) => 100 * (1 - x.abasto.deficit),
  residuos: (x) => x.residuos * 100, ruido: (x) => x.ruidoDb - x.ruidoDb0, trafico: (x) => x.trafico, humedal: (x) => x.humedalFuncional };
const MALO = { fauna: (v) => v < 90, habitat: (v) => v <= 70, abasto: (v) => v < 80, residuos: (v) => v > 100, ruido: (v) => v >= 3, trafico: (v) => v >= 1.3, humedal: (v) => v <= 70 };
// cerca del game over (aviso previo): 2/3 del camino desde el valor de hoy hasta el umbral
const CERCA = { fauna: (v) => v < 94, habitat: (v) => v <= 80, abasto: (v) => v < 87, residuos: (v) => v > 85, ruido: (v) => v >= 2, trafico: (v) => v >= 1.2, humedal: (v) => v <= 80 };
const MOTIVO_GO = { fauna: 'se perdió más del 10 % de las especies de fauna', habitat: 'la ocupación de los corredores verdes cayó 30 % o más', abasto: 'Kennedy recibió menos del 80 % de los alimentos',
  residuos: 'los orgánicos pendientes superaron el almacenamiento', ruido: 'el ruido de las calles subió 3 dB o más', trafico: 'el tráfico subió 30 % o más sobre hoy',
  humedal: 'los humedales perdieron 30 % o más de su área funcional por la basura y los rellenos en sus bordes' };

/* ---------- datos ---------- */
let D = null, RED = null, PRE = null;
export const URL_DATOS = new URL('./simulaciones_datos.json', import.meta.url).href;
export const URL_OBRAS = new URL('./propuesta_obras.json', import.meta.url).href;
let OBRAS = null;
export async function cargarDatos(cargar) {
  if (D) return D;
  const get = cargar || ((u) => fetch(u).then(r => { if (!r.ok) throw new Error('simulaciones_datos.json ' + r.status); return r.json(); }));
  const J = await get(URL_DATOS);
  if (J.red.np !== NP) throw new Error('simulaciones_datos.json no corresponde a los parches de sim_red_datos.js (correr tools/simulaciones_datos.mjs)');
  RED = crearRed(J.red, V, PARCHES);
  // ruido: niveles de hoy (dB) por grupo, ordenados; flujo por grupo
  const Lc = Float32Array.from(J.ruido.cerca, v => v / 10), Ll = Float32Array.from(J.ruido.lejos, v => v / 10), media = (a) => { let s = 0; for (const v of a) s += v; return s / Math.max(1, a.length); };
  const fC = J.ruido.flujoCerca / (J.ruido.flujoCerca + J.ruido.flujoLejos);
  // atropellos: destino de un dispersante desde cada parche (núcleo normalizado) y supervivencia absoluta al cruzar con el tráfico de hoy
  const C = V.TRAFICO.C_ATROP, S0 = new Float32Array(NP * NP); for (let i = 0; i < NP * NP; i++) S0[i] = Math.exp(-C * (EXPO.cruce[i] || 0));
  const DEST = {}; for (const [g, K] of Object.entries(RED.KERN)) { const W = new Float32Array(NP * NP);
    for (let q = 0; q < NP; q++) { let s = 0; for (let p = 0; p < NP; p++) if (p !== q) s += K[q * NP + p]; for (let p = 0; p < NP; p++) W[q * NP + p] = p !== q && s > 0 ? K[q * NP + p] / s : 0; } DEST[g] = W; }
  // soporte ecológico por zona: peso e^(−d/300) de cada parche
  const WZ = new Float32Array(NZ * NP); for (let z = 0; z < NZ; z++) for (let p = 0; p < NP; p++) WZ[z * NP + p] = Math.exp(-Math.hypot(ZONAS[z][0] - PARCHES[p].x, ZONAS[z][1] - PARCHES[p].z) / SUP_SIMS.RADIO_ECO);
  const POLI = new Set(); for (const [a, b, t] of RED.ENL) if (t === 5 && RED.esFa(a) && RED.esFl(b)) POLI.add(RED.FI[a]); // polinizadores: visita floral / polinización (tipo 5 de biotica.json)
  /* interacciones locales: cada enlace de la red con al menos un extremo de fauna se «ancla» en la especie de fauna (si los dos son fauna, en el
     primero); cuenta 1 por cada parche donde el ancla está presente y el otro extremo está en el mismo parche o a su alcance de dispersión
     (ALC del grupo del ancla, la misma regla de los recursos de red_trofica.js). Enlaces flora–flora: parches donde están los dos. */
  const LOC = []; for (const [a, b] of RED.ENL) { const fa = RED.esFa(a), fb = RED.esFa(b), la = fa || RED.esFl(a), lb = fb || RED.esFl(b); if (!la || !lb) continue;
    if (fa) LOC.push([RED.FI[a], fb ? 0 : 1, (fb ? RED.FI[b] : RED.FLI[b]) * RED.W3, RED.ALC[RED.FAUNA[RED.FI[a]].grupo]]);
    else if (fb) LOC.push([RED.FI[b], 1, RED.FLI[a] * RED.W3, RED.ALC[RED.FAUNA[RED.FI[b]].grupo]]);
    else LOC.push([-1, RED.FLI[a] * RED.W3, RED.FLI[b] * RED.W3, null]); }
  const metroF = (red) => { const f = new Float32Array(NP).fill(1); for (const i of J.metro.cerca) f[i] = 1 - red; return { k: 'metro' + red + '_' + J.metro.radio, f }; };
  const energ = (a) => { let s = 0; for (const v of a) s += Math.pow(10, v / 10); return 10 * Math.log10(s / Math.max(1, a.length)); }; // promedio energético (L_Aeq)
  PRE = { LOC, Lc, Ll, mLc: media(Lc), mLl: media(Ll), eLc: energ(Lc), eLl: energ(Ll), nC: Lc.length, nL: Ll.length, fC, S0, DEST, WZ, POLI: [...POLI], metroF, PAR: J.PAR, metro: J.metro };
  /* obras de la propuesta (tools/propuesta_obras_datos.mjs); si el archivo no está, las corridas con propuesta siguen sin estas obras */
  try { OBRAS = obrasPrep(await get(URL_OBRAS)); } catch (e) { OBRAS = null; if (typeof console !== 'undefined') console.warn('propuesta_obras.json:', e && e.message); }
  D = J; return D;
}
const listo = () => { if (!D) throw new Error('simulaciones.js: falta await cargarDatos()'); };

/* ---------- crear ---------- */
const clonar = (o) => JSON.parse(JSON.stringify(o));
/* PLAN PARCIAL BAVARIA EN «SIN PROPUESTA» (pedido de la autora, 2026-11-23): las 6 corridas sin propuesta (id impar) incluyen el Plan Parcial
   Fábrica Bavaria (Decreto 448/2023) por etapas, como la trayectoria real de Kennedy; las corridas con propuesta tienen Bavaria Común en ese predio. */
const PRED_SIMS = new Set([1, 3, 5, 7, 9, 11, 13]); /* las corridas sin propuesta (y la base 13) tienen el plan parcial y su predio */
const KEN_XZ = (() => { let x = 0, z = 0, w = 0; for (const Z of ZONAS) { x += Z[0] * Z[2]; z += Z[1] * Z[2]; w += Z[2]; } return [x / w, z / w]; })(); // centro poblado de Kennedy
const CORA_XZ = [BODEGAS.reduce((a, b) => a + b.x, 0) / BODEGAS.length, BODEGAS.reduce((a, b) => a + b.z, 0) / BODEGAS.length];
const BORDE_TOT = BODEGAS.reduce((a, b) => a + (b.borde || 0), 0);
export function crear(id, semilla = 1, valores = {}) {
  listo(); const S = SIMS.find(x => x.id === id); if (!S) throw new Error('simulación ' + id + ' no existe');
  const val = {}; for (const sl of S.sliders) val[sl.k] = valores[sl.k] != null ? +valores[sl.k] : sl.val;
  if (S.par === 1 && valores.pobDesde != null) val.pobDesde = +valores.pobDesde; /* 01 v3: semana en que se movió la población (no es deslizador) */
  const PAR = clonar(PRE.PAR); PAR.P1.cierres = SUP_SIMS.CIERRES_AL_AZAR; PAR.P1.crece = false; // la población crece con pobCrece (abajo)
  for (const [k, v] of Object.entries(val)) { const m = k.match(/^(P[123])\.(\w+)$/); if (m) PAR[m[1]][m[2]] = v; }
  const mod = { red: RED }, P = S.par;
  if (P === 3 && S.propuesta && val.estacionObjetivo >= 0) mod.estacionObjetivo = Math.min(MERCADOS.length - 1, Math.round(val.estacionObjetivo));
  const metro = { red: SUP_SIMS.METRO_RED, desde: SUP_SIMS.METRO_SEM, F: PRE.metroF(SUP_SIMS.METRO_RED) }; // metro Línea 1 en TODAS (proyecto real)
  if (P === 2) mod.cierre = { via: SUP_SIMS.CIERRE_VIA, t0: Math.round(val.cierreT0), dur: Math.round(val.cierreDur) };
  // La restauración depende de las intervenciones del modelo, sin multiplicador por escenario.
  const kgOrgInicial = V.SUP.KG_ORG;
  if (P === 3) V.SUP.KG_ORG = ORG_KG_HAB_DIA;
  let s;
  try { s = V.crear(S.propuesta ? S.base : 'D', semilla, mod); }
  finally { V.SUP.KG_ORG = kgOrgInicial; } // solo el par 03 usa el proxy orgánico calibrado
  const vivTot = PLAN_BAV.VIV_ETAPA.reduce((a, v) => a + v, 0);
  const plan = !S.propuesta ? { esc: (val.planViv != null ? val.planViv : vivTot) / vivTot, autos: val.planAutos != null ? val.planAutos : PLAN_BAV.AUTOS_HOG, accesos: Math.max(1, Math.round(val.planAccesos || 2)) } : null;
  if (plan) plan.viv = PLAN_BAV.VIV_ETAPA.map(v => v * plan.esc);  const E = { id, semilla, val, PAR, s, mod, metro, plan, o: null, racha: Object.fromEntries(REGLAS.map(R => [R.k, 0])), go: null, ev: [], ind: null,
    prev: new Uint8Array(s.occ.length), ruido0: null, techos: mod.techos || null,
    traf: { r: (val.trafCrece != null ? val.trafCrece : 100 * V.TRAFICO.carros) / 100, pob: (val.pobCrece || 0) / 100, mit: (val.mitiga || 0) / 100 },
    occ0: Uint8Array.from(s.occ), emaO: Float32Array.from(s.occ),
    ref: { listo: false, pares: 0, red: 0, poli: 0, huertas: 0, occ: new Float32Array(s.occ.length), pred: new Float32Array(RED.NFA), predOcc: 0 }, emaP: null, pred: null, evs: { fired: new Set(), lvl: {}, cd: {}, pend: [], h0: null, short: false } };
  E.red0 = interLocal(s); E.poli0 = paresPoli(s);
  if (PRED_SIMS.has(id)) { let n0 = 0; const porEsp = new Float32Array(RED.NFA); for (let i = 0; i < RED.NFA; i++) for (const p of PRED_P) { porEsp[i] += s.occ[i * NP + p]; }
    for (let i = 0; i < RED.NFA; i++) n0 += porEsp[i]; E.pred = { esp0: porEsp, ema: Float32Array.from(porEsp), occ0: n0, emaOcc: n0, xAve: new Float32Array(NP).fill(1), xMin: new Float32Array(NP).fill(1) };
  }
  // factores por parche que se pasan a la red trófica: aves (predio × basura × desvíos) y hábitat de todas las especies (área de humedal)
  E.xAve = new Float32Array(NP).fill(1); E.xH = new Float32Array(NP).fill(1); E.xBas = new Float32Array(NP).fill(1); E.xDes = new Float32Array(NP).fill(1);
  s.red.xAve = E.xAve; s.red.xH = E.xH; s.red.fRata = 1;
  E.par = P; E.prop = S.propuesta; E.fOrg = 1;
  E.bas = basuraIni(E); E.suelo = sueloIni(E); E.atr = atropellosIni(E); E.hechos = []; E.muertes = muertesIni(E); E.cie = mod.cierre ? { t0: mod.cierre.t0, dur: mod.cierre.dur, via: mod.cierre.via, fase: 0, faseMax: 0 } : null;
  E.traf.mit0 = E.traf.mit; E.S0 = null; E.pasoK = -1;
  E.par = P; E.prop = S.propuesta; E.xHb = new Float32Array(NP).fill(1); E.xFrag = new Float32Array(NP).fill(1); pruebaIni(E);
  E.rachasLocales = new Map(); E.rachaSectores = new Uint8Array(ZONAS.length);
  E.obras = S.propuesta && OBRAS ? { x: new Float32Array(NP).fill(1), xAve: new Float32Array(NP).fill(1), dHa: new Float32Array(NP), dDb: new Float32Array(NP), arb0: E.PAR.P3.arboles } : null; // obras de la propuesta (ver OBRA_SUP)
  return E;
}
const bits = (v) => { v = v - ((v >>> 1) & 0x55555555); v = (v & 0x33333333) + ((v >>> 2) & 0x33333333); return (((v + (v >>> 4)) & 0x0F0F0F0F) * 0x01010101) >>> 24; };
function interLocal(s) { // suma sobre parches de los enlaces cuyos dos extremos están ahí (o al alcance), ver PRE.LOC
  const O = s.red.ocM, M = s.red.flM, W3 = RED.W3; let n = 0;
  for (const [i, tb, yb, A] of PRE.LOC) {
    if (i < 0) { for (let w = 0; w < W3; w++) n += bits(M[tb + w] & M[yb + w]); continue; }
    const Y = tb ? M : O, xa = i * W3;
    for (let w = 0; w < W3; w++) { let m = O[xa + w]; while (m) { const bit = m & -m, p = (w << 5) + 31 - Math.clz32(bit); m ^= bit;
      if ((Y[yb] & A[p * W3]) | (Y[yb + 1] & A[p * W3 + 1]) | (Y[yb + 2] & A[p * W3 + 2])) n++; } } }
  return n; }
function paresPoli(s) { let n = 0; for (const i of PRE.POLI) for (let p = 0; p < NP; p++) n += s.occ[i * NP + p]; return n; }

/* ---------- tráfico de los deslizadores: factor sobre el índice V de sim_vida.js ----------
   fTraf(t) = V(trafCrece) / V(1,5 %) del mismo año × población / población de hoy [SUP carros ∝ población]. Para la fauna además × 10^(−0,3·mitiga)
   (−3 dB en las calles pacificadas = la mitad de energía en la zona de efecto) y, en la sim. 7, el factor del metro por parche. Se pasa a sim_vida.js por
   su gancho por parche (mod.metro {k, f, desde}); si todo vale 1 no se pasa nada (la dinámica es la de siempre). Se actualiza una vez por año. */
const vAño = (r, a) => 0.70 * Math.pow(1 + r, a) + 0.22 + 0.08;
function factorTraf(E, t) { const a = Math.max(0, Math.floor(t / V.AÑO)), T = E.traf;
  const fp = E.s.pob / V.POB_K; // [SUP] par 01 con propuesta: con mercados de barrio a pie, la población nueva suma 30 % de los viajes en carro
  /* [SUP] par 01 con propuesta: los mercados de barrio a pie y el acopio cercano quitan viajes en carro y camión hacia Corabastos: el tráfico BAJA hasta −25 % en 4 años (a medida que abren) */
  return vAño(T.r, a) / vAño(V.TRAFICO.carros, a) * fp; }
function ganchoTraf(E, t) {
  const T = E.traf, mOn = E.metro && t >= E.metro.desde;
  const gE = Math.round(factorTraf(E, t) * Math.pow(10, -MITIGA_DB / 10 * T.mit) * 1000) / 1000;
  const k = gE + '|' + (mOn ? E.metro.F.k : '');
  if (E.mod._gk === k) return; E.mod._gk = k;
  if (gE === 1 && !mOn) { E.mod.metro = null; return; }
  const f = mOn ? (gE === 1 ? E.metro.F.f : E.metro.F.f.map(v => v * gE)) : new Float32Array(NP).fill(gE);
  E.mod.metro = { k: 'g' + k, f, desde: 0 }; }

/* ---------- predio: viajes, ruido y zona de efecto de las vías nuevas ---------- */
function planEn(E, t) { const a = 2 * t / V.AÑO, VE = E.plan.viv; /* 10 etapas en 5 años (igual que el 3D de plan_bavaria.js) */ let viv = 0, com = 0, vias = 0;
  for (let k = 0; k < VE.length; k++) { viv += VE[k] * cl01(a - k); if (a >= k) { vias += PREDIO_PLAN.vias[k]; if (a >= k + 1) com += PREDIO_PLAN.com[k] * Math.min(1, E.plan.esc); } }
  const k = Math.floor(a), obra = k >= 0 && k < VE.length ? VE[k] : 0;
  return { viv, obra, com, vias, k: Math.min(VE.length - 1, Math.max(0, k)), etapa: k + 1 }; }
function viajes(E, P) { const S = PREDIO_SUP; return { car: P.viv * E.plan.autos * S.VIAJES_AUTO * (1 + S.EXTRA_VIV) + P.com * S.VIAJES_COM, cam: P.obra * S.CAMIONES_VIV }; }
function zonaPredio(E, t) { // factor extra de ruido de las vías nuevas para las aves (s.red.xAve), antes de V.paso
  const P = planEn(E, t), Vj = viajes(E, P), X = E.pred.xAve, Vg = V.crecimiento(t).V * factorTraf(E, t), mit = Math.pow(10, -MITIGA_DB / 10 * E.traf.mit);
  const Qob = P.obra > 0 ? EXPO.medianaVia * Math.pow(10, (PREDIO_SUP.OBRA_DB - PREDIO_SUP.L_PRINCIPAL) / 10) * Math.min(1, P.obra / PREDIO_SUP.OBRA_VIV) : 0;
  const Qv = ((Vj.car + Vj.cam * PREDIO_SUP.CAMION_EQ) / E.plan.accesos + Qob) * mit, Dn = V.TRAFICO.ZONA_HOY * Math.pow(Qv / EXPO.medianaVia, V.TRAFICO.B_DIST);
  const Dh = V.TRAFICO.ZONA_HOY * Math.pow(Vg * mit, V.TRAFICO.B_DIST), RZ = V.TRAFICO.RED_ZONA;
  for (const p of PRED_P) { const dd = PREDIO_PLAN.dist[PARCHES[p].id]; if (!dd || Qv <= 0) { X[p] = 1; continue; }
    const r = RP_M[p], fn = fZonaP(dd[P.k], r, Dn), fh = EXPO.parches[p] ? fZonaP(EXPO.parches[p][0], r, Dh) : 0;
    X[p] = (1 - RZ * Math.max(fn, fh)) / (1 - RZ * fh); if (X[p] < E.pred.xMin[p]) E.pred.xMin[p] = X[p]; } }

/* ---------- basura (ver BASURA_SUP) ---------- */
const HUM_P = PARCHES.map((p, i) => p.t === 'humedal' && !p.dyn ? i : -1).filter(i => i >= 0);
const POB_Z = ZONAS.reduce((a, z) => a + z[2], 0);
function basuraIni(E) {
  const B = BASURA_SUP, v = E.val, flores = [CORA_XZ[0] + 250, CORA_XZ[1] - 200];
  const pts = [{ fuente: 'corabastos', x: CORA_XZ[0], z: CORA_XZ[1], g0: B.CORA_T }, { fuente: 'flores', x: flores[0], z: flores[1], g0: B.FLORES_T }];
  for (const Z of ZONAS) if (Math.hypot(Z[0] - CORA_XZ[0], Z[1] - CORA_XZ[1]) <= B.RADIO && Z[2] > 0) pts.push({ fuente: 'vivienda', x: Z[0], z: Z[1], g0: Z[2] / POB_Z * V.POB_K * B.KG_HAB / 1000 });
  for (const P of pts) P.acum = P.g0 * (1 - B.RECOLECCION) * 7 / B.LIMPIEZA;
  // bordes de humedal: un punto por humedal, en el borde que mira al centro poblado de Kennedy; lo que llega ahí es arrojo (no se recoge)
  const sq = HUM_P.reduce((a, h) => a + Math.sqrt(PARCHES[h].ha), 0);
  HUM_P.forEach((h, k) => { const P = PARCHES[h], dx = KEN_XZ[0] - P.x, dz = KEN_XZ[1] - P.z, d = Math.hypot(dx, dz) || 1, r = RP_M[h];
    const g0 = B.HUM_T * Math.sqrt(P.ha) / sq; pts.push({ fuente: 'humedal', hum: k, nombre: P.n, x: P.x + dx / d * r, z: P.z + dz / d * r, g0, acum: g0 * 7 / B.LIMPIEZA }); });
  for (const P of pts) { P.t = P.g0; P.u = 0; P.acum0 = P.acum; P.w = HUM_P.map((h, k) => P.fuente === 'humedal' ? (P.hum === k ? 1 : 0) : Math.exp(-Math.hypot(PARCHES[h].x - P.x, PARCHES[h].z - P.z) / B.D_EXP)); }
  const acum0 = pts.reduce((a, P) => a + P.acum, 0);
  const cerca = PARCHES.map((p, i) => [i, Math.hypot(p.x - CORA_XZ[0], p.z - CORA_XZ[1])]).filter(a => a[1] <= 1000);
  return { r: (v.basuraCrece != null ? v.basuraCrece : 100 * B.CRECE) / 100, rec: (v.recoleccion != null ? v.recoleccion : 100 * B.RECOLECCION) / 100, pts, acum0, acum: acum0, ratas: 1, dep0: null, total: 0,
    ha: HUM_P.map(h => PARCHES[h].ha), ha0: HUM_P.map(h => PARCHES[h].ha), cal: HUM_P.map(() => 1), func: 1, cerca, ha0Tot: HUM_P.reduce((a, h) => a + PARCHES[h].ha, 0), captura: 0 }; }
function basuraPaso(E, t) {
  const B = BASURA_SUP, b = E.bas, o = E.o, s = E.s, a = t / V.AÑO, g = Math.pow(1 + b.r, a);
  if (b.dep0 == null) b.dep0 = Math.max(1e-3, o.dep);
  const fCora = o.dep / b.dep0, fPob = s.pob / V.POB_K, org = o.gen > 0 ? Math.min(1, (o.desv || 0) / o.gen) * B.ORGANICO : 0; // orgánicos que la red alcanza a tratar (sube con la capacidad de compost)
  // la fracción sin recoger crece con el arrojo clandestino; la red de la propuesta recoge la parte orgánica según sus nodos abiertos; los techos compostan en casa
  const prop = s.e === 'B' || s.e === 'C', fSin = Math.pow(1 + B.ARROJO_EXTRA, a) * (1 - b.rec) / (1 - B.RECOLECCION);
  const nodosCaptura = E.par === 3 && E.mod.estacionObjetivo != null ? (t >= MERCADOS[E.mod.estacionObjetivo].desde ? 1 : 0) : (o.nodos || 0);
  const capt = prop ? B.ORGANICO * Math.min(1, nodosCaptura / MERCADOS.length) : E.techos ? B.ORGANICO * Math.max(Math.min(1, E.techos.m2 * s.supF / SUP_SIMS.M2_HUERTA * PLAN_BAV.PERS_HOG / s.pob), Math.min(1, a / (SUP_SIMS.TECHOS_SEM / 52))) : 0; // techos (sim. 12): los hogares con huerta compostan en casa y, además, Bavaria Común (instituto de tecnologías convergentes) enseña compostaje y abre puntos de compostaje y gestión de residuos al mismo ritmo que se montan los techos [SUP]: recoge la parte orgánica como la red
  b.captura = capt; let acum = 0, capturado = 0;
  /* [SUP] par 01: Corabastos cerca de su tope = bodegas saturadas, más merma y más basura en su entorno y en los bordes de los humedales
     vecinos (La Vaca, El Burro): la generación de esos puntos se multiplica por (1 + 2·sat) en Corabastos y (1 + 0,45·sat) en los bordes, sat = (carga − 0,9) / 0,1 entre 0 y 1 */
  let sat = 0; if (E.ab01 && E.ab01.ult) sat = Math.max(0, Math.min(1, (E.ab01.ult.carga - 0.9) / 0.1)); // par 01: pedido a Corabastos / su tope (AB01)
  else if (E.tope) { const ped = (o.coraKg || 0) + Math.max(0, (o.need || 0) * (1 - (o.recib || 1))); sat = Math.max(0, Math.min(1, (ped / E.tope.kc - 0.9) / 0.1)); E.tope.sat = sat; }
  for (const P of b.pts) {
    if (P.fuente === 'humedal') { const g1 = P.g0 * g * fPob * fSin; P.t = g1 * (1 - capt); P.u = P.t; capturado += g1 * capt; }
    else { P.t = P.g0 * g * (P.fuente === 'corabastos' || P.fuente === 'flores' ? fCora : fPob * (1 + B.ORGANICO * (E.fOrg - 1))); const u0 = Math.min(P.t, P.t * (1 - B.RECOLECCION) * fSin); P.u = u0 * (P.fuente === 'vivienda' ? 1 - Math.max(org, capt) : 1 - capt); capturado += u0 * (P.fuente === 'vivienda' ? Math.max(0, capt - org) : capt); }
    if (sat > 0 && (P.fuente === 'corabastos' || P.fuente === 'humedal')) { const k = 1 + (P.fuente === 'humedal' ? 0.3 : 2) * sat; P.t *= k; P.u *= k; }
    P.acum += P.u * 7 - P.acum * B.LIMPIEZA; acum += P.acum; }
  b.capturado = capturado; b.acum = acum; b.ratas = acum / b.acum0; s.red.fRata = Math.max(0.2, b.ratas);
  b.total = (V.POB_K * fPob + (o.plan ? o.plan.personas : 0)) * B.KG_HAB / 1000 * g + (B.CORA_T + B.FLORES_T) * g * fCora + b.pts.reduce((x, P) => x + (P.fuente === 'humedal' ? P.t : 0), 0);
  let fun = 0;
  for (let k = 0; k < HUM_P.length; k++) { let e = 0; for (const P of b.pts) e += P.u * P.w[k]; b.ha[k] = Math.max(0.2 * b.ha0[k], b.ha[k] - B.HA_T * e);
    const H = b.pts.find(P => P.fuente === 'humedal' && P.hum === k); b.cal[k] = 1 / (1 + B.K_CONT * Math.max(0, H.acum / H.acum0 - 1));
    E.xHb[HUM_P[k]] = Math.sqrt(b.ha[k] / b.ha0[k]) * b.cal[k]; fun += b.ha[k] * b.cal[k]; }
  b.func = (fun + (o.cora.borde || 0) / 1e4 * (o.cora.mad || 0) + (E.obras ? E.obras.wetX + E.obras.bav : 0)) / b.ha0Tot; // obras: La Vaca ampliada y humedal de Bavaria
  const ex = Math.max(0, b.ratas - 1); for (const [p, d] of b.cerca) E.xBas[p] = 1 / (1 + B.AVE_RATA * ex * Math.exp(-d / B.D_EXP));
  // árboles de los parques: tala neta del estado actual (A y D); la propuesta la compensa dentro de Kennedy
  if (!prop && !E.techos) { const a0 = E.arb0 != null ? E.arb0 : (E.arb0 = E.PAR.P3.arboles); E.PAR.P3.arboles = a0 * Math.pow(1 - B.TALA_URB, a); } }
/* ---------- metro: estaciones y peatones (ver METRO_SUP) ---------- */
const EST_W = METRO_SUP.EST.map(S => ZONAS.map(Z => Math.max(0, 1 - Math.hypot(Z[0] - S.x, Z[1] - S.z) / METRO_SUP.RADIO))); // peso de cada zona para cada estación
const EST_POB = METRO_SUP.EST.map(S => ZONAS.reduce((a, Z) => a + (Math.hypot(Z[0] - S.x, Z[1] - S.z) <= METRO_SUP.RADIO ? Z[2] / POB_Z * V.POB_K : 0), 0));
function indMetro(E, s) { const M = E.metro, t = s.t, op = t >= M.desde, fP = s.pob / V.POB_K, ramp = op ? Math.min(1, (t - M.desde + 1) / 26) : 0; // la gente se acostumbra en ~medio año [SUP]
  return { fase: op ? 'opera' : 'obra', desde: M.desde, avance: op ? 100 : Math.min(100, METRO_SUP.AVANCE + (100 - METRO_SUP.AVANCE) * t / Math.max(1, M.desde)), reduccion: op ? M.red : 0,
    estaciones: METRO_SUP.EST.map((S, k) => ({ n: S.n, x: S.x, z: S.z, terminada: t >= METRO_SUP.SEM_EST, peatonesDia: Math.round(EST_POB[k] * fP * METRO_SUP.VIAJES_PERS * METRO_SUP.PART_METRO * ramp) })) }; }

/* ---------- especulación del suelo (ver SUELO_SUP) ---------- */
const Z_EST = ZONAS.map((Z, z) => Math.max(...EST_W.map(W => W[z]))), Z_PLAN = ZONAS.map(Z => Math.max(0, 1 - Math.hypot(Z[0] - PLAN_BAV.CENTRO[0], Z[1] - PLAN_BAV.CENTRO[1]) / SUELO_SUP.RADIO_PLAN));
const Z_SUELO = ZONAS.map((Z, z) => z).filter(z => Z_EST[z] > 0 || Z_PLAN[z] > 0);
function sueloIni(E) { return { prot: (E.par === 5 ? (E.prop ? E.val.proteccion || 0 : 0) : (E.prop ? SUELO_SUP.PROT_PROP : 0)) / 100, extra: E.par === 5 ? (E.val.presionSuelo || 0) / 100 : 0, idx: new Float32Array(NZ).fill(1), indice: 1, riesgo: 0 }; }
function sueloPaso(E) {
  const S = SUELO_SUP, U = E.suelo, s = E.s, t = s.t, M = E.metro, fP = s.pob / V.POB_K;
  const fM = t >= M.desde ? Math.min(1, (t - M.desde) / S.RAMPA) : 0, fPl = E.plan ? (E.o.plan ? E.o.plan.viviendas : 0) / 14002 : 0;
  let riesgo = 0, num = 0, den = 0;
  for (let z = 0; z < NZ; z++) { const objetivo = E.par === 5 ? Math.round(E.val.zonaSuelo ?? -1) : -1, peso = objetivo < 0 ? Math.max(Z_EST[z], Z_PLAN[z]) : objetivo < METRO_SUP.EST.length ? EST_W[objetivo][z] : Z_PLAN[z], prot = E.prop ? U.prot * (objetivo < 0 ? 1 : peso) : 0;
    const sube = (S.P_METRO * fM * Z_EST[z] + S.P_PLAN * fPl * Z_PLAN[z] + U.extra * (t / V.AÑO) * peso) * (1 - 0.5 * prot); U.idx[z] = 1 + sube; // par 05: presión extra y protección en el lugar elegido
    const hog = ZONAS[z][2] / POB_Z * V.POB_K * fP / PLAN_BAV.PERS_HOG; riesgo += hog * S.ARRIENDO * Math.min(1, S.K_DESP * sube) * (1 - prot);
    if (Z_EST[z] > 0 || Z_PLAN[z] > 0) { num += U.idx[z] * hog; den += hog; } }
  U.indice = den > 0 ? num / den : 1; U.riesgo = riesgo; }

/* ---------- economía circular (ver arriba) ---------- */
const DJ_XZ = [5200, 2900], BAV_XZ = (() => { const p = PARCHES.find(q => q.id === 'huertaBav'); return p ? [p.x, p.z] : PLAN_BAV.CENTRO; })();
function indCircular(E) {
  const o = E.o, s = E.s, e = s.e, casa = e === 'A' || e === 'D' ? o.gen * 0.02 * s.adopc : 0, capCo = e === 'B' || e === 'C' ? (o.capComp || 0) : E.techos ? MERCADOS.length * E.PAR.P2.cap * Math.min(1, (s.t / V.AÑO) / (SUP_SIMS.TECHOS_SEM / 52)) : 0, capt = Math.min((E.bas.capturado || 0) * 7000 * BASURA_SUP.ORGANICO / Math.max(1e-6, E.bas.captura || 1), Math.max(0, capCo - (o.desv || 0))), comp = (o.desv || 0) + casa + capt, kg = (v) => v / 7000; // + orgánicos que la red recoge de la calle y composta (ver BASURA_SUP)
  const H = { x: Math.round(KEN_XZ[0]), z: Math.round(KEN_XZ[1]), n: 'Hogares de Kennedy' }, HU = { x: Math.round(KEN_XZ[0]) + 150, z: Math.round(KEN_XZ[1]) + 150, n: 'Huertas de Kennedy' };
  const DJ = { x: DJ_XZ[0], z: DJ_XZ[1], n: 'Relleno Doña Juana' }, CO = { x: Math.round(CORA_XZ[0]), z: Math.round(CORA_XZ[1]), n: 'Corabastos' }, BV = { x: Math.round(BAV_XZ[0]), z: Math.round(BAV_XZ[1]), n: 'Bavaria Común' };
  const fl = [{ de: H, a: DJ, t_dia: kg(o.relleno || 0), tipo: 'organicos' }, { de: CO, a: H, t_dia: kg(o.coraKg || 0), tipo: 'alimentos' }];
  if (e === 'B') fl.push({ de: H, a: BV, t_dia: kg(o.sep || 0), tipo: 'organicos' }, { de: BV, a: HU, t_dia: kg(o.vuelve || 0), tipo: 'compost' }, { de: HU, a: BV, t_dia: kg(Math.max(0, o.exc - o.perdido)), tipo: 'alimentos' }, { de: BV, a: H, t_dia: kg(o.bavKg || 0), tipo: 'alimentos' });
  if (o.merc) { const top = [...o.merc].map((v, k) => [v, k]).filter(a => a[0] > 0).sort((a, b) => b[0] - a[0]).slice(0, 4), tot = o.merc.reduce((a, v) => a + v, 0) || 1;
    for (const [v, k] of top) { const Mk = MERCADOS[k], N = { x: Math.round(Mk.x), z: Math.round(Mk.z), n: Mk.n }, f = v / tot;
      if (e === 'C') fl.push({ de: H, a: N, t_dia: kg((o.sep || 0) * f), tipo: 'organicos' }, { de: N, a: HU, t_dia: kg((o.vuelve || 0) * f), tipo: 'compost' });
      fl.push({ de: HU, a: N, t_dia: kg(Math.max(0, o.exc - o.perdido) * f), tipo: 'alimentos' }, { de: N, a: H, t_dia: kg(v), tipo: 'alimentos' }); } }
  if (e !== 'B' && e !== 'C' && casa > 0) fl.push({ de: H, a: HU, t_dia: kg(casa), tipo: 'compost' });
  return { organicos_t_dia: kg(o.gen), compostado_t_dia: kg(comp), indice: o.gen > 0 ? Math.min(1, comp / o.gen) : 0, comidaLocal_t_dia: kg(o.prod || 0), flujos: fl.filter(f => f.t_dia > 0.01) }; }

/* ---------- cierre gradual y desvíos (ver DESVIO_SUP) ---------- */
function faseCierre(C, t) { if (t < C.t0 || t >= C.t0 + C.dur) return 0; const S = DESVIO_SUP, u = (t - C.t0) / C.dur, ups = Math.min(S.SUBE * C.dur, S.SUBE_MAX); /* 2026-11-26: la obra tarda a lo sumo SUBE_MAX semanas en cerrar la vía (con 260 semanas, el 30 % serían 78: la vía parecería abierta un año y medio) */
  if (t - C.t0 < ups) return Math.min(3, Math.floor((t - C.t0) / ups * 3) + 1) / 3; if (u > 1 - S.BAJA) return Math.max(1, Math.ceil((1 - u) / S.BAJA * 3)) / 3; return 1; }
function desvios(E, t) {
  const C = E.cie, D = DESVIOS[C.via]; C.fase = faseCierre(C, t); if (C.fase > C.faseMax) C.faseMax = C.fase; C.traf = 1 + (E.val.desvioMayo != null ? E.val.desvioMayo / 100 : DESVIO_SUP.DESV) * (E.prop ? 2 / 3 : 1) * C.fase; /* con propuesta: tercera ruta por los pasajes y conexiones de Bavaria Común [SUP] */
  /* 2026-11-26: corrección. El comentario de la línea de arriba se tragaba este reinicio: E.xDes se multiplicaba semana a semana durante el cierre
     (efecto compuesto) y quedaba así para siempre después de reabrir. Ahora cada semana parte de 1, como dice DESVIO_SUP. */
  E.xDes.fill(1); if (!D || !C.fase) return;
  const Vg = V.crecimiento(t).V * factorTraf(E, t), Dh = V.TRAFICO.ZONA_HOY * Math.pow(Vg, V.TRAFICO.B_DIST), Dn = V.TRAFICO.ZONA_HOY * Math.pow(Vg * C.traf, V.TRAFICO.B_DIST), RZ = V.TRAFICO.RED_ZONA;
  for (const id of D.desvio) { const dd = DESVIOS.vias[id].dist; for (let p = 0; p < NP; p++) { if (dd[p] > DESVIO_SUP.RADIO) continue; const r = RP_M[p], fh = fZonaP(dd[p], r, Dh), fn = fZonaP(dd[p], r, Dn);
    E.xDes[p] *= (1 - RZ * fn) / (1 - RZ * fh); } } }

/* ---------- PRUEBAS DE ESTRÉS DE LOS 6 PARES (ver PARES arriba) ---------- */
/* GOBERNANZA (par 06): 8 sectores = zonas de 500 m agrupadas por k-medias ponderadas por población (tools/gobernanza_datos.mjs); cada uno con su Junta de
   Acción Comunal (data3d/asambleas.json, IDPAC) como asamblea local.
   · necesidad de un sector = personas (miles) × (GOB.BASE + falta de comida de sus zonas × 5 + (1 − soporte ecológico de sus zonas) × 0,5) × (1 − 5 % por
     equipamiento ya habilitado) + rezago (la mitad de lo que no se atendió en la ronda anterior) [SUP].
   · cada ronda (decisionCada semanas) hay recursos = presupuesto % de la necesidad total.
   · SIN propuesta: una coordinación central reparte con una fórmula mitad por población y mitad por la necesidad que conoce, la de hace GOB.REZAGO_INFO
     semanas (información agregada y tardía; las fórmulas distritales de reparto pesan la población) [SUP]. CON propuesta: cada asamblea reporta la necesidad actual de su sector; la calidad del reporte baja con el desgaste de las vocerías
     (1 − 0,3·mín(1, rotación / 52)) y sin promotores formados por Bavaria Común (× 0,7); la federación reparte según lo reportado con un piso de 40 %
     de la parte proporcional a la población [SUP].
   · cada GOB.COSTO unidades acumuladas en un sector habilitan un equipamiento (huerta, Estación Circular, parque o salón comunal según la necesidad
     principal) que baja su necesidad 5 % [SUP]. equidad = 1 − Gini de la cobertura (asignado / necesidad) de los sectores, ponderado por población. */
export const GOB_SUP = { BASE: 0.2, REZAGO_INFO: 26, PISO: 0.4, COSTO: 40, EQUIPO: 0.05, ARRASTRE: 0.5, PRIORIDAD: 2 };
const GOB_BARRIOS = [{"n":"Sector San Carlos","x":296,"z":1365,"jac":{"n":"JAC San Carlos","x":345,"z":1206},"zonas":[2,3,9,10,11,12,18,19,20,25,26,27,28,29,34,35,36,37,38,44,45,46,47,48]},{"n":"Sector Ciudad Granada","x":-548,"z":-503,"jac":{"n":"JAC Ciudad Granada","x":-428,"z":-492},"zonas":[0,1,4,5,6,7,8,13,14,15,16,17,21,22,23,24,30]},{"n":"Sector Campo Hermoso","x":584,"z":-118,"jac":{"n":"JAC Campo Hermoso","x":366,"z":2},"zonas":[31,32,33,41,42,43,53,54,55,56]},{"n":"Sector Rincón de los Ángeles","x":2735,"z":100,"jac":{"n":"JAC Rincón de los Ángeles","x":2941,"z":360},"zonas":[66,67,74,75,76,77,84,85,86,87,88,97,98,99,100,109]},{"n":"Sector Francisco José de Caldas","x":1624,"z":1504,"jac":{"n":"JAC Urbanización Francisco José de Caldas","x":1584,"z":1313},"zonas":[57,58,59,60,68,69,70,71,78,79,80,89,90,91,101,102]},{"n":"Sector Visión de Colombia","x":3556,"z":-1166,"jac":{"n":"JAC Visión de Colombia","x":3702,"z":-1217},"zonas":[83,92,93,94,95,96,103,104,105,106,107,108,114,115,116,117,118,119,125,126,127]},{"n":"Sector Santa Paz","x":1370,"z":-1733,"jac":{"n":"JAC Santa Paz","x":1968,"z":-1649},"zonas":[39,40,49,50,51,52,61,62,63,64,65,72,73]},{"n":"Sector Aloha","x":4226,"z":815,"jac":{"n":"JAC Aloha","x":3934,"z":898},"zonas":[110,111,112,113,120,121,122,123,124,128,129,130,131,132,133]}];
const GOB_POB = GOB_BARRIOS.map(b => b.zonas.reduce((a, z) => a + (ZONAS[z] ? ZONAS[z][2] : 0), 0) / POB_Z * V.POB_K);
SL_BARRIO.opciones.push(...GOB_BARRIOS.map((B,k) => [k,B.n]));
const FRAG_P = ['burro', 'techo', 'vaca', 'bosqueBav'].map(id => PARCHES.findIndex(p => p.id === id));
const MOD_P = PARCHES.map((p, i) => /^mod/.test(p.t) && p.t !== 'modBavaria' ? i : -1).filter(i => i >= 0);
const HAB_P = PARCHES.map((p, i) => !/^mod/.test(p.t) && !p.dyn ? i : -1).filter(i => i >= 0);
const MERC_ZONA = MERCADOS.map(M => { let b = 0, d = Infinity; ZONAS.forEach((Z, z) => { const e = Math.hypot(Z[0] - M.x, Z[1] - M.z); if (e < d) { d = e; b = z; } }); return b; });
const ZONA_MERC = ZONAS.map(Z => MERCADOS.some(M => Math.hypot(M.x - Z[0], M.z - Z[1]) <= 400));
/* ======================= 01 ABASTECIMIENTO CON DATOS (pedido de la autora, 2026-11-25) =======================
   Fuentes: docs/fuentes_abastecimiento.md y data3d/abasto_fuentes.json (cada cifra con institución, documento, año y confianza).
   Cada semana (t/día, promedio de la semana):
     · Demanda de Kennedy D = (población + gente del plan parcial) × 0,65 kg/hab/día (SUP.KG_PERS, derivado de SIPSA 2025) × «Demanda» (%)
       × estacionalidad del mes (t/día de cada mes de 2025 / 6.460, DANE-SIPSA). La población crece con «Crecimiento de la demanda».
     · Autoconsumo: «Autoconsumo» (%) de D sale de huertas y producción propia y no se compra [SUP: no hay dato de Kennedy; Bogotá se
       autoabastece en 4,5 %, DTS logística Gobernación de Cundinamarca 2022, pp. 11-12].
     · Mercados (con propuesta): «Cantidad de mercados», cada uno con 17 t/día (131 puestos ocupados × 0,13 t/puesto/día, Plaza Distrital
       de Kennedy, Contraloría de Bogotá 2025 — derivado). El primero es la Plaza Distrital de Mercado Kennedy (punto de OpenStreetMap,
       data3d/tiendas.json); los demás son sitios de la red de la propuesta (sim_red_datos.js MERCADOS) en orden de los sectores más lejos de
       Corabastos (los que pierden primero cuando falta). Los hogares a 1 km o menos compran en el mercado hasta 60 % de lo fresco
       (SUP.TOPE_MERC de sim_vida.js), con peso e^(−d/500 m) [SUP]; los mercados compran directo a productores (circuitos cortos) y
       no pasan por Corabastos [SUP de la propuesta]. Cuando Corabastos no alcanza, los mercados con capacidad libre cubren parte de lo
       que falta en su radio (segunda vuelta).
     · Corabastos: pedido total L = resto de la ciudad y la región (6.460 − demanda de Kennedy de hoy, creciendo igual) + lo que Kennedy le
       pide. Oferta de la región S = 6.460 × «Volumen» × crecimiento × mes. Tope = 6.460 × (1 + «Tope de Corabastos») (inferencia de la
       ocupación del 90 %, SDDE-FAO 2018: no hay cifra oficial de capacidad). Llegadas = mín(L, S, tope); todos los compradores reciben la
       misma fracción f = llegadas / L, y dentro de Kennedy las zonas cercanas a Corabastos tienen ventaja (e^(−costo/3 km), SUP.INCL).
     · Llegadas por tipo de vehículo: llegadas / 6,21 t por vehículo (SIPSA 2025) repartidas con la mezcla SDM 2020 × SIPSA 2025;
       por franja: 12–20 h 44,6 %, 20–24 h 15,1 %, 4–6 h 40,2 % de las toneladas (horarios de Corabastos × grupos SIPSA: confianza baja).
     · Cobertura por zona = (autoconsumo + mercados + Corabastos) / necesidad: la regla de game over (zona bajo 80 % 4 semanas) no cambia. */
export const AB01 = {
  T_DIA: 6460,          // t/día que entraron a Corabastos en 2025 (2.357.973 t / 365), DANE-SIPSA_A, anexos ene–dic 2025, hoja 2 (alta)
  MES: [6655, 6700, 6426, 6480, 6759, 6241, 6839, 6292, 6331, 6451, 6097, 6252], // t/día de cada mes de 2025, SIPSA (alta)
  MES0: 10,             // la semana 0 del modelo es noviembre de 2026 (tools/escenarios_instalacion.mjs)
  VEH_DIA: 1040, T_VEH: 6.21, PESADOS: 0.913, // vehículos con carga por día, t por vehículo y parte pesada, SIPSA 2025 hoja 4 (alta)
  QUEDA: 0.85,          // parte de lo que entra que se queda en la ciudad (Corabastos en DTS logística 2022, p. 14) (media)
  TIPOS: [              // participación en los vehículos de abastecimiento (SDM 2020 aforo Av. Agoberto Mejía × SIPSA 2025); carga útil [SUP]
    { k: 'liv', n: 'Liviano (camioneta, campero)', c: 0.8, p: 0.087, col: '#9dc8f7' },
    { k: 'c2p', n: 'Camión 2 ejes pequeño (C2P)', c: 5, p: 0.770, col: '#338ced' },
    { k: 'c2g', n: 'Camión 2 ejes grande (C2G)', c: 9, p: 0.089, col: '#00a888' },
    { k: 'c3', n: 'Doble troque (C3)', c: 17, p: 0.030, col: '#d28e05' },
    { k: 'c4', n: 'Tractomula (4 ejes o más)', c: 30, p: 0.024, col: '#e24d8b' }],
  FRANJAS: [            // ingreso de carga (Corabastos, página «Horarios», × grupos SIPSA 2025 × ACIDC 2022): derivado, confianza baja
    { n: '12–20 h', h0: 12, h1: 20, p: 0.446, que: 'hortalizas, papa criolla, yuca y arracacha' },
    { n: '20–24 h', h0: 20, h1: 24, p: 0.151, que: 'papa negra' },
    { n: '4–6 h', h0: 4, h1: 6, p: 0.402, que: 'frutas, plátano, granos y procesados' }],
  MERC_T: 28,           // v5: CAPACIDAD por mercado = 215 puestos × 0,13 t/puesto/día (PDM Kennedy: 215 puestos, 131 ocupados que venden ≈17 t/día; Contraloría de Bogotá 2025, pp. 25 y 33-34) (derivado). v4 usaba 17 t/día (lo que vende hoy, 61 % de su capacidad) como si fuera el tope: por eso las barritas se llenaban
  MERC_UMAX: 0.7,       // v5.2 (pedido de la autora: «las barras de los mercados nunca pasan del 70 %»): carga máxima de un mercado = 70 % de 28 t/día = 19,6 t/día (la Plaza de Kennedy hoy vende 17 t/día, 61 %), también en un faltante de Corabastos. v5 [SUP de diseño] era 0,8: en operación normal un mercado vende hasta 80 % de su capacidad (quedan puestos libres; la Plaza de Kennedy hoy trabaja al 61 %); lo que pasa de ahí sigue comprándose en Corabastos. Solo en un faltante de Corabastos (2ª vuelta) llega a 100 %
  MERC_UREG: 0.55,      // v5.2 [SUP de la propuesta]: el acopio regional llena hasta 55 % de la capacidad (antes 70 %): así las barras quedan entre 55 y 70 % según lo que compra Kennedy en cada uno, y no todas pegadas al tope (ver ab01Paso)
  MERC_T_HOY: 17,      // t/día que vende hoy la Plaza Distrital de Kennedy (131 puestos ocupados × 0,13), Contraloría 2025
  MERC_MAX: 50,         // v4: «muchos más» (pedido de la autora). 20 × 17 = 340 t/día ≈ las 19 plazas distritales de Bogotá (≈342 t/día, IPES 2024 en Contraloría 2025)
  MERC_DEF: 44,         // v5: «más mercados» (pedido de la autora): 44 × 28 t/día de capacidad, usados hasta 80 %. v4: 36 × 17 = 612 t/día (1,8 veces las 19 plazas distritales de Bogotá: contradicción declarada en docs/sim01_abastecimiento_v4.md). v3: 12 × 17 ≈ 200 t/día: valor propuesto en el dossier (antes P1.capAcopio = 600 t/día, 1,8 veces todas las plazas de Bogotá)
  RADIO: 1000, DECAE: 500, // [SUP] radio de compra a pie (15 minutos) y caída del peso con la distancia
  CAPTA: V.SUP.TOPE_MERC,  // [SUP] hasta 60 % de lo fresco de una zona puede salir de sus mercados (sim_vida.js)
  INCL: 3,              // [SUP] km generalizados: ventaja de las zonas cercanas a Corabastos cuando falta (sim_vida.js SUP.INCL)
  ABRE_TOTAL: 700,      // [SUP] v5: los mercados de la propuesta abren repartidos a lo largo de los 15 años, el último en la semana 700 (año 13,5): con 36, uno cada 20 semanas; con 50, uno cada 14 («con el tiempo se abren más y más mercados», v5). v4 (ABRE: 8): un mercado nuevo de la propuesta abre cada 8 semanas (antes 13; los 36 abren en ~5,5 años); la Plaza Distrital de Kennedy ya existe
  PLAZA_KEN: { n: 'Plaza Distrital de Mercado Kennedy', x: 922, z: 2237 }, // OSM (data3d/tiendas.json: 6263,4; 925,3) → mundo con lw()
  SOSTENIBLE_MIN: 87    // veredicto del par 01: sostenible si ningún sector baja de 87 % (zona «cerca» del límite, CERCA.abasto) y Corabastos nunca pasa su tope
};
/* fuentes del par 01 (lámina «Fuentes» de slides_sim.js e informe): cita corta + enlace; detalle en docs/fuentes_abastecimiento.md */
export const AB01_FUENTES = [
  { c: 'DANE, SIPSA_A: boletines y anexos de abastecimiento, ene–dic 2025', d: 'Ingresos a Corabastos: 2.357.973 t (6.460 t/día), 1.040 vehículos de carga/día, 6,21 t por vehículo, meses de 2025', u: 'https://www.dane.gov.co/files/operaciones/SIPSA/anex-SIPSAabastecimiento-dic2025.xlsx' },
  { c: 'SED (2024), Boletín estadístico Localidad Kennedy, Tabla 2 (DANE-SDP)', d: 'Población de Kennedy 2026: 1.080.742 hab; crecimiento ≈0 %/año 2024–2028', u: 'https://www.educacionbogota.edu.co/portal_institucional/sites/default/files/inline-files/2022/08%20Boleti%CC%81n%20Kennedy%202024.pdf' },
  { c: 'SDS (2025), ASIS Localidad Kennedy 2024', d: 'Serie DANE sin ajuste: +0,48 %/año 2017–2022', u: 'https://saludata.saludcapital.gov.co/osb/wp-content/uploads/2026/01/8.-ASIS_Kennedy_2024.pdf' },
  { c: 'SDM (2020), Caracterización del transporte de carga, Etapa V', d: 'Aforo Av. Agoberto Mejía x Corabastos: C2P 84 %, C2G 10 %, C3 3 %, 4 ejes o más 3 %', u: 'https://www.simur.gov.co/sites/simur.gov.co/files/2024-12-24/biblioteca/20241224-919-737.pdf' },
  { c: 'SDM (2020), Caracterización del transporte de carga: resumen ejecutivo', d: 'Capacidad promedio 6,6 t por vehículo en el nodo Corabastos', u: 'https://observatorio.movilidadbogota.gov.co/sites/default/files/2025-09/Resumen%20ejecutivo%20de%20resultados%20Caracterizaci%C3%B3n%20de%20carga.pdf' },
  { c: 'Corabastos (2026), Horarios', d: 'Ingreso de hortalizas 15–19 h, papa 20 h, frutas y granos 4–5 h; venta 1–18 h', u: 'https://corabastos.com.co/horarios/' },
  { c: 'Gobernación de Cundinamarca (2022), DTS logística y distribución de alimentos (cita SDDE-FAO 2018)', d: 'Saturación de Corabastos (ocupación 80–100 %), 85 % se queda en la ciudad, Bogotá se autoabastece en 4,5 %', u: 'https://regionmetropolitana.gov.co/sites/default/files/archivos/publicaciones/2024-12-24/4.-identificacin.-logstica-y-distribucin-de-alimentos.pdf' },
  { c: 'Contraloría de Bogotá (2025), Situación de las plazas de mercado', d: 'Plaza Distrital de Kennedy: 215 puestos, 131 ocupados; 19 plazas ≈342 t/día; ≈0,13 t por puesto al día', u: 'https://www.contraloriabogota.gov.co/sites/default/files/2025-05/Informe%20situaci%C3%B3n%20plazas%20de%20mercado%20en%20Bogot%C3%A1%20D,C.pdf' },
  { c: 'MinTransporte, Resolución 4100 de 2004 (mod. 1782 de 2009)', d: 'Peso bruto máximo por tipo de camión (base de las cargas útiles supuestas)', u: 'https://www.alcaldiabogota.gov.co/sisjur/normas/Norma1.jsp?i=15600' },
  { c: 'OpenStreetMap', d: 'Ubicación de la Plaza Distrital de Mercado Kennedy', u: 'https://www.openstreetmap.org/' }];
AB01.KEN_T_DIA = V.POB_K * V.SUP.KG_PERS / 1000; // ≈ 702 t/día: demanda de frescos de Kennedy hoy (dossier: 660–750)
AB01.T_VEH_MEZCLA = AB01.TIPOS.reduce((a, T) => a + T.p * T.c, 0); // 5,95 t: promedio de la mezcla supuesta (SIPSA observa 6,21)
const AB_POBZ = ZONAS.map(Z => Z[2]), AB_POBT = AB_POBZ.reduce((a, v) => a + v, 0), AB_SH = AB_POBZ.map(p => p / AB_POBT);
const AB_GC = ZONAS.map((_, z) => Math.exp(-COSTO[z][0] / AB01.INCL)), AB_GCM = AB_GC.reduce((a, g, z) => a + g * ZONAS[z][2], 0) / ZONAS.reduce((a, Z) => a + Z[2], 0);
const AB_U = AB_GC.map(g => Math.sqrt(AB_GCM / g)); // peso del faltante por zona (ver ab01Paso)
/* v4 (pedido de la autora: «muchos más» mercados, en parques, bajo Corabastos, donde hay muchas huertas en techos y edificios altos):
   17 sitios más, calculados con tools en el scratchpad (sitios_merc.mjs) y fijados aquí: parques de más de 1 ha de data3d/parques.json
   (centroide), grupos a 350 m de las construcciones de 15 pisos o más del catastro (data3d/escenario01_construcciones.geojson: donde van
   primero las huertas en cubiertas) y el sur de Corabastos; sin repetir sitios de MERCADOS (a menos de 300 m) ni entre sí (450 m). */
const AB_EXTRA = [{ n: 'Sur de Corabastos', x: 846, z: 2296 }, { n: 'Torres de 15+ pisos (oriente)', x: 4865, z: 721 }, { n: 'Torres de 15+ pisos (norte)', x: 3097, z: -1428 },
  { n: 'Parque zona verde (occidente)', x: -1442, z: -441 }, { n: 'Parque Cayetano Cañizares', x: 783, z: 1637 }, { n: 'Parque Ciudad Hayuelos', x: 4446, z: -2393 },
  { n: 'Parque Tejar San Eusebio', x: 4833, z: 2588 }, { n: 'Parque Bellavista-Dindalito', x: -648, z: -550 }, { n: 'Parque Villa Alsacia', x: 3594, z: -521 },
  { n: 'Parque Bosques de Castilla', x: 2500, z: 358 }, { n: 'Parque Castilla', x: 2869, z: -148 }, { n: 'Parque Riveras de Occidente', x: -9, z: -438 },
  { n: 'Parque San Ignacio', x: 829, z: -1500 }, { n: 'Parque Ciudad Techo II', x: 1908, z: -225 }, { n: 'Parque Portal de las Américas', x: 3151, z: 728 },
  { n: 'Parque Primavera', x: 525, z: -759 }, { n: 'Parque La Igualdad', x: 4635, z: 1774 }];
/* sitios de mercado en orden: la Plaza Distrital de Kennedy y luego los sitios de la red de la propuesta cerca de los sectores más lejos de
   Corabastos (población × costo a Corabastos en su radio), sin dos mercados a menos de 800 m mientras haya otros sitios */
const AB_SITIOS = (() => {
  const peso = (x, z) => ZONAS.reduce((a, Z, i) => { const d = Math.hypot(Z[0] - x, Z[1] - z); return a + (d <= AB01.RADIO ? Z[2] * COSTO[i][0] * Math.exp(-d / AB01.DECAE) : 0); }, 0);
  const cand = [...MERCADOS, ...AB_EXTRA].map(M => ({ n: M.n, x: M.x, z: M.z, tipo: 'mercado', real: false, s: peso(M.x, M.z) }));
  const out = [{ ...AB01.PLAZA_KEN, tipo: 'plaza', real: true }];
  /* v5 (pedido de la autora): primero el parque con canchas al sur de Corabastos y el parque dentro del conjunto de vivienda junto a las
     Américas (donde hay huertas en cubiertas); luego el orden de siempre */
  for (const n of ['Parque Cayetano Cañizares', 'Parque Portal de las Américas']) { const i = cand.findIndex(c => c.n === n); if (i >= 0) out.push(cand.splice(i, 1)[0]); }
  while (cand.length) { let bi = -1, bs = -1;
    for (let i = 0; i < cand.length; i++) { const c = cand[i], lejos = out.every(o => Math.hypot(o.x - c.x, o.z - c.z) >= 800), s = c.s * (lejos ? 1 : 0.01); if (s > bs) { bs = s; bi = i; } }
    out.push(cand.splice(bi, 1)[0]); }
  return out.slice(0, AB01.MERC_MAX).map((S, k) => ({ ...S, x: Math.round(S.x), z: Math.round(S.z), k,
    zonas: ZONAS.map((Z, z) => [z, Math.hypot(Z[0] - S.x, Z[1] - S.z)]).filter(a => a[1] <= AB01.RADIO).map(([z, d]) => [z, Math.exp(-d / AB01.DECAE)]) }));
})();
export const AB01_SITIOS = AB_SITIOS.map(({ zonas, s, ...r }) => r);
const AB_NZ = ZONAS.length, AB_NEED = new Float64Array(AB_NZ), AB_REST = new Float64Array(AB_NZ), AB_MK = new Float64Array(AB_NZ), AB_R = new Float64Array(AB_NZ), AB_CO = new Float64Array(AB_NZ), AB_EX = new Float64Array(AB_NZ), AB_W = new Float64Array(AB_NZ), AB_HU = new Float64Array(AB_NZ), AB_GOT = new Float64Array(AB_NZ);
/* ======================= 01 ABASTECIMIENTO · v3 (pedido de la autora, 2026-11-26, docs/sim01_abastecimiento_v3.md) =======================
   Datos de la autora: población 1.034.838 hab; 0,951 kg/hab/día (referencia de abastecimiento per cápita, no consumo observado); demanda
   inicial 984 t/día; ingreso a Corabastos 6.460 t/día; capacidad de referencia 14.000 t (documento técnico regional; no es un límite diario).
   Cada semana (t; los flujos en t/día × 7):
     · Población = P0 × (1 + crecimiento)^(semana/52); si la autora mueve el deslizador en la semana s0, desde ahí = valor elegido × (1 + c)^((semana − s0)/52).
     · Demanda de Kennedy D = población × 0,951 kg × consumo (%). Se cubre con autoconsumo, mercados (con propuesta), huertas hidropónicas
       (con propuesta) y lo que se compra en Corabastos (todo lo demás [SUP: el dossier estima que ~700 de 1.100 t/día pasan por Corabastos; con
       los datos de la autora toda la demanda no cubierta por la red se compra allí]).
     · Pedido a Corabastos L = resto de la región + lo que pide Kennedy. Resto = 6.460 × (1 − 0,0155) − 984 = 5.376 t/día en 2025 (equilibrio:
       lo que entra = lo que sale + pérdidas), creciendo con la misma tasa de población.
     · Ingresos = mín(6.460 × «Ingreso», 6.460 × (1 + «Tope de ingreso diario»)) − lo que compran los mercados de la propuesta directo a
       productores (circuitos cortos [SUP de la propuesta]). NO crecen con la población: la demanda no llena Corabastos.
     · Pérdidas = k × inventario inicial × 7, k = 0,0155 × 6.460 / inventario de 2025 (≈100 t/día de residuos de Corabastos, DANE 2012, p. 2:
       0,0155 t por t que entra; se suponen proporcionales a lo almacenado [SUP: lo que no se vende se pierde]).
     · Inventario final = inventario inicial + ingresos − despachos − pérdidas; despachos = mín(pedido, inventario inicial + ingresos − pérdidas).
       Inventario de 2025 = Σ recibo de cada nave × días que permanece (BOD01) ≈ 9.860 t (70 % de 14.000). [v4: la mitad, ≈4.930 t; ver ab01Paso]
     · Saturación = inventario ÷ 14.000 × 100. Todos los compradores reciben la misma fracción f = despachos / pedido; dentro de Kennedy el faltante
       pesa más en las zonas lejos de Corabastos (como antes). Recibido por zona = autoconsumo + mercados + huertas + Corabastos.
     · Sectores (los 8 de GOB_BARRIOS): déficit = máx(0, demanda − recibido); cobertura = recibido ÷ demanda.
   GAME OVER (iguales con y sin propuesta): déficit (un sector bajo 80 % 4 semanas seguidas), saturación (inventario > 14.000 t 4 semanas
   seguidas) y residuos de Kennedy (296 t/día sin recoger 4 semanas seguidas, RES01). */
export const AB01V3 = {
  P0: 1034838, KG: 0.951, ING: 6460, CAP: 14000,
  PERD: 0.0155,          // t perdidas por t que entra: ≈100 t/día de residuos en Corabastos / 6.460 (DANE 2012 p. 2; SIPSA 2025), docs/fuentes_bodegas_residuos.md §3
  COB_MIN: 0.8, SEMANAS: 4,
  HUERTA_M2: SUP_SIMS.M2_HUERTA, HUERTA_REND: 6, HUERTA_DEF: 50, // [SUP] 50 m² × 6 kg/m²·año (P1.rend, sim_modelos.js) por huerta
  /* v5.2 (pedido de la autora: «las huertas en los techos deben verse instalándose con los años»): por defecto las huertas se instalan solas en
     las 2.132 cubiertas aptas de data3d/huertas_hidro.js (primero las más altas), en línea recta hasta la semana 754 (año 14,5): ≈147 en el
     año 1, ≈735 en el año 5, ≈1.470 en el año 10, 2.132 en el 15 [SUP: calendario]. El deslizador las puede fijar en un número. */
  HUERTA_TECHOS: 2132, HUERTA_SEM_FIN: 754
};
export function huertasAuto(sem) { return Math.round(AB01V3.HUERTA_TECHOS * Math.max(0, Math.min(1, sem / AB01V3.HUERTA_SEM_FIN))); }
AB01V3.DEM0 = AB01V3.P0 * AB01V3.KG / 1000;                            // 984 t/día
AB01V3.HUERTA_T = AB01V3.HUERTA_M2 * AB01V3.HUERTA_REND / 365 / 1000;  // 0,00082 t/día por huerta
AB01V3.SECTORES = GOB_BARRIOS.map(b => ({ n: b.n, x: b.x, z: b.z, zonas: b.zonas }));
/* población de la semana (ver encabezado) */
function ab01Pob(A, sem) { const g = (w) => Math.pow(1 + A.crece, w / V.AÑO);
  if (A.pobK != null && A.pobDesde != null && sem >= A.pobDesde) return A.pobK * g(sem - A.pobDesde);
  if (A.pobK != null && A.pobDesde == null) return A.pobK * g(sem);
  return AB01V3.P0 * g(sem); }
function ab01Ini(E) {
  const v = E.val, K = AB01V3, nM = E.prop ? Math.max(0, Math.min(AB01.MERC_MAX, Math.round(v.mercados != null ? v.mercados : AB01.MERC_DEF))) : 0;
  /* v5.2: huertas hidropónicas en «auto» (huertasH < 0 o sin valor) = se instalan con los años (HUERTA_AUTO); un número ≥ 0 las fija */
  const nHf = E.prop && v.huertasH != null && +v.huertasH >= 0 ? Math.round(+v.huertasH) : null, nH = E.prop ? (nHf != null ? nHf : 0) : 0;
  E.ab01 = { dem: (v.demanda != null ? v.demanda : 100) / 100, vol: (v.volumen != null ? v.volumen : 100) / 100, auto: (v.autoconsumo || 0) / 100,
    topeF: (v.coraTope != null ? v.coraTope : 11) / 100, crece: (v.pobCrece || 0) / 100, nM, nH, nHf, ult: null, cap: K.CAP, nQuit: 0,
    pobK: v.pobK != null && v.pobDesde != null ? Math.max(K.P0, +v.pobK) : v.pobK != null && Math.abs(v.pobK - K.P0) > 0.5 ? Math.max(K.P0, +v.pobK) : null,
    pobDesde: v.pobDesde != null ? Math.max(0, Math.round(v.pobDesde)) : null,
    inv: K.INV0, rachaSat: 0, rachaRes: 0, rachaDef: new Uint16Array(K.SECTORES.length),
    abre: AB_SITIOS.map((S, k) => (S.real ? 0 : Math.round(k * AB01.ABRE_TOTAL / Math.max(1, nM - 1)))), /* v5: los nM mercados abren repartidos hasta la semana 700 */ uso: new Float64Array(AB01.MERC_MAX), reg: new Float64Array(AB01.MERC_MAX) };
  E.PAR.P1.capAcopio = nM * AB01.MERC_T; // la red interna de sim_vida.js con la misma capacidad (solo para lo que no reemplaza este bloque)
}
/* una semana de abastecimiento (después de V.paso): reemplaza la cobertura de sim_vida.js para el par 01 */
function ab01Paso(E) {
  const A = E.ab01, o = E.o, s = E.s, t = s.t, sem = t + 1, K = AB01, KV = AB01V3, NZ = AB_NZ;
  const g = Math.pow(1 + A.crece, sem / V.AÑO), mes = (K.MES0 + Math.floor((t % V.AÑO) * 12 / V.AÑO)) % 12, est = 1; // v3: sin estacionalidad (la autora da promedios)
  if (E.prop) { A.nH = A.nHf != null ? A.nHf : huertasAuto(sem); desPaso(A, t); } // v5.2: huertas que se instalan y naves de Corabastos que se quitan con los años
  const CAPS = A.cap || KV.CAP; // v5.2: capacidad de Corabastos con las naves que quedan (sin propuesta: 14.000 t)
  const pob = ab01Pob(A, sem), demK = pob * KV.KG / 1000 * A.dem, autoT = A.auto * demK;
  for (let z = 0; z < NZ; z++) { AB_NEED[z] = demK * AB_SH[z]; AB_REST[z] = AB_NEED[z] * (1 - A.auto); AB_MK[z] = 0; AB_EX[z] = 0; AB_HU[z] = 0; }
  // 1ª vuelta: compra a pie en los mercados abiertos (cada mercado reparte su capacidad si le piden más)
  const act = []; for (let k = 0; k < A.nM; k++) if (t >= A.abre[k]) act.push(AB_SITIOS[k]);
  A.uso.fill(0); const pide = new Float64Array(AB01.MERC_MAX);
  for (let z = 0; z < NZ; z++) AB_W[z] = 0;
  for (const S of act) for (const [z, w] of S.zonas) AB_W[z] += w;
  for (const S of act) for (const [z, w] of S.zonas) pide[S.k] += AB_REST[z] * K.CAPTA * Math.min(1, AB_W[z]) * w / AB_W[z];
  const uMax = K.MERC_T * K.MERC_UMAX; // v5: carga normal hasta 80 % de la capacidad (ver AB01.MERC_UMAX)
  for (const S of act) { const f = pide[S.k] > uMax ? uMax / pide[S.k] : 1;
    for (const [z, w] of S.zonas) { const q = AB_REST[z] * K.CAPTA * Math.min(1, AB_W[z]) * w / AB_W[z] * f; AB_MK[z] += q; A.uso[S.k] += q; } }
  // huertas hidropónicas (con propuesta): su producción se reparte por población y baja lo que falta en cada zona
  const nHAct = A.nHf != null ? A.nH * Math.min(1, sem / 520) : A.nH /* auto: A.nH ya crece con los años; meta fija: progresiva hasta el año 10 */, huertaP = nHAct * KV.HUERTA_T; let huertaT = 0, merc1 = 0;
  for (let z = 0; z < NZ; z++) { merc1 += AB_MK[z]; if (huertaP > 0) { const q = Math.min(Math.max(0, AB_REST[z] - AB_MK[z]), huertaP * AB_SH[z]); AB_HU[z] = q; huertaT += q; } }
  // Corabastos: pedido de Kennedy y de la región; inventario semanal (stock y flujo)
  let RK = 0; for (let z = 0; z < NZ; z++) { AB_R[z] = Math.max(0, AB_REST[z] - AB_MK[z] - AB_HU[z]); RK += AB_R[z]; }
  /* v5 · ACOPIO REGIONAL [SUP de la propuesta, pide aprobación de la autora]: cada mercado abierto es también punto de acopio («mercados de
     barrio y puntos de acopio» de la propuesta): con la capacidad que le sobra después de Kennedy, hasta 70 % (AB01.MERC_UREG), compra directo
     a productores para tenderos y compradores de fuera de Kennedy. Esas toneladas salen del pedido del resto de la región a Corabastos. */
  A.reg.fill(0); let regT = 0; const uReg = K.MERC_T * K.MERC_UREG;
  for (const S of act) { const q = Math.max(0, uReg - A.uso[S.k]); A.reg[S.k] = q; regT += q; }
  /* v4 (docs/sim01_abastecimiento_v4.md, Implementación): la región manda más a medida que crece (ingresos × g, como el pedido del resto);
     lo que sale cada semana es inventario ÷ permanencia (salida de primer orden, ley de Little), y la permanencia crece con la congestión
     (TomTom, CONG01): la mercancía tarda más en salir y el inventario sube. Pérdidas = 0,0155 de lo que sale. Lo que nadie pide se queda. */
  const resto = Math.max(0, KV.RESTO0 * g - regT), L = resto + RK, tope = KV.ING * (1 + A.topeF), S_ = Math.min(A.vol * L / (1 - KV.PERD), tope); let ing = Math.max(0, S_); // v4: la región manda lo que le piden (× «Ingreso»); lo que compran los mercados directo ya no está en L
  /* v5 (docs/sim01_abastecimiento_v5.md, Implementación): la permanencia sigue la congestión JUNTO A CORABASTOS, no la de toda la ciudad:
     cC = nivel de base × camiones que llegan ÷ los de 2025.
       · camiones: ing ÷ 6.460 (SIPSA: 6,21 t por vehículo, la misma carga media): menos carga que entra → menos camiones en sus accesos.
       · nivel de base sin propuesta: el de la ciudad, que sube cada año (TomTom, CONG01, como en v4).
       · nivel de base con propuesta [SUP de la propuesta, pide aprobación de la autora]: el de 2025 (0,62): los viajes de carga y de compra
         que se van a los mercados de barrio y puntos de acopio dejan los accesos de Corabastos sin la subida de la ciudad (el mismo supuesto
         que factorTraf: «los mercados de barrio a pie y el acopio cercano quitan viajes en carro y camión hacia Corabastos»). */
  const años01 = sem / V.AÑO, cCiudad = CONG01.N0 + CONG01.PP * años01, fMerc = A.nM > 0 ? act.length / A.nM : 0;
  /* v5.2: con propuesta el nivel de base baja además hasta −25 % a medida que abren los mercados (× (1 − 0,25 × fracción abierta)): el mismo
     supuesto de factorTraf y de los colores de las vías de abasto_capas.js («los mercados de barrio a pie y el acopio cercano quitan viajes en
     carro y camión hacia Corabastos»); antes solo lo usaban el tráfico y el mapa, no la permanencia */
  const cC = Math.max(0, (E.prop ? CONG01.N0 * (1 - 0.25 * fMerc) : cCiudad) * (ing / KV.ING));
  /* v5.1 · REGLA DEL MODELO (decisión de la autora, ya no es [SUP]): «cuando no hay dónde poner la comida, la mercancía sale más lento y
     Corabastos se llena». La comida sigue llegando y, cuanto más llena está la central, más tarda en salir: cola = 1 + β·[(1 − ρ0) ÷ (1 − ρ) − 1],
     ρ = inventario ÷ 14.000, ρ0 = ρ de 2025 (≈ 0,35; con ρ = ρ0 la cola vale 1 y la permanencia es la de v4), β = KV.COLA_B = 0,5 (forma de
     cola M/M/1 amortiguada a la mitad: calibrada para que sin propuesta la central llegue a su límite hacia el año 10–11, no en el 4; el valor
     de β lo fija la calibración, no un dato medido). Si lo que entra × permanencia pasa del umbral no hay equilibrio y el inventario se dispara.
     ρ se acota en 0,97 para que el paso semanal no se vuelva infinito. */
  const rho0 = KV.INV0 / KV.CAP, rho = Math.min(0.97, A.inv / KV.CAP), cola = 1 + KV.COLA_B * ((1 - rho0) / (1 - rho) - 1);
  const Tp = KV.T0 * (1 + cC) / (1 + CONG01.N0) * cola, inv0 = A.inv, eq = ing * Tp, invL = eq + (inv0 - eq) * Math.exp(-7 / Tp);
  let sale = Math.max(0, inv0 + 7 * ing - invL), desp = sale * (1 - KV.PERD), perd = sale * KV.PERD, inv = invL;
  /* lo que nadie pide no sale. v5: si con la permanencia nueva sobra mercancía (el inventario está sobre su equilibrio ing × Tp), los
     mayoristas piden menos a la región esa semana: entra lo justo para despachar lo pedido y bajar hacia el equilibrio (antes el inventario
     quedaba congelado y la barra no podía bajar aunque entrara menos). */
  if (desp > 7 * L) { desp = 7 * L; perd = desp * KV.PERD / (1 - KV.PERD); ing = Math.max(0, (invL - inv0 + desp + perd) / 7); inv = Math.max(0, inv0 + 7 * ing - desp - perd); }
  /* v5: no cabe más de 120 % de 14.000 t (lo que dibuja la barra): los camiones que no caben no descargan esa semana */
  if (inv > 1.2 * CAPS) { inv = 1.2 * CAPS; ing = Math.max(0, (inv - inv0 + desp + perd) / 7); }
  A.inv = inv; A.Tp = Tp; bodPaso(A, inv);
  const lleg = ing, a0 = ing, f = L > 0 ? desp / (7 * L) : 1;
  /* reparto dentro de Kennedy: el faltante total es (1 − f) de lo pedido; cada zona carga una parte del faltante proporcional a
     u = (GC medio / GC de la zona)^0,5 (las zonas lejos de Corabastos pierden más) [SUP: exponente 0,5 para que un faltante pequeño no
     deje sin comida a una sola zona]; λ por bisección para que la suma cuadre, con tope 100 % por zona */
  if (f >= 0.99999) for (let z = 0; z < NZ; z++) AB_CO[z] = AB_R[z];
  else { const meta = (1 - f) * RK; let lo = 0, hi = 1; const F = (k) => { let x = 0; for (let z = 0; z < NZ; z++) x += AB_R[z] * Math.min(1, k * AB_U[z]); return x; };
    while (F(hi) < meta && hi < 1e6) hi *= 2; for (let i = 0; i < 36; i++) { const m = (lo + hi) / 2; if (F(m) < meta) lo = m; else hi = m; }
    for (let z = 0; z < NZ; z++) AB_CO[z] = AB_R[z] * (1 - Math.min(1, hi * AB_U[z])); }
  // 2ª vuelta: lo que Corabastos no alcanzó lo cubren los mercados con capacidad libre en su radio
  if (f < 0.99999 && act.length) for (const S of act) { let libre = K.MERC_T * K.MERC_UMAX - A.uso[S.k] - A.reg[S.k]; /* v5.2: tampoco en un faltante pasa del 70 % */ if (libre <= 1e-6) continue; let falta = 0;
    for (const [z, w] of S.zonas) falta += Math.max(0, AB_R[z] - AB_CO[z] - AB_EX[z]) * w / AB_W[z];
    if (falta <= 1e-9) continue; const fr = Math.min(1, libre / falta);
    for (const [z, w] of S.zonas) { const q = Math.max(0, AB_R[z] - AB_CO[z] - AB_EX[z]) * w / AB_W[z] * fr; AB_EX[z] += q; A.uso[S.k] += q; } }
  // cobertura por zona y totales
  const zRec = new Float32Array(NZ), zLoc = new Float32Array(NZ), zRed = new Float32Array(NZ), dz = new Float64Array(NZ);
  let rec = 0, coraK = 0, mercT = 0, zMin = Infinity, zArg = -1, nBajo = 0;
  for (let z = 0; z < NZ; z++) { const a = AB_NEED[z] * A.auto, m = AB_MK[z] + AB_EX[z], got = a + m + AB_HU[z] + AB_CO[z], r = AB_NEED[z] > 0 ? got / AB_NEED[z] : 1;
    AB_GOT[z] = got; zRec[z] = r; zLoc[z] = AB_NEED[z] > 0 ? (a + AB_HU[z]) / AB_NEED[z] : 0; zRed[z] = AB_NEED[z] > 0 ? m / AB_NEED[z] : 0; dz[z] = AB_NEED[z] * 7000;
    rec += got; coraK += AB_CO[z]; mercT += m; if (r < zMin) { zMin = r; zArg = z; } if (r < 0.8) nBajo++; }
  // los 8 sectores de Kennedy: demanda, recibido, déficit y cobertura
  let secMin = Infinity, secArg = -1;
  const sectores = KV.SECTORES.map((S, i) => { let d = 0, r = 0; for (const z of S.zonas) { d += AB_NEED[z]; r += AB_GOT[z]; } const c = d > 0 ? r / d : 1; if (c < secMin) { secMin = c; secArg = i; }
    return { n: S.n, x: S.x, z: S.z, zonas: S.zonas, dem: d, rec: r, def: Math.max(0, d - r), cob: c }; }); /* zonas: para resaltar el sector en el mapa (sector_deficit.js) */
  const vehDia = lleg / K.T_VEH;
  A.ult = { sem, mes, est, g, pob, demK, autoT, mercT, huertaT, nH: nHAct, nHMeta: A.nH, mercCap: act.length * K.MERC_T, nAct: act.length, regT, resto0: KV.RESTO0 * g, coraPedK: RK, coraK, resto, L, S: S_, ing, lleg, a0, tope, f,
    invIni: inv0, inv, Tp, cC, cCiudad, fMerc, cola, desp: desp / 7, perd: perd / 7, sat: inv / CAPS, cap: CAPS, nQuit: A.nQuit || 0, carga: inv / CAPS, cobK: demK > 0 ? rec / demK : 1, rec, zMin, sectores, secMin, secArg,
    bodMax: A.bodU.max, bodArg: A.bodU.arg, bodGlobal: A.bodU.global, kMax: BOD_KMAX,
    vehDia, tipos: K.TIPOS.map(T => ({ k: T.k, n: T.n, veh_dia: vehDia * T.p, t_dia: lleg * T.p * T.c / K.T_VEH_MEZCLA })),
    franjas: K.FRANJAS.map(F => ({ n: F.n, h0: F.h0, h1: F.h1, p: F.p, t_h: lleg * F.p / (F.h1 - F.h0), veh_h: vehDia * F.p / (F.h1 - F.h0), tope_h: tope * F.p / (F.h1 - F.h0) })) };
  // el resto del modelo (avisos, basura, reglas) lee estas salidas como lee las de sim_vida.js
  Object.assign(o, { need: demK * 7000, demandaZona: dz, recib: demK > 0 ? rec / demK : 1, zRec, zLoc, zRed, zMin, zArg, nBajo, coraKg: coraK * 7000, localConsumido: (autoT + (E.prop ? huertaT : 0)) * 7000, /* obras: lo que dan las huertas hidropónicas también es comida local consumida */ auto: autoT * 7000, dep: lleg / K.T_DIA });
}
function ab01Ind(E) {
  const A = E.ab01, U = A.ult, o = E.o; if (!U) return null; const C = { x: Math.round(CORA_XZ[0]), z: Math.round(CORA_XZ[1]) };
  const mercados = AB_SITIOS.slice(0, A.nM).map(S => ({ n: S.n, x: S.x, z: S.z, tipo: S.tipo, real: S.real, activo: U.sem - 1 >= A.abre[S.k], desde: A.abre[S.k] + 1, cap_t_dia: AB01.MERC_T, t_dia: A.uso[S.k] + A.reg[S.k], kennedy_t_dia: A.uso[S.k], region_t_dia: A.reg[S.k], carga: (A.uso[S.k] + A.reg[S.k]) / AB01.MERC_T }));
  const nodos = [{ n: 'Corabastos', ...C, tipo: 'corabastos', activo: true, t_dia: U.lleg }, ...mercados.map(m => ({ n: m.n, x: m.x, z: m.z, tipo: 'mercado', activo: m.activo, t_dia: m.t_dia }))];
  const rutas = ZONAS.map((Z, z) => [z, AB_CO[z]]).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([z, v]) => ({ de: C, a: { x: Math.round(ZONAS[z][0]), z: Math.round(ZONAS[z][1]) }, t_dia: v }));
  return { cora: { ...C, tope_t_dia: U.tope, pedido_t_dia: U.L, llegadas_t_dia: U.lleg, despachos_t_dia: U.desp, perdidas_t_dia: U.perd, inventario_t: U.inv, capacidad_t: U.cap || AB01V3.CAP, oferta_t_dia: U.S, kennedy_t_dia: U.coraK, carga: Math.min(1.5, U.carga), aplica: true },
    mercados, deficit: Math.max(0, 1 - U.cobK), deficitZonaPeor: Math.max(0, 1 - U.zMin), corte: null, nodos, rutas,
    ab01: { ...U, sectores: U.sectores.map(x => ({ ...x })), tipos: U.tipos.map(x => ({ ...x })), franjas: U.franjas.map(x => ({ ...x })), nM: A.nM, auto: A.auto, dem: A.dem, vol: A.vol, topeF: A.topeF, crece: A.crece,
      rachaSat: A.rachaSat, rachaRes: A.rachaRes, rachaDef: Math.max(0, ...A.rachaDef) },
    bodegas: bodInd(A) }; }
/* ======================= 01 · BODEGAS, COMIDA QUE LLEGA, RESIDUOS, LA VACA Y CONGESTIÓN (pedido de la autora, 2026-11-26) =======================
   Pedido: docs/sim01_abastecimiento_v2.md. Fuentes: docs/fuentes_bodegas_residuos.md y data3d/bodegas_residuos_fuentes.json.
   · BODEGAS (solo el par 01): 37 naves de data3d/corabastos.json (índice = posición en .naves). Por nave: grupo de producto (DANE 2012, plano
     numerado), recibo en 2025 (t/día SIPSA 2025 del grupo repartidas por área: confianza baja), tope en toneladas (área × densidad DANE 2012:
     papa 0,25, bultos 0,222, canastilla 0,167 t/m²; SOBREESTIMADO porque incluye pasillos) y permanencia (frescos 1 día según «Horarios» de
     Corabastos; granos 7 días [SUP]). Cada semana el recibo de cada nave escala con lo que llega a Corabastos antes de las bodegas,
     A0 = mín(pedido, oferta de la región, tope agregado) del bloque AB01: recibo = recibo 2025 × A0 / 6.460. Ocupación = recibo × permanencia / tope.
     Lo que no cabe en su nave no entra: llegadas = mín(A0, Σ mín(recibo, tope / permanencia)) y el faltante pasa a las zonas como siempre.
     GAME OVER «bodegas»: una nave al 100 % o más de su tope 4 semanas seguidas (la misma regla de 4 semanas de las demás; «se llena y no cabe
     más» sostenido un mes, no un pico de un día). En 2025 la más llena es Aguacate (0,92): se llena con +8,7 % de recibo.
   · COMIDA QUE LLEGA A KENNEDY (todas las corridas): demanda total = frescos de la corrida (0,65 kg/hab/día) + otros canales y no frescos,
     1.100 − 702 t/día (1.080.742 hab × 1,02 kg/hab/día, RAPE 2020), que crecen igual que los frescos. Llega = frescos recibidos + otros canales
     (se supone que los otros canales entregan lo que se pide: no hay medición por localidad).
   · RESIDUOS DE KENNEDY (todas las corridas): R = 922 × 1,027^años + 0,19 × (comida que llega − 1.100) t/día (UAESP 2026 por población; UNEP 2024).
     La recolección ordinaria queda fija en 774 t/día; los orgánicos que tratan las Estaciones Circulares de la propuesta (o.desv) no la usan.
     Sin recoger = máx(0, R − 774 − tratados): va a puntos críticos (hoy 148 t/día). GAME OVER «residuosK» (solo par 01): 296 t/día sin recoger
     (el doble de hoy [SUP: criterio de diseño]) 4 semanas seguidas.
   · LA VACA: D = clamp((sin recoger − 148) / (296 − 148), 0, 1); árboles e interacciones bióticas de La Vaca × (1 − 0,5·D) [SUP forma y 0,5].
     En el par 01 el hábitat del parche La Vaca (E.xH) se multiplica por (1 − 0,5·D): la red trófica lo siente. Aporte de residuos al humedal =
     0,45 t/día × sin recoger / 148 (857 t retiradas en 5,2 años, Alcaldía 2025).
   · CONGESTIÓN (capa de tráfico): nivel = 0,62 + 0,033 × años (TomTom: 53 % en 2020 → 69,6 % en 2025; arranca en el nivel de 2024).
     Camiones de abasto = llegadas a Corabastos / 6,21 t por vehículo (SIPSA 2025). */
export const BOD01 = {
  /* [nombre, grupo, recibo 2025 t/día, tope t, permanencia días, x, z (mundo), distancia a La Vaca m] — índice = nave de corabastos.json */
  NAVES: [["B29","frutas",433.9,744,1,883,814,323],["Gran Bodega","mixto_fv",690.4,1015,1,973,736,440],["B16","granos",47.1,449,7,969,1207,114],["B6","granos",47.9,457,7,1097,1218,113],["B13","papa",194.9,498,1,985,1022,262],["Servicios","servicios",0,0,0,1329,1022,360],["B26","hortalizas",249.8,331,1,749,1064,42],["B7","granos",47.9,457,7,1103,1157,175],["B14","papa",194.9,498,1,980,1084,227],["Servicios","servicios",0,0,0,1386,932,466],["B24","hortalizas",262.5,348,1,759,941,146],["B21","hortalizas",249.1,330,1,875,951,210],["B12","hortalizas",257.1,341,1,991,961,298],["Servicios","servicios",0,0,0,1389,992,417],["B18","papa_verdura",232.8,434,1,859,1135,97],["B15","papa_verdura",223.9,417,1,974,1145,176],["B25","hortalizas",258.5,343,1,765,879,191],["B22","raices",396,452,1,880,889,261],["B11","raices",391.9,447,1,996,899,336],["Servicios","servicios",0,0,0,1336,943,433],["B30","frutas",400.7,687,1,1002,828,387],["B9","granos",47.3,451,7,1113,1033,299],["B10","granos",47.4,451,7,1119,972,360],["B19","papa",192.8,493,1,865,1074,133],["Aguacate (B31-B32)","aguacate",125.1,136,1,682,993,54],["B23","hortalizas",254.4,338,1,755,1003,101],["B20","papa",196.1,501,1,870,1013,168],["B8","granos",47.2,450,7,1108,1095,237],["B4","granos",49.6,473,7,1219,1167,181],["B5","granos",46.4,442,7,1093,1280,51],["B17","granos",48.8,465,7,964,1269,53],["Cuartos fríos","frutas",162.1,278,1,1104,745,518],["B29","frutas",365.6,627,1,778,805,248],["Bodega Popular","mixto_fv",155.1,228,1,928,731,410],["B3","granos",46.3,442,7,1224,1105,242],["B1","granos",49.2,469,7,1235,981,364],["B2","granos",47.4,452,7,1229,1043,302]],
  GRUPO: { frutas: 'frutas', mixto_fv: 'frutas y verduras', granos: 'granos y procesados', papa: 'papa', servicios: 'servicios', hortalizas: 'hortalizas', papa_verdura: 'papa y verduras', raices: 'yuca, plátano y arracacha', aguacate: 'aguacate, banano y plátano' },
  SEMANAS: 4
};
export const RES01 = { R0: 922, ORD: 774, PC0: 148, UMBRAL: 296, CRECE: 0.027, COEF: 0.19, C0: 1100, VACA_K: 0.5, VACA_T: 0.45, SEMANAS: 4, ORG: 0.513 };
/* ESTACIONES CIRCULARES DE LA SIMULACIÓN 01 CON PROPUESTA (decisión de la autora, 2026-11-26: con propuesta debe haber suficientes para que no
   haya game over de residuos con los valores por defecto). CAP = 20 t/día de orgánicos por estación: el tope de los Centros Integrados de
   Recuperación de Recursos (IRRC) descentralizados de UNESCAP/Waste Concern (el primero, de 1994, trataba 3 t/día; los posteriores hasta 20 t/día;
   https://www.unescap.org/sites/default/d8files/2.%20An%20inexpensive%20solution%20.pdf). N = 20 estaciones, una en cada sitio de mercado de la
   propuesta (AB01_SITIOS: «Estaciones Circulares en los mercados nodo»); abren una cada 36 semanas desde la semana 52 (año 2) hasta la 736
   (año 15), como las demás obras de la propuesta [SUP: calendario]. 20 × 20 = 400 t/día ≈ 56 % de los orgánicos de Kennedy en el año 15
   (51,3 % de ≈1.400 t/día): se supone que la separación en la fuente alcanza lo que las estaciones reciben [SUP]. Tamaño elegido para que lo sin
   recoger quede bajo 2/3 del camino al game over (247 t/día) en los 15 años con los valores por defecto. */
export const EST01 = { CAP: 20, N: 20, T0: 52, CADA: 36 };
export const COM01 = { T_DIA: 1100, KG: 1.02 };
export const CONG01 = { N0: 0.62, PP: 0.033, PP_ALTO: 0.077, T_VEH: 6.21 };
const EST01_SITIOS = Object.freeze(AB_SITIOS.slice(0, EST01.N).map((S, k) => Object.freeze({ n: 'Estación Circular · ' + S.n, x: S.x, z: S.z, desde: EST01.T0 + k * EST01.CADA, cap_t_dia: EST01.CAP })));
const BOD_N = BOD01.NAVES.length, BOD_K = BOD01.NAVES.map(n => (n[3] > 0 ? n[2] * n[4] / (n[3] * AB01.T_DIA) : 0)); // ocupación por t/día que llega a Corabastos
const BOD_KMAX = Math.max(...BOD_K);
/* v5.2 · DESMONTE GRADUAL DE CORABASTOS (con propuesta; pedido de la autora 2026-11-26: «las bodegas se quitan de a poco con los años»).
   Las mismas 18 naves de siempre (la mitad de 37, las más cercanas a La Vaca: campo dh de corabastos.json = BOD01.NAVES[i][7]; quitadas01 de
   abasto_capas.js) se quitan una por una, primero la más cercana a La Vaca, entre la semana 52 (año 1) y la 416 (año 8) [SUP: calendario,
   ≈2,5 naves por año]. El 3D (propuesta01_3d.js, abasto_capas.js) lee este mismo calendario (AB01_DESMONTE).
   Efecto en el modelo: la mercancía que queda en Corabastos cabe en menos naves. Capacidad = 14.000 t × (tope de las naves que quedan ÷ tope
   de las 37) (topes de BOD01: área × densidad DANE 2012); al final 50,7 % (7.100 t). El inventario se reparte entre las naves que quedan. */
const DES01 = { T0: 52, T1: 416 };
const DES01_ORDEN = BOD01.NAVES.map((n, i) => [i, n[7]]).sort((a, b) => a[1] - b[1]).slice(0, Math.floor(BOD01.NAVES.length / 2)).map(a => a[0]);
export const AB01_DESMONTE = DES01_ORDEN.map((i, k) => ({ i, n: BOD01.NAVES[i][0], sem: DES01.T0 + Math.round(k * (DES01.T1 - DES01.T0) / Math.max(1, DES01_ORDEN.length - 1)) }));
const BOD_TOPE_T = BOD01.NAVES.reduce((a, n) => a + n[3], 0);
/* naves quitadas hasta la semana t (con propuesta) y capacidad que queda */
function desPaso(A, t) { const q = A.quit || (A.quit = new Uint8Array(BOD_N)); let rem = 0, n = 0;
  for (const D of AB01_DESMONTE) { if (t >= D.sem) { q[D.i] = 1; rem += BOD01.NAVES[D.i][3]; n++; } else q[D.i] = 0; }
  A.nQuit = n; A.cap = AB01V3.CAP * (1 - rem / BOD_TOPE_T); }
const VACA_P = PARCHES.findIndex(p => p.id === 'vaca');
/* v3: inventario de 2025 = Σ recibo × días que permanece (≈9.860 t); cada nave guarda su parte del inventario (recibo × permanencia / Σ) */
const BOD_ST = BOD01.NAVES.map(n => (n[3] > 0 ? n[2] * n[4] : 0)), BOD_STT = BOD_ST.reduce((a, v) => a + v, 0), BOD_W = BOD_ST.map(v => v / BOD_STT);
/* v4: inventario PROMEDIO de 2025 = la mitad de Σ recibo × permanencia (cada lote se vende de a poco durante su permanencia: en promedio
   queda la mitad) ≈ 4.930 t = 35 % de 14.000 [SUP]. Permanencia media de 2025 T0 = inventario ÷ ingresos ≈ 0,76 días (ley de Little). */
AB01V3.INV0 = BOD_STT / 2;                                          // t en 2025
AB01V3.COLA_B = 0.5;                                                  // β de la regla de la cola (v5.1, decisión de la autora; ver ab01Paso)
AB01V3.T0 = AB01V3.INV0 / AB01V3.ING;                             // días que permanece en promedio una tonelada en 2025
AB01V3.K_PERD = AB01V3.PERD * AB01V3.ING / AB01V3.INV0;             // (v3; ya no se usa en ab01Paso)
AB01V3.RESTO0 = AB01V3.ING * (1 - AB01V3.PERD) - AB01V3.DEM0;      // t/día que despacha al resto de la región en 2025 (equilibrio)
/* bodegas de una semana (v3): el inventario total se reparte entre las 37 naves por su recibo × permanencia; ocupación = su parte / su tope.
   Solo para verlas llenarse desigual: el game over de saturación usa el total frente a 14.000 t. */
function bodPaso(A, inv) {
  const occ = A.bod || (A.bod = new Float32Array(BOD_N)); let max = 0, arg = -1, llenas = 0;
  const q = A.quit; let wq = 1; if (q) { wq = 0; for (let i = 0; i < BOD_N; i++) if (!q[i]) wq += BOD_W[i]; wq = wq || 1; } // v5.2: el inventario se reparte entre las naves que quedan
  for (let i = 0; i < BOD_N; i++) { const N = BOD01.NAVES[i]; if (!(N[3] > 0) || (q && q[i])) { occ[i] = 0; continue; }
    const o = inv * BOD_W[i] / wq / N[3]; occ[i] = o; if (o > max) { max = o; arg = i; } if (o >= 1) llenas++; }
  A.bodU = { max, arg, llenas, global: inv / (A.cap || AB01V3.CAP), cabe: null };
}
function bodInd(A) { const U = A.bodU; if (!U) return null; const N = BOD01.NAVES[U.arg] || [];
  return { max: U.max, global: U.global, llenas: U.llenas, cabe_t_dia: U.cabe, idx: U.arg, nombre: N[0] || '', grupo: BOD01.GRUPO[N[1]] || '', x: N[5], z: N[6], kmax: BOD_KMAX,
    occ: Array.from(A.bod, v => Math.round(v * 1000) / 1000), nombres: BOD_NOMBRES, racha: A.rachaBod || 0 }; }
const BOD_NOMBRES = Object.freeze(BOD01.NAVES.map(n => n[0])); // una sola lista compartida por todas las semanas
/* comida que llega, residuos, La Vaca y congestión de una semana (todas las corridas; los game over solo en el par 01) */
function rcPaso(E) {
  const o = E.o, t = E.s.t + 1, años = t / V.AÑO, F = (o.need || 0) / 7000, rec = F * Math.min(1, o.recib != null ? o.recib : 1);
  /* v3 (par 01): la demanda de 0,951 kg/hab/día ya es toda la comida; sin «otros canales». La referencia de residuos es la demanda de hoy (984) */
  const v3 = !!E.ab01, otros = v3 ? 0 : (COM01.T_DIA - AB01.KEN_T_DIA) * (F / AB01.KEN_T_DIA), dem = F + otros, llega = rec + otros;
  const gen = RES01.R0 * Math.pow(1 + RES01.CRECE, años) + RES01.COEF * (llega - (v3 ? AB01V3.DEM0 : RES01.C0));
  /* par 01 con propuesta: Estaciones Circulares de barrio (EST01) que abren por fases; tratan hasta su capacidad, sin pasar de los orgánicos generados */
  const nEst = E.ab01 && E.prop ? Math.max(0, Math.min(EST01.N, Math.floor((t - EST01.T0) / EST01.CADA) + 1)) : 0, capEst = nEst * EST01.CAP;
  const trat = Math.min(RES01.ORG * gen, Math.max(0, (o.desv || 0) / 7000) + capEst);
  const noRec = Math.max(0, gen - RES01.ORD - trat), D = cl01((noRec - RES01.PC0) / (RES01.UMBRAL - RES01.PC0)), k = 1 - RES01.VACA_K * D;
  const U = E.ab01 && E.ab01.ult, camiones = U ? U.lleg / CONG01.T_VEH : null;
  E.rc = { dem, llega, frescos: F, frescosRec: rec, otros, gen, trat, noRec, nEst, capEst, D, arboles: k, inter: k, aporte: RES01.VACA_T * noRec / RES01.PC0, umbral: RES01.UMBRAL, hoy: RES01.PC0,
    nivel: CONG01.N0 + CONG01.PP * años, camiones };
  if (E.ab01 && VACA_P >= 0) E.xVaca = k; /* lo aplica pruebaDespues sobre E.xH */
}
/* reglas de game over propias del par 01 (las 7 de REGLAS siguen iguales para las 12): el informe las lee junto a REGLAS */
export const REGLAS_AB01 = [
  { k: 'deficit', n: 'Déficit alimentario', txt: 'un sector de Kennedy recibe menos del 80 % de su demanda (cobertura = recibido ÷ demanda) cuatro semanas seguidas', umbral: 80, unidad: '% de la demanda del sector', semanas: 4,
    fuente: 'Pedido de la autora (docs/sim01_abastecimiento_v3.md). Demanda = población × 0,951 kg/hab/día; déficit = máx(0, demanda − recibido). Sectores: los 8 de Kennedy agrupados por población con su Junta de Acción Comunal (IDPAC). Umbral de 80 %: umbral de prueba del proyecto.' },
  { k: 'saturacion', n: 'Límite de abastecimiento de Corabastos', txt: 'el inventario de Corabastos pasa su límite (14.000 t; con propuesta, el de las naves que quedan) cuatro semanas seguidas', umbral: 100, unidad: '% de 14.000 t', semanas: 4,
    fuente: 'Capacidad de referencia de 14.000 t: documento técnico regional (SDDE-FAO 2018, citado en el DTS de logística de la Gobernación de Cundinamarca 2022); no es un límite diario certificado. Inventario = inventario inicial + ingresos (6.460 t/día en 2025, DANE-SIPSA; crecen con lo que se pide) − despachos − pérdidas (0,0155 de lo que sale, DANE 2012). Inventario promedio de 2025 ≈ 4.930 t (la mitad de recibo por bodega × días de permanencia, derivado); sale inventario ÷ permanencia, y la permanencia crece con la congestión (TomTom) [supuestos, docs/sim01_abastecimiento_v4.md].' },
  { k: 'residuosK', n: 'Residuos de Kennedy', txt: 'los residuos sin recoger de Kennedy (puntos críticos) llegan al doble de hoy, 296 t/día, cuatro semanas seguidas', umbral: 296, unidad: 't/día sin recoger', semanas: 4,
    fuente: 'UAESP (2026): 6.769 t/día en Bogotá, 1.089 en puntos críticos, +5,5 % en 2024–2026; repartido por población: Kennedy 922 t/día, 774 recogidas y 148 en puntos críticos (derivado). UNEP Food Waste Index 2024: 19 % de la comida se desperdicia. Kennedy tiene 71 puntos críticos activos (Alcaldía de Bogotá, 2025). El factor 2× es criterio de diseño [SUP].' }];
function pruebaIni(E) {
  const v = E.val;
  /* 01 ABASTECIMIENTO: Corabastos tiene un TOPE fijo (sus bodegas no crecen) = demanda de hoy × (1 + coraTope); la demanda crece con la población
     (y el plan parcial en «sin»). Cuando lo que se le pide pasa el tope, la comida que falta no llega a las zonas -> game over por abasto.
     Con propuesta los mercados de barrio y Bavaria Común venden parte de lo fresco y Corabastos se llena más despacio. */
  /* 2026-11-25: el par 01 usa el bloque AB01 de arriba (datos DANE-SIPSA, SDM, Contraloría); el tope ya no recorta s.Kc de sim_vida.js.
     Tope de referencia de las demás simulaciones: 11 % sobre la demanda de hoy (ocupación del 90 %, SDDE-FAO 2018: inferencia), el mismo
     valor por defecto del deslizador coraTope (antes 15 % aquí y 22 % en el deslizador). */
  if (E.par === 1) ab01Ini(E);
  E.topeRef = E.s.Kc / (1 + V.SUP.HOLGURA) * (1 + (v.coraTope != null ? v.coraTope : 11) / 100);
  if (E.par === 3) E.org = { f: (v.orgAumento || 0) / 100, t0: Math.round(v.orgT0) };
  if (E.par === 4) { const k = Math.max(1, Math.min(4, Math.round(v.parche))) - 1, p = FRAG_P[k]; E.frag = { p, f: (v.parchePerdida || 0) / 100, t0: Math.round(v.parcheT0), arb0: E.PAR.P3.arboles };
    E.espBase = Array.from({ length: RED.NFA }, (_, i) => { let n = 0; for (let q = 0; q < NP; q++) n += E.occ0[i * NP + q]; return n; }); E.espRachas = new Uint16Array(RED.NFA);
    const vec = HAB_P.filter(q => q !== p).map(q => [q, Math.hypot(PARCHES[q].x - PARCHES[p].x, PARCHES[q].z - PARCHES[p].z)]).sort((a, b) => a[1] - b[1]).slice(0, 3);
    E.frag.corr = vec.map(([q]) => q); }
  if (E.par === 6) E.gob = { rond: Math.max(1, Math.round(v.decisionCada || 13)), pres: (v.presupuesto || 50) / 100, need: new Float64Array(8), rez: new Float64Array(8), acum: new Float64Array(8), asig: new Float64Array(8),
    cov: new Float64Array(8).fill(1), hist: [], equipos: [], decisiones: 0, equidad: 1, rondas: 0, eqn: new Uint16Array(8) };
  E.fOrg = 1; E.desp = []; }
function fOrgDe(E, t) { return E.org ? 1 + E.org.f * cl01((t - E.org.t0) / V.AÑO) : 1; }
function pruebaAntes(E, t) { // antes de V.paso
  const s = E.s;
  if (E.tope) s.Kc = Math.min(s.Kc, E.tope.kc); // el tope de Corabastos no se acomoda a la demanda
  if (E.corte) { const C = E.corte; C.activo = t >= C.t0 && t < C.t0 + C.dur;
    if (C.activo) { if (C.ref == null) C.ref = s.Kc;
      /* [SUP] CON PROPUESTA: durante el corte los puntos de acopio de la red compran directo a productores de la región (circuitos cortos)
         lo que Corabastos no alcanza a traer, hasta la capacidad de acopio de los mercados (deslizador P1.capAcopio, t/día). Fracción
         compensada = capacidad de acopio (kg/semana) / faltante de Corabastos (kg/semana), con tope 95 %. Sin propuesta no hay red. */
      const vv = E.val || {}, capT = E.prop ? (vv['P1.capAcopio'] != null ? vv['P1.capAcopio'] : V.CAP_RED_TDIA) : 0, falta = C.ref * C.f;
      C.compensa = falta > 0 ? Math.min(0.95, capT * 1000 * 7 / falta) : 0;
      s.Kc = Math.min(s.Kc, C.ref * (1 - C.f * (1 - C.compensa))); } }
  /* [SUP] CON PROPUESTA en el cierre de vía (par 02): los mercados distribuidos y los puntos de acopio tienen rutas alternas ya acordadas
     en las asambleas: la distribución se reacomoda en ~1 semana (τ = 1) en vez de esperar la resolución de solicitudes; sin propuesta la
     logística se reacomoda sola en ~6 semanas (τ de sim_vida.js). */
  if (E.prop && E.par === 2 && s.cierre && s.cierre.on) s.resolPrev = -2;
  E.fOrg = fOrgDe(E, t);
  if (E.frag) { const F = E.frag; E.xFrag.fill(1); if (t >= F.t0 && F.p >= 0) E.xFrag[F.p] = Math.sqrt(Math.max(0, 1 - F.f));
    if (E.prop) E.PAR.P3.arboles = Math.min(1, Math.max(F.arb0 + 0.2 * Math.min(1, t / 260), E.arbObra || 0)); } } // conexiones vegetales de la propuesta [SUP]; con las obras: la mayor de las dos (son los mismos árboles)
function pruebaDespues(E) { // después de basuraPaso: hábitat = basura × pérdida del parche
  for (let p = 0; p < NP; p++) E.xH[p] = E.xHb[p] * E.xFrag[p];
  if (E.obras) for (let p = 0; p < NP; p++) E.xH[p] *= E.obras.x[p]; // obras de la propuesta: √(1 + ΔA/ha) (ver OBRA_SUP)
  if (E.xVaca != null && VACA_P >= 0) E.xH[VACA_P] *= E.xVaca; // par 01: residuos sin recoger degradan La Vaca (RES01, rcPaso)
  if (E.frag) { const s = E.s, occ = s.occ, P = E.prev, F = E.frag, d = []; if (s.t >= F.t0 - 1) for (let i = 0; i < RED.NFA && d.length < 8; i++) for (let p = 0; p < NP && d.length < 8; p++) {
      const k = i * NP + p; if (!occ[k] || P[k]) continue; let b = -1, bd = Infinity; for (let q = 0; q < NP; q++) if (P[i * NP + q]) { const e = Math.hypot(PARCHES[q].x - PARCHES[p].x, PARCHES[q].z - PARCHES[p].z); if (e < bd) { bd = e; b = q; } }
      if (b >= 0 && bd < 4000 && (Math.hypot(PARCHES[p].x - PARCHES[F.p].x, PARCHES[p].z - PARCHES[F.p].z) < 3000 || Math.hypot(PARCHES[b].x - PARCHES[F.p].x, PARCHES[b].z - PARCHES[F.p].z) < 3000))
        d.push({ especie: RED.FAUNA[i].n, de: { x: Math.round(PARCHES[b].x), z: Math.round(PARCHES[b].z) }, a: { x: Math.round(PARCHES[p].x), z: Math.round(PARCHES[p].z) } }); }
    E.desp = d; } }
function gobernanzaPaso(E, x) {
  const G = E.gob, o = E.o, s = E.s, t = s.t, sop = x.zonas.soporteEco, S = GOB_SUP;
  for (let b = 0; b < 8; b++) { const Z = GOB_BARRIOS[b].zonas; let gap = 0, so = 0; for (const z of Z) { gap += Math.max(0, 1 - o.zRec[z]); so += sop[z]; } gap /= Z.length; so /= Z.length;
    G.need[b] = GOB_POB[b] / 1000 * (s.pob / V.POB_K) * (S.BASE + gap * 5 + (1 - so) * 0.5) * Math.max(0.3, 1 - S.EQUIPO * G.eqn[b]) + G.rez[b]; }
  G.hist.push(Float64Array.from(G.need)); if (G.hist.length > S.REZAGO_INFO + 1) G.hist.shift();
  if (t % G.rond !== 0) return;
  const tot = G.need.reduce((a, v) => a + v, 0), R = G.pres * tot, w = new Float64Array(8);
  if (!E.prop) { const H = G.hist[0], ht = H.reduce((a, v) => a + v, 0) || 1, pt = GOB_POB.reduce((a, v) => a + v, 0); for (let b = 0; b < 8; b++) w[b] = 0.5 * GOB_POB[b] / pt + 0.5 * H[b] / ht; } // central: fórmula por población + necesidad de hace medio año
  else { const q = (1 - 0.3 * Math.min(1, E.PAR.P1.rotacion / 52)) * (s.prom >= 1 ? 1 : 0.7), pt = GOB_POB.reduce((a, v) => a + v, 0);
    for (let b = 0; b < 8; b++) w[b] = G.need[b] * (q + (1 - q) * ((b * 7 + G.rondas * 3) % 8) / 7); // reporte imperfecto: error determinista que rota con las rondas
    const sw = w.reduce((a, v) => a + v, 0) || 1; for (let b = 0; b < 8; b++) w[b] = Math.max(w[b] / sw, S.PISO * GOB_POB[b] / pt); }
  if (E.par === 6 && E.val.barrioPrioritario >= 0) w[Math.min(7, Math.round(E.val.barrioPrioritario))] *= S.PRIORIDAD;
  const sw = w.reduce((a, v) => a + v, 0) || 1; let gin = 0, cm = 0, pw = 0;
  for (let b = 0; b < 8; b++) { const a = R * w[b] / sw; G.asig[b] = a; G.acum[b] += a; G.cov[b] = G.need[b] > 0 ? Math.min(1, a / G.need[b]) : 1; G.rez[b] = Math.max(0, G.need[b] - a) * S.ARRASTRE;
    while (G.acum[b] >= S.COSTO * (G.eqn[b] + 1)) { G.eqn[b]++; const Bb = GOB_BARRIOS[b], k = G.eqn[b], ang = k * 2.4;
      G.equipos.push({ x: Math.round(Bb.x + Math.cos(ang) * 120 * Math.sqrt(k)), z: Math.round(Bb.z + Math.sin(ang) * 120 * Math.sqrt(k)), n: ['Huerta comunitaria', 'Estación Circular', 'Parque de bolsillo', 'Salón comunal'][k % 4] + ' · ' + Bb.n.replace('Sector ', ''), tipo: ['huerta', 'estacion', 'parque', 'salon'][k % 4], sem: t + 1 }); } }
  for (let b = 0; b < 8; b++) { cm += G.cov[b] * GOB_POB[b]; pw += GOB_POB[b]; } cm /= pw;
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) gin += GOB_POB[i] * GOB_POB[j] * Math.abs(G.cov[i] - G.cov[j]);
  G.equidad = cm > 0 ? Math.max(0, 1 - gin / (2 * pw * pw * cm)) : 0; G.rondas++; G.decisiones += E.prop ? 9 : 1; }
function indGobernanza(E) { const G = E.gob; if (!G) return null;
  return { barrios: GOB_BARRIOS.map((B, b) => ({ n: B.n, x: B.x, z: B.z, zonas: B.zonas, necesidad: G.need[b], asignado: G.asig[b], cobertura: G.cov[b], prioridad: 0, equipamientos: G.eqn[b] }))
      .map((r, b, A) => ({ ...r, prioridad: 1 + [...A].sort((p, q) => q.necesidad - p.necesidad).indexOf(r) })),
    asambleas: GOB_BARRIOS.map(B => ({ x: B.jac.x, z: B.jac.z, n: B.jac.n, activa: !!E.prop })), decisiones: G.decisiones, rondas: G.rondas, equidad: G.equidad,
    coberturaMedia: G.cov.reduce((a, v, b) => a + v * GOB_POB[b], 0) / GOB_POB.reduce((a, v) => a + v, 0), equipamientos: G.equipos.slice(-60) }; }
function indAbasto(E) { /* en todas las simulaciones (la línea del tope de Corabastos); par 01: tope que se aplica, demás: tope de referencia */
  const o = E.o, s = E.s, t = s.t, nodos = [{ n: 'Corabastos', x: Math.round(CORA_XZ[0]), z: Math.round(CORA_XZ[1]), tipo: 'corabastos', activo: true, t_dia: (o.coraKg || 0) / 7000 }], rutas = [];
  if (o.merc) MERCADOS.forEach((M, k) => nodos.push({ n: M.n, x: Math.round(M.x), z: Math.round(M.z), tipo: 'mercado', activo: t >= M.desde, t_dia: o.merc[k] / 7000 }));
  if (s.e === 'C') { const act = MOD_P.filter(p => s.q[p] > 0), pr = (o.prod || 0) / 7000 / Math.max(1, act.length);
    for (const p of act.slice(0, 20)) nodos.push({ n: PARCHES[p].n, x: Math.round(PARCHES[p].x), z: Math.round(PARCHES[p].z), tipo: 'huerta', activo: true, t_dia: pr });
    nodos.push({ n: 'Bavaria Común (acopio)', x: Math.round(BAV_XZ[0]), z: Math.round(BAV_XZ[1]), tipo: 'acopio', activo: true, t_dia: Math.max(0, (o.exc || 0) - (o.perdido || 0)) / 7000 }); }
  const cz = ZONAS.map((Z, z) => [z, Math.max(0, o.zRec[z] - o.zLoc[z] - o.zRed[z]) * o.need * Z[2] / POB_Z / 7000]).sort((a, b) => b[1] - a[1]).slice(0, 6);
  for (const [z, v] of cz) rutas.push({ de: { x: nodos[0].x, z: nodos[0].z }, a: { x: Math.round(ZONAS[z][0]), z: Math.round(ZONAS[z][1]) }, t_dia: v });
  if (o.merc) [...o.merc].map((v, k) => [v, k]).filter(a => a[0] > 0).sort((a, b) => b[0] - a[0]).slice(0, 8).forEach(([v, k]) => { const z = MERC_ZONA[k];
    rutas.push({ de: { x: Math.round(MERCADOS[k].x), z: Math.round(MERCADOS[k].z) }, a: { x: Math.round(ZONAS[z][0]), z: Math.round(ZONAS[z][1]) }, t_dia: v / 7000 }); });
  const tope = E.tope ? E.tope.kc : E.topeRef, pedidoCora = (o.coraKg || 0) + Math.max(0, (o.need || 0) * (1 - (o.recib || 1)));
  const cora = tope ? { x: nodos[0].x, z: nodos[0].z, tope_t_dia: tope / 7000, pedido_t_dia: pedidoCora / 7000, carga: Math.min(1.5, pedidoCora / tope), aplica: !!E.tope } : null;
  const fC = (E.val && E.val['P1.capAcopio'] != null ? E.val['P1.capAcopio'] : V.CAP_RED_TDIA) / V.CAP_RED_TDIA;
  const mercados = o.merc ? MERCADOS.map((M, k) => ({ n: M.n, x: Math.round(M.x), z: Math.round(M.z), tipo: M.tipo || 'mercado', activo: t >= M.desde, cap_t_dia: (M.cap || 0) * fC / 1000, t_dia: o.merc[k] / 7000, carga: (M.cap || 0) > 0 ? Math.min(1.5, o.merc[k] / 7 / ((M.cap || 1) * fC)) : 0 })) : [];
  return { cora, mercados, deficit: Math.max(0, 1 - (o.recib || 0)), deficitZonaPeor: Math.max(0, 1 - o.zMin), corte: E.corte ? { activo: E.corte.activo, f: E.corte.f, t0: E.corte.t0, dur: E.corte.dur } : null, nodos, rutas }; }
function indEstaciones(E) { if (E.par !== 3) return null;
  const o = E.o, s = E.s, t = s.t, H = { x: Math.round(KEN_XZ[0]), z: Math.round(KEN_XZ[1]) };
  const est = [{ n: 'Relleno Doña Juana', x: DJ_XZ[0], z: DJ_XZ[1], tipo: 'relleno', cap_t_dia: (s.Kr || 0) / 7000, tratado_t_dia: (o.relleno || 0) / 7000, acumulado_t: (s.pr || 0) / 1000 }], rec = [];
  if (s.e === 'C') { const objetivo = E.par === 3 ? E.mod.estacionObjetivo : null, ab = MERCADOS.map((M, k) => k).filter(k => t >= MERCADOS[k].desde && (objetivo == null || k === objetivo)), n = Math.max(1, ab.length);
    for (const k of ab) est.push({ n: 'Estación Circular · ' + MERCADOS[k].n, x: Math.round(MERCADOS[k].x), z: Math.round(MERCADOS[k].z), tipo: 'estacion', cap_t_dia: E.PAR.P2.cap / 7000, tratado_t_dia: (o.desv || 0) / 7000 / n, acumulado_t: (s.pcp || 0) / 1000 / n });
    GOB_BARRIOS.forEach((B, b) => { let kb = -1, d = Infinity; for (const k of ab) { const e = Math.hypot(MERCADOS[k].x - B.x, MERCADOS[k].z - B.z); if (e < d) { d = e; kb = k; } }
      if (kb >= 0) rec.push({ de: { x: B.x, z: B.z }, a: { x: Math.round(MERCADOS[kb].x), z: Math.round(MERCADOS[kb].z) }, t_dia: (o.sep || 0) / 7000 * GOB_POB[b] / V.POB_K }); }); }
  rec.push({ de: H, a: { x: DJ_XZ[0], z: DJ_XZ[1] }, t_dia: (o.relleno || 0) / 7000 });
  return { estaciones: est, recorridos: rec, aumento: E.fOrg - 1 }; }
function indFragmento(E) { if (!E.frag) return null; const F = E.frag, P = PARCHES[F.p], t = E.s.t, perdido = t >= F.t0;
  return { fragmento: { parche: P.id, nombre: P.n, x: Math.round(P.x), z: Math.round(P.z), haPerdidas: perdido ? P.ha * F.f : 0, desde: F.t0 },
    corredores: E.prop ? F.corr.map(q => ({ puntos: [[Math.round(P.x), Math.round(P.z)], [Math.round(PARCHES[q].x), Math.round(PARCHES[q].z)]], a: PARCHES[q].n, fase: Math.min(1, t / 156) })) : [],
    refugios: E.prop ? MOD_P.filter(p => E.s.q[p] > 0).map(p => ({ x: Math.round(PARCHES[p].x), z: Math.round(PARCHES[p].z), n: PARCHES[p].n })) : [],
    desplazamientos: E.desp }; }
function indSueloUsos(E) { if (E.par !== 5) return null; const U = E.suelo, prot = U.prot;
  const zonas = Z_SUELO.map(z => { const uso = ZONA_MERC[z] ? 'productivo' : 'residencial', pres = (U.idx[z] - 1), arr = pres * (1 - prot), protegida = E.prop && ZONA_MERC[z];
    return { x: Math.round(ZONAS[z][0]), z: Math.round(ZONAS[z][1]), uso, presion: pres, estado: protegida || arr <= 0.25 ? 'permanece' : uso === 'residencial' ? 'desplazada' : 'cambia' }; });
  const protegidos = E.prop ? [{ x: Math.round(BAV_XZ[0]), z: Math.round(BAV_XZ[1]), n: 'Bavaria Común' }, ...MERCADOS.filter((M, k) => E.s.t >= M.desde && Z_SUELO.includes(MERC_ZONA[k])).map(M => ({ x: Math.round(M.x), z: Math.round(M.z), n: M.n }))] : [];
  return { zonas, protegidos, desplazadas: zonas.filter(z => z.estado === 'desplazada').length, cambian: zonas.filter(z => z.estado === 'cambia').length }; }

/* ---------- MARCO ECOCÉNTRICO (macromodelo de la tesis): ind(s).eco y ind(s).abeja ----------
   Cinco dimensiones 0–1 (1 = íntegro / sano frente a la referencia del año 1 o a un umbral explícito), calculadas SOLO con lo que el modelo simula.
   1 · integridad (integridad y funcionalidad ecológica) = promedio de:
       conectividad: fracción del área de hábitat (parches con calidad × factor de hábitat > 0,05) en parches NO aislados: con otro parche con hábitat a 500 m o
         menos (alcance de dispersión del grupo «suelo» de sim_vida.js, la fauna terrestre, la más limitada) o unidos por los corredores del par 04 con propuesta
         cuando están hechos (fase ≥ 1); frente al año 1 (tope 1).
       nutrientes: circular.indice / 0,5 (tope 1) [SUP meta: que la mitad de los orgánicos vuelva como abono]. agua: humedalFuncional / 100 (tope 1).
       resiliencia (solo si hay choque: corte del suministro, cierre de vía o pérdida de parche): 1 / (1 + semanas para volver al 90 % de antes / 52); mientras no
         se recupera, la mitad del valor actual frente al de antes. Métrica: comida de la zona peor servida (pares 01 y 02) u ocupación de los parches (par 04).
   2 · biodiversidad = promedio de: riqueza de fauna nativa presente / al inicio (sin rata, abeja de miel y caracol de jardín, introducidas);
       especies clave: pares especie × parche de polinizadores / los del año 1 (tope 1); depredadores tope: fracción presente de las especies de la red que
       depredan fauna y no son presa de ninguna (sale de los enlaces de biotica.json); plaga: 1 / índice de ratas (tope 1).
   3 · abioticos = promedio de: agua (área funcional y área de humedal frente a hoy), suelo (árboles de los parques frente a hoy y 1 − fracción talada del
       bosque de Bavaria), ruido como calidad de hábitat (factor medio de la zona de efecto de las vías para las aves en los parches con hábitat, sim_vida.js,
       × factor extra del predio, la basura y los desvíos; 1 = como hoy). La fracción de parches bajo 55 dB NO se puede calcular: el modelo no tiene dB por
       parche (null). aire / microclima: null (el modelo no los simula).
   4 · limites (huella y límites · no regresión): cada razón frente al año 1 (o a hoy), con tope 1: orgánicos que vuelven como abono, área de humedal, árboles
       de los parches y ocupación de los parches. 1 = no hay regresión.
   5 · gobernanza = promedio de: asambleas (1 si la corrida tiene asambleas locales y federación —escenario C de sim_vida.js o el par 06 con propuesta—, 0 con
       coordinación central), protección del suelo (deslizador / mecanismo de la corrida) y equidad (par 06: la del reparto; en los demás, 1 − Gini de la
       comida recibida por zona, ponderado por población). derechosNaturaleza = false: ninguna corrida tiene un mecanismo de derechos de la naturaleza.
   indice = promedio de las cinco (las que no son null). prueba = la dimensión que más pone a prueba el par. */
const NATIVA_NO = new Set(['rata', 'abeja', 'caracol']);
const ECO_PAR = { 1: 'integridad', 2: 'abioticos', 3: 'limites', 4: 'biodiversidad', 5: 'gobernanza', 6: 'gobernanza' };
const DISTP = PARCHES.map(p => PARCHES.map(q => Math.hypot(p.x - q.x, p.z - q.z)));
let TOPE = null, ABEJA = null;
function ecoPrep() { if (TOPE) return;
  const presa = new Set(), depreda = new Set(); for (const [a, b, t] of RED.ENL) if ((t === 0 || t === 7) && RED.esFa(a) && RED.esFa(b)) { depreda.add(RED.FI[a]); presa.add(RED.FI[b]); }
  TOPE = [...depreda].filter(i => !presa.has(i));
  const ia = RED.FI.abeja; ABEJA = { i: ia, flora: [...new Set(RED.ENL.filter(([a, b, t]) => a === 'abeja' && RED.esFl(b)).map(([, b]) => RED.FLI[b]))] }; }
function conectividad(E) { // fracción del área de hábitat en parches NO aislados: con otro parche con hábitat a 500 m o menos, o unido por un corredor hecho
  const s = E.s, hab = []; for (let p = 0; p < NP; p++) if (s.q[p] * E.xH[p] > 0.05) hab.push(p);
  const con = new Uint8Array(NP);
  for (let a = 0; a < hab.length; a++) for (let b = a + 1; b < hab.length; b++) if (DISTP[hab[a]][hab[b]] <= 500) { con[hab[a]] = 1; con[hab[b]] = 1; }
  if (E.frag && E.prop && E.s.t / 156 >= 1) { con[E.frag.p] = 1; for (const q of E.frag.corr) con[q] = 1; }
  if (E.obras) { const H = new Set(hab); for (const [p, q, f] of corredoresCV(E, E.s.t)) if (f >= 1 && H.has(p) && H.has(q)) { con[p] = 1; con[q] = 1; } } // obras: corredores de calle verde con árboles adultos
  let tot = 0, ok = 0, ais = 0; for (const p of hab) { const a = Math.max(0.05, PARCHES[p].ha); tot += a; if (con[p]) ok += a; else ais++; }
  return { frac: tot > 0 ? ok / tot : 0, aislados: ais, parches: hab.length, con }; }function gini(v, w) { let sw = 0, m = 0; for (let i = 0; i < v.length; i++) { sw += w[i]; m += v[i] * w[i]; } m /= sw || 1; if (m <= 0) return 0; let g = 0;
  for (let i = 0; i < v.length; i++) for (let j = 0; j < v.length; j++) g += w[i] * w[j] * Math.abs(v[i] - v[j]); return g / (2 * sw * sw * m); }
const media = (a) => { const b = a.filter(v => v != null && isFinite(v)); return b.length ? b.reduce((x, y) => x + y, 0) / b.length : null; };
function resiliencia(E, x) {
  let C = E.choque; const t = E.s.t;
  if (!C) { const t0 = E.corte ? E.corte.t0 : E.cie ? E.cie.t0 : E.frag ? E.frag.t0 : null; if (t0 == null) return null; C = E.choque = { t0, tipo: E.corte ? 'corte del suministro' : E.cie ? 'cierre de vía' : 'pérdida de corredor verde', antes: null, sem: null, min: 1 }; }
  const v = E.frag ? E.emaP : x.comidaMin;
  if (t < C.t0) { C.antes = C.antes == null ? v : C.antes * 0.8 + v * 0.2; return { tipo: C.tipo, desde: C.t0, semanas: null, recuperado: null, puntaje: null }; }
  const r = C.antes > 0 ? v / C.antes : 1; C.min = Math.min(C.min, r);
  if (C.sem == null && t > C.t0 && r >= 0.9 && (C.min < 0.9 || t - C.t0 >= 26)) C.sem = C.min < 0.9 ? t - C.t0 : 0;
  return { tipo: C.tipo, desde: C.t0, minimo: C.min, semanas: C.sem, recuperado: C.sem != null, puntaje: C.sem != null ? 1 / (1 + C.sem / 52) : 0.5 * Math.min(1, r) }; }
function indEco(E, x) {
  ecoPrep(); const s = E.s, o = E.o, R = E.ref, NFA = RED.NFA, occ = s.occ;
  const K = conectividad(E); if (R.listo && E.conRef == null) E.conRef = Math.max(1e-6, K.frac);
  const conect = Math.min(1, K.frac / (E.conRef || Math.max(1e-6, K.frac)));
  const nutr = Math.min(1, x.circular.indice / 0.5), agua = Math.min(1, x.humedalFuncional / 100), res = resiliencia(E, x);
  const integridad = media([conect, nutr, agua, res && res.puntaje]);
  let nat = 0, nat0 = 0; for (let i = 0; i < NFA; i++) { if (NATIVA_NO.has(RED.FAUNA[i].id)) continue; let a = 0, a0 = 0; for (let p = 0; p < NP; p++) { a |= occ[i * NP + p]; a0 |= E.occ0[i * NP + p]; } nat += a; nat0 += a0; }
  const riqueza = nat0 ? Math.min(1, nat / nat0) : null, clave = Math.min(1, x.poliniz / Math.max(1, refV(E, 'poli', x.poliniz)));
  let tp = 0, tp0 = 0; for (const i of TOPE) { let a = 0, a0 = 0; for (let p = 0; p < NP; p++) { a |= occ[i * NP + p]; a0 |= (R.listo ? R.occ[i * NP + p] > 0.5 : occ[i * NP + p]) ? 1 : 0; } tp += a; tp0 += a0; }
  const tope = TOPE.length ? (tp0 ? Math.min(1, tp / tp0) : tp ? 1 : 0) : null, plaga = Math.min(1, 1 / Math.max(1e-3, x.ratas));
  const biodiversidad = media([riqueza, clave, tope, plaga]);
  const tala = s.planArb ? s.planArb / PLAN_BAV.ARB_TOT : 0, aguaA = media([agua, Math.min(1, x.humedalHa / Math.max(1e-6, x.humedalHa0))]), suelo = media([1 - x.arbolesPerdidos, 1 - tala]);
  let fx = 0, nh = 0; for (let p = 0; p < NP; p++) if (s.q[p] * E.xH[p] > 0.05) { fx += E.xAve[p]; nh++; } const ruidoH = Math.min(1, (o.trafico.mq || 1) * (nh ? fx / nh : 1));
  const abioticos = media([aguaA, suelo, ruidoH]);
  const ciR = R.listo ? (E.ciRef != null ? E.ciRef : (E.ciRef = Math.max(1e-3, x.circular.indice))) : Math.max(1e-3, x.circular.indice);
  const lOrg = Math.min(1, x.circular.indice / ciR), lHum = Math.min(1, x.humedalHa / Math.max(1e-6, x.humedalHa0)), lArb = Math.min(1, 1 - x.arbolesPerdidos), lOcu = Math.min(1, E.emaP / Math.max(1, refV(E, 'pares', E.emaP)));
  const limites = media([lOrg, lHum, lArb, lOcu]);
  const asam = s.e === 'C' || s.e === 'B' ? 1 : 0, prot = E.suelo ? E.suelo.prot : 0;
  const equidad = x.gobernanza ? x.gobernanza.equidad : 1 - gini(Array.from(o.zRec, v => isFinite(v) ? Math.min(1, v) : 1), ZONAS.map(Z => Z[2]));
  const gobernanza = media([asam, prot, equidad]);
  return { indice: media([integridad, biodiversidad, abioticos, limites, gobernanza]), prueba: ECO_PAR[E.par] || null,
    integridad, biodiversidad, abioticos, limites, gobernanza,
    sub: {
      integridad: { conectividad: { valor: conect, fraccionConectada: K.frac, parchesAislados: K.aislados, parchesHabitat: K.parches, unidad: 'fracción del área de hábitat en corredores verdes no aislados (vecino a 500 m o corredor), frente al año 1' },
        nutrientes: { valor: nutr, indiceCircular: x.circular.indice, unidad: 'orgánicos que vuelven como abono / generados (meta 0,5)' },
        agua: { valor: agua, humedalFuncional: x.humedalFuncional, unidad: '% del área funcional de hoy' },
        resiliencia: res ? { valor: res.puntaje, ...res, unidad: 'semanas hasta volver al 90 % de antes del choque' } : null },
      biodiversidad: { riquezaNativa: { valor: riqueza, presentes: nat, inicio: nat0, unidad: 'especies nativas de fauna presentes / al inicio' },
        especiesClave: { valor: clave, polinizadores: x.poliniz, ref: refV(E, 'poli', x.poliniz), unidad: 'pares especie × corredor verde de polinizadores / año 1' },
        depredadoresTope: { valor: tope, presentes: tp, ref: tp0, especies: TOPE.map(i => RED.FAUNA[i].n), unidad: 'fracción presente frente al año 1' },
        plaga: { valor: plaga, ratas: x.ratas, unidad: '1 / índice de ratas' } },
      abioticos: { agua: { valor: aguaA, humedalFuncional: x.humedalFuncional, humedalHa: x.humedalHa, humedalHa0: x.humedalHa0, unidad: '% y ha frente a hoy' },
        suelo: { valor: suelo, arbolesPerdidos: x.arbolesPerdidos, taladoBavaria: tala, unidad: 'árboles que quedan frente a hoy' },
        ruidoHabitat: { valor: ruidoH, unidad: 'factor de hábitat para aves por la zona de efecto de las vías (1 = como hoy)', fraccionBajo55dB: null, nota: 'el modelo no tiene dB por corredor verde' },
        aire: null, microclima: null },
      limites: { organicos: { valor: lOrg, razon: x.circular.indice / ciR }, humedal: { valor: lHum, cambioHa: x.humedalHa - x.humedalHa0 }, arboles: { valor: lArb, cambio: -x.arbolesPerdidos },
        ocupacion: { valor: lOcu, cambio: E.emaP / Math.max(1, refV(E, 'pares', E.emaP)) - 1 }, unidad: 'razón frente al año 1 / hoy (1 = no regresión)' },
      gobernanza: { asambleas: { valor: asam, activas: x.gobernanza ? x.gobernanza.asambleas.filter(a => a.activa).length : asam ? 'asambleas y federación del escenario C' : 0, decisiones: x.gobernanza ? x.gobernanza.decisiones : null },
        proteccionSuelo: { valor: prot }, equidad: { valor: equidad, fuente: x.gobernanza ? 'reparto del par 06' : '1 − Gini de la comida recibida por zona' }, derechosNaturaleza: false } },
    _conect: K }; }
function indAbeja(E, x, K) {
  ecoPrep(); const s = E.s, i = ABEJA.i, occ = s.occ, W3 = RED.W3, M = s.red.flM, R = E.ref; if (i == null) return null;
  let ahora = 0, ref = 0, conect = 0; const plantas = new Set(), pats = [];
  let inter = 0; for (let p = 0; p < NP; p++) { ref += R.listo ? R.occ[i * NP + p] : occ[i * NP + p]; if (!occ[i * NP + p]) continue; ahora++; pats.push(p); if (K.con[p]) conect++;
    for (const f of ABEJA.flora) if (M[f * W3 + (p >> 5)] & (1 << (p & 31))) { inter++; plantas.add(RED.FLORA[f].n); } }
  // presión principal (solo las que el modelo aplica a la abeja: el ruido de las vías actúa solo sobre las aves en sim_vida.js)
  let flor = 0, fr = 0, bas = 0, nb = 0; const FA = s.red.flA;
  if (!E.abFA0 && R.listo) { E.abFA0 = new Float32Array(NP); for (let p = 0; p < NP; p++) E.abFA0[p] = FA[i * NP + p]; }
  for (let p = 0; p < NP; p++) { const was = R.listo ? R.occ[i * NP + p] > 0.5 : occ[i * NP + p]; if (!was) continue; if (E.abFA0 && E.abFA0[p] > 0) { flor += Math.max(0, 1 - FA[i * NP + p] / E.abFA0[p]); fr++; } bas += 1 - E.xH[p]; nb++; }
  const P = { 'falta de flores': fr ? flor / fr : 0, 'basura y pérdida de hábitat': nb ? bas / nb : 0, 'tala': s.planArb && pats.includes(PI_BOSQUE) ? s.planArb / PLAN_BAV.ARB_TOT : 0, 'ruido': 0 };
  let pk = null, pv = 0.02; for (const [k, v] of Object.entries(P)) if (v > pv) { pv = v; pk = k; }
  return { especie: 'Abeja de miel (Apis mellifera)', id: 'abeja', parches: ahora, parchesRef: ref, interacciones: inter, plantas: [...plantas], conectados: ahora ? conect / ahora : 0,
    presion: pk || 'ninguna', presiones: P, nota: 'el ruido no afecta a la abeja en el modelo (solo a las aves)' }; }

/* ---------- RED VERDE (ind(s).verde): parches que se liberan, se refuerzan, se crean, crecen y se conectan; o que se rompen ----------
   Sale del estado del modelo (se recalcula cada 4 semanas y se guarda; entre recálculos es el mismo objeto):
   · parches existentes de sim_vida.js (humedales, parques, bosque de Bavaria): radio = el del área (√(ha·10⁴/π)); los humedales con el área que les deja la
     basura (Bs.ha); el bosque de Bavaria con √(1 − fracción talada por el plan parcial) [SUP: la tala del plan quita cobertura verde]; el parche perdido del par 04
     con √(1 − pérdida). tipo 'reforzado' si su calidad para la fauna (s.q × factor de hábitat) supera en 5 % la de la semana 1, si no 'existente'.
   · nuevos: los módulos de huertas (cubiertas, colegios, parques) cuando el modelo los activa (s.q > 0, calendario de mercados_red.js): su radio crece de 0 al
     de su área en 52 semanas [SUP: la vegetación se establece en un año]; techos: los módulos de cubierta.
   · liberados: cada bodega de Corabastos desmontada (o.cora / s.cora.ap de sim_vida.js): después de 26 semanas de obra aparece su borde restaurado
     (BODEGAS[i].borde m²) y madura en 156 semanas (DESMONTE de sim_vida.js). Los lotes de Bavaria y los sobrantes del metro NO tienen mecanismo en el modelo.
   · calidad = s.q × factor de hábitat (0–1); ocupacion = fracción de las 23 especies de fauna presentes en el parche.
   · conexiones entre parches visibles a 900 m o menos: f = supervivencia al cruzar las vías entre los dos (e^(−c·Q·tráfico), la misma de los atropellos y la
     colonización; con propuesta −30 % de mortalidad por pasos de fauna [SUP]) × mín(1, calidad menor / 0,4) × madurez de los extremos nuevos o liberados
     (0 → 1 en 156 semanas desde que aparecen) [SUP]. tipo: 'corredor' (corredores del par 04 con propuesta, f = su fase), 'paso_fauna' (con propuesta, cruza una
     vía principal), 'calle_verde' (con propuesta, une un módulo nuevo sin cruzar vía principal), 'roto' (f < 0,3: la vía o la degradación cortan el paso) y
     'corredor' en los demás casos. via = la vía con nombre que corta la línea (ATR.CRUCES). Se guardan hasta 250 (primero las de mayor f).
   · resumen: haVerde (Σ π r²), haVerde0 (semana 1), nConectados (parches del componente más grande con conexiones f ≥ 0,5 que no están rotas), nParches,
     conectividad = nConectados / nParches. */
export const VERDE_SUP = { CADA: 4, MAX_D: 900, CRECE: 52, MADURA: 156, PROP_MORT: 0.7, F_CONECTA: 0.5, F_ROTO: 0.3, MAX_LINKS: 250 };
const IB_V = PARCHES.findIndex(p => p.dyn); /* el borde restaurado de La Vaca en sim_vida.js */
const RADIO_HA = (ha) => Math.sqrt(Math.max(0, ha) * 1e4 / Math.PI);
function verdePaso(E) { /* cada semana: semana en que cada módulo aparece por primera vez */
  const V_ = E.vd || (E.vd = { desde: new Int32Array(NP).fill(-1), q0: null, cache: null, ha0: null }), s = E.s;
  if (!V_.q0) V_.q0 = Float32Array.from(s.q, (q, p) => q * E.xH[p]);
  for (let p = 0; p < NP; p++) if (V_.desde[p] < 0 && s.q[p] > 0 && /^mod/.test(PARCHES[p].t)) V_.desde[p] = s.t; }
function indVerde(E) {
  const V_ = E.vd, s = E.s, t = s.t; if (V_.cache && t % VERDE_SUP.CADA !== 0) return V_.cache;
  const occ = s.occ, NFA = RED.NFA, Bs = E.bas, tala = s.planArb ? s.planArb / PLAN_BAV.ARB_TOT : 0, S = VERDE_SUP, pc = [];
  const madura = (d) => d == null ? 1 : Math.max(0, Math.min(1, (t - d) / S.MADURA));
  for (let p = 0; p < NP; p++) { const P = PARCHES[p]; if (P.dyn) continue; const esMod = /^mod/.test(P.t), cal = Math.min(1, s.q[p] * E.xH[p]);
    let r0 = esMod ? 0 : RADIO_HA(P.ha), r = r0, tipo = 'existente', desde = null;
    if (esMod) { if (V_.desde[p] < 0 || s.q[p] <= 0) continue; desde = V_.desde[p] + 1; r = RADIO_HA(P.ha) * Math.min(1, (t - V_.desde[p]) / S.CRECE); tipo = 'nuevo'; }
    else { const k = HUM_P.indexOf(p); if (k >= 0) r = RADIO_HA(Bs.ha[k]); if (p === PI_BOSQUE && tala > 0) r *= Math.sqrt(1 - tala); if (E.frag && p === E.frag.p && t >= E.frag.t0) r *= Math.sqrt(Math.max(0, 1 - E.frag.f));
      if (cal > V_.q0[p] * 1.05 + 1e-3) tipo = 'reforzado'; }
    let k = 0; for (let i = 0; i < NFA; i++) k += occ[i * NP + p];
    pc.push({ id: P.id, n: P.n, x: Math.round(P.x), z: Math.round(P.z), r0: Math.round(r0), r: Math.round(r), tipo, desde, calidad: cal, ocupacion: k / NFA, _p: p, _m: madura(desde) }); }
  const ap = s.cora && s.cora.ap ? s.cora.ap : [];
  for (let i = 0; i < ap.length; i++) { const B = BODEGAS[i], w = t - ap[i] - 26; if (!B || w < 0) continue; const mz = Math.min(1, w / S.MADURA);
    pc.push({ id: 'bodega' + (i + 1), n: 'Borde liberado de La Vaca (bodega ' + (i + 1) + ' de Corabastos)', x: Math.round(B.x), z: Math.round(B.z), r0: 0, r: Math.round(RADIO_HA((B.borde || 0) / 1e4) * Math.sqrt(Math.max(0.05, mz))), tipo: 'liberado', desde: ap[i] + 27, calidad: 0.85 * mz, ocupacion: 0, _p: IB_V, _m: mz }); }
  /* obras: nodos nuevos. La Vaca ampliada = lo que el predio liberado tiene de más sobre los bordes liberados de sim_vida.js de arriba (mismo terreno: no se cuenta dos veces) */
  if (E.obras) { const libHa = pc.reduce((a, P) => a + (P.tipo === 'liberado' ? Math.PI * P.r * P.r / 1e4 : 0), 0); E.obras.libHa = libHa; const O = E.obras, J = OBRAS.J, cal = (p) => p >= 0 ? Math.min(1, s.q[p] * E.xH[p]) : 0, nodo = (id, n, x, z, haN, p, tipo, m) => { if (haN > 1e-3) pc.push({ id, n, x: Math.round(x), z: Math.round(z), r0: 0, r: Math.round(RADIO_HA(haN)), tipo, desde: null, calidad: cal(p), ocupacion: 0, _p: p, _m: m }); };
    nodo('ecoducto', 'Puente de fauna sobre la Av. Ciudad de Cali (Humedal El Burro)', J.ecoducto.x, J.ecoducto.z, O.eco, OBRAS.burro, 'nuevo', O.eco / J.ecoducto.ha);
    nodo('vacaAmpliada', 'Humedal La Vaca ampliado (predio liberado de Corabastos)', J.vaca.x, J.vaca.z, Math.max(0, O.wet + O.bar - libHa), OBRAS.vaca, 'liberado', 1);
    nodo('humedalBavaria', 'Humedal artificial de Bavaria (fitodepuración)', J.bavaria.x, J.bavaria.z, O.bav, OBRAS.bosque, 'nuevo', O.bav / J.bavaria.ha); }
  const XQ = s.red.XQ, links = [], corr = E.frag && E.prop ? new Set(E.frag.corr.map(q => E.frag.p * NP + q).concat(E.frag.corr.map(q => q * NP + E.frag.p))) : null, fase = Math.min(1, t / 156);
  for (let a = 0; a < pc.length; a++) for (let b = a + 1; b < pc.length; b++) { const A = pc[a], B = pc[b], d = Math.hypot(A.x - B.x, A.z - B.z); if (d > S.MAX_D || A.r <= 0 || B.r <= 0) continue;
    const pa = A._p, pb = B._p; let sv = 1, via = null, cruzaVia = false;
    if (pa >= 0 && pb >= 0 && pa !== pb) { const m = 1 - (XQ ? XQ[pa * NP + pb] : 1) * S0de(E)[pa * NP + pb]; sv = 1 - m; cruzaVia = (EXPO.cruce[pa * NP + pb] || 0) + (EXPO.cruce[pb * NP + pa] || 0) > 0;
      const cr = ATR_CR.get(Math.min(pa, pb) * NP + Math.max(pa, pb)); if (cr) via = ATR.VIAS[cr[0]][0]; }
    const fb = sv * Math.min(1, Math.min(A.calidad, B.calidad) / 0.4); let f = fb * Math.min(A._m, B._m), tipo = 'corredor'; /* fb sin madurez: un enlace que apenas crece no está roto */
    if (corr && corr.has(pa * NP + pb)) { f = Math.max(f, fase); tipo = 'corredor'; }
    else if (fb < S.F_ROTO) tipo = 'roto';
    else if (E.prop && cruzaVia) tipo = 'paso_fauna';
    else if (E.prop && (A.tipo === 'nuevo' || B.tipo === 'nuevo')) tipo = 'calle_verde';
    if (A.id === 'ecoducto' || B.id === 'ecoducto') { tipo = 'paso_fauna'; via = 'Av. Ciudad de Cali'; } // obras: el puente une las dos mitades de El Burro
    links.push({ a: A.id, b: B.id, x1: A.x, z1: A.z, x2: B.x, z2: B.z, f, tipo, via, _a: a, _b: b, _d: d }); }
  if (E.obras) { const ip = new Map(); pc.forEach((P, i) => { if (P.r > 0 && P._p >= 0 && !ip.has(P._p) && PARCHES[P._p].id === P.id) ip.set(P._p, i); });
    for (const [p, q, m] of corredoresCV(E, t)) { const a = ip.get(p), b = ip.get(q); if (a == null || b == null) continue; const A = pc[a], B = pc[b], f = m * Math.min(1, Math.min(A.calidad, B.calidad) / 0.4);
      const L = links.find(L => (L._a === a && L._b === b) || (L._a === b && L._b === a));
      if (L) { if (f > L.f) { L.f = f; L.tipo = 'calle_verde'; } } else links.push({ a: A.id, b: B.id, x1: A.x, z1: A.z, x2: B.x, z2: B.z, f, tipo: 'calle_verde', via: null, _a: a, _b: b, _d: Math.hypot(A.x - B.x, A.z - B.z) }); } }
  links.sort((u, v) => (v.f - u.f) || (u._d - v._d)); const keep = links.slice(0, S.MAX_LINKS);
  const par = pc.map((_, i) => i), raiz = (i) => { while (par[i] !== i) i = par[i] = par[par[i]]; return i; };
  for (const L of links) if (L.f >= S.F_CONECTA && L.tipo !== 'roto') par[raiz(L._a)] = raiz(L._b);
  const cnt = new Map(); let nCon = 0; pc.forEach((P, i) => { if (P.r <= 0) return; const r = raiz(i), c = (cnt.get(r) || 0) + 1; cnt.set(r, c); if (c > nCon) nCon = c; });
  const nPar = pc.filter(P => P.r > 0).length, ha = pc.reduce((s_, P) => s_ + Math.PI * P.r * P.r / 1e4, 0); if (V_.ha0 == null) V_.ha0 = ha;
  E.evaluacionRed = redCompleta(pc, links);
  return V_.cache = { parches: pc.slice(0, 150).map(({ _p, _m, ...P }) => P), conexiones: keep.map(({ _a, _b, _d, ...L }) => L),
    resumen: { haVerde: ha, haVerde0: V_.ha0, nConectados: nCon, nParches: nPar, conectividad: nPar ? nCon / nPar : 0, nRotas: links.filter(L => L.tipo === 'roto').length, nNuevos: pc.filter(P => P.tipo === 'nuevo').length, nLiberados: pc.filter(P => P.tipo === 'liberado').length, nReforzados: pc.filter(P => P.tipo === 'reforzado').length } }; }

/* ---------- MUERTES DE FAUNA, AVES Y RUIDO, CICLOS Y BIODIVERSIDAD (ind(s).muertes, avesRuido, ciclos, biodiversidad) ----------
   MUERTES (ind(s).muertes): suma de causas, todas con lugar:
   · colision: choques de aves contra fachadas de edificios altos. Edificios de 15 m o más de data3d/buildings.json cuyo centro queda a 40 m o menos de la línea entre
     dos parches (tools/choques_datos.mjs → CHOQ = [p, q, edificios altos, altura máx., x, z del más alto]); en «sin» además las torres del plan parcial
     (hasta 20 torres de 10–12 pisos [SUP], en proporción a las viviendas terminadas) en las líneas que pasan a 400 m o menos del predio, y las 5 estaciones del
     metro (fachadas de vidrio de 150 m [SUP]) desde que se terminan (semana 52) en las líneas que pasan a 120 m o menos. Cada parche ocupado por un ave emite
     un dispersante por semana (la misma regla de los atropellos) que va a otro parche con el núcleo de dispersión de su grupo y muere con probabilidad
     1 − e^(−K_EDIF·edificios) [SUP K_EDIF = 0,02 por edificio alto cruzado; Loss et al. 2014, The Condor 116: 8–23: los edificios altos matan del orden de 10–20
     aves por año cada uno]. Con propuesta: vidrios amigables con las aves y conexiones verdes −50 % [SUP: el vidrio con patrones reduce los choques
     hasta ~90 %, American Bird Conservancy]. Se acumula como los atropellos: cada vez que una suma llega a 1 se registra un choque en el edificio.
   · atropello: los de ind(s).atropellos (sin cambios).
   · ruido / hambre_habitat: POBLACIONES LOCALES PERDIDAS (no individuos) por la causa que anota red_trofica.js al extinguirse una especie en un parche:
     'tráfico y ruido' → ruido; 'sin recursos de la red', 'tala', 'humedal degradado' y 'el parche dejó de ser hábitat' → hambre_habitat.
   AVES Y RUIDO (ind(s).avesRuido): nivel en cada parche = el de su vía principal más cercana (data3d/exposicion_trafico.js: distancia d y flujo Q), con la
     fórmula del simulador L = 74 + 10·log10(Q·tráfico / 14.049) y una atenuación de fuente lineal de 3 dB por cada vez que se dobla la distancia desde 15 m
     [SUP], menos las calles pacificadas. bienestar = promedio sobre la ocupación de aves (especie × parche) de una curva lineal: 1 bajo 50 dB, 0 a 70 dB [SUP;
     Shannon et al. 2016, Biological Reviews 91: 982–1005: efectos en fauna desde ~40–50 dB(A), fuertes por encima de 60–70]. expuestas = fracción de la
     ocupación de aves en parches con más de 60 dB.
   CICLOS (ind(s).ciclos), con la referencia del año 1 (semana 52):
   · carbono (t C/año) = cobertura arbórea (ha de parques × densidad de árboles + bosque de Bavaria × (1 − tala)) × 2,8 t C/ha·año (Nowak et al. 2013, Environmental
     Pollution 178: 229–236: 0,28 kg C/m² de copa por año en ciudades de EE. UU.) + humedales funcionales (ha × calidad frente a la basura) × 1,18 t C/ha·año
     (Mitsch et al. 2013, Landscape Ecology 28: 583–597) + huertas (ha) × 1 t C/ha·año [SUP].
   · nutrientes = circular.indice (fracción de los orgánicos que vuelve al suelo como abono).
   · agua = área verde y permeable (haVerde de ind(s).verde + huertas) / área de Kennedy (3.859 ha, SDP) [SUP: el resto se toma como impermeable].
   · suelo = ha de suelo vivo (haVerde + huertas).
   · indice = promedio de mín(1, carbono / año 1), mín(1, nutrientes / 0,5), mín(1, agua / año 1), mín(1, suelo / año 1).
   BIODIVERSIDAD (ind(s).biodiversidad): riqueza = especies de fauna presentes; shannon H' = −Σ pᵢ·ln pᵢ con pᵢ = parches ocupados por la especie i / total;
     equitatividad de Pielou J = H' / ln(riqueza); gruposFuncionales: polinizadores (visita floral, tipo de enlace de biotica.json), dispersores (dispersión de
     semillas), depredadores (depredan fauna) y descomponedores (lombriz y caracol [SUP]); ref = los del año 1. */
const CHOQ = [[0,1,20,75,1440,532],[0,2,52,51,2513,-315],[0,3,9,15,2265,-82],[0,5,44,60,2163,-921],[0,7,14,63,1700,369],[0,12,7,36,1673,-318],[0,14,66,51,2513,-315],[0,15,38,36,2292,134],[0,20,32,51,2607,-248],[0,22,24,42,2246,127],[0,23,3,15,2265,-82],[0,26,27,45,2486,601],[0,28,19,18,2310,-43],[0,29,6,48,2578,-203],[0,32,66,51,2513,-315],[0,33,28,15,2348,63],[0,34,59,51,2424,-352],[0,35,2,48,2543,-229],[0,36,114,60,2688,-804],[0,38,14,18,2074,-23],[0,39,20,15,2262,267],[0,40,11,18,2074,-23],[0,41,1,15,2043,-516],[0,42,32,60,2163,-921],[0,43,30,21,1889,759],[0,44,4,36,1713,-337],[0,47,53,21,1889,759],[0,49,27,39,1642,-243],[0,50,26,39,1608,-116],[0,51,28,69,1796,-755],[0,52,12,51,1768,321],[0,53,55,36,1713,-337],[0,54,32,36,1702,-544],[0,56,59,36,1700,157],[0,69,8,15,2265,-82],[0,70,24,75,1440,532],[1,7,14,15,759,1510],[1,8,12,15,27,1492],[1,12,41,18,1262,117],[1,15,10,18,1797,830],[1,19,87,18,-299,-81],[1,22,26,18,1573,753],[1,23,26,15,2343,182],[1,24,51,15,552,1566],[1,25,34,18,-35,1795],[1,27,27,18,121,1820],[1,33,27,18,1573,753],[1,35,42,42,2246,127],[1,38,14,72,1525,529],[1,39,20,15,2445,1731],[1,40,20,18,1981,1391],[1,41,53,39,1625,-226],[1,43,3,15,1695,1256],[1,44,37,18,1262,117],[1,47,8,15,1714,1930],[1,49,26,15,803,83],[1,50,18,15,803,83],[1,53,21,18,712,-275],[1,55,19,18,1037,2140],[1,56,15,15,241,1238],[1,57,27,18,843,2472],[1,58,36,18,374,435],[1,59,45,15,432,1609],[1,60,31,15,254,808],[1,61,86,18,-299,-81],[1,63,83,18,59,486],[1,64,36,18,-607,1307],[1,65,11,15,-567,1661],[1,66,43,18,339,1950],[1,67,35,18,-35,1795],[1,68,35,18,-1100,2383],[2,3,46,18,3230,-490],[2,5,30,57,2802,-1020],[2,9,19,15,3127,-448],[2,12,120,36,2832,-559],[2,13,58,45,4181,-2044],[2,15,73,18,2957,-424],[2,20,105,36,3480,-561],[2,21,24,36,3682,-875],[2,22,61,18,2947,-459],[2,23,62,18,2957,-424],[2,28,17,18,3330,-361],[2,29,122,36,3480,-561],[2,30,57,36,4801,443],[2,31,20,15,3127,-448],[2,33,62,18,2957,-424],[2,34,26,18,3312,-928],[2,35,60,18,2876,-463],[2,36,33,18,3054,-875],[2,38,97,51,2565,-277],[2,40,71,18,2957,-424],[2,41,122,36,2786,-603],[2,42,38,63,2485,-1061],[2,43,83,18,2947,-459],[2,44,127,36,2832,-559],[2,49,147,36,2786,-603],[2,50,111,39,2070,-413],[2,51,25,60,2688,-804],[2,53,149,69,2035,-843],[2,54,38,60,2163,-921],[2,69,51,18,3230,-490],[3,6,3,15,3878,1271],[3,11,15,18,4358,779],[3,13,15,45,4320,-1638],[3,14,25,18,3230,-490],[3,15,5,24,3773,203],[3,20,4,15,3798,-330],[3,21,5,36,4426,-579],[3,22,6,15,2509,346],[3,23,4,15,3107,-118],[3,26,22,36,3621,1138],[3,29,2,15,4252,-412],[3,30,12,36,4801,443],[3,31,13,18,4358,779],[3,32,75,18,3239,-547],[3,33,6,18,3326,143],[3,34,18,36,3819,-825],[3,35,3,15,3107,-118],[3,36,46,36,3471,-696],[3,37,36,39,4263,2054],[3,38,27,18,3326,143],[3,39,2,24,3465,1194],[3,40,13,15,3028,898],[3,41,136,45,2699,-444],[3,42,179,60,2539,-1062],[4,16,3,18,-1597,-1],[4,19,9,15,-884,-484],[4,49,35,15,-641,-310],[4,50,49,18,259,-208],[4,53,23,42,18,-835],[4,56,22,18,-439,632],[4,58,16,18,-375,-861],[4,60,8,15,-726,258],[4,61,9,15,-902,-417],[4,62,15,18,-1112,-568],[4,63,12,15,-858,-241],[5,12,13,21,1590,-623],[5,13,36,33,3730,-2405],[5,14,34,63,2728,-1099],[5,20,54,36,3471,-696],[5,23,48,63,2582,-1154],[5,32,31,18,2909,-1020],[5,34,36,42,3166,-1647],[5,35,70,63,2485,-1061],[5,36,5,18,2957,-1326],[5,41,21,51,1980,-999],[5,42,16,18,2178,-1530],[5,44,13,21,1590,-623],[5,49,46,36,1520,-1452],[5,53,13,18,720,-1145],[5,54,7,18,891,-1564],[6,9,12,18,4216,1312],[6,11,13,15,4061,1758],[6,15,7,15,3028,898],[6,17,52,39,4225,2159],[6,18,10,21,3381,2543],[6,20,31,39,3687,1606],[6,22,4,15,2509,346],[6,23,3,24,3465,1194],[6,28,13,21,4152,945],[6,29,6,18,3927,1171],[6,30,18,39,4761,531],[6,31,10,18,4261,1474],[6,33,17,15,3249,1061],[6,35,9,15,3247,919],[6,37,5,39,4263,2054],[6,38,19,15,2666,811],[6,40,5,15,2546,1475],[6,43,29,18,1981,1391],[6,45,6,18,3846,2222],[6,46,9,21,3381,2543],[6,47,29,18,1870,1967],[6,48,5,15,3017,2572],[6,69,5,18,3927,1171],[7,8,28,18,108,1675],[7,12,23,18,1359,140],[7,15,10,15,2352,808],[7,22,19,21,1889,759],[7,24,12,15,455,1926],[7,25,32,18,112,1942],[7,26,23,21,1593,1768],[7,27,26,18,121,1820],[7,33,15,15,2152,617],[7,38,15,18,1573,753],[7,39,27,21,1593,1768],[7,40,27,15,1067,1578],[7,43,18,15,1334,1415],[7,44,27,18,1344,111],[7,47,22,18,1336,1784],[7,48,22,21,2013,2485],[7,49,34,15,803,83],[7,50,33,15,803,83],[7,55,4,15,988,2104],[7,56,19,15,241,1238],[7,57,14,18,843,2472],[7,59,25,18,339,1950],[7,60,44,15,148,1072],[7,63,76,18,-556,-55],[7,64,42,18,-680,1343],[7,65,30,18,108,1675],[7,66,19,15,461,2144],[7,67,33,18,112,1942],[7,68,44,18,-1100,2383],[7,70,3,15,809,1460],[8,10,33,18,-1455,809],[8,16,25,15,-1070,1356],[8,19,54,18,-720,1261],[8,24,1,15,-299,2374],[8,25,5,15,-735,2197],[8,27,8,15,-70,1886],[8,43,55,15,552,1566],[8,47,51,18,-35,1795],[8,50,70,18,83,668],[8,52,40,18,108,1675],[8,55,21,15,-414,1943],[8,56,7,15,241,1238],[8,57,26,15,-414,1943],[8,59,11,15,-414,1943],[8,60,16,18,-607,1307],[8,61,54,18,-720,1261],[8,63,47,18,-720,1261],[8,66,4,15,-462,2324],[8,67,7,15,-845,2339],[8,68,7,18,-1193,2413],[8,70,15,15,327,1413],[9,11,6,15,4622,1293],[9,14,20,15,3127,-448],[9,15,8,18,4413,864],[9,17,22,54,4784,1951],[9,18,30,21,4249,1475],[9,20,3,15,3798,-330],[9,21,34,36,4705,-424],[9,22,15,18,4413,864],[9,23,14,18,4358,772],[9,26,9,39,3708,1608],[9,28,1,15,4546,658],[9,29,8,18,4310,-293],[9,30,19,39,4761,531],[9,32,44,18,3116,-619],[9,33,14,18,4358,779],[9,34,12,15,3723,-1284],[9,35,16,18,4358,779],[9,37,13,39,4263,2054],[9,39,6,15,3928,1385],[9,40,30,36,3621,1138],[9,45,51,39,4298,2156],[9,46,31,21,4249,1475],[9,69,1,15,4546,658],[10,19,6,15,-1019,-479],[10,58,18,18,-1112,-568],[10,60,3,18,-1511,123],[10,61,7,15,-1019,-479],[10,62,11,15,-744,-1151],[10,63,11,15,-845,-190],[10,64,27,18,-1013,1168],[10,65,30,18,-1455,809],[11,15,12,18,4216,1312],[11,17,18,27,4780,2278],[11,18,67,36,4138,1968],[11,20,9,18,4252,757],[11,22,20,15,2509,346],[11,23,10,15,4046,1011],[11,26,10,15,4175,1590],[11,28,6,18,4414,856],[11,29,8,18,4310,-293],[11,30,30,39,4761,531],[11,31,2,15,4615,1366],[11,33,1,18,4252,1222],[11,35,10,18,4038,1005],[11,37,16,39,4263,2054],[11,39,9,15,4068,1578],[11,40,18,21,4249,1475],[11,45,59,39,4298,2156],[11,46,63,24,4000,2088],[11,48,48,18,4022,1849],[11,69,11,18,4358,779],[12,14,123,36,2832,-559],[12,15,28,42,2246,127],[12,19,35,18,-424,-576],[12,20,267,45,2699,-444],[12,22,20,42,2246,127],[12,23,9,48,2543,-229],[12,32,121,36,2832,-559],[12,33,37,36,1673,-318],[12,34,87,36,1668,-500],[12,35,12,51,2565,-277],[12,36,14,63,2683,-1056],[12,38,18,39,1625,-226],[12,40,54,39,1625,-226],[12,41,4,36,1702,-544],[12,42,14,36,1852,-963],[12,43,18,39,1587,-189],[12,47,38,66,1559,496],[12,49,23,15,1223,-495],[12,50,9,15,1255,-374],[12,51,9,18,1455,-555],[12,52,22,18,1387,127],[12,53,31,18,1365,-596],[12,54,36,18,1455,-555],[12,56,17,15,241,1238],[12,58,32,48,-47,-952],[12,60,37,15,378,25],[12,61,34,15,-381,-530],[12,62,39,18,135,-997],[12,63,66,15,348,-357],[12,70,33,18,1344,111],[13,14,52,45,4181,-2044],[13,20,38,66,4003,-1260],[13,21,12,42,4501,-1982],[13,29,17,42,4403,-1932],[13,32,50,45,4181,-2044],[13,34,24,45,4199,-2061],[13,36,79,60,3734,-1825],[13,42,24,57,4029,-2203],[13,69,18,45,4320,-1638],[14,15,67,18,2957,-424],[14,20,120,36,3480,-561],[14,21,21,36,3682,-875],[14,22,64,18,2957,-424],[14,23,63,18,2957,-424],[14,28,20,18,3330,-361],[14,29,130,36,3426,-554],[14,30,41,36,4801,443],[14,31,19,15,3127,-448],[14,33,64,18,2957,-424],[14,34,24,18,3161,-759],[14,35,60,18,2947,-459],[14,36,31,18,3054,-875],[14,38,102,51,2565,-277],[14,40,73,18,2957,-424],[14,41,118,36,2786,-603],[14,42,32,63,2485,-1061],[14,43,77,18,2947,-459],[14,44,123,36,2832,-559],[14,49,155,36,2832,-559],[14,50,104,39,2070,-413],[14,51,24,60,2688,-804],[14,53,166,69,1841,-794],[14,54,56,60,2163,-921],[14,69,38,18,3230,-490],[15,18,7,18,3120,2526],[15,20,1,15,2779,617],[15,22,8,15,2509,346],[15,23,5,15,2785,400],[15,26,3,15,2779,617],[15,28,1,15,2779,617],[15,29,6,15,4252,-412],[15,30,10,36,4801,443],[15,31,19,18,3494,837],[15,32,36,18,2998,-397],[15,33,8,15,2785,400],[15,34,89,36,3369,-613],[15,35,8,15,2785,400],[15,36,134,18,2957,-424],[15,37,53,39,4263,2054],[15,38,33,15,2051,219],[15,39,3,15,2779,617],[15,40,14,15,2666,811],[15,41,44,39,2218,-268],[15,42,59,51,2513,-315],[15,43,9,15,2097,1064],[15,44,27,42,2246,127],[15,46,7,18,3120,2526],[15,47,9,15,1762,1806],[15,48,11,18,2621,2350],[15,49,42,39,1608,-116],[15,50,41,36,1636,94],[15,52,11,15,2352,808],[15,69,5,24,3773,203],[15,70,11,15,2779,617],[16,19,14,18,-1535,17],[16,25,25,18,-1624,1000],[16,56,29,18,-1225,641],[16,58,22,18,-1597,-1],[16,60,6,15,-1364,386],[16,61,16,18,-1625,143],[16,62,4,18,-1622,-13],[16,63,15,18,-1608,176],[16,64,26,18,-1013,1168],[16,65,27,15,-1143,1326],[16,67,35,18,-1296,1797],[16,68,32,39,-1435,2027],[17,18,1,15,4680,2585],[17,26,18,36,4209,2345],[17,28,25,27,4780,2278],[17,30,25,81,4808,1528],[17,31,23,27,4780,2278],[17,37,14,39,4263,2054],[17,39,17,36,4209,2345],[17,46,1,15,4680,2585],[17,48,1,15,4680,2585],[18,26,4,18,3151,2270],[18,31,62,21,3527,2501],[18,37,17,39,4263,2054],[18,39,4,18,3120,2526],[18,40,16,15,2442,1491],[18,43,17,18,2759,2385],[18,47,26,21,1841,2046],[19,44,37,18,-424,-576],[19,49,20,18,-424,-576],[19,50,20,18,417,-267],[19,51,55,48,-47,-952],[19,53,4,45,-31,-822],[19,54,52,48,-47,-952],[19,56,66,18,-8,788],[19,58,14,18,-375,-861],[19,60,22,18,-556,-55],[19,62,7,15,-632,-847],[19,63,15,15,-704,-419],[19,64,35,18,-822,1029],[19,65,63,18,-720,1261],[19,70,72,18,126,291],[20,21,6,33,3846,-669],[20,22,7,15,2509,346],[20,23,6,18,3330,-361],[20,28,4,15,3798,-330],[20,29,5,15,4252,-412],[20,30,17,36,4801,443],[20,31,15,18,4358,779],[20,32,92,36,3480,-561],[20,33,5,15,3107,-118],[20,34,35,36,3682,-875],[20,35,8,15,3194,-383],[20,36,45,36,3471,-696],[20,38,46,42,2246,127],[20,40,9,15,2706,851],[20,41,220,36,3480,-561],[20,42,89,63,2582,-1154],[20,44,281,45,2657,-474],[20,69,4,15,3798,-330],[21,23,39,36,3480,-561],[21,28,64,36,4609,-587],[21,29,3,36,4344,-515],[21,30,26,72,4808,-47],[21,32,22,36,3682,-875],[21,34,11,69,4203,-1294],[21,35,172,36,3457,-585],[21,36,32,69,4203,-1294],[21,69,10,36,4426,-579],[22,23,2,15,2509,346],[22,26,10,15,2666,811],[22,28,12,15,2785,400],[22,29,5,15,4252,-412],[22,30,21,36,4801,443],[22,31,14,18,3494,837],[22,32,61,18,2957,-424],[22,33,1,15,2509,346],[22,34,101,18,3507,-914],[22,35,5,15,2509,346],[22,36,78,45,2708,-384],[22,37,60,39,3728,1585],[22,38,31,15,2051,219],[22,39,7,15,2666,811],[22,40,9,45,2486,601],[22,41,65,39,2218,-268],[22,42,86,18,2296,-496],[22,43,18,15,2509,346],[22,44,16,42,2246,127],[22,47,23,18,1981,1391],[22,49,32,39,1587,-189],[22,50,53,36,1731,80],[22,51,64,69,1796,-755],[22,52,17,18,2142,579],[22,53,48,42,2246,127],[22,54,56,42,2246,127],[22,56,35,18,1573,753],[22,69,6,15,2509,346],[22,70,25,15,2088,597],[23,26,6,15,3028,898],[23,28,3,24,3773,203],[23,29,5,15,3798,-330],[23,30,16,36,4801,443],[23,31,20,21,4152,945],[23,32,60,18,2957,-424],[23,34,96,18,3507,-914],[23,36,126,18,2947,-459],[23,38,35,42,2246,127],[23,39,5,15,2946,635],[23,40,9,15,2363,1277],[23,41,54,51,2429,-423],[23,42,50,45,2699,-444],[23,43,20,15,2509,346],[23,44,14,51,2607,-248],[23,47,25,45,2486,601],[23,49,32,48,2543,-229],[23,50,30,39,1625,-226],[23,51,95,51,2031,-947],[23,53,112,51,2565,-277],[23,54,82,69,1841,-794],[23,69,4,15,3107,-118],[23,70,23,18,1571,738],[24,25,9,15,-732,2485],[24,27,7,15,-29,2169],[24,43,19,15,461,2144],[24,47,29,18,1037,2140],[24,52,9,15,423,2038],[24,56,32,18,108,1675],[24,59,8,15,112,2204],[24,60,21,18,-337,1380],[24,64,7,15,-408,2051],[24,65,2,15,-320,2386],[24,67,7,15,-592,2565],[24,68,17,18,-1136,2471],[24,70,52,18,339,1950],[25,27,13,15,-338,2170],[25,52,32,18,112,1942],[25,55,10,15,-732,2485],[25,56,21,15,241,1238],[25,57,9,15,-732,2485],[25,59,14,15,-462,2324],[25,60,18,18,-680,1343],[25,64,8,15,-828,1922],[25,65,8,15,-828,1922],[25,66,1,15,-839,2441],[25,67,1,15,-839,2441],[25,68,12,18,-1193,2413],[25,70,37,15,-70,1886],[26,28,8,18,3809,1210],[26,30,27,39,3687,1606],[26,31,16,21,4249,1475],[26,33,5,15,2785,400],[26,35,2,15,2898,622],[26,37,19,39,4263,2054],[26,38,15,15,2051,219],[26,40,12,15,2561,1600],[26,43,17,18,1981,1391],[26,45,3,21,3527,2501],[26,46,5,18,3138,2266],[26,47,33,21,1900,1977],[26,48,2,15,3104,2257],[26,52,21,21,1593,1768],[26,55,12,75,2581,2380],[26,57,11,21,2013,2485],[26,69,20,36,3621,1138],[26,70,20,15,1714,1494],[27,40,42,15,116,1870],[27,43,46,18,121,1820],[27,47,46,18,1324,1966],[27,50,60,18,526,411],[27,52,29,18,121,1820],[27,55,12,18,628,2460],[27,56,18,18,108,1675],[27,57,8,15,121,2024],[27,59,8,15,80,2105],[27,60,37,18,-35,1795],[27,63,55,18,-35,1795],[27,64,7,15,-199,1738],[27,65,8,15,-70,1886],[27,66,8,15,-29,2169],[27,67,12,15,-578,2302],[27,68,24,18,-1100,2383],[27,70,42,18,121,1820],[28,29,2,15,4252,-412],[28,30,9,36,4801,443],[28,31,4,15,4455,786],[28,32,54,18,3116,-619],[28,33,6,15,3240,271],[28,34,12,15,3723,-1284],[28,35,2,24,3773,203],[28,36,50,36,3471,-696],[28,37,45,39,4263,2054],[28,38,27,15,2051,219],[28,39,16,18,3631,1213],[28,40,12,18,3494,837],[29,30,29,36,4801,443],[29,31,6,18,4310,-293],[29,32,104,36,3480,-561],[29,33,4,15,4252,-412],[29,34,12,15,4252,-412],[29,35,8,15,3798,-330],[29,36,45,36,3654,-865],[29,37,44,39,4263,2054],[29,38,27,42,2246,127],[29,41,258,36,3480,-561],[29,42,83,63,2611,-1183],[29,69,2,15,4252,-412],[30,31,19,39,4761,531],[30,32,94,36,4801,443],[30,33,16,36,4801,443],[30,34,43,36,4801,443],[30,35,16,36,4801,443],[30,36,57,36,4801,443],[30,37,33,39,4263,2054],[30,39,26,36,4801,443],[30,69,14,36,4801,443],[31,32,23,18,3164,-543],[31,33,5,18,4038,1005],[31,35,20,21,4152,945],[31,37,15,39,4263,2054],[31,39,10,21,4249,1475],[31,40,23,18,4216,1312],[31,45,51,39,4298,2156],[31,46,61,21,3424,2597],[31,69,10,18,4413,864],[32,33,56,18,2957,-424],[32,34,26,18,3161,-759],[32,35,57,18,2947,-459],[32,36,21,18,3088,-778],[32,38,99,51,2607,-248],[32,40,62,18,2957,-424],[32,41,112,18,2618,-695],[32,42,44,63,2485,-1061],[32,43,74,18,2957,-424],[32,44,126,36,2832,-559],[32,49,147,36,2786,-603],[32,50,109,39,2070,-413],[32,51,32,60,2688,-804],[32,53,136,69,2035,-843],[32,54,37,60,2688,-804],[32,69,85,18,3239,-547],[33,34,118,36,3372,-671],[33,36,131,18,2876,-463],[33,37,57,39,4263,2054],[33,38,23,15,2343,182],[33,39,7,15,2785,400],[33,40,9,15,2363,1277],[33,41,24,18,2247,-426],[33,42,78,51,2565,-277],[33,43,11,45,2456,594],[33,44,26,36,1713,-337],[33,47,16,45,2486,601],[33,49,68,39,1625,-226],[33,50,33,42,2246,127],[33,52,18,15,2152,617],[33,53,76,36,1668,-500],[33,69,6,18,3326,143],[33,70,25,15,2088,597],[34,35,80,18,2957,-424],[34,36,23,18,3631,-1231],[34,38,111,51,2565,-277],[34,41,46,57,2802,-1020],[34,42,36,27,3034,-1351],[34,44,74,36,1702,-544],[34,69,12,15,3723,-1284],[35,36,90,36,2832,-559],[35,38,43,36,2264,91],[35,39,2,15,2785,400],[35,40,8,15,2578,421],[35,41,54,51,2429,-423],[35,42,73,45,2666,-414],[35,43,21,15,2152,617],[35,44,14,51,2565,-277],[35,47,34,18,1981,1391],[35,49,36,51,2565,-277],[35,50,39,51,2607,-248],[35,51,91,51,2031,-947],[35,53,120,51,2565,-277],[35,54,80,69,1841,-794],[35,69,4,15,3107,-118],[35,70,40,42,2246,127],[36,38,106,60,2688,-804],[36,41,10,63,2683,-1056],[36,42,22,18,2121,-1411],[36,44,13,63,2683,-1056],[36,49,57,63,2620,-1116],[36,51,42,36,1556,-1691],[36,53,63,63,2611,-1183],[36,54,39,36,1496,-1426],[36,69,41,18,3312,-928],[37,39,4,39,4263,2054],[37,40,10,39,4263,2054],[37,45,25,39,4196,2128],[37,46,20,39,4263,2054],[37,48,41,39,4263,2054],[37,69,35,39,4263,2054],[38,39,14,15,2051,219],[38,40,24,18,2142,579],[38,41,16,18,2009,43],[38,42,43,39,2084,-367],[38,43,18,21,1889,759],[38,44,14,39,1642,-243],[38,47,34,21,1889,759],[38,49,12,39,1480,-99],[38,50,25,36,1731,80],[38,51,45,36,1702,-544],[38,52,19,18,1295,1139],[38,53,65,39,1607,-209],[38,54,55,39,1665,-214],[38,56,38,75,1440,532],[38,69,24,15,2343,182],[38,70,11,15,1941,290],[39,40,12,15,2561,1600],[39,43,18,18,1981,1391],[39,45,3,21,3527,2501],[39,46,4,18,3120,2526],[39,47,32,21,1900,1977],[39,48,7,15,2749,2573],[39,52,16,18,1707,1757],[39,55,8,15,1960,2557],[39,57,15,21,1671,2569],[39,69,8,24,3552,1132],[39,70,20,15,2445,1731],[40,41,21,18,2074,-23],[40,43,16,15,2217,1418],[40,44,49,39,1625,-226],[40,45,18,21,3527,2501],[40,46,17,15,2442,1491],[40,47,7,15,1714,1930],[40,48,18,18,2504,2566],[40,50,68,75,1440,532],[40,52,27,18,1946,1423],[40,55,16,15,1707,2376],[40,56,37,18,1981,1391],[40,57,19,15,1263,2555],[40,59,24,18,1336,1784],[40,69,13,15,3028,898],[40,70,18,15,2217,1418],[41,42,10,51,2031,-947],[41,43,21,18,1875,-228],[41,44,3,36,1674,-580],[41,49,36,69,1796,-755],[41,50,36,36,1646,-619],[41,51,13,36,1496,-1426],[41,53,47,69,1841,-794],[41,54,26,69,1841,-794],[41,58,36,69,1796,-755],[41,69,177,45,2657,-474],[41,70,51,39,1625,-226],[42,44,16,36,1852,-963],[42,49,58,18,1348,-867],[42,50,74,18,1826,-1140],[42,51,40,36,1704,-1579],[42,53,25,36,1711,-1350],[42,54,35,36,1606,-1463],[42,58,61,36,423,-1118],[42,69,137,63,2683,-1056],[43,44,20,39,1587,-189],[43,46,17,18,2759,2385],[43,47,15,18,1707,1757],[43,48,37,18,2210,2184],[43,49,41,18,1326,415],[43,50,53,15,1275,494],[43,52,17,15,1334,1415],[43,55,23,21,1593,1768],[43,56,14,15,241,1238],[43,57,30,18,1313,2162],[43,59,25,15,593,1960],[43,60,68,18,307,677],[43,70,3,15,1695,1256],[44,47,38,66,1559,496],[44,49,22,18,1404,-533],[44,50,17,15,1255,-374],[44,51,6,18,1437,-668],[44,52,20,18,1359,140],[44,53,49,18,1365,-596],[44,54,45,18,1455,-555],[44,56,15,15,241,1238],[44,58,32,48,-47,-952],[44,60,34,15,1255,-374],[44,61,33,18,-424,-576],[44,62,40,18,1445,-549],[44,63,59,15,322,-374],[44,70,40,18,1262,117],[46,47,33,21,1841,2046],[47,48,24,18,1827,2081],[47,50,36,21,1593,1768],[47,52,21,18,1336,1784],[47,55,3,15,1714,1930],[47,56,47,18,1336,1784],[47,57,4,15,1482,2241],[47,59,33,18,1324,1966],[47,65,43,18,-35,1795],[47,66,12,18,843,2472],[47,70,4,15,1714,1930],[48,52,27,21,2013,2485],[48,70,29,18,1827,2081],[49,50,2,15,774,-239],[49,52,22,18,867,45],[49,54,16,18,822,-1112],[49,56,53,18,526,411],[49,58,2,42,14,-918],[49,60,24,18,259,-208],[49,61,18,18,-424,-576],[49,62,4,42,-6,-988],[49,63,28,15,-406,-295],[49,70,22,18,867,45],[50,51,2,15,774,-239],[50,52,17,15,803,83],[50,53,5,15,729,-418],[50,54,23,18,822,-1112],[50,56,42,18,526,411],[50,58,23,45,-31,-822],[50,59,51,15,487,729],[50,60,19,15,256,0],[50,61,22,18,436,-251],[50,62,17,48,-47,-952],[50,63,46,18,259,-208],[50,64,46,18,-746,1168],[50,65,65,18,83,668],[50,70,19,15,803,83],[51,53,13,18,720,-1145],[51,54,7,18,891,-1564],[51,58,34,36,209,-1277],[51,61,57,48,-47,-952],[51,62,23,36,-228,-1357],[51,63,66,45,-31,-822],[52,55,16,18,1037,2140],[52,56,25,15,241,1238],[52,57,7,18,843,2472],[52,59,20,15,455,1926],[52,60,56,18,-8,788],[52,63,97,18,83,668],[52,64,34,18,-680,1343],[52,65,34,18,108,1675],[52,66,18,15,461,2144],[52,67,33,18,112,1942],[52,68,44,18,-1100,2383],[53,54,17,36,730,-1234],[53,56,40,15,241,1238],[53,58,21,42,-6,-988],[53,60,32,15,233,-506],[53,61,4,45,-31,-822],[53,62,28,36,162,-1153],[53,63,24,15,120,-749],[53,70,24,15,803,83],[54,58,41,36,162,-1153],[54,60,42,36,568,-1157],[54,61,55,48,-47,-952],[54,62,25,36,-228,-1357],[54,63,57,45,-31,-822],[55,56,29,15,241,1238],[55,59,9,15,112,2204],[55,65,23,15,-414,1943],[55,67,2,15,-592,2565],[55,70,14,15,1030,1610],[56,57,44,18,628,2460],[56,58,87,18,83,668],[56,59,32,18,121,1820],[56,60,30,15,241,1238],[56,61,70,18,-8,788],[56,63,47,18,-437,162],[56,64,15,18,-607,1307],[56,65,7,15,241,1238],[56,66,32,18,121,1820],[56,67,17,15,241,1238],[56,68,20,18,-1144,2383],[56,70,14,15,241,1238],[57,59,15,15,260,2388],[57,64,26,15,-309,1854],[57,65,19,15,195,2435],[57,67,1,15,-592,2565],[57,68,6,18,-1136,2471],[57,70,7,18,843,2472],[58,60,49,18,-307,-805],[58,61,12,18,-375,-861],[58,62,2,15,-365,-1071],[58,63,30,18,-375,-861],[58,64,65,18,-342,-817],[58,70,38,18,526,411],[59,60,44,18,-35,1795],[59,64,10,15,-309,1854],[59,65,11,15,-414,1943],[59,66,9,15,112,2204],[59,67,15,15,-732,2485],[59,68,35,18,-1100,2383],[59,70,38,15,552,1566],[60,61,22,18,-556,-55],[60,62,30,18,-556,-55],[60,63,16,15,-670,-124],[60,64,22,18,-782,1128],[60,65,12,18,-720,1261],[60,67,16,18,-720,1261],[60,68,37,18,-994,1680],[60,70,42,18,83,668],[61,62,6,15,-632,-847],[61,63,16,15,-704,-419],[61,64,36,18,-822,1029],[61,65,63,18,-720,1261],[61,70,72,18,126,291],[62,63,23,15,-612,-985],[63,64,17,18,-804,694],[63,65,47,18,-782,1128],[63,70,92,21,-28,362],[64,66,5,15,-462,2324],[64,67,5,18,-922,1742],[64,68,12,18,-994,1680],[64,70,36,18,-607,1307],[65,66,8,15,-708,1986],[65,67,4,15,-828,1922],[65,68,5,15,-945,1934],[65,70,15,15,27,1492],[66,68,2,15,-1182,2536],[66,70,44,15,455,1926],[67,68,6,18,-1136,2471],[67,70,35,18,-35,1795]];
export const MUERTES_SUP = { K_EDIF: 0.02, TORRES_PLAN: 20, R_PLAN: 400, R_EST: 120, PROP: 0.5, LISTA: 150, AÑOS: 15, AREA_KENNEDY: 3859, C_ARBOL: 2.8, C_HUMEDAL: 1.18, C_HUERTA: 1 };
const CHOQ_M = new Map(CHOQ.map(([p, q, n, h, x, z]) => [p * NP + q, [n, h, x, z]]));
const dSegP = (px, pz, a, b) => { const dx = b.x - a.x, dz = b.z - a.z, l2 = dx * dx + dz * dz || 1, u = Math.max(0, Math.min(1, ((px - a.x) * dx + (pz - a.z) * dz) / l2)); return Math.hypot(px - a.x - u * dx, pz - a.z - u * dz); };
const PLAN_PAR = new Set(), EST_PAR = new Map();
for (let p = 0; p < NP; p++) for (let q = p + 1; q < NP; q++) { const A = PARCHES[p], B = PARCHES[q]; if (Math.hypot(A.x - B.x, A.z - B.z) > 2500) continue;
  if (dSegP(PLAN_BAV.CENTRO[0], PLAN_BAV.CENTRO[1], A, B) <= MUERTES_SUP.R_PLAN) PLAN_PAR.add(p * NP + q);
  for (const S of METRO_SUP.EST) if (dSegP(S.x, S.z, A, B) <= MUERTES_SUP.R_EST) { EST_PAR.set(p * NP + q, S); break; } }
/* tablas por par de parches (simétricas): edificios altos, si la línea pasa junto al predio del plan o a una estación */
const N_EDIF = new Float32Array(NP * NP), PLAN_M = new Uint8Array(NP * NP), EST_M = new Int8Array(NP * NP).fill(-1);
for (const [k, v] of CHOQ_M) { const p = Math.floor(k / NP), q = k % NP; N_EDIF[p * NP + q] = N_EDIF[q * NP + p] = v[0]; }
for (const k of PLAN_PAR) { const p = Math.floor(k / NP), q = k % NP; PLAN_M[p * NP + q] = PLAN_M[q * NP + p] = 1; }
for (const [k, S] of EST_PAR) { const p = Math.floor(k / NP), q = k % NP; EST_M[p * NP + q] = EST_M[q * NP + p] = METRO_SUP.EST.indexOf(S); }
const NOMBRE_M = { 1: 'hambre_habitat', 2: 'ruido', 3: 'hambre_habitat', 4: 'hambre_habitat', 6: 'hambre_habitat' };
function muertesIni(E) { const aves = []; for (let i = 0; i < RED.NFA; i++) if (RED.AVE[i]) aves.push(i);
  return { aves, acc: new Float32Array(aves.length * NP * NP), total: 0, semana: 0, porCausa: { colision: 0, atropello: 0, ruido: 0, hambre_habitat: 0 }, porAño: new Array(MUERTES_SUP.AÑOS).fill(0), lista: [] }; }
function muertesPaso(E) {
  const M = E.muertes, s = E.s, t = s.t, occ = s.occ, P = E.prev, S = MUERTES_SUP, año = Math.min(S.AÑOS - 1, Math.floor(t / V.AÑO)), nuevos = [];
  const fPlan = E.plan && E.o.plan ? Math.min(1, E.o.plan.viviendas / 14002) : 0, estOk = t >= METRO_SUP.SEM_EST, fP = 1 /* sin descuento por etiqueta de escenario: riesgo según edificios realmente presentes */;
  const reg = (ev) => { nuevos.push(ev); M.lista.push(ev); M.total++; M.porCausa[ev.causa]++; M.porAño[año]++; };
  const clave = Math.round(fPlan * 50) + '|' + estOk; if (M.pk !== clave) { M.pk = clave; const PX = M.px || (M.px = new Float32Array(NP * NP)); /* probabilidad de choque por par: se rehace solo cuando cambian las torres del plan o las estaciones */
    for (let j = 0; j < NP * NP; j++) { const n = N_EDIF[j] + (estOk && EST_M[j] >= 0 ? 1 : 0) + (PLAN_M[j] ? S.TORRES_PLAN * fPlan : 0); PX[j] = n ? (1 - Math.exp(-S.K_EDIF * n)) * fP : 0; } }
  const PX = M.px;
  for (let k = 0; k < M.aves.length; k++) { const i = M.aves[k], W = PRE.DEST[RED.FAUNA[i].grupo], b = i * NP, base = k * NP * NP;
    for (let q = 0; q < NP; q++) { if (!occ[b + q]) continue; const qb = q * NP; for (let p = 0; p < NP; p++) { const pr = PX[qb + p]; if (!pr) continue; const w = W[qb + p]; if (!w) continue;
      const j = base + qb + p; M.acc[j] += w * pr;
      if (M.acc[j] >= 1) { M.acc[j] -= 1; const key = Math.min(p, q) * NP + Math.max(p, q), ch = CHOQ_M.get(key), est = estOk ? EST_PAR.get(key) : null, plan = fPlan > 0 && PLAN_PAR.has(key) ? S.TORRES_PLAN * fPlan : 0; let x, z, det;
        if (plan >= (ch ? ch[0] : 0) && plan > 0) { x = PLAN_BAV.CENTRO[0]; z = PLAN_BAV.CENTRO[1]; det = 'se estrelló contra la fachada de vidrio de una torre nueva del plan parcial Bavaria'; }
        else if (ch) { x = ch[2]; z = ch[3]; det = `se estrelló contra la fachada de un edificio de ${Math.round(ch[1] / 3)} pisos entre ${PARCHES[q].n} y ${PARCHES[p].n}`; }
        else { x = est.x; z = est.z; det = `se estrelló contra el vidrio de la estación ${est.n} del metro`; }
        reg({ sem: t + 1, especie: RED.FAUNA[i].id, nombre: RED.FAUNA[i].n, x: Math.round(x), z: Math.round(z), causa: 'colision', detalle: det, lugar: lugarDe(x, z) }); } } } }
  for (const a of E.atr.nuevos) reg({ sem: a.sem, especie: a.especie, nombre: a.nombre, x: a.x, z: a.z, causa: 'atropello', detalle: `atropellada en la ${a.via}, ${nf(a.vehDia)} veh/día`, lugar: a.lugar || a.via });
  for (let i = 0; i < RED.NFA; i++) for (let p = 0; p < NP; p++) { const kk = i * NP + p; if (!P[kk] || occ[kk]) continue; const c = NOMBRE_M[s.red.mot[kk]]; if (!c) continue;
    reg({ sem: t + 1, especie: RED.FAUNA[i].id, nombre: RED.FAUNA[i].n, x: Math.round(PARCHES[p].x), z: Math.round(PARCHES[p].z), causa: c, detalle: `población local perdida en ${PARCHES[p].n}: ${MOTIVOS[s.red.mot[kk]]}`, lugar: PARCHES[p].n }); }
  M.semana = nuevos.length; if (M.lista.length > S.LISTA) M.lista.splice(0, M.lista.length - S.LISTA); }
function dbParche(E, p, trafico, mitDb) { const e = EXPO.parches[p]; if (!e) return 45; const L = 74 + 10 * Math.log10(Math.max(1, e[1] * trafico) / EXPO.medianaVia) - 10 * Math.log10(Math.max(15, e[0]) / 15) - mitDb; return Math.max(35, L); }
function indAvesRuido(E, x) {
  const s = E.s, occ = s.occ, mit = MITIGA_DB * E.traf.mit; let w = 0, b = 0, ex = 0, bf = 0, en = 0; const pp = [];
  /* par 02 (2026-11-26, docs/sim02_movilidad.md): durante el cierre, los parches a DESVIO_SUP.RADIO o menos de la vía de desvío reciben su tráfico × traficoDesvio
     (la misma zona de los desvíos que usa la red trófica, E.xDes): más ruido ahí y menos bienestar de las aves */
  const C = E.cie, Dv = C && C.fase && DESVIOS[C.via] ? DESVIOS[C.via].desvio.map(id => DESVIOS.vias[id].dist) : null;
  for (let p = 0; p < NP; p++) { let a = 0; for (let i = 0; i < RED.NFA; i++) if (RED.AVE[i]) a += occ[i * NP + p]; const db = dbParche(E, p, x.trafico * (Dv && Dv.some(d => d[p] <= DESVIO_SUP.RADIO) ? C.traf || 1 : 1), mit + (E.obras ? E.obras.dDb[p] : 0)); if (a) { const bi = Math.max(0, Math.min(1, (70 - db) / 20)); w += a; b += a * bi; bf += a * bienestarDe(db); en += a * Math.pow(10, db / 10); if (db > 60) ex += a; pp.push({ x: Math.round(PARCHES[p].x), z: Math.round(PARCHES[p].z), db: Math.round(db * 10) / 10, aves: a, n: PARCHES[p].n }); } }
  pp.sort((u, v) => v.aves - u.aves || v.db - u.db);
  /* bienestarFauna (indicador «Bienestar de la fauna», 2026-11-25): Σ aᵖ·B(Lᵖ) / Σ aᵖ, aᵖ = aves (especie × parche) en el parche p, B = BIENESTAR_SUP.
     dbAves = nivel energético al que está expuesta la ocupación de aves. bienestar (curva vieja 50–70 dB) se conserva. */
  return { bienestar: w ? b / w : 1, bienestarFauna: w ? bf / w : 1, dbAves: w ? 10 * Math.log10(en / w) : null, expuestas: w ? ex / w : 0, porParche: pp.slice(0, 20) }; }
/* DOSIS-RESPUESTA del bienestar de la fauna frente al ruido: B(L) = 1 si L ≤ 50 dB(A); 1 − (L − 50)/25 entre 50 y 75; 0 desde 75.
   50 dB(A): Shannon et al. 2016 (Biological Reviews 91: 982–1005): las respuestas de la fauna terrestre empiezan hacia 40 dB(A) y 20 % de los estudios
   documenta efectos bajo 50 dB(A). [SUP] 75 dB(A) como pérdida total: borde de vía principal (el nivel de una vía con el flujo mediano es 74 dB(A) a 15 m
   con la fórmula del simulador), donde la literatura de aves y carreteras (Reijnen et al. 1996, J. Appl. Ecol. 33: 1–14) ya no encuentra densidades normales. */
export const BIENESTAR_SUP = { L0: 50, L1: 75 };
export const bienestarDe = (L) => Math.max(0, Math.min(1, 1 - (L - BIENESTAR_SUP.L0) / (BIENESTAR_SUP.L1 - BIENESTAR_SUP.L0)));
function indCiclos(E, x) {
  const S = MUERTES_SUP, s = E.s, Bs = E.bas, tala = s.planArb ? s.planArb / PLAN_BAV.ARB_TOT : 0; let parq = 0; for (const P of PARCHES) if (P.t === 'parque') parq += P.ha;
  const bos = PI_BOSQUE >= 0 ? PARCHES[PI_BOSQUE].ha * (1 - tala) : 0, copa = parq * E.PAR.P3.arboles + bos + (E.obras ? E.obras.bordes + E.obras.cv + E.obras.bar : 0), humF = Bs.ha.reduce((a, h, k) => a + h * Bs.cal[k], 0) + (E.obras ? E.obras.wetX + E.obras.bav : 0); /* obras: copa de borde, de calles y de la barrera de La Vaca; humedales nuevos */
  const huertasHa = (x.huertas || 0) * SUP_SIMS.M2_HUERTA / 1e4, casaHa = (E.o.act || 0) * SUP_SIMS.M2_HUERTA / 1e4; /* huertas en equivalentes de 50 m²; las de los hogares no están en ind(s).verde */
  const carbono = copa * S.C_ARBOL + humF * S.C_HUMEDAL + huertasHa * S.C_HUERTA, verdeHa = (x.verde ? x.verde.resumen.haVerde : 0) + casaHa, agua = verdeHa / S.AREA_KENNEDY, nutr = x.circular.indice;
  if (E.ref.listo && !E.cicRef) E.cicRef = { carbono, agua, suelo: verdeHa, nutrientes: nutr };
  const R = E.cicRef || { carbono, agua, suelo: verdeHa, nutrientes: nutr };
  return { indice: (Math.min(1, carbono / R.carbono) + Math.min(1, nutr / 0.5) + Math.min(1, agua / R.agua) + Math.min(1, verdeHa / R.suelo)) / 4,
    carbono, nutrientes: nutr, agua, suelo: verdeHa, detalle: { copaHa: copa, humedalFuncionalHa: humF, huertasHa }, ref: E.cicRef || null }; }
let GRUPOS_F = null;
function indBiodiversidad(E) {
  if (!GRUPOS_F) { const tn = (D && D.red && D.red.tipos) || [], ti = (re) => tn.findIndex(n => re.test(n)), tDisp = ti(/dispers/i), tPol = ti(/poliniz|floral/i), dep = new Set(), disp = new Set(), pol = new Set();
    for (const [a, b, t] of RED.ENL) { if (!RED.esFa(a)) continue; const i = RED.FI[a]; if ((t === 0 || t === 7) && RED.esFa(b)) dep.add(i); if (t === tDisp && RED.esFl(b)) disp.add(i); if ((t === tPol || t === 5) && RED.esFl(b)) pol.add(i); }
    GRUPOS_F = { polinizadores: [...pol], dispersores: [...disp], depredadores: [...dep], descomponedores: ['lombriz', 'caracol'].map(id => RED.FI[id]).filter(i => i != null) }; }
  const occ = E.s.occ, NFA = RED.NFA, n = new Float64Array(NFA); let tot = 0, S_ = 0; for (let i = 0; i < NFA; i++) { for (let p = 0; p < NP; p++) n[i] += occ[i * NP + p]; tot += n[i]; if (n[i]) S_++; }
  let H = 0; for (let i = 0; i < NFA; i++) if (n[i]) { const pi = n[i] / tot; H -= pi * Math.log(pi); } const J = S_ > 1 ? H / Math.log(S_) : 0;
  /* shannonArea (2026-11-25, indicador del tablero): H' con pᵢ = Aᵢ / Σ A, Aᵢ = hectáreas ocupadas por la especie i (Σ de las ha de sus parches).
     El modelo no cuenta individuos: con la misma densidad por especie, los individuos son proporcionales al área ocupada. Contar parches iguala un
     módulo de cubierta de 0,1 ha con un humedal de 18 ha. areaEsp = Aᵢ por id de especie (abeja, colibrí, tingua: especies clave). */
  const A = new Float64Array(NFA); let At = 0; for (let i = 0; i < NFA; i++) { for (let p = 0; p < NP; p++) if (occ[i * NP + p]) A[i] += (PARCHES[p].ha || 0) + (E.obras ? E.obras.dHa[p] : 0); At += A[i]; } // obras: área nueva del parche (ecoducto, La Vaca ampliada, humedal de Bavaria)
  let Ha = 0; for (let i = 0; i < NFA; i++) if (A[i] > 0) { const pi = A[i] / At; Ha -= pi * Math.log(pi); }
  const areaEsp = {}; for (let i = 0; i < NFA; i++) areaEsp[RED.FAUNA[i].id] = Math.round(A[i] * 100) / 100;
  const g = {}; for (const [k, L] of Object.entries(GRUPOS_F)) g[k] = { presentes: L.filter(i => n[i] > 0).length, total: L.length };
  const r = { riqueza: S_, shannon: H, equitatividad: J, gruposFuncionales: g }; if (E.ref.listo && !E.bioRef) E.bioRef = { riqueza: S_, shannon: H, equitatividad: J, gruposFuncionales: JSON.parse(JSON.stringify(g)) };
  return { ...r, shannonArea: Ha, areaEsp, ref: E.bioRef || null }; }

/* ---------- una semana ---------- */
export function paso(E) {
  const s = E.s, t = s.t + 1; E.prev.set(s.occ);
  if (E.traf.pob) s.pob *= Math.pow(1 + E.traf.pob, 1 / V.AÑO); // expansión poblacional (en vez de P1.crece, con la tasa del deslizador)
  mecanismosProp(E, t); obrasPaso(E, t); ganchoTraf(E, t); pruebaAntes(E, t);
  let sv = null;
  if (E.cie) desvios(E, t);
  if (E.plan) zonaPredio(E, t);
  if (E.obras) obrasAve(E, t);
  if (E.pred || E.cie || E.bas) { const X = E.xAve, PX = E.pred ? E.pred.xAve : null, OX = E.obras ? E.obras.xAve : null; for (let p = 0; p < NP; p++) X[p] = (PX ? PX[p] : 1) * E.xBas[p] * E.xDes[p] * (OX ? OX[p] : 1); }
  if (E.plan) { if (E.plan.esc !== 1 || E.plan.autos !== PLAN_BAV.AUTOS_HOG) { sv = [PLAN_BAV.VIV_ETAPA, PLAN_BAV.AUTOS_HOG]; PLAN_BAV.VIV_ETAPA = E.plan.viv; PLAN_BAV.AUTOS_HOG = E.plan.autos; } }
  const kgOrg = V.SUP.KG_ORG; if (E.par === 3) V.SUP.KG_ORG = ORG_KG_HAB_DIA * E.fOrg;
  try { E.o = V.paso(s, E.PAR); } finally { V.SUP.KG_ORG = kgOrg; if (sv) { PLAN_BAV.VIV_ETAPA = sv[0]; PLAN_BAV.AUTOS_HOG = sv[1]; } } // las viviendas y autos del deslizador solo para esta simulación
  E.ind = null;
  if (E.ab01) ab01Paso(E); // par 01: abastecimiento con datos (reemplaza la cobertura de sim_vida.js)
  basuraPaso(E, t); rcPaso(E); sueloPaso(E); pruebaDespues(E);
  // extinciones en toda Kennedy esta semana
  const NFA = RED.NFA, occ = s.occ, P = E.prev, ev = []; E.ev = ev;
  for (let i = 0; i < NFA; i++) { let antes = 0, ahora = 0; const b = i * NP; for (let p = 0; p < NP; p++) { antes |= P[b + p]; ahora |= occ[b + p]; }
    if (antes && !ahora) { let best = -1; for (let p = 0; p < NP; p++) if (P[b + p] && (best < 0 || PARCHES[p].ha > PARCHES[best].ha)) best = p;
      const F = RED.FAUNA[i], m = s.red.mot[b + best] || 5;
      ev.push({ sem: s.t + 1, especie: F.id, nombre: F.n, motivo: MOTIVOS[m], parche: PARCHES[best].id, x: PARCHES[best].x, z: PARCHES[best].z }); } }
  // promedios móviles (13 semanas) de la ocupación por especie × parche: los avisos no parpadean con el azar de una semana
  const A = 1 / 13, EO = E.emaO; for (let k = 0; k < EO.length; k++) EO[k] += (occ[k] - EO[k]) * A;
  const x = ind(E);
  referencia(E, x);
  E.vals = {}; for (const R of REGLAS) { const v = VALOR[R.k](x); E.vals[R.k] = v; E.racha[R.k] = MALO[R.k](v) ? E.racha[R.k] + 1 : 0;
    if (!E.go && E.racha[R.k] >= R.semanas && !(E.ab01 && R.k === 'abasto')) E.go = { /* par 01: el abasto se mide por sector (regla «deficit» abajo) */ regla: R.k, enfoque:R.k==='residuos'?'Circularidad':R.k==='habitat'||R.k==='fauna'||R.k==='humedal'?'Ecocentrismo':R.k==='abasto'?'Comercio ecológico':'Movilidad', sem: s.t + 1, inicio:s.t-R.semanas+2, motivo: MOTIVO_GO[R.k], lugar:'Kennedy', valor: Math.round(v * 1000) / 1000 }; }
  if (E.ab01) { /* par 01 v3: déficit por sector, saturación de Corabastos y residuos sin recoger (REGLAS_AB01), 4 semanas seguidas, iguales con y sin propuesta */
    const A = E.ab01, U = A.ult, KV = AB01V3, rc = E.rc, sem = s.t + 1, n1 = (v) => (Math.round(v * 10) / 10).toLocaleString('es-CO');
    A.rachaSat = U.inv > (U.cap || KV.CAP) ? A.rachaSat + 1 : 0; A.rachaRes = rc.noRec >= RES01.UMBRAL ? A.rachaRes + 1 : 0;
    U.sectores.forEach((S, i) => { A.rachaDef[i] = S.cob < KV.COB_MIN ? A.rachaDef[i] + 1 : 0; });
    /* v5: si el mismo día se cumplen la de Corabastos y el déficit, manda Corabastos (el déficit es su consecuencia: la central llena no despacha) */
    if (!E.go && A.rachaSat >= KV.SEMANAS)
      E.go = { regla: 'saturacion', enfoque: 'Comercio ecológico', sem, inicio: sem - KV.SEMANAS + 1, motivo: `el inventario de Corabastos llegó a ${nf(U.inv)} t, ${n1(U.sat * 100)} % de su límite de abastecimiento (${U.cap < KV.CAP - 1 ? nf(U.cap) + ' t: 14.000 t de referencia × las naves que quedan' : '14.000 t, capacidad de referencia'}), cuatro semanas seguidas (entran ${nf(U.ing)} t/día y salen ${nf(U.desp)})`, lugar: 'Corabastos', x: Math.round(CORA_XZ[0]), z: Math.round(CORA_XZ[1]), valor: Math.round(U.sat * 1000) / 10 };
    if (!E.go) { let bi = -1; U.sectores.forEach((S, i) => { if (A.rachaDef[i] >= KV.SEMANAS && (bi < 0 || S.cob < U.sectores[bi].cob)) bi = i; });
      if (bi >= 0) { const S = U.sectores[bi];
        E.go = { regla: 'deficit', enfoque: 'Comercio ecológico', sem, inicio: sem - KV.SEMANAS + 1, motivo: `el ${S.n} recibió ${n1(S.cob * 100)} % de su demanda (${nf(S.rec)} de ${nf(S.dem)} t/día; déficit de ${nf(S.def)} t/día), menos del 80 %, cuatro semanas seguidas`, lugar: S.n, x: S.x, z: S.z, valor: Math.round(S.cob * 1000) / 10 }; } }
    if (!E.go && A.rachaRes >= RES01.SEMANAS) E.go = { regla: 'residuosK', enfoque: 'Circularidad', sem, inicio: sem - RES01.SEMANAS + 1, motivo: `los residuos sin recoger de Kennedy llegaron a ${Math.round(rc.noRec)} t/día, el doble de los ${RES01.PC0} t/día de hoy en puntos críticos, cuatro semanas seguidas`, lugar: 'Kennedy', x: PARCHES[VACA_P].x, z: PARCHES[VACA_P].z, valor: Math.round(rc.noRec * 10) / 10 }; }
  /* 2026-11-26 (paneles de las 6 simulaciones, data3d/sim_panel.js): valor de cada regla de game over y semanas seguidas fuera del límite (solo lectura) */
  x.reglasV = { ...E.vals }; x.rachas = { ...E.racha }; x.fOrg = E.fOrg;
  if (E.gob) gobernanzaPaso(E, x); x.gobernanza = indGobernanza(E);
  { const ec = indEco(E, x), K = ec._conect; delete ec._conect; x.eco = ec; x.abeja = indAbeja(E, x, K); }
  verdePaso(E); x.verde = indVerde(E);
  atropellosPaso(E, x.trafico); { const A = E.atr; x.atropellos = { total: A.total, porAño: A.porAño.slice(), semana: A.nuevos.length, lista: A.lista.slice(), indice: x.atropellosIndice }; }
  muertesPaso(E); { const M = E.muertes; x.muertes = { total: M.total, semana: M.semana, porCausa: { ...M.porCausa }, porAño: M.porAño.slice(), lista: M.lista.slice() }; }
  x.avesRuido = indAvesRuido(E, x); x.ciclos = indCiclos(E, x); x.biodiversidad = indBiodiversidad(E);
  x.evaluacion = evaluarEstado(E, x, RED, PARCHES);
  const o = E.o, ratio = (a,b) => b>0 ? 100*a/b : null;
  const sectores = ZONAS.map(([x,z],i)=>({n:'Sector '+(i+1),x,z,valor:o.zRec[i]*100,demanda:o.demandaZona[i]/7000}));
  const alertas = [];
  function revisar(id, punto, indicador, mal) {
    const semanas = mal ? (E.rachasLocales.get(id)||0)+1 : 0;
    E.rachasLocales.set(id,semanas);
    if(semanas) alertas.push({...punto,indicador,semanas,inicio:x.sem-semanas+1,sem:x.sem});
  }
  sectores.forEach((p,i)=>{
    const mal=p.valor<80;
    E.rachaSectores[i]=mal?E.rachaSectores[i]+1:0;
    revisar('s'+i,p,'Cobertura <80 %',mal);
    if(!E.ab01&&!E.go&&E.rachaSectores[i]>=4)E.go={regla:'abasto',enfoque:'Comercio ecológico',sem:x.sem,inicio:x.sem-3,motivo:'el sector '+p.n+' recibió menos del 80 % de su demanda durante cuatro semanas consecutivas',lugar:p.n,x:p.x,z:p.z,valor:p.valor};
  });
  x.rachaSector = E.rachaSectores.reduce((a, v) => Math.max(a, v), 0); // sim_panel.js: semanas seguidas del sector peor servido bajo 80 %
  x.evaluacion.diversidad.porParche.forEach((p,j)=>{
    let inicial=0;
    const afectadas=[];
    for(let i=0;i<RED.NFA;i++){inicial+=E.occ0[i*NP+j];if(E.occ0[i*NP+j]&&!E.s.occ[i*NP+j])afectadas.push(RED.FAUNA[i].n);}
    revisar('p'+j,{...p,afectadas,valor:ratio(p.riqueza,inicial)},'Pérdida de presencia ≥30 %',inicial>0 && p.riqueza<=.7*inicial);
  });
  const plantas = (x.estaciones||[]).filter(p=>p.tipo==='estacion');
  const estaciones = plantas.map(p=>({...p,valor:ratio(p.acumulado_t,o.capacidadPlanta/1000/plantas.length)}));
  estaciones.forEach((p,i)=>revisar('e'+i,p,'Almacenamiento >100 %',p.valor>100));
  const especies=RED.FAUNA.map((f,i)=>{
    const lugares=[];

    const W=PRE.DEST[f.grupo], destinos=new Set();
    for(let q=0;q<NP;q++) if(E.s.occ[i*NP+q]){
      lugares.push(q);
      if(W){
        const indices=PRE.destinosIndices ||= new Map();
        if(!indices.has(W))indices.set(W,Array.from({length:NP},(_,origen)=>Array.from({length:NP},(_,p)=>p).filter(p=>p!==origen && W[origen*NP+p]>0)));
        for(const p of indices.get(W)[q]) if(E.s.q[p]>0 &&
        (!RED.TER[i] || (E.s.red.XQ?.[p*NP+q]??1)*S0de(E)[p*NP+q]>0)) destinos.add(p);
      }
    }
    return {n:f.n,grupo:f.grupo,valor:lugares.length,lugares,alcanzables:W?destinos.size:null};
  });
  if (E.par === 4) {
    // Presencia = número de parches ocupados por especie. Referencia: semana previa al deterioro elegido.
    // Si la prueba comienza en la semana 1, se usa la ocupación inicial de la red.
    if (x.sem === E.frag.t0 - 1) { E.espBase = especies.map(p => p.valor); E.espRachas.fill(0); }
    if (E.espBase) {
      const comparadas = especies.map((p, i) => ({ n: p.n, actual: p.valor, inicial: E.espBase[i], porcentaje: E.espBase[i] ? 100 * p.valor / E.espBase[i] : null, x: p.lugares.length ? PARCHES[p.lugares[0]].x : null, z: p.lugares.length ? PARCHES[p.lugares[0]].z : null }));
      const peor = comparadas.filter(p => p.porcentaje != null).sort((a, b) => a.porcentaje - b.porcentaje)[0];
      x.presenciaEspecie = peor ? { ...peor, racha: E.espRachas[especies.findIndex(p => p.n === peor.n)] } : null;
      for (let i = 0; i < comparadas.length; i++) {
        const p = comparadas[i]; E.espRachas[i] = x.sem >= E.frag.t0 && p.porcentaje != null && p.porcentaje <= 70 ? E.espRachas[i] + 1 : 0;
        if (!E.go && E.espRachas[i] >= 4) E.go = { regla: 'especie', enfoque: 'Ecocentrismo', sem: x.sem, inicio: x.sem - 3,
          motivo: `la presencia de ${p.n} bajó ${Math.round(100 - p.porcentaje)} % frente a antes del deterioro durante cuatro semanas consecutivas`, lugar: p.n, x: p.x, z: p.z, valor: Math.round(p.porcentaje * 10) / 10 };
      }
      if (peor) x.presenciaEspecie.racha = E.espRachas[especies.findIndex(p => p.n === peor.n)];
    }
  }
  x.evaluacion.territorio={
    red:x.red,riqueza:x.biodiversidad.riqueza,conectados:ratio(x.verde.resumen.nConectados,x.verde.resumen.nParches),
    atropellos:x.atropellos.semana,verde:x.ciclos.suelo,
    organicos:o.gen/7000,recolectados:o.recolectado/7000,tratados:o.desv/7000,pendientes:o.pend/1000,
    aprovechamiento:ratio(o.desv,o.gen),compost:o.compost/7000,retorno:o.vuelve/7000,
    madura:o.entradaMadura/7000,sustrato:o.sustrato/7000,saturacion:ratio(o.pend,o.alm),
    capTratamiento:o.capComp/7000, demanda:o.need/7000, capacidadAlmacen:o.alm/1000, presencia:ratio(x.pares,x.pares0), autonomia:ratio(o.localConsumido,o.need),cobertura:o.recib*100,produccion:o.prod/7000,autoconsumo:o.auto/7000,
    acopio:o.acopiado/7000,concentracion:ratio(o.coraKg,o.recib*o.need),sectores,estaciones,especies,alertas,
    eventos:E.atr.nuevos.map(p=>({...p})),gameOver:E.go?{...E.go}:null
  };
  x.eventos = avisos(E, x); x.hechos = E.hechos.slice();
  return E;
}
export function gameOver(E) { return E.go; }
/* REFERENCIA del año 1 (semanas REF[0]–REF[1]): el estado inicial de la red trófica (regla de hábitat ≥ 0,45 de sim_vida.js) está por debajo del
   equilibrio del modelo: la ocupación se duplica en las primeras ~40 semanas en TODAS las simulaciones y luego se estabiliza. Los avisos de fauna,
   presion, recuperacion y la ocupación de referencia del predio se comparan con el promedio de las semanas 40–52 (ya asentado), no con la semana 0.
   pares0, red0 y poliniz0 siguen siendo los de la semana 0 (contrato y reglas de game over sin cambios). Antes de la semana 52 la referencia es el
   valor actual (sin avisos de fauna). */
export const REF = [40, 52];
function referencia(E, x) {
  const R = E.ref; if (R.listo || x.sem < REF[0]) return; const n = REF[1] - REF[0] + 1;
  R.pares += x.pares / n; R.red += x.red / n; R.poli += x.poliniz / n; R.huertas += x.huertas / n;
  const occ = E.s.occ; for (let k = 0; k < occ.length; k++) R.occ[k] += occ[k] / n;
  if (E.pred) { for (let i = 0; i < RED.NFA; i++) { let k = 0; for (const p of PRED_P) k += occ[i * NP + p]; R.pred[i] += k / n; R.predOcc += k / n; } }
  if (x.sem >= REF[1]) R.listo = true; }
const refV = (E, k, actual) => E.ref.listo ? E.ref[k] : actual;

/* ---------- indicadores de la semana ---------- */
const sobre = (A, u) => { u -= 1e-4; let lo = 0, hi = A.length; while (lo < hi) { const m = (lo + hi) >> 1; if (A[m] >= u) hi = m; else lo = m + 1; } return A.length - lo; }; // cuántos ≥ u (A ordenado; como las bandas del simulador: v < 65 es «moderado», 65 o más «ruidoso»)
export function ind(E) {
  if (E.ind) return E.ind; const s = E.s, o = E.o; if (!o) throw new Error('simulaciones.js: llamar paso() antes de ind()');
  const c = s.red.c, c0 = s.red.inicio, NFA = RED.NFA, occ = s.occ;
  // presencia por especie
  let aves = 0, poli = 0; const pres = new Uint8Array(NFA); for (let i = 0; i < NFA; i++) { let a = 0; for (let p = 0; p < NP; p++) a |= occ[i * NP + p]; pres[i] = a; if (a && RED.AVE[i]) aves++; }
  for (const i of PRE.POLI) if (pres[i]) poli++;
  // tráfico y ruido (V de sim_vida.js × factor de los deslizadores; metro cerca del corredor; calles pacificadas)
  const V0 = o.trafico.V * factorTraf(E, s.t), mOn = E.metro && s.t >= E.metro.desde, fCer = mOn ? 1 - E.metro.red : 1;
  const trafico = V0 * (1 - (1 - fCer) * PRE.fC);
  const mitDb = MITIGA_DB * E.traf.mit;
  const dL = 10 * Math.log10(V0) - mitDb, dC = 10 * Math.log10(V0 * fCer) - mitDb, n = PRE.nC + PRE.nL;
  const ruidoDb = ((PRE.mLc + dC) * PRE.nC + (PRE.mLl + dL) * PRE.nL) / n;
  if (E.ruido0 == null) E.ruido0 = PRE.mLc * PRE.nC / n + PRE.mLl * PRE.nL / n; // inicio = HOY (sin crecimiento ni metro)
  /* L_Aeq (ISO 1996-1): promedio ENERGÉTICO de las mismas celdas, 10·log10(Σ 10^(Lᵢ/10) / n); cada grupo se desplaza dC o dL dB, así que
     Σ 10^((Lᵢ+d)/10) = n_g · 10^((eL_g + d)/10). ruidoDb (promedio aritmético) se conserva para las reglas y avisos de siempre. */
  const ruidoLAeq = 10 * Math.log10((PRE.nC * Math.pow(10, (PRE.eLc + dC) / 10) + PRE.nL * Math.pow(10, (PRE.eLl + dL) / 10)) / n);
  if (E.ruidoLAeq0 == null) E.ruidoLAeq0 = 10 * Math.log10((PRE.nC * Math.pow(10, PRE.eLc / 10) + PRE.nL * Math.pow(10, PRE.eLl / 10)) / n);
  const callesRuidosas = (sobre(PRE.Lc, 65 - dC) + sobre(PRE.Ll, 65 - dL)) / n * 100, callesOMS = (sobre(PRE.Lc, 53 - dC) + sobre(PRE.Ll, 53 - dL)) / n * 100;
  const congestion = TOMTOM.congestion * Math.pow(trafico, TOMTOM.beta), tiempo10km = TOMTOM.libre * (1 + congestion / 100);
  const tiempoDesvio10km = E.par === 2 ? TOMTOM.libre * (1 + TOMTOM.congestion / 100 * Math.pow(trafico * (E.cie ? E.cie.traf : 1), TOMTOM.beta)) : null; // estimación BPR para 10 km en el corredor de desvío, no tiempo puerta a puerta
  // atropellos (índice [SUP], ver encabezado)
  let atrop = 0; const XQ = s.red.XQ;
  if (XQ) for (let i = 0; i < NFA; i++) { if (!RED.TER[i]) continue; const W = PRE.DEST[RED.FAUNA[i].grupo], b = i * NP;
    for (let q = 0; q < NP; q++) { if (!occ[b + q]) continue; for (let p = 0; p < NP; p++) { const w = W[q * NP + p]; if (w) atrop += w * (1 - XQ[p * NP + q] * S0de(E)[p * NP + q]); } } }
  // zonas
  const soporteEco = new Float32Array(NZ), comercio = new Float32Array(NZ), cora = new Float32Array(NZ), rP = new Float32Array(NP);
  for (let p = 0; p < NP; p++) { let k = 0; for (let i = 0; i < NFA; i++) k += occ[i * NP + p]; rP[p] = k / NFA; }
  for (let z = 0; z < NZ; z++) { let pr = 1; for (let p = 0; p < NP; p++) if (rP[p]) pr *= 1 - rP[p] * PRE.WZ[z * NP + p]; soporteEco[z] = 1 - pr;
    const compra = o.zRec[z] - o.zLoc[z], co = Math.max(0, compra - o.zRed[z]); comercio[z] = compra > 1e-6 ? Math.min(1, o.zRed[z] / compra) : 0; cora[z] = co; }
  /* huertas = hogares que siembran + superficies de la red (B y C: P1.sup montada; B sin módulos de C usa 60 %) y techos, en huertas equivalentes de 50 m² */
  const prop = s.e === 'B' || s.e === 'C', supRed = prop ? E.PAR.P1.sup * s.supF * (s.e === 'B' && !E.mod.huertasC ? 0.6 : 1) : 0;
  const huertas = o.act + (supRed + (E.techos ? E.techos.m2 * s.supF : 0)) / SUP_SIMS.M2_HUERTA + (E.obras && E.obras.hid ? E.obras.hid * 1e4 / SUP_SIMS.M2_HUERTA : 0); // obras (par 01): huertas hidropónicas sobre las cubiertas del modelo
  const comidaLocal = Math.min(100, o.pct || 0); // % de la gente de Kennedy que comería solo de las huertas (sim_vida.js: pers / pob)
  const sem = s.t + 1, red = interLocal(s), poliniz = paresPoli(s);
  if (E.emaP == null) E.emaP = c.pares; else E.emaP += (c.pares - E.emaP) / 13;
  const predio = E.pred ? indPredio(E, trafico, mitDb) : null;
  /* PRESIÓN y RECUPERACIÓN (0–1), para que las láminas de indicadores 3D se degraden o se recuperen en todas las simulaciones.
     presion = 0,2·población + 0,2·tráfico + 0,15·ruido + 0,2·pérdida de verde + 0,25·basura, cada parte normalizada a su umbral:
       población (gente nueva de Kennedy y del plan parcial) / 30 % · (trafico − 1) / 0,30 (la regla de tráfico) · (ruido − inicio) / 3 dB (la regla de ruido) ·
       pérdida de verde = árboles talados del bosque de Bavaria (fracción) + caída de la calidad del humedal frente a 0,55 + caída de la ocupación de
       los parches / 30 % (la regla de hábitat) + área de humedal perdida / 10 % · basura = (ratas − 1), el doble de basura acumulada = 1.
       [SUP] pesos; cada parte se limita a 0–1.
     recuperacion = 0,25·huertas + 0,15·árboles + 0,15·borde restaurado + 0,15·humedal + 0,3·interacciones de la red:
       huertas nuevas / 3 veces las del inicio · árboles en parques sobre 0,4 (deslizador), creciendo en 5 años · borde de La Vaca restaurado × madurez ·
       calidad del humedal sobre 0,55 / 0,45 · (red / red₀ − 1) / 0,5. [SUP] pesos. */
  const h0 = E.evs.h0 != null ? E.evs.h0 : (E.evs.h0 = Math.max(1, huertas));
  const pobNueva = (s.pob + (o.plan ? o.plan.personas : 0)) / V.POB_K - 1;
  const tala = s.planArb ? s.planArb / PLAN_BAV.ARB_TOT : 0;
  const Bs = E.bas, humHa = Bs.ha.reduce((a, v) => a + v, 0), humedalHa = humHa + (o.cora.borde || 0) / 1e4 * (o.cora.mad || 0) + (E.obras ? E.obras.wetX + E.obras.bav : 0);
  const arbPerdida = E.arb0 ? 1 - E.PAR.P3.arboles / E.arb0 : 0, humedalFuncional = Bs.func * 100;
  const verde = cl01(tala + arbPerdida / 0.2 + Math.max(0, (0.55 - s.W) / 0.55) + Math.max(0, 1 - E.emaP / Math.max(1, refV(E, 'pares', E.emaP))) / 0.3 + Math.max(0, 1 - Bs.func) / 0.3);
  const presion = cl01(0.2 * cl01(pobNueva / 0.3) + 0.2 * cl01((trafico - 1) / 0.3) + 0.15 * cl01((ruidoDb - E.ruido0) / 3) + 0.2 * verde + 0.25 * cl01(Bs.ratas - 1));
  const arb = cl01((E.PAR.P3.arboles - 0.4) / 0.6) * Math.min(1, sem / (5 * V.AÑO));
  const borde = BORDE_TOT > 0 ? cl01(o.cora.borde / BORDE_TOT) * (o.cora.mad || 0) : 0;
  const recuperacion = cl01(0.25 * Math.max(cl01((huertas - h0) / (3 * h0)), cl01(comidaLocal / 10)) + 0.15 * arb + 0.15 * borde + 0.15 * cl01((s.W - 0.55) / 0.45) + 0.3 * cl01((red / Math.max(1, refV(E, 'red', red)) - 1) / 0.5));
  return E.ind = { sem, año: sem / V.AÑO, fauna: c.esp, fauna0: c0.esp, flora: c.flora, flora0: c0.flora, red, red0: E.red0, redTipos: c.red, redTipos0: c0.red, pares: c.pares, pares0: c0.pares,
    aves, poliniz, poliniz0: E.poli0, polinizEsp: poli, trafico, congestion, tiempo10km, tiempoDesvio10km, ruidoDb, ruidoDb0: E.ruido0, ruidoLAeq, ruidoLAeq0: E.ruidoLAeq0, mitiga: E.traf.mit, callesRuidosas, callesOMS, atropellosIndice: atrop, atropellos: null, hechos: null, verde: null, muertes: null, avesRuido: null, ciclos: null, biodiversidad: null, comidaMin: o.zMin, residuos: o.pend / Math.max(1, o.alm),
    huertas, bodegas: s.cora.ap.length, cierre: indCierre(E, o), poblacionKennedy: E.par === 5 ? Math.round(s.pob + (o.plan ? o.plan.personas : 0)) : null, zonas: { soporteEco, comercio, cora }, extinciones: E.ev, presion, recuperacion, predio, eventos: [],
    ref: E.ref.listo ? { pares: E.ref.pares, red: E.ref.red, poliniz: E.ref.poli, semanas: REF } : null,
    basura: { total_t_dia: Bs.total, puntos: Bs.pts.map(P => ({ x: Math.round(P.x), z: Math.round(P.z), t_dia: P.t, fuente: P.fuente, acumulada: P.acum, acumulada0: P.acum0, sinRecoger_t_dia: P.u, nombre: P.nombre || null })), captura: Bs.captura, fraccionSinRecoger: (() => { let u = 0, g = 0; for (const P of Bs.pts) if (P.fuente !== 'humedal') { u += P.u; g += P.t; } return g > 0 ? u / g : 0; })(), acumulada: Bs.acum, acumulada0: Bs.acum0, sinRecoger_t_dia: Bs.pts.reduce((a, P) => a + P.u, 0) },
    ratas: Bs.ratas, ratas0: 1, humedalHa, humedalHa0: Bs.ha0Tot, humedalFuncional, humedales: HUM_P.map((h, k) => ({ id: PARCHES[h].id, nombre: PARCHES[h].n, x: PARCHES[h].x, z: PARCHES[h].z, ha: Bs.ha[k], ha0: Bs.ha0[k], calidad: Bs.cal[k] })),
    arboles: E.PAR.P3.arboles, arbolesPerdidos: arbPerdida, comidaLocal, metro: indMetro(E, s), circular: indCircular(E),
    comidaK: E.rc ? { dem: E.rc.dem, llega: E.rc.llega, frescos: E.rc.frescos, frescosRec: E.rc.frescosRec, otros: E.rc.otros } : null, /* t/día (RES01/COM01) */
    residuosK: E.rc ? { gen: E.rc.gen, noRec: E.rc.noRec, trat: E.rc.trat, nEst: E.rc.nEst, capEst: E.rc.capEst, estaciones: E.rc.nEst ? EST01_SITIOS.slice(0, E.rc.nEst) : null, umbral: E.rc.umbral, hoy: E.rc.hoy, D: E.rc.D, arboles: E.rc.arboles, inter: E.rc.inter, aporte: E.rc.aporte, racha: E.ab01 ? E.ab01.rachaRes || 0 : null } : null,
    congestion01: E.rc ? { nivel: E.rc.nivel, camiones: E.rc.camiones } : null,
    abasto: E.ab01 ? ab01Ind(E) : indAbasto(E), ...(() => { const R = indEstaciones(E); return { estaciones: R ? R.estaciones : null, recorridos: R ? R.recorridos : null }; })(),
    ...(() => { const F = indFragmento(E); return { fragmento: F ? F.fragmento : null, corredores: F ? F.corredores : null, refugios: F ? F.refugios : null, desplazamientos: F ? F.desplazamientos : null }; })(),
    suelo: indSueloUsos(E), gobernanza: E.gob ? indGobernanza(E) : null, par: E.par, propuesta: !!E.prop,
    obras: E.obras ? { ecoductoHa: E.obras.eco, bordesCopaHa: E.obras.bordes, callesCopaHa: E.obras.cv, parquesCopaHa: E.obras.pqC, vacaHumedalHa: E.obras.wet, vacaBarreraHa: E.obras.bar, bavariaHa: E.obras.bav, hidroponiaHa: E.obras.hid, corredoresCalle: corredoresCV(E, s.t).filter(c => c[2] >= 1).length, arbolesParques: E.PAR.P3.arboles } : null,
    especulacion: { indice: E.suelo.indice, hogaresRiesgo: Math.round(E.suelo.riesgo), proteccion: E.suelo.prot, zonas: Z_SUELO.map(z => ({ x: Math.round(ZONAS[z][0]), z: Math.round(ZONAS[z][1]), indice: E.suelo.idx[z] })) } };
}
function indCierre(E, o) { const C = E.cie, f = C ? C.fase : 0; if (!o.cierre && !f) return null;
  const D = C ? DESVIOS[C.via] : null, base = o.cierre || { via: D ? D.n : '', sem: null, dur: C ? C.dur : null, on: true };
  return { ...base, fase: f, vias_desvio: D && f ? [...D.desvio.map(id => ({ id, n: DESVIOS.vias[id].n })), ...(E.prop ? [{ id: 'conexiones', n: 'Pasajes y conexiones de Bavaria Común' }] : [])] : [], traficoDesvio: C ? C.traf || 1 : 1, ruidoExtraDb: C ? 10 * Math.log10(C.traf || 1) : 0 }; }
function indPredio(E, trafico, mitDb) {
  const s = E.s, o = E.o, PD = E.pred, NFA = RED.NFA, occ = s.occ, S = PREDIO_SUP;
  let car = 0, cam = 0, hab = 0, vias = 0;
  if (E.plan) { const P = planEn(E, s.t), Vj = viajes(E, P); car = Vj.car; cam = Vj.cam; hab = P.viv * PLAN_BAV.PERS_HOG; vias = P.vias; }
  else cam = 4 * (o.bavKg || 0) / 7 / S.CARGA_CAMION; // instituto: camiones del acopio
  // en la ENTRADA más cargada: cada acceso nuevo lleva 1/accesos de los viajes (instituto: un acceso)
  const sh = E.plan ? 1 / E.plan.accesos : 1, Qb = Q0_PREDIO * trafico, traf = (Qb + (car + cam) * sh) / Q0_PREDIO;
  const ruidoDb = dBvia(Qb + (car + cam * S.CAMION_EQ) * sh) - mitDb, ruidoDb0 = dBvia(Q0_PREDIO);
  let ocup = 0; const fuera = [], tala = s.planArb ? s.planArb / PLAN_BAV.ARB_TOT : 0;
  for (let i = 0; i < NFA; i++) { let k = 0; for (const p of PRED_P) k += occ[i * NP + p]; ocup += k; PD.ema[i] += (k - PD.ema[i]) / 13;
    if (!E.ref.listo) continue; const antes = Math.round(E.ref.pred[i]), ahora = Math.round(PD.ema[i]); if (!(antes > 0 && ahora < antes)) continue;
    let ruido = false; if (RED.AVE[i]) for (const p of PRED_P) if (E.ref.occ[i * NP + p] > 0.5 && PD.xMin[p] <= 0.9) ruido = true;
    const nidos = PI_BOSQUE >= 0 && E.ref.occ[i * NP + PI_BOSQUE] > 0.5 && tala >= 0.1;
    if (ruido || nidos) fuera.push({ especie: RED.FAUNA[i].id, nombre: RED.FAUNA[i].n, antes, ahora, causa: ruido && nidos ? 'ambas' : ruido ? 'ruido' : 'nidos' }); }
  PD.emaOcc += (ocup - PD.emaOcc) / 13;
  return { x: PLAN_BAV.CENTRO[0], z: PLAN_BAV.CENTRO[1], nombre: E.plan ? 'Plan parcial Bavaria' : 'Instituto en Bavaria', trafico: traf, trafico0: 1, ruidoDb, ruidoDb0, ocupacion: ocup, ocupacion0: E.ref.listo ? E.ref.predOcc : PD.emaOcc, ocupacionInicial: PD.occ0,
    habitantes: Math.round(hab), vias, vehiculosDia: Math.round(car + cam), camionesDia: Math.round(cam), tala, especiesFuera: fuera };
}

/* ---------- LUGARES Y ATROPELLOS DE FAUNA ----------
   Vías con nombre de OpenStreetMap (trunk / primary / secondary; el nombre popular de alt_name cuando existe) generadas con tools/atropellos_datos.mjs:
   ATR.VIAS = [nombre, x, z] · ATR.VIA_P[p] = [vía más cercana al parche p, distancia m] · ATR.CRUCES = [p, q, vía, x, z]: la vía con nombre que corta la línea
   entre dos parches a 3 km o menos que se cruzan tráfico de vías principales (data3d/exposicion_trafico.js) y el punto del cruce.
   ATROPELLOS (ind(s).atropellos): la misma regla del índice de atropellos (encabezado): cada parche ocupado por una especie que cruza vías emite un dispersante
   por semana que va a otro parche con el núcleo de dispersión de su grupo; muere al cruzar con probabilidad 1 − e^(−c·Q·tráfico) (Hels y Buchwald 2001,
   c = 1,3·10⁻⁴ por veh/día; Q = flujo de vías principales que corta la línea entre los dos parches). Especies: las terrestres de la red (rana, culebra, curí,
   lagartija, comadreja, rata, caracol) y [SUP] las aves de humedal y junco (vuelo bajo) con 20 % de esa probabilidad. Las muertes esperadas se acumulan por
   especie × par de parches; cada vez que una suma llega a 1 se registra UN atropello en el punto del cruce (determinista con la semilla, sin azar extra).
   Sin descuentos por escenario: se usa la exposición vial calculada. Una reducción adicional requiere una ruta o mitigación calibrada. */
const ATR = {"VIAS":[["Av. Esperanza",5439,-2885],["Av. Centenario",3977,-1786],["Av. de las Américas",3326,1023],["Av. Primero de Mayo",2201,2427],["Av. Boyacá",3492,603],["Av. Batallon Caldas",5498,3677],["Av. Ciudad de Cali",963,242],["Calle 41 Sur",1362,2280],["Carrera 80",1556,885],["Av. Agoberto Mejía Cifuentes",-85,2347],["Av. Calle 17",3394,-2466],["Av. Villavicencio",810,3224],["Av. Colon",5187,6],["Av. Agoberto Mejía",1487,988],["Av. Ciudad Montes",5173,1971],["Av. Fucha",5611,3553],["Av. de la Constitución",5229,-99],["Av. Ferrocarril de Occidente",4080,-3083],["Calle 26 Sur",2267,1542],["Calle 38C Sur",1328,1657],["Carrera 78K",1910,1492],["Calle 65 Sur",-1644,3879],["Calle 63 Sur",-1491,3879],["Av. Manuel Cepeda Vargas",1807,521],["Av. Bosa",-1676,2782],["Av. Carrera 50",5506,3661],["Carrera 72",2874,3912],["Av. Ciudad de Villavicencio",186,1893],["Av. el Tintal",-152,180],["Av. Alsacia",3178,-1319],["Av. Guayacanes",4170,-444],["Av. 68",4841,1992],["Av. del Congreso Eucarístico",4474,3369]],"VIA_P":[[6,472],[13,421],[30,673],[30,318],[28,772],[1,561],[4,376],[9,86],[6,305],[2,223],[28,937],[14,266],[6,133],[6,492],[30,695],[2,338],[28,458],[31,175],[4,88],[28,880],[4,275],[4,87],[2,493],[4,766],[9,160],[9,338],[4,103],[27,143],[30,286],[30,35],[30,77],[2,135],[30,633],[2,685],[29,267],[6,817],[30,113],[31,530],[23,357],[18,182],[18,146],[6,88],[28,158],[18,150],[6,178],[3,113],[4,58],[20,124],[4,478],[28,3],[28,208],[28,651],[13,34],[28,450],[28,661],[3,372],[6,281],[27,17],[28,1035],[9,1],[28,17],[28,869],[28,1436],[28,611],[6,163],[6,236],[3,126],[9,370],[6,376],[30,243],[13,331]],"CRUCES":[[0,1,23,1591,371],[0,5,28,2154,-1605],[0,6,2,2945,939],[0,7,13,1462,728],[0,9,4,3480,438],[0,11,4,3437,736],[0,12,6,1659,-352],[0,19,28,608,-353],[0,26,2,2617,954],[0,27,23,1592,375],[0,34,30,3496,-1100],[0,39,2,2567,950],[0,40,2,2252,804],[0,41,6,1978,-638],[0,43,23,1916,629],[0,44,6,1684,-374],[0,47,2,1889,930],[0,50,6,1422,-162],[0,52,9,1483,757],[0,53,6,1689,-394],[0,56,23,1554,296],[0,58,28,857,-572],[0,60,6,1171,60],[0,61,28,601,-347],[0,62,28,909,-655],[0,63,28,416,-184],[0,70,23,1605,404],[1,2,23,1702,417],[1,4,28,-475,336],[1,12,6,1343,-52],[1,14,23,1709,424],[1,15,2,1809,857],[1,16,27,-454,791],[1,19,28,-59,162],[1,22,9,1503,816],[1,23,23,1800,514],[1,32,23,1713,427],[1,33,23,1840,655],[1,35,23,1750,465],[1,38,13,1546,559],[1,41,23,1425,92],[1,42,23,1415,-55],[1,44,6,1308,-27],[1,49,6,789,408],[1,50,6,762,464],[1,51,28,1064,-794],[1,53,6,741,454],[1,54,28,811,-527],[1,58,28,201,-19],[1,60,6,271,862],[1,61,28,-63,163],[1,62,28,159,-10],[1,63,28,-236,235],[1,64,27,-215,1255],[2,5,29,2516,-1675],[2,6,4,3425,858],[2,12,6,1777,-458],[2,13,1,3971,-1792],[2,26,2,3099,953],[2,34,30,3524,-1080],[2,37,4,3512,481],[2,39,2,3011,945],[2,40,2,2517,901],[2,43,23,2083,787],[2,47,2,2269,810],[2,49,6,1904,-591],[2,50,6,1686,-375],[2,54,6,2249,-911],[2,70,23,1733,448],[3,12,4,3660,-23],[3,39,2,3560,1013],[3,40,4,3459,556],[3,43,2,2495,899],[3,44,4,3664,-31],[4,7,6,78,1022],[4,8,28,-1085,520],[4,25,6,-994,1563],[4,27,28,-884,464],[4,44,28,638,-403],[4,50,28,428,-216],[4,52,6,152,963],[4,56,28,-663,394],[4,59,6,-418,1308],[4,60,28,-564,349],[4,64,28,-1113,528],[4,65,28,-1116,529],[4,67,6,-1060,1620],[4,68,28,-1305,580],[4,70,28,-434,322],[5,14,6,2671,-1321],[5,20,29,2942,-1438],[5,22,6,2336,-992],[5,23,6,2549,-1204],[5,29,6,3006,-1613],[5,32,29,2555,-1655],[5,33,6,2462,-1098],[5,35,6,2498,-1154],[5,36,29,2831,-1540],[5,38,6,2069,-743],[5,41,28,2066,-1565],[5,42,28,2151,-1624],[6,14,4,3424,861],[6,15,4,3369,1415],[6,22,2,3001,1008],[6,23,2,3347,993],[6,32,4,3433,778],[6,33,2,3207,1020],[6,35,2,3298,987],[6,38,2,2790,985],[7,12,23,1381,-37],[7,15,18,1780,1104],[7,19,6,269,864],[7,22,18,1647,986],[7,23,23,1880,695],[7,33,2,1778,922],[7,35,23,1824,639],[7,38,13,1485,812],[7,41,23,1492,179],[7,44,23,1367,-51],[7,49,6,802,425],[7,50,6,767,459],[7,53,6,740,455],[7,58,28,138,24],[7,60,6,126,1014],[7,61,6,267,866],[7,63,6,195,927],[7,64,27,-87,1477],[8,10,28,-1555,692],[8,16,28,-1628,716],[8,19,27,-667,401],[8,49,27,-283,1144],[8,50,27,-255,1180],[8,58,28,-464,332],[8,60,6,-647,1401],[8,61,27,-666,403],[8,63,28,-725,416],[8,64,6,-814,1495],[9,15,4,3480,703],[9,22,4,3491,613],[9,33,4,3508,501],[9,38,4,3454,589],[9,40,4,3433,1167],[9,43,4,3403,1063],[10,27,28,-1400,610],[10,50,28,411,-201],[10,56,28,-1076,518],[10,60,28,-590,356],[10,64,28,-1516,638],[10,65,28,-1577,702],[11,15,2,3664,1016],[11,22,4,3462,874],[11,23,4,3517,460],[11,33,4,3477,722],[11,35,4,3511,487],[11,38,4,3421,895],[12,14,6,1771,-452],[12,15,6,1638,-333],[12,20,6,1754,-437],[12,22,6,1637,-333],[12,23,6,1702,-390],[12,27,6,1203,65],[12,28,4,3560,179],[12,29,4,3911,-406],[12,32,6,1777,-458],[12,33,6,1660,-353],[12,34,6,1904,-572],[12,35,6,1708,-395],[12,38,6,1611,-310],[12,39,2,2325,857],[12,40,23,2067,773],[12,43,23,1645,461],[12,47,2,1612,843],[12,52,23,1388,11],[12,56,6,1069,182],[12,59,6,1301,-20],[12,63,28,574,-347],[12,64,27,-384,953],[12,69,4,3678,-55],[12,70,23,1372,-48],[13,14,29,3461,-1147],[13,23,29,3535,-1090],[13,32,10,3982,-1781],[13,35,29,3465,-1144],[13,36,1,3869,-1902],[13,41,29,2999,-1429],[13,42,6,3317,-1890],[14,26,2,3101,953],[14,34,30,3530,-1075],[14,37,4,3511,488],[14,39,2,3013,945],[14,40,2,2521,901],[14,43,23,2087,791],[14,47,2,2276,814],[14,49,6,1910,-577],[14,50,6,1669,-361],[14,54,6,2236,-899],[14,70,23,1740,455],[15,17,4,3428,1216],[15,18,3,3087,2283],[15,26,2,2872,995],[15,28,4,3507,506],[15,30,4,3503,530],[15,31,4,3463,857],[15,37,4,3427,1231],[15,39,2,2835,992],[15,40,2,2579,951],[15,41,6,2006,-664],[15,43,2,2192,980],[15,44,6,1664,-356],[15,45,4,3374,1742],[15,46,3,3079,2281],[15,47,18,2120,1391],[15,48,18,2666,1891],[15,49,6,1480,-185],[15,50,23,1480,73],[15,51,6,1963,-625],[15,52,18,1792,1099],[15,53,6,1634,-330],[15,54,6,1786,-465],[15,55,18,2203,1483],[15,56,9,1505,925],[15,70,2,1843,860],[16,24,6,-977,1549],[16,27,6,-620,1390],[16,50,28,316,-125],[16,56,28,-1344,592],[16,59,6,-737,1436],[16,60,28,-635,369],[16,65,28,-1644,719],[16,70,27,-473,756],[18,22,3,3025,2271],[18,33,2,2875,996],[18,38,18,2809,2022],[19,27,28,-413,314],[19,38,28,471,-233],[19,52,6,343,801],[19,56,28,-251,243],[19,59,6,-171,1202],[19,60,28,-538,341],[19,64,28,-777,419],[19,65,28,-709,411],[19,70,28,-17,141],[20,26,2,3376,995],[20,39,2,3271,982],[20,40,2,2688,916],[20,43,2,2260,806],[20,44,6,1809,-486],[20,50,6,1603,-302],[21,35,30,3893,-843],[21,36,1,4452,-1286],[21,41,30,3546,-1063],[21,42,29,3105,-1363],[22,26,2,2723,972],[22,27,13,1493,974],[22,31,4,3469,801],[22,34,30,3566,-1049],[22,37,4,3389,1219],[22,39,2,2681,965],[22,40,2,2417,889],[22,41,6,1998,-657],[22,43,23,2122,818],[22,44,6,1662,-355],[22,46,3,3020,2270],[22,47,18,2011,1294],[22,48,18,2542,1778],[22,49,6,1493,-198],[22,50,23,1450,17],[22,51,6,1909,-596],[22,52,18,1667,988],[22,53,6,1622,-336],[22,54,6,1754,-454],[22,55,20,1998,1413],[22,56,13,1473,772],[22,59,9,1141,1385],[22,70,9,1525,835],[23,26,2,3017,945],[23,34,30,3566,-1049],[23,37,2,3605,1015],[23,39,2,2946,939],[23,40,2,2522,901],[23,41,6,2040,-696],[23,43,23,2119,816],[23,44,6,1742,-426],[23,47,23,2298,859],[23,49,6,1706,-393],[23,50,6,1486,-192],[23,52,23,1892,707],[23,53,6,1886,-575],[23,54,6,2026,-704],[23,56,9,1566,556],[23,70,23,1823,537],[24,50,6,466,727],[24,60,6,-360,1317],[24,63,6,-406,1304],[24,64,6,-793,1486],[25,60,6,-679,1413],[25,63,6,-795,1459],[25,64,6,-881,1520],[26,32,2,3128,956],[26,33,2,2920,1000],[26,35,2,2952,939],[26,38,2,2455,940],[27,38,13,1462,666],[27,44,6,1135,124],[27,49,6,386,764],[27,50,6,414,771],[27,58,28,-146,194],[27,60,6,-223,1229],[27,61,28,-414,315],[27,63,6,-220,1227],[27,64,6,-693,1446],[28,34,4,4038,-464],[28,40,4,3422,883],[28,43,2,2830,928],[28,44,4,3566,166],[29,39,2,3518,1010],[29,40,4,3519,299],[30,40,4,3452,972],[31,33,4,3485,661],[31,38,4,3429,810],[31,40,4,3415,1353],[31,43,4,3382,1288],[32,34,30,3534,-1072],[32,39,2,3038,947],[32,40,2,2533,902],[32,43,23,2094,796],[32,47,2,2288,826],[32,49,6,1929,-595],[32,50,6,1683,-373],[32,54,6,2265,-927],[32,70,23,1744,458],[33,34,30,3583,-1038],[33,37,4,3443,1067],[33,39,2,2864,995],[33,40,2,2523,901],[33,41,6,2017,-674],[33,43,23,2175,839],[33,44,6,1691,-380],[33,46,2,2872,995],[33,47,20,2251,1027],[33,48,18,2652,1878],[33,49,6,1564,-266],[33,50,23,1411,-68],[33,52,2,1795,924],[33,53,6,1723,-426],[33,54,6,1867,-558],[33,56,9,1483,756],[33,70,23,1856,671],[34,35,30,3541,-1067],[34,36,29,3296,-1256],[34,38,30,3518,-1084],[34,42,30,3145,-1321],[34,44,6,1989,-649],[34,49,6,2282,-924],[34,51,6,2808,-1453],[34,54,6,2699,-1348],[35,37,4,3463,865],[35,39,2,2882,933],[35,40,2,2473,897],[35,43,23,2080,784],[35,44,6,1749,-432],[35,47,23,2215,844],[35,49,6,1724,-410],[35,50,6,1511,-217],[35,52,23,1839,654],[35,53,6,1891,-580],[35,54,6,2019,-697],[35,56,23,1628,440],[35,70,23,1775,489],[36,40,2,2489,898],[36,43,23,2033,744],[36,51,28,2045,-1529],[36,53,28,1495,-1141],[37,38,2,2986,1006],[38,39,2,2422,937],[38,40,23,2187,840],[38,41,6,1958,-621],[38,42,6,2084,-737],[38,43,23,1889,704],[38,44,6,1628,-324],[38,46,18,2813,2025],[38,47,18,1834,1137],[38,48,18,2296,1568],[38,49,6,1432,-171],[38,50,23,1387,0],[38,51,6,1741,-442],[38,52,13,1494,842],[38,53,6,1531,-259],[38,54,28,1223,-926],[38,55,20,1573,1862],[38,56,23,1626,438],[38,57,19,1375,1686],[38,58,28,736,-461],[38,59,13,1470,761],[38,60,6,924,280],[38,61,28,466,-228],[38,63,28,272,-70],[38,70,13,1462,667],[39,41,2,2604,908],[39,44,2,2343,865],[39,69,2,3586,1014],[40,41,2,2242,804],[40,42,6,2185,-833],[40,44,23,2077,782],[40,49,13,1632,468],[40,50,9,1542,580],[40,53,23,1537,175],[40,69,4,3457,572],[41,43,23,1828,542],[41,47,23,1816,632],[41,52,23,1514,219],[41,56,23,1363,-53],[41,60,28,-2,131],[41,63,28,780,-529],[41,70,23,1459,132],[42,43,23,1859,573],[42,51,28,1944,-1481],[42,70,23,1449,15],[43,44,23,1646,462],[43,49,6,1165,98],[43,50,6,1042,205],[43,53,6,1211,58],[43,54,6,1311,-65],[43,60,6,431,756],[43,63,6,603,582],[43,64,27,-178,1311],[43,69,2,2498,899],[44,47,2,1611,843],[44,51,28,1379,-1072],[44,52,23,1384,-32],[44,56,6,993,248],[44,63,28,615,-383],[44,69,4,3683,-64],[44,70,6,1387,-137],[47,49,9,1398,1089],[47,50,9,1348,1145],[47,60,6,240,917],[47,64,9,810,1728],[49,52,6,862,369],[49,56,6,424,732],[49,59,6,487,709],[49,60,28,-440,307],[49,64,27,-438,820],[49,65,27,-322,1071],[49,70,6,864,337],[50,52,6,814,414],[50,56,6,449,711],[50,59,6,514,687],[50,60,28,-9,135],[50,63,28,431,-218],[50,64,27,-410,875],[50,65,27,-296,1120],[50,70,6,824,405],[51,60,28,-496,327],[51,70,6,999,210],[52,53,6,814,385],[52,58,28,187,-10],[52,60,6,181,968],[52,61,6,341,803],[52,63,6,264,868],[52,64,27,-103,1432],[53,56,28,554,-307],[53,60,28,-495,326],[53,64,28,-134,174],[53,70,6,828,371],[54,56,28,600,-346],[54,60,28,-501,328],[54,70,28,859,-574],[55,64,9,184,2136],[56,58,28,-1,131],[56,60,6,58,1039],[56,61,28,-253,244],[56,62,28,-72,152],[56,63,28,-383,303],[56,64,6,-301,1293],[57,60,9,342,2034],[57,64,9,53,2222],[58,60,28,-527,337],[58,64,28,-631,368],[58,65,28,-518,350],[58,70,28,248,-52],[59,60,27,-216,1283],[59,61,6,-171,1203],[59,63,27,-244,1201],[59,64,6,-732,1462],[60,61,28,-538,341],[60,62,28,-533,339],[60,63,28,-544,343],[60,64,27,-595,535],[60,65,6,-731,1434],[60,66,6,-407,1336],[60,67,6,-732,1434],[60,68,6,-938,1520],[60,70,6,310,829],[61,64,28,-775,418],[61,65,28,-707,410],[61,70,28,-20,143],[62,64,28,-759,413],[62,70,28,214,-47],[63,64,28,-807,441],[63,65,28,-757,426],[63,67,6,-862,1486],[63,68,6,-1113,1666],[63,70,28,-204,218],[64,65,6,-845,1506],[64,66,9,-376,2563],[64,67,6,-900,1527],[64,68,6,-979,1582],[64,70,27,-216,1255]]};
const ATR_CR = new Map(ATR.CRUCES.map(([p, q, v, x, z]) => [p * NP + q, [v, x, z]]));
export const ATROP_SUP = { AVE_BAJO: 0.2, PROP: 0.7, CORREDOR: 0.5, LISTA: 200, AVISO_CADA: 26, HECHOS: 60 };
const LUGAR_C = new Map(), ES_MOD_P = PARCHES.map(p => /^mod/.test(p.t));
function lugarDe(x, z) { const key = Math.round(x / 10) + '|' + Math.round(z / 10); let r = LUGAR_C.get(key); if (r == null) { r = lugarDe0(x, z); if (LUGAR_C.size < 20000) LUGAR_C.set(key, r); } return r; } /* con caché por celda de 10 m */
function lugarDe0(x, z) { /* nombre del lugar: parque o humedal a 500 m o menos; si no, la vía con nombre a 200 m; si no, el sector */
  let bp = -1, bd = 500; for (let p = 0; p < NP; p++) { if (ES_MOD_P[p]) continue; const d = Math.hypot(PARCHES[p].x - x, PARCHES[p].z - z) - RP_M[p]; if (d < bd) { bd = d; bp = p; } } if (bp >= 0) return PARCHES[bp].n;
  let bv = -1, dv = 250; for (let k = 0; k < ATR.VIAS.length; k++) { const d = Math.hypot(ATR.VIAS[k][1] - x, ATR.VIAS[k][2] - z); if (d < dv) { dv = d; bv = k; } } if (bv >= 0) return ATR.VIAS[bv][0];
  let bs = 0, ds = Infinity; GOB_BARRIOS.forEach((B, b) => { const d = Math.hypot(B.x - x, B.z - z); if (d < ds) { ds = d; bs = b; } }); return GOB_BARRIOS[bs].n; }
const VIA_MAX = (() => { /* la vía principal más cargada de la grabación: el parche con más flujo en su vía principal más cercana y el nombre de esa vía */
  let bp = 0; for (let p = 0; p < NP; p++) if (EXPO.parches[p] && EXPO.parches[p][1] > (EXPO.parches[bp] ? EXPO.parches[bp][1] : 0)) bp = p;
  const v = ATR.VIA_P[bp], V_ = ATR.VIAS[v[0]]; return { n: V_[0], x: V_[1], z: V_[2], veh: EXPO.parches[bp][1] }; })();
const PARQUE_MAX = (() => { let b = -1; PARCHES.forEach((P, p) => { if (P.t === 'parque' && (b < 0 || P.ha > PARCHES[b].ha)) b = p; }); return b; })();
function atropellosIni(E) { const esp = []; for (let i = 0; i < RED.NFA; i++) { const g = RED.FAUNA[i].grupo; const f = RED.TER[i] ? 1 : (g === 'agua' || g === 'junco') ? ATROP_SUP.AVE_BAJO : 0; if (f) esp.push([i, f]); }
  return { esp, acc: new Float32Array(esp.length * NP * NP), total: 0, porAño: new Array(Math.ceil(SEMANAS_FIN / V.AÑO)).fill(0), lista: [], nuevos: [], ultAviso: -999, ultHecho: -999 }; }
function atropellosPaso(E, trafico) {
  const A = E.atr, s = E.s, occ = s.occ, XQ = s.red.XQ, t = s.t; A.nuevos = []; if (!XQ) return;
  const fP = 1; // sin reducción automática: exposición calculada en cada cruce
  for (let k = 0; k < A.esp.length; k++) { const [i, f] = A.esp[k], W = PRE.DEST[RED.FAUNA[i].grupo], b = i * NP, base = k * NP * NP;
    for (let q = 0; q < NP; q++) { if (!occ[b + q]) continue; for (let p = 0; p < NP; p++) { const w = W[q * NP + p]; if (!w) continue; const m = 1 - XQ[p * NP + q] * S0de(E)[p * NP + q]; if (m <= 1e-6) continue;
      const j = base + q * NP + p; A.acc[j] += w * m * f * fP;
      if (A.acc[j] >= 1) { A.acc[j] -= 1; const a = Math.min(p, q), c = Math.max(p, q), cr = ATR_CR.get(a * NP + c), veh = ((EXPO.cruce[q * NP + p] || 0) + (EXPO.cruce[p * NP + q] || 0)) / 2 * trafico;
        const via = cr ? ATR.VIAS[cr[0]][0] : 'vía principal', x = cr ? cr[1] : (PARCHES[p].x + PARCHES[q].x) / 2, z = cr ? cr[2] : (PARCHES[p].z + PARCHES[q].z) / 2;
        const ev = { sem: t + 1, especie: RED.FAUNA[i].id, nombre: RED.FAUNA[i].n, x: Math.round(x), z: Math.round(z), via, vehDia: Math.round(veh), de: PARCHES[q].n, a: PARCHES[p].n,
          causa: `${nf(veh)} veh/día en las vías que cruza (${via})`.slice(0, 60), lugar: cr ? via : lugarDe(x, z) };
        A.nuevos.push(ev); A.lista.push(ev); A.total++; A.porAño[Math.min(A.porAño.length - 1, Math.floor(t / V.AÑO))]++; } } } }
  if (A.lista.length > ATROP_SUP.LISTA) A.lista.splice(0, A.lista.length - ATROP_SUP.LISTA); }
function causaCorta(texto) { const c = String(texto).split(/\.\s|;\s|:\s/)[0].replace(/\.$/, '').trim(); return c.length <= 60 ? c : c.slice(0, 57).replace(/\s+\S*$/, '') + '…'; }

/* ---------- AVISOS (ind(s).eventos) ----------
   Cada semana se revisan umbrales del modelo; un aviso sale UNA vez por umbral (clave familia:nivel). Mismo tipo: espera de ENFRIA semanas, salvo que
   sea un nivel más alto de la misma familia (se agrava). Como mucho POR_SEM avisos por semana; los avisos de calendario (metro, cierre de Corabastos,
   cierre de vía, etapas del plan) esperan su turno hasta 26 semanas. Todo sale del estado del modelo: es determinista con la semilla.
   capa = lo que la interfaz resalta: 'especies' | 'ruido' | 'trafico'. signo +1 bueno, −1 malo. */
export const AVISOS_SUP = { ENFRIA: 52, ENFRIA_ESP: 520, ENFRIA_EXT: 104, POR_SEM: 2 };
const CAPA = { especies: 'especies', polinizadores: 'especies', huertas: 'especies', residuos: 'especies', corabastos: 'especies', ruido: 'ruido', obra: 'ruido', trafico: 'trafico', metro: 'trafico', comida: 'trafico', suelo: 'trafico', circular: 'especies' };
const nf = (v, d = 0) => { const a = Math.abs(v).toFixed(d).split('.'); return (v < 0 ? '−' : '') + a[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (a[1] ? ',' + a[1] : ''); };
const yLista = (a) => a.length <= 1 ? (a[0] || '') : a.slice(0, -1).join(', ') + ' y ' + a[a.length - 1];
const min1 = (n) => n.charAt(0).toLowerCase() + n.slice(1);
const PROPIOS = /^(Humedal|Parque|Bosque|Huerta|Instituto)/;
function avisos(E, x) {
  const st = E.evs, sem = x.sem, s = E.s, o = E.o, NFA = RED.NFA, cand = [];
  const add = (fam, nivel, tipo, titulo, texto, xz, signo, especies, once, causa, lugar) => cand.push({ fam, nivel, tipo, titulo, texto, x: xz[0], z: xz[1], signo, especies: especies || [], once: !!once,
    causa: (causa || causaCorta(texto)).slice(0, 60), lugar: lugar || lugarDe(xz[0], xz[1]) });
  const enZona = (z) => GOB_BARRIOS.find(B => B.zonas.includes(z)) || GOB_BARRIOS[0], SEC_MAX = GOB_BARRIOS[GOB_POB.indexOf(Math.max(...GOB_POB))];
  const viaTr = { ...VIA_MAX, veh: VIA_MAX.veh * x.trafico }; /* la vía principal más cargada, con el tráfico de esta semana */
  const umbral = (v, niveles) => { let k = 0; for (let j = 0; j < niveles.length; j++) if (v >= niveles[j]) k = j + 1; return k; };
  const nombre = (i) => RED.FAUNA[i].n, RL = E.ref.listo, RO = E.ref.occ;
  // parche con más pérdida (o ganancia) de especies frente al inicio, con promedio móvil
  const parcheCambio = (signo) => { let best = -1, bv = 0; for (let p = 0; p < NP; p++) { let d = 0; for (let i = 0; i < NFA; i++) d += (E.emaO[i * NP + p] - RO[i * NP + p]); d *= signo; if (d > bv) { bv = d; best = p; } } return best; };
  const espParche = (p, signo) => { const r = []; for (let i = 0; i < NFA; i++) { const k = i * NP + p; if (signo < 0 ? (RO[k] > 0.7 && E.emaO[k] < 0.3) : (RO[k] < 0.3 && E.emaO[k] > 0.7)) r.push(i); } return r; };
  const motivo = (p, sp) => { const c = {}; let m = 5, mv = 0; for (const i of sp) { const k = s.red.mot[i * NP + p] || 5; c[k] = (c[k] || 0) + 1; if (c[k] > mv) { mv = c[k]; m = k; } } return MOTIVOS[m]; };

  // 1 · FAUNA en toda Kennedy: ocupación de los parches frente al inicio (promedio móvil de 13 semanas)
  const dP = RL ? (E.emaP / Math.max(1, E.ref.pares) - 1) * 100 : 0;
  if (dP < 0) { const k = umbral(-dP, [10, 25, 50]); if (k) { const p = parcheCambio(-1), sp = p >= 0 ? espParche(p, -1) : [], nm = ['10', '25', '50'][k - 1];
    add('fauna-', k, 'especies', `La fauna ocupa ${nm} % menos lugares que en el año 1`, `Las especies ocupan ${nf(E.emaP)} pares especie–corredor verde frente a ${nf(E.ref.pares)} en el año 1.` + (p >= 0 ? ` Donde más se nota es en ${PARCHES[p].n}${sp.length ? ' (se fueron ' + yLista(sp.slice(0, 4).map(i => min1(nombre(i)))) + '; causa principal: ' + motivo(p, sp) + ')' : ''}.` : ''),
      p >= 0 ? [PARCHES[p].x, PARCHES[p].z] : KEN_XZ, -1, sp.slice(0, 6).map(nombre)); } }
  else { const k = umbral(dP, [10, 25, 50]); if (k) { const p = parcheCambio(1), sp = p >= 0 ? espParche(p, 1) : [], nm = ['10', '25', '50'][k - 1];
    add('fauna+', k, 'especies', `La fauna ocupa ${nm} % más lugares que en el año 1`, `Las especies ocupan ${nf(E.emaP)} pares especie–corredor verde frente a ${nf(E.ref.pares)} en el año 1.` + (p >= 0 ? ` Donde más llegan es a ${PARCHES[p].n}${sp.length ? ': ' + yLista(sp.slice(0, 4).map(i => min1(nombre(i)))) : ''}.` : ''),
      p >= 0 ? [PARCHES[p].x, PARCHES[p].z] : KEN_XZ, 1, sp.slice(0, 6).map(nombre)); } }
  // 2 · una especie desaparece de toda Kennedy (calendario: espera turno)
  if (E.ev.length) { const e0 = E.ev[0], ns = E.ev.map(e => min1(e.nombre));
    add('ext-' + E.ev.map(e => e.especie).join('-'), 1, 'especies', E.ev.length > 1 ? `${ns.length} especies desaparecen de Kennedy` : `${e0.nombre} desaparece de Kennedy`,
      `${yLista(ns).replace(/^./, c => c.toUpperCase())} ya no ${E.ev.length > 1 ? 'están' : 'está'} en ningún corredor verde de Kennedy. El último lugar fue ${(PARCHES.find(p => p.id === e0.parche) || {}).n || e0.parche}; causa: ${e0.motivo}.`,
      [e0.x, e0.z], -1, E.ev.map(e => e.nombre), true); }
  // 3 · una especie deja un humedal o parque grande (≥ 5 ha) que ocupaba, o llega a un parque donde no estaba (persistente: promedio > 0,9)
  if (RL) for (let p = 0; p < NP; p++) { const P = PARCHES[p]; if (P.ha < 2 && !/^mod/.test(P.t)) continue; for (let i = 0; i < NFA; i++) { const k = i * NP + p;
    if (P.ha >= 5 && RO[k] > 0.8 && E.emaO[k] < 0.1 && (s.red.mot[k] || 5) !== 5) add('salida-' + i + '-' + p, 1, 'especies', `${nombre(i)} deja ${P.n}`, `Vivía ahí en el año 1 y lleva varios meses sin aparecer; causa: ${MOTIVOS[s.red.mot[k] || 5]}.`, [P.x, P.z], -1, [nombre(i)]);
    else if (/^mod/.test(P.t) && RO[k] < 0.1 && E.emaO[k] > 0.9 && (RED.AVE[i] || PRE.POLI.includes(i))) add('llegada-' + i + '-' + p, 1, 'especies', `${nombre(i)} llega a ${P.n}`, `No estaba en el año 1 y ya vive ahí de forma estable${s.q[p] > 0 && /^mod/.test(P.t) ? ': el módulo de huertas se volvió hábitat' : ''}.`, [P.x, P.z], 1, [nombre(i)]); } }
  // 4 · polinizadores
  if (RL && E.ref.poli > 0) { const r = x.poliniz / E.ref.poli, k = umbral(r, [1.5, 2]); let pp = 0, pd = 0, pn = 0, pdn = 0; for (let p = 0; p < NP; p++) { let d = 0; for (const i of PRE.POLI) d += E.emaO[i * NP + p] - RO[i * NP + p]; if (d > pd) { pd = d; pp = p; } if (d < pdn) { pdn = d; pn = p; } }
    if (k) add('poli+', k, 'polinizadores', ['Los polinizadores aumentan a la mitad', 'Los polinizadores se duplican'][k - 1],
      `Abejas, colibríes y cucaracheros ocupan ${nf(x.poliniz)} pares especie–corredor verde (en el año 1 ${nf(E.ref.poli)}), gracias a las huertas y parques con flor; donde más llegan es a ${PARCHES[pp].n}.`, [PARCHES[pp].x, PARCHES[pp].z], 1, PRE.POLI.map(nombre), false, `+${nf(pd, 1)} especies polinizadoras en ${PARCHES[pp].n}`, PARCHES[pp].n);
    const kb = umbral(1 / Math.max(0.01, r), [1 / 0.75, 2]); if (kb) add('poli-', kb, 'polinizadores', kb === 1 ? 'Los polinizadores caen una cuarta parte' : 'Los polinizadores caen a la mitad',
      `Ocupan ${nf(x.poliniz)} pares especie–corredor verde (en el año 1 ${nf(E.ref.poli)}); donde más se pierden es en ${PARCHES[pn].n} (causa: ${MOTIVOS[s.red.mot[PRE.POLI[0] * NP + pn] || 5]}).`, [PARCHES[pn].x, PARCHES[pn].z], -1, PRE.POLI.map(nombre), false, `${nf(-pdn, 1)} especies polinizadoras menos en ${PARCHES[pn].n}`, PARCHES[pn].n); }
  // 5 · huertas (hitos) y techos montados
  { const h0 = st.h0 || 1, k = umbral(x.huertas / h0, [2, 10]);
    if (k) { let sb = SEC_MAX, mb = -1; if (s.e === 'C') GOB_BARRIOS.forEach(B => { const n = MOD_P.filter(p => s.q[p] > 0 && Math.hypot(PARCHES[p].x - B.x, PARCHES[p].z - B.z) < 1500).length; if (n > mb) { mb = n; sb = B; } });
      add('huertas', k, 'huertas', `Kennedy ya tiene ${nf(x.huertas)} huertas: más en ${sb.n}`, `Son ${['el doble', 'diez veces'][k - 1]} de las de hoy (${nf(h0)}); producen ${nf(o.prod * V.AÑO / 1000)} t de comida al año${mb > 0 ? '; ' + sb.n + ' tiene ' + mb + ' módulos de huertas activos' : ''}.`, [sb.x, sb.z], 1, [], false, `${nf(o.prod * V.AÑO / 1000)} t/año de comida de huertas`, sb.n); }
    if (E.techos && s.supF >= 1) add('techos', 1, 'huertas', 'Todos los techos con huerta ya están montados', `${nf(E.techos.m2)} m² de cubiertas y balcones producen y son hábitat para polinizadores y aves.`, KEN_XZ, 1, [], true); }
  // 6 · comida
  { const z = o.zArg >= 0 ? ZONAS_XZ[o.zArg] : KEN_XZ, k = umbral(1 - x.comidaMin, [0.1, 0.2]);
    if (k) { st.short = true; add('comida', k, 'comida', k === 1 ? 'Empieza a faltar comida en un barrio' : 'Falta comida en Kennedy', `La zona peor servida recibe ${nf(x.comidaMin * 100)} % de lo que necesita${o.cierre ? ' (' + o.cierre.via + ' cerrada)' : ''}; ${nf(o.nBajo)} zonas reciben menos del 80 %.`, z, -1, []); }
    else if (st.short && x.comidaMin >= 0.97) { st.short = false; st.fired.delete('comida:1'); st.fired.delete('comida:2'); delete st.lvl.comida;
      add('comida-ok-' + sem, 1, 'comida', 'Vuelve a llegar la comida', `Todas las zonas reciben otra vez 97 % o más de lo que necesitan.`, z, 1, []); } }
  // 7 · residuos
  { const k = umbral(x.residuos, [0.7, 1]); if (k) { const est = x.estaciones && x.estaciones.length > 1 ? x.estaciones.slice(1).reduce((a, e) => e.acumulado_t > a.acumulado_t ? e : a) : null, L = est ? { n: est.n, x: est.x, z: est.z } : { n: SEC_MAX.n, x: SEC_MAX.x, z: SEC_MAX.z };
    add('residuos', k, 'residuos', (k === 1 ? 'Se acumulan los orgánicos en ' : 'Los orgánicos desbordan el almacenamiento en ') + L.n, `Los orgánicos sin tratar llegan al ${nf(x.residuos * 100)} % de la capacidad (${nf(o.pend / 1000)} t pendientes); con más basura aumentan las ratas.`, [L.x, L.z], -1, ['Rata'], false, `${nf(o.pend / 1000)} t de orgánicos sin tratar`, L.n); } }
  // 8 · ruido y congestión de toda Kennedy
  { const d = x.ruidoDb - x.ruidoDb0, k = umbral(d, [1, 2, 3]);
    if (k) add('ruido+', k, 'ruido', `El ruido sube ${k} dB en la ${viaTr.n}`, `Por la ${viaTr.n} pasan ${nf(viaTr.veh)} vehículos/día (hoy ${nf(VIA_MAX.veh)}). El promedio de las calles pasa de ${nf(x.ruidoDb0, 1)} a ${nf(x.ruidoDb, 1)} dB; ${nf(x.callesRuidosas)} % de las calles son ruidosas (65 dB o más).${k === 3 ? ' +3 dB es el doble de energía sonora.' : ''}`, [viaTr.x, viaTr.z], -1, [], false, `${nf(viaTr.veh)} vehículos/día en la ${viaTr.n}`, viaTr.n);
    const kb = umbral(-d, [1, 2]); if (kb) add('ruido-', kb, 'ruido', `El ruido baja ${kb} dB en la ${viaTr.n}`, `Por la ${viaTr.n} pasan ${nf(viaTr.veh)} vehículos/día (hoy ${nf(VIA_MAX.veh)}); el promedio de las calles pasa de ${nf(x.ruidoDb0, 1)} a ${nf(x.ruidoDb, 1)} dB.`, [viaTr.x, viaTr.z], 1, [], false, `${nf(viaTr.veh)} vehículos/día en la ${viaTr.n}`, viaTr.n);
    const rc = x.congestion / TOMTOM.congestion, kc = umbral(rc, [1.25, 1.5, 2]);
    if (kc) add('cong+', kc, 'trafico', ['La congestión sube 25 %', 'La congestión sube 50 %', 'La congestión se duplica'][kc - 1] + ' · ' + viaTr.n,
      `Recorrer 10 km toma ${nf(x.tiempo10km, 1)} min (hoy ${nf(TOMTOM.min10km, 1)} min en 2025); congestión ${nf(x.congestion)} %. Circulan ${nf((x.trafico - 1) * 100)} % más vehículos que hoy; la vía más cargada es la ${viaTr.n}, con ${nf(viaTr.veh)} vehículos/día.`, [viaTr.x, viaTr.z], -1, [], false, `${nf(viaTr.veh)} vehículos/día en la ${viaTr.n}`, viaTr.n);
    const kd = umbral(1 / rc, [1 / 0.9]); if (kd) add('cong-', kd, 'trafico', 'La congestión baja 10 % · ' + viaTr.n, `Recorrer 10 km toma ${nf(x.tiempo10km, 1)} min (hoy ${nf(TOMTOM.min10km, 1)} min); por la ${viaTr.n} pasan ${nf(viaTr.veh)} vehículos/día.`, [viaTr.x, viaTr.z], 1, [], false, `${nf(viaTr.veh)} vehículos/día en la ${viaTr.n}`, viaTr.n); }
  // 9 · calendario: metro, Corabastos, cierre de vía, desmonte de bodegas
  // metro (en todas las simulaciones): obra, estaciones, apertura, menos carros, peatones
  { const ES = METRO_SUP.EST, CK = [ES[1].x, ES[1].z], MX = x.metro;
    if (s.t === 0) add('metro-obra', 1, 'metro', 'El metro sigue en obra en Kennedy', `La Línea 1 va en ${nf(METRO_SUP.AVANCE, 1)} % de avance: el viaducto ya está levantado y faltan las estaciones; empieza a operar en la semana ${E.metro.desde}.`, CK, 1, [], true, `obra de la Línea 1 al ${nf(METRO_SUP.AVANCE, 1)} %`, 'Estación ' + ES[1].n);
    if (s.t === METRO_SUP.SEM_EST && E.metro.desde > METRO_SUP.SEM_EST) add('metro-est', 1, 'metro', 'Quedan terminadas las estaciones del metro', `${ES.map(e => e.n).join(', ')}: cinco estaciones en Kennedy listas para las pruebas.`, [ES[2].x, ES[2].z], 1, [], true, 'cinco estaciones terminadas', 'Estación ' + ES[2].n);
    if (s.t === E.metro.desde) add('metro', 1, 'metro', 'El metro empieza a operar', `Desde esta semana la Línea 1 lleva pasajeros por Kennedy; a 800 m del eje circularán ${nf(E.metro.red * 100)} % menos vehículos.`, CK, 1, [], true, 'la Línea 1 empieza a llevar pasajeros', 'Estación ' + ES[1].n);
    if (s.t === E.metro.desde + 26) add('metro-carros', 1, 'metro', 'Menos carros junto al metro', `A 800 m del eje circulan ${nf(E.metro.red * 100)} % menos vehículos: el índice de tráfico de Kennedy queda en ${nf(x.trafico, 2)} y el ruido promedio en ${nf(x.ruidoDb, 1)} dB.`, CK, 1, [], true, `${nf(E.metro.red * 100)} % menos vehículos a 800 m del metro`, 'Estación ' + ES[1].n);
    if (s.t === E.metro.desde + 52) { let k = 0; MX.estaciones.forEach((e, i) => { if (e.peatonesDia > MX.estaciones[k].peatonesDia) k = i; }); const e = MX.estaciones[k];
      add('metro-peatones', 1, 'metro', `Más gente camina alrededor de la estación ${e.n}`, `Unas ${nf(e.peatonesDia)} personas al día llegan a pie a la estación: más comercio de barrio y más vida en la calle a su alrededor.`, [e.x, e.z], 1, [], true, `${nf(e.peatonesDia)} personas/día llegan a pie`, 'Estación ' + e.n); } }
  // economía circular
  { const C = x.circular, kc = umbral(C.indice, [0.1, 0.25, 0.5]);
    if (kc) add('circular', kc, 'circular', `Se cierra el ciclo: ${nf(C.indice * 100)} % de los orgánicos vuelve como abono`, `De ${nf(C.organicos_t_dia)} t/día de orgánicos de Kennedy, ${nf(C.compostado_t_dia, 1)} t/día se compostan y vuelven a las huertas; las huertas producen ${nf(C.comidaLocal_t_dia, 1)} t/día de comida.`, s.e === 'B' || s.e === 'C' ? BAV_XZ : [DJ_XZ[0], DJ_XZ[1]], 1, [], false, `${nf(C.compostado_t_dia, 1)} t/día de orgánicos compostados`); }
  // especulación del suelo
  { const U = x.especulacion; let zb = -1; for (const z of Z_SUELO) if (zb < 0 || E.suelo.idx[z] > E.suelo.idx[zb]) zb = z;
    const im = zb >= 0 ? E.suelo.idx[zb] : 1, ks = umbral(im, [1.1, 1.2]);
    if (ks && zb >= 0) { const xz = [ZONAS[zb][0], ZONAS[zb][1]]; let en = null, dm = Infinity; for (const e of METRO_SUP.EST) { const d = Math.hypot(e.x - xz[0], e.z - xz[1]); if (d < dm) { dm = d; en = e; } }
      const junto = E.plan && Z_PLAN[zb] >= Z_EST[zb] ? 'el predio de Bavaria' : 'la estación ' + en.n;
      add('suelo', ks, 'suelo', `El suelo junto a ${junto} sube más de ${ks === 1 ? 10 : 20} %`, `Los predios más cercanos valen ${nf((im - 1) * 100)} % más que hoy${E.suelo.prot > 0 ? ` (la protección y la captura de plusvalías frenan ${nf(E.suelo.prot * 50)} % del alza)` : ''}; los arriendos suben con ellos.`, xz, -1, [], false, `el suelo vale ${nf((im - 1) * 100)} % más que hoy`, junto === 'el predio de Bavaria' ? 'Predio de Bavaria' : 'Estación ' + en.n); }
    const kr = umbral(U.hogaresRiesgo, [1000, 5000, 10000]);
    if (kr) add('desplaza', kr, 'suelo', `${nf([1000, 5000, 10000][kr - 1])} hogares en riesgo de desplazamiento`, `Con el alza del suelo cerca del metro${E.plan ? ' y del plan parcial' : ''}, ${nf(U.hogaresRiesgo)} hogares que pagan arriendo podrían no alcanzar a pagarlo y tener que irse de Kennedy.`, zb >= 0 ? [ZONAS[zb][0], ZONAS[zb][1]] : KEN_XZ, -1, []); }
  if (E.mod.sinCora != null && s.t === E.mod.sinCora) add('cora-cierra', 1, 'corabastos', 'Corabastos deja de abastecer', 'Corabastos recibe el 94 % de lo que entra a las centrales mayoristas de Bogotá (DANE-SIPSA 2025) y cerca de la mitad de todos los alimentos que entran a la ciudad; desde esta semana solo queda lo que producen las huertas.', CORA_XZ, -1, [], true);
  if (o.cierre && o.cierre.sem === 1 && o.cierre.on) { const cv = ATR.VIAS.find(v => v[0] === o.cierre.via) || [o.cierre.via, KEN_XZ[0], KEN_XZ[1]]; add('cierre-' + sem, 1, 'trafico', `Se cierra la ${o.cierre.via}`, `Cierre de ${o.cierre.dur} semanas: las rutas desde Corabastos se alargan y llega menos comida.`, [cv[1], cv[2]], -1, [], true, `cierre de ${o.cierre.dur} semanas por obra`, o.cierre.via); }
  if (o.cora && o.cora.desm > 0) { const nd = o.cora.desm, tot = o.cora.total || BODEGAS.length, k = nd >= tot ? 2 : 1, b = BODEGAS[nd - 1] || {};
    add('desm', k, 'corabastos', k === 1 ? 'Se desmonta la primera bodega junto a La Vaca' : 'Se desmontaron todas las bodegas junto a La Vaca',
      `${nf(nd)} de ${nf(tot)} bodegas desmontadas: ${nf(o.cora.m2)} m² liberados; ${nf(o.cora.borde)} m² de borde del humedal en restauración (madura en 3 años).`, [b.x || CORA_XZ[0], b.z || CORA_XZ[1]], 1, []); }
  // 9b · basura: ratas, humedales que pierden área, aves del borde de Corabastos
  { const Bs = E.bas, kr = umbral(Bs.ratas, [2, 3]);
    if (kr) add('ratas+', kr, 'residuos', ['Las ratas se duplican cerca de Corabastos', 'Las ratas se triplican cerca de Corabastos'][kr - 1],
      `Hay ${nf(x.basura.acumulada)} t de basura sin recoger alrededor de Corabastos (hoy ${nf(Bs.acum0)} t): se generan ${nf(x.basura.total_t_dia)} t/día en Kennedy y ${nf(x.basura.fraccionSinRecoger * 100)} % no se recoge.`, CORA_XZ, -1, ['Rata']);
    const kb = umbral(1 / Math.max(0.01, Bs.ratas), [1 / 0.75, 2]); if (kb) add('ratas-', kb, 'residuos', kb === 1 ? 'Bajan las ratas cerca de Corabastos' : 'Las ratas caen a la mitad cerca de Corabastos',
      `La basura acumulada alrededor de Corabastos baja a ${nf(x.basura.acumulada)} t (hoy ${nf(Bs.acum0)} t).`, CORA_XZ, 1, ['Rata']);
    for (let k = 0; k < HUM_P.length; k++) { const P = PARCHES[HUM_P[k]], perd = Bs.ha0[k] - Bs.ha[k], kh = umbral(perd, [1, 2]);
      if (kh) add('hum-' + P.id, kh, 'residuos', `${P.n} pierde ${[1, 2][kh - 1]} ha`, `La basura arrojada en su borde rellenó ${nf(perd, 1)} ha: quedan ${nf(Bs.ha[k], 1)} de ${nf(Bs.ha0[k], 1)} ha y su fauna tiene menos hábitat.`, [P.x, P.z], -1, []); }
    if (RL) { let a0 = 0, a1 = 0; const sp = []; for (const [p] of Bs.cerca) for (let i = 0; i < NFA; i++) { if (!RED.AVE[i]) continue; const kk = i * NP + p; a0 += RO[kk]; a1 += E.emaO[kk]; if (RO[kk] > 0.7 && E.emaO[kk] < 0.3) sp.push(i); }
      const da = a0 > 0 ? (1 - a1 / a0) * 100 : 0, ka = umbral(da, [10, 25]);
      if (ka && Bs.ratas > 1.1) add('avesCora', ka, 'especies', 'Las aves dejan el borde de Corabastos', `Las aves ocupan ${nf(da)} % menos lugares a 1 km de Corabastos${sp.length ? ' (se fueron ' + yLista(sp.slice(0, 4).map(i => min1(nombre(i)))) + ')' : ''}: las ratas, ${nf((Bs.ratas - 1) * 100)} % más que hoy, depredan nidos y la basura las espanta.`, CORA_XZ, -1, sp.map(nombre)); } }
  // 9d · estado actual que se degrada: árboles, bordes de humedal invadidos por basura, área funcional
  { const ap = x.arbolesPerdidos || 0, ka = umbral(ap, [0.05, 0.1]);
    if (ka) add('arboles', ka, 'especies', `${PARCHES[PARQUE_MAX].n} y los parques de Kennedy pierden ${ka === 1 ? 5 : 10} % de sus árboles`, `Talas por riesgo y por obras (metro, Av. 68, Primero de Mayo) que se compensan fuera de la localidad: la densidad de árboles de los parques baja de ${nf(E.arb0, 2)} a ${nf(x.arboles, 2)} y los parques pierden calidad como hábitat. Donde más árboles se pierden es en el más grande, ${PARCHES[PARQUE_MAX].n} (${nf(PARCHES[PARQUE_MAX].ha, 1)} ha).`, [PARCHES[PARQUE_MAX].x, PARCHES[PARQUE_MAX].z], -1, [], false, `${nf(ap * 100)} % menos árboles en los parques`, PARCHES[PARQUE_MAX].n);
    { let P = null; for (const Q of E.bas.pts) if (Q.fuente === 'humedal' && (!P || Q.acum / Q.acum0 > P.acum / P.acum0)) P = Q;
      const r = P ? P.acum / P.acum0 : 1, kh = umbral(r, [1.5, 2]), tot = E.bas.pts.filter(Q => Q.fuente === 'humedal').reduce((a, Q) => a + Q.acum, 0);
      if (kh) add('humbas', kh, 'residuos', kh === 1 ? `La basura invade el borde del ${P.nombre}` : 'La basura en los bordes de los humedales se duplica', `Hay ${nf(tot)} t de basura arrojada en los bordes de El Burro, La Vaca y Techo; en el ${P.nombre} llegan ${nf(P.t, 1)} t/día y el humedal queda con ${nf(E.bas.cal[P.hum] * 100)} % de su calidad y ${nf(E.bas.ha[P.hum], 1)} ha.`, [P.x, P.z], -1, []); }
    const kf = umbral(100 - x.humedalFuncional, [10]); if (kf) { let wk = 0; for (let k = 1; k < HUM_P.length; k++) if (E.bas.ha[k] * E.bas.cal[k] / E.bas.ha0[k] < E.bas.ha[wk] * E.bas.cal[wk] / E.bas.ha0[wk]) wk = k; const HP = PARCHES[HUM_P[wk]], wf = E.bas.ha[wk] * E.bas.cal[wk] / E.bas.ha0[wk];
      add('humfun', kf, 'especies', `Los humedales pierden 10 % de su área funcional: el peor es ${HP.n}`, `Entre rellenos y basura en los bordes, El Burro, La Vaca y Techo funcionan como ${nf(x.humedalFuncional)} % de lo que funcionan hoy; ${HP.n} queda en ${nf(wf * 100)} % (${nf(E.bas.ha[wk], 1)} ha). Sus aves y anfibios tienen menos hábitat.`, [HP.x, HP.z], -1, [], false, `${HP.n} al ${nf(wf * 100)} % por basura y rellenos`, HP.n); } }
  // 9e · aviso previo y game over
  { const TIPO_R = { fauna: 'especies', habitat: 'especies', humedal: 'especies', abasto: 'comida', residuos: 'residuos', ruido: 'ruido', trafico: 'trafico' };
    const pF = parcheCambio(-1), XZ_R = { humedal: (() => { const h = HUM_P[1] != null ? HUM_P[1] : HUM_P[0]; return h != null ? [PARCHES[h].x, PARCHES[h].z] : KEN_XZ; })(),
      trafico: [viaTr.x, viaTr.z], ruido: [viaTr.x, viaTr.z], abasto: o.zArg >= 0 ? ZONAS_XZ[o.zArg] : CORA_XZ, residuos: [SEC_MAX.x, SEC_MAX.z], fauna: pF >= 0 ? [PARCHES[pF].x, PARCHES[pF].z] : CORA_XZ, habitat: pF >= 0 ? [PARCHES[pF].x, PARCHES[pF].z] : CORA_XZ };
    const val = (k, v) => k === 'ruido' ? nf(v, 1) + ' dB más que hoy' : k === 'trafico' ? 'índice ' + nf(v, 2) : nf(v) + ' %';
    for (const R of REGLAS) { const v = E.vals[R.k]; if (v == null || E.go) continue;
      if (CERCA[R.k](v) && !MALO[R.k](v) && (R.k !== 'habitat' || E.ref.listo)) add('cerca-' + R.k, 1, TIPO_R[R.k], `Kennedy se acerca al game over: ${R.n.toLowerCase()}`, `${R.n}: ${val(R.k, v)} (game over si ${R.txt}).`, XZ_R[R.k] || KEN_XZ, -1, [], true, `${R.n}: ${val(R.k, v)}`); }
    if (E.go && E.go.sem === sem) add('gameover', 1, TIPO_R[E.go.regla], `Game over: ${E.go.motivo}`, `Regla «${(REGLAS.find(R => R.k === E.go.regla) || {}).n}» cumplida 4 semanas seguidas (valor ${val(E.go.regla, E.go.valor)}).`, XZ_R[E.go.regla] || KEN_XZ, -1, [], true, `${(REGLAS.find(R => R.k === E.go.regla) || {}).n}: ${val(E.go.regla, E.go.valor)}`); }
  /* 9g · atropellos de fauna: un aviso cada AVISO_CADA semanas como mucho; todos quedan en ind(s).atropellos.lista y uno cada 8 semanas en ind(s).hechos */
  { const A = E.atr; if (A.nuevos.length) { const a = A.nuevos.find(v => !NATIVA_NO.has(v.especie)) || A.nuevos[A.nuevos.length - 1], tit = `Atropello de fauna en la ${a.via}: ${min1(a.nombre)}`, tx = `Entre ${a.de} y ${a.a}, por donde se mueve la fauna, las vías principales llevan ${nf(a.vehDia)} vehículos/día; el cruce es en la ${a.via}${E.prop ? ' (los pasos de fauna y las conexiones de la propuesta bajan el riesgo)' : ''}. En lo que va del año van ${A.porAño[Math.min(A.porAño.length - 1, Math.floor(s.t / V.AÑO))]} atropellos.`;
    if (sem - A.ultAviso >= ATROP_SUP.AVISO_CADA) { A.ultAviso = sem; add('atrop-' + sem, 1, 'especies', tit, tx, [a.x, a.z], -1, [a.nombre], true, a.causa, a.lugar); }
    else if (sem - A.ultHecho >= 8) { A.ultHecho = sem; E.hechos.push({ sem, tipo: 'especies', titulo: tit, texto: tx, x: a.x, z: a.z, signo: -1, causa: a.causa, lugar: a.lugar, especies: [a.nombre], aviso: false }); } } }
  // 9f · pruebas de estrés de los pares
  if (E.corte) { const C = E.corte;
    if (s.t === C.t0) add('corte', 1, 'comida', `Se corta ${nf(C.f * 100)} % del suministro externo de alimentos`, `Durante ${C.dur} semanas Corabastos solo puede traer ${nf(100 - C.f * 100)} % de lo que traía${E.prop ? '; los mercados de barrio, las huertas y el acopio de Bavaria Común intentan cubrir el resto' : ' y no hay otra red'}. Hoy llega ${nf(x.abasto ? (1 - x.abasto.deficit) * 100 : 100)} % de lo que necesita Kennedy.`, CORA_XZ, -1, [], true);
    if (s.t === C.t0 + C.dur) add('corte-fin', 1, 'comida', 'Termina el corte del suministro', `Corabastos vuelve a traer lo de antes; la zona peor servida recibe ${nf(x.comidaMin * 100)} % de lo que necesita${E.prop ? ' (la red tarda en reacomodarse: decide por asambleas)' : ''}.`, CORA_XZ, 1, [], true); }
  if (E.org && s.t === E.org.t0) add('org', 1, 'residuos', `Empiezan a subir los residuos orgánicos (+${nf(E.org.f * 100)} % en un año)`, E.prop ? 'Las Estaciones Circulares de los mercados nodo reciben los orgánicos separados; lo que no cabe se va al relleno.' : 'Todo sigue yendo al relleno Doña Juana con la recolección de siempre.', E.prop ? BAV_XZ : [DJ_XZ[0], DJ_XZ[1]], -1, [], true);
  if (E.frag && s.t === E.frag.t0) { const P = PARCHES[E.frag.p]; add('frag', 1, 'especies', `Se pierde ${nf(E.frag.f * 100)} % del ${P.n}`, `${nf(P.ha * E.frag.f, 1)} ha rellenadas o fragmentadas: su fauna pierde hábitat${E.prop ? '; las conexiones vegetales, los refugios en las huertas y la restauración le dan a dónde ir' : ' y solo tiene los corredores verdes de hoy'}.`, [P.x, P.z], -1, [], true); }
  if (E.gob) { const G = E.gob, X = x.gobernanza;
    if (G.rondas === 1 && s.t % G.rond === 0) add('gob-1', 1, 'comida', E.prop ? 'Las asambleas reparten los recursos por primera vez' : 'La coordinación central reparte los recursos', E.prop ? `Ocho asambleas (Juntas de Acción Comunal) presentan sus prioridades y la federación reparte ${nf(G.pres * 100)} % de lo que se necesita.` : `Una oficina central reparte ${nf(G.pres * 100)} % de lo que se necesita con una fórmula por población y datos de hace medio año.`, KEN_XZ, 1, [], true);
    const ke = umbral(1 - X.equidad, [0.1, 0.2]); if (ke) { const wb = X.barrios.reduce((a, b) => b.cobertura < a.cobertura ? b : a); add('gob-eq', ke, 'comida', `El reparto se vuelve desigual: ${wb.n} recibe menos`, `La equidad del reparto baja a ${nf(X.equidad * 100)} %: ${wb.n} recibe ${nf(wb.cobertura * 100)} % de lo que necesita.`, [wb.x, wb.z], -1, [], false, `${wb.n} cubre ${nf(wb.cobertura * 100)} % de su necesidad`, wb.n); }
    const kq = umbral(G.equipos.length, [8, 24, 48]); if (kq) { const q = G.equipos[G.equipos.length - 1]; add('gob-eqp', kq, 'huertas', `Ya se habilitaron ${G.equipos.length} equipamientos en los barrios`, `El último: ${q.n}. Cada uno baja la necesidad de su sector.`, [q.x, q.z], 1, []); } }
  // 9c · cierre gradual: desvíos
  if (E.cie && E.cie.fase >= 1 && x.cierre) { const D = DESVIOS[E.cie.via], nombres = D.desvio.map(id => DESVIOS.vias[id].n);
    let a0 = 0, a1 = 0; const sp = new Set(); for (const id of D.desvio) { const dd = DESVIOS.vias[id].dist; for (let p = 0; p < NP; p++) if (dd[p] <= DESVIO_SUP.RADIO && E.xDes[p] < 0.999) for (let i = 0; i < NFA; i++) if (RED.AVE[i] && s.occ[i * NP + p]) sp.add(nombre(i)); }
    add('desvio-' + E.cie.t0, 1, 'trafico', `El tráfico se desvía por la ${yLista(nombres)}`, `Con la ${D.n} cerrada del todo, por las vías de desvío pasan ${nf((E.cie.traf - 1) * 100)} % más vehículos (+${nf(x.cierre.ruidoExtraDb, 1)} dB); ${sp.size ? 'las aves de los corredores verdes junto a ellas (' + yLista([...sp].slice(0, 4).map(min1)) + ') pierden hasta ' + nf((1 - Math.min(...E.xDes)) * 100) + ' % de la calidad de su hábitat por el ruido.' : 'no hay corredores verdes con fauna junto a ellas.'}`,
      (() => { const dv = ATR.VIAS.find(v => v[0] === nombres[0]); return dv ? [dv[1], dv[2]] : KEN_XZ; })(), -1, [...sp].slice(0, 6), true, `+${nf((E.cie.traf - 1) * 100)} % de vehículos por la ${nombres[0]}`, nombres[0]); void a0; void a1; }
  // 10 · predio (plan parcial o instituto)
  const PR = x.predio; if (PR) { const PD = E.pred, xz = [PR.x, PR.z];
    if (E.plan) { const P = planEn(E, s.t), a = s.t / V.AÑO;
      if (Number.isInteger(a) && P.etapa <= E.plan.viv.length && (P.etapa === 1 || E.plan.viv[P.etapa - 1] >= 2000)) {
        add('etapa-' + P.etapa, 1, 'obra', `Plan parcial: empieza la etapa ${P.etapa}`, `Se abren ${PREDIO_PLAN.vias[P.etapa - 1]} tramos de vía nueva y empiezan ${nf(E.plan.viv[P.etapa - 1])} viviendas; ${nf(viajes(E, P).cam)} viajes de camión de obra al día.`, xz, -1, [], true); }
      if (s.t === E.plan.viv.length * V.AÑO) add('plan-fin', 1, 'obra', 'Termina la obra del plan parcial', `${nf(P.viv)} viviendas y ${nf(PR.habitantes)} habitantes nuevos; ${nf(PR.vias)} tramos de vía; ${nf(PR.vehiculosDia)} vehículos entran y salen al día.`, xz, -1, [], true); }
    const kt = umbral(PR.trafico, [1.5, 2]);
    if (kt) add('ptraf', kt, 'trafico', `Trancón en las entradas de ${E.plan ? 'Bavaria' : 'el instituto'}`, `Por la entrada más cargada del predio pasan ${nf((PR.trafico - 1) * 100)} % más vehículos que hoy; ${nf(PR.vehiculosDia)} al día salen o entran ${E.plan ? 'por las vías nuevas del plan' : 'con la carga del acopio'}.`, xz, -1, []);
    const dr = PR.ruidoDb - PR.ruidoDb0, kr = umbral(dr, [1, 3, 6]);
    if (kr) add('pruido', kr, 'ruido', `Sube el ruido en ${E.plan ? 'el predio de Bavaria' : 'el instituto'}`, `En las entradas del predio el ruido pasa de ${nf(PR.ruidoDb0, 1)} a ${nf(PR.ruidoDb, 1)} dB (+${nf(dr, 1)} dB) por los ${nf(PR.vehiculosDia)} vehículos diarios${PR.camionesDia ? ', ' + nf(PR.camionesDia) + ' de ellos camiones' : ''}.`, xz, -1, []);
    const dO = RL && E.ref.predOcc > 0 ? (PD.emaOcc / E.ref.predOcc - 1) * 100 : 0;
    if (dO < 0) { const k = umbral(-dO, [10, 25, 50]); if (k) { const F = PR.especiesFuera, av = F.filter(f => RED.AVE[RED.FI[f.especie]]), nr = F.filter(f => f.causa !== 'nidos').length, nn = F.filter(f => f.causa !== 'ruido').length;
      const tit = av.length && av.length >= F.length / 2 ? 'Las aves dejan el predio de Bavaria' : 'La fauna deja el predio de Bavaria';
      add('pfauna-', k, 'especies', k > 1 ? tit.replace('dejan', 'siguen dejando').replace('deja', 'sigue dejando') : tit,
        `La ocupación de los corredores verdes del predio y junto a él cae${nf(-dO)} %. ` + (F.length ? `Se van ${yLista(F.slice(0, 4).map(f => min1(f.nombre)))}: ` + [nr ? `el ruido subió ${nf(dr, 1)} dB por los ${nf(PR.vehiculosDia)} vehículos diarios${E.plan && planEn(E, s.t).obra > 0 ? ' y el frente de obra' : ''}` : '', nn ? `se taló ${nf(PR.tala * 100)} % de los árboles del bosque (lugares de anidación)` : ''].filter(Boolean).join(' y ') + '.' : ''),
        xz, -1, F.map(f => f.nombre)); } }
    else { const k = umbral(dO, [25, 50]); if (k) { const sp = []; for (let i = 0; i < NFA; i++) if (PD.ema[i] > E.ref.pred[i] + 0.5) sp.push(i);
      add('pfauna+', k, 'especies', `Llegan especies a ${E.plan ? 'el predio' : 'la huerta del instituto'}`, `La ocupación de los corredores verdes del predio y junto a él sube${nf(dO)} %${sp.length ? ': ' + yLista(sp.slice(0, 4).map(i => min1(nombre(i)))) : ''}.`, xz, 1, sp.map(nombre)); } } }

  // selección: pendientes de calendario + candidatos de umbral; uno por familia (el nivel más alto); enfriamiento por tipo
  for (const c of cand) { const key = c.fam + ':' + c.nivel; if (st.vistos == null) st.vistos = new Set(); if (st.vistos.has(key)) continue; st.vistos.add(key);
    E.hechos.push({ sem, tipo: c.tipo, titulo: c.titulo, texto: c.texto, x: Math.round(c.x), z: Math.round(c.z), signo: c.signo, causa: c.causa, lugar: c.lugar, especies: c.especies, aviso: false, clave: key }); }
  const vivos = new Map();
  for (const c of st.pend) if (sem - c.sem0 <= 26) vivos.set(c.fam, c);
  for (const c of cand) { if (st.fired.has(c.fam + ':' + c.nivel)) continue; if (c.once) { c.sem0 = sem; if (!vivos.has(c.fam)) vivos.set(c.fam, c); continue; }
    const v = vivos.get(c.fam); if (!v || c.nivel > v.nivel) vivos.set(c.fam, c); }
  const pri = (c) => c.fam === 'gameover' ? 2 : /^cerca-/.test(c.fam) ? 1 : 0;
  const lista = [...vivos.values()].sort((a, b) => (pri(b) - pri(a)) || (b.once - a.once) || (b.nivel - a.nivel) || (a.fam < b.fam ? -1 : 1)), out = [];
  for (const c of lista) { if (out.length >= AVISOS_SUP.POR_SEM) break;
    const ck = /^(salida|llegada)-/.test(c.fam) ? 'local' : /^ext-/.test(c.fam) ? 'ext' : c.tipo, enf = ck === 'local' ? AVISOS_SUP.ENFRIA_ESP : AVISOS_SUP.ENFRIA;
    const sube = st.lvl[c.fam] != null && c.nivel > st.lvl[c.fam];
    if (!c.once && !sube && st.cd[ck] != null && sem - st.cd[ck] < enf) continue;
    if (!c.once && E.go && E.go.sem < sem && E.go.sem > 5 * V.AÑO) continue; // después de un game over tardío (año 5 en adelante) solo avisos de calendario y extinciones
    if (c.once && /^ext-/.test(c.fam) && st.cd[ck] != null && sem - st.cd[ck] < AVISOS_SUP.ENFRIA_EXT) continue; // extinciones: al menos dos años entre avisos
    for (let l = 1; l <= c.nivel; l++) st.fired.add(c.fam + ':' + l); st.lvl[c.fam] = c.nivel; st.cd[ck] = sem;
    out.push({ id: `s${E.id}-${sem}-${c.fam}-${c.nivel}`, sem, tipo: c.tipo, titulo: c.titulo, texto: c.texto, capa: CAPA[c.tipo], x: Math.round(c.x), z: Math.round(c.z), signo: c.signo, especies: c.especies, causa: c.causa, lugar: c.lugar });
    const h = E.hechos.find(h => h.clave === c.fam + ':' + c.nivel); if (h) h.aviso = true; }
  if (E.hechos.length > ATROP_SUP.HECHOS) E.hechos.splice(0, E.hechos.length - ATROP_SUP.HECHOS);
  st.pend = [...vivos.values()].filter(c => c.once && !st.fired.has(c.fam + ':' + c.nivel) && sem - c.sem0 < 26);
  return out;
}
export { MOTIVOS, KEN_XZ };

