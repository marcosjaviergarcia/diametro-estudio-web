import { workshopName, pieceCode } from './workshop-label.js';
import { renderWorkshopSheet } from './workshop-sheet.js';
import { validate } from './optimizer.js';
import { MAX_PROJECT_BYTES, parseProject, readOrder, serializeProject } from './project.js';
import { mountLibrary } from './library-ui.js';
import { assignReferences } from './piece-references.js';
import { materialNotice, pendingMaterialMessage, MAX_CSV_BYTES, parseSolidWorks, importSolidWorks, selectImportedMaterial } from './solidworks.js';
import { pairExportFiles, reviewExport, relevantReviews, reviewPrintNotice } from './export-review.js';
import { matchingImports, duplicateImports, importedGroups, removeImportCopies } from './import-identity.js';
import { FACTORY_MATERIALS } from './factory-library.js';
let libraryUI;
const materialLibrary = () => libraryUI?.materials() ?? FACTORY_MATERIALS;
const storageKey = 'diametro-corte-pedido-v1';
const uid = () => crypto.randomUUID();
const freshRow = () => ({ id: uid(), profile: '', reference: '', length: '', quantity: '1' });
let order = { rows: [freshRow()], stocks: {}, kerf: '3' };
let storageWarning = '';
try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
        try {
            order = readOrder(JSON.parse(raw));
        }
        catch {
            storageWarning = 'El pedido guardado no era válido. Ingresá un nuevo pedido.';
        }
    }
}
catch {
    storageWarning = 'El guardado local no está disponible. Podés calcular e imprimir igualmente.';
}
let results = [];
let stale = false;
let worker;
let projectName = 'pedido.corte';
let fileSnapshot;
let revision = 0;
const $ = (selector) => document.querySelector(selector);
const esc = (s) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const fmt = (tenths) => (tenths / 100).toLocaleString('es-AR', { maximumFractionDigits: 2 });
const profiles = () => [...new Set(order.rows.map(r => r.profile.trim()).filter(Boolean))];
$('#app').innerHTML = `

  <header class="topbar"><a class="brand" href="../" aria-label="Diámetro Estudio, inicio"><img src="../img/logo-isotipo.png" alt="" width="51" height="32"><img src="../img/logo-texto.png" alt="Diámetro Estudio" width="151" height="23"></a><nav aria-label="Navegación de herramienta"><a href="../">← Volver al estudio</a><a href="../tubos/">Plantillas de uniones ↗</a><a href="#ayuda">Cómo funciona ↗</a></nav><span class="local-badge"><i></i> EN TU NAVEGADOR · SIN CUENTA</span></header>
  <main><section class="intro"><div><p class="eyebrow"><span>DIÁMETRO / HERRAMIENTAS / 01</span></p><h1>Menos descarte.<br><span>Más posibilidades.</span></h1><p class="subtitle">Optimizador de corte de caños y perfiles.<br>De tu lista de piezas a un plan listo para el taller.</p></div><div class="intro-mark" aria-hidden="true"><div class="drawing-label">6000 mm / BARRA COMERCIAL</div><div class="drawing-bar"><span>2400</span><span>1800</span><span>1200</span><i></i></div><div class="drawing-bar secondary-bar"><span>1800</span><span>1800</span><span>1800</span><i></i></div><b>MEDIR → DISTRIBUIR → CORTAR</b></div></section>
  <ol class="workflow" aria-label="Pasos del plan de corte"><li><b>01</b><span>Cargá tus piezas<small>A mano o desde SolidWorks</small></span></li><li><b>02</b><span>Definí las barras<small>Largo comercial y ancho de sierra</small></span></li><li><b>03</b><span>Llevá el plan al taller<small>Distribución e informe para imprimir</small></span></li></ol>
  <details id="ayuda" class="help-panel"><summary>Primera vez por acá · Guía rápida <span>+</span></summary><div><p><strong>1. Piezas.</strong> Elegí un perfil de la biblioteca o escribí uno propio. Indicá largo en milímetros y cantidad. Diferenciá cada medida, espesor o material con su nombre.</p><p><strong>2. Barras.</strong> Revisá el largo comercial y el ancho que consume la sierra. Se considera un largo por perfil y disponibilidad ilimitada. Solo cortes rectos, sin ingletes ni saneado de extremos.</p><p><strong>3. Plan.</strong> Calculá la distribución y elegí el informe para imprimir o guardar como PDF desde el navegador. Si modificás el pedido, volvé a calcular.</p><p><strong>SolidWorks.</strong> Ejecutá la macro en tu PC e importá el CSV y su TXT de control con la misma fecha y hora. También podés abrir los archivos .corte de la aplicación original.</p><p><strong>Tu trabajo.</strong> El pedido se guarda en este navegador. Usá «Guardar proyecto» para conservar un archivo o llevarlo a otra computadora. Las listas se procesan en tu equipo.</p></div></details>
  <div id="storage-note" class="notice" role="status" hidden></div>

  <section class="project-toolbar" aria-label="Archivo de proyecto">

    <div class="project-actions"><button id="save-project" class="secondary" type="button">Guardar proyecto…</button><button id="import-solidworks" class="secondary" type="button">Importar desde SolidWorks</button><button id="open-project" class="secondary" type="button">Abrir proyecto…</button></div>

    <button id="clear-order" class="secondary" type="button">Eliminar todo</button>
    <p id="project-state">Pedido actual · Sin archivo de proyecto</p>

    <p id="project-message" role="status" aria-live="polite"></p>

    <p class="hint">Elegí la lista de piezas (CSV) y el archivo de control (TXT) que genera la macro, con la misma fecha y hora.</p>
    <input id="solidworks-file" type="file" accept=".csv,.txt,text/csv,text/plain" multiple hidden>
    <input id="solidworks-report-file" type="file" accept=".txt,text/plain" hidden>
    <input id="project-file" type="file" accept=".corte,.json,application/json" hidden>

  </section>

  <section id="export-review" class="panel export-review" aria-label="Revisión de exportación de SolidWorks" hidden></section>

  <div class="workspace"><section class="panel order-panel"><div class="panel-heading"><div><span class="step">01</span><h2>Pedido de piezas</h2></div><button id="example" class="text-button" type="button">Cargar ejemplo ↗</button></div>

    <p class="hint">Elegí el material e indicá cuánto mide cada pieza y cuántas necesitás.</p>

    <div class="table-scroll"><table class="input-table"><thead><tr><th scope="col">Perfil</th><th scope="col">Pieza <span>máquina y nombre completo</span></th><th scope="col">Largo <span>mm</span></th><th scope="col">Cantidad</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead><tbody id="rows"></tbody></table></div>

    <button id="add" class="add-button" type="button">＋ Agregar pieza</button>

    <div class="order-footer"><span id="row-count"></span><span>Medidas en milímetros</span></div>

  </section>

  <aside class="panel settings"><div class="panel-heading"><div><span class="step">02</span><h2>Barras y corte</h2></div></div>

    <div id="stocks"></div>

    <div class="kerf-field"><label for="kerf">Ancho de corte <span>mm</span></label><input id="kerf" type="text" inputmode="decimal" maxlength="12"><p class="hint">Material que consume la sierra en cada corte. Verificá el valor de tu máquina.</p></div>

    <div class="assumption"><span aria-hidden="true">↔</span><p>Un largo comercial por perfil.<br>Barras disponibles sin límite.</p></div>

    <button id="calculate" class="primary" type="button">Calcular distribución <span>→</span></button>

    <button id="cancel" class="text-button" type="button" hidden>Cancelar cálculo</button>

    <p id="progress" class="progress" role="status" aria-live="polite"></p>

    <p id="error" class="error" role="alert" hidden></p>

  </aside></div>

  <section class="results-section" aria-labelledby="results-title"><div class="results-heading"><div><p class="eyebrow">DEL PEDIDO A LA SIERRA</p><h2 id="results-title">Plan de corte</h2></div><button id="print" class="secondary" type="button" disabled>Imprimir plan ↗</button></div>

    <div id="stale" class="notice" role="status" hidden>El pedido cambió. Recalculá la distribución antes de usar o imprimir este plan.</div>

    <div class="sheet-controls"><label>Informe <select id="sheet-format"><option value="current">Hoja actual</option><option value="horizontal">Optimización · horizontal</option><option value="demand">Demanda · horizontal</option></select></label><label>Trabajo <input id="sheet-job" type="text" maxlength="120" placeholder="Nombre del trabajo"></label><label><input id="sheet-large" type="checkbox"> Letra grande</label><span class="sheet-help">Elegí un informe y usá Imprimir / PDF para guardarlo por separado.</span></div><div id="workshop-sheet" hidden></div><label class="technical-toggle"><input id="show-technical" type="checkbox"> Mostrar datos de cálculo</label><div id="results"><div class="empty-state"><div class="empty-bar" aria-hidden="true"><i></i><i></i><i></i></div><h3>Todo empieza con tu primera pieza.</h3><p>Completá el pedido y calculá para ver cómo aprovechar cada barra.</p></div></div>

  </section><footer><a href="../">DIÁMETRO ESTUDIO ↗</a> <span>Corte lineal · Sin ingletes ni saneado de extremos</span></footer></main>`;
