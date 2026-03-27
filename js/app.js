import { Case, Session, Judgment, Task } from './core/Models.js';
import { RulesEngine } from './engine/RulesEngine.js';
import { Storage } from './data/Storage.js';
import { CasesView } from './ui/CasesView.js';
import { CaseDetailsView } from './ui/CaseDetailsView.js';
import { SessionsView } from './ui/SessionsView.js';
import { JudgmentsView } from './ui/JudgmentsView.js';
import { DashboardView } from './ui/DashboardView.js';
import { SettingsView } from './ui/SettingsView.js';
import { TasksView } from './ui/TasksView.js';
import { ArchiveView } from './ui/ArchiveView.js';
import { AdminView } from './ui/AdminView.js';
import { AuthService } from './auth/AuthService.js';
import { firebaseEnabled } from './auth/FirebaseConfig.js';
import { CommandPalette } from './ui/CommandPalette.js';
import { TopBarSearch } from './ui/TopBarSearch.js';

class App {
    constructor() {
        this.storage = new Storage();
        // ... (rest holds identical)

        this.engine = new RulesEngine();
        this.authService = null;
        this.palette = null;
        this.topBarSearch = null;
        
        this.initAuth();
    }

    initAuth() {
        this.authService = new AuthService(async (user, profile) => {
            const initialLoader = document.getElementById('initial-loader');
            if (initialLoader) initialLoader.style.display = 'none';

            if (!user) {
                // Not logged in -> Show login modal
                document.getElementById('auth-container').style.display = 'flex';
                document.getElementById('pending-container').style.display = 'none';
                document.getElementById('app').style.display = 'none';
                this.setupAuthUI();
            } else if (profile && profile.role === 'pending') {
                // Logged in but pending
                document.getElementById('auth-container').style.display = 'none';
                document.getElementById('pending-container').style.display = 'flex';
                document.getElementById('app').style.display = 'none';
                
                document.getElementById('btn-logout-pending').onclick = () => this.authService.logout();
            } else {
                // Fully Authorized
                document.getElementById('auth-container').style.display = 'none';
                document.getElementById('pending-container').style.display = 'none';
                document.getElementById('app').style.display = 'flex';
                
                // Show Admin Menu if applicable
                const adminNav = document.getElementById('nav-admin');
                if (adminNav && profile.role === 'admin') {
                    adminNav.style.display = 'flex';
                }

                // Set Email string in TopBar avatar space
                const avatar = document.querySelector('.avatar');
                if(avatar) avatar.title = profile.email || user.email;

                // Bind logout
                const logoutBtn = document.getElementById('btn-logout-sidebar');
                if(logoutBtn) logoutBtn.onclick = () => this.authService.logout();

                // Setup Storage teamId and sync
                if (profile.teamId) {
                    this.storage.setTeamId(profile.teamId);
                    await this.storage.syncFromCloud();
                }

                this.initApp();
            }
        });
    }

    setupAuthUI() {
        const btnLogin = document.getElementById('btn-login');
        const btnReg = document.getElementById('btn-register');
        const emailInp = document.getElementById('auth-email');
        const passInp = document.getElementById('auth-password');
        const errBox = document.getElementById('auth-error-msg');

        if (!firebaseEnabled) {
            errBox.innerText = 'تم تعطيل مفاتيح Firebase من داخل المستودع لأسباب أمنية. أضف الإعدادات محليًا في js/runtime-config.js ثم أعد تحميل الصفحة.';
            errBox.style.display = 'block';
        }

        // Remove old listeners to prevent duplicates
        const cloneLogin = btnLogin.cloneNode(true);
        const cloneReg = btnReg.cloneNode(true);
        btnLogin.replaceWith(cloneLogin);
        btnReg.replaceWith(cloneReg);

        cloneLogin.addEventListener('click', async () => {
            const e = emailInp.value, p = passInp.value;
            if(!e || !p) return (errBox.innerText = "يرجى ملء كافة الحقول", errBox.style.display = 'block');
            cloneLogin.innerText = "جاري الدخول...";
            const res = await this.authService.login(e, p);
            if(!res.success) {
                errBox.innerText = res.error;
                errBox.style.display = 'block';
                cloneLogin.innerHTML = 'تسجيل الدخول <ion-icon name="log-in-outline"></ion-icon>';
            }
        });

        cloneReg.addEventListener('click', async () => {
            const e = emailInp.value, p = passInp.value;
            if(!e || !p) return (errBox.innerText = "يرجى ملء كافة الحقول", errBox.style.display = 'block');
            cloneReg.innerText = "جاري إنشاء الحساب...";
            const res = await this.authService.register(e, p);
            if(!res.success) {
                errBox.innerText = res.error;
                errBox.style.display = 'block';
                cloneReg.innerText = "إنشاء حساب جديد";
            }
        });
    }

    initApp() {
        if(this.appInitialized) return; // Prevent double initialization
        this.appInitialized = true;
        
        console.log("SLA V2 Core Running");
        this.palette = new CommandPalette(this);
        this.topBarSearch = new TopBarSearch(this);
        this.setupEventListeners();
        // Load default page
        this.loadPage({ page: 'dashboard' });
    }

