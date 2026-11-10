import test from 'node:test';
import assert from 'node:assert/strict';
import { materialNotice, pendingMaterialMessage, matchMaterial } from './solidworks.js';
const library = [{id: 'sae', name: 'Caño cuadrado 20 x 20 x 2 mm - SAE', stock: 6000}];
const row = (perfil = library[0].name, material = 'AISI 304') => ({solidworks: {needsMaterial: true, fields: {perfil, material, precision: 'exacta'}}});
test('Aviso expone las dos calidades contradictorias sin asignar material', () => {
    const r = row(), before = JSON.stringify(r);
    assert.match(materialNotice(r, library), /Contradicción.*Archivo declara: AISI 304.*Material del perfil: SAE.*bloqueada/);
    assert.equal(matchMaterial(r.solidworks.fields, library), undefined);
    assert.equal(JSON.stringify(r), before);
});
test('Aviso detecta calidad incompatible en perfil encontrado por dimensiones', () => {
    assert.match(materialNotice(row('20 x 20 x 2'), library), /Contradicción.*Material del perfil: SAE/);
});
test('Pendientes compatibles o desconocidos no se presentan como contradicción', () => {
    assert.match(materialNotice(row('perfil desconocido', 'SAE'), library), /^Material pendiente/);
    assert.match(materialNotice(row(library[0].name, 'SAE'), library), /^Material pendiente/);
});
test('El estado depende de las filas pendientes, aunque el control TXT esté aprobado', () => {
    const r = row();
    assert.match(pendingMaterialMessage([r]), /1 renglón con material pendiente/);
    r.solidworks.needsMaterial = false;
    assert.equal(pendingMaterialMessage([r]), '');
    assert.equal(materialNotice(r, library), '');
});
