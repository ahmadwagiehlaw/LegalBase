// Models.js
// الكيانات الأساسية للنظام القضائي V2

/**
 * دالة مساعدة لتحويل أي صيغة تاريخ (بما فيها أرقام Excel) 
 * إلى صيغة YYYY-MM-DD القياسية وحفظها كنص موحد
 */
function normalizeDate(dateStr) {
    if (!dateStr) return "";
    
    // Excel serial date number (e.g. 45987)
    const num = Number(dateStr);
    if (!isNaN(num) && num > 20000 && num < 60000) {
        const excelEpoch = new Date(1899, 11, 30);
        const d = new Date(excelEpoch.getTime() + num * 86400000);
        return d.toISOString().split('T')[0];
    }

    const s = String(dateStr).trim();

    // Already ISO YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10);

    // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const parts = s.split(/[\/\-\.]/);
    if (parts.length === 3) {
        const [a, b, c] = parts;
        if (c.length === 4) { // d/m/yyyy
            return `${c}-${b.padStart(2,'0')}-${a.padStart(2,'0')}`;
        }
        if (a.length === 4) { // yyyy/m/d
            return `${a}-${b.padStart(2,'0')}-${c.padStart(2,'0')}`;
        }
    }

    const d = new Date(s);
    return isNaN(d) ? s : d.toISOString().split('T')[0];
}

function normalizeArray(value) {
    if (Array.isArray(value)) return value.filter((item) => item !== undefined && item !== null && String(item).trim() !== '');
    if (typeof value === 'string') {
        const trimmed = value.trim();
        if (!trimmed) return [];
        return trimmed.split(/[,\n\r؛;]/).map((item) => item.trim()).filter(Boolean);
    }
    return [];
}

export class Case {
    constructor(data = {}) {
        this.id = data.id || crypto.randomUUID();
        this.caseNumber = data.caseNumber || "";
        this.year = data.year || "";
        this.court = data.court || "";
        this.circuit = data.circuit || ""; // الدائرة
        this.circuitType = data.circuitType || ""; // نوع الدائرة (فحص/موضوع/مفوضين)
        this.subject = data.subject || ""; // الموضوع
        
        // الأطراف والتمثيل
        this.parties = normalizeArray(data.parties); // الخصوم
        this.representedEntity = data.representedEntity || ""; // الجهة الممثلة
        this.userRole = data.userRole || ""; // صفة المستخدم (مدع/مدعى عليه...)
        
        // الحالة التشغيلية
        this.baseStatus = data.baseStatus || "active"; // نشطة/مؤرشفة
        this.operationalStatus = data.operationalStatus || "new"; // الحالة المشتقة (مثلاً: وقف جزائي)
        this.nextAction = data.nextAction || "تحديد جلسة";
        
        // الحقول الإضافية المطلوبة
        this.fileLocation = data.fileLocation || ""; // مكان الملف
        this.bannerImage = data.bannerImage || null; // صورة بارزة للملف
        this.analyses = Array.isArray(data.analyses) ? data.analyses : []; // تحليلات وملاحظات فنية
        this.latestSessionType = data.latestSessionType || ""; // نوع الجلسة (للعرض المباشر)
        this.latestDecision = data.latestDecision || ""; // القرار
        
        // *** Taming Dates ***
        this.lastSessionDate = normalizeDate(data.lastSessionDate || ""); // آخر جلسة
        this.previousSessionDate = normalizeDate(data.previousSessionDate || ""); // الجلسة السابقة
        
        // --- Auto-Compute Operational Status ---
        // متداول مادام القرار ليس (للحكم او حكم) 
        // محكوم فيه لو كان القرار للحكم والتاريخ للجلسة اقدم من اليوم 
        // محجوز للحكم لو كان تاريخ الجلسة مستقبليا
        // محال لو كان القرار فيه كلمة (إحالة )
        const dec = (this.latestDecision || "").toLowerCase();
        const todayStr = new Date().toISOString().split('T')[0];
        
        if (dec.includes('إحالة') || dec.includes('احالة')) {
            this.operationalStatus = 'محال';
        } else if (dec.includes('للحكم') || dec.includes('حكم')) {
            if (this.lastSessionDate && this.lastSessionDate > todayStr) {
                this.operationalStatus = 'محجوز للحكم';
            } else {
                this.operationalStatus = 'محكوم فيه';
            }
        } else if (dec) {
            this.operationalStatus = 'متداول';
        } else {
            this.operationalStatus = data.operationalStatus || 'جديد';
        }
        
        this.judgmentPronouncement = data.judgmentPronouncement || ""; // منطوق الحكم
        this.judgmentClassification = data.judgmentClassification || ""; // تصنيف الحكم (صالح/ضد...)
        this.judgmentBrief = data.judgmentBrief || ""; // الحكم المختصر
        this.sessionPreparation = data.sessionPreparation || ""; // تحضير الجلسة
        this.viewRequests = data.viewRequests || ""; // طلبات الإطلاع
        this.plaintiffAddress = data.plaintiffAddress || ""; // عنوان المدعي
        this.chosenHeadquarters = data.chosenHeadquarters || ""; // المقر المختار
        this.joinedCases = normalizeArray(data.joinedCases); // دعاوى مضمومة (مصفوفة)
        this.otherDefendants = normalizeArray(data.otherDefendants); // مدعي عليهم آخرين (مصفوفة)
        
        // التواريخ
        this.createdAt = data.createdAt || new Date().toISOString();
        this.updatedAt = data.updatedAt || new Date().toISOString();
        
        // العلاقات
        this.attachments = Array.isArray(data.attachments) ? data.attachments : [];
        this.sessions = Array.isArray(data.sessions) ? data.sessions : [];
        this.judgments = Array.isArray(data.judgments) ? data.judgments : [];
        this.tasks = Array.isArray(data.tasks) ? data.tasks : [];
        this.reminders = Array.isArray(data.reminders) ? data.reminders : [];
    }
}

export class Session {
    constructor(data = {}) {
        this.id = data.id || crypto.randomUUID();
        this.caseId = data.caseId;
        this.date = data.date || "";
        this.type = data.type || "مرافعة"; // فحص / موضوع / مفوضين / مرافعة
        this.decision = data.decision || ""; // قرار الجلسة
        this.result = data.result || ""; // النتيجة الإجرائية
        this.notes = data.notes || "";
    }
}

export class Judgment {
    constructor(data = {}) {
        this.id = data.id || crypto.randomUUID();
        this.caseId = data.caseId;
        this.sessionId = data.sessionId;
        this.date = data.date || "";
        this.type = data.type || "نهائي"; // نهائي / تمهيدي / إجرائي
        this.content = data.content || ""; // منطوق الحكم
        this.classification = data.classification || "pending"; // صالح / ضد / مراجعة
        this.isFinal = data.isFinal || false;
    }
}

export class Task {
    constructor(data = {}) {
        this.id = data.id || crypto.randomUUID();
        this.caseId = data.caseId;
        this.title = data.title || "";
        this.dueDate = data.dueDate || "";
        this.priority = data.priority || "normal"; // low / normal / high / critical
        this.status = data.status || "pending"; // pending / completed / dismissed
        this.source = data.source || "manual"; // manual / rules-engine
    }
}
