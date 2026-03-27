import { CaseForm } from './CaseForm.js';
import { ImportModal } from './ImportModal.js';
import { renderPagination } from './Pagination.js';
import { getOrderedColumns, loadTablePreferences, renderTablePreferencesMenu, saveTablePreferences } from './TablePreferences.js';

const CASE_COLUMN_DEFS = [
    { key: 'case_year', label: 'رقم الطعن / السنة', visible: true },
    { key: 'court', label: 'المحكمة / الدائرة', visible: true },
    { key: 'subject', label: 'الموضوع', visible: false },
    { key: 'plaintiff', label: 'المدعي / الطاعن', visible: true },
    { key: 'defendant', label: 'المدعى عليه / المطعون ضده', visible: true },
    { key: 'status', label: 'الحالة', visible: true },
    { key: 'lastSession', label: 'آخر جلسة / قرار', visible: true },
    { key: 'nextAction', label: 'الإجراء القادم', visible: false },
    { key: 'fileLocation', label: 'مكان الملف', visible: false },
    { key: 'judgmentClassification', label: 'تصنيف الحكم', visible: false },
    { key: 'actions', label: 'إجراءات', visible: true }
];

export class CasesView {
    constructor(container, app, route = {}) {
        this.container = container;
        this.app = app;
        this.route = route;
        this.allCases = [];
        this.filteredCases = [];
        this.currentPage = 1;
        this.pageSize = 10;
        this.searchQuery = route.query || '';
        this.selectedCases = new Set();
        this.tablePrefs = loadTablePreferences('SLA_V2_Cases_TablePrefs', CASE_COLUMN_DEFS);
    }

    render() {
        this.container.innerHTML = `
            <div class="page-header">
                <div class="header-titles">
                    <h2><ion-icon name="briefcase-outline" style="vertical-align: middle; margin-left: 8px;"></ion-icon> إدارة الطعون والقضايا</h2>
                    <p>إدارة وتصفية وتعديل ملفات القضايا</p>
                </div>
                <div class="header-actions" style="display:flex; gap: 12px; flex-wrap:wrap;">
                    <button class="btn btn-secondary" id="btn-import-cases"><ion-icon name="cloud-download-outline"></ion-icon> استيراد Excel</button>
                    <button class="btn btn-secondary" id="btn-delete-selected" style="color:var(--danger); display:none;"><ion-icon name="trash-outline"></ion-icon> حذف المحدد (<span id="sel-count">0</span>)</button>
                    <button class="btn btn-secondary" id="btn-delete-all" style="color:var(--danger);"><ion-icon name="nuclear-outline"></ion-icon> حذف الكل</button>
                    <button class="btn btn-primary" id="btn-new-case"><ion-icon name="add"></ion-icon> قضية جديدة</button>
                </div>
            </div>

            <div style="padding: 16px 32px 0; display: flex; gap: 12px; align-items:center; flex-wrap:wrap;">
                <div style="position:relative; flex:1; min-width: 250px;">
                    <ion-icon name="search-outline" style="position:absolute; right:14px; top:50%; transform:translateY(-50%); color:var(--text-muted); font-size:1.1rem;"></ion-icon>
                    <input type="text" id="cases-search" placeholder="بحث برقم الطعن، المحكمة، الخصوم..." 
                        style="width:100%; padding:10px 42px 10px 14px; background:var(--surface); border:1px solid var(--glass-border); border-radius:var(--radius-md); color:var(--text-main); outline:none; font-size:0.95rem;">
                </div>

                <div style="position:relative;" id="col-toggle-wrapper">
                    <button class="btn btn-secondary" id="btn-toggle-cols" style="padding:8px 12px; display:flex; gap:6px; align-items:center; border-radius:8px; background:var(--surface); border:1px solid var(--glass-border); color:var(--text-main); font-size:0.9rem;">
                        <ion-icon name="options-outline"></ion-icon> أعمدة الجدول
                    </button>
                    <div id="col-toggle-menu" class="glass-panel table-pref-menu" style="display:none; position:absolute; top:110%; right:0; z-index:100; min-width:280px;"></div>
                </div>

                <select id="cases-filter-status" style="padding:10px 14px; background:var(--surface); border:1px solid var(--glass-border); border-radius:var(--radius-md); color:var(--text-main); outline:none;">
                    <option value="">كل الحالات</option>
                    <option value="active">نشط</option>
                    <option value="متداول">متداول</option>
                    <option value="محكوم فيه">محكوم فيه</option>
                    <option value="محجوز للحكم">محجوز للحكم</option>
                    <option value="محال">محال</option>
                    <option value="suspended_administrative">موقوف جزائيًا</option>
                    <option value="archived">مؤرشف</option>
                    <option value="new">جديد</option>
                </select>
                <span id="cases-count-label" style="color:var(--text-muted); font-size:0.9rem;"></span>
            </div>

            <div class="page-body">
                <div id="cases-grid-container"></div>

                <div class="pagination-shell">
                    <span id="page-info" class="pagination-info">الصفحة 1</span>
                    <div class="pagination-controls" id="cases-pagination"></div>
                </div>
            </div>
            <div id="modal-container"></div>
        `;

        const searchInput = this.container.querySelector('#cases-search');
        if (searchInput) searchInput.value = this.searchQuery;

        this.setupEvents();
        this.loadCasesData();
    }

