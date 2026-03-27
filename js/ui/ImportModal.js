import { Case } from '../core/Models.js';

export class ImportModal {
    constructor(app, onImportComplete) {
        this.app = app;
        this.onImportComplete = onImportComplete;
        this.modalElement = null;
        this.excelData = null;
        this.excelHeaders = [];

        this.schemaFields = [
            { key: 'caseNumber', label: 'رقم الطعن/الدعوى', required: true, autoMatch: ['رقم', 'طعن', 'قضية', 'الدعوى'] },
            { key: 'year', label: 'السنة', required: true, autoMatch: ['سنة', 'عام', 'تاريخ'] },
            { key: 'court', label: 'المحكمة / الدائرة', required: false, autoMatch: ['محكمة', 'دائرة', 'جهة'] },
            { key: 'subject', label: 'موضوع الطعن', required: false, autoMatch: ['موضوع', 'جريمة', 'وصف'] },
            { key: 'plaintiff', label: 'المدعي / الطاعن', required: false, autoMatch: ['مدعي', 'طاعن', 'مستأنف', 'خصم'] },
            { key: 'plaintiffAddress', label: 'عنوان المدعي', required: false, autoMatch: ['عنوان', 'سكن', 'مكان'] },
            { key: 'defendant', label: 'المدعى عليه الأساسي', required: false, autoMatch: ['مدعى عليه', 'مطعون', 'ضده'] },
            { key: 'otherDefendants', label: 'مدعى عليهم آخرين', required: false, autoMatch: ['آخرين', 'باقي الخصوم'] },
            { key: 'fileLocation', label: 'مكان الملف', required: false, autoMatch: ['مكان', 'رف', 'موقع', 'ملف'] },
            { key: 'latestSessionType', label: 'نوع الجلسة', required: false, autoMatch: ['نوع', 'فحص', 'موضوع', 'مفوضين'] },
            { key: 'latestDecision', label: 'القرار (آخر قرار)', required: false, autoMatch: ['قرار', 'نتيجة', 'إجراء'] },
            { key: 'lastSessionDate', label: 'تاريخ آخر جلسة', required: false, autoMatch: ['آخر جلسة', 'الجلسة الأخيرة'] },
            { key: 'previousSessionDate', label: 'الجلسة السابقة', required: false, autoMatch: ['سابقة'] },
            { key: 'judgmentPronouncement', label: 'منطوق الحكم', required: false, autoMatch: ['منطوق', 'نص الحكم'] },
            { key: 'judgmentClassification', label: 'تصنيف الحكم (صالح/ضد)', required: false, autoMatch: ['تصنيف', 'إحصاء'] },
            { key: 'judgmentBrief', label: 'الحكم (مختصر)', required: false, autoMatch: ['حكم', 'نتيجة نهائية'] },
            { key: 'sessionPreparation', label: 'تحضير الجلسة', required: false, autoMatch: ['تحضير', 'تجهيز'] },
            { key: 'viewRequests', label: 'طلبات الإطلاع', required: false, autoMatch: ['إطلاع', 'مذكرة', 'طلب'] },
            { key: 'chosenHeadquarters', label: 'المقر المختار', required: false, autoMatch: ['مقر', 'مكتب', 'مختار'] },
            { key: 'joinedCases', label: 'دعاوى مضمومة', required: false, autoMatch: ['علاقة', 'ضم', 'مرتبط'] },
            { key: 'operationalStatus', label: 'الحالة الحالية', required: false, autoMatch: ['حالة', 'موقف'] }
        ];
    }

