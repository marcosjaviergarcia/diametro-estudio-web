// Lightweight orthographic mesh viewer; all dimensions come from the calculator.
export function mountTubeView(host) {
  host.innerHTML = `<div class="drawing-top"><span class="eyebrow">VISTA 3D / GEOMETRÍA DE LA UNIÓN</span><span class="eyebrow" id="view-angle"></span></div>
    <div class="tube-stage"><canvas tabindex="0" aria-label="Vista 3D de la unión. Arrastrá o usá las flechas para girar."></canvas><span class="view-tag">Ø / VISTA ESPACIAL</span></div>
    <div class="view-controls"><button type="button" class="view-assembly" aria-pressed="true">Unión completa</button><button type="button" class="view-piece" aria-pressed="false">Solo caño cortado</button><button type="button" class="view-reset" aria-label="Restablecer orientación 3D">Restablecer ↺</button></div>
    <p class="hint view-caption">Arrastrá para girar · Flechas con la vista enfocada · Naranja: borde de corte.<br>Largos y espesor ilustrativos. La plantilla define el corte real.</p>`;
  const canvas = host.querySelector('canvas'), ctx = canvas.getContext('2d');
  let result, mesh = [], yaw = -.65, pitch = .4, assembly = true, drag, frame;
  const add = (a, b) => a.map((v, i) => v + b[i]);
  const mul = (a, s) => a.map(v => v * s);
  function tube(radius, low, high, transform, tone, cutEnd) {
    const count = 96, inner = radius * .93;
    const point = (r, t, z) => transform([r * Math.cos(t), r * Math.sin(t), z]);
    const face = (points, color, edge = false) => mesh.push({ points, color, edge });
    for (let i = 0; i < count; i++) {
      const t = i * 2 * Math.PI / count, next = (i + 1) * 2 * Math.PI / count;
      const lo = [low(t), low(next)], hi = [high(t), high(next)];
      const p = (r, j, z) => point(r, j ? next : t, z[j]);
      face([p(radius, 0, lo), p(radius, 1, lo), p(radius, 1, hi), p(radius, 0, hi)], tone);
      face([p(inner, 0, hi), p(inner, 1, hi), p(inner, 1, lo), p(inner, 0, lo)], tone - 48);
      for (const [end, z] of [[0, lo], [1, hi]]) {
        face([p(radius, 0, z), p(inner, 0, z), p(inner, 1, z), p(radius, 1, z)], end === cutEnd ? 'cut' : tone + 20);
        if (end === cutEnd) face([p(radius, 0, z), p(radius, 1, z)], 'cut', true);
      }
    }
  }
  function build() {
    mesh = [];
    if (!result) return;
    const r = result.diameter / 2, a = result.angle * Math.PI / 180;
    const axis = [Math.sin(a), 0, Math.cos(a)], radial = [Math.cos(a), 0, -Math.sin(a)];
    const transform = ([x, y, z]) => add(add(mul(radial, x), [0, y, 0]), mul(axis, z));
    if (result.mode === 'miter') {
      const cut = t => -r * Math.cos(t) * Math.tan(a / 2), length = r * 4.8;
      tube(r, () => -length, cut, p => p, 174, 1);
      if (assembly) tube(r, t => -cut(t), () => length, transform, 205, 0);
    } else {
      const R = result.parent / 2;
      const cut = t => (r * Math.cos(t) * Math.cos(a) + Math.sqrt(Math.max(0, R * R - r * r * Math.sin(t) ** 2))) / Math.sin(a);
      const max = (r * Math.cos(a) + R) / Math.sin(a);
      tube(r, cut, () => max + r * 3.8, p => p, 174, 0);
      const length = Math.max(R * 3.2, max * Math.cos(a) + r * 1.5);
      if (assembly) tube(R, () => -length, () => length, transform, 205, -1);
    }
  }
  function rotate([x, y, z]) {
    const u = x * Math.cos(yaw) + y * Math.sin(yaw), d = -x * Math.sin(yaw) + y * Math.cos(yaw);
    return [u, -z * Math.cos(pitch) + d * Math.sin(pitch), d * Math.cos(pitch) + z * Math.sin(pitch)];
  }
  function draw() {
    frame = null;
    const w = canvas.clientWidth, h = canvas.clientHeight, dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = w * dpr; canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#e7e7e2'; ctx.lineWidth = .6;
    for (let x = 16; x < w; x += 24) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 16; y < h; y += 24) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    if (!result || !ctx) return;
    const faces = mesh.map(f => ({ ...f, points: f.points.map(rotate) }));
    const all = faces.flatMap(f => f.points);
    const min = [0, 1, 2].map(i => Math.min(...all.map(p => p[i]))), max = [0, 1, 2].map(i => Math.max(...all.map(p => p[i])));
    const center = min.map((v, i) => (v + max[i]) / 2);
    // Rotation keeps a fixed scale based on the model's bounding sphere.
    const world = mesh.flatMap(f => f.points);
    const bounds = [0, 1, 2].map(i => [Math.min(...world.map(p => p[i])), Math.max(...world.map(p => p[i]))]);
    const span = Math.hypot(...bounds.map(b => b[1] - b[0]));
    const scale = Math.min(w - 65, h - 45) / span;
    faces.sort((a, b) => a.points.reduce((s, p) => s + p[2], 0) / a.points.length - b.points.reduce((s, p) => s + p[2], 0) / b.points.length);
    for (const f of faces) {
      const p = f.points;
      ctx.beginPath(); p.forEach((v, i) => ctx[i ? 'lineTo' : 'moveTo']((v[0] - center[0]) * scale + w / 2, (v[1] - center[1]) * scale + h / 2));
      if (f.edge) { ctx.strokeStyle = '#ff5a1f'; ctx.lineWidth = 1.8; ctx.stroke(); continue; }
      ctx.closePath();
      const u = p[1].map((v, i) => v - p[0][i]), v = p[2].map((v, i) => v - p[0][i]);
      const normal = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const light = Math.abs((normal[0] * -.35 + normal[1] * -.5 + normal[2] * .8) / (Math.hypot(...normal) || 1));
      const c = Math.round(f.color * (.66 + .34 * light));
      ctx.fillStyle = f.color === 'cut' ? '#ff5a1f' : `rgb(${c},${c},${Math.max(0, c - 4)})`;
      ctx.fill(); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = .45; ctx.stroke();
    }
  }
  function schedule() { if (!frame) frame = requestAnimationFrame(draw); }
  canvas.addEventListener('pointerdown', e => { drag = [e.clientX, e.clientY]; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', e => { if (!drag) return; yaw += (e.clientX - drag[0]) * .009; pitch = Math.max(-1.4, Math.min(1.4, pitch + (e.clientY - drag[1]) * .009)); drag = [e.clientX, e.clientY]; schedule(); });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, () => { drag = null; });
  canvas.addEventListener('keydown', e => { if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return; e.preventDefault(); yaw += e.key === 'ArrowLeft' ? -.15 : e.key === 'ArrowRight' ? .15 : 0; pitch = Math.max(-1.4, Math.min(1.4, pitch + (e.key === 'ArrowUp' ? -.15 : e.key === 'ArrowDown' ? .15 : 0))); schedule(); });
  host.querySelector('.view-reset').addEventListener('click', () => { yaw = -.65; pitch = .4; schedule(); });
  for (const [selector, value] of [['.view-assembly', true], ['.view-piece', false]]) host.querySelector(selector).addEventListener('click', () => {
    assembly = value; host.querySelector('.view-assembly').setAttribute('aria-pressed', String(value)); host.querySelector('.view-piece').setAttribute('aria-pressed', String(!value)); build(); schedule();
  });
  new ResizeObserver(schedule).observe(canvas);
  return { update(data) { result = data; host.querySelector('#view-angle').textContent = data ? `${data.mode === 'miter' ? 'DESVÍO' : 'ENTRE EJES'} / ${data.angle}°` : 'REVISÁ LAS MEDIDAS'; canvas.setAttribute('aria-label', data ? `Vista 3D: ${data.mode === 'miter' ? 'inglete' : 'boca de pescado'}, ${data.angle} grados. Arrastrá o usá las flechas para girar.` : 'Vista 3D no disponible: revisá las medidas.'); build(); schedule(); } };
}
