// Nominal planar segmented bend. R is the reference centreline circle radius.
export const add = (a,b) => a.map((v,i)=>v+b[i]);
export const mul = (a,k) => a.map(v=>v*k);
export const dot = (a,b) => a.reduce((s,v,i)=>s+v*b[i],0);
export function bounds(piece, theta, radius = piece.r) {
  const k = radius * piece.tan * Math.cos(theta);
  return [piece.first ? 0 : -k, piece.length + (piece.last ? 0 : k)];
}
export function point(piece, theta, z, radius = piece.r) {
  return add(piece.origin, add(mul(piece.q, radius*Math.cos(theta)), add([0,radius*Math.sin(theta),0],mul(piece.t,z))));
}
export function calculate({diameter, radius, angle, joints}) {
  if (![diameter,radius,angle,joints].every(Number.isFinite)) throw Error('Completá todos los datos con números válidos.');
  if (diameter < 10 || diameter > 300) throw Error('El diámetro exterior debe estar entre 10 y 300 mm.');
  if (radius <= diameter/2 || radius > 10000) throw Error('R debe ser mayor que D/2 y no superar 10.000 mm.');
  if (angle <= 0 || angle > 180) throw Error('El desvío total debe ser mayor que 0° y hasta 180°.');
  if (!Number.isInteger(joints) || joints < 1 || joints > 24) throw Error('Elegí entre 1 y 24 uniones enteras.');
  if (angle/joints > 90) throw Error('Cada unión admite hasta 90° de desvío. Aumentá la cantidad de uniones.');
  const r=diameter/2, alpha=angle*Math.PI/180, delta=alpha/joints, beta=delta/2, tan=Math.tan(beta), h=radius*tan;
  let origin=[0,0,0];
  const pieces=Array.from({length:joints+1},(_,j)=>{
    const first=j===0,last=j===joints,length=first||last?h:2*h;
    const t=[Math.sin(j*delta),0,Math.cos(j*delta)],q=[-Math.cos(j*delta),0,Math.sin(j*delta)];
    const piece={id:j+1,first,last,r,tan,length,origin,t,q,type:first?'Entrada':last?'Salida':'Intermedio',min:length-(first||last?1:2)*r*tan,max:length+(first||last?1:2)*r*tan};
    origin=add(origin,mul(t,length));return piece;
  });
  return {diameter,radius,angle,joints,r,alpha,delta,beta,h,circumference:Math.PI*diameter,depth:diameter*tan,total:2*joints*h,arc:radius*alpha,deviation:radius*(1/Math.cos(beta)-1),end:origin,pieces};
}
export function template(piece) {
  const circumference=2*Math.PI*piece.r, margin=12;
  const datum=piece.first?0:-piece.r*piece.tan;
  // Linear interpolation error <= max|f''| * step²/8, with 0.01 mm budget.
  const count=Math.max(144,4*Math.ceil(Math.PI*2*Math.sqrt(piece.r*piece.tan/.08)/4));
  const samples=Array.from({length:count+1},(_,i)=>{
    const theta=i*2*Math.PI/count,[lo,hi]=bounds(piece,theta);
    return {theta,u:piece.r*theta,lo,hi,lower:margin+lo-datum,upper:margin+hi-datum};
  });
  const height=2*margin+piece.length+(piece.last?0:piece.r*piece.tan)-datum;
  return {samples,datum,margin,circumference,width:circumference+10,height,
    offsets:Array.from({length:13},(_,i)=>{const theta=i*Math.PI/6,[lo,hi]=bounds(piece,theta);return {degrees:i*30,u:piece.r*theta,lo,hi,length:hi-lo};})};
}
export function pageLayout(t) {
  const cols=Math.max(1,Math.ceil((t.width-10)/180)),rows=Math.max(1,Math.ceil((t.height-10)/230));
  return {cols,rows,count:cols*rows};
}
