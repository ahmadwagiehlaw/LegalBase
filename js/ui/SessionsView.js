import { buildSessionsIndex, formatSessionDate, parseSessionDate } from '../core/SessionIndex.js';
import { collectCaseSuggestions } from './FieldOptions.js';
import { openOptionListModal } from './OptionListModal.js';
import { renderPagination } from './Pagination.js';
import { getOrderedColumns, loadTablePreferences, renderTablePreferencesMenu, saveTablePreferences } from './TablePreferences.js';

const T = {
    roll: '\u0627\u0644\u0631\u0648\u0644',
    caseYear: '\u0631\u0642\u0645 \u0627\u0644\u0637\u0639\u0646 / \u0627\u0644\u0633\u0646\u0629',
    subject: '\u0627\u0644\u0645\u0648\u0636\u0648\u0639',
    plaintiff: '\u0627\u0644\u0645\u062f\u0639\u064a / \u0627\u0644\u0637\u0627\u0639\u0646',
    defendant: '\u0627\u0644\u0645\u062f\u0639\u0649 \u0639\u0644\u064a\u0647 / \u0627\u0644\u0645\u0637\u0639\u0648\u0646 \u0636\u062f\u0647',
    prevSession: '\u0627\u0644\u062c\u0644\u0633\u0629 \u0627\u0644\u0633\u0627\u0628\u0642\u0629',
    lastSession: '\u0622\u062e\u0631 \u062c\u0644\u0633\u0629',
    decision: '\u0627\u0644\u0642\u0631\u0627\u0631 / \u0645\u0627 \u062a\u0645',
    type: '\u0646\u0648\u0639 \u0627\u0644\u062c\u0644\u0633\u0629',
    court: '\u0627\u0644\u0645\u062d\u0643\u0645\u0629',
    actions: '\u0625\u062c\u0631\u0627\u0621\u0627\u062a',
    pageTitle: '\u0623\u062c\u0646\u062f\u0629 \u0627\u0644\u062c\u0644\u0633\u0627\u062a (\u0627\u0644\u0631\u0648\u0644)',
    pageSubtitle: '\u0643\u0627\u0641\u0629 \u062c\u0644\u0633\u0627\u062a \u0627\u0644\u0645\u062d\u0627\u0643\u0645 \u0627\u0644\u0642\u0627\u062f\u0645\u0629 \u0648\u0627\u0644\u0633\u0627\u0628\u0642\u0629 \u0644\u0644\u0645\u0644\u0641\u0627\u062a \u0627\u0644\u0645\u0645\u062b\u0644\u0629',
    columns: '\u0623\u0639\u0645\u062f\u0629 \u0627\u0644\u062c\u062f\u0648\u0644',
    print: '\u0637\u0628\u0627\u0639\u0629 \u0627\u0644\u0631\u0648\u0644',
    searchPlaceholder: '\u0627\u0628\u062d\u062b \u0641\u064a \u0631\u0642\u0645 \u0627\u0644\u0637\u0639\u0646 \u0623\u0648 \u0627\u0644\u0645\u0648\u0636\u0648\u0639 \u0623\u0648 \u0627\u0644\u062e\u0635\u0648\u0645 \u0623\u0648 \u0627\u0644\u0642\u0631\u0627\u0631...',
    allTypes: '\u0643\u0644 \u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u062c\u0644\u0633\u0627\u062a',
    manageList: '\u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u0642\u0627\u0626\u0645\u0629',
    manageTypeTitle: '\u0625\u062f\u0627\u0631\u0629 \u0623\u0646\u0648\u0627\u0639 \u0627\u0644\u062c\u0644\u0633\u0627\u062a',
    manageTypeDescription: '\u0623\u0636\u0641 \u0623\u0648 \u0639\u062f\u0644 \u0623\u0648 \u0627\u062d\u0630\u0641 \u0627\u0644\u062e\u064a\u0627\u0631\u0627\u062a \u0627\u0644\u0645\u0642\u062a\u0631\u062d\u0629 \u0644\u0641\u0644\u062a\u0631 \u0646\u0648\u0639 \u0627\u0644\u062c\u0644\u0633\u0629 \u0648\u0627\u0644\u062a\u062d\u0631\u064a\u0631 \u0627\u0644\u0633\u0631\u064a\u0639.',
    manageTypePlaceholder: '\u0645\u062b\u0627\u0644: \u0641\u062d\u0635',
    saveList: '\u062d\u0641\u0638 \u0627\u0644\u0642\u0627\u0626\u0645\u0629',
    all: '\u0627\u0644\u0643\u0644',
    exam: '\u0641\u062d\u0635',
    topic: '\u0645\u0648\u0636\u0648\u0639',
    upcomingWeek: '\u0642\u0627\u062f\u0645\u0629 (\u0623\u0633\u0628\u0648\u0639)',
    pastWeek: '\u0633\u0627\u0628\u0642\u0629 (\u0623\u0633\u0628\u0648\u0639)',
    customRange: '\u0646\u0637\u0627\u0642 \u0645\u062e\u0635\u0635',
    to: '\u0625\u0644\u0649',
    today: '\u0627\u0644\u064a\u0648\u0645',
    openCase: '\u0641\u062a\u062d \u0645\u0644\u0641 \u0627\u0644\u0642\u0636\u064a\u0629',
    noFilteredSessions: '\u0644\u0627 \u062a\u0648\u062c\u062f \u062c\u0644\u0633\u0627\u062a \u062a\u0637\u0627\u0628\u0642 \u0645\u0639\u0627\u064a\u064a\u0631 \u0627\u0644\u0628\u062d\u062b \u0623\u0648 \u0627\u0644\u0641\u0644\u062a\u0631 \u0627\u0644\u062d\u0627\u0644\u064a\u0629.',
    noSessions: '\u0644\u0627 \u062a\u0648\u062c\u062f \u062c\u0644\u0633\u0627\u062a \u0645\u0633\u062c\u0644\u0629 \u062d\u0627\u0644\u064a\u0627.',
    sessionsCount: '\u062c\u0644\u0633\u0629 \u0645\u0646',
    page: '\u0627\u0644\u0635\u0641\u062d\u0629',
    of: '\u0645\u0646',
    printTitle: '\u0631\u0648\u0644 \u0627\u0644\u062c\u0644\u0633\u0627\u062a',
    printHeader: '\u0631\u0648\u0644 \u0627\u0644\u062c\u0644\u0633\u0627\u062a -',
    sessionDate: '\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u062c\u0644\u0633\u0629',
    parties: '\u0627\u0644\u0623\u0637\u0631\u0627\u0641'
};

