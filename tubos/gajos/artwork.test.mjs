import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,template,pageLayout} from './geometry.mjs';
import {svgDocument,printDocument} from './artwork.mjs';
const result=calculate({diameter:50,radius:75,angle:90,joints:3});
test('SVG conserva dos bordes, datum común y milímetros para todos los tipos',()=>{
  for(const p of result.pieces){
    const t=template(p),svg=svgDocument(p);
    assert.ok(svg.includes(`width="${t.width}mm" height="${t.height}mm" viewBox="0 0 ${t.width} ${t.height}"`));
    for(const [edge,key] of [['a','lower'],['b','upper']]){
      const d=svg.match(new RegExp(`data-edge="${edge}" d="([^"]+)"`))[1];
      const points=[...d.matchAll(/[ML]([\d.-]+),([\d.-]+)/g)].map(m=>[+m[1],+m[2]]);
      assert.equal(points.length,t.samples.length);
      points.forEach(([x,y],i)=>{assert.ok(Math.abs(x-t.samples[i].u)<.000051);assert.ok(Math.abs(y-t.samples[i][key])<.000051);});
    }
  }
});
test('A4 mantiene escala y solape con varias columnas y filas',()=>{
  const r=calculate({diameter:300,radius:500,angle:90,joints:1}),p=r.pieces[0],t=template(p),layout=pageLayout(t),html=printDocument(r,p);
  assert.equal((html.match(/class="print-page"/g)||[]).length,layout.count);
  for(let row=0;row<layout.rows;row++)for(let col=0;col<layout.cols;col++)assert.ok(html.includes(`width="190mm" height="240mm" viewBox="${col*180} ${row*230} 190 240"`));
  assert.ok(html.includes('Control 50 mm'));
});
test('Plantillas terminales conservan un borde a escuadra diferente',()=>{
  const a=template(result.pieces[0]),b=template(result.pieces.at(-1));
  assert.equal(new Set(a.samples.map(s=>s.lower)).size,1);assert.equal(new Set(b.samples.map(s=>s.upper)).size,1);
  assert.ok(new Set(a.samples.map(s=>s.upper)).size>1);assert.ok(new Set(b.samples.map(s=>s.lower)).size>1);
});
test('Límite de impresión no trunca ni impide SVG completo',()=>{
  const r=calculate({diameter:300,radius:10000,angle:90,joints:1}),p=r.pieces[0];
  assert.ok(pageLayout(template(p)).count>100);assert.equal(printDocument(r,p),'');assert.ok(svgDocument(p).endsWith('</svg>'));
});
