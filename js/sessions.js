import { db } from './config.js';
import { collection, getDocs, addDoc, updateDoc, doc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { UI } from './ui.js';
import { AppealsModule } from './appeals.js';

export const SessionsModule = {
    sessions: [],
    
    init: async () => {
        SessionsModule.renderBaseUI();
        await SessionsModule.loadSessions();
        // Load appeals silently so we have them for the add/edit dropdown
        if (AppealsModule.appeals.length === 0) {
            await AppealsModule.loadAppeals();
        }
        SessionsModule.bindEvents();
    },

    renderBaseUI: () => {
        const container = document.getElementById('content-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="actions-bar" style="display:flex; justify-content:space-between; margin-bottom: 20px;">
                <button id="add-session-btn" class="btn btn-primary"><i class="fas fa-plus"></i> إضافة جلسة جديدة</button>
                <div class="search-box" style="display:flex; gap:10px;">
                    <input type="date" id="search-session-date" class="form-control" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-color);" title="تصفية بالتاريخ">
                    <button class="btn" id="clear-search-btn" style="background:var(--bg-color); border:1px solid var(--border-color); color:var(--text-color);"><i class="fas fa-times"></i></button>
                </div>
            </div>
            
            <div class="section-card" style="margin-bottom:20px; border-top:4px solid var(--accent-color); background:linear-gradient(135deg, rgba(59,130,246,0.08), rgba(15,23,42,0.02));">
                <div style="display:flex; justify-content:space-between; align-items:center; gap:15px; flex-wrap:wrap;">
                    <div style="max-width:760px;">
                        <h3 style="margin:0 0 8px 0; color:var(--text-primary);">سجل الجلسات اليدوي</h3>
                        <p style="margin:0; color:var(--text-muted); line-height:1.9;">
                            هذه الصفحة مخصصة لإدخال جلسات منفصلة أو أرشفتها يدويًا. أما التشغيل اليومي الحقيقي مثل الجلسة القادمة، آخر جلسة، الترحيل، الفلاتر العملية، والمتابعة السريعة للدعاوى فموجود في أجندة الجلسات.
                        </p>
                    </div>
                    <button id="go-to-agenda-btn" class="btn btn-primary" style="white-space:nowrap;">
                        <i class="fas fa-calendar-alt"></i> فتح أجندة الجلسات
                    </button>
                </div>
            </div>

            <div class="section-card" style="overflow-x: auto;">
                <table class="premium-table" style="width:100%;">
                    <thead>
                        <tr>
                            <th>رقم الطعن</th>
                            <th>تاريخ الجلسة</th>
                            <th>نوع الجلسة</th>
                            <th>حالة الأجندة / القرار</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody id="sessions-table-body">
                        <tr><td colspan="5" style="text-align:center; padding:20px;">جاري تحميل البيانات... <i class="fas fa-spinner fa-spin"></i></td></tr>
                    </tbody>
                </table>
            </div>

            <div id="session-modal" class="modal-backdrop hidden" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000; display:flex; justify-content:center; align-items:center;">
                <div class="section-card modal-content" style="width: 90%; max-width: 500px; padding: 25px; border-radius: 12px; max-height: 90vh; overflow-y: auto;">
                    <h3 id="session-modal-title" style="margin-bottom: 20px; color: var(--primary-color);">إضافة جلسة</h3>
                    <form id="session-form">
                        <input type="hidden" id="session-id">
                        <div style="display:grid; grid-template-columns: 1fr; gap: 15px;">
                            <div class="form-group">
                                <label>رقم الطعن المرتبط</label>
                                <select id="session-appeal-id" required style="width:100%; padding:12px; border-radius:8px; background:var(--bg-color); color:var(--text-color); border:1px solid var(--border-color);">
                                    <option value="">اختر الطعن...</option>
                                    <!-- Options injected via JS -->
                                </select>
                            </div>
                            <div class="form-group">
                                <label>تاريخ الجلسة</label>
                                <input type="date" id="session-date" required>
                            </div>
                            <div class="form-group">
                                <label>نوع الجلسة</label>
                                <select id="session-type" required style="width:100%; padding:12px; border-radius:8px; background:var(--bg-color); color:var(--text-color); border:1px solid var(--border-color);">
                                    <option value="فحص">جلسة فحص</option>
                                    <option value="حكم">جلسة حكم</option>
                                    <option value="إجرائية">جلسة إجرائية</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>حالة الأجندة / القرار</label>
                                <input type="text" id="session-agenda" placeholder="مثال: مؤجلة للإعلان، محجوزة للحكم...">
                            </div>
                            <div class="form-group">
                                <label>الوقائع وما تم بالجلسة</label>
                                <textarea id="session-facts" style="width:100%; padding:12px; border-radius:8px; background:var(--bg-color); color:var(--text-color); border:1px solid var(--border-color); min-height:80px;" placeholder="اكتب وقائع الجلسة بالتفصيل..."></textarea>
                            </div>
                            <div class="form-group">
                                <label>الطلبات والقرارات</label>
                                <textarea id="session-requests" style="width:100%; padding:12px; border-radius:8px; background:var(--bg-color); color:var(--text-color); border:1px solid var(--border-color); min-height:80px;" placeholder="الطلبات المقدمة وقرار الدائرة..."></textarea>
                            </div>
                        </div>
                        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top: 20px;">
                            <button type="button" id="close-session-modal-btn" class="btn" style="background:var(--text-muted); color:white;">إلغاء</button>
                            <button type="submit" class="btn btn-primary">حفظ <i class="fas fa-save"></i></button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    },

    loadSessions: async () => {
        try {
            const sessionsRef = collection(db, "sessions");
            const q = query(sessionsRef, orderBy("sessionDate", "desc"));
            const snapshot = await getDocs(q);
            
            SessionsModule.sessions = [];
            snapshot.forEach(doc => {
                SessionsModule.sessions.push({ id: doc.id, ...doc.data() });
            });
            SessionsModule.renderTable(SessionsModule.sessions);
        } catch (error) {
            console.error("Error loading sessions", error);
            UI.showToast("خطأ في تحميل الجلسات", "error");
            const tbody = document.getElementById('sessions-table-body');
            if(tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">لا توجد بيانات أو حدث خطأ</td></tr>`;
        }
    },

    renderTable: (data) => {
        const tbody = document.getElementById('sessions-table-body');
        if (!tbody) return;
        
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">لا يوجد جلسات مسجلة</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(s => `
            <tr>
                <td style="font-weight:bold;">${s.appealNumber || 'غير محدد'}</td>
                <td style="direction:ltr; text-align:right;">${s.sessionDate}</td>
                <td><span class="badge ${s.sessionType === 'حكم' ? 'badge-danger' : 'badge-warning'}">${s.sessionType}</span></td>
                <td>${s.agendaStatus || '---'}</td>
                <td style="display:flex; gap:10px;">
                    <button class="icon-btn edit-session" data-id="${s.id}" title="تعديل"><i class="fas fa-edit" style="color:var(--secondary-color);"></i></button>
                    <button class="icon-btn delete-session" data-id="${s.id}" title="حذف"><i class="fas fa-trash" style="color:var(--danger-color);"></i></button>
                </td>
            </tr>
        `).join('');

        document.querySelectorAll('.delete-session').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(confirm('هل أنت متأكد من حذف هذه الجلسة؟')) {
                    const id = e.currentTarget.dataset.id;
                    await import("https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js").then(module => {
                        module.deleteDoc(module.doc(db, "sessions", id)).then(() => SessionsModule.loadSessions());
                    });
                }
            });
        });

        document.querySelectorAll('.edit-session').forEach(btn => {
            btn.addEventListener('click', (e) => {
                SessionsModule.openModal(e.currentTarget.dataset.id);
            });
        });
    },

    populateAppealSelect: () => {
        const select = document.getElementById('session-appeal-id');
        if(!select) return;
        
        const existingVal = select.value;
        select.innerHTML = '<option value="">اختر الطعن...</option>' + 
            AppealsModule.appeals.map(a => `<option value="${a.id}">${a.appealNumber} - ${a.plaintiff}</option>`).join('');
            
        if(existingVal) select.value = existingVal;
    },

    bindEvents: () => {
        const modal = document.getElementById('session-modal');
        const form = document.getElementById('session-form');
        const addBtn = document.getElementById('add-session-btn');
        const closeBtn = document.getElementById('close-session-modal-btn');
        const searchDate = document.getElementById('search-session-date');
        const clearSearchBtn = document.getElementById('clear-search-btn');

        if(addBtn) addBtn.addEventListener('click', () => SessionsModule.openModal());
        if(closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
        document.getElementById('go-to-agenda-btn')?.addEventListener('click', () => {
            window.App?.navigate?.('agenda');
        });

        if(form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = form.querySelector('button[type="submit"]');
                const origHtml = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> حفظ...';

                const appealSelect = document.getElementById('session-appeal-id');
                const selectedAppeal = AppealsModule.appeals.find(a => a.id === appealSelect.value);

                const id = document.getElementById('session-id').value;
                const data = {
                    appealId: appealSelect.value,
                    appealNumber: selectedAppeal ? selectedAppeal.appealNumber : '',
                    sessionDate: document.getElementById('session-date').value,
                    sessionType: document.getElementById('session-type').value,
                    agendaStatus: document.getElementById('session-agenda').value,
                    facts: document.getElementById('session-facts').value,
                    requests: document.getElementById('session-requests').value,
                    updatedAt: serverTimestamp()
                };

                try {
                    if (id) {
                        await updateDoc(doc(db, "sessions", id), data);
                        UI.showToast("تم تحديث الجلسة", "success");
                    } else {
                        data.createdAt = serverTimestamp();
                        await addDoc(collection(db, "sessions"), data);
                        UI.showToast("تمت الإضافة", "success");
                    }
                    modal.classList.add('hidden');
                    await SessionsModule.loadSessions();
                } catch (error) {
                    console.error("Save error", error);
                    UI.showToast("حدث خطأ", "error");
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = origHtml;
                }
            });
        }
        
        if (searchDate) {
            searchDate.addEventListener('change', (e) => {
                const term = e.target.value;
                if(!term) {
                    SessionsModule.renderTable(SessionsModule.sessions);
                    return;
                }
                const filtered = SessionsModule.sessions.filter(s => s.sessionDate === term);
                SessionsModule.renderTable(filtered);
            });
        }
        
        if (clearSearchBtn && searchDate) {
            clearSearchBtn.addEventListener('click', () => {
                searchDate.value = '';
                SessionsModule.renderTable(SessionsModule.sessions);
            });
        }
    },

    openModal: async (id = null) => {
        if(AppealsModule.appeals.length === 0) {
            await AppealsModule.loadAppeals();
        }
        SessionsModule.populateAppealSelect();

        const modal = document.getElementById('session-modal');
        const title = document.getElementById('session-modal-title');
        const form = document.getElementById('session-form');
        form.reset();

        if (id) {
            title.textContent = "تعديل الجلسة";
            const session = SessionsModule.sessions.find(s => s.id === id);
            if (session) {
                document.getElementById('session-id').value = session.id;
                document.getElementById('session-appeal-id').value = session.appealId;
                document.getElementById('session-date').value = session.sessionDate;
                document.getElementById('session-type').value = session.sessionType;
                document.getElementById('session-agenda').value = session.agendaStatus || '';
                document.getElementById('session-facts').value = session.facts || '';
                document.getElementById('session-requests').value = session.requests || '';
            }
        } else {
            title.textContent = "إضافة جلسة";
            document.getElementById('session-id').value = '';
            // set default date to today
            document.getElementById('session-date').value = new Date().toISOString().split('T')[0];
        }
        
        modal.classList.remove('hidden');
    }
};
