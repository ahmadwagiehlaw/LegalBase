const T = {
    emptyText: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0644\u0644\u0639\u0631\u0636',
    dateActionLabel: '\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u062a\u0627\u0631\u064a\u062e',
    actions: '\u0625\u062c\u0631\u0627\u0621\u0627\u062a',
    viewDetails: '\u0639\u0631\u0636 \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644',
    directEdit: '\u062a\u0639\u062f\u064a\u0644 \u0645\u0628\u0627\u0634\u0631'
};

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeDateForInput(value) {
    if (!value || value === '-') return '';
    const text = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(text)) return text.replace(/\//g, '-');

    const parts = text.split(/[\/\-.]/);
    if (parts.length === 3) {
        const [a, b, c] = parts;
        if (a.length === 4) return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
        if (c.length === 4) return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
    }

    const date = new Date(text);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
}

function formatDateForDisplay(value) {
    if (!value) return '-';
    const normalized = normalizeDateForInput(value);
    if (!normalized) return value;
    return normalized.replace(/-/g, '/');
}

export class EditableGrid {
    constructor(container, columns, data, onUpdate, config = {}) {
        this.container = container;
        this.columns = columns;
        this.data = data;
        this.onUpdate = onUpdate;
        this.config = {
            actions: { view: true, edit: true, date: false, ...(config.actions || {}) },
            onView: config.onView || null,
            onRowClick: config.onRowClick || null,
            emptyText: config.emptyText || T.emptyText,
            dateActionLabel: config.dateActionLabel || T.dateActionLabel,
            rowKey: config.rowKey || 'id'
        };
    }

    render() {
        const hasActions = Object.values(this.config.actions).some(Boolean);
        const thead = `
            <tr>
                ${this.columns.map((column) => `<th>${column.label}</th>`).join('')}
                ${hasActions ? `<th>${T.actions}</th>` : ''}
            </tr>
        `;

        let tbody = '';
        if (this.data.length === 0) {
            tbody = `<tr><td colspan="${this.columns.length + (hasActions ? 1 : 0)}" class="text-center">${this.config.emptyText}</td></tr>`;
        } else {
            this.data.forEach((row) => {
                const rowId = row[this.config.rowKey];
                const editableDateCell = this.columns.find((column) => column.editable && (column.editor?.type === 'date' || column.field.toLowerCase().includes('date')));

                tbody += `<tr data-id="${rowId}">`;
                this.columns.forEach((column) => {
                    const value = this.getNestedValue(row, column.field);
                    tbody += `
                        <td
                            data-field="${column.field}"
                            class="${column.editable ? 'editable-cell' : ''}"
                            ${column.editable ? `data-editor="${column.editor?.type || 'text'}"` : ''}
                        >${this.formatValue(value, column)}</td>
                    `;
                });

                if (hasActions) {
                    tbody += `
                        <td class="actions-cell">
                            ${this.config.actions.view ? `<button class="btn-icon view-details-btn" title="${T.viewDetails}"><ion-icon name="eye-outline"></ion-icon></button>` : ''}
                            ${this.config.actions.edit ? `<button class="btn-icon edit-btn" title="${T.directEdit}"><ion-icon name="create-outline"></ion-icon></button>` : ''}
                            ${this.config.actions.date && editableDateCell ? `<button class="btn-icon date-action-btn" data-field="${editableDateCell.field}" title="${this.config.dateActionLabel}"><ion-icon name="calendar-number-outline"></ion-icon></button>` : ''}
                        </td>
                    `;
                }

                tbody += '</tr>';
            });
        }

        this.container.innerHTML = `
            <div class="table-responsive">
                <table class="data-table editable-grid-table">
                    <thead>${thead}</thead>
                    <tbody>${tbody}</tbody>
                </table>
            </div>
        `;

        this.setupEvents();
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((acc, part) => acc && acc[part], obj);
    }

    getColumn(field) {
        return this.columns.find((column) => column.field === field);
    }

    resolveColumnOptions(column, row) {
        if (!column?.editor?.options) return [];
        return typeof column.editor.options === 'function' ? column.editor.options(row) : column.editor.options;
    }

    formatValue(value, column) {
        if (value === null || value === undefined || value === '') return '-';
        if (column.type === 'array') return Array.isArray(value) ? value.join(' ضد ') : value;
        if (column.type === 'badge') return `<span class="badge-status ${this.getStatusClass(value)}">${escapeHtml(value)}</span>`;
        if (column.editor?.type === 'date') return formatDateForDisplay(value);
        return escapeHtml(value);
    }