const SESSION_COLUMN_DEFS = [
    { key: 'roll', label: T.roll, visible: true },
    { key: 'case_year', label: T.caseYear, visible: true },
    { key: 'subject', label: T.subject, visible: false },
    { key: 'plaintiff', label: T.plaintiff, visible: true },
    { key: 'defendant', label: T.defendant, visible: true },
    { key: 'prevSession', label: T.prevSession, visible: true },
    { key: 'lastSession', label: T.lastSession, visible: true },
    { key: 'decision', label: T.decision, visible: true },
    { key: 'type', label: T.type, visible: true },
    { key: 'court', label: T.court, visible: false },
    { key: 'actions', label: T.actions, visible: true }
];

export class SessionsView {
    constructor(container, app, route = {}) {
        this.container = container;
        this.app = app;
        this.route = route;
        this.allSessions = [];
        this.filteredSessions = [];
        this.currentPage = 1;
        this.pageSize = 10;
        this.searchQuery = route.query || '';
        this.activeFilters = {
            type: '',
            dateRange: '',
            dateFrom: '',
            dateTo: ''
        };
        this.tablePrefs = loadTablePreferences('SLA_V2_Sessions_TablePrefs', SESSION_COLUMN_DEFS);
    }

    buildSessionsIndex() {
        return buildSessionsIndex(this.app.storage.loadCases() || [], this.app.storage.load('sessions') || []);
    }

    getSuggestions() {
        return collectCaseSuggestions(this.app.storage.loadCases() || [], this.app.storage.loadSettings() || {});
    }

    getSessionTypeOptions() {
        return this.getSuggestions().sessionTypes || [];
    }

    parseDate(value) {
        return parseSessionDate(value);
    }

    formatDate(value) {
        return formatSessionDate(value);
    }

    hasActiveFilters() {
        return Boolean(this.searchQuery.trim() || this.activeFilters.type || this.activeFilters.dateRange || this.activeFilters.dateFrom || this.activeFilters.dateTo);
    }

    applyFilters() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        const weekAhead = new Date(today);
        weekAhead.setDate(today.getDate() + 7);

