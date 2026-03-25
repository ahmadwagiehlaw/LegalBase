const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const GIS_SRC = 'https://accounts.google.com/gsi/client';

const state = {
    scriptPromise: null,
    tokenClient: null,
    accessToken: null,
    tokenExpiresAt: 0
};

const TOKEN_CACHE_KEY = 'sla_google_drive_token';
const loadCachedToken = () => {
    try {
        const cached = JSON.parse(sessionStorage.getItem(TOKEN_CACHE_KEY) || 'null');
        if (!cached?.token || !cached?.expiresAt) return null;
        if (Date.now() >= cached.expiresAt) return null;
        state.accessToken = cached.token;
        state.tokenExpiresAt = cached.expiresAt;
        return cached.token;
    } catch {
        return null;
    }
};
const saveCachedToken = (token, expiresIn = 3300) => {
    const expiresAt = Date.now() + (Number(expiresIn) || 3300) * 1000;
    state.accessToken = token;
    state.tokenExpiresAt = expiresAt;
    sessionStorage.setItem(TOKEN_CACHE_KEY, JSON.stringify({ token, expiresAt }));
};

export const GoogleDriveModule = {
    isConnected: () => !!state.accessToken,

    loadScript: () => {
        if (window.google?.accounts?.oauth2) return Promise.resolve();
        if (state.scriptPromise) return state.scriptPromise;

        state.scriptPromise = new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${GIS_SRC}"]`);
            if (existing) {
                existing.addEventListener('load', () => resolve(), { once: true });
                existing.addEventListener('error', () => reject(new Error('GIS load failed')), { once: true });
                return;
            }

            const script = document.createElement('script');
            script.src = GIS_SRC;
            script.async = true;
            script.defer = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('GIS load failed'));
            document.head.appendChild(script);
        });

        return state.scriptPromise;
    },

    getAccessToken: async (settings) => {
        if (!settings?.googleClientId) {
            throw new Error('Missing Google Client ID');
        }

        const cached = loadCachedToken();
        if (cached) return cached;

        await GoogleDriveModule.loadScript();

        return new Promise((resolve, reject) => {
            if (!state.tokenClient) {
                state.tokenClient = window.google.accounts.oauth2.initTokenClient({
                    client_id: settings.googleClientId,
                    scope: DRIVE_SCOPE,
                    callback: (response) => {
                        if (response?.error) {
                            reject(new Error(response.error));
                            return;
                        }
                        saveCachedToken(response.access_token, response.expires_in);
                        resolve(state.accessToken);
                    }
                });
            } else {
                state.tokenClient.callback = (response) => {
                    if (response?.error) {
                        reject(new Error(response.error));
                        return;
                    }
                    saveCachedToken(response.access_token, response.expires_in);
                    resolve(state.accessToken);
                };
            }

            state.tokenClient.requestAccessToken({
                prompt: state.accessToken ? '' : 'consent'
            });
        });
    },

    connect: async (settings) => GoogleDriveModule.getAccessToken(settings),

    disconnect: () => {
        if (state.accessToken && window.google?.accounts?.oauth2?.revoke) {
            try {
                window.google.accounts.oauth2.revoke(state.accessToken, () => {});
            } catch (error) {
                console.warn('Drive revoke failed', error);
            }
        }
        state.accessToken = null;
        state.tokenExpiresAt = 0;
        sessionStorage.removeItem(TOKEN_CACHE_KEY);
    },

    uploadFile: async (file, settings, metadata = {}) => {
        const token = await GoogleDriveModule.getAccessToken(settings);
        const meta = {
            name: metadata.fileName || file.name,
            mimeType: file.type || 'application/octet-stream'
        };

        if (settings.googleFolderId) {
            meta.parents = [settings.googleFolderId];
        }

        const formData = new FormData();
        formData.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
        formData.append('file', file);

        const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Drive upload failed: ${response.status}`);
        }

        const data = await response.json();
        return {
            fileId: data.id,
            fileName: data.name || file.name,
            webViewLink: data.webViewLink || '',
            webContentLink: data.webContentLink || data.webViewLink || ''
        };
    }
};

window.GoogleDriveModule = GoogleDriveModule;
