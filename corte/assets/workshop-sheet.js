import { pieceCode, workshopName } from './workshop-label.js';
import { reviewPrintNotice } from './export-review.js';
const esc = (s) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const mm = (n) => (n / 100).toLocaleString('es-AR', { maximumFractionDigits: 2, useGrouping: false });
/** Consolidate cutting demand without changing the order or optimizer assignments. */
export function demandGroups(order, used) {
    const groups = new Map();
    const normalized = (value) => value?.trim().replace(',', '.').toLowerCase() ?? '';
    order.rows.forEach((row, index) => {
        if (!used.has(row.id))
            return;
        const f = row.solidworks?.fields;
        const number = Number(row.length.replace(',', '.'));
        const angles = [f?.angulo_1, f?.angulo_2].map(v => v?.trim() && Number.isFinite(Number(v.replace(',', '.'))) ? String(Number(v.replace(',', '.'))) : normalized(v));
        const treatment = [...angles, normalized(f?.direccion_angulo), normalized(f?.rotacion_angulo)];
        const key = row.solidworks?.needsMaterial ? JSON.stringify(['pending', row.id]) : JSON.stringify([row.profile.trim(), Number.isFinite(number) ? number : row.length, normalized(f?.material), treatment]);
        const name = workshopName(row) || 'Sin nombre';
        const group = groups.get(key);
        if (group) {
            group.codes.push(pieceCode(index + 1));
            group.quantity += Number(row.quantity);
            if (!group.names.includes(name))
                group.names.push(name);
        }
        else
            groups.set(key, { row, codes: [pieceCode(index + 1)], names: [name], quantity: Number(row.quantity) });
    });
    return [...groups.values()];
}
export function renderWorkshopSheet(results, order, report, jobName = '') {
    let totalBars = 0;
    const body = results.map(result => {
        const groups = new Map();
        result.bars.forEach(bar => {
            const signature = JSON.stringify(bar.assignments.map(p => [p.rowId, p.length]));
            const group = groups.get(signature);
            const number = ++totalBars;
            if (group)
                group.numbers.push(number);
            else
                groups.set(signature, { bar, numbers: [number] });
        });
        return [...groups.values()].map(({ bar, numbers }) => {
            const runs = [];
            bar.assignments.forEach((piece, index) => {
                const code = pieceCode(piece.rowNumber), last = runs.at(-1);
                if (last && last.length === piece.length) {
                    last.quantity++;
                    last.last = index + 1;
                    if (!last.codes.includes(code))
                        last.codes.push(code);
                }
                else
                    runs.push({ length: piece.length, quantity: 1, codes: [code], first: index + 1, last: index + 1 });
            });
            return `<tr class="sheet-bar"><td><b>${esc(result.profile)}</b><p>Barra comercial: <b>${mm(result.stock)} mm</b></p>${numbers.length > 1 ? `<p>Repetir en ${numbers.length} barras</p>` : ''}<div class="done-boxes">${numbers.map(n => `<span>□ Barra ${n}</span>`).join(' ')}</div></td><td><div class="sheet-diagram" aria-label="Esquema proporcional de cortes de izquierda a derecha">${bar.pieces.map((piece, i) => `<span style="width:${100 * piece / result.stock}%" title="Corte ${i + 1} · ${pieceCode(bar.assignments[i].rowNumber)} · ${mm(piece)} mm">${piece / result.stock >= 0.05 ? `<small>${pieceCode(bar.assignments[i].rowNumber)}</small><b>${mm(piece)}</b>` : `<small>${i + 1}</small>`}</span>${i < bar.cuts ? `<i style="width:${100 * Number(order.kerf.replace(',', '.')) * 100 / result.stock}%"></i>` : ''}`).join('')}${bar.remainder > 0 ? `<em style="width:${100 * bar.remainder / result.stock}%" title="Sobrante ${mm(bar.remainder)} mm"></em>` : ''}</div><ol class="sheet-run-list">${runs.map(run => `<li><strong>${mm(run.length)} mm × ${run.quantity}</strong><span>${run.codes.join(' / ')} · cortes ${run.first === run.last ? run.first : `${run.first}–${run.last}`}</span></li>`).join('')}</ol><p class="sheet-remainder">Sobrante: <b>${mm(bar.remainder)} mm</b>${bar.pieces.length === 1 && bar.remainder > result.stock / 2 ? ' · Revisar retazos disponibles.' : ''}</p></td></tr>`;
        }).join('');
    }).join('');
    const used = new Set(results.flatMap(r => r.bars.flatMap(b => b.assignments.map(p => p.rowId))));
    const heading = `${reviewPrintNotice(order)}<header class="sheet-title"><h2>${report === 'demand' ? 'DEMANDA' : 'OPTIMIZACIÓN'}${jobName.trim() ? ` · ${esc(jobName.trim())}` : ''}</h2><p>Medidas en <b>milímetros</b>${report === 'optimization' ? ` · ${totalBars} barras · Sierra: <b>${esc(order.kerf)} mm</b> · Consultar el plano para ingletes y recortes de puntas.` : ' · Cantidades sumadas por material, largo y datos de corte. Consultar los códigos para identificar cada origen.'}</p></header>`;
    if (report === 'demand')
        return `${heading}<section class="sheet-demand"><table><thead><tr><th>Largo (mm)</th><th>Cantidad</th><th>Material</th><th>Códigos</th><th>Pieza / Referencia</th><th>Hecho</th></tr></thead><tbody>${demandGroups(order, used).map(({ row: r, codes, names, quantity }) => `<tr><td><b>${esc(r.length.replace('.', ','))}</b></td><td>${quantity}</td><td>${esc(r.profile)}</td><td>${codes.join(', ')}</td><td>${names.map(esc).join(' · ')}</td><td>□</td></tr>`).join('')}</tbody></table></section>`;
    const names = order.rows.map((r, i) => used.has(r.id) ? `<span><b>${pieceCode(i + 1)}</b> ${esc(workshopName(r) || 'Sin nombre')}</span>` : '').join('');
    return `${heading}${Number(order.kerf.replace(',', '.')) === 0 ? '<p class="sheet-kerf-note">Sierra: 0 mm. Verificar el ancho real del corte.</p>' : ''}<table class="sheet-table sheet-compact"><thead><tr><th>Material / barra comercial</th><th>Cortes de izquierda a derecha · largo × cantidad</th></tr></thead><tbody>${body}</tbody></table><section class="sheet-key"><h3>Identificación de piezas</h3><div>${names}</div></section>`;
}