function save() {
    try {
        localStorage.setItem(storageKey, JSON.stringify(order));
    }
    catch {
        storageWarning = 'No se pudo guardar el pedido en este navegador. Mantené la pestaña abierta o imprimí el resultado.';
    }
    $('#storage-note').textContent = storageWarning;
    $('#storage-note').hidden = !storageWarning;
}
function changed() {
    revision++;
    renderExportReview();
    const materialWarning = pendingMaterialMessage(order.rows);
    if (materialWarning) projectMessage(materialWarning);
    updateProjectState();
    if (worker)
        stopCalculation('El pedido cambió. Volvé a calcular.');
    $('#workshop-sheet').hidden = true;
    $('#results').hidden = false;
    document.body.classList.remove('horizontal-sheet');
    if (results.length) {
        stale = true;
        $('#stale').hidden = false;
        $('#results').classList.add('outdated');
    }
    $('#print').setAttribute('disabled', '');
    $('#error').hidden = true;
    save();
}
function updateProjectState() {
    $('#project-state').textContent = fileSnapshot === undefined ? 'Pedido actual · Sin archivo de proyecto' : `${projectName}${JSON.stringify(order) !== fileSnapshot ? ' · Cambios sin guardar en archivo' : ''}`;
}
const fileOptions = { types: [{ description: 'Proyecto de Corte', accept: { 'application/json': ['.corte'] } }] };
const fileWindow = window;
function projectMessage(message) { $('#project-message').textContent = message; }
$('#clear-order').addEventListener('click', () => {
    if (!window.confirm('¿Eliminar todas las piezas del pedido actual y su resultado? Si querés conservarlo, cancelá y usá Guardar proyecto. La biblioteca y los archivos guardados no se borran.'))
        return;
    stopCalculation();
    order = { rows: [freshRow()], stocks: {}, kerf: order.kerf };
    results = [];
    stale = false;
    revision++;
    projectName = 'pedido.corte';
    fileSnapshot = undefined;
    $('#sheet-job').value = '';
    renderRows();
    renderStocks();
    refreshSheet();
    $('#stale').hidden = true;
    $('#error').hidden = true;
    $('#results').classList.remove('outdated');
    $('#results').innerHTML = '<div class="empty-state"><h3>Pedido vacío.</h3><p>Agregá piezas o importá un nuevo CSV de SolidWorks.</p></div>';
    $('#print').setAttribute('disabled', '');
    save();
    updateProjectState();
    projectMessage('Pedido eliminado. Podés comenzar uno nuevo.');
    $('#rows [data-field="profile"]').focus();
});
$('#save-project').addEventListener('click', async () => {
    const button = $('#save-project');
    button.disabled = true;
    try {
        const text = serializeProject(order);
        const snapshot = JSON.stringify(order);
        if (fileWindow.showSaveFilePicker) {
            const handle = await fileWindow.showSaveFilePicker({ ...fileOptions, suggestedName: projectName });
            const writable = await handle.createWritable();
            try {
                await writable.write(text);
                await writable.close();
            }
            catch (error) {
                await writable.abort().catch(() => { });
                throw error;
            }
            projectName = handle.name;
            fileSnapshot = snapshot;
            updateProjectState();
            projectMessage('Proyecto guardado.');
        }
        else {
            const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
            const link = document.createElement('a');
            link.href = url;
            link.download = projectName;
            document.body.append(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 60_000);
            projectMessage('Descarga solicitada. El navegador decide la carpeta; para elegirla al guardar, usá Chrome o Edge.');
        }
    }
    catch (error) {
        projectMessage(error instanceof Error && error.name === 'AbortError' ? 'Guardado cancelado.' : `No se pudo guardar el proyecto. ${error instanceof Error ? error.message : 'Intentá nuevamente.'}`);
    }
    finally {
        button.disabled = false;
    }
});
$('#open-project').addEventListener('click', () => $('#project-file').click());
$('#project-file').addEventListener('change', async () => {
    const input = $('#project-file');
    const file = input.files?.[0];
    input.value = '';
    if (!file)
        return;
    const startRevision = revision;
    const button = $('#open-project');
    button.disabled = true;
    try {
        if (file.size > MAX_PROJECT_BYTES)
            throw new Error('El proyecto supera el límite de 10 MB.');
        const loaded = parseProject(await file.text());
        if (startRevision !== revision)
            throw new Error('El pedido cambió mientras se leía el archivo. Volvé a abrirlo.');
        const hasWork = order.rows.some(row => row.profile || row.reference || row.length || row.quantity !== '1') || Object.keys(order.stocks).length > 0 || order.kerf !== '3';
        if (hasWork && JSON.stringify(order) !== fileSnapshot && !window.confirm('El pedido actual tiene datos sin guardar en un archivo de proyecto. ¿Querés reemplazarlo?')) {
            projectMessage('Apertura cancelada.');
            return;
        }
        stopCalculation();
        order = loaded;
        results = [];
        stale = false;
        revision++;
        refreshSheet();
        projectName = file.name.endsWith('.corte') ? file.name : file.name.replace(/\.[^.]*$/, '') + '.corte';
        fileSnapshot = JSON.stringify(order);
        renderRows();
        renderStocks();
        $('#kerf').value = order.kerf;
        $('#stale').hidden = true;
        $('#results').classList.remove('outdated');
        $('#results').innerHTML = '<div class="empty-state"><h3>Proyecto listo para continuar.</h3><p>Podés editar el pedido, agregar perfiles y calcular la distribución.</p></div>';
        $('#print').setAttribute('disabled', '');
        $('#error').hidden = true;
        save();
        updateProjectState();
        projectMessage('Proyecto abierto. Calculá para generar el plan de corte.');
    }
    catch (error) {
        projectMessage(`No se pudo abrir el proyecto. ${error instanceof Error ? error.message : 'Intentá nuevamente.'}`);
    }
    finally {
        button.disabled = false;
    }
});
function sizeReference(field) {
    field.style.height = 'auto';
    field.style.height = `${Math.max(66, field.scrollHeight + 2)}px`;
}
function renderExportReview() {
    const panel = $('#export-review');
    const { reviews, legacy } = relevantReviews(order), copies = duplicateImports(order.rows, order.exportReviews);
    const materialWarning = pendingMaterialMessage(order.rows);
    panel.hidden = !reviews.length && !legacy && !materialWarning;
    if (panel.hidden) {
        panel.innerHTML = '';
        return;
    }
    panel.innerHTML = `<h2>Control de las piezas importadas</h2>${materialWarning ? `<div class="export-review-item partial" role="status"><strong>Materiales pendientes · cálculo bloqueado</strong><p>${esc(materialWarning)}</p>${order.rows.filter(row => row.solidworks?.needsMaterial).map(row => `<p><b>${esc(row.solidworks.fields.perfil)}</b><br>${esc(materialNotice(row, materialLibrary()))}</p>`).join('')}</div>` : ''}${copies.length ? `<div class="export-review-item partial"><strong>Atención: hay piezas cargadas dos veces</strong><p>Encontramos ${copies.length} cargas repetidas con los mismos datos. Eso puede duplicar la demanda de material.</p><button class="secondary" data-remove-import-copies>Quitar las copias idénticas</button><p class="hint">Se conserva una carga de cada archivo. No se quitan cargas que tengan medidas, cantidades o materiales diferentes.</p></div>` : ''}${legacy ? `<div class="export-review-item unverified"><strong>Falta controlar una carga anterior</strong><p>Hay ${legacy} renglones antiguos sin su archivo de control. Seleccioná el mismo CSV junto con su TXT desde «Importar desde SolidWorks»: actualizaremos el control sin agregar otra vez las piezas.</p></div>` : ''}${reviews.map(r => `<div class="export-review-item ${materialWarning ? 'partial' : r.state}"><strong>${r.state === 'partial' ? 'Hay piezas o datos pendientes' : r.state === 'reported' ? (materialWarning ? 'Control recibido · quedan materiales pendientes en el pedido' : 'La macro no detectó problemas en esta carga') : 'Falta el archivo de control'}</strong><p>${r.rows} renglones · ${r.pieces} piezas${r.machine ? ` · ${esc(r.machine)}` : ''}</p>${r.state === 'reported' && !materialWarning ? '<p>El archivo de control no informa piezas pendientes.</p>' : ''}${!r.reportName ? `<p>Cargaste la lista de piezas, pero falta el TXT que genera la macro para saber si hubo problemas.</p><button class="secondary" data-attach-review="${esc(r.csvName)}" data-review-row="${esc(r.rowIds[0] ?? '')}">Agregar archivo de control (TXT)</button><p class="hint">No vuelvas a cargar las piezas. Este botón agrega solo el control.</p>` : ''}${r.state === 'partial' ? `<p>Abrí «Qué hay que resolver» antes de entregar la demanda al taller.</p><details open><summary>Qué hay que resolver (${r.pending})</summary>${r.issues.map(issue => `<article><b>${esc(issue.piece)}</b><p>${esc(issue.reason)}</p><p><strong>Qué hacer:</strong> ${esc(issue.action)}</p></article>`).join('')}${r.pending > r.issues.length ? '<p>Consultar también el archivo de control: contiene más avisos.</p>' : ''}</details>` : ''}<details><summary>Datos del archivo y alcance del control</summary><p>${esc(r.csvName)}${r.reportName ? ` · ${esc(r.reportName)}` : ''}</p><p>Este control lee lo que informó la macro al exportar. No vuelve a medir el modelo. Los cambios hechos después en Corte no corrigen el archivo original.</p></details></div>`).join('')}`;
}
function renderRows() {
    renderExportReview();
    $('#rows').innerHTML = order.rows.map((r, i) => `<tr data-id="${esc(r.id)}"><td><input data-field="profile" aria-label="Perfil, fila ${i + 1}" placeholder="Buscar material o perfil libre" value="${esc(r.profile)}" maxlength="160" autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="profile-options" aria-expanded="false"><small class="import-status" ${r.solidworks?.needsMaterial ? '' : 'hidden'}>${r.solidworks?.needsMaterial ? esc(materialNotice(r, materialLibrary())) : 'Material seleccionado'}</small></td><td><span class="piece-code">${pieceCode(i + 1)}</span><textarea data-field="reference" rows="2" aria-label="Pieza / Referencia, fila ${i + 1}" placeholder="Máquina y nombre completo de la pieza" title="${esc(workshopName(r))}">${esc(workshopName(r))}</textarea>${r.solidworks ? `<details class="source-details"><summary>Ver origen</summary><p>${esc(r.solidworks.fields.referencia)}</p><p>Material de origen: ${esc(r.solidworks.fields.perfil)} · ${esc(r.solidworks.fields.material ?? '')}</p></details>` : ''}</td><td><input data-field="length" aria-label="Largo en milímetros, fila ${i + 1}" inputmode="decimal" placeholder="2000" value="${esc(r.length)}" maxlength="12"></td><td><input data-field="quantity" aria-label="Cantidad, fila ${i + 1}" inputmode="numeric" value="${esc(r.quantity)}" maxlength="6"></td><td><button class="remove" data-remove="${esc(r.id)}" aria-label="Eliminar fila ${i + 1}" title="Eliminar pieza" type="button">×</button></td></tr>`).join('');
    document.querySelectorAll('#rows textarea').forEach(sizeReference);
    $('#row-count').textContent = `${order.rows.length} ${order.rows.length === 1 ? 'fila en el pedido' : 'filas en el pedido'}`;
}
function renderStocks() {
    $('#stocks').innerHTML = profiles().map((p, i) => `<div class="stock-field"><label for="stock-${i}">${esc(p)} <span>mm</span></label><input id="stock-${i}" data-profile="${esc(p)}" inputmode="decimal" value="${esc(order.rows.some(r => r.profile.trim() === p && r.solidworks?.needsMaterial) ? '' : Object.hasOwn(order.stocks, p) ? order.stocks[p] : '6000')}" maxlength="12" ${order.rows.some(r => r.profile.trim() === p && r.solidworks?.needsMaterial) ? 'disabled placeholder="Seleccioná material de biblioteca"' : ''} aria-label="Largo comercial de ${esc(p)}"></div>`).join('') || '<p class="hint stock-placeholder">Agregá un perfil al pedido para configurar su barra comercial.</p>';
}
$('#rows').addEventListener('input', e => {
    const target = e.target;
    if (target.tagName === 'TEXTAREA')
        sizeReference(target);
    const field = target.dataset.field;
    if (!field)
        return;
    const row = order.rows.find(r => r.id === target.closest('tr')?.dataset.id);
    row[field] = target.value;
    if (field === 'profile') {
        if (row.solidworks) {
            row.solidworks.needsMaterial = true;
            delete row.solidworks.materialId;
            const status = target.parentElement.querySelector('.import-status');
            status.hidden = false;
            status.textContent = materialNotice(row, materialLibrary());
        }
        renderStocks();
    }
    changed();
});
$('#rows').addEventListener('click', e => {
    const button = e.target.closest('[data-remove]');
    if (!button)
        return;
    order.rows = order.rows.filter(r => r.id !== button.dataset.remove);
    renderRows();
    renderStocks();
    changed();
    $('#add').focus();
});
$('#stocks').addEventListener('input', e => {
    const target = e.target;
    if (target.dataset.profile) {
        Object.defineProperty(order.stocks, target.dataset.profile, { value: target.value, configurable: true, writable: true, enumerable: true });
        changed();
    }
});
$('#kerf').addEventListener('input', () => { order.kerf = $('#kerf').value; changed(); });
$('#add').addEventListener('click', () => {
    order.rows.push(freshRow());
    renderRows();
    changed();
    $('#rows tr:last-child input').focus();
});
$('#example').addEventListener('click', () => {
    if (order.rows.some(row => row.profile || row.reference || row.length) && !window.confirm('¿Reemplazar el pedido actual por el ejemplo? Guardá tu proyecto antes si querés conservarlo.')) return;
    order = { rows: [{ id: uid(), profile: 'Tubo 40 × 40 × 2', length: '2000', quantity: '4' }, { id: uid(), profile: 'Tubo 40 × 40 × 2', length: '950', quantity: '4' }], stocks: { 'Tubo 40 × 40 × 2': '6000' }, kerf: '3' };
    renderRows();
    renderStocks();
    $('#kerf').value = order.kerf;
    changed();
});
function stopCalculation(message = '') {
    worker?.terminate();
    worker = undefined;
    $('#calculate').disabled = false;
    $('#cancel').hidden = true;
    $('#progress').textContent = message;
    $('#print').toggleAttribute('disabled', stale || !results.length);
}
$('#cancel').addEventListener('click', () => stopCalculation('Cálculo cancelado.'));
$('#calculate').addEventListener('click', () => {
    $('#error').hidden = true;
    try {
        const jobs = validate(order);
        stopCalculation();
        worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
        $('#calculate').disabled = true;
        $('#print').disabled = true;
        $('#cancel').hidden = false;
        $('#progress').textContent = 'Preparando distribución…';
        worker.onmessage = e => {
            if (e.data.type === 'progress')
                $('#progress').textContent = `Calculando ${e.data.profile} · ${e.data.current} de ${e.data.total}`;
            else if (e.data.type === 'done') {
                try {
                    results = assignReferences(e.data.results, order);
                }
                catch (error) {
                    stopCalculation();
                    showError(error instanceof Error ? error.message : 'No se pudieron identificar las piezas.');
                    return;
                }
                stale = false;
                stopCalculation('Distribución lista.');
                $('#stale').hidden = true;
                $('#results').classList.remove('outdated');
                renderResults();
                refreshSheet();
            }
            else {
                stopCalculation();
                showError(e.data.message);
            }
        };
        worker.onerror = () => { stopCalculation(); showError('No se pudo completar el cálculo. Intentá nuevamente o reducí el pedido.'); };
        worker.postMessage(jobs);
    }
    catch (error) {
        showError(error instanceof Error ? error.message : 'Revisá los datos del pedido.');
    }
});
function showError(message) { $('#error').textContent = message; $('#error').hidden = false; }
function renderAssignments(bar) {
    return `<table class="piece-assignments"><caption>Cortá una pieza por renglón, en este orden. Todas las medidas están en mm.</caption><thead><tr><th scope="col">Orden</th><th scope="col">Pieza</th><th scope="col">Cortar a (mm)</th></tr></thead><tbody>${bar.assignments.map((piece, index) => {
        const row = order.rows.find(r => r.id === piece.rowId);
        return `<tr data-row-id="${esc(piece.rowId)}"><td>${index + 1}</td><td><strong class="piece-code">${pieceCode(piece.rowNumber)}</strong> ${esc(workshopName(row) || 'Sin nombre')}</td><td class="cut-measure">${fmt(piece.length)}</td></tr>`;
    }).join('')}</tbody></table>`;
}
function renderResults() {
    const bars = results.flatMap(r => r.bars);
    const purchased = results.reduce((sum, r) => sum + r.stock * r.bars.length, 0);
    const useful = bars.reduce((sum, b) => sum + b.pieces.reduce((a, p) => a + p, 0), 0);
    const loss = bars.reduce((sum, b) => sum + b.loss, 0);
    const remainder = bars.reduce((sum, b) => sum + b.remainder, 0);
    const count = bars.reduce((sum, b) => sum + b.pieces.length, 0);
    $('#results').innerHTML = `${reviewPrintNotice(order)}<div class="print-title"><h2>Pedido de corte</h2><p>${new Date().toLocaleString('es-AR')} · Ancho de corte: ${esc(order.kerf)} mm</p></div><div class="metrics"><div class="metric featured"><span>Barras necesarias</span><strong>${bars.length}<small> barras</small></strong><p>${results.length} ${results.length === 1 ? 'perfil' : 'perfiles'} · ${count} piezas</p></div><div class="metric technical-stat"><span>Aprovechamiento útil</span><strong>${(useful / purchased * 100).toLocaleString('es-AR', { maximumFractionDigits: 2 })}<small> %</small></strong><p>${fmt(useful)} mm en piezas</p></div><div class="metric technical-stat"><span>Sobrante total</span><strong>${fmt(remainder)}<small> mm</small></strong><p>Remanente disponible</p></div><div class="metric technical-stat"><span>Pérdida por sierra</span><strong>${fmt(loss)}<small> mm</small></strong><p>${bars.reduce((sum, b) => sum + b.cuts, 0)} cortes en total</p></div></div>

  <p class="result-context">Descuento por sierra: <b>${esc(order.kerf)} mm</b>. Sin recorte de puntas. Consultá el plano para cortes en ángulo.</p>` + results.map((r, ri) => {
        const patterns = new Map();
        const hasReferences = r.bars.some(bar => bar.assignments.some(piece => piece.reference.trim()));
        r.bars.forEach((bar, index) => { const key = hasReferences ? `bar-${index}` : bar.pieces.join(','); const p = patterns.get(key); if (p)
            p.count++;
        else
            patterns.set(key, { bar, count: 1 }); });
        const used = r.bars.reduce((s, b) => s + b.pieces.reduce((a, p) => a + p, 0), 0);
        return `<article class="profile-result panel"><div class="profile-heading"><div><p class="eyebrow">PERFIL ${String(ri + 1).padStart(2, '0')}</p><h3>${esc(r.profile)}</h3><p>${r.bars.length} barras de ${fmt(r.stock)} mm · ${r.bars.reduce((s, b) => s + b.pieces.length, 0)} piezas</p></div><span class="quality technical-stat ${r.optimal ? 'optimal' : 'approximate'}">${r.optimal ? '✓ Óptimo comprobado' : 'Mejor solución encontrada; óptimo no comprobado'}</span></div>

    ${[...patterns.values()].map(({ bar, count }, i) => `<section class="pattern"><div class="pattern-heading"><h4>${hasReferences ? `Barra ${i + 1}` : `Patrón ${String.fromCharCode(65 + i % 26)}${i >= 26 ? Math.floor(i / 26) + 1 : ''}`} ${count > 1 ? `<span>Repetir en ${count} barras</span>` : ''}</h4><span>${fmt(bar.remainder)} mm de sobrante por barra</span></div><div class="bar" role="img" aria-label="${esc(bar.pieces.map(p => fmt(p) + ' mm').join(' + '))}; pérdida ${fmt(bar.loss)} mm; sobrante ${fmt(bar.remainder)} mm">${bar.pieces.map((p, j) => `<span class="segment color-${p % 5}" style="width:${p / r.stock * 100}%" title="Pieza ${j + 1}: ${fmt(p)} mm"><span>${hasReferences ? `${pieceCode(bar.assignments[j].rowNumber)} · ` : ''}${fmt(p)}</span></span>${j < bar.cuts ? `<span class="kerf" style="width:${Number(order.kerf.replace(',', '.')) * 100 / r.stock * 100}%" title="Corte"></span>` : ''}`).join('')}${bar.remainder > 0 ? `<span class="offcut" style="width:${bar.remainder / r.stock * 100}%" title="Sobrante: ${fmt(bar.remainder)} mm"></span>` : ''}</div><p class="cut-list ${hasReferences ? 'technical-stat' : ''}">${bar.pieces.map(p => fmt(p)).join(' + ')} <span>mm</span></p>${hasReferences ? renderAssignments(bar) : ''}<div class="pattern-meta technical-stat"><span>${bar.pieces.length} piezas · ${bar.cuts} cortes por barra</span><span>Sierra: ${fmt(bar.loss)} mm · Sobrante: ${fmt(bar.remainder)} mm</span></div></section>`).join('')}

    <div class="profile-totals technical-stat">Total del perfil: sierra ${fmt(r.bars.reduce((s, b) => s + b.loss, 0))} mm · sobrante ${fmt(r.bars.reduce((s, b) => s + b.remainder, 0))} mm</div></article>`;
    }).join('') + '<div class="legend technical-stat"><span><i class="piece-key"></i> Pieza útil</span><span><i class="kerf-key"></i> Sierra</span><span><i class="offcut-key"></i> Sobrante</span><span>Esquema proporcional · Consultá las medidas indicadas</span></div>';
}
$('#print').addEventListener('click', () => {
    if (!stale && results.length && !worker) {
        refreshSheet();
        const previousTitle = document.title;
        const format = $('#sheet-format').value;
        const job = $('#sheet-job').value.trim() || 'Corte';
        document.title = `${job} - ${format === 'demand' ? 'Demanda' : format === 'horizontal' ? 'Optimización' : 'Plan de corte'}`;
        try {
            window.print();
        }
        finally {
            document.title = previousTitle;
        }
    }
});
function refreshSheet() {
    const format = $('#sheet-format').value;
    const horizontal = format !== 'current';
    $('#print').textContent = format === 'demand' ? 'Imprimir / PDF Demanda ↗' : format === 'horizontal' ? 'Imprimir / PDF Optimización ↗' : 'Imprimir plan ↗';
    const usable = !!results.length && !stale && !worker;
    document.body.classList.toggle('horizontal-sheet', horizontal && usable);
    let style = document.querySelector('#sheet-page-style');
    if (!style) {
        style = document.createElement('style');
        style.id = 'sheet-page-style';
        document.head.append(style);
    }
    style.textContent = horizontal && usable ? '@page { size: A4 landscape; margin: 10mm; }' : '';
    $('#workshop-sheet').hidden = !horizontal || !usable;
    $('#results').hidden = horizontal && usable;
    if (horizontal && usable) {
        $('#workshop-sheet').classList.toggle('large-type', $('#sheet-large').checked);
        $('#workshop-sheet').innerHTML = renderWorkshopSheet(results, order, format === 'demand' ? 'demand' : 'optimization', $('#sheet-job').value);
    }
}
for (const id of ['sheet-format', 'sheet-large'])
    $('#' + id).addEventListener('change', refreshSheet);
