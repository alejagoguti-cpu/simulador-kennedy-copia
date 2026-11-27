/* Líneas de base observadas para los pares 02–06. Las pruebas y sus umbrales siguen siendo hipotéticos. */
export const FUENTES_PARES = {
  2: [
    { n: 'Congestión de Bogotá', v: '69,6 % (2025)', alcance: 'Ciudad; proxy para Kennedy', url: 'https://www.tomtom.com/traffic-index/country/colombia/' },
    { n: 'Tiempo para 10 km', v: '31 min 45 s (2025)', alcance: 'Ciudad; proxy para Kennedy', url: 'https://www.tomtom.com/traffic-index/city/bogota/' }
  ],
  3: [
    { n: 'Residuos recolectados en Kennedy', v: '23.143,65 t en junio de 2025', alcance: 'Localidad; incluye barrido, césped y poda', url: 'https://www.uaesp.gov.co/sites/default/files/documentos/ASE_3_Informe_de_Supervision_Monitoreo_y_Control_JULIO_2025.pdf' },
    { n: 'Fracción orgánica', v: '51,32 % (caracterización 2017)', alcance: 'Bogotá; proxy, no medición de Kennedy', url: 'https://www.uaesp.gov.co/sites/default/files/20210420_modelo_de_aprovechamiento.pdf' }
  ],
  4: [
    { n: 'Humedal El Burro', v: '18,84 ha', alcance: 'Reserva distrital', url: 'https://www.ambientebogota.gov.co/es/humedal-el-burro' },
    { n: 'Humedal La Vaca', v: '9,94 ha', alcance: 'Reserva distrital', url: 'https://new.ambientebogota.gov.co/nosotros/gestion-ambiental/areas-estrategicas-conservacion/reservas-distritales-de-humedales/la-vaca' },
    { n: 'Humedal de Techo', v: '11,67 ha', alcance: 'Reserva distrital', url: 'https://ambientebogota.gov.co/es/humedal-techo' }
  ],
  5: [
    { n: 'Hogares en arriendo', v: '55,1 % (2025)', alcance: 'Bogotá urbana; proxy para Kennedy', url: 'https://regionmetropolitana.gov.co/observatorio/noticias/encuesta-multipropsito-2025-cambios-en-bogot-y-la-regin-en-cuatro-aos-' }
  ],
  6: [
    { n: 'Presupuesto local asignado', v: 'más de $193.000 millones (2025)', alcance: 'Kennedy; contexto, no equivale a «% de necesidad»', url: 'https://www.kennedy.gov.co/noticias/kennedy-alcanza-mas-del-55-ejecucion-presupuestal-proyectos-alto-impacto-la-comunidad' }
  ]
};

// UAESP: 20.979,17 t domiciliarias y de grandes generadores / 30 días de junio.
// Se aplica la composición distrital de 2017 como proxy y la población del modelo.
export const ORG_KG_HAB_DIA = (20979.17 * 1000 / 30) * 0.5132 / 1034838;

