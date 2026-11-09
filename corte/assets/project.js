import { readReviews } from './export-review.js';
export const MAX_PROJECT_BYTES = 10 * 1024 * 1024;
const record = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
// Preserve input strings, including unfinished work and comma decimals.
export function readOrder(value) {
    if (!record(value) || !Array.isArray(value.rows) || !record(value.stocks) || typeof value.kerf !== 'string')
        throw new Error('El archivo no contiene un pedido válido.');
    const ids = new Set();
    const rows = value.rows.map(row => {
        if (!record(row) || !['id', 'profile', 'length', 'quantity'].every(key => typeof row[key] === 'string') || !row.id || ids.has(row.id))
            throw new Error('El archivo contiene filas inválidas o identificadores repetidos.');
        ids.add(row.id);
        if (row.reference !== undefined && typeof row.reference !== 'string')
            throw new Error('El archivo contiene una referencia de pieza inválida.');
        let solidworks;
        if (row.solidworks !== undefined) {
            const source = row.solidworks;
            if (!record(source) || typeof source.needsMaterial !== 'boolean' || !record(source.fields) ||
                !Object.values(source.fields).every(v => typeof v === 'string') ||
                !['perfil', 'referencia', 'largo_mm', 'cantidad'].every(k => typeof source.fields[k] === 'string'))
                throw new Error('Datos de SolidWorks inválidos.');
            for (const key of ['importId', 'materialId'])
                if (source[key] !== undefined && typeof source[key] !== 'string')
                    throw new Error('Asociación de SolidWorks inválida.');
            solidworks = { ...(typeof source.importId === 'string' ? { importId: source.importId } : {}), ...(typeof source.materialId === 'string' ? { materialId: source.materialId } : {}), needsMaterial: source.needsMaterial, fields: { ...source.fields } };
        }
        return { ...(solidworks ? { solidworks } : {}), id: row.id, profile: row.profile, length: row.length, quantity: row.quantity, ...(row.reference !== undefined ? { reference: row.reference } : {}) };
    });
    const stocks = Object.create(null);
    for (const [key, stock] of Object.entries(value.stocks)) {
        if (typeof stock !== 'string')
            throw new Error('El archivo contiene largos comerciales inválidos.');
        stocks[key] = stock;
    }
    const exportReviews = readReviews(value.exportReviews);
    return { rows, stocks, kerf: value.kerf, ...(exportReviews.length ? { exportReviews } : {}) };
}
export function serializeProject(order) {
    const snapshot = readOrder(order);
    for (const row of snapshot.rows) {
        const profile = row.profile.trim();
        if (!row.solidworks?.needsMaterial && profile && !Object.hasOwn(snapshot.stocks, profile))
            snapshot.stocks[profile] = '6000';
    }
    const text = JSON.stringify({ format: 'corte-project', version: 1, units: 'mm', order: snapshot }, null, 2);
    if (new Blob([text]).size > MAX_PROJECT_BYTES)
        throw new Error('El proyecto supera el límite de 10 MB.');
    return text;
}
export function parseProject(text) {
    if (new Blob([text]).size > MAX_PROJECT_BYTES)
        throw new Error('El proyecto supera el límite de 10 MB.');
    let value;
    try {
        value = JSON.parse(text.replace(/^\uFEFF/, ''));
    }
    catch {
        throw new Error('El archivo no es un proyecto válido: no se pudo leer su contenido.');
    }
    if (!record(value) || value.format !== 'corte-project')
        throw new Error('Este archivo no es un proyecto de Corte.');
    if (value.version !== 1)
        throw new Error('La versión de este proyecto no es compatible con esta aplicación.');
    if (value.units !== 'mm')
        throw new Error('Las unidades del proyecto no son compatibles.');
    return readOrder(value.order);
}
