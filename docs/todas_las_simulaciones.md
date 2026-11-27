# Todas las simulaciones como la 01 + propuesta común (pedido de la autora, 2026-11-26)

Calibración, fuentes y alcance de los datos de los pares 02–06: [calibracion_02_06.md](calibracion_02_06.md).

## Las 6 simulaciones con el mismo formato que 01 Abastecimiento
- En todas pasa la MISMA propuesta: «Kennedy con propuesta» se ve igual en las 6; lo que cambia son las variables de estrés de cada una.
  - 01 Abastecimiento: aumenta la población / demanda alimentaria (ya hecha).
  - 02 Movilidad: se cierra una vía.
  - 03 Residuos, 04 Biodiversidad, 05 Población y especulación, 06 Gobernanza: su estrés propio (ver PARES en simulaciones12.js).
- Mismo formato de panel: alerta corta arriba, variables que se mueven solas y se pueden mover, gráficas claras, bloque de game over con límites, botón de fórmulas, veredicto Sostenible / No sostenible.
- Movilidad: quitar lo del «paro» (recorrido con corte/paro). Borrarlo.

## Propuesta (común a todas)
- Puente de fauna (ecoducto) que conecte una parte del humedal con la otra: la vía se queda tal cual y los carros pasan por debajo; encima un puente ancho, lleno de árboles y vegetación, que se vea súper natural (referentes: pasos de fauna verdes sobre autopistas, con bosque continuo encima y bordes curvos).
- Muchos más árboles en los bordes del humedal.
- Más animales con propuesta: búhos, y en las cubiertas con huertas muchas más abejas y polinizadores.
- Todas las propuestas arquitectónicas se muestran en la pestaña «Estrategias», bien bonito, con zoom a cada una.

## Implementación · las 6 simulaciones con el formato de la 01 (2026-11-26)

### Archivos
- `data3d/sim_panel.js` (nuevo): panel de las simulaciones 02–06 con la misma estructura y estética que la 01: alerta arriba (degradé violeta → coral, la franja de eventos baja), «En vivo · se mueve solo» (barras turquesa con su número), ƒx Fórmulas con los valores de la semana, «Game over · límites» (valor de la semana, raya del límite, n/4 semanas) y 5 gráficas (4 propias + con frente a sin). Los deslizadores de siempre siguen arriba (se arrastran y muestran su número). La 01 sigue con `ab01_panel.js` sin cambios (su resultado es el mismo: ver regresión abajo).
- `data3d/conclusion_par.js` (nuevo): veredicto binario y dos tarjetas con la plantilla fija 1 qué se cambió → 2 qué pasó → 3 si aguantó → 4 cuándo y dónde falló → 5 conclusión (con la otra mitad del par). `informe.js` la usa para 02–06 como usa `conclusion_abasto.js` para la 01.
- `data3d/sim_ui.js`: monta el panel en 02–06; game over igual que la 01 (franja roja y fila que titila, informe 4 s después); la propuesta 3D común (`propuesta01_3d.js`, se le pasa `{ sem }`) se prende en las 6 «con propuesta»; blanco y negro (`gris01.js`) en las 6; en la 02 se ven la obra del cierre y los desvíos (`cierre_gradual.js`) y más carros mientras dura el cierre (KEN_TRAF_F + 2,5 × tráfico desviado extra).
- `data3d/limpio.js`: ya no carga `recorrido_movilidad.js` (el paro); el archivo queda.
- `data3d/simulaciones12.js`: (a) `ind()` expone `reglasV`, `rachas`, `rachaSector` y `fOrg` (solo lectura); (b) **corrección**: en `desvios()` un comentario se tragaba `E.xDes.fill(1); if (!D || !C.fase) return;` y la zona de efecto del desvío se multiplicaba semana a semana y quedaba para siempre; ahora se reinicia cada semana (no cambia ningún game over); (c) 02: el bienestar de las aves usa en los parches a 600 m o menos de la Primero de Mayo su tráfico × tráfico desviado (la misma zona de `DESVIO_SUP`).

