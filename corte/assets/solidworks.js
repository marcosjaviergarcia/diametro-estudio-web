import { MAX_PIECES } from './optimizer.js';
export const MAX_CSV_BYTES = 10 * 1024 * 1024;
const key = (s) => s.normalize('NFC').toLocaleLowerCase('es').trim().replace(/\s+/g, ' ');
/** Strict semicolon CSV, including quoted newlines and escaped quotes. */
export function parseSolidWorks(text) {
    if (new Blob([text]).size > MAX_CSV_BYTES)
        throw new Error('El CSV supera 10 MB.');
    text = text.replace(/^\uFEFF/, '');
    if (/[\u0000\ufffd]/.test(text))
        throw new Error('El CSV no es texto UTF-8 válido.');
    const records = [];
    let row = [], field = '', quoted = false, closed = false;
    const finish = () => { row.push(field); if (row.some(v => v !== ''))
        records.push(row); row = []; field = ''; closed = false; };
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (quoted) {
            if (c === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i++;
                }
                else {
                    quoted = false;
                    closed = true;
                }
            }
            else
                field += c;
        }
        else if (c === ';') {
            row.push(field);
            field = '';
            closed = false;
        }
        else if (c === '\r' || c === '\n') {
            finish();
            if (c === '\r' && text[i + 1] === '\n')
                i++;
        }
        else if (c === '"' && !field && !closed)
            quoted = true;
        else {
            if (closed || c === '"')
                throw new Error('CSV inválido: comillas mal cerradas.');
            field += c;
        }
    }
    if (quoted)
        throw new Error('CSV inválido: falta cerrar comillas.');
    finish();
    const headers = records.shift()?.map(key) ?? [];
    if (new Set(headers).size !== headers.length || headers.some(h => !h))
        throw new Error('Encabezados repetidos o vacíos.');
    for (const required of ['perfil', 'referencia', 'largo_mm', 'cantidad'])
        if (!headers.includes(required))
            throw new Error(`Falta la columna ${required}.`);
    if (!records.length)
        throw new Error('El CSV no contiene piezas.');
    let total = 0;
    return records.map((values, i) => {
        const label = `Registro ${i + 2}`;
        if (values.length !== headers.length)
            throw new Error(`${label}: cantidad de columnas incorrecta.`);
        const fields = Object.fromEntries(headers.map((h, j) => [h, values[j]]));
        if (fields.precision && !['exacta', 'entera'].includes(fields.precision))
            throw new Error(`${label}: precision inválida.`);
        if (!fields.perfil.trim())
            throw new Error(`${label}: falta perfil.`);
        // VBA's DecimalDot can emit "2280." and "2.". Accept the decimal point
        // without trailing digits; quantities may only have zero fractional digits.
        if (!/^\d+(\.\d*)?$/.test(fields.largo_mm) || Number(fields.largo_mm) <= 0 || Number(fields.largo_mm) > 1_000_000)
            throw new Error(`${label}: largo_mm inválido.`);
        if (!/^\d+(\.0*)?$/.test(fields.cantidad) || !Number.isSafeInteger(Number(fields.cantidad)) || Number(fields.cantidad) < 1)
            throw new Error(`${label}: cantidad inválida.`);
        total += Number(fields.cantidad);
        if (total > MAX_PIECES)
            throw new Error(`El pedido admite hasta ${MAX_PIECES} piezas.`);
        return fields;
    });
}
// Normalize notation only, never round dimensions or perform substring matching.
const notation = (s) => key(s).replace(/×/g, 'x').replace(/(\d),(\d)/g, '$1.$2')
    .replace(/\d+(?:\.\d+)?/g, n => String(Number(n))).replace(/\s*x\s*/g, 'x');
