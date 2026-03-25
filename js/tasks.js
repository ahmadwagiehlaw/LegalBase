import { db } from './config.js';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { UI } from './ui.js';
import { AppealsModule } from './appeals.js';

export const TasksModule = {
    tasks: [],
    
    init: async () => {
        TasksModule.renderBaseUI();
        await TasksModule.loadTasks();
        if(AppealsModule.appeals.length === 0) {
            await AppealsModule.loadAppeals();
        }
        TasksModule.bindEvents();
    },

    renderBaseUI: () => {
        const container = document.getElementById('content-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="actions-bar" style="display:flex; justify-content:space-between; margin-bottom: 20px;">
                <button id="add-task-btn" class="btn btn-primary" style="background:var(--accent-color);"><i class="fas fa-plus"></i> إضافة مهمة جديدة</button>
            </div>
            
            <div class="dashboard-grid">
                <div class="grid-col-12 section-card">
                    <div class="section-header">
                        <h3>قائمة المهام الإدارية</h3>
                    </div>
                    <div id="tasks-list-container" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:15px;">
                        <i class="fas fa-spinner fa-spin"></i> جاري التحميل...
                    </div>
                </div>
            </div>

            <div id="task-modal" class="modal-backdrop hidden" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000; display:flex; justify-content:center; align-items:center;">
                <div class="section-card modal-content" style="width: 90%; max-width: 500px; padding: 25px;">
                    <h3 id="task-modal-title" style="margin-bottom:20px; color:var(--primary-color);">إضافة مهمة</h3>
                    <form id="task-form">
                        <input type="hidden" id="task-id">
                        <div class="form-group">
                            <label>عنوان المهمة</label>
                            <input type="text" id="task-title" required placeholder="مثال: مراجعة ملف الطعن">
                        </div>
                        <div class="form-group">
                            <label>الطعن المرتبط (اختياري)</label>
                            <select id="task-appeal-id" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border-color);">
                                <option value="">غير مرتبط بطعن محدد</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>الأولوية</label>
                            <select id="task-priority" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border-color);">
                                <option value="عاجل">عاجل</option>
                                <option value="هام">هام</option>
                                <option value="عادي" selected>عادي</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>تاريخ الاستحقاق</label>
                            <input type="date" id="task-due">
                        </div>
                        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top: 20px;">
                            <button type="button" id="close-task-modal-btn" class="btn" style="background:var(--text-muted); color:white;">إلغاء</button>
                            <button type="submit" class="btn btn-primary">حفظ المهمة <i class="fas fa-check"></i></button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    },

    loadTasks: async () => {
        try {
            const q = query(collection(db, "tasks"), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            TasksModule.tasks = [];
            snapshot.forEach(doc => TasksModule.tasks.push({id: doc.id, ...doc.data()}));
            TasksModule.renderList();
        } catch (e) { console.error(e); }
    },

    renderList: () => {
        const container = document.getElementById('tasks-list-container');
        if(!container) return;
        
        if(TasksModule.tasks.length === 0) {
            container.innerHTML = '<p>لا توجد مهام حالياً</p>';
            return;
        }

        container.innerHTML = TasksModule.tasks.map(t => `
            <div class="premium-stat" style="justify-content:space-between; flex-direction:column; align-items:flex-start; height:auto; padding:15px; background:${t.completed ? '#f0f4f8' : '#fff'}; opacity:${t.completed ? '0.7' : '1'}">
                <div style="width:100%; display:flex; justify-content:space-between; align-items:center;">
                    <strong style="text-decoration:${t.completed ? 'line-through' : 'none'}; color:var(--primary-color)">${t.title}</strong>
                    <span class="badge ${t.priority === 'عاجل' ? 'badge-danger' : (t.priority === 'هام' ? 'badge-warning' : 'badge-info')}">${t.priority}</span>
                </div>
                <div style="font-size:0.8rem; color:var(--text-muted); margin:10px 0;">
                    ${t.appealNumber ? `<i class="fas fa-link"></i> طعن: ${t.appealNumber}` : '<i class="fas fa-info-circle"></i> مهمة عامة'}<br>
                    <i class="fas fa-clock"></i> استحقاق: ${t.dueDate || 'غير محدد'}
                </div>
                <div style="width:100%; display:flex; justify-content:flex-end; gap:10px;">
                    <button class="action-btn toggle-task" data-id="${t.id}" data-done="${t.completed}" style="background:none; border:none; color:var(--success-color); cursor:pointer;"><i class="fas ${t.completed ? 'fa-undo' : 'fa-check-circle'}"></i></button>
                    <button class="action-btn delete-task" data-id="${t.id}" style="background:none; border:none; color:var(--danger-color); cursor:pointer;"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.toggle-task').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                const status = e.currentTarget.dataset.done === 'true';
                await updateDoc(doc(db, "tasks", id), { completed: !status });
                TasksModule.loadTasks();
            });
        });

        document.querySelectorAll('.delete-task').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(confirm('حذف هذه المهمة؟')) {
                    await deleteDoc(doc(db, "tasks", e.currentTarget.dataset.id));
                    TasksModule.loadTasks();
                }
            });
        });
    },

    bindEvents: () => {
        const modal = document.getElementById('task-modal');
        const form = document.getElementById('task-form');
        
        document.getElementById('add-task-btn')?.addEventListener('click', () => {
            const select = document.getElementById('task-appeal-id');
            select.innerHTML = '<option value="">غير مرتبط بطعن محدد</option>' + 
                AppealsModule.appeals.map(a => `<option value="${a.id}">${a.appealNumber}</option>`).join('');
            form.reset();
            document.getElementById('task-id').value = '';
            modal.classList.remove('hidden');
        });

        document.getElementById('close-task-modal-btn')?.addEventListener('click', () => modal.classList.add('hidden'));

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const appealId = document.getElementById('task-appeal-id').value;
            const selectedAppeal = AppealsModule.appeals.find(a => a.id === appealId);
            
            const data = {
                title: document.getElementById('task-title').value,
                appealId: appealId,
                appealNumber: selectedAppeal ? selectedAppeal.appealNumber : '',
                priority: document.getElementById('task-priority').value,
                dueDate: document.getElementById('task-due').value,
                completed: false,
                createdAt: serverTimestamp()
            };

            await addDoc(collection(db, "tasks"), data);
            modal.classList.add('hidden');
            TasksModule.loadTasks();
            UI.showToast("تمت إضافة المهمة");
        });
    }
};
