import { Case, Session, Judgment } from '../core/Models.js';

export class Migration {
    constructor(app) {
        this.app = app;
        this.legacyKey = 'appeals'; // مفتاح الحفظ في النسخة القديمة V1
    }

    canMigrate() {
        const legacyData = localStorage.getItem(this.legacyKey);
        return legacyData && JSON.parse(legacyData).length > 0;
    }

    getLegacyCount() {
        const legacyData = localStorage.getItem(this.legacyKey);
        return legacyData ? JSON.parse(legacyData).length : 0;
    }

    migrate() {
        if (!this.canMigrate()) return { success: false, message: 'لا توجد بيانات قديمة لترحيلها.' };

        try {
            const rawData = JSON.parse(localStorage.getItem(this.legacyKey));
            const newCases = [];

            rawData.forEach(oldData => {
                // Generate a unique ID if old data didn't have a reliable one
                const id = oldData.id || `migrated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                
                // Map basic fields
                const newCase = new Case(
                    id, 
                    oldData.appealNumber || oldData.caseNumber || 'غير محدد', 
                    oldData.appealYear || oldData.year || new Date().getFullYear().toString()
                );

                newCase.court = oldData.court || 'غير محدد';
                newCase.subject = oldData.subject || oldData.topic || '';
                
                const plaintiff = oldData.plaintiff || oldData.appealant || 'غير محدد';
                const defendant = oldData.defendant || oldData.appellee || 'غير محدد';
                newCase.parties = [plaintiff, defendant];

                // Map status conservatively
                if (oldData.status === 'مشطوب') {
                    newCase.operationalStatus = 'struck_out';
                } else if (oldData.status === 'موقوف') {
                    newCase.operationalStatus = 'suspended_administrative';
                } else {
                    newCase.operationalStatus = 'active';
                }
                
                // Map Sessions
                if(oldData.sessions && Array.isArray(oldData.sessions)) {
                    oldData.sessions.forEach(s => {
                        const sid = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                        const sessionDate = s.date || s.sessionDate || new Date().toISOString().split('T')[0];
                        const newSession = new Session(sid, newCase.id, sessionDate);
                        newSession.decision = s.decision || s.notes || '';
                        newCase.sessions.push(newSession);
                    });
                }

                // Map Judgments
                if(oldData.judgments && Array.isArray(oldData.judgments)) {
                    oldData.judgments.forEach(j => {
                        const jid = `judg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                        const judgmentDate = j.date || j.judgmentDate || new Date().toISOString().split('T')[0];
                        const newJudgment = new Judgment(jid, newCase.id, judgmentDate);
                        newJudgment.content = j.content || j.text || '';
                        newJudgment.type = j.type || 'نهائي';
                        newCase.judgments.push(newJudgment);
                    });
                }

                newCases.push(newCase);
            });

            // Save to V2 storage (Notice: Overwrites current V2 data, meant to be run once immediately)
            this.app.storage.saveCases(newCases);
            return { success: true, message: `تم ترحيل ${newCases.length} قضية بنجاح إلى النسخة الجديدة!` };

        } catch (error) {
            console.error("Migration Error:", error);
            return { success: false, message: 'حدث خطأ أثناء الترحيل: ' + error.message };
        }
    }
}
