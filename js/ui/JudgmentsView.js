import { EditableGrid } from './EditableGrid.js';
import { collectCaseSuggestions } from './FieldOptions.js';
import { openOptionListModal } from './OptionListModal.js';
import { renderPagination } from './Pagination.js';
import { getOrderedColumns, loadTablePreferences, renderTablePreferencesMenu, saveTablePreferences } from './TablePreferences.js';
import { buildJudgmentsIndex } from '../core/JudgmentIndex.js';

const T = {
    date: '\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u062d\u0643\u0645',
    caseYear: '\u0631\u0642\u0645 \u0627\u0644\u062f\u0639\u0648\u0649 / \u0627\u0644\u0633\u0646\u0629',
    court: '\u0627\u0644\u0645\u062d\u0643\u0645\u0629',
    subject: '\u0627\u0644\u0645\u0648\u0636\u0648\u0639',
    litigants: '\u0627\u0644\u062e\u0635\u0648\u0645',
    plaintiff: '\u0627\u0644\u0645\u062f\u0639\u064a / \u0627\u0644\u0637\u0627\u0639\u0646',
    defendant: '\u0627\u0644\u0645\u062f\u0639\u0649 \u0639\u0644\u064a\u0647',
    type: '\u0646\u0648\u0639 \u0627\u0644\u062d\u0643\u0645',
    content: '\u0627\u0644\u0645\u0646\u0637\u0648\u0642',
    classification: '\u0627\u0644\u062a\u0635\u0646\u064a\u0641 (\u0635\u0627\u0644\u062d/\u0636\u062f)',
    title: '\u0623\u062c\u0646\u062f\u0629 \u0627\u0644\u0623\u062d\u0643\u0627\u0645',
    subtitle: '\u0645\u062a\u0627\u0628\u0639\u0629 \u0648\u062a\u0635\u0646\u064a\u0641 \u0627\u0644\u0623\u062d\u0643\u0627\u0645 \u0627\u0644\u0635\u0627\u062f\u0631\u0629 \u0641\u064a \u0643\u0627\u0641\u0629 \u0627\u0644\u0642\u0636\u0627\u064a\u0627 (\u0635\u0627\u0644\u062d/\u0636\u062f)',
    filter: '\u062a\u0635\u0641\u064a\u0629',
    columns: '\u0623\u0639\u0645\u062f\u0629 \u0627\u0644\u062c\u062f\u0648\u0644',
    export: '\u062a\u0635\u062f\u064a\u0631 \u0625\u062d\u0635\u0627\u0626\u064a\u0629',
    searchPlaceholder: '\u0627\u0628\u062d\u062b \u0628\u0631\u0642\u0645 \u0627\u0644\u062f\u0639\u0648\u0649 \u0623\u0648 \u0627\u0644\u062e\u0635\u0648\u0645 \u0623\u0648 \u0645\u0646\u0637\u0648\u0642 \u0627\u0644\u062d\u0643\u0645...',
    allJudgmentTypes: '\u0643\u0644 \u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u062d\u0643\u0645',
    editTypes: '\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u0623\u0646\u0648\u0627\u0639',
    allClassifications: '\u0643\u0644 \u0627\u0644\u062a\u0635\u0646\u064a\u0641\u0627\u062a',
    editClassifications: '\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u062a\u0635\u0646\u064a\u0641\u0627\u062a',
    page: '\u0627\u0644\u0635\u0641\u062d\u0629',
    pageOf: '\u0645\u0646',
    editDate: '\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u062a\u0627\u0631\u064a\u062e',
    empty: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0623\u062d\u0643\u0627\u0645 \u062a\u0637\u0627\u0628\u0642 \u0627\u0644\u0641\u0644\u062a\u0631 \u0627\u0644\u062d\u0627\u0644\u064a',
    countPattern: '\u062d\u0643\u0645 \u0645\u0646',
    manageTypesTitle: '\u0625\u062f\u0627\u0631\u0629 \u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u062d\u0643\u0645',
    manageClassificationsTitle: '\u0625\u062f\u0627\u0631\u0629 \u062a\u0635\u0646\u064a\u0641\u0627\u062a \u0627\u0644\u062d\u0643\u0645',
    modalDescription: '\u0623\u0636\u0641 \u0623\u0648 \u0639\u062f\u0644 \u0627\u0644\u062e\u064a\u0627\u0631\u0627\u062a \u0644\u062a\u0638\u0647\u0631 \u0641\u064a \u0627\u0644\u0642\u0648\u0627\u0626\u0645 \u0627\u0644\u0645\u0646\u0633\u062f\u0644\u0629 \u0645\u0639 \u0627\u0633\u062a\u0645\u0631\u0627\u0631 \u0627\u0644\u0627\u0633\u062a\u0641\u0627\u062f\u0629 \u0645\u0646 \u0627\u0644\u0642\u064a\u0645 \u0627\u0644\u0645\u0648\u062c\u0648\u062f\u0629 \u0641\u0639\u0644\u064a\u0627 \u062f\u0627\u062e\u0644 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a.',
    modalPlaceholder: '\u0623\u0636\u0641 \u0627\u062e\u062a\u064a\u0627\u0631\u0627 \u062c\u062f\u064a\u062f\u0627',
    saveChanges: '\u062d\u0641\u0638 \u0627\u0644\u062a\u0639\u062f\u064a\u0644\u0627\u062a',
    reportType: '\u0646\u0648\u0639 \u0627\u0644\u062a\u0642\u0631\u064a\u0631',
    judgmentsStatistics: '\u0625\u062d\u0635\u0627\u0626\u064a\u0629 \u0627\u0644\u0623\u062d\u0643\u0627\u0645',
    totalJudgments: '\u0625\u062c\u0645\u0627\u0644\u064a \u0627\u0644\u0623\u062d\u0643\u0627\u0645',
    count: '\u0627\u0644\u0639\u062f\u062f',
    notClassified: '\u063a\u064a\u0631 \u0645\u0635\u0646\u0641',
    unspecified: '\u063a\u064a\u0631 \u0645\u062d\u062f\u062f',
    pseudoReserved: '\u0645\u062d\u062c\u0648\u0632 \u0644\u0644\u062d\u0643\u0645',
    pseudoNotRecorded: '\u0644\u0645 \u064a\u0633\u062c\u0644 \u0628\u0639\u062f'
};

