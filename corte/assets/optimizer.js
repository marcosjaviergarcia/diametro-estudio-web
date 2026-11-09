export class InputError extends Error {
}
export const MAX_PIECES = 2000;
export function mm(value, label, zero = false) {
    const clean = value.trim().replace(',', '.');
    if (!/^\d+(\.\d{1,2})?$/.test(clean))
        throw new InputError(`${label}: ingresá milímetros con hasta dos decimales.`);
    const n = Math.round(Number(clean) * 100);
    if (!Number.isSafeInteger(n) || n < (zero ? 0 : 1) || n > 100000000)
        throw new InputError(`${label}: valor fuera de rango (${zero ? '0' : '0,01'} a 1.000.000 mm).`);
    return n;
}
export function validate(order) {
    if (!order.rows.length)
        throw new InputError('Agregá al menos una pieza.');
    const kerf = mm(order.kerf, 'Ancho de corte', true);
    const groups = new Map();
    let total = 0;
    order.rows.forEach((row, i) => {
        const label = `Fila ${i + 1}`;
        if (row.solidworks?.needsMaterial)
            throw new InputError(`${label}: seleccioná un material de la biblioteca para el perfil importado.`);
        const profile = row.profile.trim();
        if (!profile)
            throw new InputError(`${label}: completá el tipo de perfil.`);
        const length = mm(row.length, `${label}, largo`);
        if (!/^\d+$/.test(row.quantity.trim()) || Number(row.quantity) < 1)
            throw new InputError(`${label}: la cantidad debe ser un entero positivo.`);
        const quantity = Number(row.quantity);
        total += quantity;
        if (!Number.isSafeInteger(total) || total > MAX_PIECES)
            throw new InputError(`El pedido admite hasta ${MAX_PIECES} piezas. Dividilo en pedidos más pequeños.`);
        const stock = mm(Object.hasOwn(order.stocks, profile) ? order.stocks[profile] : '6000', `Barra de ${profile}`);
        if (length > stock || (length !== stock && length + kerf > stock))
            throw new InputError(`${label}: la pieza no cabe en la barra de ${profile}, considerando el ancho de corte.`);
        let job = groups.get(profile);
        if (!job) {
            job = { profile, stock, kerf, pieces: [] };
            groups.set(profile, job);
        }
        for (let n = 0; n < quantity; n++)
            job.pieces.push(length);
    });
    return [...groups.values()];
}
export function describeBar(pieces, stock, kerf) {
    const useful = pieces.reduce((a, b) => a + b, 0);
    const exact = useful + (pieces.length - 1) * kerf === stock;
    const cuts = pieces.length - (exact ? 1 : 0);
    return { pieces: [...pieces], cuts, loss: cuts * kerf, remainder: stock - useful - cuts * kerf };
}
// Transformed load is sum(length + kerf). A finished bar is feasible when
// load <= stock, or load === stock + kerf (the final piece needs no cut).
export function optimize(job, budgetMs = 2000, now = () => performance.now()) {
    const start = now();
    const { stock, kerf } = job;
    const pieces = [...job.pieces].sort((a, b) => b - a);
    if (!pieces.length || pieces.some(p => !Number.isSafeInteger(p) || p <= 0 || p > stock || (p < stock && p + kerf > stock)))
        throw new InputError('Pedido de cálculo inválido.');
    const capacity = stock + kerf;
    const feasible = (load) => load <= stock || load === capacity;
    const weights = pieces.map(p => p + kerf);
    const lowerBound = Math.ceil(weights.reduce((a, b) => a + b, 0) / capacity);
    let best = [];
    const greedyLoads = [];
    pieces.forEach((p, i) => {
        let chosen = -1;
        for (let b = 0; b < best.length; b++) {
            const load = greedyLoads[b] + weights[i];
            if (load <= capacity && feasible(load) && (chosen < 0 || greedyLoads[b] > greedyLoads[chosen]))
                chosen = b;
        }
        if (chosen < 0) {
            best.push([p]);
            greedyLoads.push(weights[i]);
        }
        else {
            best[chosen].push(p);
            greedyLoads[chosen] += weights[i];
        }
    });
    let optimal = best.length === lowerBound;
    // Bound recursion depth independently of the piece limit. Large jobs retain
    // their valid greedy result unless the lower bound already proves optimality.
    if (!optimal && pieces.length <= 180) {
        const loads = [], bins = [];
        const suffix = Array(pieces.length + 1).fill(0);
        for (let i = pieces.length - 1; i >= 0; i--)
            suffix[i] = suffix[i + 1] + weights[i];
        const seen = new Set();
        let timedOut = false;
        function search(i) {
            if (optimal || timedOut)
                return;
            if (now() - start >= budgetMs) {
                timedOut = true;
                return;
            }
            if (bins.length >= best.length)
                return;
            if (i === pieces.length) {
                if (loads.every(feasible)) {
                    best = bins.map(b => [...b]);
                    optimal = best.length === lowerBound;
                }
                return;
            }
            const free = loads.reduce((sum, l) => sum + capacity - l, 0);
            if (bins.length + Math.ceil(Math.max(0, suffix[i] - free) / capacity) >= best.length)
                return;
            const key = `${i}:${[...loads].sort((a, b) => a - b).join(',')}`;
            if (seen.has(key))
                return;
            if (seen.size < 100000)
                seen.add(key);
            const tried = new Set();
            const candidates = loads.map((_, b) => b).sort((a, b) => loads[b] - loads[a]);
            for (const b of candidates) {
                if (tried.has(loads[b]) || loads[b] + weights[i] > capacity)
                    continue;
                tried.add(loads[b]);
                loads[b] += weights[i];
                bins[b].push(pieces[i]);
                search(i + 1);
                bins[b].pop();
                loads[b] -= weights[i];
                if (optimal || timedOut)
                    return;
            }
            if (bins.length + 1 < best.length) {
                loads.push(weights[i]);
                bins.push([pieces[i]]);
                search(i + 1);
                bins.pop();
                loads.pop();
            }
        }
        search(0);
        if (!timedOut)
            optimal = true;
    }
    return { profile: job.profile, stock, bars: best.map(b => describeBar(b, stock, kerf)), optimal, lowerBound, elapsed: now() - start };
}
