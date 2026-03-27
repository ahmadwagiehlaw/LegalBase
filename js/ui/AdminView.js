import { db, firebaseEnabled, collection, getDocs, doc, updateDoc } from '../auth/FirebaseConfig.js';

export class AdminView {
    constructor(container, app) {
        this.container = container;
        this.app = app;
        this.users = [];
    }

    async render() {
        this.container.innerHTML = `
            <div class="page-header">
                <div class="header-titles">
                    <h2><ion-icon name="shield-half-outline"></ion-icon> لوحة الإدارة والصلاحيات</h2>
                    <p>إدارة طلبات الانضمام، الصلاحيات، وتكوين فرق العمل (الدوائر).</p>
                </div>
                <div class="header-actions">
                    <button class="btn btn-primary" id="btn-refresh-users"><ion-icon name="refresh-outline"></ion-icon> تحديث</button>
                </div>
            </div>
            
            <div class="page-body">
                <div class="loader-container" id="admin-loader"><div class="loader"></div></div>
                
                <div class="table-responsive" id="admin-table-container" style="display: none;">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>البريد الإلكتروني</th>
                                <th>تاريخ التسجيل</th>
                                <th>الحالة / الصلاحية</th>
                                <th>رقم فريق العمل (Team ID)</th>
                                <th>إجراءات</th>
                            </tr>
                        </thead>
                        <tbody id="users-tbody">
                            <!-- Users injected here -->
                        </tbody>
                    </table>
                </div>

                <div class="settings-card full-width" style="margin-top: 30px; border: 1px dashed var(--warning);">
                    <div class="card-header">
                        <h3><ion-icon name="cloud-upload-outline"></ion-icon> ترحيل البيانات المحلية (Migration)</h3>
                    </div>
                    <div style="padding: 16px;">
                        <p style="color: var(--text-muted); margin-bottom: 16px;">
                            إذا كان لديك بيانات قديمة مخزنة محلياً على هذا الجهاز وترغب في رفعها لفريق العمل الحالي على السحابة، استخدم هذا الزر. 
                            <strong>تنبيه:</strong> سيتم دمج البيانات المحلية مع بيانات الفريق الحالية.
                        </p>
                        <button class="btn btn-warning" id="btn-migrate-local-to-cloud">
                            <ion-icon name="rocket-outline"></ion-icon> ترحيل البيانات المحلية للسحابة الآن
                        </button>
                        <div id="migration-status" style="margin-top: 12px; font-weight: 600;"></div>
                    </div>
                </div>
            </div>
        `;
        
        await this.loadUsers();
        this.setupEvents();
    }

    async loadUsers() {
        const loader = this.container.querySelector('#admin-loader');
        const tblCont = this.container.querySelector('#admin-table-container');
        const tbody = this.container.querySelector('#users-tbody');
        
        loader.style.display = 'flex';
        tblCont.style.display = 'none';

        if (!firebaseEnabled || !db) {
            loader.innerHTML = `
                <div style="text-align:center; padding: 30px;">
                    <ion-icon name="key-outline" style="font-size: 2.5rem; color: var(--warning); margin-bottom: 12px;"></ion-icon>
                    <h4 style="margin-bottom: 8px;">Firebase غير مهيأ</h4>
                    <p style="color: var(--text-muted); font-size:0.9em;">
                        تم إزالة المفاتيح الحساسة من المستودع. أضف إعدادات Firebase محليًا داخل <code>js/runtime-config.js</code> ثم أعد تحميل الصفحة.
                    </p>
                </div>`;
            return;
        }

        try {
            const snap = await getDocs(collection(db, 'users'));
            this.users = [];
            snap.forEach(docSnap => {
                this.users.push({ uid: docSnap.id, ...docSnap.data() });
            });

            // Handle empty state
            if (this.users.length === 0) {
                loader.innerHTML = `
                    <div style="text-align:center; padding: 40px;">
                        <ion-icon name="people-outline" style="font-size: 3rem; color: var(--primary); margin-bottom: 16px;"></ion-icon>
                        <h3 style="margin-bottom: 8px;">قاعدة البيانات جديدة</h3>
                        <p style="color: var(--text-muted);">لا يوجد مستخدمون مسجلون بعد في هذا المشروع. قم بتسجيل الدخول وسيتم إنشاء سجلك تلقائياً، ثم الترقية لمدير من هنا.</p>
                    </div>`;
                return;
            }

            tbody.innerHTML = this.users.map(u => {
                return `
                    <tr data-uid="${u.uid}">
                        <td><strong>${u.email || u.uid}</strong></td>
                        <td><span style="direction: ltr; display: inline-block;">${u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-EG') : '-'}</span></td>
                        <td>
                            <select class="role-select" style="background: rgba(0,0,0,0.3); border: 1px solid var(--glass-border); color: var(--text-main); padding: 4px 8px; border-radius: 4px;">
                                <option value="pending" ${u.role === 'pending' ? 'selected' : ''}>قيد المراجعة</option>
                                <option value="user" ${u.role === 'user' ? 'selected' : ''}>مستخدم نشط</option>
                                <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>مدير نظام</option>
                            </select>
                        </td>
                        <td>
                            <input type="text" class="team-input" value="${u.teamId || ''}" placeholder="أدخل ID الفريق..." style="background: rgba(0,0,0,0.3); border: 1px solid var(--glass-border); color: var(--text-main); padding: 4px 8px; border-radius: 4px; width: 100%;">
                        </td>
                        <td>
                            <button class="btn btn-sm btn-primary btn-save-user"><ion-icon name="save-outline"></ion-icon> حفظ</button>
                        </td>
                    </tr>`;
            }).join('');

            loader.style.display = 'none';
            tblCont.style.display = 'block';

        } catch (error) {
            console.error("Admin load error:", error);
            // Specific message based on error type
            const isPermissionError = error.code === 'permission-denied';
            loader.innerHTML = `
                <div style="text-align:center; padding: 30px;">
                    <ion-icon name="${isPermissionError ? 'lock-closed-outline' : 'wifi-outline'}" style="font-size: 2.5rem; color: var(--danger); margin-bottom: 12px;"></ion-icon>
                    <h4 style="color: var(--danger); margin-bottom: 8px;">${isPermissionError ? 'صلاحيات غير كافية' : 'خطأ في الاتصال'}</h4>
                    <p style="color: var(--text-muted); font-size:0.9em;">
                        ${isPermissionError 
                            ? 'قاعدة البيانات الجديدة تعمل في وضع الاختبار.<br>يرجى تطبيق قواعد الأمان المرفقة في ملف المراجعة من Firebase Console → Firestore → Rules ثم قم بتحديث الصفحة.' 
                            : error.message}
                    </p>
                    <button class="btn btn-primary" onclick="location.reload()" style="margin-top: 16px;">إعادة المحاولة</button>
                </div>`;
        }
    }

