import { Session } from '../core/Models.js';
import { GoogleDriveIntegration } from '../data/GoogleDrive.js';
import { openOptionListModal } from './OptionListModal.js';

const DEFAULT_FILE_LOCATIONS = [
    'في المكتب',
    'لا ملف',
    'غير موجود',
    'شعبة التنفيذ',
    'مع الموظف',
    'خارج الاختصاص',
    'وارد مكتب فني',
    'ملف مؤقت',
    'غير محدد'
];

const FILE_LOCATION_META = {
    'في المكتب': { icon: 'business-outline', tone: 'success' },
    'لا ملف': { icon: 'alert-circle-outline', tone: 'danger' },
    'غير موجود': { icon: 'help-circle-outline', tone: 'danger' },
    'شعبة التنفيذ': { icon: 'hammer-outline', tone: 'warning' },
    'مع الموظف': { icon: 'person-outline', tone: 'info' },
    'خارج الاختصاص': { icon: 'navigate-outline', tone: 'danger' },
    'وارد مكتب فني': { icon: 'mail-outline', tone: 'warning' },
    'ملف مؤقت': { icon: 'time-outline', tone: 'warning' },
    'غير محدد': { icon: 'remove-circle-outline', tone: 'muted' }
};

export class CaseDetailsView {
    constructor(container, app, caseId) {
        this.container = container;
        this.app = app;
        this.caseId = caseId;
        this.activeTab = 'judicial';
        this.caseData = this.app.storage.loadCases().find((caseData) => caseData.id === caseId);
        if (this.caseData && !Array.isArray(this.caseData.attachments)) this.caseData.attachments = [];
        if (this.caseData && !Array.isArray(this.caseData.sessions)) this.caseData.sessions = [];
        if (this.caseData && !Array.isArray(this.caseData.analyses)) this.caseData.analyses = [];
    }

    formatDate(value) {
        if (!value) return '---';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
    }

    getStatusClass(status) {
        const map = {
            new: 'status-success',
            suspended_administrative: 'status-warning',
            struck_out: 'status-danger',
            active: 'status-success'
        };
        return map[status] || 'status-default';
    }

    getSortedSessions() {
        return [...(this.caseData.sessions || [])].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    }

    getFileLocationOptions() {
        const settings = this.app.storage.loadSettings() || {};
        const fromSettings = settings.fileLocationOptions || [];
        return [...new Set([...DEFAULT_FILE_LOCATIONS, ...fromSettings].map((value) => String(value || '').trim()).filter(Boolean))];
    }

