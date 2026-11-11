import {calculate,development} from './geometry.mjs';
import {artwork,svgDocument,printDocument,format as fmt} from './artwork.mjs';
import {mountView} from './view3d.js';
const $=id=>document.getElementById(id),view=mountView($('model'),()=>{$('webgl-error').hidden=false;});
let result,current,scale=4,fit=true;
function resize(){const svg=$('preview').querySelector('svg');if(!svg||!current)return;if(fit)scale=Math.min($('preview').clientWidth/current.width,480/current.height);svg.style.width=current.width*scale+'px';svg.style.height=current.height*scale+'px';}
function update(){try{
  result=calculate(Object.fromEntries(['major','minor','height'].map(k=>[k,$(k).valueAsNumber])));const g=result;current=development(g);$('error').hidden=true;
  $('kind').textContent=g.cylinder?'Cilindro · caso límite':g.minor===0?'Cono completo':'Tronco de cono';
  $('stats').innerHTML=[['Generatriz',fmt(g.slant),'mm'],['Ángulo del sector',g.cylinder?'No aplica':fmt(g.sector*180/Math.PI),g.cylinder?'':'°']].map(([label,v,u])=>`<div class="stat"><small>${label}</small><strong>${v}</strong> ${u}</div>`).join('');
  const rows=[['Diámetro mayor',g.major,'mm'],['Diámetro menor',g.minor,'mm'],['Altura axial',g.height,'mm'],['Generatriz lateral',g.slant,'mm'],['Radio exterior del desarrollo',g.outer,'mm'],['Radio interior del desarrollo',g.inner,'mm'],['Ángulo del sector',g.sector===null?null:g.sector*180/Math.PI,'°'],['Circunferencia inferior / borde mayor',g.bottom,'mm'],['Circunferencia superior / borde menor',g.top,'mm'],['Área lateral',g.area,'mm²']];
  $('dimensions').innerHTML=rows.map(([label,v,unit])=>`<tr><td>${label}</td><td>${v===null?'No aplica · desarrollo rectangular':`${fmt(v)} ${unit}`}</td></tr>`).join('');
  $('preview').innerHTML=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${current.width} ${current.height}" role="img" aria-label="Desarrollo a escala de la superficie lateral">${artwork(g)}</svg>`;resize();view.update(g);
  const p=printDocument(g);$('print-pages').innerHTML=p.html;$('print').disabled=p.count>100;$('download').disabled=false;
  $('paper-note').textContent=`Hoja de desarrollo: ${fmt(current.width)} × ${fmt(current.height)} mm, con márgenes de papel. ${p.count} hojas A4 (${p.cols} × ${p.rows}).${p.count>100?' Supera el límite de 100 hojas: usá el SVG completo.':''}`;
}catch(e){result=current=null;$('error').textContent=e.message;$('error').hidden=false;for(const k of ['stats','dimensions','preview','paper-note','print-pages'])$(k).textContent='';$('kind').textContent='Revisá las medidas';$('print').disabled=$('download').disabled=true;view.update(null);}}
$('form').addEventListener('input',update);$('form').addEventListener('submit',e=>{e.preventDefault();update();});$('complete').addEventListener('click',()=>{$('minor').value='0';update();});$('reset').addEventListener('click',()=>view.reset?.());
for(const [id,factor] of [['zoom-in',1.25],['zoom-out',.8]])$(id).addEventListener('click',()=>{fit=false;scale=Math.max(.001,Math.min(20,scale*factor));resize();});$('zoom-fit').addEventListener('click',()=>{fit=true;resize();});$('zoom-read').addEventListener('click',()=>{fit=false;scale=4;resize();});new ResizeObserver(resize).observe($('preview'));
$('print').addEventListener('click',()=>{if(result&&!$('print').disabled)window.print();});$('download').addEventListener('click',()=>{if(!result)return;const url=URL.createObjectURL(new Blob([svgDocument(result)],{type:'image/svg+xml;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`diametro-cono-${result.major}-${result.minor}-H${result.height}.svg`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});update();
