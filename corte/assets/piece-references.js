import { mm } from './optimizer.js';
/** Label finished geometry only: references cannot affect sorting, search,
 * bar count, kerf, offcuts or the time available to the optimizer.
 * Equal lengths are assigned in input-row order, one occurrence at a time.
 */
export function assignReferences(results, order) {
    const queues = new Map();
    order.rows.forEach((row, index) => {
        const profile = row.profile.trim(), length = mm(row.length, 'Largo');
        let lengths = queues.get(profile);
        if (!lengths) {
            lengths = new Map();
            queues.set(profile, lengths);
        }
        let queue = lengths.get(length);
        if (!queue) {
            queue = [];
            lengths.set(length, queue);
        }
        for (let occurrence = 1; occurrence <= Number(row.quantity); occurrence++) {
            queue.push({ rowId: row.id, rowNumber: index + 1, reference: row.reference ?? '', occurrence, quantity: Number(row.quantity), length });
        }
    });
    const assigned = results.map(result => ({ ...result, bars: result.bars.map(bar => ({ ...bar, assignments: bar.pieces.map(length => {
                const assignment = queues.get(result.profile)?.get(length)?.shift();
                if (!assignment)
                    throw new Error('El resultado no coincide con las piezas del pedido. Volvé a calcular.');
                return assignment;
            }) })) }));
    if ([...queues.values()].some(lengths => [...lengths.values()].some(queue => queue.length)))
        throw new Error('Faltan piezas en el resultado. Volvé a calcular.');
    return assigned;
}
