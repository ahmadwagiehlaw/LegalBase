import { db } from './config.js';
import { collection, getDocs, query, orderBy, doc, getDoc, setDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { UI } from './ui.js';
import { AppealsStore } from './appeals-store.js';
import { AppealsModule } from './appeals.js';

export const DashboardModule = {
    activeUpdatesTab: 'next-session',
    allAppeals: [],
    allJudgments: [],

    updatesTabs: [
        { id: 'next-session', label: 'الجلسة القادمة' },
        { id: 'latest-cases', label: 'أحدث الطعون' },
        { id: 'latest-updates', label: 'أحدث التعديلات' },
        { id: 'previous-month', label: 'دعاوى الشهر السابق' },
        { id: 'latest-judgments', label: 'آخر الأحكام' }
    ],

    normalizeDateValue: (value) => {
        if (!value) return '';
        if (typeof value === 'string') return value.slice(0, 10);
        if (typeof value.toDate === 'function') {
            return value.toDate().toISOString().slice(0, 10);
        }
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
    },

    toMillis: (value) => {
        if (!value) return 0;
        if (typeof value.toMillis === 'function') return value.toMillis();
        if (typeof value.toDate === 'function') return value.toDate().getTime();
        const normalized = DashboardModule.normalizeDateValue(value);
        if (normalized) return new Date(normalized).getTime();
        const parsed = new Date(value).getTime();
        return Number.isNaN(parsed) ? 0 : parsed;
    },

    getLatestSessionDate: (appeal) => {
        const lastSession = DashboardModule.normalizeDateValue(appeal.lastSessionDate);
        const currentSession = DashboardModule.normalizeDateValue(appeal.nextSessionDate);
        return [lastSession, currentSession].filter(Boolean).sort().pop() || '';
    },

    getCurrentMonthKey: () => new Date().toISOString().slice(0, 7),

    getPreviousMonthKey: () => {
        const now = new Date();
        now.setMonth(now.getMonth() - 1);
        return now.toISOString().slice(0, 7);
    },

    formatDateForDisplay: (value) => {
        const normalized = DashboardModule.normalizeDateValue(value);
        if (!normalized) return '---';
        if (normalized.includes('/')) return normalized; // Already formatted as DD/MM/YYYY
        if (!normalized.includes('-')) return normalized;
        const [year, month, day] = normalized.split('-');
        return `${day}/${month}/${year}`;
    },

    ensureUpdatesActionsHeader: () => {
        const headerRow = document.querySelector('#recent-updates-body')?.closest('table')?.querySelector('thead tr');
        if (!headerRow || headerRow.querySelector('.updates-actions-header')) return;
        const th = document.createElement('th');
        th.className = 'updates-actions-header';
        th.textContent = 'الإجراءات';
        headerRow.appendChild(th);
    },

    getStatusBadgeClass: (status) => {
        if (status === 'متداول' || status === 'ظ…طھط¯ط§ظˆظ„') return 'badge-success';
        if (status === 'محجوز للحكم' || status === 'ظ…ط­ط¬ظˆط² ظ„ظ„ط­ظƒظ…') return 'badge-warning';
        return 'badge-danger';
    },

    renderBaseUI: () => {
        const container = document.getElementById('content-container');
        if (!container) return;

        container.innerHTML = `
            <div class="dashboard-grid">
                <div class="grid-col-12 section-card" style="padding:25px;">
                    <div class="section-header" style="margin-bottom:25px;">
                        <h3><i class="fas fa-chart-line"></i> نظرة عامة على البيانات</h3>
                    </div>
                    <div id="dashboard-stats" style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:15px;">
                        <div style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i></div>
                    </div>
                </div>

                <div class="grid-col-8 section-card">
                    <div class="section-header" style="align-items:flex-start; gap:15px; flex-wrap:wrap;">
                        <h3><i class="fas fa-history"></i> آخر التحديثات</h3>
                        <div id="recent-updates-tab-label" style="font-size:0.85rem; color:var(--text-muted); font-weight:700;">الجلسة القادمة</div>
                    </div>

                    <div style="display:flex; gap:8px; flex-wrap:wrap; margin-bottom:15px;" id="dashboard-updates-tabs">
                        ${DashboardModule.updatesTabs.map((tab, index) => `
                            <button
                                class="btn updates-tab-btn ${index === 0 ? 'btn-primary' : ''}"
                                data-tab="${tab.id}"
                                style="${index === 0 ? '' : 'background:var(--bg-color); border:1px solid var(--border-color); color:var(--text-primary);'}"
                            >
                                ${tab.label}
                            </button>
                        `).join('')}
                    </div>

                    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:10px; margin-bottom:15px;">
                        <select id="updates-sort-by" class="form-control" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-primary);">
                            <option value="sessionDate">ترتيب حسب الجلسة</option>
                            <option value="roll">ترتيب حسب الرول</option>
                            <option value="appealNumber">ترتيب حسب رقم القضية</option>
                            <option value="updatedAt">ترتيب حسب آخر تعديل</option>
                            <option value="status">ترتيب حسب الحالة</option>
                        </select>
                        <select id="updates-sort-direction" class="form-control" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-primary);">
                            <option value="asc">تصاعدي</option>
                            <option value="desc" selected>تنازلي</option>
                        </select>
                        <input id="updates-roll-filter" class="form-control" placeholder="فلتر بالرول" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-primary);">
                        <input id="updates-subject-filter" class="form-control" placeholder="فلتر بالموضوع" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-primary);">
                        <select id="updates-status-filter" class="form-control" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-primary);">
                            <option value="">كل الحالات</option>
                            <option value="متداول">متداول</option>
                            <option value="محجوز للحكم">محجوز للحكم</option>
                            <option value="منتهي">منتهي</option>
                        </select>
                        <button id="updates-clear-filters" class="btn" style="background:var(--bg-color); border:1px solid var(--border-color); color:var(--text-primary);">
                            <i class="fas fa-eraser"></i> مسح الفلاتر
                        </button>
                    </div>

                    <div class="table-container" style="margin-top:15px; overflow-x:auto;">
                        <table class="premium-table" style="min-width:1250px;">
                            <thead>
                                <tr>
                                    <th>الرول</th>
                                    <th>رقم القضية</th>
                                    <th>السنة</th>
                                    <th>المدعي</th>
                                    <th>المدعي عليه</th>
                                    <th>الجلسة السابقة</th>
                                    <th>آخر جلسة</th>
                                    <th>القرار</th>
                                    <th>نوع الجلسة</th>
                                    <th>الحالة</th>
                                    <th>الموضوع</th>
                                </tr>
                            </thead>
                            <tbody id="recent-updates-body">
                                <tr><td colspan="12" style="text-align:center;">جاري التحميل...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="grid-col-4" style="display:flex; flex-direction:column; gap:25px;">
                    <div class="section-card">
                        <div class="section-header">
                            <h3><i class="fas fa-sticky-note"></i> ملاحظات سريعة</h3>
                        </div>
                        <textarea id="quick-notes" class="notes-area" placeholder="اكتب ملاحظاتك هنا..." style="min-height:120px;"></textarea>
                        <button id="save-notes-btn" class="btn btn-primary" style="width:100%; margin-top:10px;">
                            <i class="fas fa-save"></i> حفظ الملاحظات
                        </button>
                    </div>

                    <div class="section-card">
                        <div class="section-header">
                            <h3><i class="fas fa-calendar-alt"></i> جدول الجلسات</h3>
                        </div>
                        <div id="dashboard-calendar" style="text-align:center; padding:10px;">
                            <div style="font-size:1rem; font-weight:700; color:var(--text-primary); margin-bottom:15px;">${new Date().toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}</div>
                            <div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:8px; font-size:0.9rem;">
                                <div style="font-weight:bold; color:var(--text-muted);">س</div>
                                <div style="font-weight:bold; color:var(--text-muted);">ج</div>
                                <div style="font-weight:bold; color:var(--text-muted);">خ</div>
                                <div style="font-weight:bold; color:var(--text-muted);">أ</div>
                                <div style="font-weight:bold; color:var(--text-muted);">ث</div>
                                <div style="font-weight:bold; color:var(--text-muted);">ن</div>
                                <div style="font-weight:bold; color:var(--text-muted);">ح</div>
                                ${Array.from({ length: 31 }, (_, i) => {
                                    const isToday = i + 1 === new Date().getDate();
                                    return `<div style="padding:8px; border-radius:8px; ${isToday ? 'background:var(--nav-active); color:white; font-weight:bold;' : 'background:var(--bg-color);'}">${i + 1}</div>`;
                                }).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },

    buildStatsCards: (appeals, judgments) => {
        const currentMonth = DashboardModule.getCurrentMonthKey();
        const previousMonth = DashboardModule.getPreviousMonthKey();
        const active = appeals.filter((appeal) => appeal.status === 'متداول').length;
        const pending = appeals.filter((appeal) => appeal.status === 'محجوز للحكم').length;
        const finished = appeals.filter((appeal) => appeal.status === 'منتهي').length;
        const currentMonthCases = appeals.filter((appeal) => DashboardModule.getLatestSessionDate(appeal).startsWith(currentMonth)).length;
        const previousMonthCases = appeals.filter((appeal) => DashboardModule.getLatestSessionDate(appeal).startsWith(previousMonth)).length;

        const judgmentCategories = {};
        judgments.forEach((judgment) => {
            const category = judgment.resultCategory || 'غير محدد';
            judgmentCategories[category] = (judgmentCategories[category] || 0) + 1;
        });

        const cards = [
            { label: 'إجمالي الطعون', value: `${appeals.length}`, tone: '#3b82f6', icon: 'fa-folder-open' },
            { label: 'الطعون المتداولة', value: `${active}`, tone: '#10b981', icon: 'fa-play' },
            { label: 'محجوز للحكم', value: `${pending}`, tone: '#f59e0b', icon: 'fa-gavel' },
            { label: 'الطعون المنتهية', value: `${finished}`, tone: '#ef4444', icon: 'fa-flag-checkered' },
            { label: 'جلسات الشهر الحالي', value: `${currentMonthCases}`, tone: '#2563eb', icon: 'fa-calendar-day' },
            { label: 'جلسات الشهر السابق', value: `${previousMonthCases}`, tone: '#7c3aed', icon: 'fa-calendar-minus' },
            { label: 'إجمالي الأحكام', value: `${judgments.length}`, tone: '#0f766e', icon: 'fa-scale-balanced' }
        ];

        Object.entries(judgmentCategories).forEach(([category, count]) => {
            cards.push({
                label: `أحكام: ${category}`,
                value: `${count}`,
                tone: '#475569',
                icon: 'fa-stamp'
            });
        });

        return cards.map((card) => `
            <div class="section-card" style="padding:18px; border-top:3px solid ${card.tone};">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:40px; height:40px; border-radius:10px; background:${card.tone}; color:white; display:flex; align-items:center; justify-content:center;">
                        <i class="fas ${card.icon}"></i>
                    </div>
                    <div>
                        <div style="font-size:1.4rem; font-weight:800; color:var(--text-primary);">${card.value}</div>
                        <div style="font-size:0.85rem; color:var(--text-muted); font-weight:600;">${card.label}</div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    getTabData: () => {
        const appeals = [...DashboardModule.allAppeals];
        const judgments = [...DashboardModule.allJudgments];
        const previousMonth = DashboardModule.getPreviousMonthKey();

        switch (DashboardModule.activeUpdatesTab) {
            case 'next-session':
                return appeals
                    .filter((appeal) => !!DashboardModule.normalizeDateValue(appeal.nextSessionDate))
                    .map((appeal) => ({ ...appeal, sessionDate: DashboardModule.normalizeDateValue(appeal.nextSessionDate) }));
            case 'latest-cases':
                return appeals
                    .filter((appeal) => !!DashboardModule.getLatestSessionDate(appeal))
                    .map((appeal) => ({ ...appeal, sessionDate: DashboardModule.getLatestSessionDate(appeal) }));
            case 'previous-month':
                return appeals
                    .filter((appeal) => DashboardModule.getLatestSessionDate(appeal).startsWith(previousMonth))
                    .map((appeal) => ({ ...appeal, sessionDate: DashboardModule.getLatestSessionDate(appeal) }));
            case 'latest-judgments':
                return judgments.map((judgment) => {
                    const appeal = appeals.find((item) => item.id === judgment.appealId) || {};
                    return {
                        ...appeal,
                        sessionDate: DashboardModule.normalizeDateValue(judgment.judgmentDate),
                        sessionDecision: judgment.judgmentSummary || appeal.sessionDecision,
                        sessionType: 'جلسة حكم',
                        status: appeal.status || 'منتهي'
                    };
                });
            case 'latest-updates':
            default:
                return appeals.map((appeal) => ({
                    ...appeal,
                    sessionDate: DashboardModule.getLatestSessionDate(appeal)
                }));
        }
    },

    applyTableFiltersAndSort: (rows) => {
        const sortBy = document.getElementById('updates-sort-by')?.value || 'sessionDate';
        const sortDirection = document.getElementById('updates-sort-direction')?.value || 'desc';
        const statusFilter = document.getElementById('updates-status-filter')?.value || '';
        const rollFilter = (document.getElementById('updates-roll-filter')?.value || '').trim().toLowerCase();
        const subjectFilter = (document.getElementById('updates-subject-filter')?.value || '').trim().toLowerCase();

        const filtered = rows.filter((row) => {
            const matchesStatus = !statusFilter || row.status === statusFilter;
            const matchesRoll = !rollFilter || String(row.roll || '').toLowerCase().includes(rollFilter);
            const matchesSubject = !subjectFilter || String(row.subject || '').toLowerCase().includes(subjectFilter);
            return matchesStatus && matchesRoll && matchesSubject;
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
            if (sortBy === 'updatedAt') {
                return (DashboardModule.toMillis(a.updatedAt) - DashboardModule.toMillis(b.updatedAt)) * direction;
            }
            return String(a.sessionDate || '').localeCompare(String(b.sessionDate || '')) * direction;
        });

        return filtered.slice(0, 12);
    },

    renderUpdatesTable: () => {
        const tableBody = document.getElementById('recent-updates-body');
        const tabLabel = document.getElementById('recent-updates-tab-label');
        if (!tableBody) return;

        const activeTab = DashboardModule.updatesTabs.find((tab) => tab.id === DashboardModule.activeUpdatesTab);
        if (tabLabel) tabLabel.textContent = activeTab?.label || '';

        const rows = DashboardModule.applyTableFiltersAndSort(DashboardModule.getTabData());
        if (rows.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="12" style="text-align:center;">\u0644\u0627 \u062a\u0648\u062c\u062f \u0628\u064a\u0627\u0646\u0627\u062a \u0645\u0637\u0627\u0628\u0642\u0629</td></tr>';
            return;
        }

        tableBody.innerHTML = rows.map((row) => {
            const statusClass = DashboardModule.getStatusBadgeClass(row.status);

            return '<tr>' +
                    '<td>' + (row.roll || '---') + '</td>' +
                    '<td style="font-weight:700;"><a href="#" class="case-link" onclick="if(window.AppealsModule) window.AppealsModule.viewAppeal(\'' + row.id + '\'); return false;" style="color:var(--accent-color); text-decoration:none;">' + (row.appealNumber || '---') + '</a></td>' +
                    '<td>' + (row.year || '---') + '</td>' +
                    '<td>' + (row.plaintiff || '---') + '</td>' +
                    '<td>' + (row.defendant || '---') + '</td>' +
                    '<td style="direction:ltr; text-align:right;">' + DashboardModule.formatDateForDisplay(row.prevSessionDate) + '</td>' +
                    '<td style="direction:ltr; text-align:right;">' + DashboardModule.formatDateForDisplay(DashboardModule.getLatestSessionDate(row) || row.lastSessionDate || row.sessionDate || row.nextSessionDate) + '</td>' +
                    '<td>' + (row.sessionDecision || '---') + '</td>' +
                    '<td>' + (row.sessionType || '---') + '</td>' +
                    '<td><span class="badge ' + statusClass + '">' + (row.status || '---') + '</span></td>' +
                    '<td>' + (row.subject || '---') + '</td>' +
                    '<td><div style="display:flex; gap:8px; justify-content:flex-end;">' +
                        '<button class="icon-btn dashboard-edit-appeal" data-id="' + row.id + '" title="\u062a\u0639\u062f\u064a\u0644" style="color:var(--secondary-color);"><i class="fas fa-edit"></i></button>' +
                        '<button class="icon-btn dashboard-delete-appeal" data-id="' + row.id + '" title="\u062d\u0630\u0641" style="color:var(--danger-color);"><i class="fas fa-trash"></i></button>' +
                    '</div></td>' +
                '</tr>';
        }).join('');

        tableBody.querySelectorAll('.dashboard-edit-appeal').forEach((button) => {
            button.addEventListener('click', (e) => {
                const appealId = e.currentTarget.dataset.id;
                window.App?.navigate?.('appeals');
                setTimeout(() => AppealsModule.openModal(appealId), 150);
            });
        });

        tableBody.querySelectorAll('.dashboard-delete-appeal').forEach((button) => {
            button.addEventListener('click', async (e) => {
                const appealId = e.currentTarget.dataset.id;
                await DashboardModule.deleteAppealFromDashboard(appealId);
            });
        });
    },

    deleteAppealFromDashboard: async (appealId) => {
        const appeal = DashboardModule.allAppeals.find((item) => item.id === appealId);
        if (!appeal) return;
        if (!confirm(`\u0633\u064a\u062a\u0645 \u062d\u0630\u0641 \u0627\u0644\u0637\u0639\u0646 \u0631\u0642\u0645 ${appeal.appealNumber || ''}. \u0647\u0644 \u062a\u0631\u064a\u062f \u0627\u0644\u0645\u062a\u0627\u0628\u0639\u0629\u061f`)) return;

        try {
            await deleteDoc(doc(db, 'appeals', appealId));
            AppealsStore.remove(appealId);
            DashboardModule.allAppeals = DashboardModule.allAppeals.filter((item) => item.id !== appealId);
            document.getElementById('dashboard-stats').innerHTML = DashboardModule.buildStatsCards(
                DashboardModule.allAppeals,
                DashboardModule.allJudgments
            );
            DashboardModule.renderUpdatesTable();
            UI.showToast('\u062a\u0645 \u062d\u0630\u0641 \u0627\u0644\u062f\u0639\u0648\u0649 \u0628\u0646\u062c\u0627\u062d', 'success');
        } catch (error) {
            console.error(error);
            UI.showToast('\u062a\u0639\u0630\u0631 \u062d\u0630\u0641 \u0627\u0644\u062f\u0639\u0648\u0649', 'error');
        }
    },

    loadData: async () => {
        try {
            const [appeals, judgmentsSnap] = await Promise.all([
                AppealsStore.load({ allowStale: true }),
                getDocs(query(collection(db, "judgments"), orderBy("judgmentDate", "desc")))
            ]);

            DashboardModule.allAppeals = appeals;
            DashboardModule.allJudgments = judgmentsSnap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));

            document.getElementById('dashboard-stats').innerHTML = DashboardModule.buildStatsCards(
                DashboardModule.allAppeals,
                DashboardModule.allJudgments
            );

            DashboardModule.renderUpdatesTable();

            const noteDoc = await getDoc(doc(db, "settings", "quick_notes"));
            if (noteDoc.exists()) {
                document.getElementById('quick-notes').value = noteDoc.data().content || '';
            }
        } catch (err) {
            console.error(err);
        }
    },

    bindEvents: () => {
        document.querySelectorAll('.updates-tab-btn').forEach((button) => {
            button.addEventListener('click', (e) => {
                DashboardModule.activeUpdatesTab = e.currentTarget.dataset.tab;
                document.querySelectorAll('.updates-tab-btn').forEach((btn) => {
                    const isActive = btn.dataset.tab === DashboardModule.activeUpdatesTab;
                    btn.classList.toggle('btn-primary', isActive);
                    btn.style.background = isActive ? 'var(--accent-color)' : 'var(--bg-color)';
                    btn.style.color = isActive ? '#1e293b' : 'var(--text-primary)';
                    btn.style.border = isActive ? 'none' : '1px solid var(--border-color)';
                });
                DashboardModule.renderUpdatesTable();
            });
        });

        ['updates-sort-by', 'updates-sort-direction', 'updates-status-filter'].forEach((id) => {
            document.getElementById(id)?.addEventListener('change', DashboardModule.renderUpdatesTable);
        });

        ['updates-roll-filter', 'updates-subject-filter'].forEach((id) => {
            document.getElementById(id)?.addEventListener('input', DashboardModule.renderUpdatesTable);
        });

        document.getElementById('updates-clear-filters')?.addEventListener('click', () => {
            const fields = ['updates-roll-filter', 'updates-subject-filter', 'updates-status-filter', 'updates-sort-by', 'updates-sort-direction'];
            fields.forEach((id) => {
                const element = document.getElementById(id);
                if (!element) return;
                if (id === 'updates-sort-by') element.value = 'sessionDate';
                else if (id === 'updates-sort-direction') element.value = 'desc';
                else element.value = '';
            });
            DashboardModule.renderUpdatesTable();
        });

        const saveBtn = document.getElementById('save-notes-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                const content = document.getElementById('quick-notes').value;
                try {
                    await setDoc(doc(db, "settings", "quick_notes"), { content, updatedAt: new Date() });
                    UI.showToast("تم حفظ الملاحظات", "success");
                } catch (e) {
                    UI.showToast("خطأ في الحفظ", "error");
                }
            });
        }
    },

    init: async () => {
        DashboardModule.renderBaseUI();
        DashboardModule.ensureUpdatesActionsHeader();
        await DashboardModule.loadData();
        DashboardModule.bindEvents();
    }
};
