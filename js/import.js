import { db } from './config.js';
import { collection, writeBatch, doc, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { UI } from './ui.js';
import { AppealsStore } from './appeals-store.js';

export const ImportModule = {
    excelData: [],
    fileHeaders: [],
    currentMapping: {},
    existingAppeals: new Map(),
    
    // ============================================================
    // FIELD GROUPS - Organized by category for the mapping UI
    // ============================================================
    fieldGroups: [
        {
            groupLabel: '📋 بيانات الطعن الأساسية',
            color: '#1e40af',
            fields: [
                { id: 'appealNumber', label: 'رقم الطعن', required: true },
                { id: 'year',         label: 'السنة / سنة الطعن' },
                { id: 'plaintiff',    label: 'اسم الطاعن / المدعي', required: true },
                { id: 'defendant',    label: 'المطعون ضده / المدعى عليه' },
                { id: 'court',        label: 'المحكمة / الدائرة', required: true },
                { id: 'subject',      label: 'موضوع الطعن / نوع الجريمة' },
                { id: 'status',       label: 'حالة الطعن' },
                { id: 'appealDate',   label: 'تاريخ رفع الطعن' },
            ]
        },
        {
            groupLabel: '🏛️ بيانات الجلسات',
            color: '#065f46',
            fields: [
                { id: 'lastSessionDate',   label: 'آخر جلسة / تاريخ الجلسة الأخيرة' },
                { id: 'nextSessionDate',   label: 'الجلسة القادمة / جلسة الحكم' },
                { id: 'prevSessionDate',   label: 'الجلسة السابقة' },
                { id: 'sessionType',       label: 'نوع الجلسة' },
                { id: 'sessionDecision',   label: 'القرار / ما تم بالجلسة / الأجندة' },
                { id: 'sessionFacts',      label: 'وقائع الجلسة / ملخص الجلسة' },
            ]
        },
        {
            groupLabel: '⚖️ بيانات الحكم والنتيجة',
            color: '#7c2d12',
            fields: [
                { id: 'judgmentDate',     label: 'تاريخ الحكم / جلسة الحكم' },
                { id: 'judgmentSummary',  label: 'منطوق الحكم / نص الحكم' },
                { id: 'resultCategory',   label: 'نتيجة الحكم (لصالحنا / ضدنا)' },
            ]
        },
        {
            groupLabel: '📁 بيانات إدارية إضافية',
            color: '#4a044e',
            fields: [
                { id: 'roll',             label: 'الرول / رقم الرول' },
                { id: 'fileLocation',     label: 'مكان الملف / مكان الحفظ' },
                { id: 'litigationStage',  label: 'مرحلة التقاضي / الدرجة' },
                { id: 'plaintiffAddress', label: 'عنوان المدعي / الطاعن' },
                { id: 'judgeChosen',      label: 'المقرر المختار / القاضي' },
                { id: 'notes',            label: 'ملاحظات / تعليق' },
                { id: 'legalBasis',       label: 'وجه الطعن / الأساس القانوني' },
            ]
        }
    ],

    // Flat list of all fields (derived from groups)
    get systemFields() {
        return this.fieldGroups.flatMap(g => g.fields);
    },

    // Common Arabic header aliases for smart auto-mapping
    autoMapAliases: {
        'appealNumber': ['رقم الطعن', 'رقم القضية', 'caseID', 'caseid', 'case_id', 'رقم الدعوى', 'الطعن'],
        'year':         ['السنة', 'year', 'سنة', 'سنة الطعن'],
        'plaintiff':    ['المدعي', 'الطاعن', 'plaintiff', 'اسم المدعي', 'الخصم', 'المدعى'],
        'defendant':    ['المدعى عليه', 'المطعون ضده', 'defendant', 'المدعي_عليه', 'المدعى_عليه'],
        'court':        ['المحكمة', 'الدائرة', 'court', 'المحكمة/الدائرة'],
        'subject':      ['الموضوع', 'موضوع الطعن', 'subject', 'نوع الجريمة', 'موضوع'],
        'status':       ['الحالة', 'حالة الطعن', 'status'],
        'appealDate':   ['تاريخ الطعن', 'تاريخ رفع الطعن'],
        'lastSessionDate': ['تاريخ الجلسة', 'آخر جلسة', 'تاريخ الجلسة_مشق', 'الجلسة الأخيرة'],
        'nextSessionDate': ['جلسة الحكم', 'الجلسة القادمة', 'موعد الجلسة'],
        'prevSessionDate': ['الجلسة السابقة'],
        'sessionType':     ['نوع الجلسة', 'session_type'],
        'sessionDecision': ['القرار', 'ما تم', 'الأجندة', 'قرار الجلسة'],
        'sessionFacts':    ['الوقائع', 'ملخص', 'تفاصيل الجلسة'],
        'judgmentDate':    ['تاريخ الحكم', 'judgment_date'],
        'judgmentSummary': ['نص الحكم', 'منطوق الحكم', 'الحكم'],
        'resultCategory':  ['النتيجة', 'نتيجة الحكم', 'result'],
        'roll':            ['الرول', 'رول', 'رقم الرول', 'الروول'],
        'fileLocation':    ['مكان الملف', 'مكان', 'الحفظ', 'مكان الحفظ', 'موقع الملف'],
        'litigationStage': ['مرحلة التقاضي', 'مرحلة', 'الدرجة', 'درجة التقاضي'],
        'plaintiffAddress':['عنوان المدعي', 'عنوان الطاعن', 'عنوان المدعى عليه', 'العنوان'],
        'judgeChosen':     ['المقرر', 'المقرر المختار', 'القاضي', 'judge'],
        'notes':           ['ملاحظات', 'ملاحظة', 'notes', 'تعليق'],
        'legalBasis':      ['وجه الطعن', 'الأساس القانوني'],
    },

    normalizeValue: (value) => String(value ?? '').trim(),

    getSyncKeyFromData: (data) => {
        const appealNumber = ImportModule.normalizeValue(data.appealNumber);
        if (appealNumber) return `appeal:${appealNumber}`;

        const year = ImportModule.normalizeValue(data.year);
        const plaintiff = ImportModule.normalizeValue(data.plaintiff).toLowerCase();
        const defendant = ImportModule.normalizeValue(data.defendant).toLowerCase();
        const court = ImportModule.normalizeValue(data.court).toLowerCase();

        if (year || plaintiff || defendant || court) {
            return `fallback:${year}|${plaintiff}|${defendant}|${court}`;
        }

        return '';
    },

    buildRowData: (row, useServerTimestamps = false) => {
        const payload = { status: 'متداول' };

        Object.keys(ImportModule.currentMapping).forEach((sysKey) => {
            const rawVal = row[ImportModule.currentMapping[sysKey]];
            let normalized = ImportModule.normalizeValue(rawVal);
            if (sysKey === 'year' && normalized !== '') {
                const parsedYear = parseInt(normalized, 10);
                normalized = Number.isNaN(parsedYear) ? normalized : parsedYear;
            }
            payload[sysKey] = normalized;
        });

        if (!payload.status) payload.status = 'متداول';
        payload.updatedAt = useServerTimestamps ? serverTimestamp() : new Date().toISOString();
        return payload;
    },

    mergeAppealData: (existingData, incomingData, useServerTimestamps = false) => {
        const merged = {
            ...existingData,
            updatedAt: useServerTimestamps ? serverTimestamp() : new Date().toISOString()
        };

        Object.entries(incomingData).forEach(([key, value]) => {
            if (key === 'createdAt' || key === 'updatedAt') return;
            if (value === '' || value === null || value === undefined) return;
            merged[key] = value;
        });

        if (!merged.status) merged.status = 'متداول';
        return merged;
    },

    init: () => {
        ImportModule.bindEvents();
    },

    openModal: async () => {
        UI.showToast("جاري فحص قاعدة البيانات...", "info");
        await ImportModule.loadExistingAppeals();
        document.getElementById('import-wizard-modal')?.classList.remove('hidden');
        ImportModule.resetWizard();
    },

    loadExistingAppeals: async () => {
        try {
            const snap = await getDocs(collection(db, "appeals"));
            ImportModule.existingAppeals = new Map();
            snap.forEach(d => {
                const record = { id: d.id, ...d.data() };
                const syncKey = ImportModule.getSyncKeyFromData(record);
                if(syncKey) ImportModule.existingAppeals.set(syncKey, record);
            });
        } catch(e) { console.warn('Could not load existing appeals', e); }
    },

    resetWizard: () => {
        ImportModule.excelData = [];
        ImportModule.fileHeaders = [];
        ImportModule.currentMapping = {};
        const fi = document.getElementById('import-file-input');
        if(fi) fi.value = '';
        ImportModule.showStep(1);
    },

    showStep: (stepNum) => {
        [1,2,3].forEach(n => {
            const el = document.getElementById(`import-step-${n}`);
            if(el) el.classList.add('hidden');
        });
        document.getElementById(`import-step-${stepNum}`)?.classList.remove('hidden');
    },

    bindEvents: () => {
        const dropZone = document.getElementById('import-drop-zone');
        const fileInput = document.getElementById('import-file-input');
        
        dropZone?.addEventListener('click', () => fileInput.click());
        dropZone?.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--accent-color)';
            dropZone.style.background = 'rgba(245,158,11,0.05)';
        });
        dropZone?.addEventListener('dragleave', () => {
            dropZone.style.borderColor = 'var(--accent-color)';
            dropZone.style.background = 'transparent';
        });
        dropZone?.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.background = 'transparent';
            if(e.dataTransfer.files.length) ImportModule.handleFile(e.dataTransfer.files[0]);
        });

        fileInput?.addEventListener('change', (e) => {
            if(e.target.files.length) ImportModule.handleFile(e.target.files[0]);
        });

        document.getElementById('close-import-wizard')?.addEventListener('click', () => {
            document.getElementById('import-wizard-modal').classList.add('hidden');
        });
        
        document.getElementById('import-back-btn')?.addEventListener('click', () => ImportModule.showStep(1));
        document.getElementById('import-back-map-btn')?.addEventListener('click', () => ImportModule.showStep(2));
        document.getElementById('import-preview-btn')?.addEventListener('click', ImportModule.generatePreview);
        document.getElementById('import-confirm-btn')?.addEventListener('click', ImportModule.performImport);
    },

    handleFile: (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
                
                if(jsonData.length === 0) {
                    UI.showToast("الملف فارغ أو غير صالح", "error");
                    return;
                }

                ImportModule.excelData = jsonData;
                ImportModule.fileHeaders = Object.keys(jsonData[0]);
                UI.showToast(`تم قراءة ${jsonData.length} سجل من الملف`, "success");
                ImportModule.renderMapping();
                ImportModule.showStep(2);
            } catch(err) {
                console.error(err);
                UI.showToast("لم يتم التعرف على صيغة الملف. يرجى استخدام xlsx أو csv", "error");
            }
        };
        reader.readAsArrayBuffer(file);
    },

    renderMapping: () => {
        const container = document.getElementById('mapping-container');
        if(!container) return;

        const headerOptions = `<option value="">-- تجاهل --</option>` + 
            ImportModule.fileHeaders.map(h => `<option value="${h}">${h}</option>`).join('');

        container.innerHTML = ImportModule.fieldGroups.map(group => `
            <div style="grid-column: 1/-1; margin-top:10px; margin-bottom:5px; display:flex; align-items:center; gap:10px;">
                <div style="flex:1; height:1px; background:var(--border-color);"></div>
                <span style="font-size:0.85rem; font-weight:700; color:${group.color}; white-space:nowrap; padding:4px 12px; background:${group.color}15; border-radius:20px;">${group.groupLabel}</span>
                <div style="flex:1; height:1px; background:var(--border-color);"></div>
            </div>
            ${group.fields.map(field => `
                <div style="background:var(--bg-color); padding:14px; border-radius:10px; border:1px solid var(--border-color);">
                    <label style="display:block; font-weight:700; margin-bottom:8px; font-size:0.9rem; color:var(--text-primary);">
                        ${field.label} ${field.required ? '<span style="color:var(--danger-color)">*</span>' : ''}
                    </label>
                    <select class="map-select" data-field="${field.id}" style="width:100%; padding:9px 12px; border-radius:8px; border:1px solid var(--border-color); background:var(--panel-bg); color:var(--text-primary); font-family:var(--font-primary);">
                        ${headerOptions}
                    </select>
                </div>
            `).join('')}
        `).join('');

        // Smart auto-mapping using aliases
        document.querySelectorAll('.map-select').forEach(select => {
            const fieldId = select.dataset.field;
            const aliases = ImportModule.autoMapAliases[fieldId] || [];
            
            // Try each alias against the file headers
            const match = ImportModule.fileHeaders.find(h => 
                aliases.some(alias => 
                    h.toLowerCase().trim() === alias.toLowerCase().trim() ||
                    h.toLowerCase().includes(alias.toLowerCase()) ||
                    alias.toLowerCase().includes(h.toLowerCase())
                )
            );
            if(match) {
                select.value = match;
                select.style.borderColor = 'var(--success-color)';
                select.style.background = 'rgba(16,185,129,0.05)';
            }
        });
    },

    generatePreview: () => {
        try {
            const mapping = {};
            const warnings = [];
            
            // Get all fields as a flat array — avoid getter scope issues
            const allFields = ImportModule.fieldGroups.flatMap(g => g.fields);
            
            // Collect all mapped fields
            document.querySelectorAll('.map-select').forEach(select => {
                const fieldId = select.dataset.field;
                const fileHeader = select.value;
                const sysField = allFields.find(f => f.id === fieldId);
                
                if(sysField && sysField.required && !fileHeader) {
                    warnings.push(sysField.label);
                }
                if(fileHeader) mapping[fieldId] = fileHeader;
            });

            // If no fields at all are mapped, block with a clear message
            if(Object.keys(mapping).length === 0) {
                UI.showToast("يرجى ربط حقل واحد على الأقل قبل المعاينة", "error");
                return;
            }

            // Show warnings for missing required fields but do NOT block
            if(warnings.length > 0) {
                UI.showToast(`تنبيه: الحقول التالية غير مربوطة: ${warnings.join('، ')}`, "warning");
            }

            ImportModule.currentMapping = mapping;

            const thead = document.querySelector('#import-preview-table thead');
            const tbody = document.querySelector('#import-preview-table tbody');

            if(!thead || !tbody) {
                console.error('Preview table not found in DOM');
                UI.showToast("حدث خطأ داخلي — يرجى إغلاق النافذة وإعادة المحاولة", "error");
                return;
            }
            
            const mappedFieldIds = Object.keys(mapping);

            // Build table header
            thead.innerHTML = '<tr>' + 
                mappedFieldIds.map(k => {
                    const field = allFields.find(f => f.id === k);
                    return `<th>${field ? field.label : k}</th>`;
                }).join('') + 
                '<th>حالة السجل</th></tr>';
            
            // Build preview rows (first 5)
            const previewData = ImportModule.excelData.slice(0, 5);

            if(previewData.length === 0) {
                tbody.innerHTML = '<tr><td colspan="20" style="text-align:center; padding:20px; color:var(--text-muted);">لا توجد بيانات في الملف</td></tr>';
                ImportModule.showStep(3);
                return;
            }

            tbody.innerHTML = previewData.map(row => {
                const rowData = ImportModule.buildRowData(row);
                const syncKey = ImportModule.getSyncKeyFromData(rowData);
                const existingRecord = syncKey ? ImportModule.existingAppeals.get(syncKey) : null;
                const isDup = !!existingRecord;
                // Duplicate detection — skip if appealNumber not mapped
                const cells = mappedFieldIds.map(sysKey => {
                    const val = row[mapping[sysKey]];
                    const display = (val !== undefined && val !== null && val !== '') ? val : '-';
                    return `<td style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${display}">${display}</td>`;
                }).join('');

                const statusBadge = isDup 
                    ? '<span class="badge badge-warning">موجود مسبقاً</span>' 
                    : '<span class="badge badge-success">جديد ✓</span>';

                const rowStatusBadge = existingRecord
                    ? '<span class="badge badge-warning">سيتم تحديثه</span>'
                    : '<span class="badge badge-success">جديد ✓</span>';

                return `<tr>${cells}<td>${rowStatusBadge}</td></tr>`;
            }).join('');

            // Summary stats
            const totalNew = ImportModule.excelData.filter((row) => {
                const syncKey = ImportModule.getSyncKeyFromData(ImportModule.buildRowData(row));
                return !syncKey || !ImportModule.existingAppeals.has(syncKey);
            }).length;
            const totalDup = ImportModule.excelData.length - totalNew;

            const statsEl = document.getElementById('import-total-stats');
            if(statsEl) {
                statsEl.innerHTML = `
                    <strong>${ImportModule.excelData.length}</strong> إجمالي &mdash;
                    <span style="color:var(--success-color); font-weight:700;">${totalNew} جديد</span> &mdash;
                    <span style="color:var(--warning-color); font-weight:700;">${totalDup} موجود مسبقاً</span>
                `;
            }
            
            ImportModule.showStep(3);

        } catch(err) {
            console.error('generatePreview error:', err);
            UI.showToast("حدث خطأ أثناء المعاينة: " + err.message, "error");
        }
    },

    performImport: async () => {
        const btn = document.getElementById('import-confirm-btn');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري رفع البيانات...';

        let importedCount = 0;
        let skipCount = 0;
        const importedAppeals = [];

        try {
            const chunks = [];
            for(let i=0; i<ImportModule.excelData.length; i+=400) {
                chunks.push(ImportModule.excelData.slice(i, i+400));
            }

            for(const chunk of chunks) {
                const batch = writeBatch(db);
                chunk.forEach(row => {
                    const cacheTimestamp = new Date().toISOString();
                    const incomingData = ImportModule.buildRowData(row, true);
                    const syncKey = ImportModule.getSyncKeyFromData(incomingData);
                    if(!syncKey) {
                        skipCount++;
                        return;
                    }
                    const existingRecord = ImportModule.existingAppeals.get(syncKey);

                    if(existingRecord) {
                        const mergedServerData = ImportModule.mergeAppealData(existingRecord, incomingData, true);
                        const mergedCacheData = ImportModule.mergeAppealData(existingRecord, ImportModule.buildRowData(row, false), false);
                        batch.set(doc(db, "appeals", existingRecord.id), mergedServerData, { merge: true });
                        importedAppeals.push({ id: existingRecord.id, ...mergedCacheData });
                        ImportModule.existingAppeals.set(syncKey, { ...existingRecord, ...mergedCacheData });
                        skipCount++;
                        return;
                    }

                    const appealRef = doc(collection(db, "appeals"));
                    const appealData = {
                        ...incomingData,
                        createdAt: serverTimestamp(),
                        status: 'متداول'
                    };
                    
                    Object.keys(ImportModule.currentMapping).forEach(sysKey => {
                        const rawVal = row[ImportModule.currentMapping[sysKey]];
                        appealData[sysKey] = String(rawVal ?? '').trim();
                    });

                    // Normalize status
                    if(!appealData.status || appealData.status === '') appealData.status = 'متداول';

                    appealData.status = ImportModule.normalizeValue(row[ImportModule.currentMapping['status']]) || 'متداول';
                    batch.set(appealRef, appealData);
                    importedAppeals.push({ id: appealRef.id, ...ImportModule.buildRowData(row, false), createdAt: cacheTimestamp, updatedAt: cacheTimestamp });
                    importedCount++;
                    ImportModule.existingAppeals.set(syncKey, { id: appealRef.id, ...appealData });
                });
                await batch.commit();
            }

            if (importedAppeals.length > 0) {
                AppealsStore.upsertMany(importedAppeals);
            }

            UI.showToast(`✅ اكتملت المزامنة: تمت إضافة ${importedCount} سجل، وتحديث ${skipCount} سجل.`, "success");
            document.getElementById('import-wizard-modal').classList.add('hidden');
            
        } catch(err) {
            console.error(err);
            UI.showToast("حدث خطأ أثناء معالجة البيانات: " + err.message, "error");
        } finally {
            btn.disabled = false;
            btn.innerHTML = 'تأكيد والاستيراد <i class="fas fa-check-circle"></i>';
        }
    }
};