    setupEventListeners() {
        const navItems = document.querySelectorAll('.nav-links li, .sidebar-footer li[data-page]');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                navItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                this.loadPage({ page: item.dataset.page });
            });
        });

        document.addEventListener('navigate', (e) => {
            this.loadPage(e.detail);
        });

        // Topbar Interactions
        const notifBtn = document.querySelector('.notifications');
        if(notifBtn) {
            notifBtn.addEventListener('click', () => {
                this.loadPage({ page: 'tasks' });
                document.querySelectorAll('.nav-links li').forEach(i => i.classList.remove('active'));
            });
        }
        
        const avatarBtn = document.querySelector('.avatar');
        if(avatarBtn) {
            avatarBtn.addEventListener('click', () => {
                this.loadPage({ page: 'settings' });
                document.querySelectorAll('.nav-links li, .sidebar-footer li[data-page]').forEach(i => i.classList.remove('active'));
                const settingsMenu = document.querySelector('.sidebar-footer li[data-page="settings"]');
                if(settingsMenu) settingsMenu.classList.add('active');
            });
        }

        // Global events listening to refresh alerts
        document.addEventListener('cases-updated', () => this.updateNotificationBadge());
        this.updateNotificationBadge();

    }


    updateNotificationBadge() {
        if (this._notifTimeout) clearTimeout(this._notifTimeout);
        this._notifTimeout = setTimeout(() => {
            const cases = this.storage.loadCases() || [];
            const badge = document.querySelector('.notifications .badge');
            const notifButton = document.querySelector('.notifications');
            if(badge) {
                const notifications = [];

                cases.forEach((caseData) => {
                    (caseData.reminders || []).forEach((reminder) => {
                        if (!reminder || !String(reminder.title || '').trim()) return;
                        notifications.push({
                            type: 'reminder',
                            key: `${caseData.id}:reminder:${reminder.title || ''}`
                        });
                    });

                    (caseData.tasks || []).forEach((task) => {
                        if ((task.status || 'pending') === 'completed') return;
                        if (!task || !String(task.title || '').trim()) return;
                        notifications.push({
                            type: 'task',
                            key: `${caseData.id}:task:${task.title || ''}:${task.dueDate || ''}`
                        });
                    });
                });

                const uniqueCount = new Set(notifications.map((item) => item.key)).size;
                badge.textContent = uniqueCount > 99 ? '99+' : String(uniqueCount);
                badge.style.display = uniqueCount > 0 ? 'inline-flex' : 'none';
                notifButton?.classList.toggle('has-alerts', uniqueCount > 0);
            }
        }, 1000);
    }

    loadPage(route) {
        // route can be a string or an object {page, ...params}
        const pageId = typeof route === 'string' ? route : route.page;
        console.log("Loading page:", pageId, route);
        
        const content = document.getElementById('page-content');
        content.innerHTML = '<div class="loader-container"><div class="loader"></div></div>';
        
        setTimeout(() => {
            try {
            switch(pageId) {
                case 'dashboard':
                    const dashboardView = new DashboardView(content, this);
                    dashboardView.render();
                    break;
                case 'cases':
                    const casesView = new CasesView(content, this, route);
                    casesView.render();
                    break;
                case 'case-details':
                    const detailsView = new CaseDetailsView(content, this, route.id);
                    detailsView.render();
                    break;
                case 'sessions':
                    const sessionsView = new SessionsView(content, this, route);
                    sessionsView.render();
                    break;
                case 'judgments':
                    const judgmentsView = new JudgmentsView(content, this, route);
                    judgmentsView.render();
                    break;
                case 'tasks':
                    const tasksView = new TasksView(content, this);
                    tasksView.render();
                    break;
                case 'archive':
                    const archiveView = new ArchiveView(content, this);
                    archiveView.render();
                    break;
                case 'settings':
                    const settingsView = new SettingsView(content, this);
                    settingsView.render();
                    break;
                case 'admin':
                    const adminView = new AdminView(content, this);
                    adminView.render();
                    break;
                default:
                    content.innerHTML = `
                        <div class="empty-msg" style="text-align:center; padding: 50px;">
                            <h2>هذه الصفحة قيد التطوير</h2>
                            <p>نعمل على بناء هذه الواجهة قريباً.</p>
                        </div>
                    `;
            }
            } catch (error) {
                console.error('Page render failed:', pageId, error);
                content.innerHTML = `
                    <div class="empty-state" style="min-height:260px;">
                        <ion-icon name="warning-outline"></ion-icon>
                        <p>تعذر فتح الصفحة المطلوبة.</p>
                        <small style="color: var(--text-muted); max-width: 520px; text-align: center;">${String(error?.message || 'حدث خطأ غير متوقع أثناء فتح الصفحة.')}</small>
                    </div>
                `;
            }
        }, 300);
    }
}

// Start the app
window.addEventListener('DOMContentLoaded', () => {
    new App();
});