const JUDGMENT_COLUMN_DEFS = [
    { key: 'date', label: T.date, visible: true },
    { key: 'caseNumberFormatted', label: T.caseYear, visible: true },
    { key: 'court', label: T.court, visible: false },
    { key: 'subject', label: T.subject, visible: false },
    { key: 'litigants', label: T.litigants, visible: false },
    { key: 'plaintiff', label: T.plaintiff, visible: false },
    { key: 'defendant', label: T.defendant, visible: false },
    { key: 'type', label: T.type, visible: true },
    { key: 'content', label: T.content, visible: true },
    { key: 'classification', label: T.classification, visible: true }
];

export class JudgmentsView {
    constructor(container, app, route = {}) {
        this.container = container;
        this.app = app;
        this.route = route;
        this.cases = this.app.storage.loadCases() || [];
        this.judgments = [];
        this.filteredJudgments = [];
        this.currentPage = 1;
        this.pageSize = 10;
        this.filtersVisible = false;
        this.filters = {
            query: route.query || '',
            type: '',
            classification: ''
        };
        this.tablePrefs = loadTablePreferences('SLA_V2_Judgments_TablePrefs', JUDGMENT_COLUMN_DEFS);
        this.refreshData();
    }

    refreshData() {
        this.cases = this.app.storage.loadCases() || this.cases;
        this.judgments = buildJudgmentsIndex(this.cases);
        this.filteredJudgments = [...this.judgments];
    }

    getSuggestions() {
        return collectCaseSuggestions(this.cases, this.app.storage.loadSettings() || {});
    }

