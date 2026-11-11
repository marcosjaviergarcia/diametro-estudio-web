import {format as sharedFormat} from '../tubos/gajos/artwork.mjs';
const format=v=>sharedFormat(Math.abs(v)<1e-9?0:v);
export {format};
export function layout(g){const extent=(g.pcd+g.diameter)/2,margin=Math.max(18,g.pcd*.12);return {size:2*(extent+margin),center:extent+margin,extent,margin};}
export function artwork(g,{selected=0,interactive=false}={}){
  const {size,center:c,extent:e,margin:m}=layout(g),font=Math.max(3,Math.min(12,g.pcd*.04)),stroke=Math.max(.15,Math.min(.5,g.pcd/1000));
  const affected=new Set(g.pairs.flatMap(p=>[p.a,p.b]));
  const holes=g.points.map(p=>{const x=c+p.x,y=c-p.y,color=affected.has(p.id)?'#ac260c':'#242423';return `<g data-hole="${p.id}" ${interactive?`role="button" tabindex="0" aria-label="Agujero ${p.id}, X ${format(p.x)} mm, Y ${format(p.y)} mm" aria-pressed="${selected===p.id}"`:''}><circle class="hole" cx="${x}" cy="${y}" r="${g.diameter/2}" fill="${selected===p.id?'#ffd3bf':'#ffffff'}" stroke="${color}" stroke-width="${stroke}"/><path d="M ${x-1} ${y} h 2 M ${x} ${y-1} v 2" stroke="${color}" stroke-width=".12"/><text x="${x}" y="${y-g.diameter/2-font*.5}" text-anchor="middle" fill="${color}">${p.id}</text></g>`;}).join('');
  return `<g font-family="Arial,sans-serif" font-size="${font}"><path d="M ${c-e} ${c} H ${c+e} M ${c} ${c-e} V ${c+e}" stroke="#85857f" stroke-width="${stroke}" stroke-dasharray="2 2"/><circle cx="${c}" cy="${c}" r="${g.radius}" fill="none" stroke="#85857f" stroke-width="${stroke}" stroke-dasharray="2 2"/>${holes}<text x="${c+e}" y="${c+g.diameter/2+font*2}" text-anchor="end">+X / 0°</text><text x="${c+font}" y="${c-e-font}">+Y / 90°</text><text x="${c+font}" y="${c+font*1.5}">O</text><path d="M ${c-g.radius} ${c+e+m*.45} h ${g.pcd} m 0 -2 v 4 m ${-g.pcd} -4 v 4" stroke="#df4817" stroke-width="${stroke}"/><text x="${c}" y="${c+e+m*.45-font*.4}" text-anchor="middle">PCD Ø ${format(g.pcd)} mm</text><text x="${c}" y="${size-font*.7}" text-anchor="middle">${g.count} × Ø ${format(g.diameter)} mm · inicio ${format(g.start)}°</text></g>`;
}
export function svgDocument(g){const {size}=layout(g);return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}mm" height="${size}mm" viewBox="0 0 ${size} ${size}"><title>Patrón circular · ${g.status==='clear'?'sin interferencias':g.status==='tangent'?'agujeros tangentes':'agujeros superpuestos'}</title>${artwork(g)}</svg>`;}
export function printDocument(g){
  const {size}=layout(g),cols=Math.max(1,Math.ceil((size-10)/180)),rows=Math.max(1,Math.ceil((size-10)/230)),count=cols*rows;
  if(count>100)return {html:'',count,cols,rows};
  const drawing=artwork(g);let html='';
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const x=i*180,y=j*230;html+=`<section class="print-page"><h2>DIÁMETRO / PERFORACIONES</h2><p>PCD ${format(g.pcd)} mm · ${g.count} × Ø ${format(g.diameter)} mm · ${g.status==='clear'?'Sin interferencias':g.status==='tangent'?'ATENCIÓN: agujeros tangentes':'ATENCIÓN: agujeros superpuestos'}</p><p>Fila ${j+1}/${rows} · columna ${i+1}/${cols} · origen ${x}, ${y} mm · solape 10 mm</p><svg xmlns="http://www.w3.org/2000/svg" width="190mm" height="240mm" viewBox="${x} ${y} 190 240">${drawing}<rect x="${x+.15}" y="${y+.15}" width="189.7" height="239.7" fill="none" stroke="#222" stroke-width=".2"/></svg><div class="calibration"></div><p>Control 50 mm · A4 / 100 % / sin ajustar.</p></section>`;}
  return {html,count,cols,rows};
}


