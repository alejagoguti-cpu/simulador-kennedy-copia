/* Recorrido previo a las simulaciones 02–06. Geometría y materiales propios;
   el corte es una hipótesis de proyecto, no una medición biológica. */
const FICHAS = {
  2: { titulo: 'Pasajes urbanos permeables', lugar: 'Antiguas naves industriales de Bavaria · Kennedy', descripcion: 'Las naves abren pasos peatonales entre las calles existentes. El bosque permanece fuera de la intervención.', especies: ['Árboles del bosque · continuidad', 'Polinizadores · jardines de borde'], corte: ['CALLE EXISTENTE', 'NAVE REUTILIZADA', 'PASAJE PERMEABLE', 'CALLE EXISTENTE'], notas: ['Flujo peatonal', 'Sombra vegetal', 'Fachada porosa'] },
  3: { titulo: 'Estaciones Circulares', lugar: 'María Paz y red de mercados · Kennedy', descripcion: 'Recepción, separación y compostaje de orgánicos en estaciones distribuidas cerca de su origen.', especies: ['Suelo vivo · compost', 'Polinizadores · jardines de borde'], corte: ['RECEPCIÓN', 'SEPARACIÓN', 'COMPOSTAJE', 'JARDÍN PRODUCTIVO'], notas: ['Orgánicos', 'Aireación', 'Compost al suelo'] },
  4: { titulo: 'Puente ecológico multiespecie', lugar: 'Bosque de Bavaria y conexiones ecológicas · Kennedy', descripcion: 'Un paso vegetado y jardines florales conectan hábitats a través de la barrera urbana.', especies: ['Abejas · recursos florales', 'Mirlas · arbolado y refugio', 'Tinguas · conexión húmeda'], corte: ['HÁBITAT A', 'PUENTE VEGETADO', 'BARRERA URBANA', 'HÁBITAT B'], notas: ['Estrato floral', 'Refugio arbóreo', 'Paso de fauna'] },
  5: { titulo: 'Manzanas de gestión colectiva', lugar: 'Entorno del antiguo predio Bavaria · Kennedy', descripcion: 'Vivienda, producción y espacios comunes rodean suelo ecológico protegido.', especies: ['Árboles · sombra y hábitat', 'Polinizadores · jardines comunes'], corte: ['VIVIENDA', 'PATIO COLECTIVO', 'SUELO PROTEGIDO', 'PRODUCCIÓN'], notas: ['Vivienda', 'Patio permeable', 'Uso productivo'] },
  6: { titulo: 'Ágoras comunitarias federadas', lugar: 'Nodos comunitarios distribuidos · Kennedy', descripcion: 'Espacios de encuentro, formación y deliberación conectados por vocerías rotativas.', especies: ['Árboles · confort del espacio público', 'Polinizadores · jardín del ágora'], corte: ['PLAZA PÚBLICA', 'ÁGORA ABIERTA', 'AULA COMUNITARIA', 'JARDÍN'], notas: ['Encuentro', 'Asamblea', 'Vocerías'] }
};

