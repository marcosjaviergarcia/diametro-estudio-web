import {template,pageLayout} from './geometry.mjs';
const n=v=>v.toFixed(4);
export const format=v=>v.toLocaleString('es-AR',{maximumFractionDigits:Math.abs(v)>0&&Math.abs(v)<.01?6:2});
export function artwork(piece) {
  const t=template(piece),path=(key)=>t.samples.map((s,i)=>`${i?'L':'M'}${n(s.u)},${n(s[key])}`).join(' ');
  const a=path('lower'),b=path('upper'),fill=a+' '+[...t.samples].reverse().map(s=>`L${n(s.u)},${n(s.upper)}`).join(' ')+' Z';
  return `<g font-family="Arial,sans-serif" font-size="3" fill="#242423"><path d="${fill}" fill="#e6e6e2"/><rect x="${t.circumference}" y="8" width="10" height="${t.height-16}" fill="#f4f4f4" stroke="#999" stroke-width=".15" stroke-dasharray="1 2"/>${t.offsets.map(o=>`<line x1="${o.u}" x2="${o.u}" y1="8" y2="${t.height-8}" stroke="#999" stroke-width=".15" stroke-dasharray="1 2"/><text x="${o.u}" y="5" text-anchor="${o.degrees===0?'start':o.degrees===360?'end':'middle'}">${o.degrees}°</text>`).join('')}<path data-edge="a" d="${a}" fill="none" stroke="#df4817" stroke-width=".35"/><path data-edge="b" d="${b}" fill="none" stroke="#df4817" stroke-width=".35"/><text x="2" y="${t.height-3}">P${piece.id} · ${piece.type} · CONSERVAR ENTRE BORDES</text></g>`;
}
export function svgDocument(piece) {
  const t=template(piece);return `<svg xmlns="http://www.w3.org/2000/svg" width="${t.width}mm" height="${t.height}mm" viewBox="0 0 ${t.width} ${t.height}"><title>P${piece.id} ${piece.type} · Ø${2*piece.r} mm · corte ${Math.atan(piece.tan)*180/Math.PI}° desde escuadra</title>${artwork(piece)}</svg>`;
}
export function printDocument(result,piece) {
  const t=template(piece),p=pageLayout(t),drawing=artwork(piece);
  if(p.count>100) return ''; // Explicit UI warning, never silently truncate a template.
  let html='';
  for(let row=0;row<p.rows;row++)for(let col=0;col<p.cols;col++){
    const x=col*180,y=row*230;
    html+=`<section class="print-page"><h2>DIÁMETRO / GAJOS · P${piece.id} ${piece.type}</h2><p>Ø${format(result.diameter)} mm · R al eje ${format(result.radius)} mm · A ${format(result.angle)}° · ${result.joints} uniones · corte ${format(result.beta*180/Math.PI)}°</p><p>Fila ${row+1}/${p.rows} · columna ${col+1}/${p.cols} · origen ${x}, ${y} mm · superponer 10 mm</p><svg xmlns="http://www.w3.org/2000/svg" width="190mm" height="240mm" viewBox="${x} ${y} 190 240">${drawing}<rect x="${x+.15}" y="${y+.15}" width="189.7" height="239.7" fill="none" stroke="#222" stroke-width=".2"/></svg><div class="calibration"></div><p>Control 50 mm · A4 / 100 % / sin ajustar. Conservar entre bordes; costura 0° exterior.</p></section>`;
  }return html;
}
