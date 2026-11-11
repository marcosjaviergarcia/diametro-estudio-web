export function calculate({pcd,count,diameter,angle}) {
  if (![pcd,count,diameter,angle].every(Number.isFinite)) throw new Error('Completá todos los parámetros con números válidos.');
  if(pcd<=0||pcd>10000||diameter<=0||diameter>10000)throw new Error('PCD y perforación deben ser mayores que 0 y hasta 10.000 mm.');
  if(!Number.isInteger(count)||count<1||count>360)throw new Error('La cantidad debe ser un entero entre 1 y 360.');
  if(Math.abs(angle)>1e9)throw new Error('El ángulo inicial debe estar entre −1.000.000.000° y 1.000.000.000°.');
  const start=((angle%360)+360)%360,step=360/count,radius=pcd/2;
  const points=Array.from({length:count},(_,i)=>{const a=(start+i*step)%360,t=a*Math.PI/180;return {id:i+1,angle:a,x:radius*Math.cos(t),y:radius*Math.sin(t)};});
  const chord=count===1?null:pcd*Math.sin(Math.PI/count),gap=chord===null?null:chord-diameter,tolerance=1e-10*Math.max(pcd,diameter),pairs=[];
  for(let i=0;i<count;i++)for(let j=i+1;j<count;j++){
    const distance=Math.hypot(points[i].x-points[j].x,points[i].y-points[j].y),clearance=distance-diameter;
    if(clearance<=tolerance)pairs.push({a:i+1,b:j+1,distance,clearance,type:clearance < -tolerance?'overlap':'tangent'});
  }
  return {pcd,count,diameter,start,step,radius,points,chord,gap,pairs,status:pairs.some(p=>p.type==='overlap')?'overlap':pairs.length?'tangent':'clear'};
}