        const query = this.searchQuery.toLowerCase().trim();
        const { type, dateRange, dateFrom, dateTo } = this.activeFilters;

        this.filteredSessions = this.allSessions.filter((session) => {
            const sessionDate = this.parseDate(session.date);

            if (query) {
                const matchesSearch =
                    String(session.caseNumber || '').toLowerCase().includes(query) ||
                    String(session.year || '').toLowerCase().includes(query) ||
                    String(session.subject || '').toLowerCase().includes(query) ||
                    String(session.court || '').toLowerCase().includes(query) ||
                    String(session.plaintiff || '').toLowerCase().includes(query) ||
                    String(session.defendant || '').toLowerCase().includes(query) ||
                    String(session.type || '').toLowerCase().includes(query) ||
                    String(session.decision || '').toLowerCase().includes(query) ||
                    String(session.notes || '').toLowerCase().includes(query) ||
                    String(session.date || '').toLowerCase().includes(query);

                if (!matchesSearch) return false;
            }

            if (type && String(session.type || '') !== String(type)) return false;

            if (dateRange === 'upcoming_week') {
                if (sessionDate < today || sessionDate > weekAhead) return false;
            } else if (dateRange === 'past_week') {
                if (sessionDate < weekAgo || sessionDate >= today) return false;
            } else if (dateRange === 'custom') {
                if (dateFrom) {
                    const from = new Date(dateFrom);
                    from.setHours(0, 0, 0, 0);
                    if (sessionDate < from) return false;
                }

                if (dateTo) {
                    const to = new Date(dateTo);
                    to.setHours(23, 59, 59, 999);
                    if (sessionDate > to) return false;
                }
            }

            return true;
        });