    async loadCasesData() {
        const gridContainer = this.container.querySelector('#cases-grid-container');
        gridContainer.innerHTML = `
            <div class="loader-container" style="min-height:200px;">
                <div class="loader"></div>
                <p style="margin-top:10px; color:var(--text-muted);">جارٍ تحميل القضايا...</p>
            </div>`;

        try {
            const localCases = this.app.storage.loadCases() || [];
            if (localCases.length > 0) {
                this.allCases = localCases;
            } else {
                await this.app.storage.syncFromCloud();
                this.allCases = this.app.storage.loadCases() || [];
            }

            this.applyFilters();
        } catch (error) {
            console.error('Failed to load cases:', error);
            gridContainer.innerHTML = `<div class="empty-state"><ion-icon name="cloud-offline-outline"></ion-icon><p>فشل تحميل البيانات. تحقق من اتصالك.</p></div>`;
        }
    }

    applyFilters() {
        const query = this.searchQuery.toLowerCase().trim();
        const status = this.container.querySelector('#cases-filter-status')?.value || '';

        this.filteredCases = this.allCases.filter((caseData) => {
            const matchesSearch = !query ||
                String(caseData.caseNumber || '').toLowerCase().includes(query) ||
                String(caseData.court || '').toLowerCase().includes(query) ||
                String(caseData.year || '').toLowerCase().includes(query) ||
                String(caseData.subject || '').toLowerCase().includes(query) ||
                String(caseData.parties?.join(' ') || '').toLowerCase().includes(query) ||
                String(caseData.plaintiff || '').toLowerCase().includes(query) ||
                String(caseData.defendant || '').toLowerCase().includes(query);

            const matchesStatus = !status || caseData.operationalStatus === status;
            return matchesSearch && matchesStatus;
        });

        this.currentPage = 1;
        this.renderTable();
        this.updateCountLabel();
    }

    getCurrentPageData() {
        const start = (this.currentPage - 1) * this.pageSize;
        return this.filteredCases.slice(start, start + this.pageSize);
    }

    getStatusBadge(status) {
        const map = {
            active: ['status-success', 'نشط'],
            متداول: ['status-success', 'متداول'],
            'محكوم فيه': ['status-default', 'محكوم فيه'],
            'محجوز للحكم': ['status-blue', 'محجوز للحكم'],
            محال: ['status-warning', 'محال'],
            new: ['status-blue', 'جديد'],
            suspended_administrative: ['status-warning', 'موقوف جزائيًا'],
            archived: ['status-default', 'مؤرشف'],
        };

        const [cls, label] = map[status] || ['status-default', status || 'غير محدد'];
        return `<span class="badge-status ${cls}">${label}</span>`;
    }