    applyFilters() {
        const query = this.filters.query.toLowerCase().trim();
        const type = this.filters.type;
        const classification = this.filters.classification;

        this.filteredJudgments = this.judgments.filter((judgment) => {
            const matchesQuery = !query ||
                String(judgment.caseNumberFormatted || '').toLowerCase().includes(query) ||
                String(judgment.caseNumber || '').toLowerCase().includes(query) ||
                String(judgment.year || '').toLowerCase().includes(query) ||
                String(judgment.date || '').toLowerCase().includes(query) ||
                String(judgment.court || '').toLowerCase().includes(query) ||
                String(judgment.subject || '').toLowerCase().includes(query) ||
                String(judgment.litigants || '').toLowerCase().includes(query) ||
                String(judgment.plaintiff || '').toLowerCase().includes(query) ||
                String(judgment.defendant || '').toLowerCase().includes(query) ||
                String(judgment.content || '').toLowerCase().includes(query) ||
                String(judgment.classification || '').toLowerCase().includes(query) ||
                String(judgment.type || '').toLowerCase().includes(query);

            const matchesType = !type || judgment.type === type;
            const matchesClassification = !classification || judgment.classification === classification;
            return matchesQuery && matchesType && matchesClassification;
        });

        this.currentPage = 1;
        this.renderGrid();
        this.updateCounters();
    }

    getCurrentPageData() {
        const start = (this.currentPage - 1) * this.pageSize;
        return this.filteredJudgments.slice(start, start + this.pageSize);
    }

    render() {
        const suggestions = this.getSuggestions();

        this.container.innerHTML = `
            <div class="page-header">
                <div class="header-titles">
                    <h2>${T.title}</h2>
                    <p>${T.subtitle}</p>
                </div>
                <div class="actions-right" style="display:flex; gap:10px; flex-wrap:wrap;">
                    <button class="btn btn-secondary" id="btn-judgments-filter"><ion-icon name="filter-outline"></ion-icon> ${T.filter}</button>
                    <button class="btn btn-secondary" id="btn-judgments-columns"><ion-icon name="options-outline"></ion-icon> ${T.columns}</button>
                    <button class="btn btn-primary" id="btn-export-judgment-stats"><ion-icon name="download-outline"></ion-icon> ${T.export}</button>
                </div>
            </div>

            <div class="filters-bar" style="padding: 12px 28px 0;">
                <div style="position:relative; flex:1; min-width:260px;">
                    <ion-icon name="search-outline" style="position:absolute; right:14px; top:50%; transform:translateY(-50%); color:var(--text-muted); font-size:1.1rem;"></ion-icon>
                    <input type="text" placeholder="${T.searchPlaceholder}" id="judgment-search" style="width:100%; padding:10px 42px 10px 14px; background:var(--surface); border:1px solid var(--glass-border); border-radius:var(--radius-md); color:var(--text-main); outline:none; font-size:0.95rem;">
                </div>
                <div id="judgments-filter-panel" class="judgments-filter-panel" style="display:${this.filtersVisible ? 'flex' : 'none'};">
                    <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                        <select id="judgment-type-filter">
                            <option value="">${T.allJudgmentTypes}</option>
                            ${suggestions.judgmentTypes.map((item) => `<option value="${item}">${item}</option>`).join('')}
                        </select>
                        <button type="button" class="btn btn-secondary" id="btn-manage-judgment-types">
                            <ion-icon name="create-outline"></ion-icon>
                            ${T.editTypes}
                        </button>
                    </div>
                    <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                        <select id="judgment-classification-filter">
                            <option value="">${T.allClassifications}</option>
                            ${suggestions.judgmentClassifications.map((item) => `<option value="${item}">${item}</option>`).join('')}
                        </select>
                        <button type="button" class="btn btn-secondary" id="btn-manage-judgment-classifications">
                            <ion-icon name="create-outline"></ion-icon>
                            ${T.editClassifications}
                        </button>
                    </div>
                </div>
                <span id="judgments-count-label" style="color:var(--text-muted); font-size:0.85rem; white-space:nowrap;"></span>
            </div>

            <div class="page-body" style="padding:0 28px 20px; margin-top:16px;">
                <div id="judgments-grid-container"></div>
                <div class="pagination-shell">
                    <span id="page-info" class="pagination-info">${T.page} 1</span>
                    <div class="pagination-controls" id="judgments-pagination"></div>
                </div>
            </div>

            <div id="judgments-col-menu" class="glass-panel table-pref-menu" style="display:none; position:absolute; top:140px; right:32px; min-width:320px; z-index:110;"></div>
        `;

        this.container.querySelector('#judgment-search').value = this.filters.query;
        this.container.querySelector('#judgment-type-filter').value = this.filters.type;
        this.container.querySelector('#judgment-classification-filter').value = this.filters.classification;

        this.renderGrid();
        this.updateCounters();
        this.setupEvents();
    }

