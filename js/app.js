import { AuthModule } from './auth.js';
import { UI } from './ui.js';
import { AppealsModule } from './appeals.js';
import { SessionsModule } from './sessions.js';
import { JudgmentsModule } from './judgments.js';
import { AttachmentsModule } from './attachments.js';
import { DashboardModule } from './dashboard.js';
import { MemosModule } from './memos.js';
import { ReportsModule } from './reports.js';
import { AdminModule } from './admin.js';
import { RequestsModule } from './requests.js';
import { TasksModule } from './tasks.js';
import { CircularsModule } from './circulars.js';
import { ImportModule } from './import.js';
import { RollsModule } from './rolls.js';
import { LibraryModule } from './library.js';
import { AgendaModule } from './agenda.js';
import { db } from './config.js';
import { AppealsStore } from './appeals-store.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const App = {
    init: () => {
        // Init UI Components
        UI.initTheme();
        document.getElementById('theme-toggle')?.addEventListener('click', UI.toggleTheme);
        
        document.getElementById('toggle-sidebar')?.addEventListener('click', () => {
            const sidebar = document.querySelector('.sidebar');
            sidebar?.classList.toggle('collapsed');
            
            // Adjust main content margin dynamically if needed
            const mainContent = document.querySelector('.main-content');
            if (sidebar.classList.contains('collapsed')) {
                mainContent.style.marginRight = 'var(--sidebar-collapsed)';
            } else {
                mainContent.style.marginRight = 'var(--sidebar-width)';
            }
        });

        document.getElementById('quick-add-case')?.addEventListener('click', () => {
            App.navigate('appeals');
            setTimeout(() => AppealsModule.openModal(), 100);
        });

        // Set up router
        document.querySelectorAll('.nav-links a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
                e.currentTarget.classList.add('active');
                
                const route = e.currentTarget.dataset.route;
                App.navigate(route);
            });
        });
        
        // Init Auth
        AuthModule.init(
            (user) => {
                document.getElementById('auth-view').classList.remove('active');
                document.getElementById('main-view').classList.remove('hidden');
                document.getElementById('main-view').classList.add('active');
                AppealsStore.hydrateFromCache();
                AppealsStore.load({ allowStale: true }).catch((error) => {
                    console.warn('Could not warm appeals cache:', error);
                });
                App.navigate('dashboard');
                App.loadIdentity();
            },
            () => {
                document.getElementById('main-view').classList.remove('active');
                document.getElementById('main-view').classList.add('hidden');
                document.getElementById('auth-view').classList.add('active');
            }
        );
        
        // Init globally available modules
        ImportModule.init();
    },

    loadIdentity: async () => {
        try {
            const identitySnap = await getDoc(doc(db, "settings", "identity"));
            if (identitySnap.exists()) {
                const id = identitySnap.data();
                if(id.appTitle) {
                    const el = document.getElementById('app-main-title');
                    if(el) el.textContent = id.appTitle;
                }
                if(id.appSubTitle) {
                    const el = document.getElementById('app-sub-title');
                    if(el) el.textContent = id.appSubTitle;
                }
                if(id.consultantName) {
                    const el = document.getElementById('user-name');
                    if(el) el.textContent = id.consultantName;
                }
                if(id.consultantRole) {
                    const el = document.getElementById('user-role');
                    if(el) el.textContent = id.consultantRole;
                }
            }
        } catch(e) {
            console.warn('Could not load identity settings:', e);
        }
    },
    
    navigate: (route) => {
        const container = document.getElementById('content-container');
        const title = document.getElementById('page-title');
        
        if (!container) return;

        let content = '';
        switch(route) {
            case 'dashboard':
                if(title) title.textContent = 'الرئيسية';
                DashboardModule.init();
                break;
            case 'appeals':
                if(title) title.textContent = 'القضايا والطعون';
                AppealsModule.init();
                break;
            case 'tasks':
                if(title) title.textContent = 'المهام الإدارية';
                TasksModule.init();
                break;
            case 'agenda':
                if(title) title.textContent = 'أجندة الجلسات';
                AgendaModule.init();
                break;
            case 'sessions':
                if(title) title.textContent = 'سجل الجلسات';
                SessionsModule.init();
                break;
            case 'rolls':
                if(title) title.textContent = 'رولات الجلسات اليومية';
                RollsModule.init();
                break;
            case 'library':
                if(title) title.textContent = 'المكتبة القانونية والبحوث';
                LibraryModule.init();
                break;
            case 'judgments':
                if(title) title.textContent = 'الأحكام والقرارات';
                JudgmentsModule.init();
                break;
            case 'attachments':
                if(title) title.textContent = 'الأرشيف والمرفقات';
                AttachmentsModule.init();
                break;
            case 'circulars':
                if(title) title.textContent = 'القرارات والمنشورات';
                CircularsModule.init();
                break;
            case 'memos':
                if(title) title.textContent = 'المذكرات والنماذج';
                MemosModule.init();
                break;
            case 'requests':
                if(title) title.textContent = 'طلبات الاطلاع والمتابعة';
                RequestsModule.init();
                break;
            case 'reports':
                if(title) title.textContent = 'التقارير والإحصائيات';
                ReportsModule.init();
                break;
            case 'settings':
                if(title) title.textContent = 'الإعدادات والإدارة';
                AdminModule.init();
                break;
            default:
                if(title) title.textContent = route;
                container.innerHTML = `<div class="section-card" style="padding:40px; text-align:center;">
                            <h3><i class="fas fa-tools"></i> جاري التطوير...</h3>
                           </div>`;
        }
        
        if (window.innerWidth <= 768) {
            document.querySelector('.sidebar')?.classList.remove('open');
        }
    }
};

window.App = App;
document.addEventListener('DOMContentLoaded', App.init);
