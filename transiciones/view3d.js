
// Dedicated depth-buffered renderer. Geometry is supplied by the shared pure model.
export function mountView(canvas,onUnavailable) {
  const gl=canvas.getContext('webgl',{antialias:true});
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
  let data,yaw=2.64,pitch=.5,drag,frame,vertices=[],lines=[],center=[0,0,0],span=1;
  const build=()=>{
    vertices=[];lines=[];if(!data)return;
    const g=data,push=(arr,p,n,c)=>arr.push(...p,...n,...c);
    for(const f of g.faces){
      const color=f.id===g.selected?[1,.42,.19]:[.55,.66,.7];
      for(const j of [0,1,2,0,2,3])push(vertices,f.points[j],f.normal,color);
      for(let j=0;j<4;j++){push(lines,f.points[j],[0,0,0],[.22,.24,.24]);push(lines,f.points[(j+1)%4],[0,0,0],[.22,.24,.24]);}
    }
    const points=[...g.bottom,...g.top],min=[0,1,2].map(k=>Math.min(...points.map(p=>p[k]))),max=[0,1,2].map(k=>Math.max(...points.map(p=>p[k])));
    center=min.map((v,k)=>(v+max[k])/2);span=Math.max(.01,Math.hypot(...max.map((v,k)=>v-min[k])));
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([...vertices,...lines]),gl.STATIC_DRAW);
  };
  function draw(){
    frame=null;const w=canvas.clientWidth,h=canvas.clientHeight,dpr=Math.min(devicePixelRatio||1,2);
    canvas.width=w*dpr;canvas.height=h*dpr;gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(.973,.973,.96,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    if(!data)return;
    const scale=Math.max(1,Math.min(w-65,h-65))/span;
    gl.uniform3fv(uniforms.center,center);gl.uniform2f(uniforms.scale,2*scale/w,2*scale/h);gl.uniform1f(uniforms.span,span);gl.uniform1f(uniforms.yaw,yaw);gl.uniform1f(uniforms.pitch,pitch);
    gl.uniform1f(uniforms.line,0);gl.drawArrays(gl.TRIANGLES,0,vertices.length/9);gl.uniform1f(uniforms.line,1);gl.drawArrays(gl.LINES,vertices.length/9,lines.length/9);
  }
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(draw);};
  canvas.addEventListener('pointerdown',e=>{drag=[e.clientX,e.clientY];canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;yaw+=(e.clientX-drag[0])*.01;pitch=Math.max(-1.45,Math.min(1.45,pitch+(e.clientY-drag[1])*.01));drag=[e.clientX,e.clientY];schedule();});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>drag=null);
  canvas.addEventListener('keydown',e=>{if(!e.key.startsWith('Arrow'))return;e.preventDefault();yaw+=e.key==='ArrowLeft'?-.15:e.key==='ArrowRight'?.15:0;pitch=Math.max(-1.45,Math.min(1.45,pitch+(e.key==='ArrowUp'?-.15:e.key==='ArrowDown'?.15:0)));schedule();});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();onUnavailable();});
  new ResizeObserver(schedule).observe(canvas);
  return {update(result){data=result;build();schedule();},reset(){yaw=2.64;pitch=.5;schedule();}};
}


