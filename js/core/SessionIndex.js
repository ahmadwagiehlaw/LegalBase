function parseExcelDate(value) {
    const num = Number(value);
    if (Number.isNaN(num) || num < 20000 || num > 60000) {
        return null;
    }

    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + num * 86400000);
}

export function parseSessionDate(dateValue) {
    if (!dateValue) return new Date(0);

    const excelDate = parseExcelDate(dateValue);
    if (excelDate) return excelDate;

    const text = String(dateValue).trim();
    if (!text) return new Date(0);

    if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
        return new Date(text);
    }

    const parts = text.split(/[\/\-.]/);
    if (parts.length === 3) {
        const [a, b, c] = parts;
        if (c.length === 4) return new Date(`${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`);
        if (a.length === 4) return new Date(`${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`);
    }

    const fallback = new Date(text);
    return Number.isNaN(fallback.getTime()) ? new Date(0) : fallback;
}

export function formatSessionDate(dateValue) {
    if (!dateValue) return '-';
    const parsed = parseSessionDate(dateValue);
    if (Number.isNaN(parsed.getTime()) || parsed.getTime() === 0) {
        return String(dateValue);
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
}

function getPlaintiff(caseData = {}) {
    return caseData.plaintiff || caseData.parties?.[0] || '-';
}

function getDefendant(caseData = {}) {
    return caseData.defendant || caseData.parties?.[1] || '-';
}

function buildRecordKey(record) {
    return [
        record.caseId || '',
        record.caseNumber || '',
        record.date || '',
        record.subject || '',
        record.type || '',
        record.decision || '',
        record.notes || ''
    ].join('|').toLowerCase();
}

function normalizeRecord(source = {}, caseData = {}) {
    return {
        id: source.id || `${caseData.id || source.caseId || 'session'}_${source.date || source.sessionDate || Date.now()}`,
        caseId: source.caseId || caseData.id || '',
        caseNumber: source.caseNumber || caseData.caseNumber || '-',
        year: source.year || caseData.year || '',
        court: source.court || caseData.court || caseData.circuit || '-',
        subject: source.subject || caseData.subject || '',
        plaintiff: source.plaintiff || getPlaintiff(caseData),
        defendant: source.defendant || getDefendant(caseData),
        date: source.date || source.sessionDate || '',
        type: source.type || source.sessionType || caseData.latestSessionType || '',
        decision: source.decision || source.result || caseData.latestDecision || '',
        notes: source.notes || '',
    };
}

export function buildSessionsIndex(cases = [], flatSessions = []) {
    const index = [];
    const seen = new Set();
    const casesById = new Map(cases.map((caseData) => [caseData.id, caseData]));

    const pushRecord = (record) => {
        if (!record.caseId && !record.caseNumber) return;
        if (!record.date && !record.decision && !record.type && !record.notes) return;

        const key = buildRecordKey(record);
        if (seen.has(key)) return;

        seen.add(key);
        index.push(record);
    };

    cases.forEach((caseData) => {
        if (Array.isArray(caseData.sessions)) {
            caseData.sessions.forEach((session) => {
                pushRecord(normalizeRecord(session, caseData));
            });
        }

        if (caseData.lastSessionDate) {
            pushRecord(normalizeRecord({
                id: `${caseData.id}_last`,
                caseId: caseData.id,
                caseNumber: caseData.caseNumber,
                court: caseData.court,
                date: caseData.lastSessionDate,
                type: caseData.latestSessionType || '',
                decision: caseData.latestDecision || '',
            }, caseData));
        }

        if (caseData.previousSessionDate && caseData.previousSessionDate !== caseData.lastSessionDate) {
            pushRecord(normalizeRecord({
                id: `${caseData.id}_prev`,
                caseId: caseData.id,
                caseNumber: caseData.caseNumber,
                court: caseData.court,
                date: caseData.previousSessionDate,
                type: caseData.latestSessionType || '',
                decision: caseData.latestDecision || '',
                notes: 'جلسة سابقة'
            }, caseData));
        }
    });

    flatSessions.forEach((session) => {
        const caseData = casesById.get(session.caseId) || {};
        pushRecord(normalizeRecord(session, caseData));
    });

    index.sort((a, b) => parseSessionDate(b.date) - parseSessionDate(a.date));
    return index;
}