    buildColumns() {
        const suggestions = this.getSuggestions();
        const map = {
            date: { field: 'date', label: T.date, editable: true, editor: { type: 'date' } },
            caseNumberFormatted: { field: 'caseNumberFormatted', label: T.caseYear, editable: false },
            court: { field: 'court', label: T.court, editable: false },
            subject: { field: 'subject', label: T.subject, editable: false },
            litigants: { field: 'litigants', label: T.litigants, editable: false },
            plaintiff: { field: 'plaintiff', label: T.plaintiff, editable: false },
            defendant: { field: 'defendant', label: T.defendant, editable: false },
            type: {
                field: 'type',
                label: T.type,
                editable: true,
                editor: { type: 'datalist', options: suggestions.judgmentTypes }
            },
            content: {
                field: 'content',
                label: T.content,
                editable: true,
                editor: { type: 'datalist', options: suggestions.judgmentBriefs }
            },
            classification: {
                field: 'classification',
                label: T.classification,
                editable: true,
                editor: { type: 'select', options: suggestions.judgmentClassifications }
            }
        };

        return getOrderedColumns(JUDGMENT_COLUMN_DEFS, this.tablePrefs)
            .filter((column) => this.tablePrefs.visibility[column.key] !== false)
            .map((column) => map[column.key])
            .filter(Boolean);
    }

