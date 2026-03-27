import { formatSessionDate, parseSessionDate } from './SessionIndex.js';

function getPlaintiff(caseData = {}) {
    return caseData.plaintiff || caseData.parties?.[0] || '';
}

function getDefendant(caseData = {}) {
    return caseData.defendant || caseData.parties?.[1] || '';
}

export function buildJudgmentsIndex(cases = []) {
    const allJudgments = [];

    cases.forEach((caseData) => {
        if (caseData.operationalStatus !== 'محكوم فيه' && caseData.operationalStatus !== 'محجوز للحكم') {
            return;
        }

        const plaintiff = getPlaintiff(caseData);
        const defendant = getDefendant(caseData);
        const caseNumberFormatted = `${caseData.caseNumber || '-'}${caseData.year ? ` / ${caseData.year}` : ''}`;
        const litigants = [plaintiff, defendant].filter(Boolean).join(' / ') || (caseData.parties?.join(' ضد ') || '');
        const shared = {
            caseId: caseData.id,
            caseNumberFormatted,
            caseNumber: caseData.caseNumber || '',
            year: caseData.year || '',
            court: caseData.court || '',
            subject: caseData.subject || '',
            plaintiff,
            defendant,
            litigants
        };

        if (Array.isArray(caseData.judgments) && caseData.judgments.length > 0) {
            caseData.judgments.forEach((judgment) => {
                allJudgments.push({
                    ...shared,
                    ...judgment,
                    id: judgment.id || `${caseData.id}_${judgment.date || judgment.type || 'judgment'}`,
                    date: formatSessionDate(judgment.date)
                });
            });
            return;
        }

        allJudgments.push({
            ...shared,
            id: `${caseData.id}_pseudo`,
            date: formatSessionDate(caseData.lastSessionDate || ''),
            type: caseData.operationalStatus === 'محجوز للحكم' ? 'محجوز للحكم' : 'لم يسجل بعد',
            content: caseData.latestDecision || '',
            classification: caseData.judgmentClassification || ''
        });
    });

    return allJudgments.sort((a, b) => parseSessionDate(b.date) - parseSessionDate(a.date));
}
