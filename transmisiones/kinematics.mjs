export function calculate({rpm,known,stages}){
 if(!Number.isFinite(rpm)||rpm<0||rpm>1000000)throw Error('Las RPM conocidas deben estar entre 0 y 1.000.000.');
 if(!['input','output'].includes(known))throw Error('Seleccioná RPM de entrada o de salida.');
 if(!Array.isArray(stages)||stages.length<1||stages.length>8)throw Error('Usá entre 1 y 8 etapas.');
 let direction=1,total=1;
 const prepared=stages.map((s,index)=>{
  if(!['belt','chain'].includes(s.type))throw Error(`Etapa ${index+1}: tipo inválido.`);
  if(![s.driver,s.driven].every(Number.isFinite))throw Error(`Etapa ${index+1}: completá ambas medidas.`);
  if(s.type==='belt'){
   if([s.driver,s.driven].some(v=>v<.01||v>10000))throw Error(`Etapa ${index+1}: diámetros primitivos de 0,01 a 10.000 mm.`);
   if(!['open','crossed'].includes(s.route))throw Error(`Etapa ${index+1}: disposición de correa inválida.`);
  }else if([s.driver,s.driven].some(v=>!Number.isInteger(v)||v<3||v>1000)||s.route!=='open')throw Error(`Etapa ${index+1}: piñones de 3 a 1000 dientes enteros, cadena abierta.`);
  const ratio=s.driven/s.driver,sign=s.type==='belt'&&s.route==='crossed'?-1:1;
  total*=ratio;direction*=sign;return {...s,index:index+1,ratio,sign,direction,cumulative:total};
 });
 if(!Number.isFinite(total)||total<1e-12||total>1e12)throw Error('Relación total fuera del intervalo numérico admitido: 10⁻¹² a 10¹².');
 const input=known==='input'?rpm:rpm*total;
 let current=input;
 const results=prepared.map(s=>{const output=current/s.ratio;if(!Number.isFinite(output)||output>1e12||current>1e12)throw Error('RPM calculadas fuera del límite numérico de 10¹².');const r={...s,input:current,output};current=output;return r;});
 return {input,output:current,total,direction,stages:results,known};
}
export function format(value){return value!==0&&(Math.abs(value)<.001||Math.abs(value)>=1e9)?value.toExponential(4):value.toLocaleString('es-AR',{maximumFractionDigits:4});}
export function schematic(g,selected){
 const height=g.stages.length*164;
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 ${height}" aria-label="Etapas de transmisión, esquema sin escala">${g.stages.map(s=>{
 const y=(s.index-1)*164,active=s.index===selected,stroke=active?'#ff5a1f':'#667b80',cross=s.route==='crossed';
 return `<g data-stage="${s.index}" role="button" tabindex="0" aria-label="Seleccionar etapa ${s.index}" aria-pressed="${active}"><rect x="3" y="${y+3}" width="594" height="151" rx="0" fill="${active?'#fff0e8':'#f8f8f5'}" stroke="${stroke}"/><text x="18" y="${y+25}" font-size="13">${s.index} · ${s.type==='belt'?'POLEAS / CORREA':'PIÑONES / CADENA'} · i = ${format(s.ratio)}</text><path d="M 160 ${y+55} L 440 ${y+(cross?115:55)} M 160 ${y+115} L 440 ${y+(cross?55:115)}" stroke="${stroke}" stroke-width="3" ${s.type==='chain'?'stroke-dasharray="6 4"':''}/><circle cx="160" cy="${y+85}" r="30" fill="#e2e8e8" stroke="${stroke}" stroke-width="2"/><circle cx="440" cy="${y+85}" r="30" fill="#e2e8e8" stroke="${stroke}" stroke-width="2"/><text x="160" y="${y+90}" text-anchor="middle" font-size="12">${s.type==='belt'?'Dp':'Z'} ${format(s.driver)}</text><text x="440" y="${y+90}" text-anchor="middle" font-size="12">${s.type==='belt'?'Dp':'Z'} ${format(s.driven)}</text><text x="160" y="${y+140}" text-anchor="middle" font-size="12">Conductora · ${format(s.input)} rpm</text><text x="440" y="${y+140}" text-anchor="middle" font-size="12">Conducida · ${format(s.output)} rpm</text></g>${s.index<g.stages.length?`<text x="300" y="${y+163}" text-anchor="middle" font-size="9">↓ eje intermedio compartido: misma RPM ↓</text>`:''}`;
 }).join('')}</svg>`;
}