$('#sheet-job').addEventListener('input', refreshSheet);
renderRows();
renderStocks();
$('#kerf').value = order.kerf;
libraryUI = mountLibrary((input, material) => {
    const row = order.rows.find(r => r.id === input.closest('tr')?.dataset.id);
    if (!row)
        return;
    selectImportedMaterial(order, row, material);
    input.value = material.name;
    renderRows();
    renderStocks();
    changed();
});
renderRows(); // Reconcile saved imports against the loaded, customized library.
$('#storage-note').textContent = storageWarning;
$('#storage-note').hidden = !storageWarning;
let reportTargetCsv = '', reportTargetRow = '';
$('#export-review').addEventListener('click', event => {
    const target = event.target;
    const attach = target.closest('[data-attach-review]');
    if (attach) {
        reportTargetCsv = attach.dataset.attachReview;
        reportTargetRow = attach.dataset.reviewRow;
        $('#solidworks-report-file').click();
        return;
    }
    if (target.closest('[data-remove-import-copies]')) {
        const copies = duplicateImports(order.rows, order.exportReviews);
        if (!copies.length)
            return;
        const pieces = copies.reduce((n, g) => n + g.copy.reduce((sum, r) => sum + Number(r.quantity), 0), 0);
        if (!window.confirm(`Se quitarán ${pieces} piezas de cargas repetidas. Quedará una sola copia de cada carga idéntica.\n¿Quitar las copias?`))
            return;
        order = removeImportCopies(order);
        renderRows();
        renderStocks();
        changed();
        projectMessage('Se quitaron las cargas repetidas. Revisá las cantidades del pedido y volvé a calcular.');
    }
});
$('#solidworks-report-file').addEventListener('change', async () => {
    const input = $('#solidworks-report-file');
    const file = input.files?.[0];
    input.value = '';
    if (!file)
        return;
    const startRevision = revision, csvName = reportTargetCsv, rowId = reportTargetRow;
    try {
        if (!/\.txt$/i.test(file.name))
            throw new Error('Elegí el archivo TXT de control que genera la macro.');
        if (file.size > MAX_CSV_BYTES)
            throw new Error('El archivo supera 10 MB.');
        const text = await file.text();
        if (startRevision !== revision)
            throw new Error('El pedido cambió. Volvé a agregar el archivo de control.');
        const current = order.exportReviews?.find(r => r.csvName === csvName && r.rowIds.includes(rowId));
        if (!current)
            throw new Error('Esta carga ya no está en el pedido.');
        const rows = order.rows.filter(r => current.rowIds.includes(r.id));
        const first = importedGroups(rows)[0];
        if (!first)
            throw new Error('No se encontraron las piezas de esta carga.');
        const fields = first.map(r => r.solidworks.fields);
        const reviewed = reviewExport(csvName, fields, { name: file.name, text });
        const matches = matchingImports(order.rows, fields, csvName, order.exportReviews);
        reviewed.rowIds = matches.flatMap(group => group.map(r => r.id));
        order = { ...order, exportReviews: (order.exportReviews ?? []).map(r => r === current ? reviewed : r) };
        changed();
        projectMessage(`Archivo de control agregado. Las cantidades no cambiaron. ${pendingMaterialMessage(order.rows) || (reviewed.state === 'reported' ? 'La macro no detectó problemas en esta carga.' : 'Mirá qué hay que resolver en el control de las piezas.')}`);
    }
    catch (error) {
        projectMessage(`No se pudo agregar el control. ${error instanceof Error ? error.message : 'Revisá el archivo TXT.'}`);
    }
});
$('#import-solidworks').addEventListener('click', () => $('#solidworks-file').click());
$('#solidworks-file').addEventListener('change', async () => {
    const input = $('#solidworks-file');
    const files = [...(input.files ?? [])];
    input.value = '';
    if (!files.length)
        return;
    const button = $('#import-solidworks');
    const startRevision = revision;
    button.disabled = true;
    try {
        if (files.length > 40 || files.reduce((n, f) => n + f.size, 0) > 25 * 1024 * 1024)
            throw new Error('Seleccioná hasta 40 archivos y 25 MB por importación.');
        for (const file of files)
            if (file.size > MAX_CSV_BYTES)
                throw new Error(`${file.name} supera 10 MB.`);
        const pairs = pairExportFiles(await Promise.all(files.map(async (f) => ({ name: f.name, text: await f.text() }))));
        if (startRevision !== revision)
            throw new Error('El pedido cambió mientras se leían los archivos. Volvé a importarlos.');
        let next = order, pending = 0, rounded = 0, rowCount = 0, pieceCount = 0, reused = 0;
        const reviews = [];
        for (const { csv, report } of pairs) {
            const fields = parseSolidWorks(csv.text);
            let review = reviewExport(csv.name, fields, report);
            const matches = matchingImports(next.rows, fields, csv.name, [...(next.exportReviews ?? []), ...reviews]);
            if (matches.length) {
                const ids = matches.flatMap(group => group.map(r => r.id));
                const prior = (next.exportReviews ?? []).filter(r => r.rowIds.some(id => ids.includes(id))).sort((a, b) => Number(Boolean(b.reportName)) - Number(Boolean(a.reportName)))[0];
                if (!report && prior?.reportName)
                    review = { ...prior };
                review.rowIds = ids;
                reviews.push(review);
                reused++;
                next = { ...next, exportReviews: (next.exportReviews ?? []).filter(r => !r.rowIds.some(id => ids.includes(id))) };
                rowCount += fields.length;
                pieceCount += fields.reduce((n, f) => n + Number(f.cantidad), 0);
                continue;
            }
            const previousIds = new Set(next.rows.map(r => r.id));
            const imported = importSolidWorks(next, fields, libraryUI.materials(), uid);
            review.rowIds = imported.order.rows.filter(r => !previousIds.has(r.id)).map(r => r.id);
            reviews.push(review);
            next = imported.order;
            pending += imported.pending;
            rounded += imported.rounded;
            rowCount += review.rows;
            pieceCount += review.pieces;
        }
        next = { ...next, exportReviews: [...(next.exportReviews ?? []), ...reviews] };
        const summary = `${rowCount} filas y ${pieceCount} tramos. ${rounded ? `${rounded} largos se redondean al milímetro; el original queda guardado. ` : ''}${reused ? `${reused} archivos ya estaban cargados: actualizamos el control sin repetir las piezas.` : ''}`;
        pending = next.rows.filter(r => r.solidworks?.needsMaterial).length;
        const status = pendingMaterialMessage(next.rows) || (reviews.some(r => r.state === 'partial') ? 'Hay piezas o datos pendientes. Mirá qué hay que resolver en el control.' : reviews.some(r => r.state === 'unverified') ? 'Falta el archivo de control TXT. Podés agregarlo desde el botón de la carga.' : 'La macro no detectó problemas en los archivos controlados.');
        if (!window.confirm(`${summary}\n${status}\n¿Continuar?`)) {
            projectMessage('Importación cancelada.');
            return;
        }
        order = next;
        renderRows();
        renderStocks();
        changed();
        projectMessage(`${pending ? 'Importación con materiales pendientes.' : 'Importación completada.'} ${summary} ${status}`);
    }
    catch (error) {
        projectMessage(`No se pudo importar. ${error instanceof Error ? error.message : 'Revisá el CSV y su informe.'}`);
    }
    finally {
        button.disabled = false;
    }
});
$('#show-technical').addEventListener('change', () => $('#results').classList.toggle('show-technical', $('#show-technical').checked));

