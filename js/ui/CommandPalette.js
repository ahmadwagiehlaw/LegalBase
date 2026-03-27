import { buildJudgmentsIndex } from '../core/JudgmentIndex.js';
import { buildSessionsIndex, formatSessionDate } from '../core/SessionIndex.js';

export class CommandPalette {
    constructor(app) {
        this.app = app;
        this.isOpen = false;
        this.element = null;
        this.selectedIndex = 0;
        this.results = [];
        this.searchCache = null;
        this.cacheTime = 0;
        this.init();
    }

    init() {
        window.addEventListener('keydown', (event) => {
            const key = String(event.key || '').toLowerCase();
            const isAltShortcut = event.altKey && !event.ctrlKey && !event.metaKey && key === 'k';
            const isCtrlShiftShortcut = event.ctrlKey && event.shiftKey && !event.altKey && !event.metaKey && key === 'k';
            const isCtrlShortcut = event.ctrlKey && !event.shiftKey && !event.altKey && !event.metaKey && key === 'k';
            const target = event.target;
            const isTypingField = target instanceof HTMLElement && (
                target.tagName === 'INPUT' ||
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            );

            if ((isAltShortcut || isCtrlShiftShortcut || isCtrlShortcut) && !isTypingField) {
                event.preventDefault();
                this.toggle();
            }

            if (event.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });

        document.addEventListener('open-command-palette', () => this.open());
    }

    toggle() {
        if (this.isOpen) this.close();
        else this.open();
    }

    open() {
        this.isOpen = true;
        this.invalidateCache();
        this.render();
        setTimeout(() => {
            const input = this.element?.querySelector('#palette-search');
            if (input) {
                input.focus();
                this.search('');
            }
        }, 50);
    }

    close() {
        this.isOpen = false;
        if (this.element) {
            this.element.classList.add('fade-out');
            setTimeout(() => {
                if (this.element) this.element.remove();
                this.element = null;
            }, 150);
        }
    }

    invalidateCache() {
        this.searchCache = null;
        this.cacheTime = 0;
    }

    getSearchableData() {
        if (this.searchCache && Date.now() - this.cacheTime < 30000) {
            return this.searchCache;
        }

        const cases = this.app.storage.loadCases() || [];
        this.searchCache = {
            cases,
            sessions: buildSessionsIndex(cases, this.app.storage.load('sessions') || []),
            judgments: buildJudgmentsIndex(cases),
            tasks: this.app.storage.load('tasks') || [],
        };
        this.cacheTime = Date.now();
        return this.searchCache;
    }

    render() {
        if (this.element) this.element.remove();

        this.element = document.createElement('div');
        this.element.className = 'palette-overlay';
        this.element.innerHTML = `
            <div class="palette-container">
                <div class="palette-header">
                    <ion-icon name="search-outline" class="palette-icon"></ion-icon>
                    <input type="text" id="palette-search" 
                           placeholder="ابحث عن قضية، جلسة، حكم، أو أمر... (Ctrl+K أو Alt+K أو Ctrl+Shift+K)" 
                           autocomplete="off" spellcheck="false">
                    <div class="palette-kbd" id="palette-close-btn">ESC</div>
                </div>
                <div class="palette-results" id="palette-results"></div>
                <div class="palette-footer">
                    <div class="footer-item"><kbd>↑↓</kbd> للتنقل</div>
                    <div class="footer-item"><kbd>Enter</kbd> للفتح</div>
                    <div class="footer-item"><kbd>ESC</kbd> للإغلاق</div>
                </div>
            </div>
        `;

        document.body.appendChild(this.element);

        const input = this.element.querySelector('#palette-search');
        let debounceTimer;
        input.addEventListener('input', (event) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => this.search(event.target.value), 100);
        });
        input.addEventListener('keydown', (event) => this.handleKeydown(event));

        this.element.addEventListener('click', (event) => {
            if (event.target === this.element) this.close();
        });

