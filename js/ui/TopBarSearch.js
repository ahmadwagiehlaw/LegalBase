import { buildJudgmentsIndex } from '../core/JudgmentIndex.js';
import { buildSessionsIndex, formatSessionDate } from '../core/SessionIndex.js';

export class TopBarSearch {
    constructor(app) {
        this.app = app;
        this.input = document.getElementById('global-search-input');
        this.resultsContainer = document.getElementById('global-search-results');
        this.commandButton = document.getElementById('global-command-trigger');
        this.searchBox = document.getElementById('global-search-box');
        this.results = [];
        this.selectedIndex = 0;
        this.searchCache = null;
        this.cacheTime = 0;

        this.init();
    }

    init() {
        if (!this.input || !this.resultsContainer || !this.searchBox) return;

        let debounceTimer = null;

        this.input.addEventListener('input', (event) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => this.search(event.target.value), 120);
        });

        this.input.addEventListener('keydown', (event) => this.handleKeydown(event));
        this.input.addEventListener('focus', () => {
            if (this.input.value.trim()) {
                this.search(this.input.value);
            }
        });

        this.commandButton?.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent('open-command-palette'));
        });

        this.resultsContainer.addEventListener('click', (event) => {
            const item = event.target.closest('.global-search-item');
            if (!item) return;
            const index = Number(item.dataset.index);
            if (!Number.isFinite(index)) return;
            this.selectedIndex = index;
            this.executeResult(this.results[index]);
        });

        this.resultsContainer.addEventListener('mousemove', (event) => {
            const item = event.target.closest('.global-search-item');
            if (!item) return;
            const index = Number(item.dataset.index);
            if (!Number.isFinite(index) || index === this.selectedIndex) return;
            this.selectedIndex = index;
            this.updateSelectionUI();
        });

        document.addEventListener('click', (event) => {
            if (!this.searchBox.contains(event.target) && !this.resultsContainer.contains(event.target)) {
                this.close();
            }
        });

        document.addEventListener('navigate', () => this.close());
        document.addEventListener('cases-updated', () => this.invalidateCache());
    }

    invalidateCache() {
        this.searchCache = null;
        this.cacheTime = 0;
    }

    getSearchableData() {
        if (this.searchCache && Date.now() - this.cacheTime < 15000) {
            return this.searchCache;
        }

        const cases = this.app.storage.loadCases() || [];
        const flatSessions = this.app.storage.load('sessions') || [];

        this.searchCache = {
            cases,
            sessions: buildSessionsIndex(cases, flatSessions),
            judgments: buildJudgmentsIndex(cases)
        };
        this.cacheTime = Date.now();
        return this.searchCache;
    }

    close() {
        this.results = [];
        this.selectedIndex = 0;
        this.resultsContainer.innerHTML = '';
        this.resultsContainer.hidden = true;
        this.searchBox.classList.remove('is-open');
    }

    open() {
        this.resultsContainer.hidden = false;
        this.searchBox.classList.add('is-open');
    }

    fuzzyMatch(text, query) {
        const source = String(text || '').toLowerCase();
        const needle = String(query || '').toLowerCase();

        if (!needle) return true;
        if (source.includes(needle)) return true;

        let pointer = 0;
        for (let index = 0; index < source.length && pointer < needle.length; index += 1) {
            if (source[index] === needle[pointer]) pointer += 1;
        }
        return pointer === needle.length;
    }

    escapeHtml(text) {
        return String(text ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    addResult(result) {
        this.results.push(result);
    }

    executeResult(result) {
        if (!result?.action) return;
        result.action();
    }

    updateSelectionUI() {
        const items = this.resultsContainer.querySelectorAll('.global-search-item');
        if (!items.length) return;

        items.forEach((item, index) => {
            item.classList.toggle('selected', index === this.selectedIndex);
        });
    }

    search(query) {
        const trimmedQuery = query.trim();
        if (!trimmedQuery) {
            this.close();
            return;
        }

        const data = this.getSearchableData();
        this.results = [];

        [
            {
                section: 'بحث مباشر',
                icon: 'briefcase-outline',
                title: `البحث في القضايا عن: ${trimmedQuery}`,
                sub: 'يفتح صفحة القضايا مع تطبيق التصفية مباشرة',
                action: () => {
                    document.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'cases', query: trimmedQuery } }));
                    this.clearInput();
                }
            },
            {
                section: 'بحث مباشر',
                icon: 'calendar-outline',
                title: `البحث في الجلسات عن: ${trimmedQuery}`,
                sub: 'يفتح أجندة الجلسات مع تصفية النتائج فورًا',
                action: () => {
                    document.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'sessions', query: trimmedQuery } }));
                    this.clearInput();
                }
            },
            {
                section: 'بحث مباشر',
                icon: 'hammer-outline',
                title: `البحث في الأحكام عن: ${trimmedQuery}`,
                sub: 'يفتح أجندة الأحكام مع تصفية النتائج فورًا',
                action: () => {
                    document.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'judgments', query: trimmedQuery } }));
                    this.clearInput();
                }
            }
        ].forEach((result) => this.addResult(result));

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
            .slice(0, 6)
            .forEach((caseData) => {
                const parties = caseData.parties?.filter(Boolean).join(' / ') || [caseData.plaintiff, caseData.defendant].filter(Boolean).join(' / ');
                this.addResult({
                    section: 'القضايا',
                    icon: 'document-text-outline',
                    title: `طعن رقم ${caseData.caseNumber || '-'}${caseData.year ? ` / ${caseData.year}` : ''}`,
                    sub: [caseData.court, caseData.subject, parties].filter(Boolean).join(' • '),
                    action: () => {
                        document.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'case-details', id: caseData.id } }));
                        this.clearInput();
                    }
                });
            });

        data.sessions
            .filter((session) => {
                return this.fuzzyMatch(session.caseNumber, trimmedQuery) ||
                    this.fuzzyMatch(session.subject, trimmedQuery) ||
                    this.fuzzyMatch(session.court, trimmedQuery) ||
                    this.fuzzyMatch(session.date, trimmedQuery) ||
                    this.fuzzyMatch(session.plaintiff, trimmedQuery) ||
                    this.fuzzyMatch(session.defendant, trimmedQuery) ||
                    this.fuzzyMatch(session.type, trimmedQuery) ||
                    this.fuzzyMatch(session.decision, trimmedQuery);
            })
            .slice(0, 6)
            .forEach((session) => {
                this.addResult({
                    section: 'الجلسات',
                    icon: 'calendar-number-outline',
                    title: `جلسة ${session.caseNumber || 'غير محددة'}${session.year ? ` / ${session.year}` : ''}`,
                    sub: [session.subject, session.court, formatSessionDate(session.date), session.type].filter(Boolean).join(' • '),
                    action: () => {
                        document.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'sessions', query: session.caseNumber || trimmedQuery } }));
                        this.clearInput();
                    }
                });
            });

        data.judgments
            .filter((judgment) => {
                return this.fuzzyMatch(judgment.caseNumberFormatted, trimmedQuery) ||
                    this.fuzzyMatch(judgment.subject, trimmedQuery) ||
                    this.fuzzyMatch(judgment.court, trimmedQuery) ||
                    this.fuzzyMatch(judgment.litigants, trimmedQuery) ||
                    this.fuzzyMatch(judgment.date, trimmedQuery) ||
                    this.fuzzyMatch(judgment.type, trimmedQuery) ||
                    this.fuzzyMatch(judgment.content, trimmedQuery) ||
                    this.fuzzyMatch(judgment.classification, trimmedQuery);
            })
            .slice(0, 6)
            .forEach((judgment) => {
                this.addResult({
                    section: 'الأحكام',
                    icon: 'hammer-outline',
                    title: `حكم ${judgment.caseNumberFormatted || 'غير محدد'}`,
                    sub: [judgment.type, judgment.classification, judgment.content].filter(Boolean).join(' • '),
                    action: () => {
                        document.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'judgments', query: judgment.caseNumber || trimmedQuery } }));
                        this.clearInput();
                    }
                });
            });

        this.selectedIndex = 0;
        this.renderResults();
    }

    renderResults() {
        if (!this.results.length) {
            this.resultsContainer.innerHTML = `
                <div class="global-search-empty">
                    <ion-icon name="search-outline"></ion-icon>
                    <p>لا توجد نتائج مطابقة</p>
                </div>
            `;
            this.open();
            return;
        }

        let html = '';
        let currentSection = '';

        this.results.forEach((result, index) => {
            if (result.section !== currentSection) {
                currentSection = result.section;
                html += `<div class="global-search-section">${this.escapeHtml(currentSection)}</div>`;
            }

            html += `
                <button class="global-search-item ${index === this.selectedIndex ? 'selected' : ''}" type="button" data-index="${index}">
                    <span class="global-search-item-icon"><ion-icon name="${result.icon}"></ion-icon></span>
                    <span class="global-search-item-body">
                        <span class="global-search-item-title">${this.escapeHtml(result.title)}</span>
                        ${result.sub ? `<span class="global-search-item-sub">${this.escapeHtml(result.sub)}</span>` : ''}
                    </span>
                </button>
            `;
        });

        this.resultsContainer.innerHTML = html;
        this.open();
    }

    clearInput() {
        this.input.value = '';
        this.invalidateCache();
        this.close();
    }

    handleKeydown(event) {
        if (!this.results.length && event.key !== 'Escape') return;

        if (event.key === 'ArrowDown') {
            event.preventDefault();
            this.selectedIndex = (this.selectedIndex + 1) % this.results.length;
            this.renderResults();
            return;
        }

        if (event.key === 'ArrowUp') {
            event.preventDefault();
            this.selectedIndex = (this.selectedIndex - 1 + this.results.length) % this.results.length;
            this.renderResults();
            return;
        }

        if (event.key === 'Enter') {
            event.preventDefault();
            this.executeResult(this.results[this.selectedIndex]);
            return;
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            this.close();
        }
    }
}
