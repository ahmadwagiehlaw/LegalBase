const T = {
    previous: '\u0627\u0644\u0633\u0627\u0628\u0642',
    next: '\u0627\u0644\u062a\u0627\u0644\u064a',
    ellipsis: '\u2026'
};

export function buildPagination(currentPage, totalPages, radius = 2) {
    const pages = [];
    const start = Math.max(1, currentPage - radius);
    const end = Math.min(totalPages, currentPage + radius);

    if (start > 1) {
        pages.push(1);
        if (start > 2) pages.push('ellipsis-start');
    }

    for (let page = start; page <= end; page += 1) {
        pages.push(page);
    }

    if (end < totalPages) {
        if (end < totalPages - 1) pages.push('ellipsis-end');
        pages.push(totalPages);
    }

    return pages;
}

export function renderPagination(container, { currentPage, totalPages, onPageChange }) {
    if (!container) return;

    const pages = buildPagination(currentPage, totalPages);
    container.innerHTML = `
        <button class="pagination-nav" type="button" data-page="${currentPage - 1}" ${currentPage <= 1 ? 'disabled' : ''}>
            <ion-icon name="chevron-forward-outline"></ion-icon>
            <span>${T.previous}</span>
        </button>
        <div class="pagination-pages">
            ${pages.map((page) => {
                if (typeof page !== 'number') {
                    return `<span class="pagination-ellipsis">${T.ellipsis}</span>`;
                }

                return `
                    <button class="pagination-page ${page === currentPage ? 'active' : ''}" type="button" data-page="${page}">
                        ${page}
                    </button>
                `;
            }).join('')}
        </div>
        <button class="pagination-nav" type="button" data-page="${currentPage + 1}" ${currentPage >= totalPages ? 'disabled' : ''}>
            <span>${T.next}</span>
            <ion-icon name="chevron-back-outline"></ion-icon>
        </button>
    `;

    container.querySelectorAll('button[data-page]').forEach((button) => {
        button.addEventListener('click', () => {
            const targetPage = Number(button.dataset.page);
            if (targetPage >= 1 && targetPage <= totalPages && targetPage !== currentPage) {
                onPageChange(targetPage);
            }
        });
    });
}
