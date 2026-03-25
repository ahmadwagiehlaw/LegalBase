import { AppealsStore } from './appeals-store.js';
import { db } from './config.js';
import { UI } from './ui.js';
import { doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
                        <button class="icon-btn" onclick="window.App.navigate('dashboard')" style="background:rgba(255,255,255,0.1); color:white; border-radius:12px;" title="عودة">
                            <i class="fas fa-arrow-right"></i>
                        </button>
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
            <div style="display:grid; grid-template-columns:1fr; gap:20px;">
                <div class="section-card" style="padding:25px;">
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
    }
};

window.CaseDetailsModule = CaseDetailsModule;
