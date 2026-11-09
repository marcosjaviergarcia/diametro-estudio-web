import { optimize } from './optimizer.js';
self.onmessage = (event) => {
    try {
        const results = [];
        for (const [i, job] of event.data.entries()) {
            self.postMessage({ type: 'progress', profile: job.profile, current: i + 1, total: event.data.length });
            results.push(optimize(job));
        }
        self.postMessage({ type: 'done', results });
    }
    catch (error) {
        self.postMessage({ type: 'error', message: error instanceof Error ? error.message : 'No se pudo calcular.' });
    }
};
