import { calculate } from './geometry.mjs';
import { mountTubeView } from './view3d.js';
const $ = id => document.getElementById(id);
const spatialView = mountTubeView($('tube-view'));
const fmt = n => n.toLocaleString('es-AR', { maximumFractionDigits: 2 });
let result, screenScale = 4, fitPreview = false;
function resizePreview() {
  const svg = $('preview').querySelector('svg');
  if (!result || !svg) return;
  const width = result.width + 6, height = result.height + 4;
  if (fitPreview) screenScale = Math.min($('preview').clientWidth / width, 480 / height);
  svg.style.width = width * screenScale + 'px';
  svg.style.height = height * screenScale + 'px';
  $('zoom-label').textContent = Math.round(screenScale / 4 * 100) + ' % de lectura';
}
for (const [id, factor] of [['zoom-in', 1.25], ['zoom-out', .8]]) $(id).addEventListener('click', () => { fitPreview = false; screenScale = Math.max(.2, Math.min(20, screenScale * factor)); resizePreview(); });
$('zoom-fit').addEventListener('click', () => { fitPreview = true; resizePreview(); });
$('zoom-read').addEventListener('click', () => { fitPreview = false; screenScale = 4; resizePreview(); });
new ResizeObserver(resizePreview).observe($('preview'));
const tileWidth = 190, tileHeight = 240, overlap = 10;
const tiles = r => ({ cols: Math.max(1, Math.ceil((r.width - overlap) / (tileWidth - overlap))), rows: Math.max(1, Math.ceil((r.height - overlap) / (tileHeight - overlap))) });
function artwork(r) {
  const n = x => x.toFixed(3), c = r.circumference;
  const path = r.points.map(([x, y], i) => `${i ? 'L' : 'M'}${n(x)},${n(y)}`).join(' ');
  const grid = Array.from({ length: 13 }, (_, i) => { const x = c * i / 12; return `<line x1="${x}" y1="7" x2="${x}" y2="${r.height}" stroke="#999" stroke-width=".15" stroke-dasharray="1 2"/><text x="${x}" y="5" text-anchor="${i === 0 ? 'start' : i === 12 ? 'end' : 'middle'}">${i * 30}°</text>`; }).join('');
  return `<g font-family="Arial,sans-serif" font-size="3" fill="#222"><path d="${path} L${n(c)},${n(r.height)} L0,${n(r.height)} Z" fill="#e6e6e2"/><rect x="${c}" y="7" width="10" height="${r.height - 7}" fill="#f4f4f4" stroke="#888" stroke-width=".2" stroke-dasharray="2 2"/>${grid}<path d="${path}" fill="none" stroke="#df4817" stroke-width=".45"/><line x1="0" y1="${r.height - 13}" x2="${c}" y2="${r.height - 13}" stroke="#555" stroke-width=".2"/><text x="3" y="${r.height - 7}">CONSERVAR · Ø ${fmt(r.diameter)} mm · ${fmt(r.angle)}°</text><text x="${c + 5}" y="${r.height / 2}" text-anchor="middle" transform="rotate(90 ${c + 5} ${r.height / 2})">PEGAR</text></g>`;
}
function description(r) { return `${r.mode === 'notch' ? `Boca de pescado · receptor Ø ${fmt(r.parent)} mm` : 'Inglete · dos caños iguales'} · caño Ø ${fmt(r.diameter)} mm · ${fmt(r.angle)}°`; }
function printPages(r) {
  const { cols, rows } = tiles(r);
  let pages = '';
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const x = col * (tileWidth - overlap), y = row * (tileHeight - overlap);
    pages += `<section class="print-page"><h2>DIÁMETRO / Plantilla de caño redondo</h2><p>${description(r)}</p><p>Fila ${row + 1}/${rows} · columna ${col + 1}/${cols} · origen X ${x} / Y ${y} mm · superponer 10 mm</p><svg xmlns="http://www.w3.org/2000/svg" width="190mm" height="240mm" viewBox="${x} ${y} 190 240">${artwork(r)}<rect x="${x + .15}" y="${y + .15}" width="189.7" height="239.7" fill="none" stroke="#222" stroke-width=".2"/></svg><div class="calibration"></div><p>Control: 50 mm · A4 / 100 % / sin ajustar · recortar marco y unir por coordenadas.</p></section>`;
  }
  $('print-pages').innerHTML = pages;
}
function update() {
  const mode = $('mode').value, notch = mode === 'notch';
  $('parent-field').hidden = !notch;
  $('angle-label').textContent = notch ? 'Ángulo entre ejes' : 'Desvío total de la unión';
  $('mode-help').textContent = notch ? 'Un caño termina contra el lateral de otro. El receptor debe ser igual o mayor.' : 'Dos caños del mismo diámetro, cortados a la mitad del desvío. Para curvas por tramos, ingresá el desvío de cada unión.';
  $('angle-help').textContent = notch ? '90° forma una T. Ángulos menores producen una unión inclinada.' : 'Ejemplo: una curva de 90° con 3 uniones iguales lleva 30° por unión y cortes de 15° respecto del corte a escuadra.';
  try {
    result = calculate({ mode, diameter: $('diameter').valueAsNumber, parent: $('parent').valueAsNumber, angle: $('angle').valueAsNumber });
    $('error').hidden = true;
    const r = result, t = tiles(r);
    spatialView.update(r);
    $('stats').innerHTML = [['Perímetro del caño', fmt(r.circumference), 'mm'], ['Profundidad de corte', fmt(r.depth), 'mm'], [notch ? 'Ángulo entre ejes' : 'Corte desde escuadra', fmt(notch ? r.angle : r.angle / 2), '°']].map(([label, value, unit]) => `<div class="stat"><small>${label}</small><strong>${value}</strong> <em>${unit}</em></div>`).join('');
    $('preview').innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-3 -2 ${r.width + 6} ${r.height + 4}" role="img" aria-label="Plantilla desplegada: curva de corte y referencias de giro">${artwork(r)}</svg>`;
    resizePreview();
    $('offsets').innerHTML = r.offsets.map(o => `<tr><td>${o.degrees}°</td><td>${fmt(o.distance)} mm</td><td>${fmt(o.depth)} mm</td></tr>`).join('');
    $('paper-note').textContent = `Plantilla: ${fmt(r.width)} × ${fmt(r.height)} mm, incluida pestaña. Impresión: ${t.cols * t.rows} hoja${t.cols * t.rows === 1 ? '' : 's'} A4 (${t.cols} columnas × ${t.rows} filas).`;
    $('print').disabled = $('download').disabled = false;
    printPages(r);
  } catch (error) {
    result = null;
    spatialView.update(null);
    $('error').textContent = error.message;
    $('error').hidden = false;
    $('print').disabled = $('download').disabled = true;
    $('preview').textContent = 'Revisá las medidas para generar la plantilla.';
    $('stats').innerHTML = $('offsets').innerHTML = $('print-pages').innerHTML = '';
    $('paper-note').textContent = '';
  }
}
$('form').addEventListener('submit', e => { e.preventDefault(); update(); });
$('form').addEventListener('input', update);
document.querySelectorAll('[data-diameter]').forEach(button => button.addEventListener('click', () => { $('diameter').value = button.dataset.diameter; update(); }));
$('print').addEventListener('click', () => { if (result) window.print(); });
$('download').addEventListener('click', () => {
  if (!result) return;
  const r = result;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${r.width}mm" height="${r.height}mm" viewBox="0 0 ${r.width} ${r.height}"><title>${description(r)}</title>${artwork(r)}</svg>`;
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = `diametro-${r.mode}-${r.diameter}mm-${r.angle}grados.svg`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
update();
