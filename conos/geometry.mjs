// Right circular cone/frustum; dimensions describe a zero-thickness surface.
export function calculate({major,minor,height}) {
  if(![major,minor,height].every(Number.isFinite))throw Error('Completá las tres medidas con números válidos.');
  if(major<=0||major>10000||minor<0||minor>major||height<=0||height>10000)throw Error('Diámetro mayor y altura: mayores que 0 y hasta 10.000 mm. Diámetro menor: entre 0 y el mayor.');
  const R=major/2,r=minor/2,difference=R-r,slant=Math.hypot(height,difference),ratio=difference/slant;
  const cylinder=difference===0,outer=cylinder?null:R/ratio,inner=cylinder?null:r/ratio,sector=cylinder?null:2*Math.PI*ratio;
  if(!cylinder&&![outer,inner,sector].every(Number.isFinite))throw Error('La diferencia de diámetros es demasiado pequeña para calcular con precisión.');
  return {major,minor,height,R,r,difference,slant,ratio,cylinder,outer,inner,sector,bottom:Math.PI*major,top:Math.PI*minor,area:Math.PI*(R+r)*slant};
}
export function surface(g,theta,t){const radius=g.R-g.difference*t;return [radius*Math.cos(theta),radius*Math.sin(theta),g.height*t];}
export function flat(g,theta,t){
  if(g.cylinder)return [g.R*(theta-Math.PI),g.height*t];
  const rho=(g.R-g.difference*t)/g.ratio,phi=(theta-Math.PI)*g.ratio;
  // Stable near the cylindrical limit: never subtract two huge cone radii.
  return [rho*Math.sin(phi),g.slant*t+2*rho*Math.sin(phi/2)**2];
}
export function development(g){
  const count=g.cylinder?1:Math.max(128,4*Math.ceil(g.sector*Math.sqrt(g.outer/.08)/4));
  const edges=[0,1].map(t=>Array.from({length:count+1},(_,i)=>flat(g,2*Math.PI*i/count,t)));
  const all=edges.flat();
  if(!g.cylinder)for(const phi of [-Math.PI,-Math.PI/2,0,Math.PI/2,Math.PI]){
    const theta=Math.PI+phi/g.ratio;if(theta>=0&&theta<=2*Math.PI)for(const t of [0,1])all.push(flat(g,theta,t));
  }
  const min=[0,1].map(k=>Math.min(...all.map(p=>p[k]))),max=[0,1].map(k=>Math.max(...all.map(p=>p[k])));
  return {edges,min,width:max[0]-min[0]+24,height:max[1]-min[1]+24};
}
