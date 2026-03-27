function uniqueValues(values = []) {
    return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function openOptionListModal({
    title = 'إدارة الخيارات',
    description = '',
    values = [],
    placeholder = 'أضف خيارًا جديدًا',
    saveLabel = 'حفظ التعديلات',
    onSave = () => {}
} = {}) {
    const overlay = document.createElement('div');
    overlay.className = 'popup-overlay';

    const initialValues = uniqueValues(values);
    overlay.innerHTML = `
        <div class="popup-card option-list-modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
            <div class="popup-header">
                <div>
                    <h3>${escapeHtml(title)}</h3>
                    ${description ? `<p>${escapeHtml(description)}</p>` : ''}
                </div>
                <button type="button" class="btn-icon popup-close-btn" aria-label="إغلاق">
                    <ion-icon name="close-outline"></ion-icon>
                </button>
            </div>

            <div class="popup-body">
                <div class="option-list-toolbar">
                    <input type="text" class="option-list-new-input" placeholder="${escapeHtml(placeholder)}">
                    <button type="button" class="btn btn-primary option-list-add-btn">
                        <ion-icon name="add-outline"></ion-icon>
                        إضافة
                    </button>
                </div>
                <div class="option-list-help">يمكنك التعديل مباشرة داخل الحقول أو حذف أي اختيار ثم حفظ القائمة.</div>
                <div class="option-list-items"></div>
            </div>

            <div class="popup-footer">
                <button type="button" class="btn btn-secondary popup-cancel-btn">إلغاء</button>
                <button type="button" class="btn btn-primary popup-save-btn">${escapeHtml(saveLabel)}</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const listContainer = overlay.querySelector('.option-list-items');
    const addInput = overlay.querySelector('.option-list-new-input');

    const close = () => overlay.remove();

    const renderItems = (items) => {
        const normalized = uniqueValues(items);
        if (!normalized.length) {
            listContainer.innerHTML = `
                <div class="option-list-empty">
                    <ion-icon name="list-outline"></ion-icon>
                    <span>لا توجد اختيارات محفوظة بعد.</span>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = normalized.map((value, index) => `
            <div class="option-list-item" data-index="${index}">
                <input type="text" class="option-list-value" value="${escapeHtml(value)}">
                <button type="button" class="btn-icon option-list-delete-btn" title="حذف">
                    <ion-icon name="trash-outline"></ion-icon>
                </button>
            </div>
        `).join('');

        listContainer.querySelectorAll('.option-list-delete-btn').forEach((button) => {
            button.addEventListener('click', () => {
                const row = button.closest('.option-list-item');
                row?.remove();
                if (!listContainer.querySelector('.option-list-item')) {
                    renderItems([]);
                }
            });
        });
    };

    const collectValues = () => {
        return uniqueValues(
            [...listContainer.querySelectorAll('.option-list-value')].map((input) => input.value)
        );
    };

    const addValue = () => {
        const nextValue = String(addInput?.value || '').trim();
        if (!nextValue) return;

        const updated = uniqueValues([...collectValues(), nextValue]);
        renderItems(updated);
        addInput.value = '';
        const lastInput = [...listContainer.querySelectorAll('.option-list-value')].at(-1);
        lastInput?.focus();
    };

    renderItems(initialValues);
    addInput?.focus();

    overlay.querySelector('.popup-close-btn')?.addEventListener('click', close);
    overlay.querySelector('.popup-cancel-btn')?.addEventListener('click', close);
    overlay.querySelector('.option-list-add-btn')?.addEventListener('click', addValue);
    overlay.querySelector('.popup-save-btn')?.addEventListener('click', () => {
        onSave(collectValues());
        close();
    });

    addInput?.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            addValue();
        }
    });

    overlay.addEventListener('click', (event) => {
        if (event.target === overlay) close();
    });

    const handleEscape = (event) => {
        if (event.key === 'Escape') {
            close();
            document.removeEventListener('keydown', handleEscape);
        }
    };

    document.addEventListener('keydown', handleEscape);
}
