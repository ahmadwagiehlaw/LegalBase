import { CaseForm } from './CaseForm.js';
import { ImportModal } from './ImportModal.js';
import { renderPagination } from './Pagination.js';
import { getOrderedColumns, loadTablePreferences, renderTablePreferencesMenu, saveTablePreferences } from './TablePreferences.js';

const T = {
    caseYear: '\u0631\u0642\u0645 \u0627\u0644\u0637\u0639\u0646 / \u0627\u0644\u0633\u0646\u0629',
    court: '\u0627\u0644\u0645\u062d\u0643\u0645\u0629 / \u0627\u0644\u062f\u0627\u0626\u0631\u0629',
    subject: '\u0627\u0644\u0645\u0648\u0636\u0648\u0639',
    plaintiff: '\u0627\u0644\u0645\u062f\u0639\u064a / \u0627\u0644\u0637\u0627\u0639\u0646',
    defendant: '\u0627\u0644\u0645\u062f\u0639\u0649 \u0639\u0644\u064a\u0647 / \u0627\u0644\u0645\u0637\u0639\u0648\u0646 \u0636\u062f\u0647',
    status: '\u0627\u0644\u062d\u0627\u0644\u0629',
    lastSession: '\u0622\u062e\u0631 \u062c\u0644\u0633\u0629 / \u0642\u0631\u0627\u0631',
    nextAction: '\u0627\u0644\u0625\u062c\u0631\u0627\u0621 \u0627\u0644\u0642\u0627\u062f\u0645',
    fileLocation: '\u0645\u0643\u0627\u0646 \u0627\u0644\u0645\u0644\u0641',
    judgmentClassification: '\u062a\u0635\u0646\u064a\u0641 \u0627\u0644\u062d\u0643\u0645',
    actions: '\u0625\u062c\u0631\u0627\u0621\u0627\u062a',
    pageTitle: '\u0625\u062f\u0627\u0631\u0629 \u0627\u0644\u0637\u0639\u0648\u0646 \u0648\u0627\u0644\u0642\u0636\u0627\u064a\u0627',
    pageSubtitle: '\u0625\u062f\u0627\u0631\u0629 \u0648\u062a\u0635\u0641\u064a\u0629 \u0648\u062a\u0639\u062f\u064a\u0644 \u0645\u0644\u0641\u0627\u062a \u0627\u0644\u0642\u0636\u0627\u064a\u0627',
    importExcel: '\u0627\u0633\u062a\u064a\u0631\u0627\u062f Excel',
    deleteSelected: '\u062d\u0630\u0641 \u0627\u0644\u0645\u062d\u062f\u062f',
    deleteAll: '\u062d\u0630\u0641 \u0627\u0644\u0643\u0644',
    newCase: '\u0642\u0636\u064a\u0629 \u062c\u062f\u064a\u062f\u0629',
    searchPlaceholder: '\u0628\u062d\u062b \u0628\u0631\u0642\u0645 \u0627\u0644\u0637\u0639\u0646\u060c \u0627\u0644\u0645\u062d\u0643\u0645\u0629\u060c \u0627\u0644\u062e\u0635\u0648\u0645...',
    columns: '\u0623\u0639\u0645\u062f\u0629 \u0627\u0644\u062c\u062f\u0648\u0644',
    allStatuses: '\u0643\u0644 \u0627\u0644\u062d\u0627\u0644\u0627\u062a',
    active: '\u0646\u0634\u0637',
    activeCase: '\u0645\u062a\u062f\u0627\u0648\u0644',
    judged: '\u0645\u062d\u0643\u0648\u0645 \u0641\u064a\u0647',
    reserved: '\u0645\u062d\u062c\u0648\u0632 \u0644\u0644\u062d\u0643\u0645',
    referred: '\u0645\u062d\u0627\u0644',
    suspendedAdmin: '\u0645\u0648\u0642\u0648\u0641 \u062c\u0632\u0627\u0626\u064a\u0627',
    archived: '\u0645\u0624\u0631\u0634\u0641',
    newStatus: '\u062c\u062f\u064a\u062f',
    page: '\u0627\u0644\u0635\u0641\u062d\u0629',
    of: '\u0645\u0646',
    loadingCases: '\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0642\u0636\u0627\u064a\u0627...',
    loadingFailed: '\u0641\u0634\u0644 \u062a\u062d\u0645\u064a\u0644 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a. \u062a\u062d\u0642\u0642 \u0645\u0646 \u0627\u062a\u0635\u0627\u0644\u0643.',
    unspecified: '\u063a\u064a\u0631 \u0645\u062d\u062f\u062f',
    noSearchResults: '\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0646\u062a\u0627\u0626\u062c \u0644\u0644\u0628\u062d\u062b \u0627\u0644\u0645\u062d\u062f\u062f',
    noCases: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0642\u0636\u0627\u064a\u0627 \u0644\u0644\u0639\u0631\u0636',
    countLabel: '\u0642\u0636\u064a\u0629 \u0645\u0646',
    viewDetails: '\u0639\u0631\u0636 \u0627\u0644\u062a\u0641\u0627\u0635\u064a\u0644',
    edit: '\u062a\u0639\u062f\u064a\u0644',
    delete: '\u062d\u0630\u0641',
    deleteSingleConfirm: '\u0647\u0644 \u062a\u0631\u064a\u062f \u062d\u0630\u0641 \u0647\u0630\u0647 \u0627\u0644\u0642\u0636\u064a\u0629 \u0646\u0647\u0627\u0626\u064a\u0627\u061f',
    deleteMultiPrefix: '\u0647\u0644 \u062a\u0631\u064a\u062f \u062d\u0630\u0641',
    deleteMultiSuffix: '\u0642\u0636\u064a\u0629 \u0646\u0647\u0627\u0626\u064a\u0627\u061f',
    deleteFailed: '\u0641\u0634\u0644 \u0627\u0644\u062d\u0630\u0641:',
    noCasesToDelete: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0642\u0636\u0627\u064a\u0627 \u0644\u0644\u062d\u0630\u0641.',
    deleteAllWarningPrefix: '\u062a\u062d\u0630\u064a\u0631: \u0633\u064a\u062a\u0645 \u062d\u0630\u0641 \u062c\u0645\u064a\u0639 \u0627\u0644\u0642\u0636\u0627\u064a\u0627 \u0648\u0639\u062f\u062f\u0647\u0627',
    deleteAllWarningSuffix: '\u0647\u0644 \u0623\u0646\u062a \u0645\u062a\u0623\u0643\u062f\u061f',
    deleteAllFinal: '\u062a\u0623\u0643\u064a\u062f \u0646\u0647\u0627\u0626\u064a: \u062d\u0630\u0641 \u0643\u0644 \u0627\u0644\u0642\u0636\u0627\u064a\u0627\u061f',
    deleteAllSuccessPrefix: '\u062a\u0645 \u062d\u0630\u0641',
    deleteAllSuccessSuffix: '\u0642\u0636\u064a\u0629 \u0628\u0646\u062c\u0627\u062d.'
};

