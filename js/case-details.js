import { AppealsStore } from './appeals-store.js';
import { db } from './config.js';
import { UI } from './ui.js';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

export const CaseDetailsModule = {
    currentAppealId: null,

    init: () => {
        // Any top-level initialization can go here
    },

    loadCase: async (id) => {
        CaseDetailsModule.currentAppealId = id;
        const appealsData = AppealsStore.getAll();
        const appeal = appealsData.find(a => a.id === id);

        if (!appeal) {
            UI.showToast('لم يتم العثور على بيانات الطعن', 'error');
            return;
        }

        CaseDetailsModule.renderView(appeal);
        CaseDetailsModule.loadAttachments(id); // Fetch remote attachments on load
    },

    renderView: (appeal) => {
        const container = document.getElementById('content-container');
        if (!container) return;

        // Extract attachments/images to find a valid hero image
        let heroImage = '';
        const notes = appeal.caseNotes || [];
        const imageNotes = notes.filter(n => n.content?.match(/\.(jpeg|jpg|gif|png)$/i) || n.content?.includes('<img'));
        if (imageNotes.length > 0) {
            const lastImg = imageNotes[imageNotes.length - 1];
            // Match href or src
            const match = lastImg.content.match(/(https?:\/\/[^\s"']+)/);
            if (match) {
                heroImage = match[1];
            }
        }

        // Render Hero HTML
        const heroSection = `
            <div class="case-hero" style="background:var(--nav-bg); padding:30px; border-radius:16px; margin-bottom:20px; color:var(--nav-text); display:flex; gap:25px; flex-wrap:wrap; align-items:flex-start; position:relative; overflow:hidden;">
                ${heroImage ? 
                    `<div style="width:200px; height:200px; flex-shrink:0; border-radius:12px; overflow:hidden; border:3px solid var(--accent-color);"><img src="${heroImage}" style="width:100%; height:100%; object-fit:cover;"></div>` 
                    : 
                    `<div style="width:200px; height:200px; flex-shrink:0; border-radius:12px; background:rgba(255,255,255,0.05); border:3px dashed rgba(255,255,255,0.2); display:flex; flex-direction:column; align-items:center; justify-content:center; color:rgba(255,255,255,0.5); text-align:center; padding:15px; cursor:pointer;" onclick="document.getElementById('cd-add-note-btn')?.click();">
                        <i class="fas fa-image" style="font-size:3rem; margin-bottom:10px;"></i>
                        <span style="font-size:0.85rem; font-weight:bold;">لا توجد صورة بارزة للطعن</span>
                        <span style="font-size:0.75rem; color:var(--accent-color); margin-top:5px;">اضغط لإضافة ملاحظة بصورة</span>
                    </div>`
                }
                
                <div style="flex:1; z-index:1;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                            <span class="badge ${appeal.status === 'متداول' ? 'badge-success' : 'badge-warning'}" style="margin-bottom:10px; display:inline-block; font-size:0.9rem;">${appeal.status || 'متداول'}</span>
                            <h2 style="font-size:2rem; font-weight:800; color:white; margin:0; line-height:1.2;">ملف الطعن: ${appeal.appealNumber || '---'} لسنة ${appeal.year || '---'}</h2>
                            <p style="font-size:1.1rem; color:var(--accent-color); margin-top:8px;">${appeal.court || '---'}</p>
                        </div>
                        <div style="display:flex; gap:10px;" class="no-print">
                            <button class="btn btn-primary" onclick="window.print()" style="background:rgba(255,255,255,0.2); color:white; border-radius:12px; padding:10px 20px;" title="طباعة التقرير الشامل">
                                <i class="fas fa-print" style="margin-left:8px;"></i> تقرير شامل الطباعة
                            </button>
                            <button class="icon-btn" onclick="window.App.navigate('dashboard')" style="background:rgba(255,255,255,0.1); color:white; border-radius:12px;" title="عودة">
                                <i class="fas fa-arrow-right"></i>
                            </button>
                        </div>
                    </div>

                    <div style="margin-top:20px; display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:15px; background:rgba(255,255,255,0.05); padding:15px; border-radius:12px;">
                        <div>
                            <div style="font-size:0.8rem; color:rgba(255,255,255,0.5);">المدعي</div>
                            <div style="font-size:1.1rem; font-weight:700;">${appeal.plaintiff || '---'}</div>
                        </div>
                        <div>
                            <div style="font-size:0.8rem; color:rgba(255,255,255,0.5);">المدعي عليه</div>
                            <div style="font-size:1.1rem; font-weight:700;">${appeal.defendant || '---'}</div>
                        </div>
                        <div style="grid-column: 1 / -1;">
                            <div style="font-size:0.8rem; color:rgba(255,255,255,0.5);">الموضوع</div>
                            <div style="font-size:1rem; font-weight:600;">${appeal.subject || '---'}</div>
                        </div>
                    </div>
                </div>
                
                <!-- Background decoration -->
                <i class="fas fa-balance-scale" style="position:absolute; left:-30px; bottom:-40px; font-size:15rem; color:rgba(255,255,255,0.03); z-index:0; transform:rotate(-15deg);"></i>
            </div>
        `;

        const workspaceHtml = `
            <style>
                .cd-tab-btn { padding:12px 25px; border-radius:12px; font-weight:700; font-size:1.1rem; border:1px solid transparent; background:rgba(255,255,255,0.05); color:var(--text-secondary); cursor:pointer; transition:0.3s; flex:1; text-align:center; }
                .cd-tab-btn:hover { background:rgba(255,255,255,0.1); }
                .cd-tab-btn.active { background:var(--accent-color); color:white; border-color:rgba(255,255,255,0.2); box-shadow:0 10px 20px rgba(0,0,0,0.2); }
                .cd-tab-content { display:none; animation: fadeIn 0.4s ease-out; }
                .cd-tab-content.active { display:block; }
                
                @media print {
                    .no-print { display:none !important; }
                    .print-only { display:block !important; }
                    .cd-tab-content { display:block !important; opacity:1 !important; margin-bottom: 20px !important; }
                    .cd-tab-content.hidden { display:block !important; } /* Force display all tabs */
                    body { background: white !important; color: black !important; padding: 0 !important; margin: 0 !important; }
                    .section-card { border: 1px solid #ddd !important; box-shadow: none !important; page-break-inside: avoid; background:white !important; margin-bottom:15px !important;}
                    .cd-tab-btn { display:none !important; }
                    #cd-notes-feed iframe { display:none !important; }
                    .badge { border:1px solid #666; color:black !important; background:transparent !important; }
                }
            </style>
            
            <div class="no-print" style="display:flex; gap:15px; margin-bottom:25px; overflow-x:auto; padding-bottom:5px;">
                <button class="cd-tab-btn active" data-target="cd-notes-tab" style="min-width:180px;"><i class="fas fa-microscope"></i> الملاحظات والتحليل الفني</button>
                <button class="cd-tab-btn" data-target="cd-attachments-tab" style="min-width:180px;"><i class="fas fa-folder-open"></i> مرفقات وملفات الدعوى</button>
                <button class="cd-tab-btn" data-target="cd-sessions-tab" style="min-width:180px;"><i class="fas fa-gavel"></i> الأجندة وجلسات المحكمة</button>
                <button class="cd-tab-btn" data-target="cd-procedures-tab" style="min-width:180px;"><i class="fas fa-tasks"></i> الإجراءات المتخذة</button>
            </div>

            <div style="display:grid; grid-template-columns:1fr; gap:20px;">
                <!-- NOTES TAB -->
                <div id="cd-notes-tab" class="cd-tab-content active section-card" style="padding:25px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:2px solid var(--border-color); padding-bottom:15px;">
                        <h3 style="margin:0; font-size:1.2rem;"><i class="fas fa-microscope" style="color:var(--accent-color);"></i> الملاحظات والتحليل الفني</h3>
                        <button id="cd-add-note-btn" class="btn btn-primary" style="background:var(--accent-color);"><i class="fas fa-plus"></i> إضافة تحليل</button>
                    </div>
                    
                    <!-- Add Note Form (Hidden by default) -->
                    <div id="cd-add-note-form" class="section-card hidden" style="border:1px solid var(--accent-color); background:rgba(245, 158, 11, 0.05); padding:20px; margin-bottom:20px; animation: fadeIn 0.3s ease-out;">
                        <h4 style="margin-top:0; color:var(--accent-color);"><i class="fas fa-pen"></i> إضافة تحليل أو ملاحظة جديدة</h4>
                        <div class="form-group" style="text-align:right;">
                            <label style="display:block; margin-bottom:8px; font-weight:700;">موضوع الملاحظة (مثال: تحليل الوقائع، أدلة الثبوت)</label>
                            <input type="text" id="cd-note-title" style="width:100%; padding:12px; border-radius:8px; border:1px solid var(--border-color); background:var(--input-bg); color:var(--text-primary);" placeholder="عنون الملاحظة هنا...">
                        </div>
                        <div class="form-group" style="margin-top:15px; text-align:right;">
                            <label style="display:block; margin-bottom:8px; font-weight:700;">التفاصيل أو رابط المرفق (يدعم إظهار الصور من Google Drive)</label>
                            <textarea id="cd-note-content" rows="4" style="width:100%; padding:12px; border-radius:8px; border:1px solid var(--border-color); background:var(--input-bg); color:var(--text-primary); resize:vertical; margin-bottom:12px;" placeholder="اكتب ملاحظتك التوضيحية هنا، أو قم بلصق رابط صورة درايف..."></textarea>
                            
                            <label style="display:block; margin-bottom:8px; font-weight:700; color:var(--text-secondary); font-size:0.9rem;">الرفع المباشر للملفات والصور (اختياري)</label>
                            <div style="display:flex; align-items:center; gap:10px; background:var(--bg-color); padding:10px; border-radius:8px; border:1px dashed var(--border-color); flex-wrap:wrap;">
                                <div style="flex:1; min-width:200px;">
                                    <input type="file" id="cd-note-file-upload" style="width:100%;" class="form-control">
                                </div>
                                <select id="cd-note-cloud-provider" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--panel-bg); color:var(--text-primary);">
                                    <option value="google_drive">جوجل درايف (G.Drive)</option>
                                </select>
                                <button id="cd-trigger-note-upload-btn" type="button" class="btn btn-secondary" style="white-space:nowrap; border-color:var(--border-color); color:var(--text-primary);"><i class="fas fa-cloud-upload-alt" style="color:var(--accent-color);"></i> رفع وإرفاق الرابط</button>
                            </div>
                            <div id="cd-note-upload-status" class="hidden" style="margin-top:10px; color:var(--success-color); font-size:0.85rem; font-weight:bold;">
                                <i class="fas fa-spinner fa-spin"></i> جاري رفع الملف وتأمين الرابط...
                            </div>
                        </div>
                        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
                            <button id="cd-cancel-note-btn" class="btn btn-secondary">إلغاء</button>
                            <button id="cd-save-note-btn" class="btn btn-primary" style="background:var(--success-color); color:white;">حفظ الإضافة <i class="fas fa-check"></i></button>
                        </div>
                    </div>

                    <div id="cd-notes-feed">
                        <!-- Notes populated here -->
                    </div>
                </div>

                <!-- ATTACHMENTS TAB -->
                <div id="cd-attachments-tab" class="cd-tab-content section-card" style="padding:25px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:2px solid var(--border-color); padding-bottom:15px;">
                        <h3 style="margin:0; font-size:1.2rem;"><i class="fas fa-file-alt" style="color:var(--secondary-color);"></i> المرفقات الرسمية والملفات</h3>
                        <button id="cd-add-attach-btn" class="btn btn-primary" style="background:var(--secondary-color); font-size:1.1rem; padding:12px 25px;"><i class="fas fa-cloud-upload-alt"></i> إضافة مرفق جديد</button>
                    </div>

                    <!-- Add Attachment Form (Hidden by default) -->
                    <div id="cd-add-attach-form" class="section-card hidden" style="border:1px solid var(--secondary-color); background:rgba(26, 95, 122, 0.05); padding:20px; margin-bottom:20px; animation: fadeIn 0.3s ease-out;">
                        <h4 style="margin-top:0; color:var(--secondary-color);"><i class="fas fa-upload"></i> رفع ملف جديد لـ Google Drive</h4>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin-top:15px;">
                            <div class="form-group" style="text-align:right;">
                                <label style="display:block; margin-bottom:8px; font-weight:700;">نوع المرفق</label>
                                <select id="cd-attach-type" style="width:100%; padding:12px; border-radius:8px; border:1px solid var(--border-color); background:var(--input-bg); color:var(--text-primary);">
                                    <option value="ملف الدعوى">ملف الدعوى</option>
                                    <option value="حكم">حكم</option>
                                    <option value="تقرير مفوضين">تقرير مفوضين</option>
                                    <option value="عريضة">عريضة</option>
                                    <option value="تقرير خبير">تقرير خبير</option>
                                    <option value="مذكرة">مذكرة</option>
                                    <option value="مستندات">مستندات</option>
                                    <option value="أخرى">أخرى (سيتم استخدام الوصف)</option>
                                </select>
                            </div>
                            <div class="form-group" style="text-align:right;">
                                <label style="display:block; margin-bottom:8px; font-weight:700;">وصف المرفق / بيان المرفق</label>
                                <input type="text" id="cd-attach-desc" style="width:100%; padding:12px; border-radius:8px; border:1px solid var(--border-color); background:var(--input-bg); color:var(--text-primary);" placeholder="عن ماذا يعبر هذا المرفق؟">
                            </div>
                            <div class="form-group" style="grid-column:1/-1; text-align:right;">
                                <label style="display:block; margin-bottom:8px; font-weight:700;">اختر الملف للرفع لـ Google Drive</label>
                                <input type="file" id="cd-attach-file-upload" style="width:100%; padding:15px; border-radius:8px; border:2px dashed var(--secondary-color); background:rgba(0,0,0,0.1); color:var(--text-primary);">
                            </div>
                        </div>
                        <div id="cd-attach-upload-status" class="hidden" style="margin-top:15px; text-align:center; color:var(--success-color); font-weight:bold;">
                            <i class="fas fa-spinner fa-spin"></i> جاري رفع الملف لـ Google Drive وربطه بالدعوى... تأكد من عدم إغلاق النافذة.
                        </div>
                        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
                            <button id="cd-cancel-attach-btn" class="btn btn-secondary">إلغاء</button>
                            <button id="cd-save-attach-btn" class="btn btn-primary" style="background:var(--secondary-color); color:white;">رفع واستكمال <i class="fas fa-cloud"></i></button>
                        </div>
                    </div>

                    <div id="cd-attachments-feed" style="display:grid; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr)); gap:15px;">
                        <div style="grid-column:1/-1; text-align:center; padding:30px; color:var(--text-muted);"><i class="fas fa-spinner fa-spin fa-2x"></i> جاري جلب المرفقات...</div>
                    </div>
                </div>
                
                <!-- SESSIONS TAB -->
                <div id="cd-sessions-tab" class="cd-tab-content section-card print-block" style="padding:25px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:2px solid var(--border-color); padding-bottom:15px;">
                        <h3 style="margin:0; font-size:1.2rem;"><i class="fas fa-gavel" style="color:var(--warning-color);"></i> الأجندة وجلسات المحكمة</h3>
                    </div>
                    
                    <div id="cd-sessions-feed" style="display:grid; grid-template-columns:1fr; gap:15px;">
                        <div style="text-align:center; padding:30px; color:var(--text-muted);"><i class="fas fa-spinner fa-spin fa-2x"></i> جاري جلب الجلسات...</div>
                    </div>
                </div>

                <!-- PROCEDURES TAB -->
                <div id="cd-procedures-tab" class="cd-tab-content section-card print-block" style="padding:25px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; border-bottom:2px solid var(--border-color); padding-bottom:15px;" class="no-print">
                        <h3 style="margin:0; font-size:1.2rem;"><i class="fas fa-tasks" style="color:var(--primary-color);"></i> الإجراءات المتخذة في الطعن</h3>
                        <button id="cd-add-procedure-btn" class="btn btn-primary no-print" style="background:var(--primary-color);"><i class="fas fa-plus"></i> إضافة إجراء دعوى</button>
                    </div>

                    <div id="cd-add-procedure-form" class="section-card hidden no-print" style="border:1px solid var(--primary-color); background:rgba(30, 203, 200, 0.05); padding:20px; margin-bottom:20px;">
                        <div class="form-group" style="text-align:right; margin-bottom:15px;">
                            <label style="display:block; margin-bottom:8px; font-weight:700;">نوع الإجراء <span style="color:red">*</span></label>
                            <select id="cd-proc-type" style="width:100%; padding:12px; border-radius:8px; border:1px solid var(--border-color); background:var(--input-bg); color:var(--text-primary);">
                                <option value="مذكرة دفاع">مذكرة دفاع</option>
                                <option value="حافظة مستندات">حافظة مستندات</option>
                                <option value="تعجيل من الوقف الجزائي">تعجيل من الوقف الجزائي</option>
                                <option value="فتح باب مرافعة">فتح باب مرافعة</option>
                                <option value="تقرير خبراء">تقرير خبراء</option>
                                <option value="مذكرة رأي">مذكرة رأي</option>
                                <option value="إعلان أو إخطار">إعلان أو إخطار</option>
                                <option value="أخرى">أخرى (يُذكر بالملاحظات)</option>
                            </select>
                        </div>
                        <div class="form-group" style="text-align:right; margin-bottom:15px;">
                            <label style="display:block; margin-bottom:8px; font-weight:700;">تاريخ الإجراء</label>
                            <input type="date" id="cd-proc-date" style="width:100%; padding:12px; border-radius:8px; border:1px solid var(--border-color); background:var(--input-bg); color:var(--text-primary);">
                        </div>
                        <div class="form-group" style="text-align:right; margin-bottom:15px;">
                            <label style="display:block; margin-bottom:8px; font-weight:700;">الملاحظات والبيان</label>
                            <textarea id="cd-proc-notes" rows="3" style="width:100%; padding:12px; border-radius:8px; border:1px solid var(--border-color); background:var(--input-bg); color:var(--text-primary);" placeholder="ملاحظات توضيحية حول الإجراء والمستندات المرفقة..."></textarea>
                        </div>
                        <div style="display:flex; justify-content:flex-end; gap:10px;">
                            <button id="cd-cancel-proc-btn" class="btn btn-secondary">إلغاء</button>
                            <button id="cd-save-proc-btn" class="btn btn-primary" style="background:var(--primary-color); color:white;">حفظ الإجراء في الملف <i class="fas fa-save"></i></button>
                        </div>
                    </div>

                    <div id="cd-procedures-feed" style="display:grid; grid-template-columns:1fr; gap:15px;">
                        <!-- Procedures populated here -->
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = heroSection + workspaceHtml;
        
        // Render Notes Feed
        CaseDetailsModule.renderNotes(notes);

        document.getElementById('cd-add-note-btn')?.addEventListener('click', () => {
            document.getElementById('cd-add-note-form').classList.toggle('hidden');
        });
        
        document.getElementById('cd-cancel-note-btn')?.addEventListener('click', () => {
            document.getElementById('cd-add-note-form').classList.add('hidden');
            document.getElementById('cd-note-title').value = '';
            document.getElementById('cd-note-content').value = '';
            document.getElementById('cd-note-file-upload').value = '';
        });

        document.getElementById('cd-save-note-btn')?.addEventListener('click', () => {
            const title = document.getElementById('cd-note-title').value.trim();
            const content = document.getElementById('cd-note-content').value.trim();
            if(!title || !content) {
                UI.showToast("يرجى إدخال عنوان وتفاصيل للملاحظة", "warning");
                return;
            }
            CaseDetailsModule.addNote(title, content);
        });

        let isUploading = false;
        document.getElementById('cd-trigger-note-upload-btn')?.addEventListener('click', async () => {
            if (isUploading) return;
            const fileInput = document.getElementById('cd-note-file-upload');
            if(!fileInput.files.length) {
                UI.showToast("يرجى اختيار ملف أولاً", "warning");
                return;
            }
            const file = fileInput.files[0];
            const provider = document.getElementById('cd-note-cloud-provider').value;
            
            isUploading = true;
            document.getElementById('cd-note-upload-status').classList.remove('hidden');
            document.getElementById('cd-trigger-note-upload-btn').disabled = true;

            try {
                let url = '';
                if(provider === 'google_drive') {
                    const { GoogleDriveModule } = await import('./google-drive.js');
                    url = await GoogleDriveModule.uploadFileInteractive(file);
                } 
                
                if (url) {
                    const contentArea = document.getElementById('cd-note-content');
                    contentArea.value = contentArea.value + (contentArea.value ? '\\n' : '') + url;
                    UI.showToast("تم إضافة رابط الملف بنجاح للملاحظة. لا تنس حفظ الإضافات.", "success");
                    fileInput.value = '';
                }
            } catch (err) {
                console.error("Upload error", err);
                UI.showToast("فشل الرفع", "error");
            } finally {
                isUploading = false;
                document.getElementById('cd-note-upload-status').classList.add('hidden');
                document.getElementById('cd-trigger-note-upload-btn').disabled = false;
            }
        });
    },

    renderNotes: (notes) => {
        const feed = document.getElementById('cd-notes-feed');
        if (!feed) return;
        
        if (!notes || notes.length === 0) {
            feed.innerHTML = `
                <div style="text-align:center; padding:40px; color:var(--text-muted); background:var(--surface-bg); border-radius:12px; border:1px dashed var(--border-color);">
                    <i class="fas fa-folder-open" style="font-size:3rem; margin-bottom:15px; opacity:0.5;"></i>
                    <p>لا توجد ملاحظات أو تحليلات مسجلة لهذا الطعن.</p>
                </div>
            `;
            return;
        }

        feed.innerHTML = notes.map(note => {
            const dateStr = note.date ? new Date(note.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
            
            let contentHtml = note.content;
            if (contentHtml.includes('drive.google.com/file/d/')) {
                const fileIdMatch = contentHtml.match(/\/d\/([a-zA-Z0-9_-]+)/);
                if (fileIdMatch) {
                    const embedUrl = `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
                    contentHtml = `<iframe src="${embedUrl}" width="100%" height="450" style="border:none; border-radius:8px; margin-top:10px;"></iframe>`;
                }
            } else if (contentHtml.match(/\.(jpeg|jpg|gif|png)$/i)) {
                contentHtml = contentHtml.replace(/(https?:\/\/[^\s]+)/g, '<img src="$1" style="max-width:100%; max-height:450px; border-radius:8px; margin-top:10px; border:1px solid var(--border-color);" alt="مرفق">');
            } else {
                contentHtml = contentHtml.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color:var(--accent-color); text-decoration:underline;">$1</a>').replace(/\n/g, '<br>');
            }

            return `
                <div class="section-card" style="padding:20px; border-right:4px solid var(--accent-color); position:relative; margin-bottom:15px;">
                    <button class="icon-btn cd-delete-note" data-id="${note.id}" style="position:absolute; top:15px; left:15px; color:var(--danger-color); background:rgba(239, 68, 68, 0.1); width:32px; height:32px; font-size:0.9rem;" title="حذف الملاحظة"><i class="fas fa-trash"></i></button>
                    <h4 style="margin-top:0; margin-bottom:10px; color:var(--text-primary); padding-left:40px; font-size:1.15rem;">${note.title}</h4>
                    <div style="font-size:0.95rem; color:var(--text-secondary); line-height:1.6; word-wrap:break-word;">
                        ${contentHtml}
                    </div>
                    <div style="margin-top:15px; font-size:0.8rem; color:var(--text-muted); display:flex; align-items:center; gap:5px;">
                        <i class="far fa-clock"></i> ${dateStr}
                    </div>
                </div>
            `;
        }).join('');

        feed.querySelectorAll('.cd-delete-note').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(!confirm('هل أنت متأكد من حذف هذه الملاحظة؟')) return;
                const noteId = e.currentTarget.dataset.id;
                
                try {
                    const appeal = AppealsStore.getAll().find(a => a.id === CaseDetailsModule.currentAppealId);
                    const updatedNotes = (appeal.caseNotes || []).filter(n => n.id !== noteId);
                    
                    await updateDoc(doc(db, "appeals", appeal.id), { caseNotes: updatedNotes });
                    AppealsStore.upsert({ id: appeal.id, caseNotes: updatedNotes });
                    
                    UI.showToast("تم الحذف بنجاح", "success");
                    CaseDetailsModule.renderNotes(updatedNotes);
                } catch(error) {
                    console.error('Delete note failed', error);
                    UI.showToast("خطأ أثناء الحذف", "error");
                }
            });
        });
    },

    loadAttachments: async (id) => {
        try {
            const q = query(collection(db, "attachments"), where("appealId", "==", id));
            const snapshot = await getDocs(q);
            const attachments = [];
            snapshot.forEach(doc => attachments.push({ id: doc.id, ...doc.data() }));
            
            // Sort client side by createdAt
            attachments.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            CaseDetailsModule.renderAttachments(attachments);
        } catch(e) {
            console.error(e);
            document.getElementById('cd-attachments-feed').innerHTML = `<div style="grid-column:1/-1; padding:20px; color:var(--danger-color); text-align:center;">حدث خطأ أثناء جلب المرفقات</div>`;
        }
    },

    renderAttachments: (attachments) => {
        const feed = document.getElementById('cd-attachments-feed');
        if (!feed) return;
        
        if (!attachments || attachments.length === 0) {
            feed.innerHTML = `
                <div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-muted); background:var(--surface-bg); border-radius:12px; border:1px dashed var(--border-color);">
                    <i class="fas fa-folder-open" style="font-size:3rem; margin-bottom:15px; opacity:0.5;"></i>
                    <p>لا توجد ملفات أو مرفقات رسمية مسجلة لهذا الطعن.</p>
                </div>
            `;
            return;
        }

        feed.innerHTML = attachments.map(att => {
            const dateStr = att.createdAt?.toDate ? att.createdAt.toDate().toLocaleDateString('ar-EG') : 'حديث';
            const icon = (att.fileType || '').includes('pdf') ? 'fas fa-file-pdf text-danger' : 
                         (att.fileType || '').includes('image') ? 'fas fa-file-image text-primary' : 'fas fa-file-alt text-secondary';
            
            return `
                <div class="section-card" style="padding:20px; border-right:4px solid var(--secondary-color); position:relative; overflow:hidden;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:10px;">
                        <h4 style="margin:0; font-size:1.05rem; color:var(--text-primary);"><i class="${icon}" style="margin-left:8px; font-size:1.2rem;"></i> ${att.description || att.fileName}</h4>
                        <button class="icon-btn cd-delete-attach" data-id="${att.id}" style="color:var(--danger-color); background:rgba(239, 68, 68, 0.1); width:32px; height:32px; font-size:0.9rem;" title="حذف الملف"><i class="fas fa-trash"></i></button>
                    </div>
                    <div style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:15px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" dir="ltr">${att.fileName}</div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size:0.8rem; color:var(--text-muted);"><i class="far fa-clock"></i> ${dateStr}</span>
                        <a href="${att.downloadURL}" target="_blank" class="btn btn-primary" style="background:var(--secondary-color); font-size:0.85rem; padding:6px 15px;"><i class="fas fa-external-link-alt"></i> استعراض</a>
                    </div>
                </div>
            `;
        }).join('');

        feed.querySelectorAll('.cd-delete-attach').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(!confirm('هل أنت متأكد من حذف هذا المرفق نهائياً؟')) return;
                const attId = e.currentTarget.dataset.id;
                try {
                    await deleteDoc(doc(db, "attachments", attId));
                    UI.showToast("تم الحذف بنجاح", "success");
                    CaseDetailsModule.loadAttachments(CaseDetailsModule.currentAppealId);
                } catch(err) {
                    console.error('Delete attachment failed', err);
                    UI.showToast("خطأ أثناء الحذف", "error");
                }
            });
        });
    },

    addNote: async (title, content) => {
        try {
            const appeal = AppealsStore.getAll().find(a => a.id === CaseDetailsModule.currentAppealId);
            const newNote = {
                id: 'note_' + Date.now(),
                title: title,
                content: content,
                date: new Date().toISOString()
            };
            const updatedNotes = [newNote, ...(appeal.caseNotes || [])];
            
            await updateDoc(doc(db, "appeals", appeal.id), { caseNotes: updatedNotes });
            AppealsStore.upsert({ id: appeal.id, caseNotes: updatedNotes });
            
            UI.showToast('تمت إضافة التحليل', 'success');
            
            // Reload Full View because image attachments might turn into the Hero image!
            CaseDetailsModule.loadCase(appeal.id);
        } catch (error) {
            console.error('Add note failed', error);
            UI.showToast('حدث خطأ أثناء الإضافة', 'error');
        }
    },

    // Session Fetching & Rendering
    loadSessions: async (appealId) => {
        try {
            const q = query(collection(db, "sessions"), where("appealId", "==", appealId));
            const snapshot = await getDocs(q);
            const sessions = [];
            snapshot.forEach(doc => sessions.push({ id: doc.id, ...doc.data() }));
            
            // Sort Descending by Date
            sessions.sort((a,b) => new Date(b.sessionDate || 0) - new Date(a.sessionDate || 0));
            CaseDetailsModule.renderSessions(sessions);
        } catch(e) {
            console.error('Error loading sessions', e);
            const feed = document.getElementById('cd-sessions-feed');
            if(feed) feed.innerHTML = `<div style="text-align:center; color:var(--danger-color);">فشل في تحميل الأجندة</div>`;
        }
    },

    renderSessions: (sessions) => {
        const feed = document.getElementById('cd-sessions-feed');
        if (!feed) return;
        
        if (!sessions || sessions.length === 0) {
            feed.innerHTML = `
                <div style="text-align:center; padding:40px; color:var(--text-muted); background:var(--surface-bg); border-radius:12px; border:1px dashed var(--border-color);">
                    <i class="fas fa-calendar-times" style="font-size:3rem; margin-bottom:15px; opacity:0.5;"></i>
                    <p>لا توجد جلسات مسجلة بالأجندة لهذه الدعوى.</p>
                </div>
            `;
            return;
        }

        feed.innerHTML = sessions.map(s => {
            return `
                <div class="section-card" style="padding:20px; border-right:4px solid var(--warning-color); margin-bottom:15px; background:var(--surface-bg);">
                    <div style="display:flex; justify-content:space-between; margin-bottom:15px;">
                        <h4 style="margin:0; color:var(--text-primary);"><i class="far fa-calendar-alt text-warning"></i> الجلسة: <span dir="ltr">${s.sessionDate}</span></h4>
                        <span class="badge ${s.sessionType === 'حكم' ? 'badge-danger' : 'badge-warning'}">${s.sessionType}</span>
                    </div>
                    <div style="margin-bottom:10px;">
                        <strong>القرار / ما تم:</strong> <span style="color:var(--text-secondary);">${s.agendaStatus || '---'}</span>
                    </div>
                    <div style="margin-bottom:10px;">
                        <strong>الوقائع والملاحظات:</strong> <span style="color:var(--text-secondary);">${s.facts || '---'}</span>
                    </div>
                    <div>
                        <strong>الطلبات:</strong> <span style="color:var(--text-secondary);">${s.requests || '---'}</span>
                    </div>
                </div>
            `;
        }).join('');
    },

    // Procedures Management
    renderProcedures: (procedures) => {
        const feed = document.getElementById('cd-procedures-feed');
        if (!feed) return;
        
        if (!procedures || procedures.length === 0) {
            feed.innerHTML = `
                <div style="text-align:center; padding:40px; color:var(--text-muted); background:var(--surface-bg); border-radius:12px; border:1px dashed var(--border-color);">
                    <i class="fas fa-tasks" style="font-size:3rem; margin-bottom:15px; opacity:0.5;"></i>
                    <p>لم يتم تسجيل أية إجراءات إدارية أو قانونية مساندة.</p>
                </div>
            `;
            return;
        }

        feed.innerHTML = procedures.sort((a,b) => new Date(b.date || 0) - new Date(a.date || 0)).map(p => {
            return `
                <div class="section-card" style="padding:15px; border-right:4px solid var(--primary-color); display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <h4 style="margin:0 0 8px 0; color:var(--text-primary);"><i class="fas fa-check-circle" style="color:var(--primary-color);"></i> ${p.type}</h4>
                        <div style="color:var(--text-secondary); font-size:0.95rem; line-height:1.6;">${p.notes}</div>
                        <div style="margin-top:10px; font-size:0.85rem; color:var(--text-muted);"><i class="far fa-calendar"></i> تاريخ الإجراء: <span dir="ltr">${p.date}</span></div>
                    </div>
                    <button class="icon-btn cd-delete-proc no-print" data-id="${p.id}" style="color:var(--danger-color);"><i class="fas fa-trash"></i></button>
                </div>
            `;
        }).join('');

        feed.querySelectorAll('.cd-delete-proc').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(!confirm('حذف هذا الإجراء؟')) return;
                const pId = e.currentTarget.dataset.id;
                try {
                    const appeal = AppealsStore.getAll().find(a => a.id === CaseDetailsModule.currentAppealId);
                    const updated = (appeal.procedures || []).filter(x => x.id !== pId);
                    await updateDoc(doc(db, "appeals", appeal.id), { procedures: updated });
                    AppealsStore.upsert({ id: appeal.id, procedures: updated });
                    UI.showToast("تم الحذف بنجاح", "success");
                    CaseDetailsModule.renderProcedures(updated);
                } catch(err) {
                    UI.showToast("خطأ أثناء الحذف", "error");
                }
            });
        });
    },

    addProcedure: async (type, date, notes) => {
        const appeal = AppealsStore.getAll().find(a => a.id === CaseDetailsModule.currentAppealId);
        if(!appeal) return;
        
        const newProc = { id: 'proc_' + Date.now(), type, date, notes };
        const updated = [newProc, ...(appeal.procedures || [])];
        
        try {
            await updateDoc(doc(db, "appeals", appeal.id), { procedures: updated });
            AppealsStore.upsert({ id: appeal.id, procedures: updated });
            UI.showToast('تم حفظ الإجراء بنجاح', 'success');
            document.getElementById('cd-add-procedure-form').classList.add('hidden');
            document.getElementById('cd-proc-notes').value = '';
            CaseDetailsModule.renderProcedures(updated);
        } catch(e) {
            UI.showToast('فشل حفظ الإجراء', 'error');
        }
    }
};

window.CaseDetailsModule = CaseDetailsModule;
