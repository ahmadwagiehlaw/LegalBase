const T = {
    dragToSort: '\u0627\u0633\u062d\u0628 \u0644\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u062a\u0631\u062a\u064a\u0628',
    moveUp: '\u062a\u062d\u0631\u064a\u0643 \u0644\u0623\u0639\u0644\u0649',
    moveDown: '\u062a\u062d\u0631\u064a\u0643 \u0644\u0623\u0633\u0641\u0644',
    headerTitle: '\u0625\u0638\u0647\u0627\u0631 \u0648\u0625\u0639\u0627\u062f\u0629 \u062a\u0631\u062a\u064a\u0628 \u0627\u0644\u0623\u0639\u0645\u062f\u0629',
    headerHint: '\u064a\u0645\u0643\u0646\u0643 \u0627\u0644\u0625\u062e\u0641\u0627\u0621 \u0623\u0648 \u0627\u0644\u062a\u062d\u0631\u064a\u0643 \u0628\u0627\u0644\u0633\u062d\u0628 \u0623\u0648 \u0628\u0627\u0644\u0623\u0632\u0631\u0627\u0631'
};

export function normalizeTablePreferences(definitions, stored = {}) {
    const validKeys = definitions.map((item) => item.key);
    const storedOrder = Array.isArray(stored.order) ? stored.order.filter((key) => validKeys.includes(key)) : [];
    const missingKeys = validKeys.filter((key) => !storedOrder.includes(key));

    const order = [...storedOrder, ...missingKeys];
    const visibility = {};

    definitions.forEach((definition) => {
        const storedValue = stored.visibility?.[definition.key];
        visibility[definition.key] = typeof storedValue === 'boolean' ? storedValue : definition.visible !== false;
    });

    return { order, visibility };
}

export function loadTablePreferences(storageKey, definitions) {
    try {
        const raw = localStorage.getItem(storageKey);
        const parsed = raw ? JSON.parse(raw) : {};
        return normalizeTablePreferences(definitions, parsed);
    } catch {
        return normalizeTablePreferences(definitions, {});
    }
}

export function saveTablePreferences(storageKey, preferences) {
    localStorage.setItem(storageKey, JSON.stringify(preferences));
}

export function getOrderedColumns(definitions, preferences) {
    const map = new Map(definitions.map((definition) => [definition.key, definition]));
    return preferences.order.map((key) => map.get(key)).filter(Boolean);
}

export function renderTablePreferencesMenu(menuElement, definitions, preferences, onChange) {
    if (!menuElement) return;

    const map = new Map(definitions.map((definition) => [definition.key, definition]));
    const rows = preferences.order.map((key, index) => {
        const definition = map.get(key);
        if (!definition) return '';

        return `
            <div class="table-pref-item" data-col="${key}" draggable="true">
                <div class="table-pref-drag" title="${T.dragToSort}">
                    <ion-icon name="reorder-three-outline"></ion-icon>
                </div>
                <label class="table-pref-toggle">
                    <input type="checkbox" class="table-pref-visible" data-col="${key}" ${preferences.visibility[key] !== false ? 'checked' : ''}>
                    <span>${definition.label}</span>
                </label>
                <div class="table-pref-move">
                    <button type="button" class="btn-icon table-pref-up" data-col="${key}" ${index === 0 ? 'disabled' : ''} title="${T.moveUp}">
                        <ion-icon name="arrow-up-outline"></ion-icon>
                    </button>
                    <button type="button" class="btn-icon table-pref-down" data-col="${key}" ${index === preferences.order.length - 1 ? 'disabled' : ''} title="${T.moveDown}">
                        <ion-icon name="arrow-down-outline"></ion-icon>
                    </button>
                </div>
            </div>
        `;
    }).join('');

    menuElement.innerHTML = `
        <div class="table-pref-header">
            <strong>${T.headerTitle}</strong>
            <small>${T.headerHint}</small>
        </div>
        <div class="table-pref-list">${rows}</div>
    `;

    let draggedKey = null;

    const commit = () => onChange({
        ...preferences,
        order: [...preferences.order],
        visibility: { ...preferences.visibility }
    });

    menuElement.querySelectorAll('.table-pref-visible').forEach((checkbox) => {
        checkbox.addEventListener('click', (event) => event.stopPropagation());
        checkbox.addEventListener('change', (event) => {
            event.stopPropagation();
            preferences.visibility[event.target.dataset.col] = event.target.checked;
            commit();
        });
    });

    menuElement.querySelectorAll('.table-pref-up').forEach((button) => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const key = button.dataset.col;
            const index = preferences.order.indexOf(key);
            if (index <= 0) return;
            [preferences.order[index - 1], preferences.order[index]] = [preferences.order[index], preferences.order[index - 1]];
            commit();
        });
    });

    menuElement.querySelectorAll('.table-pref-down').forEach((button) => {
        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const key = button.dataset.col;
            const index = preferences.order.indexOf(key);
            if (index < 0 || index >= preferences.order.length - 1) return;
            [preferences.order[index + 1], preferences.order[index]] = [preferences.order[index], preferences.order[index + 1]];
            commit();
        });
    });

    menuElement.querySelectorAll('.table-pref-item').forEach((item) => {
        item.addEventListener('dragstart', (event) => {
            draggedKey = item.dataset.col;
            item.classList.add('is-dragging');
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', draggedKey);
        });

        item.addEventListener('dragend', () => {
            draggedKey = null;
            menuElement.querySelectorAll('.table-pref-item').forEach((row) => row.classList.remove('is-dragging', 'is-drop-target'));
        });

        item.addEventListener('dragover', (event) => {
            event.preventDefault();
            if (!draggedKey || draggedKey === item.dataset.col) return;
            menuElement.querySelectorAll('.table-pref-item').forEach((row) => row.classList.remove('is-drop-target'));
            item.classList.add('is-drop-target');
        });

        item.addEventListener('drop', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const targetKey = item.dataset.col;
            const sourceKey = draggedKey || event.dataTransfer.getData('text/plain');
            menuElement.querySelectorAll('.table-pref-item').forEach((row) => row.classList.remove('is-drop-target'));

            if (!sourceKey || sourceKey === targetKey) return;

            const sourceIndex = preferences.order.indexOf(sourceKey);
            const targetIndex = preferences.order.indexOf(targetKey);
            if (sourceIndex < 0 || targetIndex < 0) return;

            preferences.order.splice(sourceIndex, 1);
            preferences.order.splice(targetIndex, 0, sourceKey);
            commit();
        });
    });
}