    saveFileLocationOptions(values = []) {
        const settings = this.app.storage.loadSettings() || {};
        settings.fileLocationOptions = [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
        this.app.storage.saveSettings(settings);
    }

    getFileLocationMeta(value) {
        const normalized = String(value || '').trim() || 'غير محدد';
        return FILE_LOCATION_META[normalized] || { icon: 'folder-open-outline', tone: 'info' };
    }

    renderAttachmentsList() {
        const listContainer = this.container.querySelector('#attachments-list');
        if (!listContainer) return;

        if (!this.caseData.attachments.length) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <ion-icon name="folder-outline"></ion-icon>
                    <p>لا توجد مرفقات مسجلة حاليًا.</p>
                </div>`;
            return;
        }

        listContainer.innerHTML = `
            <ul class="settings-list">
                ${this.caseData.attachments.map((attachment, index) => `
                    <li>
                        <div style="display:flex; align-items:center; gap:8px;">
                            <ion-icon name="document-attach-outline"></ion-icon>
                            <a href="${attachment.link}" target="_blank" style="color:var(--text-main); text-decoration:none;">${attachment.fileName}</a>
                        </div>
                        <button class="btn-icon text-danger attachment-delete-btn" data-index="${index}" title="حذف الرابط"><ion-icon name="trash-outline"></ion-icon></button>
                    </li>
                `).join('')}
            </ul>
        `;

        listContainer.querySelectorAll('.attachment-delete-btn').forEach((button) => {
            button.addEventListener('click', (event) => {
                if (!confirm('هل أنت متأكد من حذف رابط المرفق؟')) return;
                const index = Number(event.currentTarget.dataset.index);
                this.caseData.attachments.splice(index, 1);
                this.saveCase();
                this.renderAttachmentsList();
            });
        });
    }

    renderSessionsList() {
        const listContainer = this.container.querySelector('#sessions-list');
        if (!listContainer) return;

        const sessions = this.getSortedSessions();
        if (!sessions.length) {
            listContainer.innerHTML = `
                <div class="empty-state">
                    <ion-icon name="calendar-outline"></ion-icon>
                    <p>لم يتم تسجيل أي جلسات بعد.</p>
                </div>
            `;
            return;
        }

        listContainer.innerHTML = `
            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>التاريخ</th>
                            <th>نوع الجلسة</th>
                            <th>القرار</th>
                            <th>ملاحظات</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sessions.map((session) => `
                            <tr>
                                <td>${this.formatDate(session.date)}</td>
                                <td>${session.type || '-'}</td>
                                <td>${session.decision || '-'}</td>
                                <td>${session.notes || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    renderAnalysesList() {
        const container = this.container.querySelector('#analysis-list');
        if (!container) return;

        const items = [...(this.caseData.analyses || [])].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        if (!items.length) {
            container.innerHTML = `
                <div class="empty-state">
                    <ion-icon name="document-text-outline"></ion-icon>
                    <p>لا توجد ملاحظات أو تحليلات مسجلة لهذا الملف.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="analysis-list">
                ${items.map((item) => `
                    <article class="analysis-item" data-analysis-id="${item.id}">
                        <header>
                            <strong>${item.title || 'تحليل قانوني'}</strong>
                            <span>${this.formatDate(item.createdAt)}</span>
                        </header>
                        <p>${item.content || '-'}</p>
                        <footer>
                            <button type="button" class="btn-icon text-danger btn-delete-analysis" title="حذف التحليل">
                                <ion-icon name="trash-outline"></ion-icon>
                            </button>
                        </footer>
                    </article>
                `).join('')}
            </div>
        `;

        container.querySelectorAll('.btn-delete-analysis').forEach((button) => {
            button.addEventListener('click', (event) => {
                const row = event.currentTarget.closest('.analysis-item');
                if (!row) return;
                const id = row.dataset.analysisId;
                this.caseData.analyses = (this.caseData.analyses || []).filter((analysis) => analysis.id !== id);
                this.saveCase();
                this.renderAnalysesList();
            });
        });
    }

    saveCase(notify = true) {
        const cases = this.app.storage.loadCases() || [];
        const index = cases.findIndex((caseData) => caseData.id === this.caseId);
        if (index > -1) {
            cases[index] = this.caseData;
            this.app.storage.saveCases(cases);
            if (notify) document.dispatchEvent(new CustomEvent('cases-updated'));
        }
    }

    syncSessionSummary() {
        const sessions = this.getSortedSessions();
        if (!sessions.length) return;

        const latestSession = sessions[0];
        const previousSession = sessions[1];

        this.caseData.lastSessionDate = latestSession.date || '';
        this.caseData.previousSessionDate = previousSession?.date || '';
        this.caseData.latestSessionType = latestSession.type || '';
        this.caseData.latestDecision = latestSession.decision || this.caseData.latestDecision || '';
    }

    applySessionEffects(session) {
        const effects = this.app.engine.processEvent('session', session, this.caseData);
        effects.forEach((effect) => {
            if (effect.operationalStatus) this.caseData.operationalStatus = effect.operationalStatus;
            if (effect.nextAction) this.caseData.nextAction = effect.nextAction;
            if (effect.tasks) this.caseData.tasks = [...(this.caseData.tasks || []), ...effect.tasks];
            if (effect.reminders) this.caseData.reminders = [...(this.caseData.reminders || []), ...effect.reminders];
        });
    }

    async uploadToDrive(file) {
        const drive = new GoogleDriveIntegration(this.app);
        return drive.uploadFile(file);
    }

    openAnalysisModal() {
        const overlay = document.createElement('div');
        overlay.className = 'popup-overlay';
        overlay.innerHTML = `
            <div class="popup-card" style="width:min(680px, 100%);">
                <div class="popup-header">
                    <div>
                        <h3>إضافة تحليل</h3>
                        <p>أضف التحليل القانوني أو ملاحظات الفريق على ملف الطعن.</p>
                    </div>
                    <button type="button" class="btn-icon popup-close-btn"><ion-icon name="close-outline"></ion-icon></button>
                </div>
                <form class="popup-body" id="analysis-form">
                    <div class="form-grid">
                        <div class="form-group full-width">
                            <label>عنوان التحليل</label>
                            <input type="text" name="title" placeholder="مثال: دفوع شكلية قبل الجلسة القادمة">
                        </div>
                        <div class="form-group full-width">
                            <label>محتوى التحليل</label>
                            <textarea name="content" rows="8" required placeholder="اكتب التحليل هنا..."></textarea>
                        </div>
                    </div>
                </form>
                <div class="popup-footer">
                    <button type="button" class="btn btn-secondary popup-cancel-btn">إلغاء</button>
                    <button type="submit" form="analysis-form" class="btn btn-primary">حفظ التحليل</button>
                </div>
            </div>
        `;

        const close = () => overlay.remove();
        overlay.querySelector('.popup-close-btn')?.addEventListener('click', close);
        overlay.querySelector('.popup-cancel-btn')?.addEventListener('click', close);
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) close();
        });

        overlay.querySelector('#analysis-form')?.addEventListener('submit', (event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const content = String(formData.get('content') || '').trim();
            if (!content) return;

            const analysis = {
                id: crypto.randomUUID(),
                title: String(formData.get('title') || '').trim(),
                content,
                createdAt: new Date().toISOString()
            };

            this.caseData.analyses = [analysis, ...(this.caseData.analyses || [])];
            this.saveCase();
            close();
            this.render('notes');
        });

        document.body.appendChild(overlay);
        overlay.querySelector('textarea[name="content"]')?.focus();
    }

    renderPrintableReport() {
        const sessions = this.getSortedSessions();
        const analyses = this.caseData.analyses || [];
        const attachments = this.caseData.attachments || [];
        const plaintiff = this.caseData.plaintiff || this.caseData.parties?.[0] || 'غير محدد';
        const defendant = this.caseData.defendant || this.caseData.parties?.[1] || 'غير محدد';
        const fileLocation = this.caseData.fileLocation || 'غير محدد';
        const locationMeta = this.getFileLocationMeta(fileLocation);
        const fileLocationOptions = this.getFileLocationOptions();

        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8" />
                <title>تقرير ملف القضية ${this.caseData.caseNumber || ''}</title>
                <style>
                    body { font-family: "Cairo", Arial, sans-serif; padding: 24px; color: #111827; }
                    h1 { margin: 0 0 14px; font-size: 28px; }
                    h2 { margin-top: 24px; font-size: 20px; border-bottom: 1px solid #d1d5db; padding-bottom: 6px; }
                    .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-bottom: 16px; }
                    .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; background: #f9fafb; }
                    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                    th, td { border: 1px solid #e5e7eb; padding: 8px; text-align: right; }
                    th { background: #f3f4f6; }
                    .item { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px; margin-top: 10px; }
                    .muted { color: #6b7280; font-size: 12px; }
                </style>
            </head>
            <body>
                <h1>تقرير شامل - ملف القضية: ${this.caseData.caseNumber || '-'} ${this.caseData.year ? ` / ${this.caseData.year}` : ''}</h1>
                <div class="meta">
                    <div class="card"><strong>المدعي/الطاعن:</strong><br>${plaintiff}</div>
                    <div class="card"><strong>المدعى عليه:</strong><br>${defendant}</div>
                    <div class="card"><strong>المحكمة/الدائرة:</strong><br>${this.caseData.court || '-'}</div>
                    <div class="card"><strong>مكان الملف:</strong><br>${this.caseData.fileLocation || 'غير محدد'}</div>
                </div>

                <h2>الجلسات</h2>
                <table>
                    <thead><tr><th>التاريخ</th><th>النوع</th><th>القرار</th><th>ملاحظات</th></tr></thead>
                    <tbody>
                        ${sessions.length ? sessions.map((session) => `
                            <tr>
                                <td>${this.formatDate(session.date)}</td>
                                <td>${session.type || '-'}</td>
                                <td>${session.decision || '-'}</td>
                                <td>${session.notes || '-'}</td>
                            </tr>
                        `).join('') : '<tr><td colspan="4">لا توجد جلسات</td></tr>'}
                    </tbody>
                </table>

                <h2>التحليلات</h2>
                ${analyses.length ? analyses.map((analysis) => `
                    <div class="item">
                        <strong>${analysis.title || 'تحليل قانوني'}</strong>
                        <div class="muted">${this.formatDate(analysis.createdAt)}</div>
                        <p>${analysis.content || '-'}</p>
                    </div>
                `).join('') : '<div class="item">لا توجد تحليلات.</div>'}

                <h2>المرفقات</h2>
                ${attachments.length ? attachments.map((attachment) => `
                    <div class="item">
                        <strong>${attachment.fileName || 'مرفق'}</strong><br>
                        <span class="muted">${attachment.link || '-'}</span>
                    </div>
                `).join('') : '<div class="item">لا توجد مرفقات.</div>'}

                <script>window.print();</script>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    openSessionModal() {
        const overlay = document.createElement('div');
        overlay.className = 'popup-overlay';
        overlay.innerHTML = `
            <div class="popup-card" style="width:min(560px, 100%);">
                <div class="popup-header">
                    <div>
                        <h3>إضافة جلسة جديدة</h3>
                        <p>سيتم تحديث آخر جلسة والجلسة السابقة وقرار القضية تلقائيًا.</p>
                    </div>
                    <button type="button" class="btn-icon popup-close-btn"><ion-icon name="close-outline"></ion-icon></button>
                </div>
                <form class="popup-body" id="session-form">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>تاريخ الجلسة</label>
                            <input type="date" name="date" required>
                        </div>
                        <div class="form-group">
                            <label>نوع الجلسة</label>
                            <input type="text" name="type" value="${this.caseData.latestSessionType || ''}" placeholder="مثال: فحص" list="session-type-options">
                            <datalist id="session-type-options">
                                ${['فحص', 'موضوع', 'تحضيرية', 'مرافعة', 'حجز للحكم', 'خبراء', 'مفوضين'].map((item) => `<option value="${item}"></option>`).join('')}
                            </datalist>
                        </div>
                        <div class="form-group full-width">
                            <label>القرار / ما تم</label>
                            <textarea name="decision" rows="3" placeholder="اكتب القرار أو الإجراء الذي تم في الجلسة...">${this.caseData.latestDecision || ''}</textarea>
                        </div>
                        <div class="form-group full-width">
                            <label>ملاحظات</label>
                            <textarea name="notes" rows="3" placeholder="أي ملاحظات إضافية..."></textarea>
                        </div>
                    </div>
                </form>
                <div class="popup-footer">
                    <button type="button" class="btn btn-secondary popup-cancel-btn">إلغاء</button>
                    <button type="submit" form="session-form" class="btn btn-primary">حفظ الجلسة</button>
                </div>
            </div>
        `;

        const close = () => overlay.remove();

        overlay.querySelector('.popup-close-btn')?.addEventListener('click', close);
        overlay.querySelector('.popup-cancel-btn')?.addEventListener('click', close);
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) close();
        });

        overlay.querySelector('#session-form')?.addEventListener('submit', (event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            const session = new Session({
                caseId: this.caseId,
                date: String(formData.get('date') || '').trim(),
                type: String(formData.get('type') || '').trim(),
                decision: String(formData.get('decision') || '').trim(),
                notes: String(formData.get('notes') || '').trim()
            });

            if (!session.date) return;

            if (!Array.isArray(this.caseData.sessions)) {
                this.caseData.sessions = [];
            }

            this.caseData.sessions.unshift(session);
            this.syncSessionSummary();
            this.applySessionEffects(session);
            this.saveCase();
            close();
            this.render('sessions');
        });

        document.body.appendChild(overlay);
        overlay.querySelector('input[name="date"]')?.focus();
    }

    render(activeTab = this.activeTab) {
        if (!this.caseData) {
            this.container.innerHTML = `<div class="empty-msg text-center">القضية غير موجودة</div>`;
            return;
        }

        this.activeTab = activeTab;

        const plaintiff = this.caseData.plaintiff || this.caseData.parties?.[0] || 'غير محدد';
        const defendant = this.caseData.defendant || this.caseData.parties?.[1] || 'غير محدد';

        const fileLocation = this.caseData.fileLocation || 'غير محدد';
        const locationMeta = this.getFileLocationMeta(fileLocation);
        const fileLocationOptions = this.getFileLocationOptions();

        this.container.innerHTML = `
            <div class="case-details-page fade-in">
                <div class="case-header-card">
                    <div class="case-banner ${this.caseData.bannerImage?.link ? 'has-image' : ''}">
                        ${this.caseData.bannerImage?.link ? `<img src="${this.caseData.bannerImage.link}" alt="صورة بارزة لملف الطعن">` : '<div class="case-banner-placeholder"><ion-icon name="image-outline"></ion-icon><span>لا توجد صورة بارزة لهذا الملف</span></div>'}
                        <input type="file" id="banner-file-input" accept="image/*" style="display:none;" />
                        <div class="case-banner-actions">
                            <button class="btn btn-secondary" id="btn-banner-upload"><ion-icon name="cloud-upload-outline"></ion-icon> ${this.caseData.bannerImage?.link ? 'تغيير صورة البانر' : 'إضافة صورة بانر'}</button>
                            ${this.caseData.bannerImage?.link ? '<button class="btn btn-secondary" id="btn-banner-remove"><ion-icon name="trash-outline"></ion-icon> إزالة</button>' : ''}
                        </div>
                    </div>

                    <div class="header-top">
                        <button class="btn-icon" id="btn-back"><ion-icon name="arrow-forward-outline"></ion-icon></button>
                        <div class="actions-right">
                            <span class="badge-status ${this.getStatusClass(this.caseData.operationalStatus)}">
                                ${this.caseData.operationalStatus === 'new' ? 'متداول' : this.caseData.operationalStatus}
                            </span>
                            <button class="btn btn-warning" id="btn-print-case-report"><ion-icon name="print-outline"></ion-icon> تقرير شامل للطباعة</button>
                        </div>
                    </div>

                    <h1 class="case-title">ملف القضية: ${this.caseData.caseNumber}${this.caseData.year ? ` / ${this.caseData.year}` : ''}</h1>

                    <div class="litigants-grid">
                        <div class="litigant-box">
                            <span class="label">المدعي / الطاعن</span>
                            <span class="value">${plaintiff}</span>
                            ${this.caseData.plaintiffAddress ? `<span class="sub-value" style="font-size: 0.8em; color: var(--text-muted); display: block; margin-top: 4px;"><ion-icon name="location-outline"></ion-icon> ${this.caseData.plaintiffAddress}</span>` : ''}
                        </div>
                        <div class="litigant-box">
                            <span class="label">المدعى عليه</span>
                            <span class="value">${defendant}${this.caseData.otherDefendants?.length ? ' وآخرين' : ''}</span>
                        </div>
                    </div>

                    <div class="file-location-hero tone-${locationMeta.tone}">
                        <div class="file-location-main">
                            <span class="file-location-icon"><ion-icon name="${locationMeta.icon}"></ion-icon></span>
                            <div>
                                <div class="file-location-label">مكان الملف</div>
                                <div class="file-location-value">${fileLocation}</div>
                            </div>
                        </div>
                        <div class="file-location-actions">
                            <select id="file-location-select" class="file-location-select">
                                ${fileLocationOptions.map((option) => `<option value="${option}" ${option === fileLocation ? 'selected' : ''}>${option}</option>`).join('')}
                            </select>
                            <button type="button" class="btn btn-secondary" id="btn-edit-file-location-options">
                                <ion-icon name="settings-outline"></ion-icon>
                                تعديل القائمة
                            </button>
                        </div>
                    </div>

                    <div class="case-meta-bar" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--glass-border);">
                        <div class="meta-item">
                            <span class="label">آخر قرار</span>
                            <span class="value" style="color: var(--primary);">${this.caseData.latestDecision || '---'}</span>
                        </div>
                        <div class="meta-item">
                            <span class="label">الجلسة القادمة/الأخيرة</span>
                            <span class="value">${this.formatDate(this.caseData.lastSessionDate)}</span>
                        </div>
                    </div>
                </div>

                <div class="case-tabs">
                    <button class="tab-btn ${this.activeTab === 'judicial' ? 'active' : ''}" data-tab="judicial"><ion-icon name="scale-outline"></ion-icon> التفاصيل القضائية</button>
                    <button class="tab-btn ${this.activeTab === 'notes' ? 'active' : ''}" data-tab="notes"><ion-icon name="document-text-outline"></ion-icon> الملاحظات والتحليل</button>
                    <button class="tab-btn ${this.activeTab === 'attachments' ? 'active' : ''}" data-tab="attachments"><ion-icon name="folder-open-outline"></ion-icon> المرفقات</button>
                    <button class="tab-btn ${this.activeTab === 'sessions' ? 'active' : ''}" data-tab="sessions"><ion-icon name="calendar-outline"></ion-icon> الجلسات</button>
                </div>

                <div class="tab-content ${this.activeTab === 'judicial' ? '' : 'hidden'}" id="tab-judicial">
                    <div class="judicial-info-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px;">
                        <div class="info-card" style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: 12px; border: 1px solid var(--glass-border);">
                            <h4 style="margin-bottom: 16px; color: var(--primary); border-bottom: 1px solid var(--glass-border); padding-bottom: 8px;">البيانات الأساسية</h4>
                            <div class="data-row" style="margin-bottom: 12px;"><span class="label" style="color: var(--text-muted); display:block; font-size: 0.85em;">موضوع الطعن</span><span class="value">${this.caseData.subject || '---'}</span></div>
                            <div class="data-row" style="margin-bottom: 12px;"><span class="label" style="color: var(--text-muted); display:block; font-size: 0.85em;">المحكمة / الدائرة</span><span class="value">${this.caseData.court || '---'}</span></div>
                            <div class="data-row" style="margin-bottom: 12px;"><span class="label" style="color: var(--text-muted); display:block; font-size: 0.85em;">المقر المختار</span><span class="value">${this.caseData.chosenHeadquarters || '---'}</span></div>
                        </div>

                        <div class="info-card" style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: 12px; border: 1px solid var(--glass-border);">
                            <h4 style="margin-bottom: 16px; color: var(--primary); border-bottom: 1px solid var(--glass-border); padding-bottom: 8px;">الموقف الإجرائي والجلسات</h4>
                            <div class="grid-2" style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                                <div class="data-row"><span class="label" style="color: var(--text-muted); display:block; font-size: 0.85em;">الجلسة السابقة</span><span class="value">${this.formatDate(this.caseData.previousSessionDate)}</span></div>
                                <div class="data-row"><span class="label" style="color: var(--text-muted); display:block; font-size: 0.85em;">نوع الجلسة</span><span class="value">${this.caseData.latestSessionType || '---'}</span></div>
                            </div>
                            <div class="data-row" style="margin-top: 12px;"><span class="label" style="color: var(--text-muted); display:block; font-size: 0.85em;">تحضير الجلسة / المطلوب</span><span class="value">${this.caseData.sessionPreparation || '---'}</span></div>
                            <div class="data-row" style="margin-top: 12px;"><span class="label" style="color: var(--text-muted); display:block; font-size: 0.85em;">طلبات الإطلاع</span><span class="value">${this.caseData.viewRequests || '---'}</span></div>
                        </div>

                        <div class="info-card" style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: 12px; border: 1px solid var(--glass-border); grid-column: 1 / -1;">
                            <h4 style="margin-bottom: 16px; color: var(--primary); border-bottom: 1px solid var(--glass-border); padding-bottom: 8px;">منطوق الحكم والتصنيف</h4>
                            <div class="judgment-details" style="display: flex; gap: 40px; flex-wrap: wrap;">
                                <div style="flex: 2;">
                                    <span class="label" style="color: var(--text-muted); display:block; font-size: 0.85em; margin-bottom: 4px;">منطوق الحكم</span>
                                    <p style="line-height: 1.6; font-size: 1.1em;">${this.caseData.judgmentPronouncement || 'لا يوجد حكم مسجل بعد.'}</p>
                                </div>
                                <div style="flex: 1; border-right: 1px solid var(--glass-border); padding-right: 20px;">
                                    <div class="data-row" style="margin-bottom: 16px;"><span class="label" style="color: var(--text-muted); display:block; font-size: 0.85em;">الحكم (مختصر)</span><span class="value" style="font-weight: 700; font-size: 1.2em;">${this.caseData.judgmentBrief || '---'}</span></div>
                                    <div class="data-row"><span class="label" style="color: var(--text-muted); display:block; font-size: 0.85em;">تصنيف الحكم إحصائيًا</span><span class="badge-status ${this.caseData.judgmentClassification === 'صالح' ? 'status-success' : 'status-warning'}">${this.caseData.judgmentClassification || 'غير مصنف'}</span></div>
                                </div>
                            </div>
                        </div>

                        ${this.caseData.joinedCases?.length ? `
                            <div class="info-card" style="background: rgba(255,255,255,0.03); padding: 20px; border-radius: 12px; border: 1px solid var(--glass-border); grid-column: 1 / -1;">
                                <h4 style="margin-bottom: 16px; color: var(--warning); border-bottom: 1px solid var(--glass-border); padding-bottom: 8px;">دعاوى مرتبطة / مضمومة</h4>
                                <div style="display: flex; gap: 12px; flex-wrap: wrap;">
                                    ${this.caseData.joinedCases.map((item) => `<span class="badge-status status-default">${item}</span>`).join('')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="tab-content ${this.activeTab === 'notes' ? '' : 'hidden'}" id="tab-notes">
                    <div class="tab-header">
                        <h3>الملاحظات والتحليل الفني</h3>
                        <button class="btn btn-primary" id="btn-add-analysis"><ion-icon name="add-outline"></ion-icon> إضافة تحليل</button>
                    </div>
                    <div id="analysis-list"></div>
                </div>

                <div class="tab-content ${this.activeTab === 'attachments' ? '' : 'hidden'}" id="tab-attachments">
                    <div class="tab-header">
                        <h3>مرفقات وملفات الدعوى (Google Drive)</h3>
                        <input type="file" id="drive-file-input" style="display:none;" />
                        <button class="btn btn-secondary" id="btn-drive-upload"><ion-icon name="cloud-upload-outline"></ion-icon> رفع للمسار السحابي</button>
                    </div>
                    <div id="attachments-list"></div>
                </div>

                <div class="tab-content ${this.activeTab === 'sessions' ? '' : 'hidden'}" id="tab-sessions">
                    <div class="tab-header">
                        <h3>الأجندة وجلسات المحكمة</h3>
                        <button class="btn btn-primary" id="btn-add-session"><ion-icon name="add-outline"></ion-icon> إضافة جلسة</button>
                    </div>
                    <div id="sessions-list"></div>
                </div>
            </div>
        `;

        this.renderAttachmentsList();
        this.renderSessionsList();
        this.renderAnalysesList();
        this.setupEvents();
    }

    setupEvents() {
        this.container.querySelector('#btn-back')?.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'cases' } }));
        });

        this.container.querySelector('#btn-print-case-report')?.addEventListener('click', () => {
            this.renderPrintableReport();
        });

        this.container.querySelector('#btn-add-session')?.addEventListener('click', () => {
            this.openSessionModal();
        });

        this.container.querySelector('#btn-add-analysis')?.addEventListener('click', () => {
            this.openAnalysisModal();
        });

        const fileLocationSelect = this.container.querySelector('#file-location-select');
        fileLocationSelect?.addEventListener('change', () => {
            this.caseData.fileLocation = String(fileLocationSelect.value || '').trim();
            this.saveCase();
            this.render(this.activeTab);
        });

        this.container.querySelector('#btn-edit-file-location-options')?.addEventListener('click', () => {
            openOptionListModal({
                title: 'تعديل قائمة مكان الملف',
                description: 'أضف حالات جديدة أو عدّل القائمة الحالية لمكان الملف.',
                values: this.getFileLocationOptions(),
                placeholder: 'أدخل حالة جديدة لمكان الملف',
                saveLabel: 'حفظ القائمة',
                onSave: (values) => {
                    const finalValues = values.length ? values : [...DEFAULT_FILE_LOCATIONS];
                    this.saveFileLocationOptions(finalValues);
                    if (!finalValues.includes(this.caseData.fileLocation)) {
                        this.caseData.fileLocation = finalValues[0] || 'غير محدد';
                        this.saveCase();
                    }
                    this.render(this.activeTab);
                }
            });
        });

        const tabs = this.container.querySelectorAll('.tab-btn');
        const contents = this.container.querySelectorAll('.tab-content');

        tabs.forEach((tab) => {
            tab.addEventListener('click', () => {
                this.activeTab = tab.dataset.tab;
                tabs.forEach((item) => item.classList.remove('active'));
                contents.forEach((content) => content.classList.add('hidden'));
                tab.classList.add('active');
                this.container.querySelector(`#tab-${tab.dataset.tab}`)?.classList.remove('hidden');
            });
        });

        const driveBtn = this.container.querySelector('#btn-drive-upload');
        const fileInput = this.container.querySelector('#drive-file-input');
        if (driveBtn && fileInput) {
            driveBtn.addEventListener('click', () => fileInput.click());

            fileInput.addEventListener('change', async (event) => {
                if (!event.target.files.length) return;

                const file = event.target.files[0];
                driveBtn.disabled = true;
                driveBtn.innerHTML = '<ion-icon name="sync-outline" class="spin"></ion-icon> جارٍ الرفع...';

                try {
                    const result = await this.uploadToDrive(file);

                    this.caseData.attachments.push({
                        fileId: result.fileId,
                        fileName: result.fileName,
                        link: result.webViewLink
                    });
                    this.saveCase();
                    this.renderAttachmentsList();
                    alert('تم رفع الملف بنجاح ودمجه مع بيانات القضية!');
                } catch (error) {
                    alert(error.message);
                } finally {
                    driveBtn.disabled = false;
                    driveBtn.innerHTML = '<ion-icon name="cloud-upload-outline"></ion-icon> رفع للمسار السحابي';
                    fileInput.value = '';
                }
            });
        }

        const bannerInput = this.container.querySelector('#banner-file-input');
        const bannerUploadBtn = this.container.querySelector('#btn-banner-upload');
        if (bannerInput && bannerUploadBtn) {
            bannerUploadBtn.addEventListener('click', () => bannerInput.click());
            bannerInput.addEventListener('change', async (event) => {
                if (!event.target.files.length) return;
                const file = event.target.files[0];
                bannerUploadBtn.disabled = true;
                bannerUploadBtn.innerHTML = '<ion-icon name="sync-outline" class="spin"></ion-icon> جاري رفع الصورة...';
                try {
                    const result = await this.uploadToDrive(file);
                    this.caseData.bannerImage = {
                        fileId: result.fileId,
                        fileName: result.fileName,
                        link: result.webViewLink
                    };
                    this.saveCase();
                    this.render(this.activeTab);
                } catch (error) {
                    alert(error.message);
                } finally {
                    bannerUploadBtn.disabled = false;
                    bannerInput.value = '';
                }
            });
        }

        this.container.querySelector('#btn-banner-remove')?.addEventListener('click', () => {
            this.caseData.bannerImage = null;
            this.saveCase();
            this.render(this.activeTab);
        });
    }
}
