const fieldsKey = (f) => JSON.stringify(Object.keys(f).sort().map(k => [k, f[k]]));
const sourceKey = (fields) => JSON.stringify(fields.map(fieldsKey).sort());
export function importedGroups(rows) {
    const groups = new Map();
    for (const row of rows)
        if (row.solidworks) {
            const id = row.solidworks.importId ?? 'legacy';
            const group = groups.get(id) ?? [];
            group.push(row);
            groups.set(id, group);
        }
    return [...groups.values()];
}
const nameKey = (name) => name.normalize('NFC').toLowerCase();
function namesFor(group, reviews) {
    const ids = new Set(group.map(r => r.id));
    return new Set(reviews.filter(r => r.rowIds.some(id => ids.has(id))).map(r => nameKey(r.csvName)));
}
export function matchingImports(rows, fields, csvName, reviews = []) {
    const key = sourceKey(fields);
    return importedGroups(rows).filter(group => {
        const names = namesFor(group, reviews);
        return sourceKey(group.map(r => r.solidworks.fields)) === key && (!csvName || !names.size || names.has(nameKey(csvName)));
    });
}
/** Only complete import groups with identical current values can be removed as copies. */
export function duplicateImports(rows, reviews = []) {
    const seen = new Map();
    const duplicates = [];
    for (const group of importedGroups(rows)) {
        const key = JSON.stringify(group.map(r => JSON.stringify([fieldsKey(r.solidworks.fields), r.profile, r.reference ?? '', r.length, r.quantity, r.solidworks.needsMaterial, r.solidworks.materialId ?? ''])).sort());
        const previous = seen.get(key) ?? [], names = namesFor(group, reviews);
        const keep = previous.find(candidate => { const old = namesFor(candidate, reviews); return !names.size || !old.size || [...names].some(n => old.has(n)); });
        if (keep)
            duplicates.push({ keep, copy: group });
        else {
            previous.push(group);
            seen.set(key, previous);
        }
    }
    return duplicates;
}
/** Called only after the user explicitly confirms removing complete, unchanged copies. */
export function removeImportCopies(order) {
    const replacements = new Map();
    for (const { keep, copy } of duplicateImports(order.rows, order.exportReviews)) {
        const available = [...keep];
        for (const row of copy) {
            const index = available.findIndex(r => fieldsKey(r.solidworks.fields) === fieldsKey(row.solidworks.fields));
            replacements.set(row.id, available.splice(index, 1)[0].id);
        }
    }
    const rows = order.rows.filter(r => !replacements.has(r.id));
    const groups = new Map();
    for (const review of order.exportReviews ?? []) {
        const mapped = { ...review, rowIds: [...new Set(review.rowIds.map(id => replacements.get(id) ?? id))] };
        const key = JSON.stringify([...mapped.rowIds].sort());
        const group = groups.get(key) ?? [];
        group.push(mapped);
        groups.set(key, group);
    }
    // Retain real reports (especially partial ones) instead of an older missing-report notice.
    const exportReviews = [...groups.values()].flatMap(group => {
        const reported = group.filter(r => r.reportName);
        return reported.length ? reported : [group[0]];
    });
    return { ...order, rows, exportReviews };
}
