import { db } from './config.js';
import { collection, getDocs, addDoc, updateDoc, doc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { UI } from './ui.js';
import { AppealsModule } from './appeals.js';

export const JudgmentsModule = {
    judgments: [],
    
    init: async () => {
        JudgmentsModule.renderBaseUI();
        await JudgmentsModule.loadJudgments();
        if (AppealsModule.appeals.length === 0) {
            await AppealsModule.loadAppeals();
        }
        JudgmentsModule.bindEvents();
    },

    renderBaseUI: () => {
        const container = document.getElementById('content-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="actions-bar" style="display:flex; justify-content:space-between; margin-bottom: 20px;">
                <button id="add-judgment-btn" class="btn btn-primary"><i class="fas fa-plus"></i> تسجيل حكم جديد</button>
                <div class="search-box">
                    <input type="text" id="search-judgment" placeholder="ابحث في الأحكام..." class="form-control" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-color);">
                </div>
            </div>
            
            <div class="section-card" style="overflow-x: auto;">
                <table class="premium-table" style="width:100%;">
                    <thead>
                        <tr>
                            <th>رقم الطعن</th>
                            <th>تاريخ الحكم</th>
                            <th>منطوق الحكم / الملخص</th>
                            <th>تصنيف النتيجة</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody id="judgments-table-body">
                        <tr><td colspan="5" style="text-align:center; padding:20px;">جاري تحميل البيانات... <i class="fas fa-spinner fa-spin"></i></td></tr>
                    </tbody>
                </table>
            </div>

            <div id="judgment-modal" class="modal-backdrop hidden" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000; display:flex; justify-content:center; align-items:center;">
                <div class="section-card modal-content" style="width: 90%; max-width: 600px; padding: 25px; border-radius: 12px; max-height: 90vh; overflow-y: auto;">
                    <h3 id="judgment-modal-title" style="margin-bottom: 20px; color: var(--primary-color);">تسجيل حكم</h3>
                    <form id="judgment-form">
                        <input type="hidden" id="judgment-id">
                        <div style="display:grid; grid-template-columns: 1fr; gap: 15px;">
                            <div class="form-group">
                                <label>رقم الطعن المرتبط</label>
                                <select id="judgment-appeal-id" required style="width:100%; padding:12px; border-radius:8px; background:var(--bg-color); color:var(--text-color); border:1px solid var(--border-color);">
                                    <option value="">اختر الطعن...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>تاريخ الحكم</label>
                                <input type="date" id="judgment-date" required>
                            </div>
                            <div class="form-group">
                                <label>منطوق الحكم / الملخص</label>
                                <textarea id="judgment-summary" required style="width:100%; padding:12px; border-radius:8px; background:var(--bg-color); color:var(--text-color); border:1px solid var(--border-color); min-height:80px;"></textarea>
                            </div>
                            <div class="form-group">
                                <label>تصنيف النتيجة</label>
                                <select id="judgment-result" required style="width:100%; padding:12px; border-radius:8px; background:var(--bg-color); color:var(--text-color); border:1px solid var(--border-color);">
                                    <option value="لصالحنا">لصالح الجهة (إيجابي)</option>
                                    <option value="ضدنا">ضد الجهة (سلبي)</option>
                                    <option value="حكم تمهيدي">حكم تمهيدي</option>
                                </select>
                            </div>
                        </div>
                        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top: 20px;">
                            <button type="button" id="close-judgment-modal-btn" class="btn" style="background:var(--text-muted); color:white;">إلغاء</button>
                            <button type="submit" class="btn btn-primary">حفظ <i class="fas fa-save"></i></button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    },

    loadJudgments: async () => {
        try {
            const judgmentsRef = collection(db, "judgments");
            const q = query(judgmentsRef, orderBy("judgmentDate", "desc"));
            const snapshot = await getDocs(q);
            
            JudgmentsModule.judgments = [];
            snapshot.forEach(doc => {
                JudgmentsModule.judgments.push({ id: doc.id, ...doc.data() });
            });
            JudgmentsModule.renderTable(JudgmentsModule.judgments);
        } catch (error) {
            console.error("Error loading judgments", error);
            UI.showToast("خطأ في تحميل الأحكام", "error");
            const tbody = document.getElementById('judgments-table-body');
            if(tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">لا توجد بيانات</td></tr>`;
        }
    },

    renderTable: (data) => {
        const tbody = document.getElementById('judgments-table-body');
        if (!tbody) return;
        
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">لا يوجد أحكام مسجلة</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(j => `
            <tr>
                <td style="font-weight:bold;"><a href="#" class="case-link" onclick="if(window.AppealsModule) window.AppealsModule.viewAppeal('${j.appealId}'); return false;" style="color:var(--accent-color); text-decoration:none;">${j.appealNumber || ''}</a></td>
                <td style="direction:ltr; text-align:right;">${j.judgmentDate}</td>
                <td>${j.judgmentSummary?.substring(0, 50) || ''}...</td>
                <td><span class="badge ${j.resultCategory === 'لصالحنا' ? 'badge-success' : (j.resultCategory === 'ضدنا' ? 'badge-danger' : 'badge-warning')}">${j.resultCategory}</span></td>
                <td style="display:flex; gap:10px;">
                    <button class="icon-btn edit-judgment" data-id="${j.id}" title="تعديل"><i class="fas fa-edit" style="color:var(--secondary-color);"></i></button>
                    <button class="icon-btn delete-judgment" data-id="${j.id}" title="حذف"><i class="fas fa-trash" style="color:var(--danger-color);"></i></button>
                </td>
            </tr>
        `).join('');

        document.querySelectorAll('.delete-judgment').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(confirm('هل أنت متأكد من حذف هذا الحكم؟')) {
                    const id = e.currentTarget.dataset.id;
                    await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js").then(module => {
                        module.deleteDoc(module.doc(db, "judgments", id)).then(() => JudgmentsModule.loadJudgments());
                    });
                }
            });
        });

        document.querySelectorAll('.edit-judgment').forEach(btn => {
            btn.addEventListener('click', (e) => {
                JudgmentsModule.openModal(e.currentTarget.dataset.id);
            });
        });
    },

    populateAppealSelect: () => {
        const select = document.getElementById('judgment-appeal-id');
        if(!select) return;
        const current = select.value;
        select.innerHTML = '<option value="">اختر الطعن...</option>' + 
            AppealsModule.appeals.map(a => `<option value="${a.id}">${a.appealNumber} - ${a.plaintiff}</option>`).join('');
        if(current) select.value = current;
    },

    bindEvents: () => {
        const modal = document.getElementById('judgment-modal');
        const form = document.getElementById('judgment-form');
        const addBtn = document.getElementById('add-judgment-btn');
        const closeBtn = document.getElementById('close-judgment-modal-btn');
        const searchInput = document.getElementById('search-judgment');

        if(addBtn) addBtn.addEventListener('click', () => JudgmentsModule.openModal());
        if(closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));

        if(form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = form.querySelector('button[type="submit"]');
                const orig = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> حفظ...';

                const appealSelect = document.getElementById('judgment-appeal-id');
                const selectedAppeal = AppealsModule.appeals.find(a => a.id === appealSelect.value);

                const id = document.getElementById('judgment-id').value;
                const data = {
                    appealId: appealSelect.value,
                    appealNumber: selectedAppeal ? selectedAppeal.appealNumber : '',
                    judgmentDate: document.getElementById('judgment-date').value,
                    judgmentSummary: document.getElementById('judgment-summary').value,
                    resultCategory: document.getElementById('judgment-result').value,
                    updatedAt: serverTimestamp()
                };

                try {
                    if (id) {
                        await updateDoc(doc(db, "judgments", id), data);
                        UI.showToast("تم التحديث", "success");
                    } else {
                        data.createdAt = serverTimestamp();
                        await addDoc(collection(db, "judgments"), data);
                        UI.showToast("تمت الإضافة", "success");
                    }
                    modal.classList.add('hidden');
                    await JudgmentsModule.loadJudgments();
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
                const filtered = JudgmentsModule.judgments.filter(j => 
                    (j.appealNumber && j.appealNumber.toLowerCase().includes(term)) ||
                    (j.judgmentSummary && j.judgmentSummary.toLowerCase().includes(term))
                );
                JudgmentsModule.renderTable(filtered);
            });
        }
    },

    openModal: async (id = null) => {
        if(AppealsModule.appeals.length === 0) {
            await AppealsModule.loadAppeals();
        }
        JudgmentsModule.populateAppealSelect();

        const modal = document.getElementById('judgment-modal');
        const title = document.getElementById('judgment-modal-title');
        const form = document.getElementById('judgment-form');
        form.reset();

        if (id) {
            title.textContent = "تعديل الحكم";
            const judgment = JudgmentsModule.judgments.find(j => j.id === id);
            if (judgment) {
                document.getElementById('judgment-id').value = judgment.id;
                document.getElementById('judgment-appeal-id').value = judgment.appealId;
                document.getElementById('judgment-date').value = judgment.judgmentDate;
                document.getElementById('judgment-summary').value = judgment.judgmentSummary || '';
                document.getElementById('judgment-result').value = judgment.resultCategory || 'لصالحنا';
            }
        } else {
            title.textContent = "تسجيل حكم جديد";
            document.getElementById('judgment-id').value = '';
            document.getElementById('judgment-date').value = new Date().toISOString().split('T')[0];
        }
        
        modal.classList.remove('hidden');
    }
};
