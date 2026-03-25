import { db } from './config.js';
import {
    collection, getDocs, doc, updateDoc, addDoc,
    query, orderBy, where, serverTimestamp, getDoc
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { UI } from './ui.js';
import { AppealsStore } from './appeals-store.js';

const IMGBB_KEY = 'd6bb128f7d802a51d338580c22c7f769';

export const AgendaModule = {
    appeals: [],
    currentView: 'agenda', // 'agenda' | 'detail'
    selectedAppealId: null,
    currentSessionMode: 'next',
    currentAgendaTab: 'next',
    visibleRowsCount: 10,
    selectedIds: new Set(),
    currentRows: [],
    currentFilteredRows: [],
    labels: {
        agendaDaily: '\u0627\u0644\u0623\u062c\u0646\u062f\u0629 \u0627\u0644\u064a\u0648\u0645\u064a\u0629',
        appealDetails: '\u062a\u0641\u0627\u0635\u064a\u0644 \u0627\u0644\u0637\u0639\u0646',
        bulkRollover: '\u062a\u0631\u062d\u064a\u0644 \u062c\u0645\u0627\u0639\u064a',
        manualLog: '\u0627\u0644\u0633\u062c\u0644 \u0627\u0644\u064a\u062f\u0648\u064a',
        latest: '\u0627\u0644\u0623\u062d\u062f\u062b',
        lastSession: '\u0622\u062e\u0631 \u062c\u0644\u0633\u0629',
        currentMonth: '\u062c\u0644\u0633\u0627\u062a \u0627\u0644\u0634\u0647\u0631',
        previousMonth: '\u0627\u0644\u0634\u0647\u0631 \u0627\u0644\u0633\u0627\u0628\u0642',
        results: '\u0627\u0644\u0646\u062a\u0627\u0626\u062c',
        selected: '\u0627\u0644\u0645\u062d\u062f\u062f',
        judgmentSessions: '\u062c\u0644\u0633\u0627\u062a \u062d\u0643\u0645',
        prepReady: '\u062c\u0627\u0647\u0632\u0629 \u0628\u062a\u062d\u0636\u064a\u0631',
        noData: '\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0645\u0637\u0627\u0628\u0642\u0629',
        selectVisible: '\u062a\u062d\u062f\u064a\u062f \u0627\u0644\u0645\u0639\u0631\u0648\u0636',
        clearSelection: '\u0625\u0644\u063a\u0627\u0621 \u0627\u0644\u062a\u062d\u062f\u064a\u062f',
        showMore: '\u0625\u0638\u0647\u0627\u0631 \u0627\u0644\u0645\u0632\u064a\u062f',
        roll: '\u0627\u0644\u0631\u0648\u0644',
        caseNumber: '\u0631\u0642\u0645 \u0627\u0644\u0642\u0636\u064a\u0629',
        year: '\u0627\u0644\u0633\u0646\u0629',
        plaintiff: '\u0627\u0644\u0645\u062f\u0639\u064a',
        defendant: '\u0627\u0644\u0645\u062f\u0639\u0649 \u0639\u0644\u064a\u0647',
        prevSession: '\u0627\u0644\u062c\u0644\u0633\u0629 \u0627\u0644\u0633\u0627\u0628\u0642\u0629',
        latestSession: '\u0622\u062e\u0631 \u062c\u0644\u0633\u0629',
        decision: '\u0627\u0644\u0642\u0631\u0627\u0631',
        sessionType: '\u0646\u0648\u0639 \u0627\u0644\u062c\u0644\u0633\u0629',
        status: '\u0627\u0644\u062d\u0627\u0644\u0629',
        subject: '\u0627\u0644\u0645\u0648\u0636\u0648\u0639',
        indicators: '\u0627\u0644\u0645\u0624\u0634\u0631\u0627\u062a',
        action: '\u0625\u062c\u0631\u0627\u0621',
        rollover: '\u062a\u0631\u062d\u064a\u0644',
        sessionPrep: '\u062a\u062d\u0636\u064a\u0631 \u0627\u0644\u062c\u0644\u0633\u0629',
        courtMinutes: '\u0645\u062d\u0636\u0631 \u0627\u0644\u0645\u062d\u0643\u0645\u0629',
        inspectionRequests: '\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0627\u0637\u0644\u0627\u0639'
    },

    init: async () => {
        AgendaModule.renderBaseUI();
        AgendaModule.applyStaticLabels();
        await AgendaModule.loadAppeals();
        AgendaModule.renderAgendaView();
        AgendaModule.bindBaseEvents();
    },

    // ============================================================
    // DATA LOADING
    // ============================================================
    loadAppeals: async () => {
        try {
            const cachedAppeals = AppealsStore.getAll();
            if (cachedAppeals.length > 0) {
                AgendaModule.appeals = cachedAppeals;
            }

            AgendaModule.appeals = await AppealsStore.load({ allowStale: true });
        } catch(e) {
            try {
                // Fallback without orderBy (if index missing)
                const snap2 = await getDocs(collection(db, "appeals"));
                AgendaModule.appeals = [];
                snap2.forEach(d => AgendaModule.appeals.push({ id: d.id, ...d.data() }));
                AgendaModule.appeals.sort((a, b) => (a.nextSessionDate || '').localeCompare(b.nextSessionDate || ''));
            } catch(e2) { console.error(e2); }
        }
    },

    parseDateValue: (value) => {
        if (!value) return null;
        if (typeof value.toDate === 'function') return value.toDate();
        if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
        if (typeof value === 'number' && value > 20000 && value < 60000) {
            const excelEpoch = new Date(Date.UTC(1899, 11, 30));
            const parsed = new Date(excelEpoch.getTime() + (value * 86400000));
            return Number.isNaN(parsed.getTime()) ? null : parsed;
        }

        const raw = String(value).trim();
        if (!raw || raw === '---') return null;
        if (/^\d{4,5}$/.test(raw)) {
            const excelEpoch = new Date(Date.UTC(1899, 11, 30));
            const parsed = new Date(excelEpoch.getTime() + (Number(raw) * 86400000));
            return Number.isNaN(parsed.getTime()) ? null : parsed;
        }

        const isoMatch = raw.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
        if (isoMatch) {
            const [, year, month, day] = isoMatch;
            const parsed = new Date(Number(year), Number(month) - 1, Number(day));
            return Number.isNaN(parsed.getTime()) ? null : parsed;
        }

        const slashMatch = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
        if (slashMatch) {
            let [, first, second, year] = slashMatch;
            if (year.length === 2) year = `20${year}`;
            const parsed = new Date(Number(year), Number(second) - 1, Number(first));
            return Number.isNaN(parsed.getTime()) ? null : parsed;
        }

        const parsed = new Date(raw);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    },

    normalizeDateValue: (value) => {
        const parsed = AgendaModule.parseDateValue(value);
        if (!parsed) return '';
        const year = parsed.getFullYear();
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const day = String(parsed.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    formatDateForDisplay: (value) => {
        const parsed = AgendaModule.parseDateValue(value);
        if (!parsed) return '---';
        const day = String(parsed.getDate()).padStart(2, '0');
        const month = String(parsed.getMonth() + 1).padStart(2, '0');
        const year = parsed.getFullYear();
        return `${day}/${month}/${year}`;
    },

    getLatestSessionDate: (appeal) => {
        const lastSession = AgendaModule.normalizeDateValue(appeal.lastSessionDate);
        const currentSession = AgendaModule.normalizeDateValue(appeal.nextSessionDate);
        return [lastSession, currentSession].filter(Boolean).sort().pop() || '';
    },

    getStatusBadgeClass: (status) => {
        if (status === 'متداول') return 'badge-success';
        if (status === 'محجوز للحكم') return 'badge-warning';
        return 'badge-danger';
    },

    getMetaIndicators: (appeal) => {
        const items = [
            { icon: 'fa-list-check', title: 'تحضير الجلسة', active: !!appeal.sessionPrep },
            { icon: 'fa-file-lines', title: 'محضر المحكمة', active: !!appeal.courtMinutes },
            { icon: 'fa-eye', title: 'طلبات الاطلاع', active: !!appeal.inspectionRequests }
        ];

        return items.map((item) => `
            <span title="${item.title}" style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:999px;background:${item.active ? 'rgba(16,185,129,0.14)' : 'rgba(148,163,184,0.16)'};color:${item.active ? 'var(--success-color)' : 'var(--text-muted)'};border:1px solid ${item.active ? 'rgba(16,185,129,0.25)' : 'var(--border-color)'};">
                <i class="fas ${item.icon}" style="font-size:0.75rem;"></i>
            </span>
        `).join('');
    },

    getCurrentMonthKey: () => new Date().toISOString().slice(0, 7),

    getPreviousMonthKey: () => {
        const now = new Date();
        now.setMonth(now.getMonth() - 1);
        return now.toISOString().slice(0, 7);
    },

    applyStaticLabels: () => {
        const setHtml = (id, html) => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = html;
        };
        const setText = (selector, text) => {
            document.querySelectorAll(selector).forEach((el) => {
                el.textContent = text;
            });
        };

        setHtml('view-agenda-btn', `<i class="fas fa-list-alt"></i> ${AgendaModule.labels.agendaDaily}`);
        setHtml('view-detail-btn', `<i class="fas fa-search-plus"></i> ${AgendaModule.labels.appealDetails}`);
        setHtml('bulk-rollover-btn', `<i class="fas fa-layer-group"></i> ${AgendaModule.labels.bulkRollover}`);
        setHtml('manual-sessions-btn', `<i class="fas fa-calendar-check"></i> ${AgendaModule.labels.manualLog}`);

        const activeTabLabel = document.getElementById('agenda-active-tab-label');
        if (activeTabLabel) activeTabLabel.textContent = AgendaModule.labels.latest;

        const tabLabels = {
            next: AgendaModule.labels.latest,
            latest: AgendaModule.labels.latest,
            'last-session': AgendaModule.labels.lastSession,
            'current-month': AgendaModule.labels.currentMonth,
            'previous-month': AgendaModule.labels.previousMonth
        };

        document.querySelectorAll('.agenda-tab-btn').forEach((btn) => {
            btn.textContent = tabLabels[btn.dataset.tab] || btn.textContent;
        });

        const filterClear = document.getElementById('agenda-clear-filters');
        if (filterClear) filterClear.innerHTML = `<i class="fas fa-eraser"></i> ${AgendaModule.labels.clearSelection}`;

        setText('.modal-tab-btn[data-tab="attachments"]', '📎 مرفقات الطعن');
        setText('.modal-tab-btn[data-tab="history"]', '📋 السجل الكامل');
        setText('.modal-tab-btn[data-tab="rollover"]', `🔄 ${AgendaModule.labels.rollover} ${AgendaModule.labels.latestSession}`);
    },

    getTabRows: () => {
        const appeals = [...AgendaModule.appeals];
        const previousMonth = AgendaModule.getPreviousMonthKey();
        const currentMonth = AgendaModule.getCurrentMonthKey();

        switch (AgendaModule.currentAgendaTab) {
            case 'latest':
                return appeals
                    .filter((appeal) => !!AgendaModule.getLatestSessionDate(appeal))
                    .map((appeal) => ({ ...appeal, sessionDate: AgendaModule.getLatestSessionDate(appeal) }));
            case 'last-session':
                return appeals
                    .filter((appeal) => !!AgendaModule.normalizeDateValue(appeal.lastSessionDate))
                    .map((appeal) => ({ ...appeal, sessionDate: AgendaModule.normalizeDateValue(appeal.lastSessionDate) }));
            case 'current-month':
                return appeals
                    .filter((appeal) => AgendaModule.getLatestSessionDate(appeal).startsWith(currentMonth))
                    .map((appeal) => ({ ...appeal, sessionDate: AgendaModule.getLatestSessionDate(appeal) }));
            case 'previous-month':
                return appeals
                    .filter((appeal) => AgendaModule.getLatestSessionDate(appeal).startsWith(previousMonth))
                    .map((appeal) => ({ ...appeal, sessionDate: AgendaModule.getLatestSessionDate(appeal) }));
            case 'next':
            default:
                return appeals
                    .filter((appeal) => !!AgendaModule.normalizeDateValue(appeal.nextSessionDate))
                    .map((appeal) => ({ ...appeal, sessionDate: AgendaModule.normalizeDateValue(appeal.nextSessionDate) }));
        }
    },

    applyAgendaFiltersAndSort: (rows, searchText = '') => {
        const dateFilter = document.getElementById('agenda-filter-date')?.value || '';
        const statusFilter = document.getElementById('agenda-status-filter')?.value || '';
        const rollFilter = (document.getElementById('agenda-roll-filter')?.value || '').trim().toLowerCase();
        const subjectFilter = (document.getElementById('agenda-subject-filter')?.value || '').trim().toLowerCase();
        const sortBy = document.getElementById('agenda-sort-by')?.value || 'sessionDate';
        const sortDirection = document.getElementById('agenda-sort-direction')?.value || 'asc';
        const text = String(searchText || document.getElementById('agenda-filter-text')?.value || '').trim().toLowerCase();

        const filtered = rows.filter((row) => {
            const haystack = [
                row.appealNumber,
                row.year,
                row.roll,
                row.plaintiff,
                row.defendant,
                row.subject,
                row.status,
                row.court
            ].map((value) => String(value || '').toLowerCase()).join(' ');

            const matchesText = !text || haystack.includes(text);
            const matchesDate = !dateFilter || row.sessionDate === dateFilter || AgendaModule.normalizeDateValue(row.lastSessionDate) === dateFilter;
            const matchesStatus = !statusFilter || row.status === statusFilter;
            const matchesRoll = !rollFilter || String(row.roll || '').toLowerCase().includes(rollFilter);
            const matchesSubject = !subjectFilter || String(row.subject || '').toLowerCase().includes(subjectFilter);

            return matchesText && matchesDate && matchesStatus && matchesRoll && matchesSubject;
        });

        const direction = sortDirection === 'asc' ? 1 : -1;
        filtered.sort((a, b) => {
            if (sortBy === 'roll') {
                return String(a.roll || '').localeCompare(String(b.roll || ''), 'ar') * direction;
            }
            if (sortBy === 'appealNumber') {
                return String(a.appealNumber || '').localeCompare(String(b.appealNumber || ''), 'ar') * direction;
            }
            if (sortBy === 'status') {
                return String(a.status || '').localeCompare(String(b.status || ''), 'ar') * direction;
            }
            if (sortBy === 'latestSession') {
                return String(AgendaModule.getLatestSessionDate(a)).localeCompare(String(AgendaModule.getLatestSessionDate(b))) * direction;
            }
            return String(a.sessionDate || '').localeCompare(String(b.sessionDate || '')) * direction;
        });

        return filtered;
    },

    // ============================================================
    // BASE UI
    // ============================================================
    renderBaseUI: () => {
        const container = document.getElementById('content-container');
        if(!container) return;

        container.innerHTML = `
            <!-- View Toggle + Actions Bar -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:15px;">
                <div style="display:flex; gap:10px; align-items:center;">
                    <button id="view-agenda-btn" class="btn btn-primary" style="min-width:130px;">
                        <i class="fas fa-list-alt"></i> الأجندة اليومية
                    </button>
                    <button id="view-detail-btn" class="btn btn-secondary" style="min-width:130px;">
                        <i class="fas fa-search-plus"></i> تفاصيل الطعن
                    </button>
                </div>
                    <button id="manual-sessions-btn" class="btn btn-secondary" style="min-width:130px;">
                        <i class="fas fa-calendar-check"></i> السجل اليدوي
                    </button>
                    <button id="bulk-rollover-btn" class="btn" style="background:var(--nav-bg); color:white;">
                        <i class="fas fa-layer-group"></i> طھط±ط­ظٹظ„ ط¬ظ…ط§ط¹ظٹ
                    </button>
                </div>
                <div class="agenda-print-controls" style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                    <input type="text" id="agenda-print-title-input" placeholder="عنوان الطباعة..." style="padding:8px 12px; border-radius:8px; border:1px solid var(--accent-color); background:rgba(245,158,11,0.05); color:var(--text-primary); width:180px;" onkeyup="document.getElementById('agenda-print-title').textContent = this.value || 'تقرير أجندة الجلسات'">
                    <input type="date" id="agenda-filter-date" style="padding:8px 12px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-primary);" title="تصفية حسب تاريخ الجلسة">
                    <input type="text" id="agenda-filter-text" placeholder="بحث برقم الطعن أو اسم الخصم..." style="padding:8px 12px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-primary); font-family:var(--font-primary); width:240px;">
                    <button id="agenda-refresh-btn" class="btn btn-secondary">
                        <i class="fas fa-sync-alt"></i>
                    </button>
                    <button id="print-agenda-btn" class="btn btn-primary" onclick="window.print()">
                        <i class="fas fa-print"></i>
                    </button>
                </div>
            </div>

            <h2 id="agenda-print-title" class="print-only">تقرير أجندة الجلسات</h2>

            <div class="section-card" style="padding:18px; margin-bottom:20px;">
                <div class="section-header" style="align-items:flex-start; gap:15px; flex-wrap:wrap;">
                    <h3><i class="fas fa-calendar-alt"></i> أجندة الجلسات</h3>
                    <div id="agenda-active-tab-label" style="font-size:0.85rem; color:var(--text-muted); font-weight:700;">الجلسة القادمة</div>
                </div>
                <div style="margin-bottom:15px; padding:12px 14px; border-radius:10px; background:rgba(59,130,246,0.08); color:var(--text-muted); line-height:1.9;">
                    هذه الشاشة هي مساحة العمل اليومية للجلسات والترحيل والمتابعة. أما <strong>السجل اليدوي</strong> فهو سجل ثانوي للأرشفة أو لإدخال جلسة منفصلة فقط.
                </div>
                <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:15px;" id="agenda-tabs">
                    <button class="btn agenda-tab-btn btn-primary" data-tab="next">الجلسة القادمة</button>
                    <button class="btn agenda-tab-btn btn-secondary" data-tab="latest">الأحدث</button>
                    <button class="btn agenda-tab-btn btn-secondary" data-tab="last-session">آخر جلسة</button>
                    <button class="btn agenda-tab-btn btn-secondary" data-tab="current-month">جلسات الشهر</button>
                    <button class="btn agenda-tab-btn btn-secondary" data-tab="previous-month">الشهر السابق</button>
                </div>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:10px; margin-bottom:15px;" class="print-hide">
                    <select id="agenda-sort-by" class="form-control" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-primary);">
                        <option value="sessionDate">ترتيب حسب الجلسة</option>
                        <option value="latestSession">ترتيب حسب أحدث جلسة</option>
                        <option value="roll">ترتيب حسب الرول</option>
                        <option value="appealNumber">ترتيب حسب رقم القضية</option>
                        <option value="status">ترتيب حسب الحالة</option>
                    </select>
                    <select id="agenda-sort-direction" class="form-control" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-primary);">
                        <option value="asc">تصاعدي</option>
                        <option value="desc">تنازلي</option>
                    </select>
                    <input type="text" id="agenda-roll-filter" placeholder="فلتر بالرول" style="padding:10px 12px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-primary); font-family:var(--font-primary);">
                    <input type="text" id="agenda-subject-filter" placeholder="فلتر بالموضوع" style="padding:10px 12px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-primary); font-family:var(--font-primary);">
                    <select id="agenda-status-filter" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-primary);">
                        <option value="">كل الحالات</option>
                        <option value="متداول">متداول</option>
                        <option value="محجوز للحكم">محجوز للحكم</option>
                        <option value="منتهي">منتهي</option>
                    </select>
                    <button id="agenda-clear-filters" class="btn btn-secondary">
                        <i class="fas fa-eraser"></i> مسح الفلاتر
                    </button>
                </div>
                <div id="agenda-summary" style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:15px;"></div>
                <div id="agenda-view-container"></div>
            </div>

            <!-- Session Update Modal -->
            <div id="session-update-modal" class="modal-backdrop hidden" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:2000;display:flex;justify-content:center;align-items:center;">
                <div class="section-card" style="width:95%;max-width:680px;padding:30px;max-height:92vh;overflow-y:auto;border-top:4px solid var(--accent-color);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;border-bottom:1px solid var(--border-color);padding-bottom:15px;">
                        <h3 id="modal-appeal-title" style="color:var(--text-primary);margin:0;"></h3>
                        <button id="close-session-modal" class="icon-btn"><i class="fas fa-times"></i></button>
                    </div>

                    <!-- Tabs inside modal -->
                    <div style="display:flex;gap:5px;margin-bottom:20px;border-bottom:2px solid var(--border-color);padding-bottom:0;">
                        <button class="modal-tab-btn active" data-tab="rollover" style="padding:8px 16px;border:none;background:none;border-bottom:2px solid var(--accent-color);margin-bottom:-2px;font-weight:700;color:var(--accent-color);cursor:pointer;font-family:var(--font-primary);">🔄 ترحيل الجلسة</button>
                        <button class="modal-tab-btn" data-tab="attachments" style="padding:8px 16px;border:none;background:none;border-bottom:2px solid transparent;margin-bottom:-2px;color:var(--text-muted);cursor:pointer;font-family:var(--font-primary);">📎 مرفقات الطعن</button>
                        <button class="modal-tab-btn" data-tab="history" style="padding:8px 16px;border:none;background:none;border-bottom:2px solid transparent;margin-bottom:-2px;color:var(--text-muted);cursor:pointer;font-family:var(--font-primary);">📋 السجل الكامل</button>
                    </div>

                    <!-- Rollover Tab -->
                    <div id="tab-rollover">
                        <div style="background:var(--bg-color);border-radius:10px;padding:15px;margin-bottom:20px;">
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;text-align:center;">
                                <div style="padding:12px;background:var(--panel-bg);border-radius:8px;border:1px solid var(--border-color);">
                                    <div style="font-size:0.75rem;color:var(--text-muted);font-weight:600;margin-bottom:4px;">الجلسة السابقة</div>
                                    <div id="modal-prev-session" style="font-weight:700;color:var(--text-secondary);direction:ltr;">---</div>
                                </div>
                                <div style="padding:12px;background:var(--panel-bg);border-radius:8px;border:1px solid var(--border-color);">
                                    <div style="font-size:0.75rem;color:var(--text-muted);font-weight:600;margin-bottom:4px;">آخر جلسة</div>
                                    <div id="modal-last-session" style="font-weight:700;color:var(--accent-color);direction:ltr;">---</div>
                                </div>
                                <div style="padding:12px;background:var(--accent-color);border-radius:8px;">
                                    <div style="font-size:0.75rem;color:rgba(0,0,0,0.6);font-weight:600;margin-bottom:4px;">الجلسة القادمة</div>
                                    <div id="modal-next-session" style="font-weight:800;color:#000;direction:ltr;">---</div>
                                </div>
                            </div>
                        </div>

                        <div style="display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;margin-bottom:15px;">
                            <button id="copy-previous-row-btn" class="btn btn-secondary">
                                <i class="fas fa-copy"></i> نسخ من الصف السابق
                            </button>
                            <button id="session-meta-btn" class="btn btn-secondary">
                                <i class="fas fa-sliders-h"></i> بيانات الجلسة
                            </button>
                        </div>

                        <div class="form-grid" style="margin-bottom:20px;">
                            <div>
                                <label style="display:block;font-weight:700;font-size:0.85rem;margin-bottom:6px;color:var(--text-muted);">ما تم في الجلسة / القرار</label>
                                <input type="text" id="modal-decision" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-color);color:var(--text-primary);font-family:var(--font-primary);" placeholder="مثال: فحص - للحكم - إعلان - إحالة">
                            </div>
                            <div>
                                <label style="display:block;font-weight:700;font-size:0.85rem;margin-bottom:6px;color:var(--text-muted);">نوع الجلسة</label>
                                <select id="modal-session-type" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-color);color:var(--text-primary);font-family:var(--font-primary);">
                                    <option>فحص</option>
                                    <option>للحكم</option>
                                    <option>حكم</option>
                                    <option>إعلان</option>
                                    <option>إحالة</option>
                                    <option>مفوضين</option>
                                    <option>أخرى</option>
                                </select>
                            </div>
                        </div>

                        <div style="margin-bottom:20px;">
                            <label style="display:block;font-weight:700;font-size:0.85rem;margin-bottom:6px;color:var(--text-muted);">وقائع / ملاحظات الجلسة</label>
                            <textarea id="modal-facts" rows="3" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-color);color:var(--text-primary);font-family:var(--font-primary);resize:none;" placeholder="تفاصيل ما جرى في الجلسة..."></textarea>
                        </div>

                        <div style="background:var(--nav-bg);border-radius:10px;padding:15px;margin-bottom:20px;">
                            <label style="display:block;font-weight:800;font-size:0.9rem;margin-bottom:10px;color:var(--accent-color);">📅 الجلسة القادمة (بعد الترحيل)</label>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                                <div>
                                    <label style="display:block;font-size:0.8rem;color:var(--nav-text);margin-bottom:4px;">تاريخ الجلسة الجديدة</label>
                                    <input type="date" id="modal-new-next-session" style="width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:white;">
                                </div>
                                <div>
                                    <label style="display:block;font-size:0.8rem;color:var(--nav-text);margin-bottom:4px;">تحضير الجلسة الجديدة</label>
                                    <select id="modal-prep-status" style="width:100%;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:white;font-family:var(--font-primary);">
                                        <option value="">لا شأن</option>
                                        <option value="تحضير">تحضير الجلسة</option>
                                        <option value="مطلوب">مطلوب من...</option>
                                        <option value="تقرير مفوضين">تقرير مفوضين</option>
                                        <option value="تحضير حكم">تحضير حكم</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div style="display:flex;justify-content:flex-end;gap:10px;">
                            <button id="rollover-session-btn" class="btn btn-primary">
                                <i class="fas fa-forward"></i> ترحيل الجلسة وحفظ
                            </button>
                        </div>
                    </div>

                    <!-- Attachments Tab -->
                    <div id="tab-attachments" class="hidden">
                        <div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;">
                            <button id="attach-image-btn" class="btn btn-primary" style="font-size:0.85rem;">
                                <i class="fas fa-image"></i> رفع صورة (IMGBB)
                            </button>
                            <button id="attach-link-btn" class="btn" style="background:var(--bg-color);border:1px solid var(--border-color);color:var(--text-primary);font-size:0.85rem;">
                                <i class="fab fa-google-drive"></i> رابط Drive / OneDrive
                            </button>
                            <input type="file" id="imgbb-file-input" accept="image/*,application/pdf" style="display:none;">
                        </div>

                        <!-- Add link form (hidden until button clicked) -->
                        <div id="add-link-form" class="hidden" style="background:var(--bg-color);border-radius:10px;padding:15px;margin-bottom:15px;border:1px solid var(--border-color);">
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
                                <div>
                                    <label style="font-size:0.8rem;font-weight:700;display:block;margin-bottom:4px;">نوع المرفق</label>
                                    <select id="attach-type" style="width:100%;padding:9px;border-radius:8px;border:1px solid var(--border-color);background:var(--panel-bg);color:var(--text-primary);font-family:var(--font-primary);">
                                        <option>العريضة</option>
                                        <option>الحكم الابتدائي</option>
                                        <option>تقرير المفوضين</option>
                                        <option>مذكرة دفاع</option>
                                        <option>مذكرة شرحية</option>
                                        <option>قرار إداري</option>
                                        <option>ملف كامل مجمّع</option>
                                        <option>أخرى</option>
                                    </select>
                                </div>
                                <div>
                                    <label style="font-size:0.8rem;font-weight:700;display:block;margin-bottom:4px;">عنوان الملف</label>
                                    <input type="text" id="attach-title" placeholder="وصف مختصر..." style="width:100%;padding:9px;border-radius:8px;border:1px solid var(--border-color);background:var(--panel-bg);color:var(--text-primary);font-family:var(--font-primary);">
                                </div>
                            </div>
                            <div style="display:flex;gap:10px;">
                                <input type="url" id="attach-url" placeholder="https://drive.google.com/... أو رابط OneDrive..." style="flex:1;padding:9px;border-radius:8px;border:1px solid var(--border-color);background:var(--panel-bg);color:var(--text-primary);font-family:var(--font-primary);">
                                <button id="save-link-btn" class="btn btn-primary" style="font-size:0.85rem;">حفظ</button>
                            </div>
                        </div>

                        <!-- Upload Progress -->
                        <div id="upload-progress" class="hidden" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;margin-bottom:15px;display:flex;align-items:center;gap:10px;">
                            <i class="fas fa-spinner fa-spin" style="color:var(--success-color);"></i>
                            <span style="color:#166534;">جاري الرفع على IMGBB...</span>
                        </div>

                        <!-- Attachments List -->
                        <div id="attachments-list">
                            <div style="text-align:center;padding:30px;color:var(--text-muted);">
                                <i class="fas fa-spinner fa-spin"></i> جاري التحميل...
                            </div>
                        </div>
                    </div>

                    <!-- History Tab -->
                    <div id="tab-history" class="hidden">
                        <div id="session-history-container">
                            <div style="text-align:center;padding:30px;color:var(--text-muted);">
                                <i class="fas fa-spinner fa-spin"></i> جاري تحميل السجل...
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <div id="session-meta-modal" class="modal-backdrop hidden" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.55);z-index:2001;display:flex;justify-content:center;align-items:center;">
                <div class="section-card" style="width:95%;max-width:560px;padding:26px;border-top:4px solid var(--accent-color);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;border-bottom:1px solid var(--border-color);padding-bottom:12px;">
                        <h3 style="margin:0;">بيانات الجلسة المساعدة</h3>
                        <button id="close-session-meta-modal" class="icon-btn"><i class="fas fa-times"></i></button>
                    </div>
                    <div style="display:grid;gap:14px;">
                        <div>
                            <label style="display:block;font-weight:700;font-size:0.85rem;margin-bottom:6px;color:var(--text-muted);">تحضير الجلسة</label>
                            <input type="text" id="meta-session-prep" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-color);color:var(--text-primary);" placeholder="مثال: تجهيز حافظة">
                        </div>
                        <div>
                            <label style="display:block;font-weight:700;font-size:0.85rem;margin-bottom:6px;color:var(--text-muted);">محضر المحكمة</label>
                            <textarea id="meta-court-minutes" rows="3" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-color);color:var(--text-primary);resize:none;" placeholder="ملخص محضر المحكمة"></textarea>
                        </div>
                        <div>
                            <label style="display:block;font-weight:700;font-size:0.85rem;margin-bottom:6px;color:var(--text-muted);">طلبات الاطلاع</label>
                            <textarea id="meta-inspection-requests" rows="3" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-color);color:var(--text-primary);resize:none;" placeholder="طلبات الاطلاع"></textarea>
                        </div>
                    </div>
                    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px;">
                        <button id="save-session-meta-btn" class="btn btn-primary">
                            <i class="fas fa-save"></i> حفظ البيانات
                        </button>
                    </div>
                </div>
            </div>

            <div id="bulk-rollover-modal" class="modal-backdrop hidden" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.55);z-index:2001;display:flex;justify-content:center;align-items:center;">
                <div class="section-card" style="width:95%;max-width:620px;padding:26px;border-top:4px solid var(--accent-color);">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;border-bottom:1px solid var(--border-color);padding-bottom:12px;">
                        <h3 style="margin:0;">الترحيل الجماعي</h3>
                        <button id="close-bulk-rollover-modal" class="icon-btn"><i class="fas fa-times"></i></button>
                    </div>
                    <div id="bulk-rollover-count" style="margin-bottom:14px;color:var(--text-secondary);font-weight:700;"></div>
                    <div class="form-grid" style="margin-bottom:12px;">
                        <div>
                            <label style="display:block;font-weight:700;font-size:0.85rem;margin-bottom:6px;color:var(--text-muted);">التاريخ الجديد</label>
                            <input type="date" id="bulk-new-next-session" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-color);color:var(--text-primary);">
                        </div>
                        <div>
                            <label style="display:block;font-weight:700;font-size:0.85rem;margin-bottom:6px;color:var(--text-muted);">نوع الجلسة</label>
                            <select id="bulk-session-type" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-color);color:var(--text-primary);">
                                <option>فحص</option>
                                <option>للحكم</option>
                                <option>حكم</option>
                                <option>إعلان</option>
                                <option>إحالة</option>
                                <option>موضوع</option>
                                <option>أخرى</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-grid" style="margin-bottom:12px;">
                        <div>
                            <label style="display:block;font-weight:700;font-size:0.85rem;margin-bottom:6px;color:var(--text-muted);">القرار</label>
                            <input type="text" id="bulk-session-decision" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-color);color:var(--text-primary);">
                        </div>
                        <div>
                            <label style="display:block;font-weight:700;font-size:0.85rem;margin-bottom:6px;color:var(--text-muted);">تحضير الجلسة</label>
                            <input type="text" id="bulk-session-prep" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-color);color:var(--text-primary);">
                        </div>
                    </div>
                    <div>
                        <label style="display:block;font-weight:700;font-size:0.85rem;margin-bottom:6px;color:var(--text-muted);">الملاحظات</label>
                        <textarea id="bulk-session-facts" rows="3" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-color);color:var(--text-primary);resize:none;"></textarea>
                    </div>
                    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px;">
                        <button id="confirm-bulk-rollover-btn" class="btn btn-primary">
                            <i class="fas fa-check"></i> تنفيذ الترحيل
                        </button>
                    </div>
                </div>
            </div>
        `;
    },

    // ============================================================
    // AGENDA VIEW (grouped by session date)
    // ============================================================
    renderAgendaView: (filter = '') => {
        const container = document.getElementById('agenda-view-container');
        if (!container) return;

        const rowsModern = AgendaModule.applyAgendaFiltersAndSort(AgendaModule.getTabRows(), filter);
        AgendaModule.currentFilteredRows = rowsModern;
        AgendaModule.currentRows = rowsModern.slice(0, AgendaModule.visibleRowsCount);

        const modernSummary = document.getElementById('agenda-summary');
        if (modernSummary) {
            const selectedCount = rowsModern.filter((row) => AgendaModule.selectedIds.has(row.id)).length;
            const judgmentCount = rowsModern.filter((row) => /حكم|ظ­ظƒظ…/u.test(String(row.sessionType || ''))).length;
            const prepCount = rowsModern.filter((row) => !!row.sessionPrep).length;
            modernSummary.innerHTML =
                '<div class="badge badge-info" style="padding:10px 14px;">' + AgendaModule.labels.results + ': ' + rowsModern.length + '</div>' +
                '<div class="badge badge-warning" style="padding:10px 14px;">' + AgendaModule.labels.selected + ': ' + selectedCount + '</div>' +
                '<div class="badge badge-success" style="padding:10px 14px;">' + AgendaModule.labels.judgmentSessions + ': ' + judgmentCount + '</div>' +
                '<div class="badge badge-info" style="padding:10px 14px;">' + AgendaModule.labels.prepReady + ': ' + prepCount + '</div>';
        }

        if (rowsModern.length === 0) {
            container.innerHTML =
                '<div class="section-card" style="text-align:center;padding:60px;color:var(--text-muted);">' +
                    '<i class="fas fa-calendar-times" style="font-size:3rem;margin-bottom:15px;display:block;opacity:0.4;"></i>' +
                    '<p>' + AgendaModule.labels.noData + '</p>' +
                '</div>';
            return;
        }

        container.innerHTML =
            '<div class="agenda-print-controls print-hide" style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:12px;">' +
                '<label style="display:flex;align-items:center;gap:8px;font-weight:700;color:var(--text-secondary);">' +
                    '<input type="checkbox" id="select-visible-rows">' +
                    AgendaModule.labels.selectVisible +
                '</label>' +
                '<div style="display:flex;gap:8px;flex-wrap:wrap;">' +
                    '<button id="clear-selected-rows" class="btn btn-secondary">' +
                        '<i class="fas fa-xmark"></i> ' + AgendaModule.labels.clearSelection +
                    '</button>' +
                    '<button id="show-more-rows" class="btn btn-secondary" style="' + (AgendaModule.currentRows.length >= rowsModern.length ? 'display:none;' : '') + '">' +
                        '<i class="fas fa-chevron-down"></i> ' + AgendaModule.labels.showMore +
                    '</button>' +
                '</div>' +
            '</div>' +
            '<div class="table-container" style="overflow-x:auto;">' +
                '<table class="premium-table agenda-table" style="width:100%;min-width:1320px;table-layout:auto;">' +
                    '<thead>' +
                        '<tr style="background:var(--bg-color);">' +
                            '<th style="width:42px;"><input type="checkbox" id="select-all-header"></th>' +
                            '<th style="width:76px;">' + AgendaModule.labels.roll + '</th>' +
                            '<th style="width:92px;">' + AgendaModule.labels.caseNumber + '</th>' +
                            '<th style="width:60px;">' + AgendaModule.labels.year + '</th>' +
                            '<th style="min-width:180px;">' + AgendaModule.labels.plaintiff + '</th>' +
                            '<th style="min-width:180px;">' + AgendaModule.labels.defendant + '</th>' +
                            '<th style="width:112px;">' + AgendaModule.labels.prevSession + '</th>' +
                            '<th style="width:112px;">' + AgendaModule.labels.latestSession + '</th>' +
                            '<th style="max-width:110px;">' + AgendaModule.labels.decision + '</th>' +
                            '<th style="width:90px;">' + AgendaModule.labels.sessionType + '</th>' +
                            '<th style="width:92px;">' + AgendaModule.labels.status + '</th>' +
                            '<th style="max-width:140px;">' + AgendaModule.labels.subject + '</th>' +
                            '<th style="width:118px;">' + AgendaModule.labels.indicators + '</th>' +
                            '<th style="width:92px;">' + AgendaModule.labels.action + '</th>' +
                        '</tr>' +
                    '</thead>' +
                    '<tbody>' +
                        AgendaModule.currentRows.map((a) =>
                            '<tr style="cursor:pointer;" class="agenda-row' + (AgendaModule.selectedAppealId === a.id ? ' agenda-row-active' : '') + '" data-id="' + a.id + '">' +
                                '<td style="text-align:center;"><input type="checkbox" class="agenda-row-select" data-id="' + a.id + '" ' + (AgendaModule.selectedIds.has(a.id) ? 'checked' : '') + '></td>' +
                                '<td style="font-weight:900;color:var(--nav-bg);background:rgba(245,158,11,0.08);border-radius:10px;text-align:center;white-space:nowrap;">' + (a.roll || '---') + '</td>' +
                                '<td style="font-weight:800;color:var(--accent-color);white-space:nowrap;"><a href="#" class="case-link" onclick="if(window.AppealsModule) window.AppealsModule.viewAppeal(\'' + a.id + '\'); return false;" style="color:var(--accent-color); text-decoration:none;">' + (a.appealNumber || '---') + '</a></td>' +
                                '<td style="white-space:nowrap;">' + (a.year || '---') + '</td>' +
                                '<td style="white-space:normal;line-height:1.45;">' + (a.plaintiff || '---') + '</td>' +
                                '<td style="white-space:normal;line-height:1.45;">' + (a.defendant || '---') + '</td>' +
                                '<td style="direction:ltr;text-align:right;font-size:0.86rem;white-space:nowrap;">' + AgendaModule.formatDateForDisplay(a.prevSessionDate) + '</td>' +
                                '<td style="direction:ltr;text-align:right;font-size:0.88rem;font-weight:700;white-space:nowrap;">' + AgendaModule.formatDateForDisplay(AgendaModule.getLatestSessionDate(a) || a.lastSessionDate || a.sessionDate) + '</td>' +
                                '<td style="font-size:0.78rem;line-height:1.35;white-space:normal;max-width:110px;">' + (a.sessionDecision || '---') + '</td>' +
                                '<td style="font-size:0.8rem;white-space:nowrap;">' + (a.sessionType || '---') + '</td>' +
                                '<td><span class="badge ' + AgendaModule.getStatusBadgeClass(a.status) + '">' + (a.status || '---') + '</span></td>' +
                                '<td style="font-size:0.8rem;line-height:1.35;white-space:normal;max-width:140px;">' + (a.subject || '---') + '</td>' +
                                '<td><div style="display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:wrap;">' +
                                    AgendaModule.getMetaIndicators(a) +
                                    '<button class="icon-btn open-session-meta" data-id="' + a.id + '" style="width:28px;height:28px;background:var(--bg-color);border:1px solid var(--border-color);border-radius:999px;">' +
                                        '<i class="fas fa-pen"></i>' +
                                    '</button>' +
                                '</div></td>' +
                                '<td><button class="btn btn-primary open-session-modal" data-id="' + a.id + '" style="font-size:0.8rem;padding:6px 10px !important;">' +
                                    '<i class="fas fa-forward"></i> ' + AgendaModule.labels.rollover +
                                '</button></td>' +
                            '</tr>'
                        ).join('') +
                    '</tbody>' +
                '</table>' +
            '</div>';

        document.querySelectorAll('.agenda-row').forEach((row) => {
            row.addEventListener('click', (e) => {
                if (e.target.closest('button') || e.target.closest('input')) return;
                AgendaModule.selectedAppealId = row.dataset.id;
                AgendaModule.renderAgendaView();
            });
        });

        document.querySelectorAll('.agenda-row-select').forEach((checkbox) => {
            checkbox.addEventListener('change', () => {
                const { id } = checkbox.dataset;
                if (checkbox.checked) AgendaModule.selectedIds.add(id);
                else AgendaModule.selectedIds.delete(id);
                AgendaModule.renderAgendaView();
            });
        });

        document.getElementById('select-visible-rows')?.addEventListener('change', (e) => {
            if (e.target.checked) AgendaModule.currentRows.forEach((row) => AgendaModule.selectedIds.add(row.id));
            else AgendaModule.currentRows.forEach((row) => AgendaModule.selectedIds.delete(row.id));
            AgendaModule.renderAgendaView();
        });

        document.getElementById('select-all-header')?.addEventListener('change', (e) => {
            if (e.target.checked) AgendaModule.currentRows.forEach((row) => AgendaModule.selectedIds.add(row.id));
            else AgendaModule.currentRows.forEach((row) => AgendaModule.selectedIds.delete(row.id));
            AgendaModule.renderAgendaView();
        });

        document.getElementById('clear-selected-rows')?.addEventListener('click', () => {
            AgendaModule.selectedIds.clear();
            AgendaModule.renderAgendaView();
        });

        document.getElementById('show-more-rows')?.addEventListener('click', () => {
            AgendaModule.visibleRowsCount += 10;
            AgendaModule.renderAgendaView();
        });

        document.querySelectorAll('.open-session-modal').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                AgendaModule.openSessionModal(btn.dataset.id);
            });
        });

        document.querySelectorAll('.open-session-meta').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                AgendaModule.openSessionMetaModal(btn.dataset.id);
            });
        });
    },

    // ============================================================
    // SESSION MODAL
    // ============================================================
    openSessionModal: async (appealId) => {
        const appeal = AgendaModule.appeals.find(a => a.id === appealId);
        if(!appeal) return;

        AgendaModule.selectedAppealId = appealId;

        document.getElementById('modal-appeal-title').textContent =
            `طعن رقم ${appeal.appealNumber} — ${appeal.plaintiff || ''}`;
        document.getElementById('modal-prev-session').textContent = AgendaModule.formatDateForDisplay(appeal.prevSessionDate);
        document.getElementById('modal-last-session').textContent = AgendaModule.formatDateForDisplay(AgendaModule.getLatestSessionDate(appeal) || appeal.lastSessionDate || appeal.sessionDate);
        document.getElementById('modal-next-session').textContent = AgendaModule.formatDateForDisplay(appeal.nextSessionDate);
        document.getElementById('modal-next-session')?.closest('div')?.classList.add('hidden');
        document.getElementById('modal-decision').value = '';
        document.getElementById('modal-facts').value = '';
        document.getElementById('modal-new-next-session').value = '';
        document.getElementById('modal-prep-status').value = appeal.sessionPrep || '';
        document.getElementById('modal-session-type').value = appeal.sessionType || '\u0641\u062d\u0635';

        document.getElementById('session-update-modal').classList.remove('hidden');

        // Switch to rollover tab
        AgendaModule.switchModalTab('rollover');
        document.getElementById('modal-session-type').value = appeal.sessionType || document.getElementById('modal-session-type').value;
    },

    openSessionMetaModal: (appealId = AgendaModule.selectedAppealId) => {
        const appeal = AgendaModule.appeals.find(a => a.id === appealId);
        if (!appeal) return;

        AgendaModule.selectedAppealId = appealId;
        document.getElementById('meta-session-prep').value = appeal.sessionPrep || '';
        document.getElementById('meta-court-minutes').value = appeal.courtMinutes || '';
        document.getElementById('meta-inspection-requests').value = appeal.inspectionRequests || '';
        document.getElementById('session-meta-modal').classList.remove('hidden');
    },

    saveSessionMeta: async () => {
        const appealId = AgendaModule.selectedAppealId;
        const appeal = AgendaModule.appeals.find(a => a.id === appealId);
        if (!appeal) return;

        const updateData = {
            sessionPrep: document.getElementById('meta-session-prep').value.trim(),
            courtMinutes: document.getElementById('meta-court-minutes').value.trim(),
            inspectionRequests: document.getElementById('meta-inspection-requests').value.trim(),
            updatedAt: new Date()
        };

        try {
            await updateDoc(doc(db, "appeals", appealId), updateData);
            const updatedAppeal = { ...appeal, ...updateData };
            const idx = AgendaModule.appeals.findIndex(a => a.id === appealId);
            if (idx !== -1) AgendaModule.appeals[idx] = updatedAppeal;
            AppealsStore.upsert(updatedAppeal);
            document.getElementById('session-meta-modal').classList.add('hidden');
            document.getElementById('modal-prep-status').value = updateData.sessionPrep || '';
            UI.showToast("تم حفظ بيانات الجلسة", "success");
            AgendaModule.renderAgendaView();
        } catch (e) {
            console.error(e);
            UI.showToast("تعذر حفظ بيانات الجلسة", "error");
        }
    },

    copyFromPreviousVisibleRow: () => {
        const currentIndex = AgendaModule.currentRows.findIndex((row) => row.id === AgendaModule.selectedAppealId);
        if (currentIndex <= 0) {
            UI.showToast("لا يوجد صف سابق للنسخ منه", "info");
            return;
        }

        const previousRow = AgendaModule.currentRows[currentIndex - 1];
        document.getElementById('modal-decision').value = previousRow.sessionDecision || '';
        document.getElementById('modal-prep-status').value = previousRow.sessionPrep || '';
        document.getElementById('modal-new-next-session').value = AgendaModule.normalizeDateValue(previousRow.lastSessionDate || previousRow.sessionDate);
        UI.showToast("تم نسخ القرار والبيانات من الصف السابق", "success");
    },

    openDetailFromSelection: () => {
        const selectedId = AgendaModule.selectedAppealId || AgendaModule.currentRows[0]?.id;
        if (!selectedId) {
            UI.showToast("اختر دعوى أولاً", "info");
            return;
        }
        window.App?.navigate?.('appeals');
        setTimeout(() => window.AppealsModule?.openModal?.(selectedId), 150);
    },

    openBulkRolloverModal: () => {
        if (AgendaModule.selectedIds.size === 0) {
            UI.showToast("حدد دعوى واحدة على الأقل", "info");
            return;
        }
        document.getElementById('bulk-rollover-count').textContent = `سيتم الترحيل على ${AgendaModule.selectedIds.size} دعوى`;
        document.getElementById('bulk-rollover-modal').classList.remove('hidden');
    },

    performBulkRollover: async () => {
        const ids = [...AgendaModule.selectedIds];
        if (ids.length === 0) return;

        const newNextDate = document.getElementById('bulk-new-next-session').value;
        const decision = document.getElementById('bulk-session-decision').value.trim();
        const facts = document.getElementById('bulk-session-facts').value.trim();
        const sessionType = document.getElementById('bulk-session-type').value;
        const prepStatus = document.getElementById('bulk-session-prep').value.trim();
        const button = document.getElementById('confirm-bulk-rollover-btn');

        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري التنفيذ...';

        try {
            for (const appealId of ids) {
                const appeal = AgendaModule.appeals.find(a => a.id === appealId);
                if (!appeal) continue;

                const updateData = {
                    prevSessionDate: AgendaModule.normalizeDateValue(appeal.lastSessionDate || appeal.prevSessionDate),
                    lastSessionDate: AgendaModule.normalizeDateValue(appeal.nextSessionDate || appeal.lastSessionDate),
                    nextSessionDate: AgendaModule.normalizeDateValue(newNextDate),
                    sessionDecision: decision || appeal.sessionDecision || '',
                    sessionFacts: facts || appeal.sessionFacts || '',
                    sessionType: sessionType || appeal.sessionType || '',
                    sessionPrep: prepStatus || appeal.sessionPrep || '',
                    updatedAt: new Date()
                };

                await updateDoc(doc(db, "appeals", appealId), updateData);
                await addDoc(collection(db, "sessions"), {
                    appealId,
                    appealNumber: appeal.appealNumber,
                    sessionDate: AgendaModule.normalizeDateValue(appeal.nextSessionDate || appeal.lastSessionDate),
                    sessionType: updateData.sessionType,
                    agendaStatus: updateData.sessionDecision,
                    facts: updateData.sessionFacts,
                    createdAt: new Date()
                });

                const idx = AgendaModule.appeals.findIndex(a => a.id === appealId);
                if (idx !== -1) AgendaModule.appeals[idx] = { ...appeal, ...updateData };
                AppealsStore.upsert({ ...appeal, ...updateData });
            }

            document.getElementById('bulk-rollover-modal').classList.add('hidden');
            AgendaModule.selectedIds.clear();
            UI.showToast("تم الترحيل الجماعي بنجاح", "success");
            AgendaModule.renderAgendaView();
        } catch (e) {
            console.error(e);
            UI.showToast("تعذر تنفيذ الترحيل الجماعي", "error");
        } finally {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-check"></i> تنفيذ الترحيل';
        }
    },

    switchModalTab: (tabName) => {
        ['rollover', 'attachments', 'history'].forEach(t => {
            const el = document.getElementById(`tab-${t}`);
            if(el) el.classList.add('hidden');
        });
        document.getElementById(`tab-${tabName}`)?.classList.remove('hidden');

        document.querySelectorAll('.modal-tab-btn').forEach(btn => {
            const isActive = btn.dataset.tab === tabName;
            btn.style.borderBottomColor = isActive ? 'var(--accent-color)' : 'transparent';
            btn.style.color = isActive ? 'var(--accent-color)' : 'var(--text-muted)';
            btn.style.fontWeight = isActive ? '700' : '400';
        });

        if(tabName === 'attachments') AgendaModule.loadAttachments(AgendaModule.selectedAppealId);
        if(tabName === 'history') AgendaModule.loadSessionHistory(AgendaModule.selectedAppealId);
    },

    // ============================================================
    // ROLLOVER LOGIC
    // ============================================================
    performRollover: async () => {
        const appealId = AgendaModule.selectedAppealId;
        const appeal = AgendaModule.appeals.find(a => a.id === appealId);
        if(!appeal) return;

        const newNextDate = document.getElementById('modal-new-next-session').value;
        const decision = document.getElementById('modal-decision').value.trim();
        const facts = document.getElementById('modal-facts').value.trim();
        const sessionType = document.getElementById('modal-session-type').value;
        const prepStatus = document.getElementById('modal-prep-status').value;

        const btn = document.getElementById('rollover-session-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

        try {
            const docRef = doc(db, "appeals", appealId);

            // Shift the session chain: prev ← last ← next (current) + save as session record
            const updateData = {
                prevSessionDate: AgendaModule.normalizeDateValue(appeal.lastSessionDate || appeal.prevSessionDate),
                lastSessionDate: AgendaModule.normalizeDateValue(appeal.nextSessionDate || appeal.lastSessionDate),
                nextSessionDate: AgendaModule.normalizeDateValue(newNextDate),
                sessionDecision: decision,
                sessionFacts: facts,
                sessionType: sessionType,
                sessionPrep: prepStatus,
                courtMinutes: document.getElementById('meta-court-minutes')?.value?.trim() || appeal.courtMinutes || '',
                inspectionRequests: document.getElementById('meta-inspection-requests')?.value?.trim() || appeal.inspectionRequests || '',
                updatedAt: new Date()
            };

            await updateDoc(docRef, updateData);

            // Also save the session as a separate record in 'sessions' collection
            if(decision || facts || appeal.nextSessionDate) {
                await addDoc(collection(db, "sessions"), {
                    appealId: appealId,
                    appealNumber: appeal.appealNumber,
                    sessionDate: AgendaModule.normalizeDateValue(appeal.nextSessionDate || appeal.lastSessionDate),
                    sessionType: sessionType,
                    agendaStatus: decision,
                    facts: facts,
                    createdAt: new Date()
                });
            }

            // Update local data
            const updatedAppeal = { ...appeal, ...updateData };
            const idx = AgendaModule.appeals.findIndex(a => a.id === appealId);
            if(idx !== -1) AgendaModule.appeals[idx] = updatedAppeal;
            AppealsStore.upsert(updatedAppeal);

            UI.showToast("✅ تم ترحيل الجلسة وحفظ السجل بنجاح", "success");
            document.getElementById('session-update-modal').classList.add('hidden');
            AgendaModule.renderAgendaView();

        } catch(e) {
            console.error(e);
            UI.showToast("حدث خطأ أثناء الحفظ: " + e.message, "error");
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-forward"></i> ترحيل الجلسة وحفظ';
        }
    },

    // ============================================================
    // ATTACHMENTS
    // ============================================================
    loadAttachments: async (appealId) => {
        const listEl = document.getElementById('attachments-list');
        if(!listEl) return;

        try {
            const snap = await getDocs(collection(db, `appeals/${appealId}/attachments`));
            const attachments = [];
            snap.forEach(d => attachments.push({ id: d.id, ...d.data() }));

            if(attachments.length === 0) {
                listEl.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-muted);">
                    <i class="fas fa-paperclip" style="font-size:2rem;opacity:0.3;display:block;margin-bottom:10px;"></i>
                    لا توجد مرفقات — أضف صورة أو رابط
                </div>`;
                return;
            }

            listEl.innerHTML = attachments.map(att => `
                <div style="display:flex;align-items:center;gap:12px;padding:12px;border:1px solid var(--border-color);border-radius:8px;margin-bottom:10px;background:var(--panel-bg);">
                    ${att.source === 'imgbb' ?
                        `<a href="${att.url}" target="_blank" style="flex-shrink:0;">
                            <img src="${att.url}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;" alt="${att.title}">
                         </a>` :
                        `<div style="width:50px;height:50px;border-radius:8px;background:var(--bg-color);display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0;">
                            ${att.source === 'drive' ? '📁' : '🔗'}
                         </div>`
                    }
                    <div style="flex:1;min-width:0;">
                        <div style="font-weight:700;margin-bottom:2px;">${att.title || att.attachmentType || 'بدون عنوان'}</div>
                        <div style="font-size:0.8rem;color:var(--accent-color);font-weight:600;">${att.attachmentType || ''}</div>
                    </div>
                    <div style="display:flex;gap:8px;">
                        <a href="${att.url}" target="_blank" class="btn" style="padding:6px 12px !important;background:var(--nav-bg);color:white;font-size:0.8rem;text-decoration:none;">
                            <i class="fas fa-external-link-alt"></i> فتح
                        </a>
                        <button class="btn" onclick="navigator.clipboard.writeText('${att.url}').then(()=>alert('تم نسخ الرابط'))" style="padding:6px 12px !important;background:var(--bg-color);border:1px solid var(--border-color);color:var(--text-primary);font-size:0.8rem;">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                </div>
            `).join('');

        } catch(e) {
            console.error(e);
            listEl.innerHTML = `<div style="color:var(--danger-color);padding:15px;">خطأ في تحميل المرفقات</div>`;
        }
    },

    uploadToImgBB: async (file) => {
        const progress = document.getElementById('upload-progress');
        if(progress) progress.classList.remove('hidden');

        try {
            const formData = new FormData();
            formData.append('image', file);

            const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_KEY}`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if(!data.success) throw new Error(data.error?.message || 'فشل الرفع');

            return data.data.url;
        } finally {
            if(progress) progress.classList.add('hidden');
        }
    },

    saveAttachment: async (appealId, attachmentData) => {
        await addDoc(collection(db, `appeals/${appealId}/attachments`), {
            ...attachmentData,
            createdAt: new Date()
        });
    },

    // ============================================================
    // SESSION HISTORY
    // ============================================================
    loadSessionHistory: async (appealId) => {
        const container = document.getElementById('session-history-container');
        if(!container) return;

        const appeal = AgendaModule.appeals.find(a => a.id === appealId);

        try {
            const snap = await getDocs(query(
                collection(db, "sessions"),
                where("appealId", "==", appealId),
                orderBy("sessionDate", "desc")
            ));
            const sessions = [];
            snap.forEach(d => sessions.push({ id: d.id, ...d.data() }));

            if(sessions.length === 0 && !appeal?.prevSessionDate && !appeal?.lastSessionDate) {
                container.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-muted);">لا يوجد سجل جلسات بعد</div>`;
                return;
            }

            container.innerHTML = `
                <div style="position:relative;padding-right:30px;">
                    ${sessions.map((s, i) => `
                        <div style="position:relative;margin-bottom:20px;padding:15px;border:1px solid var(--border-color);border-radius:8px;background:var(--panel-bg);">
                            <div style="position:absolute;right:-11px;top:15px;width:20px;height:20px;border-radius:50%;background:${i===0?'var(--accent-color)':'var(--border-color)'};border:2px solid var(--panel-bg);"></div>
                            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                                <strong style="direction:ltr;">${AgendaModule.formatDateForDisplay(s.sessionDate)}</strong>
                                <span class="badge badge-info">${s.sessionType || ''}</span>
                            </div>
                            <div style="font-size:0.9rem;color:var(--text-secondary);">
                                ${s.agendaStatus ? `<div><strong>القرار:</strong> ${s.agendaStatus}</div>` : ''}
                                ${s.facts ? `<div style="margin-top:5px;color:var(--text-muted);">${s.facts}</div>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>`;
        } catch(e) {
            console.error(e);
            container.innerHTML = `<div style="color:var(--danger-color);padding:15px;">خطأ في تحميل السجل</div>`;
        }
    },

    // ============================================================
    // EVENTS
    // ============================================================
    bindBaseEvents: () => {
        document.querySelectorAll('.agenda-tab-btn').forEach((button) => {
            button.addEventListener('click', (e) => {
                AgendaModule.currentAgendaTab = e.currentTarget.dataset.tab || 'next';
                AgendaModule.visibleRowsCount = 10;
                document.querySelectorAll('.agenda-tab-btn').forEach((btn) => {
                    const isActive = btn.dataset.tab === AgendaModule.currentAgendaTab;
                    btn.classList.toggle('btn-primary', isActive);
                    btn.style.background = isActive ? 'var(--accent-color)' : 'var(--bg-color)';
                    btn.style.color = isActive ? '#1e293b' : 'var(--text-primary)';
                    btn.style.border = isActive ? 'none' : '1px solid var(--border-color)';
                });
                AgendaModule.renderAgendaView();
            });
        });

        ['agenda-sort-by', 'agenda-sort-direction', 'agenda-status-filter'].forEach((id) => {
            document.getElementById(id)?.addEventListener('change', () => {
                AgendaModule.visibleRowsCount = 10;
                AgendaModule.renderAgendaView();
            });
        });

        ['agenda-roll-filter', 'agenda-subject-filter'].forEach((id) => {
            document.getElementById(id)?.addEventListener('input', (e) => {
                AgendaModule.visibleRowsCount = 10;
                AgendaModule.renderAgendaView(e.target.value);
            });
        });

        document.getElementById('agenda-clear-filters')?.addEventListener('click', () => {
            const defaults = {
                'agenda-sort-by': 'sessionDate',
                'agenda-sort-direction': 'asc'
            };
            ['agenda-filter-date', 'agenda-filter-text', 'agenda-roll-filter', 'agenda-subject-filter', 'agenda-status-filter', 'agenda-sort-by', 'agenda-sort-direction'].forEach((id) => {
                const element = document.getElementById(id);
                if (!element) return;
                element.value = defaults[id] || '';
            });
            AgendaModule.visibleRowsCount = 10;
            AgendaModule.renderAgendaView();
        });

        // View toggle
        document.getElementById('view-agenda-btn')?.addEventListener('click', () => {
            AgendaModule.currentAgendaTab = 'next';
            AgendaModule.visibleRowsCount = 10;
            AgendaModule.renderAgendaView();
        });
        document.getElementById('manual-sessions-btn')?.addEventListener('click', () => {
            window.App?.navigate?.('sessions-log');
        });
        document.getElementById('view-detail-btn')?.addEventListener('click', AgendaModule.openDetailFromSelection);
        document.getElementById('bulk-rollover-btn')?.addEventListener('click', AgendaModule.openBulkRolloverModal);
        document.getElementById('print-agenda-btn')?.addEventListener('click', () => window.print());

        // Filters
        document.getElementById('agenda-filter-date')?.addEventListener('change', () => {
            const text = document.getElementById('agenda-filter-text')?.value || '';
            AgendaModule.visibleRowsCount = 10;
            AgendaModule.renderAgendaView(text);
        });
        document.getElementById('agenda-filter-text')?.addEventListener('input', (e) => {
            AgendaModule.visibleRowsCount = 10;
            AgendaModule.renderAgendaView(e.target.value);
        });

        // Refresh
        document.getElementById('agenda-refresh-btn')?.addEventListener('click', async () => {
            UI.showToast("جاري تحديث البيانات...", "info");
            await AgendaModule.loadAppeals();
            AgendaModule.renderAgendaView();
            UI.showToast("تم تحديث الأجندة", "success");
        });

        // Close modal
        document.getElementById('close-session-modal')?.addEventListener('click', () => {
            document.getElementById('session-update-modal').classList.add('hidden');
        });
        document.getElementById('close-session-meta-modal')?.addEventListener('click', () => {
            document.getElementById('session-meta-modal').classList.add('hidden');
        });
        document.getElementById('close-bulk-rollover-modal')?.addEventListener('click', () => {
            document.getElementById('bulk-rollover-modal').classList.add('hidden');
        });

        // Rollover button
        document.getElementById('rollover-session-btn')?.addEventListener('click', AgendaModule.performRollover);
        document.getElementById('save-session-meta-btn')?.addEventListener('click', AgendaModule.saveSessionMeta);
        document.getElementById('copy-previous-row-btn')?.addEventListener('click', AgendaModule.copyFromPreviousVisibleRow);
        document.getElementById('session-meta-btn')?.addEventListener('click', () => AgendaModule.openSessionMetaModal());
        document.getElementById('confirm-bulk-rollover-btn')?.addEventListener('click', AgendaModule.performBulkRollover);

        // Modal tabs
        document.querySelectorAll('.modal-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => AgendaModule.switchModalTab(btn.dataset.tab));
        });

        // IMGBB Upload
        document.getElementById('attach-image-btn')?.addEventListener('click', () => {
            document.getElementById('imgbb-file-input').click();
        });

        document.getElementById('imgbb-file-input')?.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if(!file) return;

            const typeSelect = document.getElementById('attach-type');
            const title = document.getElementById('attach-title')?.value || file.name;

            try {
                const url = await AgendaModule.uploadToImgBB(file);
                await AgendaModule.saveAttachment(AgendaModule.selectedAppealId, {
                    url, title,
                    attachmentType: typeSelect?.value || 'صورة',
                    source: 'imgbb'
                });
                UI.showToast("✅ تم رفع الصورة بنجاح", "success");
                AgendaModule.loadAttachments(AgendaModule.selectedAppealId);
            } catch(err) {
                UI.showToast("فشل الرفع: " + err.message, "error");
            }
            e.target.value = '';
        });

        // Link form toggle
        document.getElementById('attach-link-btn')?.addEventListener('click', () => {
            const form = document.getElementById('add-link-form');
            form?.classList.toggle('hidden');
        });

        // Save link
        document.getElementById('save-link-btn')?.addEventListener('click', async () => {
            const url = document.getElementById('attach-url')?.value?.trim();
            const title = document.getElementById('attach-title')?.value?.trim();
            const type = document.getElementById('attach-type')?.value;

            if(!url) { UI.showToast("يرجى إدخال الرابط", "error"); return; }

            const source = url.includes('drive.google') ? 'drive' : (url.includes('onedrive') ? 'onedrive' : 'link');

            await AgendaModule.saveAttachment(AgendaModule.selectedAppealId, { url, title, attachmentType: type, source });
            UI.showToast("✅ تم حفظ الرابط", "success");
            document.getElementById('add-link-form').classList.add('hidden');
            document.getElementById('attach-url').value = '';
            AgendaModule.loadAttachments(AgendaModule.selectedAppealId);
        });
    }
};
