// Intersección de cilindros con ejes concurrentes; medidas exteriores en mm.
export function calculate({ mode, diameter, parent, angle }) {
  if (!['notch', 'miter'].includes(mode)) throw new Error('Elegí un tipo de unión.');
  if (!Number.isFinite(diameter) || diameter < 10 || diameter > 300) throw new Error('El diámetro a cortar debe estar entre 10 y 300 mm.');
  if (!Number.isFinite(angle) || angle < 10 || angle > 90) throw new Error('El ángulo debe estar entre 10° y 90°.');
  if (mode === 'notch' && (!Number.isFinite(parent) || parent < diameter || parent > 500)) throw new Error('El caño receptor debe ser igual o mayor al caño a cortar, hasta 500 mm.');
  const r = diameter / 2, R = parent / 2, a = angle * Math.PI / 180;
  const circumference = Math.PI * diameter;
  const axial = theta => mode === 'notch'
    ? (r * Math.cos(theta) * Math.cos(a) + Math.sqrt(Math.max(0, R * R - r * r * Math.sin(theta) ** 2))) / Math.sin(a)
    : r * Math.cos(theta) * Math.tan(a / 2);
  const raw = Array.from({ length: 1441 }, (_, i) => axial(i * Math.PI / 720));
  const max = Math.max(...raw), min = Math.min(...raw);
  const points = raw.map((z, i) => [circumference * i / 1440, 12 + max - z]);
  return { mode, diameter, parent, angle, circumference, depth: max - min,
    width: circumference + 10, height: max - min + 40, points,
    offsets: Array.from({ length: 13 }, (_, i) => ({ degrees: i * 30, distance: circumference * i / 12, depth: max - axial(i * Math.PI / 6) })) };
}
