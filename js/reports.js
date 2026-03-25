import { db } from './config.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { UI } from './ui.js';
import { AppealsModule } from './appeals.js';
import { AppealsStore } from './appeals-store.js';

export const ReportsModule = {
    allJudgments: [],
    allAppeals: [],

    init: async () => {
        ReportsModule.renderBaseUI();
        await ReportsModule.loadAllData();
        ReportsModule.renderJudgmentStats(ReportsModule.allJudgments);
        ReportsModule.bindEvents();
    },

    loadAllData: async () => {
        try {
            const [appeals, judgesSnap] = await Promise.all([
                AppealsStore.load({ allowStale: true }),
                getDocs(query(collection(db, "judgments"), orderBy("judgmentDate", "desc")))
            ]);
            
            ReportsModule.allAppeals = appeals;
            AppealsModule.appeals = ReportsModule.allAppeals;

            ReportsModule.allJudgments = [];
            judgesSnap.forEach(d => ReportsModule.allJudgments.push({ id: d.id, ...d.data() }));
        } catch(e) {
            console.error("Error loading data for reports", e);
            UI.showToast("حدث خطأ أثناء تحميل بيانات التقارير", "error");
        }
    },

    renderBaseUI: () => {
        const container = document.getElementById('content-container');
        if (!container) return;
        
        container.innerHTML = `
            <!-- Filter Bar -->
            <div class="section-card" style="margin-bottom:20px; padding:20px; border-right:4px solid var(--accent-color);">
                <div style="display:flex; flex-wrap:wrap; align-items:center; gap:15px;">
                    <h4 style="color:var(--text-primary); white-space:nowrap;"><i class="fas fa-filter" style="color:var(--accent-color);"></i> &nbsp;فلترة التقارير</h4>
                    
                    <select id="filter-result" style="padding:9px 14px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-primary); font-family:var(--font-primary);">
                        <option value="">نوع الحكم (الكل)</option>
                        <option value="لصالحنا">✅ لصالحنا</option>
                        <option value="ضدنا">❌ ضدنا</option>
                        <option value="نقض">🔄 نقض</option>
                        <option value="إحالة">↩ إحالة</option>
                        <option value="عدم الاختصاص">⛔ عدم الاختصاص</option>
                        <option value="شطب">📋 شطب</option>
                    </select>
                    
                    <input type="month" id="filter-month" style="padding:9px 14px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-primary);" title="تصفية حسب الشهر">

                    <input type="text" id="filter-court" placeholder="بحث بالمحكمة..." style="padding:9px 14px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-primary); font-family:var(--font-primary);">

                    <button id="apply-filter-btn" class="btn btn-primary" style="white-space:nowrap;"><i class="fas fa-search"></i> تطبيق الفلتر</button>
                    <button id="reset-filter-btn" class="btn" style="background:var(--bg-color); border:1px solid var(--border-color); color:var(--text-primary); white-space:nowrap;"><i class="fas fa-times"></i> إعادة ضبط</button>
                    <button id="print-report-btn" class="btn btn-primary" style="background:#1e293b; margin-right:auto;" onclick="window.print()"><i class="fas fa-print"></i> طباعة</button>
                </div>
            </div>

            <!-- Stats Overview -->
            <div id="stats-overview" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap:15px; margin-bottom:25px;"></div>

            <!-- Reports Content -->
            <div class="section-card" style="padding:0; overflow:hidden;">
                <div style="background:var(--nav-bg); padding:15px 25px; display:flex; justify-content:space-between; align-items:center;">
                    <h4 style="color:#fff; margin:0;"><i class="fas fa-gavel" style="color:var(--accent-color);"></i> &nbsp;الأحكام الصادرة</h4>
                    <span id="results-count" style="color:var(--accent-color); font-weight:700;"></span>
                </div>
                <div style="overflow-x:auto;">
                    <table class="premium-table" style="width:100%;" id="judgments-table">
                        <thead>
                            <tr>
                                <th>رقم الطعن</th>
                                <th>تاريخ الحكم</th>
                                <th>المحكمة</th>
                                <th>نتيجة الحكم</th>
                                <th>منطوق الحكم</th>
                                <th>خصم القضية</th>
                            </tr>
                        </thead>
                        <tbody id="judgments-tbody">
                            <tr><td colspan="6" style="text-align:center; padding:40px; color:var(--text-muted);">
                                <i class="fas fa-spinner fa-spin"></i> جاري تحميل الأحكام...
                            </td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Individual Case Report Section -->
            <div class="section-card" style="margin-top:25px; border-right:4px solid var(--success-color);">
                <div class="section-header">
                    <h4><i class="fas fa-file-alt" style="color:var(--success-color);"></i> &nbsp;تقرير طعن بعينه</h4>
                </div>
                <div style="display:flex; gap:15px; align-items:center; flex-wrap:wrap;">
                    <select id="report-appeal-select" style="flex:1; min-width:250px; padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-primary); font-family:var(--font-primary);">
                        <option value="">--- اختر الطعن ---</option>
                    </select>
                    <button id="generate-case-report" class="btn btn-primary"><i class="fas fa-file-chart-column"></i> إنشاء التقرير</button>
                </div>
                <div id="case-report-output" style="margin-top:20px;"></div>
            </div>

            <style>
                @media print {
                    .actions-bar, .sidebar, .top-header, #filter-block, button { display: none !important; }
                    .main-content { margin-right: 0 !important; padding: 0 !important; }
                    .section-card { box-shadow: none !important; border: 1px solid #ddd !important; }
                }
            </style>
        `;
    },

    renderJudgmentStats: (judgments) => {
        // Compute stats
        const total = judgments.length;
        const categories = {};
        judgments.forEach(j => {
            const cat = j.resultCategory || 'غير محدد';
            categories[cat] = (categories[cat] || 0) + 1;
        });

        const colorMap = {
            'لصالحنا': { bg: '#dcfce7', text: '#166534', icon: 'fa-check-circle' },
            'ضدنا':    { bg: '#fee2e2', text: '#991b1b', icon: 'fa-times-circle' },
            'نقض':     { bg: '#dbeafe', text: '#1e40af', icon: 'fa-rotate' },
            'إحالة':   { bg: '#fef3c7', text: '#92400e', icon: 'fa-arrow-left' },
        };

        const overview = document.getElementById('stats-overview');
        if (!overview) return;

        const totalCard = `
            <div class="section-card" style="text-align:center; padding:20px; border-top:3px solid var(--accent-color);">
                <i class="fas fa-gavel" style="font-size:1.8rem; color:var(--accent-color); margin-bottom:8px;"></i>
                <div style="font-size:2rem; font-weight:800; color:var(--text-primary);">${total}</div>
                <div style="font-size:0.85rem; color:var(--text-muted); font-weight:600;">إجمالي الأحكام</div>
            </div>`;

        const catCards = Object.entries(categories).map(([cat, count]) => {
            const style = colorMap[cat] || { bg: '#f1f5f9', text: '#475569', icon: 'fa-circle' };
            const pct = total > 0 ? Math.round((count/total)*100) : 0;
            return `
                <div class="section-card" style="text-align:center; padding:20px; border-top:3px solid ${style.text};">
                    <i class="fas ${style.icon}" style="font-size:1.5rem; color:${style.text}; margin-bottom:8px;"></i>
                    <div style="font-size:1.8rem; font-weight:800; color:${style.text};">${count}</div>
                    <div style="font-size:0.85rem; color:var(--text-primary); font-weight:600; margin-bottom:5px;">${cat}</div>
                    <div style="font-size:0.75rem; color:var(--text-muted);">${pct}% من الإجمالي</div>
                </div>`;
        });

        overview.innerHTML = totalCard + catCards.join('');

        // Also render summary stats for Appeals
        const appealTotal = ReportsModule.allAppeals.length;
        const active = ReportsModule.allAppeals.filter(a => a.status === 'متداول').length;
        const finished = ReportsModule.allAppeals.filter(a => a.status === 'منتهي').length;

        const appealCard = `
            <div class="section-card" style="text-align:center; padding:20px; border-top:3px solid var(--success-color);">
                <i class="fas fa-balance-scale" style="font-size:1.8rem; color:var(--success-color); margin-bottom:8px;"></i>
                <div style="font-size:2rem; font-weight:800; color:var(--text-primary);">${appealTotal}</div>
                <div style="font-size:0.85rem; color:var(--text-muted); font-weight:600;">إجمالي الطعون</div>
                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:4px;">متداول: ${active} &bull; منتهي: ${finished}</div>
            </div>`;
        overview.innerHTML = totalCard + appealCard + catCards.join('');
    },

    renderJudgmentsTable: (judgments) => {
        const tbody = document.getElementById('judgments-tbody');
        const count = document.getElementById('results-count');
        if(!tbody) return;

        if(count) count.textContent = `${judgments.length} حكم`;
        
        if(judgments.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:40px; color:var(--text-muted);">لا يوجد أحكام مطابقة للفلتر المحدد</td></tr>`;
            return;
        }

        const colorMap = {
            'لصالحنا': 'badge-success',
            'ضدنا': 'badge-danger',
            'نقض': 'badge-info',
            'إحالة': 'badge-warning',
        };

        tbody.innerHTML = judgments.map(j => {
            const appeal = ReportsModule.allAppeals.find(a => a.id === j.appealId);
            const badgeClass = colorMap[j.resultCategory] || 'badge-info';
            return `
                <tr>
                    <td style="font-weight:700; color:var(--accent-color);">${appeal?.appealNumber || j.appealId || '---'}</td>
                    <td style="direction:ltr; text-align:right;">${j.judgmentDate || '---'}</td>
                    <td>${appeal?.court || j.court || '---'}</td>
                    <td><span class="badge ${badgeClass}">${j.resultCategory || '---'}</span></td>
                    <td style="max-width:300px; font-size:0.9rem; color:var(--text-secondary);">${j.judgmentSummary || '---'}</td>
                    <td>${appeal?.plaintiff || '---'}</td>
                </tr>`;
        }).join('');
    },

    applyFilter: () => {
        let filtered = [...ReportsModule.allJudgments];
        
        const resultFilter = document.getElementById('filter-result')?.value;
        const monthFilter = document.getElementById('filter-month')?.value;
        const courtFilter = document.getElementById('filter-court')?.value?.toLowerCase();

        if(resultFilter) {
            filtered = filtered.filter(j => j.resultCategory === resultFilter);
        }
        if(monthFilter) {
            filtered = filtered.filter(j => j.judgmentDate && j.judgmentDate.startsWith(monthFilter));
        }
        if(courtFilter) {
            filtered = filtered.filter(j => {
                const appeal = ReportsModule.allAppeals.find(a => a.id === j.appealId);
                return appeal?.court?.toLowerCase().includes(courtFilter);
            });
        }

        ReportsModule.renderJudgmentStats(filtered);
        ReportsModule.renderJudgmentsTable(filtered);
    },

    populateAppealsSelect: () => {
        const select = document.getElementById('report-appeal-select');
        if(!select) return;
        select.innerHTML = '<option value="">--- اختر الطعن ---</option>';
        ReportsModule.allAppeals.forEach(a => {
            const opt = document.createElement('option');
            opt.value = a.id;
            opt.textContent = `طعن ${a.appealNumber} - ${a.plaintiff || ''}`;
            select.appendChild(opt);
        });
    },

    generateDetailedCaseReport: async (appealId) => {
        const output = document.getElementById('case-report-output');
        if(!output) return;
        output.innerHTML = `<div style="padding:40px; text-align:center;"><i class="fas fa-spinner fa-spin"></i> جاري تجميع بيانات الطعن...</div>`;

        try {
            const appeal = ReportsModule.allAppeals.find(a => a.id === appealId);
            if(!appeal) { output.innerHTML = '<p style="color:var(--danger-color);">لم يتم العثور على بيانات هذا الطعن.</p>'; return; }

            const sessSnap = await getDocs(query(collection(db, "sessions"), orderBy("sessionDate", "asc")));
            const sessions = [];
            sessSnap.forEach(d => { if(d.data().appealId === appealId || d.data().appealNumber === appeal.appealNumber) sessions.push(d.data()); });

            const judSnap = await getDocs(collection(db, "judgments"));
            const judgments = [];
            judSnap.forEach(d => { if(d.data().appealId === appealId) judgments.push(d.data()); });

            const statusBadge = appeal.status === 'متداول' ? 'badge-info' : (appeal.status === 'منتهي' ? 'badge-success' : 'badge-warning');

            output.innerHTML = `
                <div style="border:1px solid var(--border-color); border-radius:var(--radius-md); overflow:hidden; margin-top:10px;">
                    <!-- Report Header -->
                    <div style="background:var(--nav-bg); color:#fff; padding:25px; text-align:center;">
                        <h2 style="color:var(--accent-color); margin-bottom:5px;">تقرير مسار طعن</h2>
                        <h4 style="color:#fff; font-weight:400;">رقم الطعن: <strong style="color:var(--accent-color);">${appeal.appealNumber}</strong> &mdash; سنة ${appeal.year}</h4>
                    </div>
                    <!-- Appeal Details -->
                    <div style="padding:25px; display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:20px; background:var(--panel-bg);">
                        ${[
                            ['المحكمة / الدائرة', appeal.court],
                            ['الطاعن', appeal.plaintiff],
                            ['المطعون ضده', appeal.defendant],
                            ['موضوع الطعن', appeal.subject],
                        ].map(([label, val]) => `
                            <div>
                                <div style="font-size:0.8rem; color:var(--text-muted); font-weight:600; margin-bottom:4px;">${label}</div>
                                <div style="font-weight:600; color:var(--text-primary);">${val || '---'}</div>
                            </div>
                        `).join('')}
                        <div>
                            <div style="font-size:0.8rem; color:var(--text-muted); font-weight:600; margin-bottom:4px;">الحالة</div>
                            <span class="badge ${statusBadge}">${appeal.status}</span>
                        </div>
                    </div>

                    <!-- Sessions -->
                    <div style="padding:25px; border-top:1px solid var(--border-color);">
                        <h4 style="border-right:4px solid var(--accent-color); padding-right:12px; margin-bottom:15px;">سجل الجلسات (${sessions.length})</h4>
                        <table class="premium-table">
                            <thead><tr><th>التاريخ</th><th>نوع الجلسة</th><th>القرار والوقائع</th></tr></thead>
                            <tbody>
                                ${sessions.length > 0 ? sessions.map(s => `
                                    <tr>
                                        <td style="font-weight:bold; direction:ltr; text-align:right;">${s.sessionDate}</td>
                                        <td><span class="badge ${s.sessionType === 'حكم' ? 'badge-danger' : 'badge-warning'}">${s.sessionType}</span></td>
                                        <td style="font-size:0.9rem;">
                                            <strong>${s.agendaStatus || ''}</strong>
                                            ${s.facts ? `<br><span style="color:var(--text-secondary);">${s.facts}</span>` : ''}
                                        </td>
                                    </tr>
                                `).join('') : '<tr><td colspan="3" style="text-align:center; color:var(--text-muted);">لا توجد جلسات مسجلة</td></tr>'}
                            </tbody>
                        </table>
                    </div>

                    <!-- Judgments -->
                    ${judgments.length > 0 ? `
                    <div style="padding:25px; border-top:1px solid var(--border-color);">
                        <h4 style="border-right:4px solid var(--success-color); padding-right:12px; margin-bottom:15px;">الأحكام الصادرة (${judgments.length})</h4>
                        ${judgments.map(j => `
                            <div style="background:${j.resultCategory === 'لصالحنا' ? '#f0fdf4' : '#fef2f2'}; border:1px solid ${j.resultCategory === 'لصالحنا' ? '#bbf7d0' : '#fecaca'}; padding:20px; border-radius:8px; margin-bottom:15px;">
                                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                                    <strong><i class="fas fa-gavel" style="color:var(--accent-color);"></i> حكم بتاريخ: ${j.judgmentDate}</strong>
                                    <span class="badge ${j.resultCategory === 'لصالحنا' ? 'badge-success' : 'badge-danger'}">${j.resultCategory}</span>
                                </div>
                                <p style="line-height:1.8; color:var(--text-primary);">${j.judgmentSummary}</p>
                            </div>
                        `).join('')}
                    </div>` : ''}

                    <!-- Footer -->
                    <div style="padding:15px 25px; background:var(--bg-color); border-top:1px solid var(--border-color); display:flex; justify-content:space-between; font-size:0.85rem; color:var(--text-muted);">
                        <span>تم إنشاء التقرير بتاريخ: ${new Date().toLocaleDateString('ar-EG')}</span>
                        <button onclick="window.print()" class="btn" style="padding:5px 15px; font-size:0.8rem; background:var(--nav-bg); color:#fff;"><i class="fas fa-print"></i> طباعة</button>
                    </div>
                </div>
            `;
        } catch(e) {
            console.error(e);
            output.innerHTML = '<p style="color:var(--danger-color);">حدث خطأ أثناء تحميل التقرير.</p>';
        }
    },

    bindEvents: () => {
        // Initial render
        ReportsModule.renderJudgmentsTable(ReportsModule.allJudgments);
        ReportsModule.populateAppealsSelect();

        document.getElementById('apply-filter-btn')?.addEventListener('click', ReportsModule.applyFilter);
        
        document.getElementById('reset-filter-btn')?.addEventListener('click', () => {
            document.getElementById('filter-result').value = '';
            document.getElementById('filter-month').value = '';
            document.getElementById('filter-court').value = '';
            ReportsModule.renderJudgmentStats(ReportsModule.allJudgments);
            ReportsModule.renderJudgmentsTable(ReportsModule.allJudgments);
        });

        document.getElementById('generate-case-report')?.addEventListener('click', () => {
            const val = document.getElementById('report-appeal-select').value;
            if(val) ReportsModule.generateDetailedCaseReport(val);
            else UI.showToast("يرجى اختيار طعن من القائمة", "error");
        });
    }
};
