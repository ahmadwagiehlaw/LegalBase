function uniqueValues(values = []) {
    return [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];
}

function sortArabic(values = []) {
    return [...values].sort((a, b) => a.localeCompare(b, 'ar'));
}

export function collectCaseSuggestions(cases = [], settings = {}) {
    const plaintiffs = [];
    const defendants = [];
    const circuits = [];
    const subjects = [];
    const judgments = [];
    const judgmentTypes = [...(settings.judgmentTypes || [])];
    const sessionTypes = [...(settings.sessionTypes || [])];
    const classifications = [...(settings.judgmentClassifications || [])];

    cases.forEach((caseData) => {
        if (caseData.plaintiff) plaintiffs.push(caseData.plaintiff);
        if (caseData.defendant) defendants.push(caseData.defendant);
        if (caseData.circuit) circuits.push(caseData.circuit);
        if (caseData.subject) subjects.push(caseData.subject);
        if (caseData.latestDecision) judgments.push(caseData.latestDecision);
        if (caseData.latestSessionType) {
            judgmentTypes.push(caseData.latestSessionType);
            sessionTypes.push(caseData.latestSessionType);
        }

        (caseData.sessions || []).forEach((session) => {
            if (session.type) sessionTypes.push(session.type);
        });

        (caseData.judgments || []).forEach((judgment) => {
            if (judgment.content) judgments.push(judgment.content);
            if (judgment.type) judgmentTypes.push(judgment.type);
            if (judgment.classification) classifications.push(judgment.classification);
        });
    });

    return {
        courts: sortArabic(uniqueValues([...(settings.courts || []), ...cases.map((item) => item.court), ...cases.map((item) => item.circuitType)])),
        representations: sortArabic(uniqueValues([...(settings.representations || []), ...cases.map((item) => item.userRole)])),
        plaintiffs: sortArabic(uniqueValues(plaintiffs)),
        defendants: sortArabic(uniqueValues(defendants)),
        circuits: sortArabic(uniqueValues(circuits)),
        subjects: sortArabic(uniqueValues(subjects)),
        sessionTypes: sortArabic(uniqueValues(['فحص', 'موضوع', 'تحضيرية', 'مرافعة', 'حجز للحكم', 'خبراء', 'مفوضين', ...sessionTypes])),
        judgmentBriefs: sortArabic(uniqueValues([...(settings.judgmentBriefs || []), ...judgments])),
        judgmentClassifications: sortArabic(uniqueValues(classifications)),
        judgmentTypes: sortArabic(uniqueValues(['نهائي', 'تمهيدي', 'إجرائي', 'محجوز للحكم', 'لم يسجل بعد', ...judgmentTypes]))
    };
}

export function datalistMarkup(id, values = []) {
    const options = uniqueValues(values)
        .map((value) => `<option value="${String(value).replace(/"/g, '&quot;')}"></option>`)
        .join('');
    return `<datalist id="${id}">${options}</datalist>`;
}
