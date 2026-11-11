import {development,flat} from './geometry.mjs';
import {format} from '../tubos/gajos/artwork.mjs';
export {format};
export function artwork(g){
  const d=development(g),coord=p=>`${(p[0]-d.min[0]+12).toFixed(4)},${(p[1]-d.min[1]+12).toFixed(4)}`;
  let path=`M${coord(flat(g,0,0))}`;
  if(g.cylinder)path+=` L${coord(flat(g,2*Math.PI,0))} L${coord(flat(g,2*Math.PI,1))} L${coord(flat(g,0,1))}`;
  else{
    // Four exact circular arcs avoid the full-circle SVG ambiguity.
    for(let i=1;i<=4;i++)path+=` A${g.outer},${g.outer} 0 0 1 ${coord(flat(g,i*Math.PI/2,0))}`;
    path+=` L${coord(flat(g,2*Math.PI,1))}`;
    if(g.inner>0)for(let i=3;i>=0;i--)path+=` A${g.inner},${g.inner} 0 0 0 ${coord(flat(g,i*Math.PI/2,1))}`;
  }
  return `<g font-family="Arial,sans-serif" font-size="3"><path d="${path} Z" fill="#e6e6e2" stroke="#df4817" stroke-width=".3"/><text x="12" y="6" fill="#242423">${g.cylinder?'CILINDRO':g.minor===0?'CONO':'TRONCO DE CONO'} · CONSERVAR INTERIOR</text><text x="12" y="${d.height-4}" fill="#242423">Ø ${format(g.major)} / ${format(g.minor)} mm · H ${format(g.height)} mm · sin compensaciones</text></g>`;
}
export function svgDocument(g){const d=development(g);return `<svg xmlns="http://www.w3.org/2000/svg" width="${d.width}mm" height="${d.height}mm" viewBox="0 0 ${d.width} ${d.height}">${artwork(g)}</svg>`;}
export function printDocument(g){
  const d=development(g),cols=Math.max(1,Math.ceil((d.width-10)/180)),rows=Math.max(1,Math.ceil((d.height-10)/230)),count=cols*rows;
  if(count>100)return {html:'',count,cols,rows};
  const drawing=artwork(g);let html='';
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const x=i*180,y=j*230;html+=`<section class="print-page"><h2>DIÁMETRO / CONOS</h2><p>Ø ${format(g.major)} / ${format(g.minor)} mm · H ${format(g.height)} mm · generatriz ${format(g.slant)} mm</p><p>Fila ${j+1}/${rows} · columna ${i+1}/${cols} · origen ${x}, ${y} mm · superponer 10 mm</p><svg xmlns="http://www.w3.org/2000/svg" width="190mm" height="240mm" viewBox="${x} ${y} 190 240">${drawing}<rect x="${x+.15}" y="${y+.15}" width="189.7" height="239.7" fill="none" stroke="#222" stroke-width=".2"/></svg><div class="calibration"></div><p>Control 50 mm · A4 / 100 % / sin ajustar. Sin espesor ni compensaciones.</p></section>`;}
  return {html,count,cols,rows};
}
