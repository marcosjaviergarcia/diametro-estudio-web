import { FACTORY_MATERIALS } from './factory-library.js';
import { mm } from './optimizer.js';
export const LIBRARY_STORAGE_KEY = 'corte-library-changes-v1';
export const emptyChanges = () => ({ version: 1, upserts: [], hidden: [] });
export const normalizeSearch = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').replace(/ø/g, 'o').replace(/×/g, 'x').trim();
export function effectiveLibrary(changes, factory = FACTORY_MATERIALS) {
    const merged = new Map(factory.map(m => [m.id, { ...m }]));
    // Keep full edited records, even if a later factory release removes them.
    for (const material of changes.upserts)
        merged.set(material.id, { ...material });
    for (const id of changes.hidden)
        merged.delete(id);
    return [...merged.values()].sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true }));
}
export function searchMaterials(materials, query) {
    const tokens = normalizeSearch(query).split(/\s+/).filter(Boolean);
    return materials.filter(m => tokens.every(token => normalizeSearch(`${m.name} ${m.stock}`).includes(token)));
}
export function validateMaterial(name, stock, id, others) {
    name = name.trim().replace(/\s+/g, ' ');
    if (!name || name.length > 160)
        throw new Error('Ingresá un nombre de entre 1 y 160 caracteres.');
    if (/[\u0000-\u001f\ufffd]/.test(name))
        throw new Error('El nombre contiene caracteres inválidos.');
    const length = mm(stock, 'Largo comercial');
    if (others.some(m => m.id !== id && normalizeSearch(m.name) === normalizeSearch(name)))
        throw new Error('Ya existe un material con ese nombre. Diferenciá la medida o la calidad en el nombre.');
    return { id, name, stock: String(length / 100) };
}
export function readChanges(text) {
    if (text === null)
        return emptyChanges();
    const data = JSON.parse(text);
    if (!data || data.version !== 1 || !Array.isArray(data.upserts) || !Array.isArray(data.hidden))
        throw new Error('Formato de biblioteca local no compatible.');
    const ids = new Set();
    const upserts = data.upserts.map((m) => {
        if (!m || typeof m.id !== 'string' || !/^(factory|user)-[a-zA-Z0-9-]+$/.test(m.id) || ids.has(m.id) || typeof m.name !== 'string' || typeof m.stock !== 'string')
            throw new Error('Material local inválido.');
        ids.add(m.id);
        return validateMaterial(m.name, m.stock, m.id, []);
    });
    if (!data.hidden.every((id) => typeof id === 'string' && /^(factory|user)-[a-zA-Z0-9-]+$/.test(id)))
        throw new Error('Lista de materiales eliminados inválida.');
    return { version: 1, upserts, hidden: [...new Set(data.hidden)] };
}
export function putMaterial(changes, material) {
    return { version: 1, upserts: [...changes.upserts.filter(m => m.id !== material.id), material], hidden: changes.hidden.filter(id => id !== material.id) };
}
export function hideMaterial(changes, id) {
    return { ...changes, hidden: [...new Set([...changes.hidden, id])] };
}
export function restoreMaterial(changes, id) {
    return { ...changes, hidden: changes.hidden.filter(item => item !== id) };
}
