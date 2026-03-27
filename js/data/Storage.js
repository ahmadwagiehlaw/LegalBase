import { db, firebaseEnabled, doc, getDoc, setDoc, collection, getDocs, query, orderBy, limit, startAfter, writeBatch, where } from '../auth/FirebaseConfig.js';
import { Case } from '../core/Models.js';

export class Storage {
    // ... skipping unchanged lines, adding Case mapping to loadCases

// I need to use the full find-replace or just rewrite the top of the file and loadCases.

    constructor(prefix = 'SLA_V2_') {
        this.prefix = prefix;
        this.teamId = null;
    }

    normalizeCaseIdentityValue(value) {
        const arabicDigits = '٠١٢٣٤٥٦٧٨٩';
        return String(value ?? '')
            .trim()
            .replace(/[٠-٩]/g, (digit) => String(arabicDigits.indexOf(digit)))
            .replace(/\s+/g, '');
    }

    buildCaseIdentityKey(caseData = {}) {
        const caseNumber = this.normalizeCaseIdentityValue(caseData.caseNumber);
        const year = this.normalizeCaseIdentityValue(caseData.year);
        if (!caseNumber || !year) return '';
        return `${caseNumber}::${year}`;
    }

    dedupeCasesByIdentity(cases = []) {
        const deduped = [];
        const indexByKey = new Map();

        cases.forEach((item) => {
            const caseData = item instanceof Case ? item : new Case(item);
            const key = this.buildCaseIdentityKey(caseData);

            if (!key) {
                deduped.push(caseData);
                return;
            }

            if (!indexByKey.has(key)) {
                indexByKey.set(key, deduped.length);
                deduped.push(caseData);
                return;
            }

            const existingIndex = indexByKey.get(key);
            const existingCase = deduped[existingIndex];
            const existingUpdatedAt = new Date(existingCase.updatedAt || 0).getTime();
            const currentUpdatedAt = new Date(caseData.updatedAt || 0).getTime();

            if (currentUpdatedAt >= existingUpdatedAt) {
                deduped[existingIndex] = caseData;
            }
        });

        return deduped;
    }

    upsertCasesByIdentity(importedCases = []) {
        const existingCases = this.dedupeCasesByIdentity(this.load('cases') || []);
        const mergedCases = [...existingCases];
        const indexByKey = new Map();
        let inserted = 0;
        let updated = 0;
        let skipped = 0;

        mergedCases.forEach((caseData, index) => {
            const key = this.buildCaseIdentityKey(caseData);
            if (key) indexByKey.set(key, index);
        });

        importedCases.forEach((item) => {
            const importedCase = item instanceof Case ? item : new Case(item);
            const key = this.buildCaseIdentityKey(importedCase);

            if (!key) {
                skipped += 1;
                return;
            }

            if (indexByKey.has(key)) {
                const index = indexByKey.get(key);
                const currentCase = mergedCases[index];
                mergedCases[index] = new Case({
                    ...importedCase,
                    id: currentCase.id,
                    createdAt: currentCase.createdAt || importedCase.createdAt,
                    updatedAt: new Date().toISOString()
                });
                updated += 1;
                return;
            }

            mergedCases.push(importedCase);
            indexByKey.set(key, mergedCases.length - 1);
            inserted += 1;
        });

        const finalCases = this.dedupeCasesByIdentity(mergedCases);
        this.saveCases(finalCases);

        return {
            cases: finalCases,
            inserted,
            updated,
            skipped,
            total: importedCases.length
        };
    }

    removeCasesAndRelatedLocalData(caseIds = [], { clearAll = false } = {}) {
        if (clearAll) {
            this.save('cases', [], false);
            this.save('sessions', [], false);
            this.save('tasks', [], false);
            return;
        }

        const ids = new Set(caseIds.map((id) => String(id)));
        const cases = (this.load('cases') || []).filter((item) => !ids.has(String(item.id)));
        const sessions = (this.load('sessions') || []).filter((item) => !ids.has(String(item.caseId)));
        const tasks = (this.load('tasks') || []).filter((item) => !ids.has(String(item.caseId)));

        this.save('cases', cases, false);
        this.save('sessions', sessions, false);
        this.save('tasks', tasks, false);
    }

