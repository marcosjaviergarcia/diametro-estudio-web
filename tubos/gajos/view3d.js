import {bounds,point} from './geometry.mjs';
// Dedicated depth-buffered renderer. Geometry is supplied by the shared pure model.
export function mountView(canvas,overlay,onUnavailable) {
  const gl=canvas.getContext('webgl',{antialias:true}),ctx=overlay.getContext('2d');
  if(!gl){onUnavailable();return {update(){}};}
  const vertex=`attribute vec3 position; attribute vec3 normal; attribute vec3 color;
  uniform vec3 center; uniform vec2 scale; uniform float span; uniform float yaw; uniform float pitch; uniform float line;
  varying vec3 tint; void main(){vec3 p=position-center;float u=p.x*cos(yaw)+p.y*sin(yaw);float d=-p.x*sin(yaw)+p.y*cos(yaw);
  gl_Position=vec4(u*scale.x,(p.z*cos(pitch)-d*sin(pitch))*scale.y,-(d*cos(pitch)+p.z*sin(pitch))/span-line*.0002,1.);
  float light=.58+.42*abs(dot(normal,normalize(vec3(-.4,.6,.8))));tint=color*mix(light,1.,line);}`;
  const fragment=`precision mediump float; varying vec3 tint; void main(){gl_FragColor=vec4(tint,1.);}`;
  function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;}
  let program;
  try{program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('WebGL link');}catch{onUnavailable();return {update(){}};}
  gl.useProgram(program);gl.enable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
  const uniforms=Object.fromEntries(['center','scale','span','yaw','pitch','line'].map(k=>[k,gl.getUniformLocation(program,k)]));
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  for(const [i,name] of ['position','normal','color'].entries()){const at=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(at);gl.vertexAttribPointer(at,3,gl.FLOAT,false,36,i*12);}
  let data,selected=0,isolated=false,references=false,yaw=-.5,pitch=.5,drag,frame,vertices=[],lines=[],center=[0,0,0],span=1;
  const build=()=>{
    vertices=[];lines=[];if(!data)return;
    const selectedPieces=isolated?[data.pieces[selected]]:data.pieces;
    const lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
    const push=(arr,p,n,c)=>{arr.push(...p,...n,...c);p.forEach((v,k)=>{lo[k]=Math.min(lo[k],v);hi[k]=Math.max(hi[k],v);});};
    for(const piece of selectedPieces){
      const count=96,col=piece.id===selected+1?[1,.43,.16]:[.52,.65,.7];
      const normal=t=>piece.q.map((v,k)=>v*Math.cos(t)+(k===1?Math.sin(t):0));
      for(let i=0;i<count;i++){
        const a=i*Math.PI*2/count,b=(i+1)*Math.PI*2/count,ba=bounds(piece,a),bb=bounds(piece,b);
        const p=[point(piece,a,ba[0]),point(piece,b,bb[0]),point(piece,b,bb[1]),point(piece,a,ba[1])];
        for(const j of [0,1,2,0,2,3])push(vertices,p[j],normal(j===0||j===3?a:b),col);
        for(const [j,k] of [[0,1],[3,2]]){push(lines,p[j],[0,0,0],[.22,.25,.26]);push(lines,p[k],[0,0,0],[.22,.25,.26]);}
      }
    }
    if(references&&!isolated)for(let i=0;i<128;i++)for(const a of [i*data.alpha/128,(i+1)*data.alpha/128])push(lines,[data.radius*(1-Math.cos(a)),0,data.radius*Math.sin(a)],[0,0,0],[.45,.45,.43]);
    center=lo.map((v,k)=>(v+hi[k])/2);span=Math.max(1,Math.hypot(...lo.map((v,k)=>hi[k]-v)));
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([...vertices,...lines]),gl.STATIC_DRAW);
  };
  function draw(){
    frame=null;const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=overlay.width=w*dpr;canvas.height=overlay.height=h*dpr;gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(.973,.973,.96,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);if(!data)return;
    const scale=Math.max(1,Math.min(w-65,h-65))/span;
    gl.uniform3fv(uniforms.center,center);gl.uniform2f(uniforms.scale,2*scale/w,2*scale/h);gl.uniform1f(uniforms.span,span);gl.uniform1f(uniforms.yaw,yaw);gl.uniform1f(uniforms.pitch,pitch);
    gl.uniform1f(uniforms.line,0);gl.drawArrays(gl.TRIANGLES,0,vertices.length/9);gl.uniform1f(uniforms.line,1);gl.drawArrays(gl.LINES,vertices.length/9,lines.length/9);
    if(!references)return;
    const piece=data.pieces[selected],labels=[];
    for(let i=0;i<4;i++){
      const theta=i*Math.PI/2,z=bounds(piece,theta)[piece.last?0:1],p=point(piece,theta,z).map((v,k)=>v-center[k]);
      const u=p[0]*Math.cos(yaw)+p[1]*Math.sin(yaw),d=-p[0]*Math.sin(yaw)+p[1]*Math.cos(yaw);
      const x=w/2+u*scale,y=h/2+(-p[2]*Math.cos(pitch)+d*Math.sin(pitch))*scale;
      // Local badges and short connectors, never fixed corner-to-corner leaders.
      let lx=Math.max(25,Math.min(w-25,x+27)),ly=Math.max(12,Math.min(h-12,y-16));
      const base=ly;
      for(let step=0;step<20;step++){
        const candidate=Math.max(12,Math.min(h-12,base+(step%2?1:-1)*Math.ceil(step/2)*23));
        if(!labels.some(p=>Math.abs(p[0]-lx)<48&&Math.abs(p[1]-candidate)<22)){ly=candidate;break;}
      }
      labels.push([lx,ly]);
      ctx.strokeStyle='rgba(70,75,72,.45)';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(lx,ly);ctx.stroke();
      ctx.fillStyle='#ff5a1f';ctx.beginPath();ctx.arc(x,y,2.5,0,7);ctx.fill();
      ctx.fillStyle='rgba(248,248,245,.94)';ctx.fillRect(lx-22,ly-10,44,20);
      ctx.fillStyle='#242423';ctx.font='12px monospace';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(i*90+'°',lx,ly);
    }
  }
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(draw);};
  canvas.addEventListener('pointerdown',e=>{drag=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;yaw+=(e.clientX-drag[0])*.01;pitch=Math.max(-1.45,Math.min(1.45,pitch+(e.clientY-drag[1])*.01));drag=[e.clientX,e.clientY];schedule();});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>drag=null);
  canvas.addEventListener('keydown',e=>{if(!e.key.startsWith('Arrow'))return;e.preventDefault();yaw+=e.key==='ArrowLeft'?-.15:e.key==='ArrowRight'?.15:0;pitch=Math.max(-1.45,Math.min(1.45,pitch+(e.key==='ArrowUp'?-.15:e.key==='ArrowDown'?.15:0)));schedule();});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();onUnavailable();});
  new ResizeObserver(schedule).observe(canvas);
  return {update(result,index=0,solo=false){data=result;selected=index;isolated=solo;build();schedule();},setReferences(value){references=value;build();schedule();},reset(){yaw=-.5;pitch=.5;schedule();}};
}
