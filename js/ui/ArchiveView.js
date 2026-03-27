import { EditableGrid } from './EditableGrid.js';
import { getOrderedColumns, loadTablePreferences, renderTablePreferencesMenu, saveTablePreferences } from './TablePreferences.js';

const ARCHIVE_COLUMN_DEFS = [
    { key: 'caseNumber', label: 'الطعن', visible: true },
    { key: 'year', label: 'السنة', visible: true },
    { key: 'court', label: 'المحكمة', visible: true },
    { key: 'parties', label: 'الأطراف', visible: true }
];

export class ArchiveView {
    constructor(container, app) {
        this.container = container;
        this.app = app;
        this.cases = [];
        this.lastDoc = null;
        this.currentPage = 1;
        this.pageSize = 10;
        this.tablePrefs = loadTablePreferences('SLA_V2_Archive_TablePrefs', ARCHIVE_COLUMN_DEFS);
    }

    async loadArchiveData(next = true) {
        const gridContainer = this.container.querySelector('#archive-grid');
        if (gridContainer) gridContainer.innerHTML = '<div class="loader-container"><div class="loader"></div></div>';

        const result = await this.app.storage.loadCollectionPaginated('cases', this.pageSize, next ? this.lastDoc : null, [
            { field: 'status', op: '==', value: 'archived' }
        ]);

        this.cases = result.data;
        this.lastDoc = result.lastDoc;

        this.renderGrid();
        this.updatePaginationUI();
    }

    updatePaginationUI() {
        const info = this.container.querySelector('#page-info');
        if (info) info.innerText = `الصفحة ${this.currentPage}`;

        const btnPrev = this.container.querySelector('#btn-prev-page');
        const btnNext = this.container.querySelector('#btn-next-page');
        if (btnPrev) btnPrev.disabled = this.currentPage === 1;
        if (btnNext) btnNext.disabled = this.cases.length < this.pageSize;
    }

    render() {
        this.container.innerHTML = `
            <div class="page-header">
                <div class="header-titles">
                    <h2>الأرشيف (القضايا المنتهية)</h2>
                    <p>سجل حفظ القضايا التي تم إصدار أحكام نهائية بها أو تم استبعادها</p>
                </div>
                <div class="header-actions" style="display:flex; gap:10px;">
                    <button class="btn btn-secondary" id="btn-archive-cols"><ion-icon name="options-outline"></ion-icon> أعمدة الجدول</button>
                </div>
            </div>

            <div class="page-body">
                <div id="archive-grid"></div>
                <div id="archive-col-menu" class="glass-panel table-pref-menu" style="display:none; position:absolute; top:140px; right:32px; min-width:280px; z-index:110;"></div>

                <div class="pagination-bar" style="display:flex; justify-content:center; align-items:center; gap:20px; margin-top:20px; padding: 10px; border-top: 1px solid var(--glass-border); background: rgba(0,0,0,0.1); border-radius: 8px;">
                    <button class="btn btn-icon" id="btn-prev-page" title="الصفحة السابقة"><ion-icon name="chevron-forward-outline"></ion-icon></button>
                    <span id="page-info" style="font-weight: 600; color: var(--text-muted)">الصفحة ${this.currentPage}</span>
                    <button class="btn btn-icon" id="btn-next-page" title="الصفحة التالية"><ion-icon name="chevron-back-outline"></ion-icon></button>
                </div>
            </div>
        `;

        this.loadArchiveData();
        this.setupColumnMenu();
        this.setupEvents();
    }

    renderGrid() {
        const gridContainer = this.container.querySelector('#archive-grid');
        if (!gridContainer) return;

        if (this.cases.length === 0) {
            gridContainer.innerHTML = `
                <div class="empty-state" style="text-align:center; padding: 40px;">
                    <ion-icon name="archive-outline" style="font-size: 64px; color: var(--text-muted);"></ion-icon>
                    <h3 style="margin-top: 16px;">الأرشيف فارغ</h3>
                    <p style="color: var(--text-muted);">لا توجد قضايا منتهية في الأرشيف حتى الآن.</p>
                </div>`;
            return;
        }

        const visibleColumns = getOrderedColumns(ARCHIVE_COLUMN_DEFS, this.tablePrefs)
            .filter((column) => this.tablePrefs.visibility[column.key] !== false)
            .map((column) => ({
                field: column.key,
                label: column.label,
                type: column.key === 'parties' ? 'array' : 'text'
            }));

        this.grid = new EditableGrid(gridContainer, visibleColumns, this.cases, null, {
            actions: { view: true, edit: false, date: false }
        });
        this.grid.render();
    }

    setupColumnMenu() {
        const button = this.container.querySelector('#btn-archive-cols');
        const menu = this.container.querySelector('#archive-col-menu');
        if (!button || !menu) return;

        const rerender = (prefs) => {
            this.tablePrefs = prefs;
            saveTablePreferences('SLA_V2_Archive_TablePrefs', prefs);
            renderTablePreferencesMenu(menu, ARCHIVE_COLUMN_DEFS, this.tablePrefs, rerender);
            menu.style.display = 'block';
            this.renderGrid();
        };

        renderTablePreferencesMenu(menu, ARCHIVE_COLUMN_DEFS, this.tablePrefs, rerender);

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
        this.container.querySelector('#btn-next-page')?.addEventListener('click', () => {
            this.currentPage += 1;
            this.loadArchiveData(true);
        });

        this.container.querySelector('#btn-prev-page')?.addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage -= 1;
                this.lastDoc = null;
                this.loadArchiveData(false);
            }
        });
    }
}
