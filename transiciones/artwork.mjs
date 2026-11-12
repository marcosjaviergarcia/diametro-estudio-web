import {layout} from './geometry.mjs';
import {format as sharedFormat} from '../tubos/gajos/artwork.mjs';
export const format=v=>sharedFormat(Math.abs(v)<1e-9?0:v);
export function artwork(f){
 const d=layout(f),pts=f.flat.map(p=>[p[0]-d.min[0]+20,p[1]-d.min[1]+20]),coord=p=>p.join(','),font=Math.max(3,Math.min(10,Math.max(d.width,d.height)*.018));
 const edgeLabels=pts.map((p,i)=>{const q=pts[(i+1)%4];return `<text x="${(p[0]+q[0])/2}" y="${(p[1]+q[1])/2-font*.5}" text-anchor="middle">${format(f.edges[i])} mm</text>`;}).join('');
 return `<g font-family="Arial,sans-serif" font-size="${font}" fill="#242423"><polygon data-face="${f.id}" points="${pts.map(coord).join(' ')}" fill="#e2e8e8" stroke="#df4817" stroke-width=".35"/><path d="M ${coord(pts[0])} L ${coord(pts[2])} M ${coord(pts[1])} L ${coord(pts[3])}" fill="none" stroke="#8b9595" stroke-width=".2" stroke-dasharray="2 2"/>${edgeLabels}${pts.map((p,i)=>`<text x="${p[0]}" y="${p[1]+font*1.2}" text-anchor="middle">${f.labels[i]}</text>`).join('')}<text x="10" y="10" font-size="3">CARA ${f.id} · ${f.name} · DESARROLLO EXACTO</text><text x="10" y="${d.height-6}" font-size="3">Conservar interior · sin pestañas ni compensaciones</text></g>`;
}
export function svgDocument(f){const d=layout(f);return `<svg xmlns="http://www.w3.org/2000/svg" width="${d.width}mm" height="${d.height}mm" viewBox="0 0 ${d.width} ${d.height}">${artwork(f)}</svg>`;}
export function printDocument(f){
 const d=layout(f),cols=Math.max(1,Math.ceil((d.width-10)/180)),rows=Math.max(1,Math.ceil((d.height-10)/230)),count=cols*rows;
 if(count>100)return {html:'',count,cols,rows};
 const drawing=artwork(f);let html='';
 for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){const x=i*180,y=j*230;html+=`<section class="print-page"><h2>DIÁMETRO / TRANSICIONES · CARA ${f.id}</h2><p>${f.name} · cara plana exacta · pieza separada · sin compensaciones</p><p>Fila ${j+1}/${rows} · columna ${i+1}/${cols} · origen ${x}, ${y} mm · solape 10 mm</p><svg xmlns="http://www.w3.org/2000/svg" width="190mm" height="240mm" viewBox="${x} ${y} 190 240">${drawing}<rect x="${x+.15}" y="${y+.15}" width="189.7" height="239.7" fill="none" stroke="#222" stroke-width=".2"/></svg><div class="calibration"></div><p>Control 50 mm · A4 / 100 % / sin ajustar.</p></section>`;}
 return {html,count,cols,rows};
}
