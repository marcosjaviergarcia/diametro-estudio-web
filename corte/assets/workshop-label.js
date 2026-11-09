/** Presentation only: the original CAD reference and provenance remain intact. */
export function workshopName(row) {
    const reference = row.reference?.trim() ?? '';
    if (!row.solidworks || reference !== row.solidworks.fields.referencia?.trim())
        return reference;
    const instance = row.solidworks.fields.ruta_instancia || reference.split(' / ')[0];
    let name = instance.split('/').at(-1)?.trim() ?? '';
    // Strip CAD metadata, but keep the machine identification and dimensions.
    if (/\.sld(?:prt|asm)$/i.test(name))
        name = name.replace(/\.sld(?:prt|asm)$/i, '');
    else
        name = name.replace(/-\d+$/, '');
    return name.trim() || reference;
}
// Codes identify rows within the current plan; repeated lengths remain distinct.
export const pieceCode = (rowNumber) => `P${String(rowNumber).padStart(2, '0')}`;