    formatDate(value) {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
    }

    renderCell(caseData, key) {
        const plaintiff = caseData.plaintiff || caseData.parties?.[0] || '-';
        const defendant = caseData.defendant || caseData.parties?.[1] || '-';
        const lastSessionDisplay = caseData.lastSessionDate ? this.formatDate(caseData.lastSessionDate) : (caseData.latestDecision || '-');

        const builders = {
            case_year: () => `<strong style="color:var(--primary);">${caseData.caseNumber || '-'}</strong>${caseData.year ? ` / ${caseData.year}` : ''}`,
            court: () => caseData.court || '-',
            subject: () => caseData.subject || '-',
            plaintiff: () => plaintiff,
            defendant: () => defendant,
            status: () => this.getStatusBadge(caseData.operationalStatus),
            lastSession: () => lastSessionDisplay,
            nextAction: () => caseData.nextAction || '-',
            fileLocation: () => caseData.fileLocation || '-',
            judgmentClassification: () => caseData.judgmentClassification || '-',
            actions: () => `
                <div style="display:flex; gap:6px;">
                    <button class="btn btn-icon btn-view-case" data-id="${caseData.id}" title="عرض التفاصيل" style="color:var(--primary);"><ion-icon name="eye-outline"></ion-icon></button>
                    <button class="btn btn-icon btn-edit-case" data-id="${caseData.id}" title="تعديل" style="color:var(--warning);"><ion-icon name="create-outline"></ion-icon></button>
                    <button class="btn btn-icon btn-delete-case" data-id="${caseData.id}" title="حذف" style="color:var(--danger);"><ion-icon name="trash-outline"></ion-icon></button>
                </div>
            `
        };

        return builders[key] ? builders[key]() : '-';
    }