    setupEvents() {
        this.container.querySelector('#btn-refresh-users').addEventListener('click', () => {
            this.loadUsers();
        });

        this.container.addEventListener('click', async (e) => {
            if(e.target.closest('.btn-save-user')) {
                const tr = e.target.closest('tr');
                const uid = tr.dataset.uid;
                const newRole = tr.querySelector('.role-select').value;
                let newTeamId = tr.querySelector('.team-input').value.trim();
                if(newTeamId === '') newTeamId = null;

                const btn = e.target.closest('.btn-save-user');
                const originalHtml = btn.innerHTML;
                btn.innerHTML = 'جاري الحفظ...';
                btn.disabled = true;

                try {
                    await updateDoc(doc(db, 'users', uid), {
                        role: newRole,
                        teamId: newTeamId
                    });
                    btn.innerHTML = '<ion-icon name="checkmark-outline"></ion-icon> تم';
                    btn.classList.replace('btn-primary', 'btn-success');
                    setTimeout(() => {
                        btn.innerHTML = originalHtml;
                        btn.classList.replace('btn-success', 'btn-primary');
                        btn.disabled = false;
                    }, 2000);
                } catch(err) {
                    console.error(err);
                    alert("تعذر الحفظ. جرب مجدداً.");
                    btn.innerHTML = originalHtml;
                    btn.disabled = false;
                }
            }

            if(e.target.closest('#btn-migrate-local-to-cloud')) {
                const btn = e.target.closest('#btn-migrate-local-to-cloud');
                const status = this.container.querySelector('#migration-status');
                
                if(!confirm('هل أنت متأكد من رغبتك في رفع كافة البيانات المحلية المتوفرة حالياً إلى السحابة؟')) return;

                btn.disabled = true;
                btn.innerHTML = '<ion-icon name="sync-outline" class="spin"></ion-icon> جاري الرفع...';
                status.innerText = 'جاري مزامنة القضايا...';

                try {
                    // Force a push to cloud using the Storage service
                    await this.app.storage.pushToCloud();
                    status.style.color = 'var(--success-color)';
                    status.innerText = '✅ تم ترحيل كافة البيانات المحلية بنجاح إلى فريقك السحابي.';
                    btn.innerHTML = '<ion-icon name="checkmark-done-outline"></ion-icon> تمت الهجرة بنجاح';
                } catch(err) {
                    console.error(err);
                    status.style.color = 'var(--danger-color)';
                    status.innerText = '❌ فشل الترحيل: ' + err.message;
                    btn.disabled = false;
                    btn.innerHTML = '<ion-icon name="rocket-outline"></ion-icon> إعادة المحاولة';
                }
            }
        });
    }
}