    getStatusClass(status) {
        const map = {
            new: 'status-blue',
            suspended_administrative: 'status-warning',
            struck_out: 'status-danger',
            active: 'status-success'
        };
        return map[status] || 'status-default';
    }

    setupEvents() {
        this.container.querySelectorAll('.editable-cell').forEach((cell) => {
            cell.addEventListener('click', (event) => this.handleCellEdit(event.currentTarget));
        });

        this.container.querySelectorAll('.view-details-btn').forEach((button) => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                const rowElement = event.currentTarget.closest('tr');
                const row = this.data.find((item) => String(item[this.config.rowKey]) === rowElement.dataset.id);
                if (!row) return;

                if (this.config.onView) {
                    this.config.onView(row);
                    return;
                }

                document.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'case-details', id: rowElement.dataset.id } }));
            });
        });

        this.container.querySelectorAll('.edit-btn').forEach((button) => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                const rowElement = event.currentTarget.closest('tr');
                const cell = rowElement.querySelector('.editable-cell');
                if (cell) this.handleCellEdit(cell);
            });
        });

        this.container.querySelectorAll('.date-action-btn').forEach((button) => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                const rowElement = event.currentTarget.closest('tr');
                const targetField = event.currentTarget.dataset.field;
                const cell = rowElement.querySelector(`.editable-cell[data-field="${targetField}"]`);
                if (cell) this.handleCellEdit(cell);
            });
        });

        this.container.querySelectorAll('tbody tr[data-id]').forEach((rowElement) => {
            rowElement.addEventListener('click', (event) => {
                if (event.target.closest('.btn-icon') || event.target.closest('input') || event.target.closest('select') || event.target.closest('textarea')) return;
                const row = this.data.find((item) => String(item[this.config.rowKey]) === rowElement.dataset.id);
                if (row && this.config.onRowClick) {
                    this.config.onRowClick(row);
                }
            });
        });
    }

    handleCellEdit(cell) {
        if (!this.onUpdate || cell.querySelector('input, select, textarea')) return;

        const field = cell.dataset.field;
        const rowElement = cell.closest('tr');
        const rowId = rowElement.dataset.id;
        const row = this.data.find((item) => String(item[this.config.rowKey]) === rowId);
        const column = this.getColumn(field);
        const originalValue = this.getNestedValue(row, field);
        const editorType = column?.editor?.type || cell.dataset.editor || 'text';
        const inputId = `grid-editor-${rowId}-${field}`.replace(/[^\w-]/g, '_');
        const options = this.resolveColumnOptions(column, row);

        let editorMarkup = '';
        if (editorType === 'select') {
            editorMarkup = `
                <select class="cell-input" id="${inputId}">
                    <option value="">--</option>
                    ${options.map((option) => `<option value="${escapeHtml(option)}" ${String(option) === String(originalValue || '') ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}
                </select>
            `;
        } else if (editorType === 'date') {
            editorMarkup = `<input type="date" class="cell-input" id="${inputId}" value="${normalizeDateForInput(originalValue)}">`;
        } else if (editorType === 'datalist') {
            const listId = `${inputId}-list`;
            editorMarkup = `
                <input type="text" class="cell-input" id="${inputId}" value="${escapeHtml(originalValue || '')}" list="${listId}" placeholder="${escapeHtml(column?.editor?.placeholder || '')}">
                <datalist id="${listId}">
                    ${options.map((option) => `<option value="${escapeHtml(option)}"></option>`).join('')}
                </datalist>
            `;
        } else {
            editorMarkup = `<input type="text" class="cell-input" id="${inputId}" value="${escapeHtml(originalValue || '')}" placeholder="${escapeHtml(column?.editor?.placeholder || '')}">`;
        }

        cell.innerHTML = editorMarkup;
        const input = cell.querySelector(`#${inputId}`);
        input?.focus();

        const commit = () => {
            let newValue = input?.value ?? '';
            newValue = typeof newValue === 'string' ? newValue.trim() : newValue;

            cell.innerHTML = this.formatValue(newValue, column);
            if (String(newValue || '') !== String(originalValue || '')) {
                this.onUpdate(rowId, field, newValue, row);
            }
        };

        const cancel = () => {
            cell.innerHTML = this.formatValue(originalValue, column);
        };

        input?.addEventListener('blur', commit);
        input?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') commit();
            if (event.key === 'Escape') cancel();
        });
    }
}