const CASE_COLUMN_DEFS = [
    { key: 'case_year', label: T.caseYear, visible: true },
    { key: 'court', label: T.court, visible: true },
    { key: 'subject', label: T.subject, visible: false },
    { key: 'plaintiff', label: T.plaintiff, visible: true },
    { key: 'defendant', label: T.defendant, visible: true },
    { key: 'status', label: T.status, visible: true },
    { key: 'lastSession', label: T.lastSession, visible: true },
    { key: 'nextAction', label: T.nextAction, visible: false },
    { key: 'fileLocation', label: T.fileLocation, visible: false },
    { key: 'judgmentClassification', label: T.judgmentClassification, visible: false },
    { key: 'actions', label: T.actions, visible: true }
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
                    <h2><ion-icon name="briefcase-outline" style="vertical-align: middle; margin-left: 8px;"></ion-icon> ${T.pageTitle}</h2>
                    <p>${T.pageSubtitle}</p>
                </div>
                <div class="header-actions" style="display:flex; gap: 12px; flex-wrap:wrap;">
                    <button class="btn btn-secondary" id="btn-import-cases"><ion-icon name="cloud-download-outline"></ion-icon> ${T.importExcel}</button>
                    <button class="btn btn-secondary" id="btn-delete-selected" style="color:var(--danger); display:none;"><ion-icon name="trash-outline"></ion-icon> ${T.deleteSelected} (<span id="sel-count">0</span>)</button>
                    <button class="btn btn-secondary" id="btn-delete-all" style="color:var(--danger);"><ion-icon name="nuclear-outline"></ion-icon> ${T.deleteAll}</button>
                    <button class="btn btn-primary" id="btn-new-case"><ion-icon name="add"></ion-icon> ${T.newCase}</button>
                </div>
            </div>

            <div style="padding: 16px 32px 0; display: flex; gap: 12px; align-items:center; flex-wrap:wrap;">
                <div style="position:relative; flex:1; min-width: 250px;">
                    <ion-icon name="search-outline" style="position:absolute; right:14px; top:50%; transform:translateY(-50%); color:var(--text-muted); font-size:1.1rem;"></ion-icon>
                    <input type="text" id="cases-search" placeholder="${T.searchPlaceholder}" style="width:100%; padding:10px 42px 10px 14px; background:var(--surface); border:1px solid var(--glass-border); border-radius:var(--radius-md); color:var(--text-main); outline:none; font-size:0.95rem;">
                </div>

                <div style="position:relative;" id="col-toggle-wrapper">
                    <button class="btn btn-secondary" id="btn-toggle-cols" style="padding:8px 12px; display:flex; gap:6px; align-items:center; border-radius:8px; background:var(--surface); border:1px solid var(--glass-border); color:var(--text-main); font-size:0.9rem;">
                        <ion-icon name="options-outline"></ion-icon> ${T.columns}
                    </button>
                    <div id="col-toggle-menu" class="glass-panel table-pref-menu" style="display:none; position:absolute; top:110%; right:0; z-index:100; min-width:280px;"></div>
                </div>

                <select id="cases-filter-status" style="padding:10px 14px; background:var(--surface); border:1px solid var(--glass-border); border-radius:var(--radius-md); color:var(--text-main); outline:none;">
                    <option value="">${T.allStatuses}</option>
                    <option value="active">${T.active}</option>
                    <option value="متداول">${T.activeCase}</option>
                    <option value="محكوم فيه">${T.judged}</option>
                    <option value="محجوز للحكم">${T.reserved}</option>
                    <option value="محال">${T.referred}</option>
                    <option value="suspended_administrative">${T.suspendedAdmin}</option>
                    <option value="archived">${T.archived}</option>
                    <option value="new">${T.newStatus}</option>
                </select>
                <span id="cases-count-label" style="color:var(--text-muted); font-size:0.9rem;"></span>
            </div>

            <div class="page-body">
                <div id="cases-grid-container"></div>
                <div class="pagination-shell">
                    <span id="page-info" class="pagination-info">${T.page} 1</span>
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
                <p style="margin-top:10px; color:var(--text-muted);">${T.loadingCases}</p>
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
            gridContainer.innerHTML = `<div class="empty-state"><ion-icon name="cloud-offline-outline"></ion-icon><p>${T.loadingFailed}</p></div>`;
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
            active: ['status-success', T.active],
            'متداول': ['status-success', T.activeCase],
            'محكوم فيه': ['status-default', T.judged],
            'محجوز للحكم': ['status-blue', T.reserved],
            'محال': ['status-warning', T.referred],
            new: ['status-blue', T.newStatus],
            suspended_administrative: ['status-warning', T.suspendedAdmin],
            archived: ['status-default', T.archived]
        };

        const [cls, label] = map[status] || ['status-default', status || T.unspecified];
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
                    <button class="btn btn-icon btn-view-case" data-id="${caseData.id}" title="${T.viewDetails}" style="color:var(--primary);"><ion-icon name="eye-outline"></ion-icon></button>
                    <button class="btn btn-icon btn-edit-case" data-id="${caseData.id}" title="${T.edit}" style="color:var(--warning);"><ion-icon name="create-outline"></ion-icon></button>
                    <button class="btn btn-icon btn-delete-case" data-id="${caseData.id}" title="${T.delete}" style="color:var(--danger);"><ion-icon name="trash-outline"></ion-icon></button>
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
                    <p>${this.searchQuery ? T.noSearchResults : T.noCases}</p>
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
        if (label) label.textContent = `${this.filteredCases.length} ${T.countLabel} ${this.allCases.length}`;
    }

    updatePaginationUI() {
        const totalPages = Math.max(1, Math.ceil(this.filteredCases.length / this.pageSize));
        const info = this.container.querySelector('#page-info');
        if (info) info.textContent = `${T.page} ${this.currentPage} ${T.of} ${totalPages}`;

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

        const message = ids.length === 1 ? T.deleteSingleConfirm : `${T.deleteMultiPrefix} ${ids.length} ${T.deleteMultiSuffix}`;
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
            alert(`${T.deleteFailed} ${error.message}`);
        }
    }

    async deleteAllCases() {
        const total = this.allCases.length;
        if (total === 0) {
            alert(T.noCasesToDelete);
            return;
        }

        if (!confirm(`${T.deleteAllWarningPrefix} ${total}. ${T.deleteAllWarningSuffix}`)) return;
        if (!confirm(T.deleteAllFinal)) return;

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
            alert(`${T.deleteAllSuccessPrefix} ${total} ${T.deleteAllSuccessSuffix}`);
        } catch (error) {
            console.error('Delete all failed:', error);
            alert(`${T.deleteFailed} ${error.message}`);
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