### La propuesta en el modelo (contradicción declarada)
En el 3D la propuesta es la misma en las 6. En el **modelo** no del todo: todas las «con propuesta» tienen el escenario C de sim_vida.js (red de mercados con compost, módulos de huertas, Bavaria Común, desmonte de Corabastos) y los mecanismos de `PROP_SUP` (pasos de fauna, calles verdes). Pero la 01 tiene además bloques propios (44 mercados de 28 t/día con acopio regional, 20 Estaciones Circulares de 20 t/día, huertas hidropónicas) que las demás no tienen. No se copiaron a 02–06 porque cambia sus resultados y el abastecimiento de la 02 (el cierre corta comida en el modelo de sim_vida.js, no en el de la 01). **Pide decisión de la autora.**

### Por simulación (límites = reglas de game over del modelo, 4 semanas seguidas; las 7 siguen activas en todas)
| Sim | Variables de estrés (deslizadores) | En vivo | Límites del panel | Fórmulas y fuentes / supuestos |
|---|---|---|---|---|
| 02 Movilidad | semana del cierre 104, duración 26 sem, desvío a la Primero de Mayo 50 % [SUP], tráfico 1,5 %/año, calles pacificadas, acopio | tráfico en la Primero de Mayo, bienestar de las aves, animales muertos por semana | comida en el sector peor < 80 %, ruido +3 dB, tráfico 130 %, especies < 90 % | tráfico desviado = 1 + desvío × fase (× 2/3 con propuesta [SUP]); ruido extra = 10·log10(tráfico desviado); bienestar = Σ aves·B(L)/Σ aves, B = 1 hasta 50 dB y 0 en 75 dB (Shannon et al. 2016; 75 dB [SUP]); comida por sector de sim_vida.js (rutas por la vía cerrada se alargan) |
| 03 Residuos | aumento de orgánicos 30 % [SUP], semana 52, capacidad de Estación 6.000 kg/sem, hogares que separan 0,4, recolección 84 % [SUP] | orgánicos por persona, orgánicos generados, basura sin recoger | orgánicos en las Estaciones > 100 %, humedales < 70 %, especies < 90 % | orgánicos × (1 + aumento × rampa de un año); saturación = pendientes ÷ almacenamiento; humedal funcional = área × calidad frente a la basura del borde (Ramsar, Decreto 624/2007; 30 % [SUP]) |
| 04 Biodiversidad | parche (El Burro), 50 % perdido, semana 104, árboles en parques 0,4, recuperación del humedal 0,02 | especies, parches conectados, territorio con fauna | especies < 90 % (Steffen et al. 2015 [SUP en 23 especies]), territorio con fauna ≤ 70 %, humedales < 70 % | calidad del parche = √(área que queda); con propuesta + 0,2 de árboles en 5 años [SUP] |
| 05 Población y especulación | presión extra 3 %/año [SUP], población 1 %/año, protección 50 % (solo con), tráfico 1,5 %/año | precio del suelo, hogares en riesgo, tráfico | tráfico 130 % (Plan de Movilidad 2023), humedales < 70 %, ruido +3 dB | índice = 1 + (13 % metro + 25 % plan + extra × años) × (1 − 0,5·protección) [SUP]; hogares en riesgo × 55,1 % en arriendo (EM 2025) |
| 06 Gobernanza | recursos 50 % [SUP], rondas cada 13 sem, rotación 12 sem, población 0 %, promotores 12 | necesidad cubierta, equidad, equipamientos | humedales < 70 %, comida en el sector peor < 80 %, territorio con fauna ≤ 70 % | reparto central (mitad población, mitad necesidad de hace 26 sem) o asambleas (necesidad actual, piso 40 %) [SUP]; equidad = 1 − Gini |