        this.currentPage = 1;
        this.renderTable();
        this.updateCountBadge();
        this.syncFilterUI();
    }

    getCurrentPageData() {
        const start = (this.currentPage - 1) * this.pageSize;
        return this.filteredSessions.slice(start, start + this.pageSize);
    }

    render() {
        this.allSessions = this.buildSessionsIndex();
        const typeOptions = this.getSessionTypeOptions();

        this.container.innerHTML = `
            <div class="page-header">
                <div class="header-titles">
                    <h2><ion-icon name="calendar-outline" style="vertical-align:middle; margin-left:8px;"></ion-icon> ${T.pageTitle}</h2>
                    <p>${T.pageSubtitle}</p>
                </div>
                <div class="header-actions" style="display:flex; gap:10px; flex-wrap:wrap;">
                    <button class="btn btn-secondary" id="btn-toggle-cols"><ion-icon name="options-outline"></ion-icon> ${T.columns}</button>
                    <button class="btn btn-primary" id="btn-print-roll"><ion-icon name="print-outline"></ion-icon> ${T.print}</button>
                </div>
            </div>

            <div style="padding: 12px 28px; display:flex; gap:10px; flex-wrap:wrap; align-items:center; border-bottom: 1px solid var(--glass-border);">
                <div style="position:relative; flex:1; min-width:240px;">
                    <ion-icon name="search-outline" style="position:absolute; right:12px; top:50%; transform:translateY(-50%); color:var(--text-muted);"></ion-icon>
                    <input type="text" id="sess-search" placeholder="${T.searchPlaceholder}" style="width:100%; padding:8px 36px 8px 12px; background:var(--surface); border:1px solid var(--glass-border); border-radius:8px; color:var(--text-main); outline:none; font-size:0.9rem;">
                </div>

                <div style="position:relative;">
                    <div id="col-toggle-menu" class="glass-panel table-pref-menu" style="display:none; position:absolute; top:110%; right:0; z-index:100; min-width:280px;"></div>
                </div>

                <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                    <select id="sess-type-filter" style="padding:8px 12px; background:var(--surface); border:1px solid var(--glass-border); border-radius:8px; color:var(--text-main); outline:none; font-size:0.9rem;">
                        <option value="">${T.allTypes}</option>
                        ${typeOptions.map((item) => `<option value="${item}">${item}</option>`).join('')}
                    </select>
                    <button class="btn btn-secondary" id="btn-manage-session-types" type="button" title="${T.manageTypeTitle}">
                        <ion-icon name="create-outline"></ion-icon>
                        ${T.manageList}
                    </button>
                </div>

                <div style="display:flex; gap:6px; flex-wrap:wrap;">
                    <button class="btn-quick-filter btn btn-secondary" data-filter-reset="true" id="qf-all">${T.all}</button>
                    <button class="btn-quick-filter btn btn-secondary" data-filter-type="type" data-value="فحص">${T.exam}</button>
                    <button class="btn-quick-filter btn btn-secondary" data-filter-type="type" data-value="موضوع">${T.topic}</button>
                    <button class="btn-quick-filter btn btn-secondary" data-filter-type="date" data-value="upcoming_week">
                        <ion-icon name="arrow-forward-outline"></ion-icon> ${T.upcomingWeek}
                    </button>
                    <button class="btn-quick-filter btn btn-secondary" data-filter-type="date" data-value="past_week">
                        <ion-icon name="arrow-back-outline"></ion-icon> ${T.pastWeek}
                    </button>
                    <button class="btn-quick-filter btn btn-secondary" data-filter-type="date" data-value="custom">
                        <ion-icon name="calendar-outline"></ion-icon> ${T.customRange}
                    </button>
                </div>

                <div id="custom-date-range" style="display:none; gap:8px; align-items:center;">
                    <input type="date" id="date-from" style="padding:7px; background:var(--surface); border:1px solid var(--glass-border); border-radius:8px; color:var(--text-main); outline:none;">
                    <span style="color:var(--text-muted);">${T.to}</span>
                    <input type="date" id="date-to" style="padding:7px; background:var(--surface); border:1px solid var(--glass-border); border-radius:8px; color:var(--text-main); outline:none;">
                </div>

                <span id="sess-count" style="color:var(--text-muted); font-size:0.85rem; white-space:nowrap;"></span>
            </div>

            <div class="page-body" style="padding:0 28px 20px; margin-top:16px;">
                <div id="sessions-table-container"></div>
                <div class="pagination-shell">
                    <span id="page-info" class="pagination-info">${T.page} 1</span>
                    <div class="pagination-controls" id="sessions-pagination"></div>
                </div>
            </div>
        `;

        const searchInput = this.container.querySelector('#sess-search');
        if (searchInput) searchInput.value = this.searchQuery;

        const dateFromInput = this.container.querySelector('#date-from');
        const dateToInput = this.container.querySelector('#date-to');
        if (dateFromInput) dateFromInput.value = this.activeFilters.dateFrom || '';
        if (dateToInput) dateToInput.value = this.activeFilters.dateTo || '';

        this.setupEvents();
        this.applyFilters();
    }

    syncFilterUI() {
        const typeFilter = this.container.querySelector('#sess-type-filter');
        if (typeFilter) typeFilter.value = this.activeFilters.type || '';

        const customRange = this.container.querySelector('#custom-date-range');
        if (customRange) {
            customRange.style.display = this.activeFilters.dateRange === 'custom' ? 'flex' : 'none';
        }

        this.container.querySelectorAll('.btn-quick-filter').forEach((button) => {
            const isReset = button.dataset.filterReset === 'true';
            const isTypeActive = button.dataset.filterType === 'type' && button.dataset.value === this.activeFilters.type;
            const isDateActive = button.dataset.filterType === 'date' && button.dataset.value === this.activeFilters.dateRange;
            const isResetActive = isReset && !this.hasActiveFilters();
            const isActive = isResetActive || isTypeActive || isDateActive;

            button.classList.toggle('btn-primary', isActive);
            button.classList.toggle('btn-secondary', !isActive);
        });
    }

    resetFilters() {
        this.activeFilters = { type: '', dateRange: '', dateFrom: '', dateTo: '' };
        const dateFromInput = this.container.querySelector('#date-from');
        const dateToInput = this.container.querySelector('#date-to');
        if (dateFromInput) dateFromInput.value = '';
        if (dateToInput) dateToInput.value = '';
        this.applyFilters();
    }

    toggleTypeFilter(value) {
        this.activeFilters.type = this.activeFilters.type === value ? '' : value;
        this.applyFilters();
    }

    toggleDateFilter(value) {
        const isSame = this.activeFilters.dateRange === value;
        this.activeFilters.dateRange = isSame ? '' : value;

        if (this.activeFilters.dateRange !== 'custom') {
            this.activeFilters.dateFrom = '';
            this.activeFilters.dateTo = '';
            const dateFromInput = this.container.querySelector('#date-from');
            const dateToInput = this.container.querySelector('#date-to');
            if (dateFromInput) dateFromInput.value = '';
            if (dateToInput) dateToInput.value = '';
        }

        this.applyFilters();
    }

    manageSessionTypeOptions() {
        const settings = this.app.storage.loadSettings() || {};

        openOptionListModal({
            title: T.manageTypeTitle,
            description: T.manageTypeDescription,
            values: this.getSessionTypeOptions(),
            placeholder: T.manageTypePlaceholder,
            saveLabel: T.saveList,
            onSave: (values) => {
                settings.sessionTypes = values;
                this.app.storage.saveSettings(settings);

                if (this.activeFilters.type && !values.includes(this.activeFilters.type) && !this.allSessions.some((session) => session.type === this.activeFilters.type)) {
                    this.activeFilters.type = '';
                }

                this.render();
            }
        });
    }

    renderCell(session, key, rowIndex) {
        const casesById = this.casesById || {};
        const caseData = casesById[session.caseId] || {};
        const prevSessionStr = caseData.previousSessionDate ? this.formatDate(caseData.previousSessionDate) : '-';

        const builders = {
            roll: () => rowIndex,
            case_year: () => `<strong style="color:var(--primary);">${session.caseNumber}</strong>${session.year ? ` / ${session.year}` : ''}`,
            subject: () => session.subject || caseData.subject || '-',
            plaintiff: () => session.plaintiff || '-',
            defendant: () => session.defendant || '-',
            prevSession: () => prevSessionStr,
            lastSession: () => {
                const sessionDate = this.parseDate(session.date);
                const now = new Date();
                const diffDays = Math.round((sessionDate - now) / (1000 * 60 * 60 * 24));
                const relative = !Number.isNaN(sessionDate.getTime()) && diffDays === 0
                    ? `<span class="badge-status status-success" style="font-size:0.72rem;">${T.today}</span>`
                    : '';
                return `<div style="font-weight:600; color:var(--text-main);">${this.formatDate(session.date)}</div>${relative}`;
            },
            decision: () => session.decision || '-',
            type: () => session.type ? `<span class="badge-status status-blue" style="font-size:0.82rem;">${session.type}</span>` : '-',
            court: () => session.court || '-',
            actions: () => `<button class="btn btn-icon btn-view-case" data-id="${session.caseId}" title="${T.openCase}" style="color:var(--primary);"><ion-icon name="eye-outline"></ion-icon></button>`
        };

        return builders[key] ? builders[key]() : '-';
    }

    renderTable() {
        const container = this.container.querySelector('#sessions-table-container');
        const pageSessions = this.getCurrentPageData();
        const startIndex = (this.currentPage - 1) * this.pageSize;

        if (pageSessions.length === 0) {
            container.innerHTML = `
                <div class="empty-state" style="min-height:200px;">
                    <ion-icon name="calendar-outline"></ion-icon>
                    <p>${this.hasActiveFilters() ? T.noFilteredSessions : T.noSessions}</p>
                </div>`;
            this.updatePaginationUI();
            return;
        }

        this.casesById = {};
        this.app.storage.loadCases().forEach((caseData) => {
            this.casesById[caseData.id] = caseData;
        });

        const orderedColumns = getOrderedColumns(SESSION_COLUMN_DEFS, this.tablePrefs);
        const visibleColumns = orderedColumns.filter((column) => this.tablePrefs.visibility[column.key] !== false);

        const rows = pageSessions.map((session, index) => `
            <tr class="session-row" data-case-id="${session.caseId}" style="cursor:pointer;">
                ${visibleColumns.map((column) => `
                    <td data-col="${column.key}" ${['subject', 'plaintiff', 'defendant', 'decision'].includes(column.key) ? 'style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"' : ''}>
                        ${this.renderCell(session, column.key, startIndex + index + 1)}
                    </td>
                `).join('')}
            </tr>
        `).join('');

        container.innerHTML = `
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            ${visibleColumns.map((column) => `<th data-col="${column.key}">${column.label}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>`;

        this.bindTableEvents();
        this.updatePaginationUI();
    }

    bindTableEvents() {
        this.container.querySelectorAll('.session-row').forEach((row) => {
            row.addEventListener('click', (event) => {
                if (event.target.closest('.btn-icon')) return;
                document.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'case-details', id: row.dataset.caseId } }));
            });
        });

        this.container.querySelectorAll('.btn-view-case').forEach((button) => {
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                document.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'case-details', id: button.dataset.id } }));
            });
        });
    }

    updateCountBadge() {
        const label = this.container.querySelector('#sess-count');
        if (label) {
            label.textContent = `${this.filteredSessions.length} ${T.sessionsCount} ${this.allSessions.length}`;
        }
    }

    updatePaginationUI() {
        const totalPages = Math.max(1, Math.ceil(this.filteredSessions.length / this.pageSize));
        const info = this.container.querySelector('#page-info');
        if (info) info.textContent = `${T.page} ${this.currentPage} ${T.of} ${totalPages}`;

        renderPagination(this.container.querySelector('#sessions-pagination'), {
            currentPage: this.currentPage,
            totalPages,
            onPageChange: (page) => {
                this.currentPage = page;
                this.renderTable();
            }
        });
    }

    setupColumnMenu() {
        const button = this.container.querySelector('#btn-toggle-cols');
        const menu = this.container.querySelector('#col-toggle-menu');
        if (!button || !menu) return;

        const rerender = (prefs) => {
            this.tablePrefs = prefs;
            saveTablePreferences('SLA_V2_Sessions_TablePrefs', prefs);
            renderTablePreferencesMenu(menu, SESSION_COLUMN_DEFS, this.tablePrefs, rerender);
            menu.style.display = 'block';
            this.renderTable();
        };

        renderTablePreferencesMenu(menu, SESSION_COLUMN_DEFS, this.tablePrefs, rerender);

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
        this.container.querySelector('#btn-print-roll')?.addEventListener('click', () => this.printRoll());
        this.container.querySelector('#btn-manage-session-types')?.addEventListener('click', () => this.manageSessionTypeOptions());
        this.setupColumnMenu();

        const searchInput = this.container.querySelector('#sess-search');
        if (searchInput) {
            let debounceTimer;
            searchInput.addEventListener('input', (event) => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    this.searchQuery = event.target.value;
                    this.applyFilters();
                }, 140);
            });
        }

        const typeFilter = this.container.querySelector('#sess-type-filter');
        typeFilter?.addEventListener('change', (event) => {
            this.activeFilters.type = event.target.value;
            this.applyFilters();
        });

        this.container.querySelectorAll('.btn-quick-filter').forEach((button) => {
            button.addEventListener('click', () => {
                if (button.dataset.filterReset === 'true') {
                    this.resetFilters();
                    return;
                }

                if (button.dataset.filterType === 'type') {
                    this.toggleTypeFilter(button.dataset.value || '');
                    return;
                }

                if (button.dataset.filterType === 'date') {
                    this.toggleDateFilter(button.dataset.value || '');
                }
            });
        });

        this.container.querySelector('#date-from')?.addEventListener('change', (event) => {
            this.activeFilters.dateFrom = event.target.value;
            this.activeFilters.dateRange = 'custom';
            this.applyFilters();
        });

        this.container.querySelector('#date-to')?.addEventListener('change', (event) => {
            this.activeFilters.dateTo = event.target.value;
            this.activeFilters.dateRange = 'custom';
            this.applyFilters();
        });
    }

    printRoll() {
        const rows = this.filteredSessions.map((session) => `
            <tr>
                <td>${this.formatDate(session.date)}</td>
                <td>${session.caseNumber} / ${session.year || '-'}</td>
                <td>${session.court || '-'}</td>
                <td>${session.subject || '-'}</td>
                <td>${[session.plaintiff, session.defendant].filter(Boolean).join(' / ')}</td>
                <td>${session.type || '-'}</td>
                <td>${session.decision || '-'}</td>
            </tr>
        `).join('');

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html dir="rtl">
                <head>
                    <title>${T.printTitle}</title>
                    <style>
                        body { font-family: 'Cairo', sans-serif; font-size: 13px; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid #ccc; padding: 8px; text-align: right; }
                        th { background: #f1f5f9; font-weight: 700; }
                    </style>
                </head>
                <body>
                    <h2 style="text-align:center;">${T.printHeader} ${new Date().toLocaleDateString('ar-EG')}</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>${T.sessionDate}</th>
                                <th>${T.caseYear}</th>
                                <th>${T.court}</th>
                                <th>${T.subject}</th>
                                <th>${T.parties}</th>
                                <th>${T.type}</th>
                                <th>${T.decision}</th>
                            </tr>
                        </thead>
                        <tbody>${rows}</tbody>
                    </table>
                    <script>window.print();</script>
                </body>
            </html>
        `);
        printWindow.document.close();
    }
}
