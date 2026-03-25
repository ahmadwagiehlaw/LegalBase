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
import { CaseDetailsModule } from './case-details.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const App = {
    init: () => {
        // Init UI Components
        UI.initTheme();
        App.applyCustomTabs();
        document.getElementById('theme-toggle')?.addEventListener('click', UI.toggleTheme);
        
        document.getElementById('toggle-sidebar')?.addEventListener('click', () => {
            const sidebar = document.querySelector('.sidebar');
            if (window.innerWidth <= 768) {
                sidebar?.classList.toggle('open');
            } else {
                sidebar?.classList.toggle('collapsed');
                
                // Adjust main content margin dynamically if needed
                const mainContent = document.querySelector('.main-content');
                if (sidebar.classList.contains('collapsed')) {
                    mainContent.style.marginRight = 'var(--sidebar-collapsed)';
                } else {
                    mainContent.style.marginRight = 'var(--sidebar-width)';
                }
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

        const legacySessionsNav = document.querySelector('.nav-links a[data-route="sessions"]')?.closest('li');
        if (legacySessionsNav) {
            legacySessionsNav.style.display = 'none';
        }

        // Global Search Logic
        const globalSearchInput = document.getElementById('global-search-input');
        const globalSearchResults = document.getElementById('global-search-results');
        
        if (globalSearchInput && globalSearchResults) {
            globalSearchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim().toLowerCase();
                if (!query) {
                    globalSearchResults.classList.add('hidden');
                    return;
                }
                
                const appeals = AppealsStore.getAll();
                const matched = appeals.filter(a => 
                    (a.appealNumber && String(a.appealNumber).toLowerCase().includes(query)) ||
                    (a.plaintiff && a.plaintiff.toLowerCase().includes(query)) ||
                    (a.defendant && a.defendant.toLowerCase().includes(query)) ||
                    (a.roll && String(a.roll).toLowerCase().includes(query)) ||
                    (a.subject && a.subject.toLowerCase().includes(query))
                ).slice(0, 8); // Limit to top 8

                if (matched.length === 0) {
                    globalSearchResults.innerHTML = '<div style="padding:15px; text-align:center; color:var(--text-muted); font-size:0.9rem;">لا توجد نتائج مطابقة لـ "' + query + '"</div>';
                } else {
                    globalSearchResults.innerHTML = matched.map(m => `
                        <div class="search-result-item" data-id="${m.id}" style="padding:12px; border-bottom:1px solid var(--border-color); cursor:pointer; display:flex; justify-content:space-between; align-items:center; transition: background 0.2s;">
                            <div>
                                <strong style="color:var(--accent-color); font-size:1.05rem;">طعن رقم ${m.appealNumber || '---'} لسنة ${m.year || '---'}</strong>
                                <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:4px; max-width:350px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                                    ${m.plaintiff || '---'} <strong style="color:var(--text-primary); margin:0 4px;">ضد</strong> ${m.defendant || '---'}
                                </div>
                            </div>
                            <span class="badge badge-info" style="font-size:0.75rem;">${m.status || '---'}</span>
                        </div>
                    `).join('');
                    
                    globalSearchResults.querySelectorAll('.search-result-item').forEach(el => {
                        el.addEventListener('click', () => {
                            if (window.AppealsModule) {
                                window.AppealsModule.viewAppeal(el.dataset.id);
                            }
                            globalSearchResults.classList.add('hidden');
                            globalSearchInput.value = '';
                        });
                        
                        // Add hover effect via JS since inline hover isn't possible and we don't want to create new CSS classes unnecessarily
                        el.addEventListener('mouseover', () => el.style.background = 'rgba(245, 158, 11, 0.05)');
                        el.addEventListener('mouseout', () => el.style.background = 'transparent');
                    });
                }
                
                globalSearchResults.classList.remove('hidden');
            });
            
            // Hide on outside click
            document.addEventListener('click', (e) => {
                if (!e.target.closest('#global-search-results') && !e.target.closest('#global-search-input')) {
                    globalSearchResults.classList.add('hidden');
                }
            });
        }
        
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
                
                const navRoute = localStorage.getItem('defaultStartScreen') || 'dashboard';
                App.navigate(navRoute);
                
                // Highlight the correct tab
                document.querySelectorAll('.nav-links a').forEach(l => l.classList.remove('active'));
                const activeLink = document.querySelector(`.nav-links a[data-route="${navRoute}"]`);
                if(activeLink) activeLink.classList.add('active');

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

        // Register Service Worker & PWA Logic
        App.initPWA();
    },

    initPWA: () => {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('sw.js').catch(error => {
                    console.log('SW registration failed: ', error);
                });
            });
        }

        let deferredPrompt;
        const pwaPrompt = document.getElementById('pwa-install-prompt');
        const installBtn = document.getElementById('pwa-install-btn');
        const dismissBtn = document.getElementById('pwa-dismiss-btn');

        if (!pwaPrompt) return;

        if (localStorage.getItem('hidePwaPrompt') === 'true') {
            return;
        }

        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent Chrome from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later.
            deferredPrompt = e;
            // Show the custom UI after a small delay
            setTimeout(() => {
                pwaPrompt.classList.remove('hidden');
                setTimeout(() => pwaPrompt.classList.add('show'), 50);
            }, 3000); 
        });

        installBtn?.addEventListener('click', () => {
            pwaPrompt.classList.remove('show');
            setTimeout(() => pwaPrompt.classList.add('hidden'), 500);
            
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    deferredPrompt = null;
                });
            }
        });

        dismissBtn?.addEventListener('click', () => {
            pwaPrompt.classList.remove('show');
            setTimeout(() => pwaPrompt.classList.add('hidden'), 500);
            localStorage.setItem('hidePwaPrompt', 'true');
        });
    },

    applyCustomTabs: () => {
        const customTabs = JSON.parse(localStorage.getItem('customTabs')) || {};
        document.querySelectorAll('.nav-links a').forEach(link => {
            const route = link.dataset.route;
            const tabSettings = customTabs[route];
            if (tabSettings) {
                if (tabSettings.hidden && route !== 'settings') {
                    link.parentElement.style.display = 'none';
                } else {
                    link.parentElement.style.display = 'block';
                    if (tabSettings.name) {
                        const span = link.querySelector('span');
                        if (span) span.textContent = tabSettings.name;
                    }
                }
            } else {
                link.parentElement.style.display = 'block';
            }
        });
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
        if (route === 'sessions') route = 'agenda';
        if (route === 'sessions-log') {
            if(title) title.textContent = 'السجل اليدوي للجلسات';
            SessionsModule.init();
            return;
        }

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
            case 'case-details':
                if(title) title.textContent = 'ملف الطعن التحليلي';
                const id = sessionStorage.getItem('current_view_case_id');
                if (id) CaseDetailsModule.loadCase(id);
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
