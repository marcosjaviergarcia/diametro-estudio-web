import { FACTORY_MATERIALS } from './factory-library.js';
import { LIBRARY_STORAGE_KEY, effectiveLibrary, emptyChanges, hideMaterial, putMaterial, readChanges, restoreMaterial, searchMaterials, validateMaterial } from './library.js';
export function mountLibrary(select) {
    const panel = document.createElement('details');
    panel.className = 'panel library-panel';
    panel.id = 'library';
    panel.innerHTML = `<summary>Biblioteca de perfiles <span id="library-total"></span></summary><div class="library-body">
    <p class="hint">La biblioteca de fábrica está incluida en el programa. Tus altas, ediciones y eliminaciones se guardan en este navegador. Los cambios no modifican pedidos ya cargados.</p>
    <label for="library-search">Buscar materiales</label><input id="library-search" type="search" placeholder="Ej. caño cuadrado 40" autocomplete="off">
    <p id="library-message" role="status" aria-live="polite"></p>
    <form id="material-form"><h3 id="material-form-title">Agregar material</h3><div class="material-fields"><div><label for="material-name">Nombre, medida y calidad</label><input id="material-name" required maxlength="160"></div><div><label for="material-stock">Largo comercial (mm)</label><input id="material-stock" required inputmode="decimal" value="6000"></div></div><div class="library-actions"><button class="secondary" type="submit" id="material-save">Agregar material</button><button class="text-button" type="button" id="material-cancel" hidden>Cancelar edición</button></div><p id="material-error" role="alert" hidden></p></form>
    <p id="library-count" role="status"></p><div id="library-list" class="library-list"></div>
    <details class="library-deleted"><summary>Materiales eliminados <span id="deleted-count"></span></summary><div id="deleted-list"></div></details>
  </div>`;
    document.querySelector('.workspace').before(panel);
    const get = (s) => panel.querySelector(s);
    let changes = emptyChanges(), editable = true, editing;
    try {
        changes = readChanges(localStorage.getItem(LIBRARY_STORAGE_KEY));
    }
    catch {
        editable = false;
        get('#library-message').textContent = 'No se pudo leer la biblioteca local. Mostramos la base de fábrica; no sobrescribiremos tus datos. La edición está deshabilitada hasta recuperar el almacenamiento.';
    }
    let materials = effectiveLibrary(changes);
    const factoryIds = new Set(FACTORY_MATERIALS.map(m => m.id));
    const msg = (text) => { get('#library-message').textContent = text; };
    function commit(next) {
        if (!editable)
            return false;
        try {
            localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(next));
        }
        catch {
            get('#material-error').textContent = 'No se pudo guardar la biblioteca local. El cambio no se aplicó; liberá espacio o revisá el almacenamiento del navegador.';
            get('#material-error').hidden = false;
            return false;
        }
        changes = next;
        materials = effectiveLibrary(changes);
        closeSuggestions();
        render();
        return true;
    }
    function resetForm() { editing = undefined; get('#material-form').reset(); get('#material-form-title').textContent = 'Agregar material'; get('#material-save').textContent = 'Agregar material'; get('#material-cancel').hidden = true; get('#material-error').hidden = true; }
    function materialRow(material, deleted = false) {
        const row = document.createElement('div');
        row.className = 'library-item';
        const info = document.createElement('div');
        const name = document.createElement('strong');
        name.textContent = material.name;
        const meta = document.createElement('span');
        const source = !factoryIds.has(material.id) ? 'Personalizado' : changes.upserts.some(m => m.id === material.id) ? 'De fábrica · Modificado localmente' : 'De fábrica';
        meta.textContent = `${Number(material.stock).toLocaleString('es-AR')} mm · ${source}`;
        info.append(name, meta);
        const actions = document.createElement('div');
        actions.className = 'library-actions';
        for (const action of deleted ? ['restore'] : ['edit', 'delete']) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'text-button';
            button.dataset.action = action;
            button.dataset.material = material.id;
            button.disabled = !editable;
            button.textContent = { edit: 'Editar', delete: 'Eliminar', restore: 'Restaurar' }[action];
            button.setAttribute('aria-label', `${button.textContent} ${material.name}`);
            actions.append(button);
        }
        row.append(info, actions);
        return row;
    }
    function render() {
        get('#library-total').textContent = `· ${materials.length} materiales`;
        const filtered = searchMaterials(materials, get('#library-search').value);
        get('#library-count').textContent = `${filtered.length} de ${materials.length} materiales`;
        get('#library-list').replaceChildren(...filtered.map(m => materialRow(m)));
        if (!filtered.length)
            get('#library-list').textContent = 'No hay coincidencias. Podés agregar un material con el formulario.';
        const all = effectiveLibrary({ ...changes, hidden: [] });
        const deleted = all.filter(m => changes.hidden.includes(m.id));
        get('#deleted-count').textContent = `(${deleted.length})`;
        get('#deleted-list').replaceChildren(...deleted.map(m => materialRow(m, true)));
    }
    get('#library-search').addEventListener('input', render);
    get('#material-cancel').addEventListener('click', resetForm);
    get('#material-form').addEventListener('submit', e => {
        e.preventDefault();
        get('#material-error').hidden = true;
        try {
            const id = editing ?? `user-${crypto.randomUUID()}`;
            const material = validateMaterial(get('#material-name').value, get('#material-stock').value, id, materials);
            if (commit(putMaterial(changes, material))) {
                msg(editing ? 'Material actualizado en tu biblioteca local. Los pedidos existentes conservan sus medidas.' : 'Material agregado a tu biblioteca local.');
                resetForm();
            }
        }
        catch (error) {
            get('#material-error').textContent = error instanceof Error ? error.message : 'Revisá el material.';
            get('#material-error').hidden = false;
        }
    });
    panel.addEventListener('click', e => {
        const button = e.target.closest('[data-action]');
        if (!button || !editable)
            return;
        const id = button.dataset.material;
        if (button.dataset.action === 'edit') {
            const material = materials.find(m => m.id === id);
            editing = id;
            get('#material-name').value = material.name;
            get('#material-stock').value = material.stock;
            get('#material-form-title').textContent = 'Editar material';
            get('#material-save').textContent = 'Guardar cambios';
            get('#material-cancel').hidden = false;
            get('#material-error').hidden = true;
            get('#material-name').focus();
        }
        else if (button.dataset.action === 'delete') {
            if (commit(hideMaterial(changes, id))) {
                if (editing === id)
                    resetForm();
                msg('Material eliminado de tu biblioteca. Podés recuperarlo en Materiales eliminados.');
            }
        }
        else {
            const restored = effectiveLibrary({ ...changes, hidden: [] }).find(m => m.id === id);
            try {
                validateMaterial(restored.name, restored.stock, id, materials);
                if (commit(restoreMaterial(changes, id)))
                    msg('Material restaurado.');
            }
            catch (error) {
                msg(error instanceof Error ? error.message : 'No se pudo restaurar.');
            }
        }
    });
    if (!editable)
        for (const field of get('#material-form').querySelectorAll('input,button'))
            field.disabled = true;
    const popup = document.createElement('div');
    popup.id = 'profile-suggestions';
    popup.className = 'profile-suggestions';
    popup.hidden = true;
    const list = document.createElement('div');
    list.id = 'profile-options';
    list.setAttribute('role', 'listbox');
    list.setAttribute('aria-label', 'Materiales de la biblioteca');
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    popup.append(list, status);
    document.body.append(popup);
    let activeInput, matches = [], activeIndex = -1;
    function closeSuggestions() { if (activeInput) {
        activeInput.setAttribute('aria-expanded', 'false');
        activeInput.removeAttribute('aria-activedescendant');
    } popup.hidden = true; activeInput = undefined; activeIndex = -1; }
    function showSuggestions(input, showAll = false) {
        activeInput = input;
        activeIndex = -1;
        const found = searchMaterials(materials, showAll ? '' : input.value);
        matches = found;
        input.setAttribute('role', 'combobox');
        input.setAttribute('aria-autocomplete', 'list');
        input.setAttribute('aria-controls', list.id);
        input.setAttribute('aria-expanded', 'true');
        input.removeAttribute('aria-activedescendant');
        list.replaceChildren(...matches.map((m, i) => { const option = document.createElement('div'); option.id = `material-option-${i}`; option.dataset.option = String(i); option.setAttribute('role', 'option'); option.setAttribute('aria-selected', 'false'); option.textContent = `${m.name} — ${Number(m.stock).toLocaleString('es-AR')} mm`; return option; }));
        list.scrollTop = 0;
        status.textContent = found.length ? `${found.length} ${showAll ? 'materiales disponibles' : 'coincidencias'} · Desplazate para ver todos o escribí para buscar. ↑ ↓ y Enter para seleccionar.` : 'Sin coincidencias. Podés escribir un perfil libre o agregarlo a la biblioteca.';
        popup.hidden = false;
        positionPopup(input);
    }
    function positionPopup(input) {
        const rect = input.getBoundingClientRect();
        popup.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 340))}px`;
        popup.style.width = `${Math.min(Math.max(rect.width, 430), window.innerWidth - 16)}px`;
        const below = window.innerHeight - rect.bottom;
        popup.style.top = below >= 180 ? `${rect.bottom + 4}px` : 'auto';
        popup.style.bottom = below >= 180 ? 'auto' : `${window.innerHeight - rect.top + 4}px`;
        popup.style.maxHeight = `${Math.max(120, Math.min(340, below >= 180 ? below - 12 : rect.top - 12))}px`;
    }
    function choose(index) { if (!activeInput || !matches[index])
        return; const input = activeInput, material = matches[index]; closeSuggestions(); select(input, material); input.focus(); }
    const rows = document.querySelector('#rows');
    rows.addEventListener('input', e => { const input = e.target; if (input.dataset.field === 'profile')
        showSuggestions(input); });
    rows.addEventListener('focusin', e => { const input = e.target; if (input.dataset.field === 'profile')
        showSuggestions(input, true); });
    rows.addEventListener('click', e => { const input = e.target; if (input.dataset.field === 'profile')
        showSuggestions(input, true); });
    rows.addEventListener('focusout', () => closeSuggestions());
    rows.addEventListener('keydown', e => {
        const event = e, input = event.target;
        if (input.dataset.field !== 'profile')
            return;
        if (event.key === 'Escape') {
            closeSuggestions();
            return;
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            if (popup.hidden)
                showSuggestions(input);
            if (!matches.length)
                return;
            activeIndex = activeIndex < 0 ? (event.key === 'ArrowDown' ? 0 : matches.length - 1) : (activeIndex + (event.key === 'ArrowDown' ? 1 : -1) + matches.length) % matches.length;
            for (const [i, option] of [...list.children].entries())
                option.setAttribute('aria-selected', String(i === activeIndex));
            input.setAttribute('aria-activedescendant', `material-option-${activeIndex}`);
            list.children[activeIndex].scrollIntoView?.({ block: 'nearest' });
        }
        else if (event.key === 'Enter' && !popup.hidden && activeIndex >= 0) {
            event.preventDefault();
            choose(activeIndex);
        }
        else if (event.key === 'Tab')
            closeSuggestions();
    });
    popup.addEventListener('mousedown', e => e.preventDefault());
    popup.addEventListener('click', e => { const option = e.target.closest('[data-option]'); if (option)
        choose(Number(option.dataset.option)); });
    document.addEventListener('pointerdown', e => { if (e.target !== activeInput && !popup.contains(e.target))
        closeSuggestions(); });
    window.addEventListener('resize', closeSuggestions);
    document.addEventListener('scroll', e => { if (activeInput && !popup.contains(e.target))
        positionPopup(activeInput); }, true);
    render();
    return { materials: () => materials };
}
