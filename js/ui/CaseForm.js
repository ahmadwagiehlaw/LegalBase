import { collectCaseSuggestions, datalistMarkup } from './FieldOptions.js';

export class CaseForm {
    constructor(container, app, onSubmit) {
        this.container = container;
        this.app = app;
        this.onSubmit = onSubmit;
    }

    render(caseData = null) {
        const isEdit = !!caseData;
        const settings = this.app?.storage?.loadSettings() || {};
        const cases = this.app?.storage?.loadCases?.() || [];
        const suggestions = collectCaseSuggestions(cases, settings);
        const defaultCourt = settings.defaultCourt || '';
        const selectedCourt = isEdit ? caseData.court : defaultCourt;

        this.container.innerHTML = `
            <div class="form-wrapper slide-in">
                <div class="form-header">
                    <h2>${isEdit ? 'تعديل قضية' : 'إضافة قضية جديدة'}</h2>
                    <button class="btn btn-close" id="close-form"><ion-icon name="close-outline"></ion-icon></button>
                </div>

                <form id="case-form">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>رقم الدعوى</label>
                            <input type="text" name="caseNumber" value="${caseData?.caseNumber || ''}" required placeholder="مثال: 1234">
                        </div>

                        <div class="form-group">
                            <label>السنة القضائية</label>
                            <input type="number" name="year" value="${caseData?.year || new Date().getFullYear()}" required>
                        </div>

                        <div class="form-group">
                            <label>المحكمة</label>
                            <input type="text" name="court" list="case-form-courts" value="${selectedCourt || ''}" required placeholder="اختر أو اكتب المحكمة">
                            ${datalistMarkup('case-form-courts', suggestions.courts)}
                        </div>

                        <div class="form-group">
                            <label>الدائرة</label>
                            <input type="text" name="circuit" list="case-form-circuits" value="${caseData?.circuit || ''}" placeholder="رقم أو اسم الدائرة">
                            ${datalistMarkup('case-form-circuits', suggestions.circuits)}
                        </div>

                        <div class="form-group">
                            <label>المدعي / الطاعن</label>
                            <input type="text" name="plaintiff" list="case-form-plaintiffs" value="${caseData?.plaintiff || (caseData?.parties?.[0] || '')}" placeholder="اسم المدعي">
                            ${datalistMarkup('case-form-plaintiffs', suggestions.plaintiffs)}
                        </div>

                        <div class="form-group">
                            <label>المدعى عليه / المطعون ضده</label>
                            <input type="text" name="defendant" list="case-form-defendants" value="${caseData?.defendant || (caseData?.parties?.[1] || '')}" placeholder="اسم المدعى عليه">
                            ${datalistMarkup('case-form-defendants', suggestions.defendants)}
                        </div>

                        <div class="form-group">
                            <label>الجهة الممثلة / صفتنا</label>
                            <input type="text" name="userRole" list="case-form-representations" value="${caseData?.userRole || ''}" placeholder="اختر أو اكتب الصفة القانونية">
                            ${datalistMarkup('case-form-representations', suggestions.representations)}
                        </div>

                        <div class="form-group">
                            <label>مكان الملف</label>
                            <input type="text" name="fileLocation" value="${caseData?.fileLocation || ''}" placeholder="مكان حفظ الملف">
                        </div>

                        <div class="form-group full-width">
                            <label>الموضوع (مختصر)</label>
                            <input type="text" name="subject" list="case-form-subjects" value="${caseData?.subject || ''}" placeholder="موضوع الدعوى باختصار...">
                            ${datalistMarkup('case-form-subjects', suggestions.subjects)}
                        </div>
                    </div>

                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">
                            <ion-icon name="save-outline"></ion-icon>
                            حفظ القضية
                        </button>
                    </div>
                </form>
            </div>
        `;

        this.setupEvents(isEdit ? caseData.id : null, caseData);
    }

    close() {
        this.container.innerHTML = '';
    }

    setupEvents(caseId, existingCase = null) {
        const form = this.container.querySelector('#case-form');
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const formData = new FormData(form);
            const plaintiff = String(formData.get('plaintiff') || '').trim();
            const defendant = String(formData.get('defendant') || '').trim();

            const data = {
                ...(existingCase || {}),
                id: caseId || crypto.randomUUID(),
                caseNumber: String(formData.get('caseNumber') || '').trim(),
                year: String(formData.get('year') || '').trim(),
                court: String(formData.get('court') || '').trim(),
                circuit: String(formData.get('circuit') || '').trim(),
                plaintiff,
                defendant,
                parties: [plaintiff, defendant].filter(Boolean),
                userRole: String(formData.get('userRole') || '').trim(),
                subject: String(formData.get('subject') || '').trim(),
                fileLocation: String(formData.get('fileLocation') || '').trim(),
                baseStatus: existingCase?.baseStatus || 'active',
                operationalStatus: existingCase?.operationalStatus || 'new',
                nextAction: existingCase?.nextAction || 'تحديد أول جلسة'
            };

            this.onSubmit(data);
            this.close();
        });

        this.container.querySelector('#close-form')?.addEventListener('click', () => this.close());
    }
}
