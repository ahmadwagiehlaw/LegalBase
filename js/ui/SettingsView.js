import { GoogleDriveIntegration } from '../data/GoogleDrive.js';

export class SettingsView {
    constructor(container, app) {
        this.container = container;
        this.app = app;
        
        // Default settings if empty
        this.settings = this.app.storage.loadSettings() || {
            courts: [
                'محكمة القضاء الإداري - الدائرة الأولى',
                'المحكمة الإدارية العليا',
                'المحكمة التأديبية',
                'محكمة القضاء الإداري - محاكمات'
            ],
            representations: [
                'بصفتنا المدعي',
                'بصفتنا المدعى عليه',
                'بصفتنا خصم متدخل'
            ],
            theme: 'dark',
            judgmentClassifications: ['صالح', 'ضد', 'وقف تعليقي', 'اعتبار كأن لم يكن', 'انقطاع خصومة'],
            judgmentBriefs: ['قبول', 'عدم قبول', 'إلغاء', 'برفض الطعن', 'تأييد']
        };
    }

    render() {
        this.container.innerHTML = `
            <div class="page-header">
                <div class="header-titles">
                    <h2>إعدادات المنصة</h2>
                    <p>تخصيص المحاكم، أطراف التقاضي، وتفضيلات المحرك الذكي (Rules Engine)</p>
                </div>
            </div>

            <div class="settings-grid">
                <!-- Courts Settings Card -->
                <div class="settings-card">
                    <div class="card-header">
                        <div style="display:flex; align-items:center;">
                            <h3><ion-icon name="business-outline"></ion-icon> دوائر المحاكم</h3>
                            <span class="tooltip-container">
                                <ion-icon name="help-circle-outline"></ion-icon>
                                <span class="tooltip-text">الدوائر التي تظهر كقائمة منسدلة عند تسجيل أو تعديل الطعون. لتسريع عملية إدخال البيانات وتوحيد المسميات.</span>
                            </span>
                        </div>
                        <button class="btn btn-sm btn-primary" id="btn-add-court"><ion-icon name="add"></ion-icon> إضافة دائرة</button>
                    </div>
                    <ul class="settings-list" id="list-courts">
                        ${this.settings.courts.map((court, index) => `
                            <li>
                                <span>${court}</span>
                                <button class="btn-icon text-danger" data-index="${index}" data-type="court"><ion-icon name="trash-outline"></ion-icon></button>
                            </li>
                        `).join('')}
                    </ul>
                </div>

                <!-- Representation Settings Card -->
                <div class="settings-card">
                    <div class="card-header">
                        <div style="display:flex; align-items:center;">
                            <h3><ion-icon name="people-outline"></ion-icon> صفات التمثيل القانوني</h3>
                            <span class="tooltip-container">
                                <ion-icon name="help-circle-outline"></ion-icon>
                                <span class="tooltip-text">الصفة القانونية لجهتك (مثل: المدعي، خصم متدخل). تستخدم في التقارير الإحصائية وتحديد طبيعة المهام المطلوبة.</span>
                            </span>
                        </div>
                        <button class="btn btn-sm btn-primary" id="btn-add-rep"><ion-icon name="add"></ion-icon> إضافة صفة</button>
                    </div>
        <ul class="settings-list" id="list-reps">
                        ${this.settings.representations.map((rep, index) => `
                            <li>
                                <span>${rep}</span>
                                <button class="btn-icon text-danger" data-index="${index}" data-type="rep"><ion-icon name="trash-outline"></ion-icon></button>
                            </li>
                        `).join('')}
                    </ul>
                </div>

                <!-- Default Court Card -->
                <div class="settings-card">
                    <div class="card-header">
                        <div style="display:flex; align-items:center;">
                            <h3><ion-icon name="pin-outline"></ion-icon> المحكمة الافتراضية</h3>
                            <span class="tooltip-container">
                                <ion-icon name="help-circle-outline"></ion-icon>
                                <span class="tooltip-text">سيتم اختيار هذه المحكمة تلقائياً عند إضافة طعن جديد. يمكنك أيضاً تعميمها على كل الطعون التي بدون محكمة.</span>
                            </span>
                        </div>
                    </div>
                    <div style="padding: 16px;">
                        <select id="setting-default-court" style="width:100%; padding:10px; background:var(--surface); border:1px solid var(--glass-border); border-radius:8px; color:var(--text-main); outline:none; margin-bottom:12px;">
                            <option value="">لا يوجد محكمة افتراضية</option>
                            ${this.settings.courts.map(c => `
                                <option value="${c}" ${this.settings.defaultCourt === c ? 'selected' : ''}>${c}</option>
                            `).join('')}
                        </select>
                        <div style="display:flex; gap:10px;">
                            <button class="btn btn-sm btn-primary" id="btn-save-default-court">حفظ الافتراضي</button>
                            <button class="btn btn-sm btn-secondary" id="btn-apply-court-all">تعميم على كل الطعون</button>
                        </div>
                    </div>
                </div>

                <!-- Judgment Classifications Settings Card -->
                <div class="settings-card">
                    <div class="card-header">
                        <div style="display:flex; align-items:center;">
                            <h3><ion-icon name="analytics-outline"></ion-icon> تصنيفات الحكم الإحصائية</h3>
                            <span class="tooltip-container">
                                <ion-icon name="help-circle-outline"></ion-icon>
                                <span class="tooltip-text">تستخدم لتقسيم الأحكام (صالح، ضد، إلخ) لغرض استخراج الإحصائيات والرسوم البيانية.</span>
                            </span>
                        </div>
                        <button class="btn btn-sm btn-primary" id="btn-add-j-class"><ion-icon name="add"></ion-icon> إضافة تصنيف</button>
                    </div>
                    <ul class="settings-list" id="list-j-class">
                        ${(this.settings.judgmentClassifications || []).map((item, index) => `
                            <li>
                                <span>${item}</span>
                                <button class="btn-icon text-danger" data-index="${index}" data-type="j-class"><ion-icon name="trash-outline"></ion-icon></button>
                            </li>
                        `).join('')}
                    </ul>
                </div>

                <!-- Judgment Briefs Settings Card -->
                <div class="settings-card">
                    <div class="card-header">
                        <div style="display:flex; align-items:center;">
                            <h3><ion-icon name="document-text-outline"></ion-icon> منطوق الحكم المختصر</h3>
                            <span class="tooltip-container">
                                <ion-icon name="help-circle-outline"></ion-icon>
                                <span class="tooltip-text">قائمة بالاختيارات الجاهزة للحكم (مثل: رفض، إلغاء) لتسهيل الإدخال السريع.</span>
                            </span>
                        </div>
                        <button class="btn btn-sm btn-primary" id="btn-add-j-brief"><ion-icon name="add"></ion-icon> إضافة حكم</button>
                    </div>
                    <ul class="settings-list" id="list-j-brief">
                        ${(this.settings.judgmentBriefs || []).map((item, index) => `
                            <li>
                                <span>${item}</span>
                                <button class="btn-icon text-danger" data-index="${index}" data-type="j-brief"><ion-icon name="trash-outline"></ion-icon></button>
                            </li>
                        `).join('')}
                    </ul>
                </div>

                
                <!-- Rules Engine Config Card -->
                <div class="settings-card full-width">
                    <div class="card-header">
                        <div style="display:flex; align-items:center;">
                            <h3><ion-icon name="cog-outline"></ion-icon> تكوينات محرك القواعد الذكي (Rules Engine)</h3>
                            <span class="tooltip-container">
                                <ion-icon name="help-circle-outline"></ion-icon>
                                <span class="tooltip-text">يتحكم هذا المحرك في توليد التنبيهات والمهام تلقائياً بناءً على الأحداث، لضمان عدم تفويت المواعيد القانونية. سيتم إتاحة التعديل عليها في التحديثات القادمة.</span>
                            </span>
                        </div>
                        <button class="btn btn-sm btn-secondary" disabled>سيتم التفعيل قريباً</button>
                    </div>
                    <div class="mock-rules">
                        <div class="rule-toggle">
                            <label>
                                <input type="checkbox" checked disabled> 
                                توليد مهمة تجديد الدعوى تلقائياً بعد الشطب
                            </label>
                            <span>التجديد خلال: <strong>60 يوماً</strong></span>
                        </div>
                        <div class="rule-toggle">
                            <label>
                                <input type="checkbox" checked disabled> 
                                إشعار "الوقف الجزائي" الإداري عند صدور حكم وقف
                            </label>
                            <span>التنبيه العاجل خلال: <strong>7 أيام</strong></span>
                        </div>
                    </div>
                </div>

                <!-- Google Drive Config Card -->
                <div class="settings-card full-width">
                    <div class="card-header">
                        <h3><ion-icon name="logo-google"></ion-icon> ربط التخزين السحابي (Google Drive)</h3>
                    </div>
                    <div style="padding: 16px;">
                        <p style="margin-bottom: 16px; color: var(--text-muted);">
                            قم بربط حساب جوجل درايف الخاص بك لتتمكن من رفع مرفقات القضايا سحابياً، وتوفير مساحة التخزين المحلية.
                        </p>
                        
                        <div style="display: flex; gap: 16px; align-items: flex-end;">
                            <div style="flex: 1;">
                                <button class="btn btn-secondary" id="btn-connect-drive" style="width: 100%; border-color: #4285F4; color: #4285F4;">
                                    <ion-icon name="link-outline"></ion-icon> ربط الحساب الآن
                                </button>
                            </div>
                            <div class="form-group" style="flex: 2;">
                                <label style="display:flex; align-items:center; margin-bottom: 8px; color: var(--text-muted)">
                                    معرف المجلد الافتراضي (اختياري - Folder ID)
                                    <span class="tooltip-container">
                                        <ion-icon name="help-circle-outline"></ion-icon>
                                        <span class="tooltip-text">للحصول عليه: افتح المجلد في Google Drive، وانسخ الرمز الطويل الموجود في نهاية الرابط الخاص به (URL). إذا تركته فارغاً سيتم مساره للصفحة الرئيسية للدرايف.</span>
                                    </span>
                                </label>
                                <input type="text" id="setting-google-folder-id" value="${this.settings.googleFolderId || ''}" placeholder="أدخل ID المجلد أو اتركه فارغاً للرفع للرئيسية..." style="width: 100%; padding: 8px; border-radius: 4px; border: 1px solid var(--glass-border); background: rgba(0,0,0,0.2); color: #fff;">
                            </div>
                        </div>

                        <button class="btn btn-primary" id="btn-save-drive-settings" style="margin-top: 16px;">حفظ تكوينات المجلد</button>
                    </div>
                </div>
            </div>
        `;

        this.setupEvents();
    }

