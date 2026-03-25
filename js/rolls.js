import { db } from './config.js';
import { collection, getDocs, addDoc, doc, deleteDoc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { UI } from './ui.js';

export const RollsModule = {
    rolls: [],
    
    init: async () => {
        RollsModule.renderBaseUI();
        await RollsModule.loadRolls();
        RollsModule.bindEvents();
    },

    renderBaseUI: () => {
        const container = document.getElementById('content-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="actions-bar" style="display:flex; justify-content:space-between; margin-bottom: 20px;">
                <button id="add-roll-btn" class="btn btn-primary"><i class="fas fa-plus"></i> إضافة رول جلسة جديد</button>
                <div class="search-box">
                    <input type="text" id="search-rolls" placeholder="ابحث في الرولات..." class="form-control" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-primary);">
                </div>
            </div>
            
            <div class="section-card" style="overflow-x: auto;">
                <table class="premium-table" style="width:100%;">
                    <thead>
                        <tr>
                            <th>التاريخ</th>
                            <th>المحكمة</th>
                            <th>الوصف / المرفق</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody id="rolls-table-body">
                        <tr><td colspan="4" style="text-align:center; padding:20px;">جاري تحميل البيانات...</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- Add Roll Modal -->
            <div id="roll-modal" class="modal-backdrop hidden" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000; display:flex; justify-content:center; align-items:center;">
                <div class="section-card modal-content" style="width: 90%; max-width: 450px; padding: 25px; border-radius: 12px;">
                    <h3 style="margin-bottom: 20px;">إضافة رول جلسة</h3>
                    <form id="roll-form">
                        <div class="form-group">
                            <label>تاريخ الرول</label>
                            <input type="date" id="roll-date" required>
                        </div>
                        <div class="form-group">
                            <label>المحكمة</label>
                            <input type="text" id="roll-court" placeholder="مثال: الدائرة 5 جنايات" required>
                        </div>
                        <div class="form-group">
                            <label>رابط الملف / ملاحظات</label>
                            <input type="text" id="roll-link" placeholder="رابط الملف المرفوع أو ملاحظات..." required>
                        </div>
                        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top: 20px;">
                            <button type="button" id="close-roll-modal" class="btn" style="background:var(--text-muted); color:white;">إلغاء</button>
                            <button type="submit" class="btn btn-primary">حفظ <i class="fas fa-save"></i></button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    },

    loadRolls: async () => {
        try {
            const rollsRef = collection(db, "rolls");
            const q = query(rollsRef, orderBy("date", "desc"));
            const snapshot = await getDocs(q);
            
            RollsModule.rolls = [];
            snapshot.forEach(doc => {
                RollsModule.rolls.push({ id: doc.id, ...doc.data() });
            });
            RollsModule.renderTable(RollsModule.rolls);
        } catch (error) {
            console.error("Error loading rolls", error);
            UI.showToast("خطأ في تحميل الرولات", "error");
        }
    },

    renderTable: (data) => {
        const tbody = document.getElementById('rolls-table-body');
        if (!tbody) return;
        
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px;">لا يوجد رولات مسجلة</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(r => `
            <tr>
                <td style="font-weight:bold;">${r.date}</td>
                <td>${r.court}</td>
                <td><a href="${r.link}" target="_blank" style="color:var(--accent-color); text-decoration:none;"><i class="fas fa-external-link-alt"></i> عرض الرول</a></td>
                <td>
                    <button class="icon-btn delete-roll" data-id="${r.id}"><i class="fas fa-trash" style="color:var(--danger-color);"></i></button>
                </td>
            </tr>
        `).join('');

        document.querySelectorAll('.delete-roll').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(confirm('هل أنت متأكد من حذف هذا الرول؟')) {
                    const id = e.currentTarget.dataset.id;
                    await deleteDoc(doc(db, "rolls", id));
                    RollsModule.loadRolls();
                }
            });
        });
    },

    bindEvents: () => {
        const modal = document.getElementById('roll-modal');
        document.getElementById('add-roll-btn')?.addEventListener('click', () => modal.classList.remove('hidden'));
        document.getElementById('close-roll-modal')?.addEventListener('click', () => modal.classList.add('hidden'));
        
        document.getElementById('roll-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const rollData = {
                date: document.getElementById('roll-date').value,
                court: document.getElementById('roll-court').value,
                link: document.getElementById('roll-link').value,
                createdAt: serverTimestamp()
            };

            try {
                await addDoc(collection(db, "rolls"), rollData);
                UI.showToast("تم إضافة الرول بنجاح", "success");
                modal.classList.add('hidden');
                RollsModule.loadRolls();
            } catch (error) {
                console.error("Error saving roll", error);
                UI.showToast("حدث خطأ أثناء الحفظ", "error");
            }
        });

        document.getElementById('search-rolls')?.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = RollsModule.rolls.filter(r => 
                r.court.toLowerCase().includes(term) || r.date.includes(term)
            );
            RollsModule.renderTable(filtered);
        });
    }
};