### Resultados en Node (semilla 1, valores por defecto, 780 semanas; `correr12.mjs`)
| Par | Sin propuesta: primer game over | Con propuesta | Margen con propuesta (peor valor / límite) | ¿Sin = No, con = Sí? |
|---|---|---|---|---|
| 01 | Residuos sin recoger, semana 285 (año 6) | ninguno | Corabastos 35 % / 100 %, sector 100 % / 80 % | Sí (igual a v5.1) |
| 02 | **Humedales, semana 680 (año 14)**: 69,8 % (cierre desde la semana 4, 260 semanas; la comida baja como mucho a 97,6 %, ya no es la causa) | ninguno | sector peor 99,1 % / 80 %, tráfico 113 % / 130 %, especies 100 % / 90 %, humedales 98 % / 70 % | Sí, **pero el game over sin propuesta no lo causa el cierre** (ver «02 · 2026-11-26») |
| 03 | Humedales, semana 677 (año 14) | ninguno | Estaciones 22 % / 100 %, humedales 98 % / 70 % | Sí |
| 04 | Humedales, semana 680 (año 14) | ninguno | especies 96 % / 90 %, humedales 98 % / 70 % | Sí |
| 05 | Humedales, semana 588 (año 12) | **Tráfico, semana 739 (año 15): 1,301 / 1,30** | — | **No**: con propuesta también es No sostenible |
| 06 | Humedales, semana 680 (año 14) | ninguno | humedales 98 % / 70 % | Sí |

Regresión 01 (`sel.mjs`, v5.1): sin 35 · 37 · 40 · 43 · 50 · 58 · 120 · 120, game over residuos semana 285, Corabastos semana 552; con 35 · 35 · 34 · 34 · 33 · 32 · 31 · 32, sin game over. Igual a la tabla v5.1.

**Lo que hay que saber (sin maquillar):**
- **05 con propuesta no aguanta con los valores por defecto**: la población crece 1 %/año y el tráfico llega a 1,301 (límite 1,30) en la semana 739. En el modelo la propuesta no baja el tráfico (el −25 % de los mercados que menciona `factorTraf` está solo en el comentario, no en la fórmula). Con población 0,9 %/año la con propuesta ya aguanta (pico 1,29) y la sin cae por humedales en la semana 596. No se forzó.
- **03, 04 y 06 sin propuesta caen por humedales (basura en sus bordes) en las semanas 677–680, casi igual que sin prueba de estrés**: el aumento de orgánicos adelanta el game over solo 3 semanas (sin propuesta todo va al relleno, que no tiene límite en el modelo); la pérdida de El Burro y la falta de recursos no tocan ninguna regla de game over. El veredicto es honesto pero no lo decide la prueba de estrés de esas tres. Para que sí, habría que darles una regla propia (p. ej. relleno con capacidad, equidad mínima) con fuente: **decisión de la autora**.
- **02 (reemplazado el 2026-11-26, ver abajo)**: antes el cierre decidía (año 3, falta comida en un sector); ya no. El ruido del desvío baja el bienestar de las aves poco (69,5 → 68,4 %) y en el modelo mueren por ruido 2 poblaciones locales; la regla de ruido (+3 dB en toda Kennedy) no se acerca, porque el cierre reparte el tráfico, no lo aumenta.
## 02 · el cierre se ve antes de cualquier game over (2026-11-26)
Queja de la autora: «no puede haber game over sin haber visto la vía cerrada».

