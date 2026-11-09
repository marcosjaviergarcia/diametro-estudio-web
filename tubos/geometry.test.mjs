import assert from 'node:assert/strict';
import { calculate } from './geometry.mjs';
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);
const equal = calculate({ mode: 'notch', diameter: 50, parent: 50, angle: 90 });
close(equal.circumference, 50 * Math.PI);
close(equal.depth, 25);
close(equal.points[0][1], equal.points.at(-1)[1]);
close(equal.offsets[3].depth, 25);
const larger = calculate({ mode: 'notch', diameter: 50, parent: 100, angle: 90 });
close(larger.depth, 50 - Math.sqrt(50 ** 2 - 25 ** 2));
const miter = calculate({ mode: 'miter', diameter: 50, angle: 90 });
close(miter.depth, 50);
close(calculate({ mode: 'miter', diameter: 50, angle: 30 }).depth, 50 * Math.tan(Math.PI / 12));
// Check points against the receiving cylinder equation for oblique intersections.
for (const angle of [10, 30, 60, 90]) {
  const r = calculate({ mode: 'notch', diameter: 50, parent: 80, angle });
  const a = angle * Math.PI / 180;
  const zMax = (25 * Math.cos(a) + 40) / Math.sin(a);
  r.points.forEach(([x, y]) => {
    const t = x / 25, z = zMax - (y - 12);
    close((z * Math.sin(a) - 25 * Math.cos(t) * Math.cos(a)) ** 2 + (25 * Math.sin(t)) ** 2, 40 ** 2);
  });
}
for (const data of [{ diameter: NaN }, { diameter: 0 }, { parent: 20 }, { angle: 0 }, { angle: 91 }]) {
  assert.throws(() => calculate({ mode: 'notch', diameter: 50, parent: 60, angle: 90, ...data }));
}
console.log('OK: geometría, continuidad, intersecciones oblicuas y validaciones.');