const EXISTENTE = {
  2: 'Las naves industriales de Bavaria y la red de calles actual mantienen la fragmentación de los recorridos. No hay pasajes nuevos.',
  3: 'Los residuos de María Paz y los mercados dependen de los puntos y rutas de recolección actuales. No hay Estaciones Circulares nuevas.',
  4: 'El Bosque de Bavaria y los parches ecológicos conservan sus barreras urbanas actuales. No hay puente ecológico ni corredores nuevos.',
  5: 'Los predios mantienen sus usos y reglas de ocupación actuales. No hay manzanas de gestión colectiva ni protección adicional del suelo.',
  6: 'La organización comunitaria utiliza sus espacios y mecanismos actuales. No hay ágoras federadas ni vocerías nuevas.'
};
export function crearRecorridoArquitectura({ T3, alComenzar, alMostrarVariables }) {
  const THREE = T3.THREE;
  const estilo = document.createElement('style'); estilo.textContent = `
    #ra-fondo{position:fixed;inset:0;z-index:1001;color:#e8ede9;font-family:system-ui,sans-serif;display:none;pointer-events:none}
    #ra-fondo.on{display:block}
    #ra-fondo #ra-panel,#ra-fondo #ra-cerrar{pointer-events:auto}
    #ra-panel{position:absolute;left:16px;top:16px;width:min(380px,34vw);max-height:calc(100vh - 32px);box-sizing:border-box;padding:clamp(16px,1.8vw,26px);overflow:auto;border-radius:14px;background:var(--ui-glass);border:1px solid var(--ui-glass-bd);box-shadow:var(--ui-glass-sh);-webkit-backdrop-filter:var(--ui-glass-fx);backdrop-filter:var(--ui-glass-fx)}
    #ra-fondo:not(.ubicacion) #ra-panel{width:min(540px,42vw)}
    #ra-escena{position:absolute;inset:0}
    #ra-escena .ra-guia{display:none}
    #ra-fondo.ubicacion #ra-panel{width:min(330px,80vw);padding:16px 18px}#ra-fondo.ubicacion #ra-panel h2{font-size:22px;margin:8px 0}#ra-fondo.ubicacion #ra-panel .ra-lugar{margin:10px 0;padding:10px 0}#ra-fondo.ubicacion #ra-panel p{font-size:12.5px}#ra-fondo:not(.ubicacion) #ra-panel{left:auto!important;right:16px;top:16px!important}
    #ra-panel .ra-k{font:600 11px/1.4 var(--ui-mono);letter-spacing:.14em;color:var(--ui-acc-tx);text-transform:uppercase}
    #ra-panel h2{font:400 clamp(27px,2.6vw,45px)/1.06 var(--ui-tit);text-transform:uppercase;margin:20px 0}
    #ra-panel p{font:400 14px/1.55 system-ui,sans-serif;color:#b5c1c3;max-width:58ch}
    #ra-panel .ra-lugar{padding:16px 0;border-top:1px solid #354148;border-bottom:1px solid #354148;margin:20px 0}
    #ra-panel .ra-lugar strong{display:block;font-size:16px;color:#edf4ee;margin-top:5px}
    #ra-panel button,#ra-escena button{border:1px solid var(--ui-bd2);background:var(--ui-acc-bg);color:var(--ui-acc-tx);border-radius:10px;padding:10px 16px;cursor:pointer;font:600 13px var(--ui-sans)}
    #ra-panel button:hover,#ra-escena button:hover{background:#39432f}
    #ra-panel button:disabled{opacity:.38;cursor:not-allowed}
    #ra-panel .ra-avance{display:flex;gap:6px;margin-bottom:20px}.ra-avance i{height:3px;flex:1;background:#36434b}.ra-avance i.on{background:var(--ui-acc)}
    #ra-corte{position:relative;width:100%;aspect-ratio:1200/530;background:#0b1216;border:1px solid #36434b;margin:18px 0 4px;overflow:hidden}
    #ra-corte canvas,#ra-corte svg{position:absolute;inset:0;width:100%;height:100%}
    #ra-especies{display:grid;gap:6px;margin:15px 0}.ra-especie{font:12px ui-monospace,monospace;color:#acd4a8;padding:7px 9px;border-left:2px solid #8fb26b;background:#18231a}
    #ra-escena{min-width:0;background:transparent;pointer-events:none}
    #ra-marco{position:absolute;inset:10% 7%;border:1px solid var(--ui-acc);box-shadow:inset 0 0 0 1px #0b121688,0 0 0 9999px #0a10151a;display:none}
    #ra-fondo.ubicacion #ra-marco{display:none}#ra-marco::before,#ra-marco::after{content:'';position:absolute;width:28px;height:28px;border-color:var(--ui-acc)}
    #ra-marco::before{top:-2px;left:-2px;border-top:3px solid;border-left:3px solid}#ra-marco::after{right:-2px;bottom:-2px;border-right:3px solid;border-bottom:3px solid}
    #ra-marco span{position:absolute;left:12px;top:12px;background:var(--ui-glass);color:var(--ui-acc-tx);padding:6px 8px;font:600 10px var(--ui-mono);letter-spacing:.08em}
    #ra-objetivo{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:none;overflow:visible}
    #ra-fondo.ubicacion #ra-objetivo{display:block}#ra-poligono{fill:#c9f27a80;stroke:var(--ui-acc);stroke-width:3;stroke-dasharray:8 5;filter:drop-shadow(0 0 12px #c9f27a);animation:ra-trazo 2.4s linear infinite,ra-luz 2.8s ease-in-out infinite}
    #ra-rotulo{fill:var(--ui-acc-tx);font:700 12px var(--ui-mono);letter-spacing:.07em;paint-order:stroke;stroke:#0b1216;stroke-width:5px}
    @keyframes ra-luz{50%{fill:#c9f27ac2;filter:drop-shadow(0 0 20px #c9f27a)}}
    @keyframes ra-trazo{to{stroke-dashoffset:-26}}@keyframes ra-pulso{0%{opacity:1;scale:.6}70%{opacity:.15;scale:1.35}100%{opacity:0;scale:1.5}}
    #ra-escena .ra-guia{position:absolute;top:20px;left:20px;background:#101a1fbd;padding:7px 10px;font:11px ui-monospace,monospace;color:#fff}
    #ra-escena .ra-ley{position:absolute;bottom:96px;left:50%;transform:translateX(-50%);max-width:350px;background:var(--ui-glass);border:1px solid var(--ui-glass-bd);border-radius:10px;backdrop-filter:var(--ui-glass-fx);-webkit-backdrop-filter:var(--ui-glass-fx);padding:12px 14px;font:13px/1.45 system-ui}
    #ra-escena .ra-ley b{display:block;color:#e7f2e0}
    #ra-vars{display:grid;gap:14px;margin:20px 0}.ra-var{display:grid;gap:5px;padding:10px;border:1px solid #344148;background:#111a1e}.ra-var label{display:flex;justify-content:space-between;gap:12px;font-size:12px}.ra-var output{color:#f1c2a1}.ra-var input{width:100%;accent-color:#d99370}.ra-var select{width:100%;background:#1a2429;border:1px solid #66767a;color:#fff;padding:8px}.ra-var.hecha{border-color:#71966b}
    #ra-cerrar{position:absolute;right:18px;top:16px;z-index:2}
    body.ra-recorrido #su-feed,body.ra-recorrido #su-avisos,body.ra-recorrido .su-av,body.ra-recorrido #su-hist{display:none!important}
    body.ra-recorrido #lp-tablero,body.ra-recorrido #sp-alerta,body.ra-recorrido #ken-calidad{display:none!important}
    body.ra-par-escenario #su-feed,body.ra-par-escenario .su-av,body.ra-par-escenario #su-avisos{background:#0b1216ed!important;border:1px solid #815e50!important;border-radius:4px!important;color:#ede9e3!important;backdrop-filter:none!important;box-shadow:0 8px 28px #0008!important}
    body.ra-par-escenario #su-feed .fe-h.mal,body.ra-par-escenario #su-feed li.fe.mal{--fe-c:#d99370}
    body.ra-par-escenario #su-feed .fe-h.bien,body.ra-par-escenario #su-feed li.fe.bien{--fe-c:#9bbb82}
    body.ra-par-escenario #su-feed .fe-v.on,body.ra-par-escenario .su-av button.ver{background:#d99370!important;color:#101518!important}
    #ra-fondo.ubicacion .ra-ley{display:none}@media(max-width:760px){#ra-fondo:not(.ubicacion) #ra-panel{left:8px!important;right:8px;top:auto!important}#ra-panel,#ra-fondo.ubicacion #ra-panel,#ra-fondo:not(.ubicacion) #ra-panel{left:8px!important;right:8px!important;top:auto!important;bottom:8px!important;width:auto!important;max-height:52vh;padding:14px}#ra-panel h2{margin:8px 0}#ra-escena .ra-ley{display:none}}
  `; document.head.appendChild(estilo);
  const fondo = document.createElement('div'); fondo.id = 'ra-fondo'; fondo.setAttribute('role','dialog'); fondo.setAttribute('aria-modal','true'); fondo.setAttribute('aria-label','Recorrido previo a la simulación');
  fondo.innerHTML = '<div id="ra-panel"></div><div id="ra-escena"><div id="ra-marco"><span>KENNEDY · ÁREA DE LA PRUEBA</span></div><div class="ra-guia">KENNEDY · ÁREA DE INTERVENCIÓN ILUMINADA</div><div class="ra-ley"></div></div><svg id="ra-objetivo" aria-hidden="true"><polygon id="ra-poligono"/><text id="ra-rotulo"></text></svg><button id="ra-cerrar" type="button" aria-label="Cerrar recorrido">Cerrar ×</button>';
  document.body.appendChild(fondo);
  const panel=fondo.querySelector('#ra-panel'), escenaEl=fondo.querySelector('#ra-escena');
  let def=null, etapa=0, render=null, tocadas=new Set(), valores={}, cerrarRender=()=>{}, camAnterior=null, filtroAnterior='', ancla=null, frameObjetivo=0, planAnterior=null;
  const datosBav=fetch('data3d/bavaria.json?v=2').then(r=>r.ok?r.json():null).catch(()=>null);
  const datosCora=fetch('data3d/corabastos.json?v=3').then(r=>r.ok?r.json():null).catch(()=>null);
  const datosAgua=fetch('data3d/water_bodies.json?v=1').then(r=>r.ok?r.json():[]).catch(()=>[]);
  function anclaPoligono(p,h=2){if(!p?.length||!T3.lw)return null;const puntos=p.map(([x,y])=>T3.lw(x,y)),centro=puntos.reduce((a,q)=>[a[0]+q[0]/puntos.length,a[1]+q[1]/puntos.length],[0,0]);let lej=0,a=puntos[0],b=puntos[1];for(const u of puntos)for(const v of puntos){const d=(u[0]-v[0])**2+(u[1]-v[1])**2;if(d>lej){lej=d;a=u;b=v;}}return{puntos,centro,h,largo:Math.sqrt(lej),angulo:Math.atan2(b[0]-a[0],b[1]-a[1])};}
  function anclaPara(bav,cora,par,agua=[],paraPropuesta=false){if(par===3)return anclaPoligono(cora?.poly);if(par===4&&!paraPropuesta){const n={1:/El Burro/i,2:/de Techo/i,3:/La Vaca/i}[+valores.parche];if(n){const h=agua.filter(x=>n.test(x.nombre||'')).sort((a,b)=>(b.pts?.length||0)-(a.pts?.length||0))[0];if(h?.pts?.length){const paso=Math.max(1,Math.ceil(h.pts.length/180)),a=anclaPoligono(h.pts.filter((_,i)=>i%paso===0));if(a){a.nombre=h.nombre.toUpperCase();return a;}}}}if(par===4)return anclaPoligono(bav?.sitio);const ix=par===6?23:par===5?0:par===2?2:null,e=ix!=null&&bav?.edif?.[ix];return e?anclaPoligono(e.p,e.h):null;}
  function objetivo(){if(!def||etapa!==0)return;const svg=fondo.querySelector('#ra-objetivo'),poly=svg.querySelector('#ra-poligono'),rotulo=svg.querySelector('#ra-rotulo');if(ancla){const c=ancla.centro,v=new THREE.Vector3(c[0],ancla.h+2,c[1]).project(T3.camera),x=(v.x+1)*innerWidth/2,y=(1-v.y)*innerHeight/2;poly.setAttribute('points',ancla.puntos.map(p=>{const q=new THREE.Vector3(p[0],ancla.h+2,p[1]).project(T3.camera);return `${(q.x+1)*innerWidth/2},${(1-q.y)*innerHeight/2}`;}).join(' '));rotulo.setAttribute('x',x+14);rotulo.setAttribute('y',y-16);rotulo.textContent=ancla.nombre||(def.par===4?'BOSQUE DE BAVARIA':def.par===3?'ENTORNO DE CORABASTOS':def.propuesta?`NAVE EXISTENTE · ${FICHAS[def.par].titulo.toUpperCase()}` :'EDIFICIO EXISTENTE');
    /* pop-up pegado al lugar resaltado (dentro de la pantalla); en celular queda abajo (CSS) */
    if(!matchMedia('(max-width:760px)').matches){const w=panel.offsetWidth,h=panel.offsetHeight,fuera=v.z>1||x<0||x>innerWidth||y<0||y>innerHeight;let px=fuera?(innerWidth-w)/2:x+28,py=fuera?innerHeight-h-110:y-h/2;if(px+w>innerWidth-16)px=x-w-28;px=Math.max(16,Math.min(innerWidth-w-16,px));py=Math.max(16,Math.min(innerHeight-h-16,py));panel.style.left=px.toFixed(0)+'px';panel.style.top=py.toFixed(0)+'px';}else{panel.style.left='';panel.style.top='';}}frameObjetivo=requestAnimationFrame(objetivo);}
  const fmt=s=>s.opciones ? (s.opciones.find(o=>+o[0]===+valores[s.k])?.[1]||'—') : `${(+valores[s.k]).toLocaleString('es-CO')} ${s.unidad||''}`;
  const corte=f=>{
    const h=f===FICHAS[2]?17:f===FICHAS[3]?5:f===FICHAS[4]?6:f===FICHAS[5]?12:9, suelo=210, cubierta=suelo-h*7;
    const puntos=[];for(let x=54;x<525;x+=5)for(let y=cubierta+8;y<suelo;y+=5){
      const columna=[93,220,355,488].some(c=>Math.abs(x-c)<6), muro=(x<67||x>513), cubiertaP=y<cubierta+12;
      if((columna||muro||cubiertaP)&&!((x+y)%17<3))puntos.push(`<circle cx="${x}" cy="${y}" r="1" fill="${cubiertaP?'#d8a67d':'#b5bab0'}" opacity=".83"/>`);
    }
    const subsuelo=[];for(let x=20;x<560;x+=6)for(let y=217;y<239;y+=6)if((x*5+y)%7<5)subsuelo.push(`<circle cx="${x}" cy="${y}" r=".75" fill="#806d55" opacity=".8"/>`);
    const fauna=f===FICHAS[4]?[
      ['ABEJA','#e4bd6e',72,5.4],['MIRLA','#c2c9bc',55,8.2],['TINGUA','#8dbcb7',184,10.5]
    ]:[['ABEJA','#e4bd6e',72,5.8],['MIRLA','#c2c9bc',55,8.4]];
    const animales=fauna.map(([nombre,color,y,dur],i)=>{
      const silueta=[];for(let dx=-12;dx<=12;dx+=3)for(let dy=-5;dy<=5;dy+=3)if(dx*dx/144+dy*dy/25<=1)silueta.push(`<circle cx="${dx}" cy="${dy}" r="1.35"/>`);
      const ala=nombre==='TINGUA'?'<path d="M-8 4l-4 9M3 4l3 10" stroke="currentColor" stroke-width="2" fill="none"/>':'<path d="M-2 -3Q-13 -23 -2 -14Q3 -20 7 -4" stroke="currentColor" stroke-width="2" stroke-dasharray="2 2" fill="none"/>';
      return `<g fill="${color}" style="color:${color}"><g transform="scale(1.3)">${silueta.join('')}${ala}<path d="M12 0l7 3-7 2" fill="currentColor"/></g><animateMotion dur="${dur}s" repeatCount="indefinite" path="M ${i%2?500:65} ${y} C 200 ${y-15} 340 ${y+12} ${i%2?65:500} ${y-4}"/></g><text x="${i%2?455:34}" y="${y-21}" fill="${color}" font-size="9" font-family="monospace">${nombre}</text>`;
    }).join('');
    const gotas=[150,290,430].map((x,i)=>`<circle r="2.5" fill="#8cb8b8" opacity=".9"><animateMotion path="M${x} ${cubierta-4} V226" dur="${2.8+i*.5}s" begin="${i*.7}s" repeatCount="indefinite"/></circle>`).join('');
    return `<svg id="ra-corte" viewBox="0 0 580 266" role="img" aria-label="Corte arquitectónico a escala esquemática con luz, agua, suelo, ruido y fauna en movimiento">
      <rect width="580" height="266" fill="#0b1216"/><text x="18" y="20" fill="#d99370" font-size="10" font-family="monospace">CORTE · HIPÓTESIS DE DISEÑO · 1:200</text>
      <path d="M20 ${suelo}H560M54 ${cubierta}H525" stroke="#e1ab83" stroke-width="1.3"/>${puntos.join('')}${subsuelo.join('')}
      <path d="M30 38L165 ${cubierta+20}M45 38L220 ${cubierta+34}" stroke="#ebc57b" stroke-width="1.1" stroke-dasharray="3 6"><animate attributeName="stroke-dashoffset" from="0" to="-36" dur="2.8s" repeatCount="indefinite"/></path>
      <text x="23" y="37" fill="#eac77c" font-size="9" font-family="monospace">LUZ SOLAR ↓</text>
      <path d="M540 115Q515 130 540 145Q515 160 540 175" fill="none" stroke="#cf8e83" stroke-width="1.5" stroke-dasharray="3 5"><animate attributeName="stroke-dashoffset" from="0" to="-32" dur="1.7s" repeatCount="indefinite"/></path>
      <text x="455" y="108" fill="#d8a196" font-size="9" font-family="monospace">RUIDO →</text>
      <path d="M130 221Q270 236 445 221" fill="none" stroke="#8cb8b8" stroke-width="2" stroke-dasharray="4 6"><animate attributeName="stroke-dashoffset" from="0" to="-40" dur="2.4s" repeatCount="indefinite"/></path>
      ${gotas}<text x="18" y="237" fill="#9bc3bb" font-size="9" font-family="monospace">AGUA + SUELO PERMEABLE →</text>
      <path d="M65 196Q180 165 290 188T515 182" fill="none" stroke="#a5c392" stroke-width="1.4" stroke-dasharray="3 6"><animate attributeName="stroke-dashoffset" from="0" to="-48" dur="3s" repeatCount="indefinite"/></path>
      ${animales}<path d="M20 ${suelo}v-${h*7}m-4 0h8m-8 ${h*7}h8" stroke="#e7b08b" stroke-width="1"/>
      <text x="24" y="${suelo-5}" fill="#e7b08b" font-size="9" font-family="monospace">${h} m</text>
      ${f.corte.map((n,i)=>`<text x="${18+i*141}" y="257" fill="#c9d4d0" font-size="8" font-family="monospace">${n}</text>`).join('')}
    </svg>`;
  };
  function corteReal(f){
    const especies=f===FICHAS[4]?[['ABEJA',240,132,6.5,'abeja'],['MIRLA',920,100,9,'mirla'],['TINGUA',830,340,12,'tingua']]:[['ABEJA',245,145,7,'abeja'],['MIRLA',910,100,10,'mirla']];
    const animales=especies.map(([n,x,y,d,t],i)=>{
      const figura=t==='tingua'?'<image href="data3d/aves/tingua.png" x="-28" y="-29" width="56" height="58"/>':t==='mirla'?'<path d="M-27 6Q-20 -13 -2 -15Q16 -18 26 -4L35 0L26 4Q9 18 -10 13L-29 21L-20 8Z M-1 -13Q8 -26 17 -25Q22 -18 17 -12" fill="#bfc6bd" stroke="#e1e3d8" stroke-width="1.5" stroke-dasharray="2 3"/><circle cx="20" cy="-7" r="1.6" fill="#101518"/>':'<g fill="#ddbd68"><ellipse rx="15" ry="8"/><path d="M-4 -5Q-18 -22 -5 -19Q1 -24 5 -7M2 7L9 18M-8 6L-13 17" fill="none" stroke="#e9d89a" stroke-width="2"/><path d="M13 -1l8 3-8 2"/></g>';
      return `<g>${figura}<animateMotion dur="${d}s" repeatCount="indefinite" path="M ${i%2?940:170} ${y} C 420 ${y-35} 710 ${y+30} ${i%2?170:940} ${y-8}"/></g><text x="${x}" y="${y-38}" fill="#e0e7d8" font-size="13" font-family="var(--ui-mono), monospace">${n}</text>`;
    }).join('');
    return `<div id="ra-corte" role="img" aria-label="Corte de ${f.titulo} dibujado con puntos; especies, agua, luz y ruido en movimiento"><canvas id="ra-canvas" width="1200" height="530" aria-hidden="true"></canvas><svg viewBox="0 0 1200 530" aria-hidden="true"><path d="M65 75Q180 130 360 235" stroke="#e2c98c" stroke-width="2" stroke-dasharray="3 11" fill="none"><animate attributeName="stroke-dashoffset" from="0" to="-56" dur="2.5s" repeatCount="indefinite"/></path><path d="M1090 310Q990 345 900 330" stroke="#c78781" stroke-width="2" stroke-dasharray="3 10" fill="none"><animate attributeName="stroke-dashoffset" from="0" to="-52" dur="2s" repeatCount="indefinite"/></path><path d="M520 455Q680 475 1000 450" stroke="#8bbab7" stroke-width="2" stroke-dasharray="3 10" fill="none"><animate attributeName="stroke-dashoffset" from="0" to="-52" dur="3s" repeatCount="indefinite"/></path>${animales}<text x="52" y="56" fill="#e7c988" font-size="13" font-family="monospace">LUZ + SOMBRA</text><text x="1005" y="293" fill="#cc918b" font-size="13" font-family="monospace">RUIDO</text><text x="810" y="485" fill="#9bc4bc" font-size="13" font-family="monospace">AGUA + SUELO</text><text x="32" y="510" fill="#d7ded8" font-size="12" font-family="monospace">${f.corte.join('  ·  ')}</text></svg></div>`;
  }
  function dibujarCorte(canvas,f){if(!canvas)return;const g=canvas.getContext('2d');if(!g)return;let seed=4987+Object.keys(FICHAS).find(k=>FICHAS[k]===f)*123;const rnd=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
    g.fillStyle='#0b1216';g.fillRect(0,0,1200,530);
    const punto=(x,y,r,col,a=1)=>{g.globalAlpha=a;g.fillStyle=col;g.beginPath();g.arc(x,y,r,0,Math.PI*2);g.fill();};
    const nube=(x,y,w,h,n,col,r=1.2)=>{for(let i=0;i<n;i++)punto(x+rnd()*w,y+rnd()*h,r*(.5+rnd()),col,.35+rnd()*.55);};
    const linea=(x1,y1,x2,y2,col,n=250)=>{for(let i=0;i<n;i++){const t=rnd();punto(x1+(x2-x1)*t+(rnd()-.5)*3,y1+(y2-y1)*t+(rnd()-.5)*3,.7+rnd()*.7,col,.5+rnd()*.45);}};
    const suelo=420;linea(34,suelo,1164,suelo,'#b6b6a4',700);nube(32,424,1136,55,3700,'#807c65',1.1);
    for(let x=45;x<1150;x+=18){const a=26+rnd()*24;linea(x,suelo,x+Math.sin(x)*4,suelo-a,'#8dab73',18);for(let k=0;k<5;k++)punto(x+(rnd()-.5)*20,suelo-a+rnd()*13,1+rnd()*2,'#8daa70',.7);}
    const p=Object.keys(FICHAS).find(k=>FICHAS[k]===f);
    if(p==='2'||p==='6'){const techo=p==='2'?190:235;linea(170,techo,1030,techo,'#d6b69b',550);linea(170,techo,340,techo-70,'#d6b69b');linea(340,techo-70,850,techo-70,'#d6b69b',370);linea(850,techo-70,1030,techo,'#d6b69b');for(const x of [185,380,590,800,1015]){nube(x,techo,15,suelo-techo,480,x<350||x>800?'#ae7155':'#c5bdb0',1.2);linea(x,techo,x,suelo,'#d5c9b5',260);}nube(200,techo+15,155,suelo-techo-24,1300,'#9b6147');nube(850,techo+15,150,suelo-techo-24,1300,'#9b6147');linea(365,395,835,395,'#dbb58c',360);}
    if(p==='3'){for(const x of [170,420,670]){nube(x,230,190,15,700,'#bba581');nube(x,245,18,168,360,'#9f8360');nube(x+170,245,18,168,360,'#9f8360');nube(x+28,335,135,58,620,'#786a4a');}nube(955,365,135,45,800,'#7f9d5e');}
    if(p==='4'){nube(60,307,295,112,2500,'#749268');nube(845,307,300,112,2500,'#749268');linea(300,302,900,302,'#c6b9a0',500);nube(300,285,600,40,2300,'#647f58');for(const x of [320,500,700,880])linea(x,302,x,420,'#a3a99a',220);nube(440,370,330,50,450,'#54565a');}
    if(p==='5'){for(const x of [145,820]){nube(x,160,230,260,3000,'#ae8268');for(const y of [220,295,365])linea(x,y,x+230,y,'#d5bdab',260);for(const wx of [x+45,x+135])for(const y of [190,265,340])nube(wx,y,35,36,110,'#708484');}nube(410,365,370,55,1000,'#70905f');}
    for(const [x,alto] of [[90,125],[1050,150],[1130,105]]){linea(x,suelo,x,suelo-alto,'#8b8067',260);for(let j=0;j<1150;j++){const a=rnd()*Math.PI*2,rr=Math.sqrt(rnd())*65;punto(x+Math.cos(a)*rr,suelo-alto+Math.sin(a)*rr*.65,.7+rnd()*1.5,'#6d925d',.4+rnd()*.55);}}
    g.globalAlpha=1;
  }
  function pintar(){if(!def)return;const f=FICHAS[def.par], propuesta=!!def.propuesta;
    fondo.classList.toggle('ubicacion',etapa===0);
    if(T3.renderer?.domElement)T3.renderer.domElement.style.filter=etapa===0?'grayscale(1) brightness(.72)':filtroAnterior;
    const ubicacion=`<h2>¿Dónde ocurre?</h2><div class="ra-lugar"><span class="ra-k">KENNEDY · BOGOTÁ</span><strong>${f.lugar}</strong></div><p>${def.prueba}</p><p>La misma prueba se aplica en ambos escenarios. Observa el lugar antes de avanzar.</p><button type="button" data-siguiente>${propuesta?'Conocer la propuesta arquitectónica':'Ver el estado existente'} →</button>`;
    const intervencion=`<h2>${f.titulo}</h2><p>${f.descripcion}</p>${corteReal(f)}<div class="ra-k">RELACIONES QUE LA PROPUESTA BUSCA POTENCIAR</div><div id="ra-especies">${f.especies.map(s=>`<div class="ra-especie">${s}</div>`).join('')}</div><p>El corte muestra la intención de diseño. La presencia de especies y los índices se calculan después en la simulación.</p><button type="button" data-siguiente>Ir a la simulación →</button>`;
    const existente=`<h2>Estado existente</h2><div class="ra-lugar"><span class="ra-k">CONDICIÓN DE REFERENCIA</span><strong>${f.lugar}</strong></div><p>${EXISTENTE[def.par]}</p><p>La prueba se calcula con la infraestructura actual. En este escenario no se construye la intervención arquitectónica.</p><button type="button" data-siguiente>Ir a la simulación →</button>`;
    panel.innerHTML=`<div class="ra-k">SIMULACIÓN ${String(def.par).padStart(2,'0')} · ${propuesta?'CON PROPUESTA':'SIN PROPUESTA'}</div><div class="ra-avance">${[0,1].map(i=>`<i class="${i<=etapa?'on':''}"></i>`).join('')}</div>${etapa===0?ubicacion:propuesta?intervencion:existente}`;
    if(etapa===1&&propuesta)dibujarCorte(panel.querySelector('#ra-canvas'),f);
    const sig=panel.querySelector('[data-siguiente]');if(sig)sig.onclick=()=>{if(etapa===1){const d=def;cerrar();alMostrarVariables?.(d);return;}etapa=1;pintar();abrirEscena();};
    escenaEl.querySelector('.ra-guia').textContent=etapa===0?'KENNEDY · ÁREA DE LA PRUEBA ILUMINADA':propuesta?'EDIFICIO EXISTENTE · PROPUESTA EN CONTEXTO':'EDIFICIO EXISTENTE · SIN INTERVENCIÓN';
    escenaEl.querySelector('.ra-ley').innerHTML=etapa===0?`<b>${f.lugar}</b>Ubicación de la prueba en Kennedy`:propuesta?`<b>${f.titulo}</b>Modelo tridimensional de la intervención · geometría y texturas del proyecto`:`<b>Estado existente</b>La simulación utiliza la infraestructura actual, sin añadir la propuesta`;
  }
  function cerrar(){cancelAnimationFrame(frameObjetivo);frameObjetivo=0;fondo.classList.remove('on','ubicacion');cerrarRender();render=null;def=null;ancla=null;if(T3.renderer?.domElement)T3.renderer.domElement.style.filter=filtroAnterior;document.body.classList.remove('ra-recorrido');if(planAnterior!==null){window.KEN_PLANBAV?.ver(planAnterior);planAnterior=null;}if(camAnterior&&T3.camera&&T3.orbit){T3.anim={t:0,dur:1.4,p0:T3.camera.position.clone(),c0:T3.orbit.target.clone(),p1:camAnterior.pos,c1:camAnterior.target};camAnterior=null;}}
  fondo.querySelector('#ra-cerrar').onclick=cerrar;
  function abrir(d,inicial={}){cerrar();def=d;etapa=0;tocadas=new Set();valores=Object.fromEntries(d.sliders.map(s=>[s.k,initialValue(s,inicial)]));filtroAnterior=T3.renderer?.domElement?.style.filter||'';document.body.classList.add('ra-recorrido');if(window.KEN_PLANBAV){planAnterior=window.KEN_PLANBAV.visible;window.KEN_PLANBAV.ver(false);}if(T3.camera&&T3.orbit){camAnterior={pos:T3.camera.position.clone(),target:T3.orbit.target.clone()};T3.anim=null;}/* la cámara se queda donde está: solo cambia el color y aparece el pop-up */fondo.classList.add('on');pintar();Promise.all([datosBav,datosCora,datosAgua]).then(([bav,cora,agua])=>{if(def===d&&etapa===0){ancla=anclaPara(bav,cora,d.par,agua,false);cancelAnimationFrame(frameObjetivo);objetivo();}});}
  function initialValue(s,inicial){return Object.hasOwn(inicial,s.k)?inicial[s.k]:s.val;}

  async function abrirEscena(){if(render||!def)return;const actual=def,[bav,cora,agua]=await Promise.all([datosBav,datosCora,datosAgua]);if(def!==actual||etapa!==1)return;ancla=anclaPara(bav,cora,def.par,agua,true);if(!ancla){escenaEl.querySelector('.ra-ley').textContent='No se pudo ubicar el predio en el mapa.';return;}const escenaEdificio=[2,5,6].includes(def.par),scene=new THREE.Group();scene.name='propuesta_arquitectonica_previa';const c=ancla.centro;const escala=escenaEdificio?Math.min(7,Math.max(1,ancla.largo/28)):1;const foco=new THREE.Vector3(c[0],Math.max(8,8*escala),c[1]);const distancia=escenaEdificio?Math.max(43,ancla.largo*1.3):43;T3.anim={t:0,dur:2.1,p0:T3.camera.position.clone(),c0:T3.orbit.target.clone(),p1:foco.clone().add(new THREE.Vector3(distancia*.58,distancia*.42,distancia)),c1:foco};if(!def.propuesta)return;scene.position.set(c[0],.5,c[1]);scene.scale.setScalar(escala);if(escenaEdificio)scene.rotation.y=ancla.angulo;T3.scene.add(scene);
    scene.add(new THREE.HemisphereLight(0xe8f4ff,0x536047,2.1));const sol=new THREE.DirectionalLight(0xffe7c2,3);sol.position.set(8,17,9);sol.castShadow=true;sol.shadow.mapSize.set(1024,1024);sol.shadow.camera.left=-20;sol.shadow.camera.right=20;sol.shadow.camera.top=20;sol.shadow.camera.bottom=-20;scene.add(sol);
    const tl=new THREE.TextureLoader(), tex=[];function material(nombre,repX=1,repY=1){const dir='data3d/textures/';const col=tl.load(dir+nombre+'_color.jpg');col.colorSpace=THREE.SRGBColorSpace;const norm=tl.load(dir+nombre+'_normal.jpg');for(const t of [col,norm]){t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repX,repY);t.anisotropy=4;tex.push(t);}const m=new THREE.MeshStandardMaterial({map:col,normalMap:norm,roughness:.88});return m;}
    const ladrillo=material('ladrillo',2,1),losa=material('losa',2,2),piso=material('piso',4,4),pasto=material('pasto',6,6),madera=new THREE.MeshStandardMaterial({color:0x75563a,roughness:.73}),metal=new THREE.MeshStandardMaterial({color:0x3d4746,metalness:.7,roughness:.37}),verde=new THREE.MeshStandardMaterial({color:0x4a7441,roughness:1}),vidrio=new THREE.MeshPhysicalMaterial({color:0xa3c9c8,roughness:.16,metalness:.1,transparent:true,opacity:.52}),tierra=new THREE.MeshStandardMaterial({color:0x624630,roughness:1});
    const geo=[],arboles=[],sitiosArbol=[];function caja(x,y,z,w,h,d,m){const g=new THREE.BoxGeometry(w,h,d);geo.push(g);const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;scene.add(o);return o;}function cilindro(x,y,z,r,h,m){const g=new THREE.CylinderGeometry(r,r,h,12);geo.push(g);const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;scene.add(o);return o;}function arbol(x,z,s=1){sitiosArbol.push([x,z,s]);}function flor(x,z){cilindro(x,.17,z,.05,.34,verde);const g=new THREE.SphereGeometry(.12,8,6);geo.push(g);const m=new THREE.MeshStandardMaterial({color:0xe7b65b,roughness:.8});const o=new THREE.Mesh(g,m);o.position.set(x,.37,z);scene.add(o);}
    /* El suelo sigue siendo el terreno real de Kennedy; no superponer otra placa. */
    const p=def.par;
    if(p===2){caja(0,.03,0,8,.25,20,piso);for(const x of [-5,5]){for(const z of [-7,-3,1,5]){caja(x,2.8,z,.4,5.6,.4,metal);caja(x,2.5,z+1.6,.18,4.4,2.8,ladrillo);}caja(x,5.9,0,3,.3,17,metal);}for(const z of [-7,-3,1,5]){caja(0,6.3,z,11,.22,.25,metal);}for(const x of [-8,8])for(const z of [-8,-2,5])arbol(x,z,.8);for(let z=-7;z<=7;z+=1.3)for(const x of [-3.3,3.3])flor(x,z);}
    if(p===3){caja(0,.06,0,15,.2,11,losa);for(const x of [-5,0,5]){caja(x,1.2,0,3.8,2.4,4.4,madera);caja(x,2.7,0,4.6,.2,5.4,metal);caja(x,1.25,2.22,2,.9,.1,vidrio);for(const dz of [-1.3,0,1.3])caja(x-.9,1.3,dz,.14,1.6,.12,metal);}for(const z of [-4.7,4.7])for(let x=-6;x<=6;x+=1.1)flor(x,z);for(const x of [-9,9])arbol(x,1,.7);}
    if(p===4){caja(0,.06,0,25,.2,7,metal);for(const x of [-10,10])caja(x,1.1,0,6,2.2,9,losa);caja(0,2.55,0,19,.5,7,tierra);caja(0,2.88,0,18,.3,6,pasto);for(let x=-8;x<=8;x+=1.3){flor(x,-2.2);flor(x,2.2);}for(const x of [-11,-8,8,11])for(const z of [-5,5])arbol(x,z,.7);for(const x of [-8,8])caja(x,1.3,0,.22,2.6,7,metal);}
    if(p===5){for(const x of [-7,7])for(const z of [-5,5]){caja(x,2.5,z,5.2,5,5.2,ladrillo);caja(x,5.2,z,5.6,.35,5.6,losa);for(const yy of [1.7,3.6])for(const dx of [-1.3,1.3])caja(x+dx,yy,z+2.63,.85,1.25,.08,vidrio);}caja(0,.03,0,8,.15,8,piso);for(const x of [-2.5,0,2.5])for(const z of [-2.5,0,2.5])flor(x,z);for(const x of [-11,11])arbol(x,0,.8);}
    if(p===6){caja(0,.03,0,17,.22,14,piso);for(const x of [-5,5])for(const z of [-4,4])cilindro(x,2.4,z,.22,4.8,metal);caja(0,5.05,0,16,.35,11,madera);caja(0,2,-5,14,4,.25,ladrillo);for(let a=0;a<Math.PI*2;a+=Math.PI/7){const x=2.8*Math.cos(a),z=2.8*Math.sin(a);caja(x,.45,z,1.1,.8,.55,madera);}for(const x of [-9,9])for(const z of [-6,6])arbol(x,z,.75);}
    /* Los modelos vegetales del proyecto sustituyen las copas geométricas. Se normalizan a metros y comparten mallas. */
    if(sitiosArbol.length)Promise.all([import('three/addons/loaders/GLTFLoader.js'),import('three/addons/libs/meshopt_decoder.module.js')]).then(async([{GLTFLoader},{MeshoptDecoder}])=>{
      const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder),partes=await Promise.all(['arbolpeq_L1_madera','arbolpeq_L1_hojas'].map(n=>loader.loadAsync(`data3d/models/${n}.glb`)));
      if(!scene.parent)return;const base=new THREE.Group();for(const gl of partes)base.add(gl.scene);base.updateMatrixWorld(true);
      const bounds=new THREE.Box3().setFromObject(base),alto=Math.max(.1,bounds.max.y-bounds.min.y);
      sitiosArbol.forEach(([x,z,s])=>{const a=base.clone(true),k=4*s/alto;a.position.set(x,-bounds.min.y*k,z);a.scale.setScalar(k);a.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});scene.add(a);arboles.push(a);});
    }).catch(e=>console.warn('árboles del recorrido:',e));
    let animFrame=0;const animar=ms=>{if(!scene.parent)return;const t=ms*.001;arboles.forEach((a,i)=>{a.rotation.z=Math.sin(t*.68+i*.9)*.012;});animFrame=requestAnimationFrame(animar);};animFrame=requestAnimationFrame(animar);
    render=scene;cerrarRender=()=>{cancelAnimationFrame(animFrame);T3.scene.remove(scene);geo.forEach(g=>g.dispose());tex.forEach(t=>t.dispose());[ladrillo,losa,piso,pasto,madera,metal,verde,vidrio,tierra].forEach(m=>m.dispose());scene.traverse(o=>{if(o.isLight&&o.shadow?.map)o.shadow.map.dispose();});cerrarRender=()=>{};};
  }
  return { abrir, cerrar, get abierto(){return fondo.classList.contains('on');} };
}