- **Valores por defecto**: el cierre empieza en la **semana 4** y dura **5 años (260 semanas)**; los deslizadores siguen (duración hasta 520 semanas). Alerta izquierda: «ALERTA · Se cerró la Av. de las Américas» (+N % en la 1.º de Mayo).
- **Qué vía**: el modelo cierra la **Av. de las Américas** (`CIERRE_VIA: 'americas'`, las 130 aristas de `cierre_gradual.js`, ~10,5 km; en OSM es la misma «Avenida Calle 6»). Coincide con lo que dijo la autora.
- **Cómo se ve** (`data3d/cierre_gradual.js`): cinta de franjas diagonales rojas y oscuras sobre toda la vía (antes las cintas no se dibujaban: estaban con la cara hacia abajo; ahora `DoubleSide`), conos y barricadas de obra, rótulo «AV. DE LAS AMÉRICAS · CERRADA» en 4 puntos, cintas naranja en los desvíos. La obra cierra en 3 fases en el menor entre el 30 % del cierre y **13 semanas** (`DESVIO_SUP.SUBE_MAX` [SUP]; con 260 semanas el 30 % serían 78 y la vía parecería abierta año y medio).
- **Los MISMOS vehículos se desvían** (`data3d/ruido_cierre.js`, `cerrar(lista de aristas)`): los vehículos grabados de SUMO que van a menos de 14 m de la vía y avanzan al menos 80 m por ella (los que solo la cruzan, no) toman un camino A* por el grafo vial con costo largo × clase (arteria 1, intermedia 1,15, local 1,6) sin las aristas cerradas, de su entrada a su salida de la vía en el mismo lapso de tiempo. Con la vía cerrada: 820 vehículos de la grabación desviados, ~144 a la vez; sobre la vía quedan ~23 de ~2.900 (antes ~150, los que quedan son cruces). Se desvían también las copias desfasadas de la grabación (`index.html`, `updateTraffic`). Tiempo de cálculo ≈ 6 s (en pasos que no congelan la pantalla). Se quitó el aumento de carros que sumaba `KEN_TRAF_F` en la 02 (2,5 × tráfico desviado): ahora no se inventan carros, se mueven los que ya había.
- **Congestión en los desvíos** (`vias_densidad.js` ya cuenta los carros dibujados, incluidos los desviados): medido, los carros desviados circulan por calles con 7,8 veh/km/carril de media frente a 4,5 de la ciudad (nivel B), y 3 de cada 124 en nivel D o peor. **Los desvíos suben a verde más oscuro, no a amarillo ni carmesí**: con la muestra de la grabación el desvío no llega al límite D–E (16 veh/km/carril). No se forzó el color. Lo que sí se ve en rojo/naranja son las cintas de desvío de `cierre_gradual.js`.
- **Comida, sin acantilado** (`data3d/sim_vida.js`, solo cierre forzado): el factor de ruta ya no baja de golpe a su valor: baja de 1 a f en el mismo lapso de la obra (`min(30 % del cierre, 13 semanas)` [SUP]) y luego la logística se reacomoda con τ como antes (A: 6 semanas). Los cierres al azar (1–6 semanas) no cambian: las otras 5 parejas dan exactamente lo mismo.

### Resultados en Node 02 (semilla 1, 780 semanas, `correr12.mjs`)
| | Antes (cierre sem. 104, 26 sem.) | Ahora (cierre sem. 4, 260 sem.) |
|---|---|---|
| Sin propuesta | Abastecimiento, semana 108 (60,6 %) | **Humedales, semana 680 (69,8 %)**; comida peor sector 97,6 % |
| Con propuesta | ninguno | ninguno; comida peor sector 99,1 % |

Las pareja 01, 03–06 sin cambios (01 residuosK@285, 03 humedal@677, 04 humedal@680, 05 humedal@588 y con tráfico@739, 06 humedal@680).

**Contradicción que pide decisión de la autora**: con la obra gradual la comida baja poco (la logística compensa el desvío en ~6 semanas), así que el cierre **ya no provoca game over**. El «No sostenible» de 02 sin propuesta viene de los humedales en el año 14, que es el mismo resultado sin prueba de estrés. Para que el cierre sí decida habría que darle al modelo una pérdida de capacidad de abasto que dure mientras la vía esté cerrada (p. ej. la ruta larga no se compensa del todo) con una fuente; no se inventó.