    setupEvents() {
        this.container.querySelector('#btn-add-court').addEventListener('click', () => {
            const court = prompt('أدخل اسم المحكمة / الدائرة:');
            if(court && court.trim() !== '') {
                this.settings.courts.push(court);
                this.saveAndRender();
            }
        });

        this.container.querySelector('#btn-add-rep').addEventListener('click', () => {
            const rep = prompt('أدخل صفة التمثيل الجديدة:');
            if(rep && rep.trim() !== '') {
                this.settings.representations.push(rep);
                this.saveAndRender();
            }
        });

        this.container.querySelector('#btn-add-j-class').addEventListener('click', () => {
            const val = prompt('أدخل تصنيف الحكم الجديد:');
            if(val && val.trim() !== '') {
                if(!this.settings.judgmentClassifications) this.settings.judgmentClassifications = [];
                this.settings.judgmentClassifications.push(val);
                this.saveAndRender();
            }
        });

        this.container.querySelector('#btn-add-j-brief').addEventListener('click', () => {
            const val = prompt('أدخل الحكم المختصر الجديد:');
            if(val && val.trim() !== '') {
                if(!this.settings.judgmentBriefs) this.settings.judgmentBriefs = [];
                this.settings.judgmentBriefs.push(val);
                this.saveAndRender();
            }
        });

        this.container.querySelectorAll('.btn-icon.text-danger').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const btnEl = e.target.closest('button');
                const index = btnEl.dataset.index;
                const type = btnEl.dataset.type;

                if(confirm('هل أنت متأكد من الحذف؟')) {
                    if(type === 'court') {
                        this.settings.courts.splice(index, 1);
                    } else if (type === 'rep') {
                        this.settings.representations.splice(index, 1);
                    } else if (type === 'j-class') {
                        this.settings.judgmentClassifications.splice(index, 1);
                    } else if (type === 'j-brief') {
                        this.settings.judgmentBriefs.splice(index, 1);
                    }
                    this.saveAndRender();
                }
            });
        });

        // Default Court Events
        const btnSaveDefaultCourt = this.container.querySelector('#btn-save-default-court');
        if(btnSaveDefaultCourt) {
            btnSaveDefaultCourt.addEventListener('click', () => {
                const selected = this.container.querySelector('#setting-default-court').value;
                this.settings.defaultCourt = selected;
                this.saveAndRender();
                alert('تم حفظ المحكمة الافتراضية بنجاح.');
            });
        }

        const btnApplyCourtAll = this.container.querySelector('#btn-apply-court-all');
        if(btnApplyCourtAll) {
            btnApplyCourtAll.addEventListener('click', async () => {
                const selected = this.container.querySelector('#setting-default-court').value;
                if(!selected) return alert('يرجى اختيار محكمة افتراضية أولاً.');
                
                if(!confirm(`هل أنت متأكد من تعميم "${selected}" على كل الطعون التي لا تحتوي على محكمة مسجلة؟`)) return;
                
                btnApplyCourtAll.disabled = true;
                btnApplyCourtAll.innerText = 'جاري التعميم...';

                try {
                    const cases = this.app.storage.loadCases() || [];
                    let updatedCount = 0;
                    
                    cases.forEach(c => {
                        if (!c.court || c.court.trim() === '') {
                            c.court = selected;
                            updatedCount++;
                        }
                    });

                    if(updatedCount > 0) {
                        this.app.storage.saveCases(cases);
                        document.dispatchEvent(new CustomEvent('cases-updated'));
                        alert(`تم تعميم المحكمة على ${updatedCount} طعن بنجاح.`);
                    } else {
                        alert('جميع الطعون مسجل بها محكمة بالفعل.');
                    }
                } catch(e) {
                    console.error("Error applying default court:", e);
                    alert("حدث خطأ أثناء التعميم.");
                } finally {
                    btnApplyCourtAll.disabled = false;
                    btnApplyCourtAll.innerText = 'تعميم على كل الطعون';
                }
            });
        }

        const btnSaveDrive = this.container.querySelector('#btn-save-drive-settings');
        if(btnSaveDrive) {
            btnSaveDrive.addEventListener('click', () => {
                this.settings.googleFolderId = this.container.querySelector('#setting-google-folder-id').value.trim();
                this.saveAndRender();
                alert('تم حفظ معرف المجلد السحابي بنجاح.');
            });
        }

        const btnConnectDrive = this.container.querySelector('#btn-connect-drive');
        if (btnConnectDrive) {
            btnConnectDrive.addEventListener('click', async () => {
                try {
                    btnConnectDrive.innerHTML = '<ion-icon name="sync-outline" class="spin"></ion-icon> جاري الاتصال...';
                    btnConnectDrive.disabled = true;
                    const drive = new GoogleDriveIntegration(this.app);
                    await drive.getAccessToken();
                    alert('تم الربط بحساب جوجل درايف بنجاح! يمكنك الآن الاستمتاع برفع المرفقات.');
                    btnConnectDrive.innerHTML = '<ion-icon name="checkmark-circle-outline"></ion-icon> متصل بنجاح';
                    btnConnectDrive.style.color = 'var(--success-color)';
                    btnConnectDrive.style.borderColor = 'var(--success-color)';
                } catch (err) {
                    alert('تعذر الاتصال بخوادم جوجل: ' + err.message);
                    btnConnectDrive.innerHTML = '<ion-icon name="link-outline"></ion-icon> إعادة المحاولة';
                    btnConnectDrive.disabled = false;
                }
            });
        }
    }

    saveAndRender() {
        this.app.storage.saveSettings(this.settings);
        this.render();
    }
}
