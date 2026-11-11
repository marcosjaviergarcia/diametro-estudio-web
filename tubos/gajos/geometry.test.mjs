import test from 'node:test';
import assert from 'node:assert/strict';
import {calculate,bounds,point,template,pageLayout,add,dot} from './geometry.mjs';
import {calculate as oldCalculate} from '../geometry.mjs';
const near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<=t,`${a} != ${b}`);
const cases=[[50,75,90,3],[50,100,90,1],[50,100,10,5],[100,150,180,6],[300,150.001,180,24],[10,10000,.01,24]];
for(const [diameter,radius,angle,joints] of cases) test(`Juntas, semiespacios y ensamblaje ${diameter}/${radius}/${angle}/${joints}`,()=>{
  const r=calculate({diameter,radius,angle,joints}),eps=1e-8*Math.max(1,diameter,radius);
  near(r.end[0],radius*(1-Math.cos(r.alpha)),eps);near(r.end[2],radius*Math.sin(r.alpha),eps);
  assert.equal(r.pieces.length,joints+1);
  for(const p of r.pieces){
    near(dot(p.t,p.q),0);near(dot(p.t,p.t),1);near(dot(p.q,p.q),1);
    for(let i=0;i<=48;i++)for(const fraction of [0,.5,1]){
      const theta=i*Math.PI/24,[lo,hi]=bounds(p,theta,p.r*fraction);
      assert.ok(hi>lo);const mid=point(p,theta,(lo+hi)/2,p.r*fraction);
      // Each interior point lies on the correct side of EVERY joint plane,
      // including nonadjacent pieces: their interiors cannot overlap.
      for(let j=0;j<joints;j++){
        const a=r.pieces[j],b=r.pieces[j+1],normal=add(a.t,b.t),rel=mid.map((v,k)=>v-b.origin[k]);
        assert.ok((p.id<=a.id?-1:1)*dot(normal,rel)>=-eps);
      }
      if(!p.last){const next=r.pieces[p.id],a=point(p,theta,hi,p.r*fraction),b=point(next,theta,bounds(next,theta,p.r*fraction)[0],p.r*fraction);
        a.forEach((v,k)=>near(v,b[k],eps));
        near(dot(add(p.t,next.t),a.map((v,k)=>v-next.origin[k])),0,eps);
      }
    }
    const t=template(p);
    for(const row of t.offsets){const theta=row.u/p.r,[lo,hi]=bounds(p,theta);near(lo,row.lo);near(hi,row.hi);near(hi-lo,row.length);}
    for(const s of t.samples){near(s.lower-t.margin+t.datum,s.lo);near(s.upper-t.margin+t.datum,s.hi);assert.ok(s.upper>s.lower);}
    near(t.samples[0].lower,t.samples.at(-1).lower);near(t.samples[0].upper,t.samples.at(-1).upper);
    // Export subdivision bound: evaluate midpoints against interpolated curves.
    for(let i=1;i<t.samples.length;i++){const a=t.samples[i-1],b=t.samples[i],[lo,hi]=bounds(p,(a.theta+b.theta)/2);near(lo,(a.lo+b.lo)/2,.010001);near(hi,(a.hi+b.hi)/2,.010001);}
  }
});
test('Cotas analíticas de ejemplo y terminales a escuadra',()=>{
  const r=calculate({diameter:50,radius:75,angle:90,joints:3});
  near(r.h,20.0961894323342);near(r.pieces[1].length,40.1923788646684);
  near(r.depth,13.3974596215561);near(r.pieces[1].min,26.7949192431123);near(r.pieces[1].max,53.5898384862245);
  near(r.total,120.577136594005);
  for(let i=0;i<36;i++){near(bounds(r.pieces[0],i)[0],0);near(bounds(r.pieces.at(-1),i)[1],r.h);}
});
test('Inglete existente coincide sin modificar su convención',()=>{
  const r=calculate({diameter:50,radius:75,angle:90,joints:3});
  const old=oldCalculate({mode:'miter',diameter:50,parent:50,angle:30});near(old.depth,r.depth);
  for(const o of old.offsets){const z=bounds(r.pieces[0],o.degrees*Math.PI/180)[1];near(o.depth,r.pieces[0].max-z);}
});
test('Escala y convergencia al arco de referencia',()=>{
  const a=calculate({diameter:50,radius:75,angle:90,joints:3}),b=calculate({diameter:100,radius:150,angle:90,joints:3}),c=calculate({diameter:50,radius:75,angle:90,joints:24});
  near(b.total,2*a.total);near(b.h,2*a.h);assert.ok(c.total>c.arc&&c.total<a.total);assert.ok(c.deviation<a.deviation);
});
test('Validaciones de dominio y degeneraciones',()=>{
  const base={diameter:50,radius:75,angle:90,joints:3};
  for(const change of [{diameter:0},{diameter:301},{radius:25},{radius:-1},{radius:10001},{angle:0},{angle:181},{angle:180,joints:1},{joints:0},{joints:25},{joints:1.5},{radius:NaN},{angle:Infinity}])assert.throws(()=>calculate({...base,...change}));
});
test('Paginación cubre los dos bordes y conserva solapes',()=>{
  const t=template(calculate({diameter:300,radius:10000,angle:90,joints:1}).pieces[0]),p=pageLayout(t);
  assert.ok(190+180*(p.cols-1)>=t.width);assert.ok(240+230*(p.rows-1)>=t.height);
});
test('Ángulos de ejes y planos bisectores corresponden con δ, β y A',()=>{
  for(const [diameter,radius,angle,joints] of cases){
    const r=calculate({diameter,radius,angle,joints});
    const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
    const between=(a,b)=>Math.atan2(Math.hypot(...cross(a,b)),dot(a,b));
    near(between(r.pieces[0].t,r.pieces.at(-1).t),r.alpha);
    for(let i=0;i<joints;i++){
      const a=r.pieces[i],b=r.pieces[i+1],normal=add(a.t,b.t);
      near(between(a.t,b.t),r.delta);near(between(a.t,normal),r.beta);near(between(b.t,normal),r.beta);
    }
  }
});
test('Distancia 3D entre bordes es la longitud del desarrollo en cada generatriz',()=>{
  for(const [diameter,radius,angle,joints] of cases){
    const r=calculate({diameter,radius,angle,joints});
    for(const p of r.pieces)for(const s of template(p).samples){
      const a=point(p,s.theta,s.lo),b=point(p,s.theta,s.hi);
      near(Math.hypot(...a.map((v,k)=>b[k]-v)),s.upper-s.lower,1e-7);
      // Independent cylinder equation in an orthonormal basis.
      const offset=a.map((v,k)=>v-p.origin[k]);
      near(Math.hypot(dot(offset,p.q),offset[1]),p.r,1e-7);
    }
  }
});
