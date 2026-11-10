import assert from 'node:assert/strict';
import test from 'node:test';
import { calculate } from './geometry.mjs';
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} != ${b}`);

test('Boca de pescado: cotas analíticas y orientación a 90°', () => {
  const equal = calculate({ mode: 'notch', diameter: 50, parent: 50, angle: 90 });
  close(equal.circumference, 50 * Math.PI);
  close(equal.depth, 25);
  close(equal.offsets[0].depth, 25);
  close(equal.offsets[3].depth, 0);
  const larger = calculate({ mode: 'notch', diameter: 50, parent: 100, angle: 90 });
  const expected = 50 - Math.sqrt(50 ** 2 - 25 ** 2);
  close(larger.depth, expected);
  close(larger.offsets[0].depth, expected);
  close(larger.offsets[3].depth, 0);
  assert.ok(larger.points[0][1] > larger.points[360][1], 'El extremo más largo está a 90°, no a 0°.');
});

// Reconstruct the paper keeping its lower grey region: increasing Y must move
// away from the receiver along positive tube Z. Test the cylinder independently.
for (const [diameter, parent] of [[50, 50], [50, 100], [10, 500], [300, 300]]) {
  for (const angle of [10, 30, 60, 90]) {
    test(`Material conservado fuera del receptor: Ø${diameter}/Ø${parent}, ${angle}°`, () => {
      const result = calculate({ mode: 'notch', diameter, parent, angle });
      const r = diameter / 2, R = parent / 2, a = angle * Math.PI / 180;
      const z0 = (r * Math.cos(a) + R) / Math.sin(a);
      const y0 = result.points[0][1];
      for (const [x, y] of result.points) {
        const theta = x / r, z = z0 + y - y0;
        const along = z * Math.sin(a) - r * Math.cos(theta) * Math.cos(a);
        const transverse = r * Math.sin(theta);
        close(Math.hypot(along, transverse), R);
        assert.ok(along >= -1e-7, 'El corte debe estar en la cara próxima al caño conservado.');
        assert.ok(Math.hypot(along + Math.sin(a), transverse) > R,
          'Un punto 1 mm por debajo de la curva debe quedar fuera del receptor.');
        if (along > 1e-6) {
          const step = Math.min(1, along / Math.sin(a));
          assert.ok(Math.hypot(along - step * Math.sin(a), transverse) < R,
            'El descarte inmediatamente por encima del corte entra en el receptor.');
        }
      }
      close(result.points[0][1], result.points.at(-1)[1]);
      for (let i = 0; i < result.offsets.length; i++) {
        close(result.offsets[i].distance, result.points[i * 120][0]);
        close(result.offsets[i].depth + 12, result.points[i * 120][1]);
      }
    });
  }
}

test('Inglete: conserva cotas, orientación y tabla originales', () => {
  for (const angle of [10, 30, 60, 90]) {
    const result = calculate({ mode: 'miter', diameter: 50, angle });
    const amplitude = 25 * Math.tan(angle * Math.PI / 360);
    close(result.depth, 2 * amplitude);
    for (const [x, y] of result.points) close(y, 12 + amplitude * (1 - Math.cos(x / 25)));
    for (const row of result.offsets) close(row.depth, amplitude * (1 - Math.cos(row.degrees * Math.PI / 180)));
  }
});

test('Se conservan las validaciones de medidas', () => {
  for (const data of [{ diameter: NaN }, { diameter: 0 }, { parent: 20 }, { angle: 0 }, { angle: 91 }]) {
    assert.throws(() => calculate({ mode: 'notch', diameter: 50, parent: 60, angle: 90, ...data }));
  }
});
