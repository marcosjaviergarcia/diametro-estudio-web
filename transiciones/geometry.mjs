export const sub=(a,b)=>a.map((v,i)=>v-b[i]);
export const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
export const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
export const length=a=>Math.hypot(...a);
export const distance=(a,b)=>length(sub(a,b));
const unit=a=>a.map(v=>v/length(a));
export function unfold(points){
  const origin=points[0],u=unit(sub(points[1],origin)),w=sub(points[3],origin),n=unit(cross(u,w)),v=cross(n,u);
  const residual=Math.max(...points.map(p=>Math.abs(dot(sub(p,origin),n))));
  const tolerance=1e-10*Math.max(1,...points.map(p=>distance(p,origin)));
  if(!Number.isFinite(residual)||residual>tolerance)throw Error('Cara no plana: no se puede presentar como desarrollo exacto.');
  const flat=points.map(p=>{const d=sub(p,origin);return [dot(d,u),dot(d,v)];});
  return {flat,normal:n,u,v,origin,residual,tolerance};
}
export function calculate(input){
  const {width0,depth0,width1,depth1,height,dx,dy}=input;
  if(![width0,depth0,width1,depth1,height,dx,dy].every(Number.isFinite))throw Error('Completá todas las medidas con números válidos.');
  if([width0,depth0,width1,depth1,height].some(v=>v<.01||v>10000)||[dx,dy].some(v=>Math.abs(v)>10000))throw Error('Anchos, profundidades y altura: de 0,01 a 10.000 mm. Desplazamientos X/Y: de −10.000 a 10.000 mm.');
  const rect=(w,d,x,y,z)=>[[-w/2+x,-d/2+y,z],[w/2+x,-d/2+y,z],[w/2+x,d/2+y,z],[-w/2+x,d/2+y,z]];
  const bottom=rect(width0,depth0,0,0,0),top=rect(width1,depth1,dx,dy,height),labels=['A','B','C','D'],names=['Frente · −Y','Derecha · +X','Fondo · +Y','Izquierda · −X'];
  const faces=bottom.map((p,i)=>{
    const j=(i+1)%4,points=[p,bottom[j],top[j],top[i]],plane=unfold(points),ids=[labels[i],labels[j],labels[j]+'′',labels[i]+'′'];
    const edges=points.map((p,k)=>distance(p,points[(k+1)%4])),diagonals=[distance(points[0],points[2]),distance(points[1],points[3])];
    const area=(edges[0]+edges[2])*plane.flat[3][1]/2;
    return {id:i+1,name:names[i],points,labels:ids,...plane,edges,diagonals,area,slant:plane.flat[3][1]};
  });
  return {...input,bottom,top,faces,area:faces.reduce((s,f)=>s+f.area,0)};
}
export function layout(face){const min=[0,1].map(k=>Math.min(...face.flat.map(p=>p[k]))),max=[0,1].map(k=>Math.max(...face.flat.map(p=>p[k])));return {min,width:max[0]-min[0]+40,height:max[1]-min[1]+40};}
