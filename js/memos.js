import { db } from './config.js';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { UI } from './ui.js';
import { AppealsModule } from './appeals.js';

export const MemosModule = {
    memos: [],
    
    init: async () => {
        MemosModule.renderBaseUI();
        await MemosModule.loadMemos();
        if(AppealsModule.appeals.length === 0) {
            await AppealsModule.loadAppeals();
        }
        MemosModule.bindEvents();
    },

    renderBaseUI: () => {
        const container = document.getElementById('content-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="actions-bar" style="display:flex; justify-content:space-between; margin-bottom: 20px;">
                <button id="add-memo-btn" class="btn btn-primary"><i class="fas fa-file-signature"></i> إنشاء مذكرة جديدة</button>
                <div class="search-box">
                    <input type="text" id="search-memo" placeholder="ابحث في المذكرات..." class="form-control" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-color);">
                </div>
            </div>
            
            <div class="stats-grid" id="memos-grid">
                <div style="grid-column: 1 / -1; text-align:center; padding:20px;">
                    جاري تحميل البيانات... <i class="fas fa-spinner fa-spin"></i>
                </div>
            </div>

            <div id="memo-modal" class="modal-backdrop hidden" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000; display:flex; justify-content:center; align-items:center;">
                <div class="section-card modal-content" style="width: 95%; max-width: 900px; padding: 25px; border-radius: 12px; max-height: 95vh; display:flex; flex-direction:column;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px;">
                        <h3 id="memo-modal-title" style="color: var(--primary-color);">تحرير المذكرة</h3>
                        <div>
                            <button type="button" id="print-memo-btn" class="btn btn-primary" style="background:var(--secondary-color);"><i class="fas fa-print"></i> طباعة / تجريد لـ PDF</button>
                        </div>
                    </div>
                    
                    <form id="memo-form" style="display:flex; flex-direction:column; flex:1; overflow:hidden;">
                        <input type="hidden" id="memo-id">
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom:15px;">
                            <div class="form-group">
                                <label>رقم الطعن المرتبط</label>
                                <select id="memo-appeal-id" required style="width:100%; padding:12px; border-radius:8px; background:var(--bg-color); color:var(--text-color); border:1px solid var(--border-color);">
                                    <option value="">اختر الطعن...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>عنوان المذكرة / نوعها</label>
                                <input type="text" id="memo-title" required placeholder="مثال: مذكرة دفاع، رد على طعن...">
                            </div>
                        </div>
                        
                        <div class="form-group" style="flex:1; display:flex; flex-direction:column; min-height:0;">
                            <label>محتوى المذكرة</label>
                            <div class="toolbar" style="background:#f4f6f9; padding:10px; border:1px solid var(--border-color); border-bottom:none; border-radius:8px 8px 0 0; display:flex; gap:10px;">
                                <button type="button" onclick="document.execCommand('bold',false,null)" class="icon-btn" title="عريض" style="color:#333;"><i class="fas fa-bold"></i></button>
                                <button type="button" onclick="document.execCommand('italic',false,null)" class="icon-btn" title="مائل" style="color:#333;"><i class="fas fa-italic"></i></button>
                                <button type="button" onclick="document.execCommand('underline',false,null)" class="icon-btn" title="تسطير" style="color:#333;"><i class="fas fa-underline"></i></button>
                                <button type="button" onclick="document.execCommand('justifyRight',false,null)" class="icon-btn" title="يمين" style="color:#333;"><i class="fas fa-align-right"></i></button>
                                <button type="button" onclick="document.execCommand('justifyCenter',false,null)" class="icon-btn" title="وسط" style="color:#333;"><i class="fas fa-align-center"></i></button>
                                <button type="button" onclick="document.execCommand('justifyLeft',false,null)" class="icon-btn" title="يسار" style="color:#333;"><i class="fas fa-align-left"></i></button>
                            </div>
                            <div id="memo-content" contenteditable="true" style="flex:1; overflow-y:auto; padding:20px; border:1px solid var(--border-color); border-radius:0 0 8px 8px; background:#fff; color:#000; font-family:'Cairo', sans-serif; font-size:16px; min-height:300px;"></div>
                        </div>

                        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top: 20px;">
                            <button type="button" id="close-memo-modal-btn" class="btn" style="background:var(--text-muted); color:white;">إلغاء</button>
                            <button type="submit" class="btn btn-primary">حفظ المذكرة <i class="fas fa-save"></i></button>
                        </div>
                    </form>
                </div>
            </div>
            
            <iframe id="print-frame" style="display:none;"></iframe>
        `;
    },

    loadMemos: async () => {
        try {
            const mRef = collection(db, "memos");
            const q = query(mRef, orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            
            MemosModule.memos = [];
            snapshot.forEach(doc => {
                MemosModule.memos.push({ id: doc.id, ...doc.data() });
            });
            MemosModule.renderCards(MemosModule.memos);
        } catch (error) {
            console.error("Error loading memos", error);
            UI.showToast("خطأ في تحميل المذكرات", "error");
            document.getElementById('memos-grid').innerHTML = '<div style="grid-column: 1 / -1; text-align:center;">لا توجد بيانات</div>';
        }
    },

    renderCards: (data) => {
        const grid = document.getElementById('memos-grid');
        if (!grid) return;
        
        if (data.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1 / -1; text-align:center; padding:20px;">لا يوجد مذكرات مسجلة</div>';
            return;
        }

        grid.innerHTML = data.map(m => `
            <div class="section-card" style="display:flex; flex-direction:column; align-items:flex-start; position:relative; min-height:200px;">
                <div style="display:flex; justify-content:space-between; width:100%; margin-bottom:15px; border-bottom:1px solid var(--border-color); padding-bottom:10px;">
                    <h4 style="color:var(--primary-color); font-weight:bold; font-size:18px;">${m.title}</h4>
                    <div style="display:flex; gap:10px;">
                        <button class="icon-btn edit-memo" data-id="${m.id}" title="تعديل"><i class="fas fa-edit" style="color:var(--secondary-color);"></i></button>
                        <button class="icon-btn delete-memo" data-id="${m.id}" title="حذف" style="color:var(--danger-color); cursor:pointer;"><i class="fas fa-trash"></i></button>
                    </div>
                </div>
                <div style="font-size:14px; color:var(--text-muted); margin-bottom:10px;">
                    <i class="fas fa-folder-open"></i> طعن رقم: ${m.appealNumber || 'غير محدد'}
                </div>
                <div style="font-size:14px; color:var(--text-muted); margin-bottom:10px;">
                    <i class="fas fa-clock"></i> تم التحديث: ${m.updatedAt && typeof m.updatedAt.toDate === 'function' ? new Date(m.updatedAt.toDate()).toLocaleDateString('ar-EG') : 'الآن'}
                </div>
                <div style="flex:1; width:100%; font-size:13px; color:var(--text-color); background:rgba(0,0,0,0.02); padding:10px; border-radius:6px; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical;">
                    ${m.contentPlain || 'لا يوجد محتوى'}
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.edit-memo').forEach(btn => {
            btn.addEventListener('click', (e) => MemosModule.openModal(e.currentTarget.dataset.id));
        });
        
        document.querySelectorAll('.delete-memo').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(confirm('هل أنت متأكد من حذف هذه المذكرة؟ لا يمكن التراجع!')) {
                    await deleteDoc(doc(db, "memos", e.currentTarget.dataset.id));
                    UI.showToast("تم الحذف بنجاح", "success");
                    MemosModule.loadMemos();
                }
            });
        });
    },

    populateAppealSelect: () => {
        const select = document.getElementById('memo-appeal-id');
        if(!select) return;
        const current = select.value;
        select.innerHTML = '<option value="">اختر الطعن...</option>' + 
            AppealsModule.appeals.map(a => `<option value="${a.id}">${a.appealNumber} - ${a.plaintiff}</option>`).join('');
        if(current) select.value = current;
    },

    bindEvents: () => {
        const modal = document.getElementById('memo-modal');
        const form = document.getElementById('memo-form');
        const addBtn = document.getElementById('add-memo-btn');
        const closeBtn = document.getElementById('close-memo-modal-btn');
        const searchInput = document.getElementById('search-memo');
        const printBtn = document.getElementById('print-memo-btn');

        if(addBtn) addBtn.addEventListener('click', () => MemosModule.openModal());
        if(closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));

        if(printBtn) {
            printBtn.addEventListener('click', () => {
                const title = document.getElementById('memo-title').value || 'مذكرة';
                const content = document.getElementById('memo-content').innerHTML;
                const iframe = document.getElementById('print-frame');
                const docInst = iframe.contentWindow.document;
                docInst.open();
                docInst.write(`
                    <html dir="rtl" lang="ar">
                    <head>
                        <title>${title}</title>
                        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&display=swap" rel="stylesheet">
                        <style>
                            body { font-family: 'Cairo', sans-serif; padding: 40px; line-height: 1.6; }
                            h2 { text-align: center; color: #333; }
                        </style>
                    </head>
                    <body>
                        <h2>${title}</h2>
                        <hr>
                        <div>${content}</div>
                        <script>
                            setTimeout(() => { window.print(); }, 500);
                        </script>
                    </body>
                    </html>
                `);
                docInst.close();
            });
        }

        if(form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = form.querySelector('button[type="submit"]');
                const orig = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> حفظ...';

                const appealSelect = document.getElementById('memo-appeal-id');
                const selectedAppeal = AppealsModule.appeals.find(a => a.id === appealSelect.value);
                const contentHtml = document.getElementById('memo-content').innerHTML;
                const contentPlain = document.getElementById('memo-content').innerText;

                const id = document.getElementById('memo-id').value;
                const data = {
                    appealId: appealSelect.value,
                    appealNumber: selectedAppeal ? selectedAppeal.appealNumber : '',
                    title: document.getElementById('memo-title').value,
                    contentHtml: contentHtml,
                    contentPlain: contentPlain,
                    updatedAt: serverTimestamp()
                };

                try {
                    if (id) {
                        await updateDoc(doc(db, "memos", id), data);
                        UI.showToast("تم التحديث", "success");
                    } else {
                        data.createdAt = serverTimestamp();
                        await addDoc(collection(db, "memos"), data);
                        UI.showToast("تمت الإضافة", "success");
                    }
                    modal.classList.add('hidden');
                    await MemosModule.loadMemos();
                } catch (error) {
                    console.error("Save error", error);
                    UI.showToast("حدث خطأ", "error");
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = orig;
                }
            });
        }
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = MemosModule.memos.filter(m => 
                    (m.title && m.title.toLowerCase().includes(term)) ||
                    (m.contentPlain && m.contentPlain.toLowerCase().includes(term)) ||
                    (m.appealNumber && m.appealNumber.toLowerCase().includes(term))
                );
                MemosModule.renderCards(filtered);
            });
        }
    },

    openModal: async (id = null) => {
        if(AppealsModule.appeals.length === 0) {
            await AppealsModule.loadAppeals();
        }
        MemosModule.populateAppealSelect();

        const modal = document.getElementById('memo-modal');
        const title = document.getElementById('memo-modal-title');
        const form = document.getElementById('memo-form');
        form.reset();
        document.getElementById('memo-content').innerHTML = '';

        if (id) {
            title.textContent = "تعديل المذكرة";
            const memo = MemosModule.memos.find(m => m.id === id);
            if (memo) {
                document.getElementById('memo-id').value = memo.id;
                document.getElementById('memo-appeal-id').value = memo.appealId;
                document.getElementById('memo-title').value = memo.title;
                document.getElementById('memo-content').innerHTML = memo.contentHtml || '';
            }
        } else {
            title.textContent = "إنشاء مذكرة جديدة";
            document.getElementById('memo-id').value = '';
        }
        
        modal.classList.remove('hidden');
    }
};