        this.element.querySelector('#palette-close-btn')?.addEventListener('click', () => this.close());

        const resultsContainer = this.element.querySelector('#palette-results');
        resultsContainer?.addEventListener('click', (event) => {
            const item = event.target.closest('.palette-item');
            if (!item) return;
            const index = Number(item.dataset.index);
            if (!Number.isFinite(index)) return;
            this.selectedIndex = index;
            this.executeResult(this.results[index]);
        });

        resultsContainer?.addEventListener('mousemove', (event) => {
            const item = event.target.closest('.palette-item');
            if (!item) return;
            const index = Number(item.dataset.index);
            if (!Number.isFinite(index) || index === this.selectedIndex) return;
            this.selectedIndex = index;
            this.updateSelectionUI();
        });
    }

    fuzzyMatch(text, query) {
        if (!query) return true;

        const source = String(text || '').toLowerCase();
        const needle = String(query || '').toLowerCase();
        if (source.includes(needle)) return true;

        let queryIndex = 0;
        for (let index = 0; index < source.length && queryIndex < needle.length; index += 1) {
            if (source[index] === needle[queryIndex]) queryIndex += 1;
        }
        return queryIndex === needle.length;
    }

    highlight(text, query) {
        if (!query || !text) return text || '';
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return String(text).replace(new RegExp(`(${escaped})`, 'gi'), '<mark>$1</mark>');
    }

    executeResult(result) {
        result?.action?.();
    }

    search(query) {
        this.results = [];
        const trimmedQuery = query.trim();
        const data = this.getSearchableData();
        const profile = this.app.authService?.userProfile || { role: 'user' };

        const navs = [
            { title: 'الرئيسية', desc: 'لوحة النظرة العامة', icon: 'grid-outline', page: 'dashboard' },
            { title: 'إدارة القضايا', desc: 'عرض، تصفية، وتعديل القضايا', icon: 'briefcase-outline', page: 'cases' },
            { title: 'أجندة الجلسات', desc: 'مواعيد الجلسات القادمة', icon: 'calendar-outline', page: 'sessions' },
            { title: 'سجل الأحكام', desc: 'الأحكام الصادرة ومنطوقاتها', icon: 'hammer-outline', page: 'judgments' },
            { title: 'المهام والتذكيرات', desc: 'متابعة الإجراءات المطلوبة', icon: 'checkmark-circle-outline', page: 'tasks' },
            { title: 'الأرشيف', desc: 'القضايا المنتهية والمؤرشفة', icon: 'archive-outline', page: 'archive' },
            { title: 'الإعدادات', desc: 'إعدادات المنصة والمحكمة', icon: 'settings-outline', page: 'settings' },
            { title: 'لوحة الإدارة', desc: 'إدارة المستخدمين والصلاحيات', icon: 'shield-half-outline', page: 'admin', adminOnly: true },
        ];

        navs.forEach((item) => {
            if (item.adminOnly && profile.role !== 'admin') return;
            if (!trimmedQuery || this.fuzzyMatch(item.title, trimmedQuery) || this.fuzzyMatch(item.desc, trimmedQuery)) {
                this.results.push({
                    id: `nav_${item.page}`,
                    title: this.highlight(item.title, trimmedQuery),
                    sub: item.desc,
                    category: 'تنقل سريع',
                    icon: item.icon,
                    action: () => this.navigate(item.page)
                });
            }
        });

        if (trimmedQuery.length >= 1) {
            data.cases
                .filter((caseData) => {
                    return this.fuzzyMatch(caseData.caseNumber, trimmedQuery) ||
                        this.fuzzyMatch(caseData.year, trimmedQuery) ||
                        this.fuzzyMatch(caseData.court, trimmedQuery) ||
                        this.fuzzyMatch(caseData.subject, trimmedQuery) ||
                        this.fuzzyMatch(caseData.plaintiff, trimmedQuery) ||
                        this.fuzzyMatch(caseData.defendant, trimmedQuery) ||
                        caseData.parties?.some((party) => this.fuzzyMatch(party, trimmedQuery));
                })
                .slice(0, 7)
                .forEach((caseData) => {
                    const parties = caseData.parties ? caseData.parties.join(' / ') : `${caseData.plaintiff || ''} ${caseData.defendant ? `/ ${caseData.defendant}` : ''}`;
                    this.results.push({
                        id: `case_${caseData.id}`,
                        title: `طعن رقم ${this.highlight(caseData.caseNumber || '', trimmedQuery)}${caseData.year ? ` / ${caseData.year}` : ''}`,
                        sub: [this.highlight(caseData.court || '', trimmedQuery), caseData.subject, parties].filter(Boolean).join(' • '),
                        category: 'القضايا',
                        icon: 'document-text-outline',
                        badge: this.statusBadge(caseData.operationalStatus),
                        action: () => {
                            document.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'case-details', id: caseData.id } }));
                            this.close();
                        }
                    });
                });

            data.sessions
                .filter((session) => {
                    return this.fuzzyMatch(session.caseNumber, trimmedQuery) ||
                        this.fuzzyMatch(session.subject, trimmedQuery) ||
                        this.fuzzyMatch(session.court, trimmedQuery) ||
                        this.fuzzyMatch(session.date, trimmedQuery) ||
                        this.fuzzyMatch(session.type, trimmedQuery) ||
                        this.fuzzyMatch(session.decision, trimmedQuery);
                })
                .slice(0, 5)
                .forEach((session) => {
                    this.results.push({
                        id: `session_${session.id}`,
                        title: `جلسة: ${this.highlight(session.caseNumber || 'غير محددة', trimmedQuery)}`,
                        sub: [session.subject, session.court, formatSessionDate(session.date), session.type].filter(Boolean).join(' • '),
                        category: 'الجلسات',
                        icon: 'calendar-number-outline',
                        action: () => {
                            document.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'sessions', query: session.caseNumber || trimmedQuery } }));
                            this.close();
                        }
                    });
                });

            data.judgments
                .filter((judgment) => {
                    return this.fuzzyMatch(judgment.caseNumberFormatted, trimmedQuery) ||
                        this.fuzzyMatch(judgment.subject, trimmedQuery) ||
                        this.fuzzyMatch(judgment.court, trimmedQuery) ||
                        this.fuzzyMatch(judgment.litigants, trimmedQuery) ||
                        this.fuzzyMatch(judgment.type, trimmedQuery) ||
                        this.fuzzyMatch(judgment.content, trimmedQuery) ||
                        this.fuzzyMatch(judgment.classification, trimmedQuery);
                })
                .slice(0, 5)
                .forEach((judgment) => {
                    this.results.push({
                        id: `judgment_${judgment.id}`,
                        title: `حكم: ${this.highlight(judgment.caseNumberFormatted || '', trimmedQuery)}`,
                        sub: [judgment.type, judgment.classification, judgment.content].filter(Boolean).join(' • '),
                        category: 'الأحكام',
                        icon: 'hammer-outline',
                        action: () => {
                            document.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'judgments', query: judgment.caseNumber || trimmedQuery } }));
                            this.close();
                        }
                    });
                });
        }

        [
            {
                title: 'استيراد قضايا من Excel',
                icon: 'cloud-upload-outline',
                match: ['استيراد', 'excel', 'رفع', 'import'],
                action: () => {
                    document.dispatchEvent(new CustomEvent('open-import'));
                    this.close();
                }
            },
            {
                title: 'تغيير الثيم (ذهبي/داكن)',
                icon: 'color-palette-outline',
                match: ['ثيم', 'لون', 'مظهر', 'theme'],
                action: () => {
                    const isGold = document.documentElement.classList.toggle('theme-gold');
                    localStorage.setItem('SLA_THEME', isGold ? 'gold' : 'dark');
                    this.close();
                }
            },
            {
                title: 'إضافة قضية جديدة',
                icon: 'add-circle-outline',
                match: ['قضية', 'جديد', 'إضافة', 'new'],
                action: () => {
                    this.navigate('cases');
                    this.close();
                }
            },
            {
                title: 'تسجيل الخروج',
                icon: 'log-out-outline',
                match: ['خروج', 'logout'],
                action: () => this.app.authService?.logout()
            }
        ].forEach((actionItem) => {
            if (!trimmedQuery || this.fuzzyMatch(actionItem.title, trimmedQuery) || actionItem.match.some((item) => item.includes(trimmedQuery.toLowerCase()))) {
                this.results.push({
                    id: `act_${actionItem.title}`,
                    title: this.highlight(actionItem.title, trimmedQuery),
                    category: 'أوامر سريعة',
                    icon: actionItem.icon,
                    action: actionItem.action
                });
            }
        });

        this.selectedIndex = 0;
        this.renderResults();
    }

    statusBadge(status) {
        const map = {
            active: ['نشط'],
            new: ['جديد'],
            suspended_administrative: ['موقوف'],
            archived: ['مؤرشف'],
        };
        const [label] = map[status] || [status || ''];
        return label;
    }

    renderResults() {
        const container = this.element?.querySelector('#palette-results');
        if (!container) return;

        if (this.results.length === 0) {
            container.innerHTML = `
                <div class="palette-empty">
                    <ion-icon name="search-outline"></ion-icon>
                    <p>لا توجد نتائج مطابقة</p>
                    <small>جرّب كلمات مختلفة أو ابحث برقم القضية</small>
                </div>`;
            return;
        }

        let html = '';
        let currentCategory = '';

        this.results.forEach((result, index) => {
            if (result.category !== currentCategory) {
                currentCategory = result.category;
                html += `<div class="palette-cat"><span>${currentCategory}</span></div>`;
            }

            html += `
                <div class="palette-item ${index === this.selectedIndex ? 'selected' : ''}" data-index="${index}">
                    <div class="item-icon"><ion-icon name="${result.icon}"></ion-icon></div>
                    <div class="item-info">
                        <span class="title">${result.title}</span>
                        ${result.sub ? `<span class="sub">${result.sub}</span>` : ''}
                    </div>
                    ${result.badge ? `<span class="item-badge">${result.badge}</span>` : ''}
                    ${index === this.selectedIndex ? '<div class="enter-hint"><kbd>↵</kbd></div>' : ''}
                </div>`;
        });

        container.innerHTML = html;

        this.updateSelectionUI();
    }

    updateSelectionUI() {
        const container = this.element?.querySelector('#palette-results');
        if (!container) return;

        const items = container.querySelectorAll('.palette-item');
        if (!items.length) return;

        items.forEach((item, index) => {
            item.classList.toggle('selected', index === this.selectedIndex);
            const hint = item.querySelector('.enter-hint');
            if (index === this.selectedIndex && !hint) {
                item.insertAdjacentHTML('beforeend', '<div class="enter-hint"><kbd>↵</kbd></div>');
            }
            if (index !== this.selectedIndex && hint) hint.remove();
        });

        const selectedElement = items[this.selectedIndex];
        if (selectedElement) selectedElement.scrollIntoView({ block: 'nearest' });
    }

    handleKeydown(event) {
        if (!this.results.length) {
            if (event.key === 'Escape') {
                event.preventDefault();
                this.close();
            }
            return;
        }

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            this.selectedIndex = (this.selectedIndex + 1) % this.results.length;
            this.renderResults();
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            this.selectedIndex = (this.selectedIndex - 1 + this.results.length) % this.results.length;
            this.renderResults();
        } else if (event.key === 'Enter') {
            event.preventDefault();
            this.executeResult(this.results[this.selectedIndex]);
        }
    }

    navigate(page) {
        document.dispatchEvent(new CustomEvent('navigate', { detail: { page } }));
        this.close();
    }
}