function description(name) {
    const [shape, grade = ''] = notation(name).split(/\s+-\s+/);
    const dimensions = shape.match(/^(?:(caño cuadrado|caño rectangular|ángulo)\s+)?(\d+(?:\.\d+)?x\d+(?:\.\d+)?x\d+(?:\.\d+)?)(?:\s+mm)?$/);
    return { shape, grade, dimensions: dimensions?.[2], family: dimensions?.[1] };
}
function compatibleGrade(source, candidate) {
    if (!source || !candidate || source === 'calidad sin especificar' || candidate === 'calidad sin especificar')
        return true;
    if (source === candidate)
        return true;
    return (candidate === 'sae' && /^sae \d+$/.test(source)) || (source === 'sae' && /^sae \d+$/.test(candidate));
}
const originKey = (f) => JSON.stringify([notation(f.perfil), notation(f.material ?? '')]);
/** Presentation only: never resolves or assigns a pending material. */
export function materialNotice(row, library = []) {
    if (!row.solidworks?.needsMaterial) return '';
    const f = row.solidworks.fields, source = description(f.perfil);
    const candidates = library.filter(m => {
        const target = description(m.name);
        return target.shape === source.shape || (source.dimensions && source.dimensions === target.dimensions &&
            (!source.family || !target.family || source.family === target.family));
    });
    const grades = [...new Set(candidates.map(m => description(m.name).grade).filter(Boolean))];
    const declared = f.material?.trim() || 'sin declarar';
    const conflict = !compatibleGrade(notation(f.material ?? ''), source.grade) ||
        (grades.length > 0 && grades.every(g => !compatibleGrade(notation(f.material ?? ''), g)));
    return `${conflict ? 'Contradicción de materiales' : 'Material pendiente de asignación'}. Archivo declara: ${declared}. Material del perfil: ${(source.grade || grades.join(' / ') || 'sin identificar').toLocaleUpperCase('es')}. ${conflict ? 'Asignación automática bloqueada. Verificá el origen y seleccioná el material correcto de biblioteca.' : 'Seleccioná un material de biblioteca para continuar.'}`;
}
export function pendingMaterialMessage(rows) {
    const count = rows.filter(r => r.solidworks?.needsMaterial).length;
    return count ? `Hay ${count} ${count === 1 ? 'renglón con material pendiente' : 'renglones con materiales pendientes'}. Revisá las contradicciones y seleccioná el material correcto antes de calcular.` : '';
}
/** Exact names or complete dimension signatures, with compatible quality and one candidate only. */
export function matchMaterial(fields, library) {
    const profile = key(fields.perfil), grade = key(fields.material ?? '');
    const source = description(fields.perfil);
    const declaredGrade = notation(grade);
    // Contradictory source fields require manual selection, even for an exact
    // name. Do not silently prefer either the profile suffix or material column.
    if (!compatibleGrade(declaredGrade, source.grade))
        return undefined;
    const compatible = library.filter(m => {
        const target = description(m.name);
        return compatibleGrade(declaredGrade, target.grade) && compatibleGrade(source.grade, target.grade);
    });
    if (fields.precision === 'exacta') {
        const exact = compatible.filter(m => key(m.name) === profile);
        if (exact.length === 1)
            return exact[0];
    }
    const matches = compatible.filter(m => {
        const name = key(m.name);
        if (fields.precision === 'exacta' && name === profile)
            return true;
        if (grade ? name === `${profile} ${grade}` || (name === profile && profile.endsWith(` ${grade}`)) : name === profile)
            return true;
        const target = description(m.name);
        const sameShape = source.shape === target.shape || (source.dimensions && source.dimensions === target.dimensions &&
            (!source.family || !target.family || source.family === target.family));
        return !!sameShape && compatibleGrade(notation(grade || source.grade), target.grade);
    });
    return matches.length === 1 ? matches[0] : undefined;
}
// Round the source decimal to the nearest millimetre; exact halves go up.
export function importLength(value, precision) {
    if (precision === "exacta") {
        if (!/^\d+(\.\d{0,2})?$/.test(value))
            throw new Error("El largo exacto admite hasta dos decimales.");
        return String(Number(value));
    }
    const [whole, fraction = ''] = value.split('.');
    const rounded = Number(whole) + (Number(fraction[0] ?? '0') >= 5 ? 1 : 0);
    if (rounded < 1)
        throw new Error(`El largo ${value} mm queda en 0 mm al redondear. Revisá la medida de origen.`);
    return String(rounded);
}
export function importSolidWorks(order, fields, library, uid) {
    const stocks = Object.assign(Object.create(null), order.stocks);
    const existing = order.rows.filter(r => r.profile || r.reference || r.length || r.quantity !== '1');
    const total = existing.reduce((n, r) => n + (Number(r.quantity) || 0), 0) + fields.reduce((n, f) => n + Number(f.cantidad), 0);
    if (total > MAX_PIECES)
        throw new Error(`El pedido combinado supera ${MAX_PIECES} piezas.`);
    const importId = uid();
    const associations = new Map();
    const rows = fields.map(f => {
        const origin = originKey(f);
        if (!associations.has(origin))
            associations.set(origin, matchMaterial(f, library));
        let material = associations.get(origin);
        if (material && Object.hasOwn(stocks, material.name) && Number(stocks[material.name]) !== Number(material.stock))
            material = undefined;
        if (material)
            stocks[material.name] = material.stock;
        return { id: uid(), profile: material?.name ?? f.perfil.trim(), reference: f.referencia,
            length: importLength(f.largo_mm, f.precision), quantity: String(Number(f.cantidad)),
            solidworks: { fields: { ...f }, needsMaterial: !material, importId, ...(material ? { materialId: material.id } : {}) } };
    });
    return { order: { ...order, stocks, rows: [...existing, ...rows] }, pending: rows.filter(r => r.solidworks.needsMaterial).length,
        rounded: rows.filter(r => Number(r.length) !== Number(r.solidworks.fields.largo_mm)).length };
}
export function selectImportedMaterial(order, row, material) {
    const source = row.solidworks;
    const targets = source ? order.rows.filter(r => r.solidworks && r.solidworks.importId === source.importId && originKey(r.solidworks.fields) === originKey(source.fields)) : [row];
    if (!targets.includes(row))
        targets.push(row);
    for (const target of targets) {
        target.profile = material.name;
        if (target.solidworks) {
            target.solidworks.needsMaterial = false;
            target.solidworks.materialId = material.id;
        }
    }
    Object.defineProperty(order.stocks, material.name, { value: material.stock, configurable: true, writable: true, enumerable: true });
}