    setTeamId(teamId) {
        this.teamId = teamId;
    }

    async syncFromCloud() {
        if (!firebaseEnabled || !db || !this.teamId) return;
        try {
            // 1. Sync Settings (still in main doc)
            const docRef = doc(db, 'team_data', this.teamId);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data();
                if (data.settings) this.save('settings', data.settings, false);
                
                // AUTO-MIGRATION
                const settings = this.loadSettings() || {};
                if (data.cases && data.cases.length > 0 && !settings.wasMigratedV2) {
                    console.warn("Legacy data format detected. Migrating to subcollections via batch...");
                    const batch = writeBatch(db);
                    data.cases.forEach(c => {
                        const cRef = doc(db, 'team_data', this.teamId, 'cases', c.id);
                        if(!c.createdAt) c.createdAt = new Date().toISOString();
                        c.updatedAt = new Date().toISOString();
                        batch.set(cRef, c, { merge: true });
                    });
                    batch.update(docRef, { cases: [] });
                    await batch.commit();
                    
                    settings.wasMigratedV2 = true;
                    this.saveSettings(settings);
                    console.log("Migration finalized via batch.");
                }
            }

            // 2. Sync Cases (from subcollection)
            const casesRef = collection(db, 'team_data', this.teamId, 'cases');
            
            // SECURITY/VISIBILITY FIX: Fetch all to ensure repair
            const querySnap = await getDocs(query(casesRef, limit(1000))); 
            
            const cloudCases = [];
            let docsToRepair = [];

            querySnap.forEach(docSnap => {
                const cData = docSnap.data();
                if (!cData.createdAt || !cData.updatedAt) {
                    docsToRepair.push({ ref: docSnap.ref, data: cData });
                }
                cloudCases.push({ id: docSnap.id, ...cData });
            });

            if (docsToRepair.length > 0) {
                console.log(`Repairing ${docsToRepair.length} documents...`);
                for (let i = 0; i < docsToRepair.length; i += 400) {
                    const chunk = docsToRepair.slice(i, i + 400);
                    const batch = writeBatch(db);
                    chunk.forEach(item => {
                        const now = new Date().toISOString();
                        batch.update(item.ref, { 
                            createdAt: item.data.createdAt || now,
                            updatedAt: item.data.updatedAt || now
                        });
                    });
                    await batch.commit();
                }
                console.log("Firestore Repair complete.");
            }

            if (cloudCases.length > 0) {
                this.save('cases', cloudCases, false);
                console.log(`Synced ${cloudCases.length} cases from cloud`);
            }
        } catch (error) {
            console.error("Cloud Sync Error (Load/Repair Chunks):", error);
        }
    }

    async loadCollectionPaginated(collectionName, limitNum = 20, lastVisible = null, filters = []) {
        if (!firebaseEnabled || !db || !this.teamId) return { data: [], lastDoc: null };
        
        try {
            const ref = collection(db, 'team_data', this.teamId, collectionName);
            let queryConstraints = [];
            
            // Fallback: If no order field is provided or if documents might miss it, 
            // we use createdAt but we must be careful. Firestore won't return docs missing the field.
            // We'll enforce createdAt on all new/migrated docs, but let's add a safer query.
            queryConstraints.push(orderBy('createdAt', 'desc'));
            
            if (filters && filters.length > 0) {
                filters.forEach(f => queryConstraints.push(where(f.field, f.op, f.value)));
            }
            
            if (lastVisible) {
                queryConstraints.push(startAfter(lastVisible));
            }
            
            queryConstraints.push(limit(limitNum));

            const q = query(ref, ...queryConstraints);
            const snap = await getDocs(q);
            const data = [];
            snap.forEach(d => data.push({ id: d.id, ...d.data() }));
            
            return {
                data,
                lastDoc: snap.docs[snap.docs.length - 1]
            };
        } catch (err) {
            console.error(`Paginated Load Error [${collectionName}]:`, err);
            return { data: [], lastDoc: null };
        }
    }

    async loadCasesPaginated(limitNum = 20, lastVisible = null) {
        const result = await this.loadCollectionPaginated('cases', limitNum, lastVisible);
        return { cases: result.data, lastDoc: result.lastDoc };
    }

    async pushToCloud() {
        if (!firebaseEnabled || !db || !this.teamId) return;
        try {
            const cases = this.loadCases();
            const settings = this.loadSettings() || {};
            
            // Save Settings to main doc
            await setDoc(doc(db, 'team_data', this.teamId), {
                settings: settings,
                lastUpdated: new Date().toISOString()
            }, { merge: true });

            // CHUNKED BATCHING: Firestore batches are limited to 500 operations
            const chunkSize = 400; 
            for (let i = 0; i < cases.length; i += chunkSize) {
                const chunk = cases.slice(i, i + chunkSize);
                const batch = writeBatch(db);
                chunk.forEach(c => {
                    const cRef = doc(db, 'team_data', this.teamId, 'cases', c.id);
                    if(!c.createdAt) c.createdAt = new Date().toISOString();
                    batch.set(cRef, c, { merge: true });
                });
                await batch.commit();
                console.log(`Pushed chunk ${Math.floor(i/chunkSize) + 1} to cloud`);
            }
            console.log("Push to cloud complete (Chunked)");
        } catch(error) {
            console.error("Cloud Sync Error (Save Chunks):", error);
        }
    }

    async saveCaseCloud(caseData) {
        if (!firebaseEnabled || !db || !this.teamId) return;
        try {
            const cRef = doc(db, 'team_data', this.teamId, 'cases', caseData.id);
            if(!caseData.createdAt) caseData.createdAt = new Date().toISOString();
            caseData.updatedAt = new Date().toISOString();
            await setDoc(cRef, caseData, { merge: true });

            // Also save any sessions/tasks flat if they exist
            if(caseData.sessions) {
                for(let s of caseData.sessions) {
                    await this.saveDocCloud('sessions', { ...s, caseId: caseData.id, caseNumber: caseData.caseNumber, court: caseData.court });
                }
            }
            if(caseData.tasks) {
                for(let t of caseData.tasks) {
                    await this.saveDocCloud('tasks', { ...t, caseId: caseData.id });
                }
            }
        } catch (err) {
            console.error("Single Case Save Error:", err);
        }
    }

    async saveDocCloud(collectionName, data) {
        if (!firebaseEnabled || !db || !this.teamId || !data.id) return;
        try {
            const dRef = doc(db, 'team_data', this.teamId, collectionName, data.id);
            if(!data.createdAt) data.createdAt = new Date().toISOString();
            data.updatedAt = new Date().toISOString();
            await setDoc(dRef, data, { merge: true });
        } catch (err) {
            console.error(`Save Doc Error [${collectionName}]:`, err);
        }
    }

    async loadSessionsPaginated(limitNum = 20, lastVisible = null) {
        return this.loadCollectionPaginated('sessions', limitNum, lastVisible);
    }

    async loadTasksPaginated(limitNum = 20, lastVisible = null) {
        return this.loadCollectionPaginated('tasks', limitNum, lastVisible);
    }

    save(key, data, syncCloud = true) {
        try {
            const serialized = JSON.stringify(data);
            localStorage.setItem(this.prefix + key, serialized);
            
            if (syncCloud) {
                // If it's a single case being saved (e.g. from UI edit), we'd ideally pass the case data.
                // But current architecture uses save('cases', allCases).
                // To optimize, if key is 'cases', we push everything (batch).
                this.pushToCloud();
            }
            return true;
        } catch (e) {
            console.error("Storage Save Error:", e);
            return false;
        }
    }

    load(key) {
        try {
            const data = localStorage.getItem(this.prefix + key);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error("Storage Load Error:", e);
            return null;
        }
    }

    saveCases(cases) { return this.save('cases', cases); }
    loadCases() { 
        const rawData = this.load('cases') || []; 
        // Map raw local data through Case model so dates normalize instantly 
        // without waiting for user to edit and save.
        return rawData.map(c => new Case(c)); 
    }

    saveSettings(settings) { return this.save('settings', settings); }
    loadSettings() { return this.load('settings'); }


    clearAll() {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(this.prefix)) {
                localStorage.removeItem(key);
            }
        });
    }
}
