/* Lectura espacial del indicador: solo usa puntos con coordenadas del modelo semanal. */
import { INDK, valor, T } from './indicadores_macro.js?v=2';

export function iniciarIndicadoresEscena({ R, getM }) {
  const T3 = window.KEN_T3;
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
  const V3=T3.THREE.Vector3; let clave=null, semana=-1, nodos=[], marcas=[];
  const valido=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.z);
  function puntos(I,k){
    const macro=INDK[k]?.macro;
    if (I.gobernanza?.barrios?.length && R.def?.par===6) return I.gobernanza.barrios.filter(valido).map(p=>({x:p.x,z:p.z,v:Math.round(p.cobertura*100),mal:p.cobertura<.8,n:p.n}));
    if(macro==='circ') return (T(I).estaciones||[]).filter(valido).map(p=>({x:p.x,z:p.z,v:Math.round(p.valor||0),mal:p.valor>100,n:p.n||'Estación Circular'}));
    if(macro==='eco') return (I.avesRuido?.porParche||[]).filter(valido).slice(0,12).map(p=>({x:p.x,z:p.z,v:k==='ruido'?p.db:p.aves,mal:k==='ruido'?p.db>60:false,n:p.n}));
    return (T(I).sectores||[]).filter(valido).slice(0,12).map(p=>({x:p.x,z:p.z,v:Math.round(p.valor||0),mal:p.valor<80,n:p.n}));
  }
  function refrescar(){
    const I=R.hist?.at(-1), d=INDK[clave];
    const visible=!!(I&&d&&R.def?.par>=2&&R.def?.par<=6&&!document.body.classList.contains('ra-recorrido'));
    caja.classList.toggle('on',visible); if(!visible)return;
    if(I.sem===semana)return; semana=I.sem;
    const global=valor(clave,I,{H:R.hist,M:getM()}), cifra=global==null?'sin dato':`${global.toLocaleString('es-CO',{maximumFractionDigits:d.d})}${d.u?' '+d.u:''}`;
    title.textContent=d.n; detail.textContent=`Semana ${I.sem} · ${cifra}`;
    nodos=puntos(I,clave); svg.replaceChildren(); marcas=nodos.map((p,i)=>{
      const g=document.createElementNS('http://www.w3.org/2000/svg','g'); if(p.mal)g.classList.add('ie-mal');
      g.innerHTML=`<line class="ie-tallo" x1="0" y1="0" x2="0" y2="-30"/><circle class="ie-halo" cx="0" cy="0" r="10" style="animation-delay:${i%5*.26}s"/><circle class="ie-nodo" cx="0" cy="0" r="4"/><text class="ie-valor" x="8" y="-28">${Number.isFinite(p.v)?p.v:''}</text>`;
      g.querySelector('text').textContent=Number.isFinite(p.v)?String(p.v):'';g.setAttribute('aria-label',`${p.n}: ${p.v}`);svg.appendChild(g);return g;
    });
  }
  let anterior=0;
  function mover(ms){requestAnimationFrame(mover);if(ms-anterior<33)return;anterior=ms;refrescar();if(!caja.classList.contains('on'))return;
    const w=innerWidth,h=innerHeight;for(let i=0;i<marcas.length;i++){const p=nodos[i],v=new V3(p.x,4,p.z).project(T3.camera);marcas[i].style.display=v.z<1&&v.z>-1&&v.x>-1&&v.x<1&&v.y>-1&&v.y<1?'':'none';marcas[i].setAttribute('transform',`translate(${((v.x+1)*w/2).toFixed(1)} ${((1-v.y)*h/2).toFixed(1)})`);}
  }requestAnimationFrame(mover);
  return {elegir(k){clave=clave===k?null:k;semana=-1;document.querySelectorAll('.pi-mapa').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mapa===clave)));}};
}

