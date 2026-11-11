import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,flat,surface,development} from './geometry.mjs';
import {svgDocument,printDocument} from './artwork.mjs';
const near=(a,b,t=1e-7)=>assert.ok(Math.abs(a-b)<=t*Math.max(1,Math.abs(b)),`${a} != ${b}`);
test('Cono 3-4-5: radios y sector de 216 grados',()=>{const g=calculate({major:6,minor:0,height:4});near(g.slant,5);near(g.outer,5);near(g.inner,0);near(g.sector*180/Math.PI,216);near(g.area,15*Math.PI);});
test('Tronco conocido 200/100 H120',()=>{const g=calculate({major:200,minor:100,height:120});near(g.slant,130);near(g.outer,260);near(g.inner,130);near(g.sector*180/Math.PI,1800/13);near(g.area,19500*Math.PI);});
const cases=[[200,100,120],[6,0,4],[100,0,.01],[200,199.999999,120],[100,100,40],[10000,1,10000],[1,0,10000]];
for(const [major,minor,height] of cases)test(`Isometría y circunferencias ${major}/${minor}/${height}`,()=>{
  const g=calculate({major,minor,height});
  if(!g.cylinder){near(g.outer*g.sector,g.bottom);near(g.inner*g.sector,g.top);near(Math.PI*(g.R+g.r)*g.slant,g.area);}
  for(let i=0;i<=24;i++){
    const theta=i*2*Math.PI/24,a=surface(g,theta,0),b=surface(g,theta,1),u=flat(g,theta,0),v=flat(g,theta,1);
    near(Math.hypot(...a.map((x,k)=>x-b[k])),g.slant);near(Math.hypot(...u.map((x,k)=>x-v[k])),g.slant);
    near(Math.hypot(a[0],a[1]),g.R);near(Math.hypot(b[0],b[1]),g.r);
  }
  for(const t of [0,.3,.7,1]){
    const a=surface(g,0,t),b=surface(g,2*Math.PI,t);a.forEach((v,k)=>near(v,b[k]));
    // Intrinsic circumferential metric: rho * dphi = radius * dtheta.
    if(!g.cylinder)near(((g.R-g.difference*t)/g.ratio)*g.ratio,g.R-g.difference*t);
  }
  const d=development(g);assert.ok(Number.isFinite(d.width)&&Number.isFinite(d.height));
  for(const theta of Array.from({length:501},(_,i)=>i*2*Math.PI/500))for(const t of [0,1]){const p=flat(g,theta,t);assert.ok(p[0]>=d.min[0]-1e-7&&p[0]<=d.min[0]+d.width-24+1e-7);assert.ok(p[1]>=d.min[1]-1e-7&&p[1]<=d.min[1]+d.height-24+1e-7);}
});
test('Límite cilíndrico estable, sin radios infinitos',()=>{const c=calculate({major:200,minor:200,height:120}),g=calculate({major:200,minor:199.999999,height:120});assert.equal(c.outer,null);assert.equal(c.sector,null);const d=development(c);near(d.width,200*Math.PI+24);near(d.height,144);for(const theta of [0,1,3,5,2*Math.PI])for(const t of [0,.5,1]){const a=flat(g,theta,t),b=flat(c,theta,t);a.forEach((v,k)=>near(v,b[k],1e-5));}});
test('Validaciones y límites',()=>{for(const change of [{major:0},{minor:-1},{minor:201},{height:0},{major:10001},{height:10001},{minor:NaN},{height:Infinity}])assert.throws(()=>calculate({major:200,minor:100,height:120,...change}));});
test('SVG usa arcos circulares y escala física; cilindro usa rectángulo',()=>{for(const [major,minor,height] of cases){const g=calculate({major,minor,height}),d=development(g),s=svgDocument(g);assert.ok(s.includes(`width="${d.width}mm" height="${d.height}mm"`));assert.equal((s.match(/ A/g)||[]).length,g.cylinder?0:minor===0?4:8);assert.ok(!s.includes('NaN')&&!s.includes('Infinity'));}});
test('Paginación conserva escala y cubre todo el desarrollo',()=>{const g=calculate({major:400,minor:100,height:300}),d=development(g),p=printDocument(g);assert.equal((p.html.match(/class="print-page"/g)||[]).length,p.count);assert.ok(p.cols*180+10>=d.width&&p.rows*230+10>=d.height);assert.ok(p.html.includes('width="190mm" height="240mm"'));assert.ok(p.html.includes('Control 50 mm'));});
test('Límite de impresión explícito y SVG completo',()=>{const g=calculate({major:10000,minor:0,height:10000});assert.equal(printDocument(g).html,'');assert.ok(printDocument(g).count>100);assert.ok(svgDocument(g).endsWith('</svg>'));});
test('Arcos SVG serializados conservan las circunferencias con error menor a 0,001 mm',()=>{
  for(const [major,minor,height] of cases){const g=calculate({major,minor,height});if(g.cylinder)continue;
    const d=svgDocument(g).match(/<path d="([^"]+)"/)[1],commands=[...d.matchAll(/([MLA])([^MLAZ]+)/g)];let current,outer=0,inner=0,index=0;
    for(const [,command,values] of commands){const v=values.trim().split(/[ ,]+/).map(Number);if(command==='M'||command==='L'){current=v;continue;}const end=v.slice(-2),chord=Math.hypot(end[0]-current[0],end[1]-current[1]),length=2*v[0]*Math.asin(Math.min(1,chord/(2*v[0])));if(index++<4)outer+=length;else inner+=length;current=end;}
    assert.ok(Math.abs(outer-g.bottom)<.001);assert.ok(Math.abs(inner-g.top)<.001);
  }
});