    renderTable() {
        const gridContainer = this.container.querySelector('#cases-grid-container');
        const pageCases = this.getCurrentPageData();
        const orderedColumns = getOrderedColumns(CASE_COLUMN_DEFS, this.tablePrefs);
        const visibleColumns = orderedColumns.filter((column) => this.tablePrefs.visibility[column.key] !== false);

        if (pageCases.length === 0) {
            gridContainer.innerHTML = `
                <div class="empty-state" style="min-height:200px;">
                    <ion-icon name="document-outline"></ion-icon>
                    <p>${this.searchQuery ? 'لم يتم العثور على نتائج للبحث المحدد' : 'لا توجد قضايا للعرض'}</p>
                </div>`;
            this.updatePaginationUI();
            return;
        }

        const rows = pageCases.map((caseData) => `
            <tr class="case-row" data-id="${caseData.id}">
                <td style="text-align:center;">
                    <input type="checkbox" class="case-checkbox" data-id="${caseData.id}" ${this.selectedCases.has(caseData.id) ? 'checked' : ''}>
                </td>
                ${visibleColumns.map((column) => `
                    <td data-col="${column.key}" ${column.key === 'plaintiff' || column.key === 'defendant' || column.key === 'subject' ? 'style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"' : ''}>
                        ${this.renderCell(caseData, column.key)}
                    </td>
                `).join('')}
            </tr>
        `).join('');

        gridContainer.innerHTML = `
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th style="width:40px; text-align:center;"><input type="checkbox" id="select-all-chk"></th>
                            ${visibleColumns.map((column) => `<th data-col="${column.key}">${column.label}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        `;

        this.bindTableEvents();
        this.updatePaginationUI();
    }

    updateCountLabel() {
        const label = this.container.querySelector('#cases-count-label');
        if (label) label.textContent = `${this.filteredCases.length} قضية من ${this.allCases.length}`;
    }

    updatePaginationUI() {
        const totalPages = Math.max(1, Math.ceil(this.filteredCases.length / this.pageSize));
        const info = this.container.querySelector('#page-info');
        if (info) info.textContent = `الصفحة ${this.currentPage} من ${totalPages}`;

        renderPagination(this.container.querySelector('#cases-pagination'), {
            currentPage: this.currentPage,
            totalPages,
            onPageChange: (page) => {
                this.currentPage = page;
                this.renderTable();
            }
        });
    }

    bindTableEvents() {
        const selectAll = this.container.querySelector('#select-all-chk');
        if (selectAll) {
            selectAll.addEventListener('change', (event) => {
                this.getCurrentPageData().forEach((caseData) => {
                    if (event.target.checked) this.selectedCases.add(caseData.id);
                    else this.selectedCases.delete(caseData.id);
                });

                this.container.querySelectorAll('.case-checkbox').forEach((checkbox) => {
                    checkbox.checked = event.target.checked;
                });
                this.updateDeleteSelectedBtn();
            });
        }

        this.container.querySelectorAll('.case-checkbox').forEach((checkbox) => {
            checkbox.addEventListener('change', (event) => {
                const id = event.target.dataset.id;
                if (event.target.checked) this.selectedCases.add(id);
                else this.selectedCases.delete(id);
                this.updateDeleteSelectedBtn();
            });
        });

        this.container.querySelectorAll('.btn-view-case').forEach((button) => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                document.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'case-details', id: button.dataset.id } }));
            });
        });

        this.container.querySelectorAll('.btn-edit-case').forEach((button) => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                this.openCaseForm(button.dataset.id);
            });
        });

        this.container.querySelectorAll('.btn-delete-case').forEach((button) => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                this.deleteCases([button.dataset.id]);
            });
        });

        this.container.querySelectorAll('.case-row').forEach((row) => {
            row.addEventListener('click', (event) => {
                if (event.target.closest('.btn-icon') || event.target.closest('.case-checkbox')) return;
                document.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'case-details', id: row.dataset.id } }));
            });
            row.style.cursor = 'pointer';
        });
    }

    updateDeleteSelectedBtn() {
        const button = this.container.querySelector('#btn-delete-selected');
        const count = this.container.querySelector('#sel-count');
        if (button) {
            button.style.display = this.selectedCases.size > 0 ? 'flex' : 'none';
            if (count) count.textContent = this.selectedCases.size;
        }
    }

    persistCases(updatedCases) {
        this.app.storage.saveCases(updatedCases);
        this.allCases = this.app.storage.loadCases() || updatedCases;
        document.dispatchEvent(new CustomEvent('cases-updated'));
    }

    openCaseForm(caseId = null) {
        const modalContainer = this.container.querySelector('#modal-container');
        const existingCase = caseId ? this.allCases.find((item) => item.id === caseId) : null;
        const caseForm = new CaseForm(modalContainer, this.app, (data) => {
            if (!data) return;

            const updatedCases = [...this.allCases];
            const index = updatedCases.findIndex((item) => item.id === data.id);
            if (index >= 0) updatedCases[index] = { ...updatedCases[index], ...data };
            else updatedCases.unshift(data);

            this.persistCases(updatedCases);
            this.applyFilters();
        });
        caseForm.render(existingCase);
    }

    async deleteCases(ids) {
        if (!ids?.length) return;

        const message = ids.length === 1 ? 'هل تريد حذف هذه القضية نهائيًا؟' : `هل تريد حذف ${ids.length} قضية نهائيًا؟`;
        if (!confirm(message)) return;

        try {
            if (this.app.storage.teamId) {
                const { db, doc, deleteDoc, collection, getDocs, query, where } = await import('../auth/FirebaseConfig.js');

                for (const id of ids) {
                    await deleteDoc(doc(db, 'team_data', this.app.storage.teamId, 'cases', id));
                }

                for (const collectionName of ['sessions', 'tasks']) {
                    for (const id of ids) {
                        const ref = collection(db, 'team_data', this.app.storage.teamId, collectionName);
                        const snap = await getDocs(query(ref, where('caseId', '==', id)));
                        for (const docSnap of snap.docs) {
                            await deleteDoc(docSnap.ref);
                        }
                    }
                }
            }

            this.app.storage.removeCasesAndRelatedLocalData(ids);
            this.allCases = this.app.storage.loadCases() || [];
            this.selectedCases.clear();
            this.applyFilters();
            this.updateDeleteSelectedBtn();
            document.dispatchEvent(new CustomEvent('cases-updated'));
        } catch (error) {
            console.error('Delete failed:', error);
            alert('فشل الحذف: ' + error.message);
        }
    }

    async deleteAllCases() {
        const total = this.allCases.length;
        if (total === 0) {
            alert('لا توجد قضايا للحذف.');
            return;
        }

        if (!confirm(`تحذير: سيتم حذف جميع القضايا وعددها ${total}. هل أنت متأكد؟`)) return;
        if (!confirm('تأكيد نهائي: حذف كل القضايا؟')) return;

        try {
            if (this.app.storage.teamId) {
                const { db, doc, deleteDoc, collection, getDocs } = await import('../auth/FirebaseConfig.js');

                for (const caseData of this.allCases) {
                    await deleteDoc(doc(db, 'team_data', this.app.storage.teamId, 'cases', caseData.id));
                }

                for (const collectionName of ['sessions', 'tasks']) {
                    const ref = collection(db, 'team_data', this.app.storage.teamId, collectionName);
                    const snap = await getDocs(ref);
                    for (const docSnap of snap.docs) {
                        await deleteDoc(docSnap.ref);
                    }
                }
            }

            this.app.storage.removeCasesAndRelatedLocalData([], { clearAll: true });
            this.allCases = this.app.storage.loadCases() || [];
            this.selectedCases.clear();
            this.applyFilters();
            this.updateDeleteSelectedBtn();
            document.dispatchEvent(new CustomEvent('cases-updated'));
            alert(`تم حذف ${total} قضية بنجاح.`);
        } catch (error) {
            console.error('Delete all failed:', error);
            alert('فشل الحذف: ' + error.message);
        }
    }

    setupColumnMenu() {
        const button = this.container.querySelector('#btn-toggle-cols');
        const menu = this.container.querySelector('#col-toggle-menu');
        if (!button || !menu) return;

        const rerender = (prefs) => {
            this.tablePrefs = prefs;
            saveTablePreferences('SLA_V2_Cases_TablePrefs', prefs);
            renderTablePreferencesMenu(menu, CASE_COLUMN_DEFS, this.tablePrefs, rerender);
            menu.style.display = 'block';
            this.renderTable();
        };

        renderTablePreferencesMenu(menu, CASE_COLUMN_DEFS, this.tablePrefs, rerender);

        button.addEventListener('click', (event) => {
            event.stopPropagation();
            menu.style.display = menu.style.display === 'none' || !menu.style.display ? 'block' : 'none';
        });

        menu.addEventListener('click', (event) => event.stopPropagation());
        menu.addEventListener('mousedown', (event) => event.stopPropagation());

        document.addEventListener('click', (event) => {
            if (!button.contains(event.target) && !menu.contains(event.target)) {
                menu.style.display = 'none';
            }
        });
    }

    setupEvents() {
        const searchInput = this.container.querySelector('#cases-search');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (event) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.searchQuery = event.target.value;
                    this.applyFilters();
                }, 150);
            });
        }

        this.container.querySelector('#cases-filter-status')?.addEventListener('change', () => this.applyFilters());
        this.container.querySelector('#btn-new-case')?.addEventListener('click', () => this.openCaseForm());
        this.container.querySelector('#btn-import-cases')?.addEventListener('click', () => {
            const importModal = new ImportModal(this.app, () => {
                this.allCases = this.app.storage.loadCases() || [];
                this.applyFilters();
                document.dispatchEvent(new CustomEvent('cases-updated'));
            });
            importModal.render();
        });
        this.container.querySelector('#btn-delete-selected')?.addEventListener('click', () => this.deleteCases([...this.selectedCases]));
        this.container.querySelector('#btn-delete-all')?.addEventListener('click', () => this.deleteAllCases());

        this.setupColumnMenu();
    }
}
