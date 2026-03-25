import { db } from './config.js';
import { collection, getDocs, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const CACHE_KEY = 'sla_cache_appeals_v1';
const CACHE_TTL_MS = 5 * 60 * 1000;

const state = {
    items: [],
    hydrated: false,
    lastSyncedAt: 0,
    loadingPromise: null,
    listeners: new Set()
};

const safeLocalStorage = {
    get: (key) => {
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    },
    set: (key, value) => {
        try {
            localStorage.setItem(key, value);
        } catch {
            // Ignore storage quota/private mode failures.
        }
    }
};

const toMillis = (value) => {
    if (!value) return 0;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.toDate === 'function') return value.toDate().getTime();
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
};

const sortAppeals = (items) => {
    return [...items].sort((a, b) => {
        const bTime = toMillis(b.updatedAt) || toMillis(b.createdAt);
        const aTime = toMillis(a.updatedAt) || toMillis(a.createdAt);
        if (bTime !== aTime) return bTime - aTime;
        return String(b.appealNumber || '').localeCompare(String(a.appealNumber || ''), 'ar');
    });
};

const notify = () => {
    const snapshot = [...state.items];
    state.listeners.forEach((listener) => {
        try {
            listener(snapshot);
        } catch (error) {
            console.error('AppealsStore listener failed', error);
        }
    });
};

const persist = () => {
    safeLocalStorage.set(CACHE_KEY, JSON.stringify({
        items: state.items,
        lastSyncedAt: state.lastSyncedAt
    }));
};

const readCache = () => {
    const raw = safeLocalStorage.get(CACHE_KEY);
    if (!raw) return null;

    try {
        return JSON.parse(raw);
    } catch (error) {
        console.warn('Could not parse appeals cache', error);
        return null;
    }
};

const fetchAppealsFromServer = async () => {
    try {
        const snapshot = await getDocs(query(collection(db, "appeals"), orderBy("updatedAt", "desc")));
        return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    } catch (updatedAtError) {
        try {
            const snapshot = await getDocs(query(collection(db, "appeals"), orderBy("createdAt", "desc")));
            return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        } catch (createdAtError) {
            const snapshot = await getDocs(collection(db, "appeals"));
            return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
        }
    }
};

export const AppealsStore = {
    hydrateFromCache: () => {
        if (state.hydrated) return [...state.items];

        const cached = readCache();
        if (cached?.items?.length) {
            state.items = sortAppeals(cached.items);
            state.lastSyncedAt = cached.lastSyncedAt || 0;
        }

        state.hydrated = true;
        return [...state.items];
    },

    subscribe: (listener) => {
        state.listeners.add(listener);
        return () => state.listeners.delete(listener);
    },

    getAll: () => {
        AppealsStore.hydrateFromCache();
        return [...state.items];
    },

    getLastSyncedAt: () => {
        AppealsStore.hydrateFromCache();
        return state.lastSyncedAt;
    },

    load: async ({ forceRefresh = false, allowStale = true } = {}) => {
        AppealsStore.hydrateFromCache();

        const hasItems = state.items.length > 0;
        const isFresh = (Date.now() - state.lastSyncedAt) < CACHE_TTL_MS;

        if (!forceRefresh && hasItems && isFresh) {
            return [...state.items];
        }

        if (!forceRefresh && allowStale && hasItems) {
            if (!state.loadingPromise) {
                state.loadingPromise = AppealsStore.refresh()
                    .catch((error) => {
                        console.warn('Background appeals refresh failed', error);
                    })
                    .finally(() => {
                        state.loadingPromise = null;
                    });
            }
            return [...state.items];
        }

        return AppealsStore.refresh();
    },

    refresh: async () => {
        if (state.loadingPromise) return state.loadingPromise;

        state.loadingPromise = (async () => {
            const serverItems = sortAppeals(await fetchAppealsFromServer());
            state.items = serverItems;
            state.lastSyncedAt = Date.now();
            persist();
            notify();
            return [...state.items];
        })().finally(() => {
            state.loadingPromise = null;
        });

        return state.loadingPromise;
    },

    upsert: (appeal) => {
        AppealsStore.hydrateFromCache();
        const idx = state.items.findIndex((item) => item.id === appeal.id);
        if (idx === -1) {
            state.items.push(appeal);
        } else {
            state.items[idx] = { ...state.items[idx], ...appeal };
        }
        state.items = sortAppeals(state.items);
        persist();
        notify();
    },

    upsertMany: (appeals) => {
        AppealsStore.hydrateFromCache();
        const byId = new Map(state.items.map((item) => [item.id, item]));
        appeals.forEach((appeal) => {
            byId.set(appeal.id, { ...(byId.get(appeal.id) || {}), ...appeal });
        });
        state.items = sortAppeals([...byId.values()]);
        state.lastSyncedAt = Date.now();
        persist();
        notify();
    },

    remove: (appealId) => {
        AppealsStore.hydrateFromCache();
        state.items = state.items.filter((item) => item.id !== appealId);
        persist();
        notify();
    }
};
