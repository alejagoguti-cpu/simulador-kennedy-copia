/* Lectura espacial del indicador: solo usa puntos con coordenadas del modelo semanal. */
import { INDK, valor, T } from './indicadores_macro.js?v=2';

export function iniciarIndicadoresEscena({ R, getM, T3 }) {
  if (!T3?.camera || !T3.THREE) return { elegir() {} };
  const caja = document.createElement('div'); caja.id = 'ie-capa'; caja.setAttribute('aria-live', 'polite');
  caja.innerHTML = '<div class="ie-rotulo"><span>LECTURA EN EL TERRITORIO</span><b></b><small></small></div><svg aria-hidden="true"></svg>';
  document.body.appendChild(caja);
  const css = document.createElement('style'); css.textContent = `
    #ie-capa{position:fixed;inset:0;z-index:37;pointer-events:none;font-family:var(--ui-sans,system-ui);display:none}
    #ie-capa.on{display:block}#ie-capa svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
    #ie-capa .ie-rotulo{position:absolute;top:116px;left:50%;transform:translateX(-50%);max-width:min(400px,70vw);padding:9px 13px;background:var(--ui-glass);border:1px solid var(--ui-glass-bd);border-radius:10px;box-shadow:var(--ui-glass-sh);backdrop-filter:var(--ui-glass-fx);text-align:center;color:#e5eee7}
    #ie-capa .ie-rotulo span{display:block;font:600 9px var(--ui-mono);letter-spacing:.1em;color:var(--ui-acc-tx)}
    #ie-capa .ie-rotulo b{display:block;font:600 15px var(--ui-sans);margin:2px 0}
    #ie-capa .ie-rotulo small{font:11px var(--ui-mono);color:#d2e3bf}
    #ie-capa .ie-halo{fill:none;stroke:var(--ui-acc);stroke-width:1.3;animation:ie-onda 2.6s ease-out infinite;transform-box:fill-box;transform-origin:center}
    #ie-capa .ie-nodo{fill:#c9f27a;stroke:#0a1514;stroke-width:2}
    #ie-capa .ie-tallo{stroke:#c9f27a;stroke-width:1.2;opacity:.72;stroke-dasharray:3 5;animation:ie-flujo 1.7s linear infinite}
    #ie-capa .ie-ruta{fill:none;stroke:#c9f27a;stroke-width:1.4;stroke-dasharray:5 7;opacity:.68;animation:ie-flujo 2s linear infinite}
    #ie-capa .ie-carga{fill:#e2f2bf;stroke:#132119;stroke-width:1.5}
    #ie-capa .ie-valor{fill:#ecf2e9;stroke:#0a1514;stroke-width:3;paint-order:stroke;font:600 12px var(--ui-mono)}
    #ie-capa .ie-mal .ie-halo,#ie-capa .ie-mal .ie-tallo{stroke:#d99370}#ie-capa .ie-mal .ie-nodo{fill:#d99370}
    @keyframes ie-onda{0%{opacity:.9;transform:scale(.6)}100%{opacity:0;transform:scale(2.2)}}
    @keyframes ie-flujo{to{stroke-dashoffset:-16}}
    .pi-card .pi-mapa{border:1px solid var(--ui-bd2);background:var(--ui-glass);color:var(--ui-acc-tx);border-radius:7px;padding:5px 8px;font:600 10px var(--ui-mono);cursor:pointer}
    .pi-card .pi-mapa[aria-pressed="true"]{background:var(--ui-acc-bg);border-color:var(--ui-acc)}
    @media(max-width:760px){#ie-capa .ie-rotulo{top:69px;left:50%;max-width:60vw}#ie-capa .ie-rotulo b{font-size:12px}}
    @media(prefers-reduced-motion:reduce){#ie-capa .ie-halo,#ie-capa .ie-tallo{animation:none}}
  `; document.head.appendChild(css);
  const svg=caja.querySelector('svg'), title=caja.querySelector('b'), detail=caja.querySelector('small');
  const V3=T3.THREE.Vector3; let clave=null, semana=-1, nodos=[], marcas=[],rutas=[],tramos=[];
  const valido=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
  function puntos(I,k){
    const macro=INDK[k]?.macro;
    if(k==='presion')return (I.especulacion?.zonas||[]).filter(valido).slice(0,12).map(p=>({x:p.x,z:p.z,v:Math.round(p.indice),mal:p.indice>1.3,n:'Zona de suelo'}));
    if (I.gobernanza?.barrios?.length && R.def?.par===6) return I.gobernanza.barrios.filter(valido).map(p=>({x:p.x,z:p.z,v:null,mal:p.cobertura<.8,n:p.n}));
    if(macro==='circ') return (T(I).estaciones||[]).filter(valido).map(p=>({x:p.x,z:p.z,v:k==='saturacion'?Math.round(p.valor||0):null,mal:p.valor>100,n:p.n||'Estación Circular'}));
    if(macro==='eco') return (I.avesRuido?.porParche||[]).filter(valido).slice(0,12).map(p=>({x:p.x,z:p.z,v:k==='ruido'?p.db:null,mal:k==='ruido'?p.db>60:false,n:p.n}));
    return (T(I).sectores||[]).filter(valido).slice(0,12).map(p=>({x:p.x,z:p.z,v:k==='cobertura'?Math.round(p.valor||0):null,mal:p.valor<80,n:p.n}));
  }
  function refrescar(){
    const I=R.hist?.at(-1), d=INDK[clave];
    const visible=!!(I&&d&&R.def?.par>=2&&R.def?.par<=6&&!document.body.classList.contains('ra-recorrido'));
    caja.classList.toggle('on',visible); if(!visible)return;
    if(I.sem===semana)return; semana=I.sem;
    const global=valor(clave,I,{H:R.hist,M:getM()}), cifra=global==null?'sin dato':`${global.toLocaleString('es-CO',{maximumFractionDigits:d.d})}${d.u?' '+d.u:''}`;
    title.textContent=d.n; detail.textContent=`Semana ${I.sem} · ${cifra}`;
    nodos=puntos(I,clave);svg.replaceChildren();
    const raw=d.macro==='circ'&&R.def?.par===3?I.estaciones?.recorridos:d.macro==='com'?I.abasto?.rutas:null;
    rutas=(raw||[]).filter(r=>valido(r.de)&&valido(r.a)&&r.t_dia>0).sort((a,b)=>b.t_dia-a.t_dia).slice(0,8);
    tramos=rutas.map(()=>{const linea=document.createElementNS('http://www.w3.org/2000/svg','path'),carga=document.createElementNS('http://www.w3.org/2000/svg','circle');linea.setAttribute('class','ie-ruta');carga.setAttribute('class','ie-carga');carga.setAttribute('r','3');svg.append(linea,carga);return{linea,carga};});
    marcas=nodos.map((p,i)=>{
      const g=document.createElementNS('http://www.w3.org/2000/svg','g'); if(p.mal)g.classList.add('ie-mal');
      g.innerHTML=`<line class="ie-tallo" x1="0" y1="0" x2="0" y2="-30"/><circle class="ie-halo" cx="0" cy="0" r="10" style="animation-delay:${i%5*.26}s"/><circle class="ie-nodo" cx="0" cy="0" r="4"/><text class="ie-valor" x="8" y="-28">${Number.isFinite(p.v)?p.v:''}</text>`;
      g.querySelector('text').textContent=Number.isFinite(p.v)?String(p.v):'';g.setAttribute('aria-label',`${p.n}: ${p.v}`);svg.appendChild(g);return g;
    });
  }
  let anterior=0;
  function mover(ms){requestAnimationFrame(mover);if(ms-anterior<33)return;anterior=ms;refrescar();if(!caja.classList.contains('on'))return;
    const w=innerWidth,h=innerHeight,proyectar=p=>{const v=new V3(p.x,4,p.z).project(T3.camera);return {x:(v.x+1)*w/2,y:(1-v.y)*h/2,visible:v.z<1&&v.z>-1&&v.x>-1&&v.x<1&&v.y>-1&&v.y<1};};
    for(let i=0;i<marcas.length;i++){const q=proyectar(nodos[i]);marcas[i].style.display=q.visible?'':'none';marcas[i].setAttribute('transform',`translate(${q.x.toFixed(1)} ${q.y.toFixed(1)})`);}
    for(let i=0;i<tramos.length;i++){const a=proyectar(rutas[i].de),b=proyectar(rutas[i].a),t=(ms*.00018+i*.17)%1,{linea,carga}=tramos[i];linea.style.display=carga.style.display=a.visible&&b.visible?'':'none';linea.setAttribute('d',`M${a.x.toFixed(1)} ${a.y.toFixed(1)}L${b.x.toFixed(1)} ${b.y.toFixed(1)}`);carga.setAttribute('cx',String(a.x+(b.x-a.x)*t));carga.setAttribute('cy',String(a.y+(b.y-a.y)*t));}
  }requestAnimationFrame(mover);
  return {elegir(k){clave=clave===k?null:k;semana=-1;document.querySelectorAll('.pi-mapa').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mapa===clave)));}};
}