    renderGrid() {
        const gridContainer = this.container.querySelector('#judgments-grid-container');
        const columns = this.buildColumns();
        const pageJudgments = this.getCurrentPageData();

        this.grid = new EditableGrid(gridContainer, columns, pageJudgments, this.handleUpdateJudgment.bind(this), {
            actions: { view: true, edit: true, date: true },
            dateActionLabel: T.editDate,
            onView: (row) => {
                document.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'case-details', id: row.caseId } }));
            },
            onRowClick: (row) => {
                document.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'case-details', id: row.caseId } }));
            },
            emptyText: T.empty
        });
        this.grid.render();

        const totalPages = Math.max(1, Math.ceil(this.filteredJudgments.length / this.pageSize));
        renderPagination(this.container.querySelector('#judgments-pagination'), {
            currentPage: this.currentPage,
            totalPages,
            onPageChange: (page) => {
                this.currentPage = page;
                this.renderGrid();
                this.updateCounters();
            }
        });
    }

    updateCounters() {
        const totalPages = Math.max(1, Math.ceil(this.filteredJudgments.length / this.pageSize));
        const pageInfo = this.container.querySelector('#page-info');
        const label = this.container.querySelector('#judgments-count-label');

        if (pageInfo) {
            pageInfo.textContent = `${T.page} ${this.currentPage} ${T.pageOf} ${totalPages}`;
        }

        if (label) {
            label.textContent = `${this.filteredJudgments.length} ${T.countPattern} ${this.judgments.length}`;
        }
    }

    setupColumnMenu() {
        const button = this.container.querySelector('#btn-judgments-columns');
        const menu = this.container.querySelector('#judgments-col-menu');
        if (!button || !menu) return;

        const rerender = (prefs) => {
            this.tablePrefs = prefs;
            saveTablePreferences('SLA_V2_Judgments_TablePrefs', prefs);
            renderTablePreferencesMenu(menu, JUDGMENT_COLUMN_DEFS, this.tablePrefs, rerender);
            menu.style.display = 'block';
            this.renderGrid();
        };

        renderTablePreferencesMenu(menu, JUDGMENT_COLUMN_DEFS, this.tablePrefs, rerender);

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

    manageOptionList(settingKey, title, values, activeValueKey) {
        const settings = this.app.storage.loadSettings() || {};

        openOptionListModal({
            title,
            description: T.modalDescription,
            values,
            placeholder: T.modalPlaceholder,
            saveLabel: T.saveChanges,
            onSave: (savedValues) => {
                settings[settingKey] = savedValues;
                this.app.storage.saveSettings(settings);

                const activeValue = this.filters[activeValueKey];
                if (activeValue && !savedValues.includes(activeValue) && !this.judgments.some((item) => item[activeValueKey] === activeValue)) {
                    this.filters[activeValueKey] = '';
                }

                this.render();
                this.applyFilters();
            }
        });
    }

    setupEvents() {
        this.setupColumnMenu();

        this.container.querySelector('#judgment-search')?.addEventListener('input', (event) => {
            this.filters.query = event.target.value;
            this.applyFilters();
        });

        this.container.querySelector('#judgment-type-filter')?.addEventListener('change', (event) => {
            this.filters.type = event.target.value;
            this.applyFilters();
        });

        this.container.querySelector('#judgment-classification-filter')?.addEventListener('change', (event) => {
            this.filters.classification = event.target.value;
            this.applyFilters();
        });

        this.container.querySelector('#btn-judgments-filter')?.addEventListener('click', () => {
            this.filtersVisible = !this.filtersVisible;
            const panel = this.container.querySelector('#judgments-filter-panel');
            if (panel) panel.style.display = this.filtersVisible ? 'flex' : 'none';
        });

        this.container.querySelector('#btn-manage-judgment-types')?.addEventListener('click', () => {
            this.manageOptionList('judgmentTypes', T.manageTypesTitle, this.getSuggestions().judgmentTypes, 'type');
        });

        this.container.querySelector('#btn-manage-judgment-classifications')?.addEventListener('click', () => {
            this.manageOptionList('judgmentClassifications', T.manageClassificationsTitle, this.getSuggestions().judgmentClassifications, 'classification');
        });

        this.container.querySelector('#btn-export-judgment-stats')?.addEventListener('click', () => this.exportStatistics());
    }

    exportStatistics() {
        const byClassification = {};
        const byType = {};

        this.filteredJudgments.forEach((judgment) => {
            const classification = judgment.classification || T.notClassified;
            const type = judgment.type || T.unspecified;
            byClassification[classification] = (byClassification[classification] || 0) + 1;
            byType[type] = (byType[type] || 0) + 1;
        });

        const lines = [
            [T.reportType, T.judgmentsStatistics],
            [T.totalJudgments, String(this.filteredJudgments.length)],
            [''],
            [T.classification, T.count],
            ...Object.entries(byClassification),
            [''],
            [T.type, T.count],
            ...Object.entries(byType),
            [''],
            [T.date, T.caseYear, T.type, T.classification, T.content],
            ...this.filteredJudgments.map((judgment) => [
                judgment.date || '',
                judgment.caseNumberFormatted || '',
                judgment.type || '',
                judgment.classification || '',
                (judgment.content || '').replace(/\r?\n/g, ' ')
            ])
        ];

        const csv = lines.map((row) => row.join(',')).join('\n');
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `judgments_statistics_${new Date().toISOString().split('T')[0]}.csv`;
        anchor.click();
        URL.revokeObjectURL(url);
    }

    handleUpdateJudgment(judgmentId, field, value) {
        let updated = false;
        let targetCase = null;
        let targetJudgment = null;

        for (const caseData of this.cases) {
            if (Array.isArray(caseData.judgments)) {
                const judgment = caseData.judgments.find((item) => item.id === judgmentId);
                if (judgment) {
                    judgment[field] = value;
                    updated = true;
                    targetCase = caseData;
                    targetJudgment = judgment;
                    break;
                }
            }

            if (!updated && judgmentId === `${caseData.id}_pseudo`) {
                if (!Array.isArray(caseData.judgments)) caseData.judgments = [];
                const newJudgment = {
                    id: crypto.randomUUID(),
                    date: caseData.lastSessionDate || '',
                    type: caseData.operationalStatus === T.pseudoReserved ? T.pseudoReserved : T.pseudoNotRecorded,
                    content: caseData.latestDecision || '',
                    classification: ''
                };
                newJudgment[field] = value;
                caseData.judgments.push(newJudgment);
                updated = true;
                targetCase = caseData;
                targetJudgment = newJudgment;
                break;
            }
        }

        if (!updated) return;

        const effects = this.app.engine.processEvent('judgment', targetJudgment, targetCase);
        effects.forEach((effect) => {
            if (effect.operationalStatus) targetCase.operationalStatus = effect.operationalStatus;
            if (effect.nextAction) targetCase.nextAction = effect.nextAction;
            if (effect.tasks) targetCase.tasks = [...(targetCase.tasks || []), ...effect.tasks];
            if (effect.reminders) targetCase.reminders = [...(targetCase.reminders || []), ...effect.reminders];
        });

        this.app.storage.saveCases(this.cases);
        this.refreshData();
        this.applyFilters();
        document.dispatchEvent(new CustomEvent('cases-updated'));
    }
}
