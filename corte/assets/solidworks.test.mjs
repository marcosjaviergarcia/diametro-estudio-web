import assert from 'node:assert/strict';
import test from 'node:test';
import { FACTORY_MATERIALS } from './factory-library.js';
import { matchMaterial, parseSolidWorks, importSolidWorks, selectImportedMaterial } from './solidworks.js';

const steel = FACTORY_MATERIALS.find(m => m.name === 'Caño cuadrado 20 x 20 x 2 mm - SAE');
assert.ok(steel, 'El caso de regresión debe usar un perfil real de la biblioteca.');
const source = overrides => ({ perfil: steel.name, material: 'SAE', precision: 'exacta', referencia: 'Pieza A', largo_mm: '1250.25', cantidad: '2', ...overrides });

for (const precision of ['exacta', 'entera', undefined]) {
  test(`No asigna nombre SAE con material AISI 304 (precisión ${precision ?? 'ausente'})`, () => {
    assert.equal(matchMaterial(source({ material: 'AISI 304', precision }), FACTORY_MATERIALS), undefined);
  });
}

test('No resuelve una contradicción de origen eligiendo otro material', () => {
  const stainless = { ...steel, id: 'user-inox', name: steel.name.replace('SAE', 'AISI 304') };
  assert.equal(matchMaterial(source({ material: 'AISI 304' }), [steel, stainless]), undefined);
});

test('Conserva coincidencias exactas compatibles y sin calidad declarada', () => {
  for (const material of ['SAE', 'SAE 1010', ' sae ', '']) {
    assert.equal(matchMaterial(source({ material }), FACTORY_MATERIALS), steel);
  }
});

test('Compara la calidad también en coincidencias por dimensiones', () => {
  const perfil = '20×20×2';
  assert.equal(matchMaterial(source({ perfil, material: 'SAE' }), [steel]), steel);
  assert.equal(matchMaterial(source({ perfil, material: 'AISI 304' }), [steel]), undefined);
  const specific = { ...steel, name: steel.name.replace('SAE', 'SAE 1010') };
  assert.equal(matchMaterial(source({ perfil, material: 'SAE 1045' }), [specific]), undefined);
});

test('No confunde dimensiones o familias, ni elige entre coincidencias ambiguas', () => {
  assert.equal(matchMaterial(source({ perfil: 'Caño rectangular 20x20x2', material: 'SAE' }), [steel]), undefined);
  assert.equal(matchMaterial(source({ perfil: '20x20x3', material: 'SAE' }), [steel]), undefined);
  assert.equal(matchMaterial(source({ perfil: '20x20x2', material: 'SAE' }), [steel, { ...steel, id: 'user-copy' }]), undefined);
});

test('Una calidad sin especificar no contradice por sí sola un material declarado', () => {
  const unspecified = { ...steel, name: steel.name.replace('SAE', 'Calidad sin especificar') };
  assert.equal(matchMaterial(source({ perfil: unspecified.name, material: 'AISI 304' }), [unspecified]), unspecified);
});

test('CSV contradictorio queda pendiente y conserva el origen hasta selección manual', () => {
  const csv = `perfil;material;precision;referencia;largo_mm;cantidad\n${steel.name};AISI 304;exacta;Pieza A;1250.25;2`;
  const fields = parseSolidWorks(csv);
  const order = { rows: [], stocks: {}, kerf: '3' };
  let id = 0;
  const imported = importSolidWorks(order, fields, FACTORY_MATERIALS, () => `test-${++id}`);
  const row = imported.order.rows[0];
  assert.equal(imported.pending, 1);
  assert.equal(row.solidworks.needsMaterial, true);
  assert.equal(row.solidworks.materialId, undefined);
  assert.deepEqual(row.solidworks.fields, fields[0]);
  assert.equal(row.length, '1250.25');
  assert.equal(row.quantity, '2');
  assert.deepEqual(Object.keys(imported.order.stocks), []);
  assert.deepEqual(order, { rows: [], stocks: {}, kerf: '3' });
  const manual = { id: 'user-inox', name: 'Caño cuadrado 20 x 20 x 2 mm - AISI 304', stock: '6000' };
  selectImportedMaterial(imported.order, row, manual);
  assert.equal(row.solidworks.needsMaterial, false);
  assert.equal(row.solidworks.materialId, manual.id);
  assert.equal(row.profile, manual.name);
  assert.deepEqual(row.solidworks.fields, fields[0]);
});

test('Importación compatible mantiene asociación, medidas y barra comercial', () => {
  let id = 0;
  const imported = importSolidWorks({ rows: [], stocks: {}, kerf: '3' }, [source()], FACTORY_MATERIALS, () => `test-${++id}`);
  assert.equal(imported.pending, 0);
  assert.equal(imported.order.rows[0].solidworks.materialId, steel.id);
  assert.equal(imported.order.rows[0].length, '1250.25');
  assert.equal(imported.order.rows[0].quantity, '2');
  assert.equal(imported.order.stocks[steel.name], steel.stock);
});
