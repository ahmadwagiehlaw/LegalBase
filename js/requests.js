import { db } from './config.js';
import { collection, getDocs, addDoc, updateDoc, doc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { UI } from './ui.js';
import { AppealsModule } from './appeals.js';
import { Utils } from './utils.js';

export const RequestsModule = {
    requests: [],
    
    init: async () => {
        RequestsModule.renderBaseUI();
        await RequestsModule.loadRequests();
        if (AppealsModule.appeals.length === 0) {
            await AppealsModule.loadAppeals();
        }
        RequestsModule.bindEvents();
    },

    renderBaseUI: () => {
        const container = document.getElementById('content-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="actions-bar" style="display:flex; justify-content:space-between; margin-bottom: 20px;">
                <button id="add-req-btn" class="btn btn-primary"><i class="fas fa-plus"></i> إضافة طلب جديد</button>
                <div class="search-box">
                    <input type="text" id="search-req" placeholder="ابحث باسم مقدم الطلب أو الطعن..." class="form-control" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-color);">
                </div>
            </div>
            
            <div class="section-card" style="overflow-x: auto;">
                <table class="premium-table" style="width:100%;">
                    <thead>
                        <tr>
                            <th>الطعن المرتبط</th>
                            <th>مقدم الطلب</th>
                            <th>نوع الطلب</th>
                            <th>حالة الطلب</th>
                            <th>تاريخ الطلب</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody id="req-table-body">
                        <tr><td colspan="6" style="text-align:center; padding:20px;">جاري تحميل البيانات... <i class="fas fa-spinner fa-spin"></i></td></tr>
                    </tbody>
                </table>
            </div>

            <div id="req-modal" class="modal-backdrop hidden" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000; display:flex; justify-content:center; align-items:center;">
                <div class="section-card modal-content" style="width: 90%; max-width: 600px; padding: 25px; border-radius: 12px; max-height: 90vh; overflow-y: auto;">
                    <h3 id="req-modal-title" style="margin-bottom: 20px; color: var(--primary-color);">إضافة طلب اطلاع/متابعة</h3>
                    <form id="req-form">
                        <input type="hidden" id="req-id">
                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                            <div class="form-group" style="grid-column: span 2;">
                                <label>رقم الطعن المرتبط</label>
                                <select id="req-appeal-id" style="width:100%; padding:12px; border-radius:8px; background:var(--bg-color); color:var(--text-color); border:1px solid var(--border-color);">
                                    <option value="">لا يوجد ارتباط (طلب عام)</option>
                                    <!-- Options injected via JS -->
                                </select>
                            </div>
                            <div class="form-group">
                                <label>مقدم الطلب</label>
                                <input type="text" id="req-name" required placeholder="اسم المحامي / المراجع">
                            </div>
                            <div class="form-group">
                                <label>نوع الطلب</label>
                                <select id="req-type" required style="width:100%; padding:12px; border-radius:8px; background:var(--bg-color); color:var(--text-color); border:1px solid var(--border-color);">
                                    <option value="اطلاع">طلب اطلاع</option>
                                    <option value="صورة رسمية">صورة رسمية</option>
                                    <option value="استعلام">استعلام مسار</option>
                                    <option value="أخرى">أخرى</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>حالة الطلب</label>
                                <select id="req-status" required style="width:100%; padding:12px; border-radius:8px; background:var(--bg-color); color:var(--text-color); border:1px solid var(--border-color);">
                                    <option value="قيد الدراسة">قيد الدراسة</option>
                                    <option value="تم الرد/منجز">تم الرد / منجز</option>
                                    <option value="مرفوض">مرفوض</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>الموعد المحدد / تاريخ المراجعة</label>
                                <input type="date" id="req-date">
                            </div>
                            <div class="form-group" style="grid-column: span 2;">
                                <label>الملاحظات (الرد)</label>
                                <textarea id="req-notes" style="width:100%; padding:12px; border-radius:8px; background:var(--bg-color); color:var(--text-color); border:1px solid var(--border-color);"></textarea>
                            </div>
                        </div>
                        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top: 20px;">
                            <button type="button" id="close-req-modal-btn" class="btn" style="background:var(--text-muted); color:white;">إلغاء</button>
                            <button type="submit" class="btn btn-primary">حفظ الطلب <i class="fas fa-save"></i></button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    },

    loadRequests: async () => {
        try {
            const reqRef = collection(db, "inspection_requests");
            const q = query(reqRef, orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            
            RequestsModule.requests = [];
            snapshot.forEach(doc => {
                RequestsModule.requests.push({ id: doc.id, ...doc.data() });
            });
            RequestsModule.renderTable(RequestsModule.requests);
        } catch (error) {
            console.error("Error loading requests", error);
            UI.showToast("خطأ في تحميل الطلبات", "error");
            const tbody = document.getElementById('req-table-body');
            if(tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">لا توجد بيانات</td></tr>`;
        }
    },

    renderTable: (data) => {
        const tbody = document.getElementById('req-table-body');
        if (!tbody) return;
        
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">لا توجد طلبات مسجلة</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(r => `
            <tr>
                <td style="font-weight:bold;">${r.appealNumber || '---'}</td>
                <td>${r.requesterName}</td>
                <td><span class="badge badge-info">${r.requestType}</span></td>
                <td><span class="badge ${r.requestStatus.includes('منجز') ? 'badge-success' : (r.requestStatus === 'مرفوض' ? 'badge-danger' : 'badge-warning')}">${r.requestStatus}</span></td>
                <td style="direction:ltr; text-align:right;">${Utils.formatDate(r.createdAt)}</td>
                <td style="display:flex; gap:10px;">
                    <button class="icon-btn edit-req" data-id="${r.id}" title="تعديل"><i class="fas fa-edit" style="color:var(--secondary-color);"></i></button>
                    <button class="icon-btn delete-req" data-id="${r.id}" title="حذف"><i class="fas fa-trash" style="color:var(--danger-color);"></i></button>
                </td>
            </tr>
        `).join('');

        document.querySelectorAll('.delete-req').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(confirm('هل أنت متأكد من حذف هذا الطلب؟')) {
                    const id = e.currentTarget.dataset.id;
                    await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js").then(module => {
                        module.deleteDoc(module.doc(db, "inspection_requests", id)).then(() => RequestsModule.loadRequests());
                    });
                }
            });
        });

        document.querySelectorAll('.edit-req').forEach(btn => {
            btn.addEventListener('click', (e) => {
                RequestsModule.openModal(e.currentTarget.dataset.id);
            });
        });
    },

    populateAppealSelect: () => {
        const select = document.getElementById('req-appeal-id');
        if(!select) return;
        const exist = select.value;
        select.innerHTML = '<option value="">لا يوجد ارتباط (طلب عام)</option>' + 
            AppealsModule.appeals.map(a => `<option value="${a.id}">${a.appealNumber} - ${a.plaintiff}</option>`).join('');
        if(exist) select.value = exist;
    },

    bindEvents: () => {
        const modal = document.getElementById('req-modal');
        const form = document.getElementById('req-form');
        const addBtn = document.getElementById('add-req-btn');
        const closeBtn = document.getElementById('close-req-modal-btn');
        const searchInput = document.getElementById('search-req');

        if(addBtn) addBtn.addEventListener('click', () => RequestsModule.openModal());
        if(closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));

        if(form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = form.querySelector('button[type="submit"]');
                const orig = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> حفظ...';

                const appealSelect = document.getElementById('req-appeal-id');
                const selectedAppeal = AppealsModule.appeals.find(a => a.id === appealSelect.value);

                const id = document.getElementById('req-id').value;
                const data = {
                    appealId: appealSelect.value,
                    appealNumber: selectedAppeal ? selectedAppeal.appealNumber : '',
                    requesterName: document.getElementById('req-name').value,
                    requestType: document.getElementById('req-type').value,
                    requestStatus: document.getElementById('req-status').value,
                    actionDate: document.getElementById('req-date').value,
                    notes: document.getElementById('req-notes').value,
                    updatedAt: serverTimestamp()
                };

                try {
                    if (id) {
                        await updateDoc(doc(db, "inspection_requests", id), data);
                        UI.showToast("تم تحديث الطلب", "success");
                    } else {
                        data.createdAt = serverTimestamp();
                        await addDoc(collection(db, "inspection_requests"), data);
                        UI.showToast("تمت الإضافة بنجاح", "success");
                    }
                    modal.classList.add('hidden');
                    await RequestsModule.loadRequests();
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
                const filtered = RequestsModule.requests.filter(r => 
                    (r.requesterName && r.requesterName.toLowerCase().includes(term)) ||
                    (r.appealNumber && r.appealNumber.toLowerCase().includes(term))
                );
                RequestsModule.renderTable(filtered);
            });
        }
    },

    openModal: async (id = null) => {
        if(AppealsModule.appeals.length === 0) {
            await AppealsModule.loadAppeals();
        }
        RequestsModule.populateAppealSelect();

        const modal = document.getElementById('req-modal');
        const title = document.getElementById('req-modal-title');
        const form = document.getElementById('req-form');
        form.reset();

        if (id) {
            title.textContent = "تعديل الطلب";
            const r = RequestsModule.requests.find(x => x.id === id);
            if (r) {
                document.getElementById('req-id').value = r.id;
                document.getElementById('req-appeal-id').value = r.appealId || '';
                document.getElementById('req-name').value = r.requesterName || '';
                document.getElementById('req-type').value = r.requestType || 'اطلاع';
                document.getElementById('req-status').value = r.requestStatus || 'قيد الدراسة';
                document.getElementById('req-date').value = r.actionDate || '';
                document.getElementById('req-notes').value = r.notes || '';
            }
        } else {
            title.textContent = "إضافة طلب جديد";
            document.getElementById('req-id').value = '';
            document.getElementById('req-date').value = new Date().toISOString().split('T')[0];
        }
        
        modal.classList.remove('hidden');
    }
};
