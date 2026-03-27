import { Case } from '../core/Models.js';

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export class ImportModal {
    constructor(app, onImportComplete) {
        this.app = app;
        this.onImportComplete = onImportComplete;
        this.modalElement = null;
        this.excelData = null;
        this.excelHeaders = [];
        this.selectedFileName = '';
        this.handleEscape = this.handleEscape.bind(this);

        this.schemaFields = [
            { key: 'caseNumber', label: '\u0631\u0642\u0645 \u0627\u0644\u062f\u0639\u0648\u0649 / \u0627\u0644\u0637\u0639\u0646', required: true, autoMatch: ['\u0631\u0642\u0645', '\u062f\u0639\u0648\u0649', '\u0637\u0639\u0646', '\u0642\u0636\u064a\u0629'] },
            { key: 'year', label: '\u0627\u0644\u0633\u0646\u0629', required: true, autoMatch: ['\u0633\u0646\u0629', '\u0639\u0627\u0645', '\u0627\u0644\u0639\u0627\u0645', '\u0627\u0644\u0633\u0646\u0647'] },
            { key: 'court', label: '\u0627\u0644\u0645\u062d\u0643\u0645\u0629 / \u0627\u0644\u062f\u0627\u0626\u0631\u0629', required: false, autoMatch: ['\u0645\u062d\u0643\u0645\u0629', '\u062f\u0627\u0626\u0631\u0629', '\u062c\u0647\u0629'] },
            { key: 'subject', label: '\u0645\u0648\u0636\u0648\u0639 \u0627\u0644\u062f\u0639\u0648\u0649', required: false, autoMatch: ['\u0645\u0648\u0636\u0648\u0639', '\u0648\u0635\u0641'] },
            { key: 'plaintiff', label: '\u0627\u0644\u0645\u062f\u0639\u064a / \u0627\u0644\u0637\u0627\u0639\u0646', required: false, autoMatch: ['\u0645\u062f\u0639\u064a', '\u0637\u0627\u0639\u0646', '\u0645\u0633\u062a\u0623\u0646\u0641', '\u062e\u0635\u0645'] },
            { key: 'plaintiffAddress', label: '\u0639\u0646\u0648\u0627\u0646 \u0627\u0644\u0645\u062f\u0639\u064a', required: false, autoMatch: ['\u0639\u0646\u0648\u0627\u0646', '\u0633\u0643\u0646', '\u0645\u0643\u0627\u0646'] },
            { key: 'defendant', label: '\u0627\u0644\u0645\u062f\u0639\u0649 \u0639\u0644\u064a\u0647', required: false, autoMatch: ['\u0645\u062f\u0639\u0649 \u0639\u0644\u064a\u0647', '\u0645\u0637\u0639\u0648\u0646', '\u0636\u062f\u0647'] },
            { key: 'otherDefendants', label: '\u062e\u0635\u0648\u0645 \u0622\u062e\u0631\u0648\u0646', required: false, autoMatch: ['\u0622\u062e\u0631\u0648\u0646', '\u0628\u0627\u0642\u064a \u0627\u0644\u062e\u0635\u0648\u0645'] },
            { key: 'fileLocation', label: '\u0645\u0643\u0627\u0646 \u0627\u0644\u0645\u0644\u0641', required: false, autoMatch: ['\u0645\u0643\u0627\u0646', '\u0631\u0641', '\u0645\u0648\u0642\u0639', '\u0645\u0644\u0641'] },
            { key: 'latestSessionType', label: '\u0646\u0648\u0639 \u0622\u062e\u0631 \u062c\u0644\u0633\u0629', required: false, autoMatch: ['\u0646\u0648\u0639', '\u0641\u062d\u0635', '\u0645\u0648\u0636\u0648\u0639'] },
            { key: 'latestDecision', label: '\u0622\u062e\u0631 \u0642\u0631\u0627\u0631', required: false, autoMatch: ['\u0642\u0631\u0627\u0631', '\u0646\u062a\u064a\u062c\u0629', '\u0625\u062c\u0631\u0627\u0621'] },
            { key: 'lastSessionDate', label: '\u062a\u0627\u0631\u064a\u062e \u0622\u062e\u0631 \u062c\u0644\u0633\u0629', required: false, autoMatch: ['\u0622\u062e\u0631 \u062c\u0644\u0633\u0629', '\u0627\u0644\u062c\u0644\u0633\u0629 \u0627\u0644\u0623\u062e\u064a\u0631\u0629'] },
            { key: 'previousSessionDate', label: '\u062a\u0627\u0631\u064a\u062e \u0627\u0644\u062c\u0644\u0633\u0629 \u0627\u0644\u0633\u0627\u0628\u0642\u0629', required: false, autoMatch: ['\u0633\u0627\u0628\u0642\u0629'] },
            { key: 'judgmentPronouncement', label: '\u0645\u0646\u0637\u0648\u0642 \u0627\u0644\u062d\u0643\u0645', required: false, autoMatch: ['\u0645\u0646\u0637\u0648\u0642', '\u0646\u0635 \u0627\u0644\u062d\u0643\u0645'] },
            { key: 'judgmentClassification', label: '\u062a\u0635\u0646\u064a\u0641 \u0627\u0644\u062d\u0643\u0645', required: false, autoMatch: ['\u062a\u0635\u0646\u064a\u0641', '\u062d\u0643\u0645'] },
            { key: 'judgmentBrief', label: '\u062e\u0644\u0627\u0635\u0629 \u0627\u0644\u062d\u0643\u0645', required: false, autoMatch: ['\u062e\u0644\u0627\u0635\u0629', '\u062d\u0643\u0645', '\u0646\u062a\u064a\u062c\u0629'] },
            { key: 'sessionPreparation', label: '\u062a\u062d\u0636\u064a\u0631 \u0627\u0644\u062c\u0644\u0633\u0629', required: false, autoMatch: ['\u062a\u062d\u0636\u064a\u0631', '\u062a\u062c\u0647\u064a\u0632'] },
            { key: 'viewRequests', label: '\u0637\u0644\u0628\u0627\u062a \u0627\u0644\u0627\u0637\u0644\u0627\u0639', required: false, autoMatch: ['\u0627\u0637\u0644\u0627\u0639', '\u0637\u0644\u0628'] },
            { key: 'chosenHeadquarters', label: '\u0627\u0644\u0645\u0642\u0631 \u0627\u0644\u0645\u062e\u062a\u0627\u0631', required: false, autoMatch: ['\u0645\u0642\u0631', '\u0645\u0643\u062a\u0628', '\u0645\u062e\u062a\u0627\u0631'] },
            { key: 'joinedCases', label: '\u062f\u0639\u0627\u0648\u0649 \u0645\u0631\u062a\u0628\u0637\u0629', required: false, autoMatch: ['\u0636\u0645', '\u0645\u0631\u062a\u0628\u0637', '\u0639\u0644\u0627\u0642\u0629'] },
            { key: 'operationalStatus', label: '\u0627\u0644\u062d\u0627\u0644\u0629 \u0627\u0644\u062d\u0627\u0644\u064a\u0629', required: false, autoMatch: ['\u062d\u0627\u0644\u0629', '\u0645\u0648\u0642\u0641'] }
        ];
    }

    render() {
        this.close();

        this.modalElement = document.createElement('div');
        this.modalElement.className = 'popup-overlay import-overlay';
        this.modalElement.innerHTML = `
            <div class="popup-card import-modal-card" role="dialog" aria-modal="true" aria-label="\u0627\u0633\u062a\u064a\u0631\u0627\u062f \u0627\u0644\u062f\u0627\u062a\u0627">
                <div class="popup-header import-modal-header">
                    <div>
                        <div class="import-modal-kicker">
                            <ion-icon name="cloud-upload-outline"></ion-icon>
                            <span>\u0645\u0639\u0627\u0644\u062c \u0627\u0633\u062a\u064a\u0631\u0627\u062f \u0630\u0643\u064a</span>
                        </div>
                        <h3>\u0627\u0633\u062a\u064a\u0631\u0627\u062f \u0627\u0644\u0642\u0636\u0627\u064a\u0627 \u0645\u0646 Excel \u0623\u0648 CSV</h3>
                        <p>\u0633\u064a\u062a\u0645 \u0645\u0632\u0627\u0645\u0646\u0629 \u0627\u0644\u0633\u062c\u0644\u0627\u062a \u0628\u0627\u0644\u0627\u0639\u062a\u0645\u0627\u062f \u0639\u0644\u0649 \u0631\u0642\u0645 \u0627\u0644\u062f\u0639\u0648\u0649 + \u0627\u0644\u0633\u0646\u0629\u060c \u0648\u0623\u064a \u062a\u0637\u0627\u0628\u0642 \u0633\u064a\u062a\u0645 \u062a\u062d\u062f\u064a\u062b\u0647 \u0628\u062f\u0644 \u0625\u0636\u0627\u0641\u0629 \u0633\u062c\u0644 \u0645\u0643\u0631\u0631.</p>
                    </div>
                    <button type="button" class="btn-icon import-close-btn" aria-label="\u0625\u063a\u0644\u0627\u0642">
                        <ion-icon name="close-outline"></ion-icon>
                    </button>
                </div>

                <div class="popup-body import-modal-body">
                    <div class="import-hero">
                        <div class="import-hero-stat">
                            <span>\u0627\u0644\u0635\u064a\u063a</span>
                            <strong>XLSX / XLS / CSV</strong>
                        </div>
                        <div class="import-hero-stat">
                            <span>\u0646\u0648\u0639 \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629</span>
                            <strong>\u062a\u062d\u062f\u064a\u062b + \u0625\u0636\u0627\u0641\u0629</strong>
                        </div>
                        <div class="import-hero-stat">
                            <span>\u0627\u0644\u0645\u0641\u062a\u0627\u062d</span>
                            <strong>\u0631\u0642\u0645 \u0627\u0644\u062f\u0639\u0648\u0649 / \u0627\u0644\u0633\u0646\u0629</strong>
                        </div>
                    </div>

                    <div class="import-message import-message-info" id="import-message">
                        <ion-icon name="information-circle-outline"></ion-icon>
                        <span>\u0627\u062e\u062a\u0631 \u0645\u0644\u0641 \u0627\u0644\u0627\u0633\u062a\u064a\u0631\u0627\u062f \u062b\u0645 \u0631\u0627\u062c\u0639 \u0631\u0628\u0637 \u0627\u0644\u0623\u0639\u0645\u062f\u0629 \u0642\u0628\u0644 \u0628\u062f\u0621 \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629.</span>
                    </div>

                    <section id="import-step-1" class="import-step">
                        <button type="button" class="import-dropzone" id="upload-zone">
                            <div class="import-dropzone-icon">
                                <ion-icon name="document-outline"></ion-icon>
                            </div>
                            <div class="import-dropzone-copy">
                                <h4>\u0627\u0636\u063a\u0637 \u0644\u0627\u062e\u062a\u064a\u0627\u0631 \u0627\u0644\u0645\u0644\u0641</h4>
                                <p>\u0623\u0648 \u0627\u0633\u062d\u0628 \u0645\u0644\u0641 \u0627\u0644\u0625\u0643\u0633\u0644 \u0647\u0646\u0627 \u0644\u0628\u062f\u0621 \u0627\u0644\u062a\u062d\u0644\u064a\u0644</p>
                                <div class="import-dropzone-tags">
                                    <span>.xlsx</span>
                                    <span>.xls</span>
                                    <span>.csv</span>
                                </div>
                            </div>
                            <input type="file" id="excel-file-input" accept=".xlsx, .xls, .csv" hidden>
                        </button>

                        <div class="import-file-meta" id="import-file-meta" hidden>
                            <ion-icon name="document-text-outline"></ion-icon>
                            <div>
                                <strong id="selected-file-name"></strong>
                                <span id="selected-file-state">\u062c\u0627\u0647\u0632 \u0644\u0644\u062a\u062d\u0644\u064a\u0644</span>
                            </div>
                        </div>
                    </section>

                    <section id="import-step-2" class="import-step" hidden>
                        <div class="import-summary-bar">
                            <div class="import-summary-pill">
                                <span>\u0627\u0644\u0645\u0644\u0641</span>
                                <strong id="summary-file-name">-</strong>
                            </div>
                            <div class="import-summary-pill">
                                <span>\u0639\u062f\u062f \u0627\u0644\u0635\u0641\u0648\u0641</span>
                                <strong id="excel-row-count">0</strong>
                            </div>
                            <div class="import-summary-pill">
                                <span>\u0639\u062f\u062f \u0627\u0644\u0623\u0639\u0645\u062f\u0629</span>
                                <strong id="excel-header-count">0</strong>
                            </div>
                        </div>

                        <div class="import-mapping-head">
                            <div>
                                <h4>\u0645\u0637\u0627\u0628\u0642\u0629 \u0627\u0644\u0623\u0639\u0645\u062f\u0629</h4>
                                <p>\u0627\u0644\u062d\u0642\u0648\u0644 \u0627\u0644\u0625\u062c\u0628\u0627\u0631\u064a\u0629 \u0645\u0639\u0644\u0645\u0629 \u0628\u0644\u0648\u0646 \u0645\u0645\u064a\u0632 \u0648\u064a\u0645\u0643\u0646 \u062a\u0639\u062f\u064a\u0644 \u0627\u0644\u0628\u0627\u0642\u064a \u062d\u0633\u0628 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a.</p>
                            </div>
                        </div>

                        <div class="import-mapping-grid" id="mapping-grid"></div>
                    </section>
                </div>

                <div class="popup-footer import-modal-footer">
                    <button type="button" class="btn btn-secondary" id="btn-back-step" hidden>
                        <ion-icon name="arrow-forward-outline"></ion-icon>
                        <span>\u0631\u062c\u0648\u0639</span>
                    </button>
                    <div class="import-footer-actions">
                        <button type="button" class="btn btn-secondary import-cancel-btn">
                            <span>\u0625\u0644\u063a\u0627\u0621</span>
                        </button>
                        <button type="button" class="btn btn-primary" id="btn-confirm-import" hidden>
                            <span>\u0628\u062f\u0621 \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629</span>
                            <ion-icon name="cloud-upload-outline"></ion-icon>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(this.modalElement);
        document.addEventListener('keydown', this.handleEscape);
        this.setupEvents();
    }

    setupEvents() {
        const modal = this.modalElement;
        const uploadZone = modal.querySelector('#upload-zone');
        const fileInput = modal.querySelector('#excel-file-input');

        modal.querySelector('.import-close-btn')?.addEventListener('click', () => this.close());
        modal.querySelector('.import-cancel-btn')?.addEventListener('click', () => this.close());
        modal.querySelector('#btn-back-step')?.addEventListener('click', () => this.showUploadStep());
        modal.querySelector('#btn-confirm-import')?.addEventListener('click', () => this.processImport());

        modal.addEventListener('click', (event) => {
            if (event.target === modal) this.close();
        });

        uploadZone?.addEventListener('click', () => fileInput?.click());

        ['dragenter', 'dragover'].forEach((eventName) => {
            uploadZone?.addEventListener(eventName, (event) => {
                event.preventDefault();
                uploadZone.classList.add('is-dragover');
            });
        });

        ['dragleave', 'dragend', 'drop'].forEach((eventName) => {
            uploadZone?.addEventListener(eventName, (event) => {
                event.preventDefault();
                uploadZone.classList.remove('is-dragover');
            });
        });

        uploadZone?.addEventListener('drop', (event) => {
            const file = event.dataTransfer?.files?.[0];
            if (file) this.handleFile(file);
        });

        fileInput?.addEventListener('change', (event) => {
            const file = event.target.files?.[0];
            if (file) this.handleFile(file);
        });
    }

    handleEscape(event) {
        if (event.key === 'Escape') {
            this.close();
        }
    }

    close() {
        if (this.modalElement) {
            this.modalElement.remove();
            this.modalElement = null;
        }
        document.removeEventListener('keydown', this.handleEscape);
    }

    showMessage(message, type = 'info') {
        if (!this.modalElement) return;
        const box = this.modalElement.querySelector('#import-message');
        if (!box) return;

        box.className = `import-message import-message-${type}`;
        box.innerHTML = `
            <ion-icon name="${type === 'error' ? 'alert-circle-outline' : type === 'success' ? 'checkmark-circle-outline' : 'information-circle-outline'}"></ion-icon>
            <span>${escapeHtml(message)}</span>
        `;
    }

    showUploadStep() {
        if (!this.modalElement) return;
        this.modalElement.querySelector('#import-step-1').hidden = false;
        this.modalElement.querySelector('#import-step-2').hidden = true;
        this.modalElement.querySelector('#btn-back-step').hidden = true;
        this.modalElement.querySelector('#btn-confirm-import').hidden = true;
        this.showMessage('\u0627\u062e\u062a\u0631 \u0645\u0644\u0641 \u0627\u0644\u0627\u0633\u062a\u064a\u0631\u0627\u062f \u062b\u0645 \u0631\u0627\u062c\u0639 \u0631\u0628\u0637 \u0627\u0644\u0623\u0639\u0645\u062f\u0629 \u0642\u0628\u0644 \u0628\u062f\u0621 \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629.', 'info');
    }

    showMappingStep() {
        const modal = this.modalElement;
        modal.querySelector('#import-step-1').hidden = true;
        modal.querySelector('#import-step-2').hidden = false;
        modal.querySelector('#btn-back-step').hidden = false;
        modal.querySelector('#btn-confirm-import').hidden = false;
        modal.querySelector('#excel-row-count').textContent = String(this.excelData.length);
        modal.querySelector('#excel-header-count').textContent = String(this.excelHeaders.length);
        modal.querySelector('#summary-file-name').textContent = this.selectedFileName || '-';
        this.showMessage('\u062a\u0645 \u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0645\u0644\u0641. \u0631\u0627\u062c\u0639 \u0631\u0628\u0637 \u0627\u0644\u062d\u0642\u0648\u0644 \u062b\u0645 \u0627\u0628\u062f\u0623 \u0627\u0644\u0645\u0632\u0627\u0645\u0646\u0629.', 'success');

        const grid = modal.querySelector('#mapping-grid');
        grid.innerHTML = '';
        const savedMapping = JSON.parse(localStorage.getItem('SLA_IMPORT_MAPPING') || '{}');

        this.schemaFields.forEach((field) => {
            let bestMatch = '';

            if (savedMapping[field.key] && this.excelHeaders.includes(savedMapping[field.key])) {
                bestMatch = savedMapping[field.key];
            } else {
                for (const header of this.excelHeaders) {
                    const normalizedHeader = String(header).toLowerCase();
                    if (field.autoMatch.some((keyword) => normalizedHeader.includes(keyword.toLowerCase()))) {
                        bestMatch = header;
                        break;
                    }
                }
            }

            const optionsHTML = `<option value="">\u062a\u062c\u0627\u0647\u0644 \u0647\u0630\u0627 \u0627\u0644\u062d\u0642\u0644</option>` +
                this.excelHeaders.map((header) => `<option value="${escapeHtml(header)}" ${header === bestMatch ? 'selected' : ''}>${escapeHtml(header)}</option>`).join('');

            grid.insertAdjacentHTML('beforeend', `
                <label class="import-map-card ${field.required ? 'is-required' : ''}">
                    <span class="import-map-label">${field.label}${field.required ? ' *' : ''}</span>
                    <select class="field-mapper import-map-select" data-key="${field.key}">
                        ${optionsHTML}
                    </select>
                </label>
            `);
        });
    }

    handleFile(file) {
        if (typeof XLSX === 'undefined') {
            this.showMessage('\u062a\u0639\u0630\u0631 \u062a\u062d\u0645\u064a\u0644 \u0645\u0643\u062a\u0628\u0629 \u0642\u0631\u0627\u0621\u0629 Excel. \u062a\u0623\u0643\u062f \u0645\u0646 \u0627\u062a\u0635\u0627\u0644 \u0627\u0644\u0625\u0646\u062a\u0631\u0646\u062a \u062b\u0645 \u0623\u0639\u062f \u0627\u0644\u0645\u062d\u0627\u0648\u0644\u0629.', 'error');
            return;
        }

        this.selectedFileName = file.name;
        const fileMeta = this.modalElement.querySelector('#import-file-meta');
        const fileNameNode = this.modalElement.querySelector('#selected-file-name');
        const fileStateNode = this.modalElement.querySelector('#selected-file-state');
        const uploadZone = this.modalElement.querySelector('#upload-zone');

        fileMeta.hidden = false;
        fileNameNode.textContent = file.name;
        fileStateNode.textContent = '\u062c\u0627\u0631\u064a \u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0645\u0644\u0641...';
        uploadZone.classList.add('is-busy');
        this.showMessage('\u062c\u0627\u0631\u064a \u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0645\u0644\u0641 \u0648\u0627\u0633\u062a\u062e\u0631\u0627\u062c \u0627\u0644\u0623\u0639\u0645\u062f\u0629...', 'info');

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                this.excelData = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: false });

                if (!this.excelData.length) {
                    throw new Error('\u0627\u0644\u0645\u0644\u0641 \u0644\u0627 \u064a\u062d\u062a\u0648\u064a \u0639\u0644\u0649 \u0628\u064a\u0627\u0646\u0627\u062a \u0642\u0627\u0628\u0644\u0629 \u0644\u0644\u0627\u0633\u062a\u064a\u0631\u0627\u062f.');
                }

                this.excelHeaders = Object.keys(this.excelData[0] || {});
                fileStateNode.textContent = '\u062a\u0645 \u0627\u0644\u062a\u062d\u0644\u064a\u0644 \u0628\u0646\u062c\u0627\u062d';
                uploadZone.classList.remove('is-busy');
                this.showMappingStep();
            } catch (error) {
                console.error(error);
                uploadZone.classList.remove('is-busy');
                fileStateNode.textContent = '\u062a\u0639\u0630\u0631 \u062a\u062d\u0644\u064a\u0644 \u0627\u0644\u0645\u0644\u0641';
                this.showMessage(error.message || '\u062a\u0639\u0630\u0631 \u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0645\u0644\u0641. \u064a\u0631\u062c\u0649 \u0627\u0644\u062a\u0623\u0643\u062f \u0645\u0646 \u0635\u062d\u0629 \u0627\u0644\u0645\u0644\u0641.', 'error');
            }
        };

        reader.onerror = () => {
            uploadZone.classList.remove('is-busy');
            fileStateNode.textContent = '\u062a\u0639\u0630\u0631 \u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0645\u0644\u0641';
            this.showMessage('\u062d\u062f\u062b \u062e\u0637\u0623 \u0623\u062b\u0646\u0627\u0621 \u0642\u0631\u0627\u0621\u0629 \u0627\u0644\u0645\u0644\u0641.', 'error');
        };

        reader.readAsArrayBuffer(file);
    }

    processImport() {
        const mapping = {};
        this.modalElement.querySelectorAll('.field-mapper').forEach((select) => {
            if (select.value) mapping[select.dataset.key] = select.value;
        });

        localStorage.setItem('SLA_IMPORT_MAPPING', JSON.stringify(mapping));

        const missingReq = this.schemaFields.filter((field) => field.required && !mapping[field.key]);
        if (missingReq.length) {
            this.showMessage(`\u064a\u0631\u062c\u0649 \u0631\u0628\u0637 \u0627\u0644\u062d\u0642\u0648\u0644 \u0627\u0644\u0625\u062c\u0628\u0627\u0631\u064a\u0629: ${missingReq.map((field) => field.label).join(' - ')}`, 'error');
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
                court: mapping.court ? row[mapping.court] : '',
                subject: mapping.subject ? row[mapping.subject] : '',
                plaintiff,
                defendant,
                parties: [plaintiff, defendant].filter(Boolean),
                plaintiffAddress: mapping.plaintiffAddress ? row[mapping.plaintiffAddress] : '',
                fileLocation: mapping.fileLocation ? row[mapping.fileLocation] : '',
                latestSessionType: mapping.latestSessionType ? row[mapping.latestSessionType] : '',
                latestDecision: mapping.latestDecision ? row[mapping.latestDecision] : '',
                lastSessionDate: mapping.lastSessionDate ? row[mapping.lastSessionDate] : '',
                previousSessionDate: mapping.previousSessionDate ? row[mapping.previousSessionDate] : '',
                judgmentPronouncement: mapping.judgmentPronouncement ? row[mapping.judgmentPronouncement] : '',
                judgmentClassification: mapping.judgmentClassification ? row[mapping.judgmentClassification] : '',
                judgmentBrief: mapping.judgmentBrief ? row[mapping.judgmentBrief] : '',
                sessionPreparation: mapping.sessionPreparation ? row[mapping.sessionPreparation] : '',
                viewRequests: mapping.viewRequests ? row[mapping.viewRequests] : '',
                chosenHeadquarters: mapping.chosenHeadquarters ? row[mapping.chosenHeadquarters] : '',
                operationalStatus: mapping.operationalStatus ? row[mapping.operationalStatus] : 'active',
                sessions: [],
                judgments: [],
                tasks: [],
                reminders: []
            };

            if (mapping.joinedCases && row[mapping.joinedCases]) {
                importedCase.joinedCases = String(row[mapping.joinedCases]).split(/[,\u060c\n]/).map((value) => value.trim()).filter(Boolean);
            }

            if (mapping.otherDefendants && row[mapping.otherDefendants]) {
                importedCase.otherDefendants = String(row[mapping.otherDefendants]).split(/[,\u060c\n]/).map((value) => value.trim()).filter(Boolean);
            }

            importedCases.push(new Case(importedCase));
        });

        if (!importedCases.length) {
            this.showMessage('\u0644\u0645 \u064a\u062a\u0645 \u0627\u0644\u0639\u062b\u0648\u0631 \u0639\u0644\u0649 \u0628\u064a\u0627\u0646\u0627\u062a \u0635\u0627\u0644\u062d\u0629 \u0644\u0644\u0627\u0633\u062a\u064a\u0631\u0627\u062f.', 'error');
            return;
        }

        const result = this.app.storage.upsertCasesByIdentity(importedCases);
        const duplicatesResolved = Math.max(0, importedCases.length - result.inserted - result.updated);
        const parts = [
            `\u062a\u0645\u062a \u0645\u0639\u0627\u0644\u062c\u0629 ${importedCases.length} \u062f\u0639\u0648\u0649`,
            `\u062c\u062f\u064a\u062f: ${result.inserted}`,
            `\u0645\u062d\u062f\u062b: ${result.updated}`
        ];

        if (duplicatesResolved > 0) {
            parts.push(`\u0645\u0643\u0631\u0631 \u062f\u0627\u062e\u0644 \u0627\u0644\u0645\u0644\u0641 \u0648\u062a\u0645 \u062f\u0645\u062c\u0647: ${duplicatesResolved}`);
        }

        if (skippedRows || result.skipped) {
            parts.push(`\u0635\u0641\u0648\u0641 \u062a\u0645 \u062a\u062e\u0637\u064a\u0647\u0627: ${skippedRows + result.skipped}`);
        }

        this.showMessage(parts.join(' | '), 'success');
        window.setTimeout(() => {
            this.close();
            if (this.onImportComplete) this.onImportComplete();
        }, 900);
    }
}
