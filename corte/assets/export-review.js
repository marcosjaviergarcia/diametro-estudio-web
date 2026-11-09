import { duplicateImports } from './import-identity.js';
const normalize = (s) => s.normalize('NFC').toLowerCase();
export const exportKey = (name) => normalize(name).replace(/\.(csv|txt)$/, '').replace(/_informe$/, '').replace(/_parcial(?=_|$)/g, '');
/** Match whole export names, never choose a report by selection order. */
export function pairExportFiles(files) {
    const csvs = files.filter(f => /\.csv$/i.test(f.name)), reports = files.filter(f => /\.txt$/i.test(f.name));
    if (!csvs.length)
        throw new Error('Seleccioná el CSV y, si lo tenés, su informe TXT de la misma ejecución.');
    if (files.length !== csvs.length + reports.length)
        throw new Error('Seleccioná únicamente archivos CSV y TXT.');
    const keys = csvs.map(f => exportKey(f.name));
    if (new Set(keys).size !== keys.length)
        throw new Error('Hay dos CSV de la misma ejecución. Elegí uno solo.');
    for (const report of reports)
        if (!keys.includes(exportKey(report.name)))
            throw new Error(`El informe ${report.name} no corresponde a los CSV elegidos. Seleccioná los archivos de la misma ejecución.`);
    return csvs.map(csv => {
        const matches = reports.filter(r => exportKey(r.name) === exportKey(csv.name));
        if (matches.length > 1)
            throw new Error(`Hay más de un informe para ${csv.name}. Elegí uno solo.`);
        return { csv, report: matches[0] };
    });
}
function actionFor(reason) {
    const text = normalize(reason);
    if (/supera dimensiones|cuerpo unido|limite geom|largo.*contradict/.test(text))
        return 'Revisar el cuerpo y la lista de cortes en SolidWorks: puede haber caños fusionados o una longitud incorrecta. Corregir y volver a exportar.';
    if (/sin material/.test(text))
        return 'Asignar el material en SolidWorks y volver a exportar. Esta pieza pudo quedar fuera del CSV.';
    if (/descripcion|description/.test(text))
        return 'Revisar el perfil de la lista de cortes en SolidWorks y volver a exportar.';
    if (/cantidad|cuerpos/.test(text))
        return 'Revisar la cantidad y los cuerpos de esa pieza en SolidWorks antes de repetir la exportación.';
    return 'Revisar esta pieza en SolidWorks y volver a generar juntos el CSV y su informe.';
}
/** The report describes source checks, not a guarantee of manufacturing accuracy. */
export function reviewExport(csvName, fields, report) {
    const result = { csvName, machine: '', configuration: '', state: 'unverified', rows: fields.length, pieces: fields.reduce((n, f) => n + Number(f.cantidad), 0), pending: 0, issues: [], rowIds: [] };
    const markedPartial = /_parcial(?:_|\.)/i.test(csvName) || fields.some(f => f.lista_parcial?.trim().toLowerCase() === 'si');
    if (!report) {
        if (markedPartial) {
            result.state = 'partial';
            result.pending = 1;
            result.issues.push({ piece: 'Exportación parcial', reason: 'El CSV está marcado PARCIAL y no se adjuntó su informe.', action: 'Usar «Agregar archivo de control (TXT)» para ver qué quedó pendiente, sin volver a cargar las piezas.' });
        }
        return result;
    }
    if (exportKey(csvName) !== exportKey(report.name))
        throw new Error('El CSV y el TXT no pertenecen a la misma ejecución.');
    const text = report.text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    if (!/^(CORTE - EXPORTACION|RODILLOS - LECTURA)/m.test(text))
        throw new Error(`No se reconoce el informe ${report.name}. Usá el TXT generado por la macro de perfiles o rodillos.`);
    if (/^RODILLOS - LECTURA/m.test(text) && !text.includes('EXPORTACION DIRECTA - CLASIFICACION Y PENDIENTES'))
        throw new Error('El informe de rodillos no contiene la clasificación final. Repetí la exportación antes de usarlo.');
    result.reportName = report.name;
    result.machine = (text.match(/^Ensamblaje=(.*)$/m)?.[1] ?? '').trim().split(/[\\/]/).at(-1) ?? '';
    result.configuration = (text.match(/^Configuracion raiz=(.*)$/m)?.[1] ?? '').trim();
    const summary = [...text.matchAll(/^Filas exportadas=(\d+); incidencias pendientes=(\d+)/gm)].at(-1);
    if (/^CORTE - EXPORTACION/m.test(text) && !summary)
        throw new Error('El informe de perfiles no tiene resumen final. Puede estar incompleto: repetí la exportación.');
    if (summary && Number(summary[1]) !== fields.length)
        throw new Error(`El informe indica ${summary[1]} filas y el CSV contiene ${fields.length}. No se importó: comprobá que no se mezclaron o editaron los archivos.`);
    const unique = new Map();
    const add = (issue) => unique.set(JSON.stringify([issue.piece, issue.reason]), issue);
    const lines = text.split('\n');
    lines.forEach((line, i) => {
        if (/^PENDIENTE \|/.test(line)) {
            const reason = (lines.slice(i + 1, i + 4).find(l => /^\s*Largo_mm=/.test(l)) ?? '').split(' | ').slice(2).join(' | ').trim() || 'La macro dejó esta pieza pendiente.';
            add({ piece: line.split('Pieza/Referencia=')[1]?.trim() || line, reason, action: actionFor(reason) });
        }
        else if (/^(ERROR_ITEM|ERROR_INSTANCIA|PENDIENTE_ESTADO|PENDIENTE_NO_CARGADO|PENDIENTE_INSTANCIA|ERROR_RESOLVER_ALIGERADOS) \|/.test(line)) {
            add({ piece: line.split(' | ')[1] ?? 'Componente sin leer', reason: line, action: 'Resolver la carga o el error de esta pieza en SolidWorks. Puede haber piezas sin exportar.' });
        }
    });
    const classification = text.split('EXPORTACION DIRECTA - CLASIFICACION Y PENDIENTES')[1] ?? '';
    for (const line of classification.split('\n')) {
        const [kind, piece] = line.split(' | ');
        const rules = {
            CONFIRMAR_BARRA: ['Barra de origen del eje por confirmar.', 'Elegir la barra comercial correcta y definir la sobremedida de mecanizado antes de cortar.'],
            CONFIRMAR_ESPESOR: ['Espesor del caño sin confirmar.', 'Confirmar el espesor y seleccionar el material correcto; el diámetro solo no alcanza.'],
            PENDIENTE_MEDICION: ['No se pudo medir la pieza.', 'Revisar su geometría en SolidWorks y repetir la exportación.'],
            PENDIENTE_TIPO: ['No se pudo confirmar si corresponde a un tubo de corte.', 'Revisar la clasificación en SolidWorks.'],
            SIN_CLASIFICAR: ['Pieza no clasificada por la macro; quedó fuera del CSV.', 'Confirmar si pertenece al pedido. Si debe cortarse, clasificarla y volver a exportar.'],
        };
        if (rules[kind])
            add({ piece: piece ?? 'Pieza sin identificar', reason: rules[kind][0], action: rules[kind][1] });
    }
    result.pending = Math.max(summary ? Number(summary[2]) : 0, unique.size, markedPartial ? 1 : 0);
    result.issues = [...unique.values()].slice(0, 100);
    result.state = result.pending ? 'partial' : 'reported';
    return result;
}
/** Validate saved diagnostics instead of silently dropping them on reopening. */
export function readReviews(value) {
    if (value === undefined)
        return [];
    if (!Array.isArray(value) || value.length > 200)
        throw new Error('Diagnóstico de exportación inválido.');
    return value.map(v => {
        if (!v || typeof v !== 'object')
            throw new Error('Diagnóstico de exportación inválido.');
        const r = v;
        if (!['reported', 'partial', 'unverified'].includes(r.state) || !['csvName', 'machine', 'configuration'].every(k => typeof r[k] === 'string') ||
            (r.reportName !== undefined && typeof r.reportName !== 'string') || !['rows', 'pieces', 'pending'].every(k => Number.isSafeInteger(r[k]) && r[k] >= 0) ||
            !Array.isArray(r.rowIds) || !r.rowIds.every(id => typeof id === 'string') || !Array.isArray(r.issues) || r.issues.length > 100 || !r.issues.every(i => i && ['piece', 'reason', 'action'].every(k => typeof i[k] === 'string')))
            throw new Error('Diagnóstico de exportación inválido.');
        return { ...r, rowIds: [...r.rowIds], issues: r.issues.map(i => ({ ...i })) };
    });
}
export function relevantReviews(order) {
    const ids = new Set(order.rows.map(r => r.id));
    const reviews = (order.exportReviews ?? []).filter(r => r.rowIds.some(id => ids.has(id)));
    const covered = new Set(reviews.flatMap(r => r.rowIds));
    const legacy = order.rows.filter(r => r.solidworks && !covered.has(r.id)).length;
    const copies = duplicateImports(order.rows, order.exportReviews).length;
    return { reviews, legacy, hasWarnings: copies > 0 || legacy > 0 || reviews.some(r => r.state !== 'reported') };
}
const esc = (s) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function reviewPrintNotice(order) {
    const { reviews, legacy, hasWarnings } = relevantReviews(order);
    if (!hasWarnings)
        return '';
    const partial = reviews.some(r => r.state === 'partial');
    if (duplicateImports(order.rows, order.exportReviews).length)
        return '<aside class="export-print-warning"><strong>HAY CARGAS REPETIDAS</strong><p>Revisá las copias idénticas en el pedido antes de entregar este plan: las cantidades pueden estar duplicadas.</p></aside>';
    const names = reviews.filter(r => r.state !== 'reported').map(r => r.csvName);
    return `<aside class="export-print-warning"><strong>${partial ? 'LISTA PARCIAL · REQUIERE REVISIÓN' : 'FALTA EL ARCHIVO DE CONTROL (TXT)'}</strong><p>${partial ? 'Hay piezas o datos pendientes. Revisá «Qué hay que resolver» en Corte antes de entregar este plan.' : 'Agregá el TXT de la macro en Corte para saber si hubo problemas al exportar.'} ${legacy ? `${legacy} renglones sin informe de control. ` : ''}${esc(names.join(' · '))}</p></aside>`;
}
