import {calculate,template,pageLayout} from './geometry.mjs';
import {artwork,svgDocument,printDocument,format as fmt} from './artwork.mjs';
import {mountView} from './view3d.js';
const $=id=>document.getElementById(id);
const view=mountView($('model'),$('marks'),()=>{$('webgl-error').hidden=false;});
let result,selected=0,solo=false,scale=4,fit=true,current;
function resize(){
  const svg=$('preview').querySelector('svg');if(!svg||!current)return;
  if(fit)scale=Math.min($('preview').clientWidth/current.width,480/current.height);
  svg.style.width=current.width*scale+'px';svg.style.height=current.height*scale+'px';
}
function select(){
  if(!result)return;selected=Number($('piece').value);const p=result.pieces[selected];current=template(p);
  $('preview').innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${current.width} ${current.height}" role="img" aria-label="Pieza ${p.id}: conservar entre dos bordes">${artwork(p)}</svg>`;
  $('offsets').innerHTML=current.offsets.map(o=>`<tr><td>${o.degrees}°</td><td>${fmt(o.u)}</td><td>${fmt(o.lo)}</td><td>${fmt(o.hi)}</td><td>${fmt(o.length)}</td></tr>`).join('');
  const pages=pageLayout(current);$('paper-note').textContent=`P${p.id} ${p.type}: ${fmt(current.width)} × ${fmt(current.height)} mm con margen y pestaña. ${pages.count} hoja${pages.count===1?'':'s'} A4 (${pages.cols} × ${pages.rows}). ${p.type==='Intermedio'?`Repetir ${result.joints-1} piezas intermedias.`:''}${pages.count>100?' La impresión supera el límite de 100 hojas por pieza; descargá el SVG 1:1.':''}`;
  $('print-pages').innerHTML=printDocument(result,p);$('print').disabled=pages.count>100;$('download').disabled=false;
  resize();view.update(result,selected,solo);
}
function update(){
  try{
    result=calculate(Object.fromEntries(['diameter','radius','angle','joints'].map(k=>[k,$(k).valueAsNumber])));$('error').hidden=true;
    const r=result;
    $('stats').innerHTML=[['Piezas',r.pieces.length,''],['Corte desde escuadra β',r.beta*180/Math.PI,'°'],['Desvío por unión δ',r.delta*180/Math.PI,'°'],['Profundidad de un corte',r.depth,'mm']].map(([label,value,unit])=>`<div class="stat"><small>${label}</small><strong>${fmt(value)}</strong> ${unit}</div>`).join('');
    $('summary').textContent=`R de referencia al eje: ${fmt(r.radius)} mm. Suma de longitudes al eje: ${fmt(r.total)} mm; arco ideal: ${fmt(r.arc)} mm. Diferencia radial en los vértices: ${fmt(r.deviation)} mm. Mínima longitud terminal: ${fmt(r.pieces[0].min)} mm. Estas cotas no son un plan de consumo de material.`;
    $('pieces').innerHTML=r.pieces.map(p=>`<tr><td>P${p.id}</td><td>${p.type}</td><td>${fmt(p.length)}</td><td>${fmt(p.min)}</td><td>${fmt(p.max)}</td></tr>`).join('');
    selected=Math.min(selected,r.pieces.length-1);$('piece').innerHTML=r.pieces.map((p,i)=>`<option value="${i}" ${i===selected?'selected':''}>P${p.id} · ${p.type}</option>`).join('');$('piece').disabled=false;select();
  }catch(e){result=current=null;$('error').textContent=e.message;$('error').hidden=false;for(const id of ['stats','summary','pieces','piece','preview','offsets','paper-note','print-pages'])$(id).textContent='';$('print').disabled=$('download').disabled=$('piece').disabled=true;view.update(null);}
}
$('form').addEventListener('input',update);$('form').addEventListener('submit',e=>{e.preventDefault();update();});$('piece').addEventListener('change',select);
for(const [id,flag] of [['assembly',false],['isolated',true]])$(id).addEventListener('click',()=>{solo=flag;$('assembly').setAttribute('aria-pressed',String(!solo));$('isolated').setAttribute('aria-pressed',String(solo));view.update(result,selected,solo);});
$('references').addEventListener('click',()=>{const active=$('references').getAttribute('aria-pressed')!=='true';$('references').setAttribute('aria-pressed',String(active));view.setReferences?.(active);});
$('reset').addEventListener('click',()=>view.reset?.());
for(const [id,factor] of [['zoom-in',1.25],['zoom-out',.8]])$(id).addEventListener('click',()=>{fit=false;scale=Math.max(.01,Math.min(20,scale*factor));resize();});
$('zoom-fit').addEventListener('click',()=>{fit=true;resize();});$('zoom-read').addEventListener('click',()=>{fit=false;scale=4;resize();});new ResizeObserver(resize).observe($('preview'));
$('print').addEventListener('click',()=>{if(result&&!$('print').disabled)window.print();});
$('download').addEventListener('click',()=>{if(!result)return;const p=result.pieces[selected],url=URL.createObjectURL(new Blob([svgDocument(p)],{type:'image/svg+xml;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`diametro-gajos-D${result.diameter}-R${result.radius}-A${result.angle}-n${result.joints}-P${p.id}.svg`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
update();
