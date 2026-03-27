import { RulesEngine } from '../engine/RulesEngine.js';

export class TasksView {
    constructor(container, app) {
        this.container = container;
        this.app = app;
        this.tasks = [];
        this.lastDoc = null;
        this.currentPage = 1;
        this.pageSize = 10;
    }

    async loadTasksData(next = true) {
        const body = this.container.querySelector('.page-body');
        if(body) body.innerHTML = '<div class="loader-container"><div class="loader"></div></div>';

        const result = await this.app.storage.loadTasksPaginated(this.pageSize, next ? this.lastDoc : null);
        this.tasks = result.data;
        this.lastDoc = result.lastDoc;

        this.renderBody();
        this.updatePaginationUI();
    }

    updatePaginationUI() {
        const info = this.container.querySelector('#page-info');
        if(info) info.innerText = `الصفحة ${this.currentPage}`;
        
        const btnPrev = this.container.querySelector('#btn-prev-page');
        const btnNext = this.container.querySelector('#btn-next-page');
        
        if(btnPrev) btnPrev.disabled = this.currentPage === 1;
        if(btnNext) btnNext.disabled = this.tasks.length < this.pageSize;
    }

    render() {
        this.container.innerHTML = `
            <div class="page-header">
                <div class="header-titles">
                    <h2>قائمة المهام والتنبيهات</h2>
                    <p>مهام المتابعة الحيوية المُولدة تلقائياً بواسطة محرك القواعد</p>
                </div>
            </div>
            
            <div class="page-body">
                <!-- Data will be loaded here -->
            </div>

            <div class="pagination-bar" style="display:flex; justify-content:center; align-items:center; gap:20px; margin-top:20px; padding: 10px; border-top: 1px solid var(--glass-border); background: rgba(0,0,0,0.1); border-radius: 8px;">
                <button class="btn btn-icon" id="btn-prev-page" title="الصفحة السابقة"><ion-icon name="chevron-forward-outline"></ion-icon></button>
                <span id="page-info" style="font-weight: 600; color: var(--text-muted)">الصفحة ${this.currentPage}</span>
                <button class="btn btn-icon" id="btn-next-page" title="الصفحة التالية"><ion-icon name="chevron-back-outline"></ion-icon></button>
            </div>
        `;

        this.loadTasksData();
        this.setupEvents();
    }

    renderBody() {
        const body = this.container.querySelector('.page-body');
        if(!body) return;

        body.innerHTML = `
                ${this.tasks.length === 0 ? `
                    <div class="empty-state" style="text-align:center; padding: 40px;">
                        <ion-icon name="checkmark-done-circle-outline" style="font-size: 64px; color: var(--success-color);"></ion-icon>
                        <h3 style="margin-top: 16px;">لا توجد مهام حيوية معلقة!</h3>
                        <p style="color: var(--text-muted);">جميع الطعون تسير بشكل سليم وفقاً للقواعد التشغيلية.</p>
                    </div>
                ` : `
                    <div class="tasks-grid" style="display: grid; gap: 16px;">
                        ${this.tasks.map((task, idx) => `
                            <div class="task-card" style="background: rgba(255,100,0,0.05); border-left: 4px solid var(--warning-color); padding: 20px; border-radius: 8px;">
                                <div style="display: flex; justify-content: space-between; align-items: start;">
                                    <div>
                                        <h3 style="color: var(--warning-color); margin-bottom: 8px; font-size: 1.1em;">
                                            <ion-icon name="warning-outline"></ion-icon> ${task.description}
                                        </h3>
                                        <p style="color: var(--text-main); margin-bottom: 12px;">مُشتق آلياً من حالة الطعن: <strong>${task.caseNumber} لسنة ${task.year || ''}</strong></p>
                                        <div style="font-size: 0.9em; color: var(--text-muted);">
                                            تصنيف المهمة: <strong>${this.formatTaskType(task.ruleType)}</strong>
                                        </div>
                                    </div>
                                    <button class="btn btn-primary btn-resolve" data-case="${task.caseId}">معالجة الملف <ion-icon name="arrow-back-outline"></ion-icon></button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                `}
        `;
        
        // Setup resolve buttons
        body.querySelectorAll('.btn-resolve').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const caseId = e.target.closest('button').dataset.case;
                const event = new CustomEvent('navigate', { detail: { page: 'case-details', id: caseId } });
                document.dispatchEvent(event);
            });
        });
    }

    formatTaskType(type) {
        if(type === 'admin_suspension_alert') return 'تنبيه وقف إداري عاجل';
        if(type === 'strike_renewal_task') return 'مهمة تجديد من الشطب';
        return type;
    }

    setupEvents() {
        const btnNext = this.container.querySelector('#btn-next-page');
        if(btnNext) {
            btnNext.addEventListener('click', () => {
                this.currentPage++;
                this.loadTasksData(true);
            });
        }

        const btnPrev = this.container.querySelector('#btn-prev-page');
        if(btnPrev) {
            btnPrev.addEventListener('click', () => {
                if(this.currentPage > 1) {
                    this.currentPage--;
                    this.lastDoc = null;
                    this.loadTasksData(false);
                }
            });
        }
    }
}
