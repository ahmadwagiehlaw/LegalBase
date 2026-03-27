/**
 * RulesEngine.js
 * المحرك الذكي للقواعد الإجرائية القضائية
 */

export class RulesEngine {
    constructor() {
        this.rules = [];
        this.initDefaultRules();
    }

    initDefaultRules() {
        // قاعدة الوقف الجزائي
        this.rules.push({
            name: "administrative_suspension",
            trigger: "judgment",
            condition: (judgment) => judgment.content.includes("وقف جزائي"),
            effect: (judgment, context) => {
                return {
                    operationalStatus: "suspended_administrative",
                    nextAction: "تعجيل من الوقف",
                    reminders: [
                        {
                            title: "قرب انتهاء مدة الوقف الجزائي",
                            dueAfterDays: 30, // يبدأ التنبيه بعد 30 يوم
                            criticalAtDays: 45
                        }
                    ],
                    tasks: [
                        { title: "مراجعة ملف التعجيل من الوقف", priority: "high" }
                    ]
                };
            }
        });

        // قاعدة الشطب
        this.rules.push({
            name: "case_dismissed",
            trigger: "session",
            condition: (session) => session.decision.includes("شطب"),
            effect: (session, context) => {
                return {
                    operationalStatus: "struck_out",
                    nextAction: "تجديد السير في الدعوى",
                    reminders: [
                        {
                            title: "ميعاد تجديد السير بعد الشطب",
                            dueAfterDays: 30,
                            criticalAtDays: 60
                        }
                    ]
                };
            }
        });

        // قاعدة الأرشفة (الحكم النهائي)
        this.rules.push({
            name: "case_archived",
            trigger: "judgment",
            condition: (judgment) => judgment.type === "نهائي" || judgment.content.includes("انتهت الخصومة"),
            effect: (judgment, context) => {
                return {
                    status: "archived",
                    operationalStatus: "closed",
                    nextAction: "أرشيف"
                };
            }
        });
    }

    // تشغيل المحرك عند وقوع حدث
    processEvent(eventType, eventData, caseData) {
        const effects = [];
        const applicableRules = this.rules.filter(rule => rule.trigger === eventType);

        for (const rule of applicableRules) {
            if (rule.condition(eventData)) {
                effects.push(rule.effect(eventData, caseData));
            }
        }

        return effects;
    }
}