    render() {
        if (this.modalElement) this.modalElement.remove();

        this.modalElement = document.createElement('div');
        this.modalElement.className = 'modal-overlay';
        this.modalElement.innerHTML = `
            <div class="modal-content fade-in" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header">
                    <div style="display:flex; align-items:center;">
                        <h2><ion-icon name="color-wand-outline"></ion-icon> معالج استيراد البيانات القضائية</h2>
                    </div>
                    <button class="btn-icon" id="btn-close-import"><ion-icon name="close-outline"></ion-icon></button>
                </div>

                <div class="modal-body" id="import-step-1">
                    <p style="margin-bottom: 20px; color: var(--text-muted);">
                        ارفع ملف البيانات بصيغة Excel أو CSV. سيتم ربط الأعمدة تلقائيًا قدر الإمكان،
                        وأي دعوى لها نفس رقم الدعوى والسنة سيتم تحديثها بدل تكرارها.
                    </p>

                    <div class="upload-zone" id="upload-zone" style="border: 2px dashed var(--glass-border); border-radius: 12px; padding: 60px; text-align: center; cursor: pointer; transition: all 0.3s; background: rgba(0,0,0,0.1);">
                        <ion-icon name="document-attach-outline" style="font-size: 64px; color: var(--primary); margin-bottom: 16px;"></ion-icon>
                        <h3 style="margin-bottom: 8px;">اضغط هنا لاختيار الملف</h3>
                        <p style="color: var(--text-muted); font-size: 0.9em;">أو اسحب ملف Excel هنا</p>
                        <input type="file" id="excel-file-input" accept=".xlsx, .xls, .csv" style="display: none;">
                    </div>
                </div>

                <div class="modal-body" id="import-step-2" style="display: none;">
                    <div class="alert alert-info" style="margin-bottom: 24px; background: rgba(59, 130, 246, 0.1); border: 1px solid var(--primary);">
                        تمت قراءة <strong><span id="excel-row-count"></span></strong> صفًا من الملف.
                        راجع مطابقة الأعمدة قبل بدء المزامنة.
                    </div>

                    <div class="form-grid" id="mapping-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;"></div>

                    <div style="margin-top: 32px; display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid var(--glass-border); padding-top: 24px;">
                        <button class="btn btn-secondary" id="btn-back-step"><ion-icon name="arrow-forward-outline"></ion-icon> رجوع</button>
                        <button class="btn btn-primary" id="btn-confirm-import">بدء المزامنة <ion-icon name="cloud-upload-outline"></ion-icon></button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.modalElement);
        this.setupEvents();
    }

    setupEvents() {
        const modal = this.modalElement;
        const uploadZone = modal.querySelector('#upload-zone');
        const fileInput = modal.querySelector('#excel-file-input');

        modal.querySelector('#btn-close-import').addEventListener('click', () => {
            this.modalElement.remove();
        });

        uploadZone.addEventListener('click', () => fileInput.click());

        uploadZone.addEventListener('dragover', (event) => {
            event.preventDefault();
            uploadZone.style.borderColor = 'var(--primary)';
            uploadZone.style.background = 'rgba(59, 130, 246, 0.05)';
        });

        uploadZone.addEventListener('dragleave', () => {
            uploadZone.style.borderColor = 'var(--glass-border)';
            uploadZone.style.background = 'rgba(0,0,0,0.1)';
        });

        uploadZone.addEventListener('drop', (event) => {
            event.preventDefault();
            uploadZone.style.borderColor = 'var(--glass-border)';
            uploadZone.style.background = 'rgba(0,0,0,0.1)';
            if (event.dataTransfer.files.length) {
                this.handleFile(event.dataTransfer.files[0]);
            }
        });

        fileInput.addEventListener('change', (event) => {
            if (event.target.files.length) {
                this.handleFile(event.target.files[0]);
            }
        });

        modal.querySelector('#btn-back-step').addEventListener('click', () => {
            modal.querySelector('#import-step-2').style.display = 'none';
            modal.querySelector('#import-step-1').style.display = 'block';
            this.excelData = null;
        });

        modal.querySelector('#btn-confirm-import').addEventListener('click', () => {
            this.processImport();
        });
    }

    handleFile(file) {
        if (typeof XLSX === 'undefined') {
            alert('يجب الاتصال بالإنترنت لتحميل مكتبة القراءة (SheetJS).');
            return;
        }

        const uploadZone = this.modalElement.querySelector('#upload-zone');
        uploadZone.innerHTML = '<div style="padding: 20px;"><ion-icon name="sync-outline" class="spin" style="font-size: 48px; color: var(--primary);"></ion-icon><h3 style="margin-top:16px;">جارٍ تحليل الملف...</h3></div>';

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                this.excelData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

                if (this.excelData.length === 0) {
                    alert('الملف فارغ أو لا يحتوي على بيانات مقروءة.');
                    this.render();
                    return;
                }

                this.excelHeaders = Object.keys(this.excelData[0]);
                this.showMappingStep();
            } catch (error) {
                console.error(error);
                alert('تعذر قراءة الملف. يرجى التأكد من أنه ملف Excel صالح.');
                this.render();
            }
        };
        reader.readAsArrayBuffer(file);
    }

    showMappingStep() {
        const modal = this.modalElement;
        modal.querySelector('#import-step-1').style.display = 'none';
        modal.querySelector('#import-step-2').style.display = 'block';
        modal.querySelector('#excel-row-count').innerText = this.excelData.length;

        const grid = modal.querySelector('#mapping-grid');
        grid.innerHTML = '';

        const savedMapping = JSON.parse(localStorage.getItem('SLA_IMPORT_MAPPING') || '{}');

        this.schemaFields.forEach((field) => {
            let bestMatch = '';

            if (savedMapping[field.key] && this.excelHeaders.includes(savedMapping[field.key])) {
                bestMatch = savedMapping[field.key];
            } else {
                for (const header of this.excelHeaders) {
                    if (field.autoMatch.some((keyword) => header.toLowerCase().includes(keyword.toLowerCase()))) {
                        bestMatch = header;
                        break;
                    }
                }
            }

            const optionsHTML = `<option value="">-- تجاهل هذا الحقل --</option>` +
                this.excelHeaders.map((header) => `<option value="${header}" ${header === bestMatch ? 'selected' : ''}>${header}</option>`).join('');

            grid.insertAdjacentHTML('beforeend', `
                <div class="form-group" style="background: rgba(255,255,255,0.03); padding: 14px; border-radius: 8px; border: 1px solid ${field.required && !bestMatch ? 'rgba(239, 68, 68, 0.3)' : 'var(--glass-border)'}">
                    <label style="color: ${field.required ? 'var(--primary)' : 'var(--text-muted)'}; font-size: 0.85em; display: block; margin-bottom: 6px;">
                        ${field.label} ${field.required ? '(مطلوب)' : ''}
                    </label>
                    <select class="field-mapper" data-key="${field.key}" style="width: 100%; padding: 8px; font-size: 0.9em;">
                        ${optionsHTML}
                    </select>
                </div>
            `);
        });
    }

    processImport() {
        const mapping = {};
        this.modalElement.querySelectorAll('.field-mapper').forEach((select) => {
            if (select.value) mapping[select.dataset.key] = select.value;
        });

        localStorage.setItem('SLA_IMPORT_MAPPING', JSON.stringify(mapping));

        const missingReq = this.schemaFields.filter((field) => field.required && !mapping[field.key]);
        if (missingReq.length > 0) {
            alert(`يرجى مطابقة الحقول الإجبارية: ( ${missingReq.map((field) => field.label).join('، ')} )`);
            return;
        }

        const importedCases = [];
        let skippedRows = 0;

        this.excelData.forEach((row) => {
            const caseNumber = row[mapping.caseNumber];
            const year = row[mapping.year];

            if (!caseNumber || !year) {
                skippedRows += 1;
                return;
            }

            const plaintiff = mapping.plaintiff ? String(row[mapping.plaintiff] || '').trim() : '';
            const defendant = mapping.defendant ? String(row[mapping.defendant] || '').trim() : '';
            const importedCase = {
                caseNumber: String(caseNumber).trim(),
                year: String(year).trim(),
                court: mapping.court ? row[mapping.court] : "",
                subject: mapping.subject ? row[mapping.subject] : "",
                plaintiff,
                defendant,
                parties: [plaintiff, defendant].filter(Boolean),
                plaintiffAddress: mapping.plaintiffAddress ? row[mapping.plaintiffAddress] : "",
                fileLocation: mapping.fileLocation ? row[mapping.fileLocation] : "",
                latestSessionType: mapping.latestSessionType ? row[mapping.latestSessionType] : "",
                latestDecision: mapping.latestDecision ? row[mapping.latestDecision] : "",
                lastSessionDate: mapping.lastSessionDate ? row[mapping.lastSessionDate] : "",
                previousSessionDate: mapping.previousSessionDate ? row[mapping.previousSessionDate] : "",
                judgmentPronouncement: mapping.judgmentPronouncement ? row[mapping.judgmentPronouncement] : "",
                judgmentClassification: mapping.judgmentClassification ? row[mapping.judgmentClassification] : "",
                judgmentBrief: mapping.judgmentBrief ? row[mapping.judgmentBrief] : "",
                sessionPreparation: mapping.sessionPreparation ? row[mapping.sessionPreparation] : "",
                viewRequests: mapping.viewRequests ? row[mapping.viewRequests] : "",
                chosenHeadquarters: mapping.chosenHeadquarters ? row[mapping.chosenHeadquarters] : "",
                operationalStatus: mapping.operationalStatus ? row[mapping.operationalStatus] : "active",
                sessions: [],
                judgments: [],
                tasks: [],
                reminders: []
            };

            if (mapping.joinedCases && row[mapping.joinedCases]) {
                importedCase.joinedCases = String(row[mapping.joinedCases]).split(/[,،\n]/).map((value) => value.trim()).filter(Boolean);
            }

            if (mapping.otherDefendants && row[mapping.otherDefendants]) {
                importedCase.otherDefendants = String(row[mapping.otherDefendants]).split(/[,،\n]/).map((value) => value.trim()).filter(Boolean);
            }

            importedCases.push(new Case(importedCase));
        });

        if (!importedCases.length) {
            alert('لم يتم العثور على بيانات صالحة للاستيراد.');
            return;
        }

        const result = this.app.storage.upsertCasesByIdentity(importedCases);
        const duplicatesResolved = Math.max(0, importedCases.length - result.inserted - result.updated);
        const parts = [
            `تمت معالجة ${importedCases.length} دعوى من الملف`,
            `الجديد: ${result.inserted}`,
            `المحدَّث: ${result.updated}`
        ];

        if (duplicatesResolved > 0) {
            parts.push(`المكرر داخل الملف وتم دمجه: ${duplicatesResolved}`);
        }

        if (skippedRows || result.skipped) {
            parts.push(`الصفوف المتخطاة لغياب رقم الدعوى أو السنة: ${skippedRows + result.skipped}`);
        }

        alert(parts.join(' | '));
        this.modalElement.remove();
        if (this.onImportComplete) this.onImportComplete();
    }
}
