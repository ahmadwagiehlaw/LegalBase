const GRAPH_SCOPE = 'files.readwrite offline_access user.read';
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

const state = {
    accessToken: null,
    tokenExpiresAt: 0
};

const TOKEN_CACHE_KEY = 'sla_onedrive_token';
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

export const OneDriveModule = {
    isConnected: () => !!state.accessToken,

    getAuthUrl: (settings) => {
        const tenant = settings.oneDriveTenantId || 'common';
        const redirectUri = window.location.origin + window.location.pathname;
        const params = new URLSearchParams({
            client_id: settings.oneDriveClientId,
            response_type: 'token',
            redirect_uri: redirectUri,
            response_mode: 'fragment',
            scope: GRAPH_SCOPE
        });
        return `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`;
    },

    getAccessToken: async (settings) => {
        if (!settings?.oneDriveClientId) {
            throw new Error('Missing OneDrive Client ID');
        }

        const cached = loadCachedToken();
        if (cached) return cached;

        if (state.accessToken) return state.accessToken;

        const authUrl = OneDriveModule.getAuthUrl(settings);

        return new Promise((resolve, reject) => {
            const popup = window.open(authUrl, 'onedrive-auth', 'width=560,height=720');
            if (!popup) {
                reject(new Error('Popup blocked'));
                return;
            }

            const timer = window.setInterval(() => {
                try {
                    if (popup.closed) {
                        window.clearInterval(timer);
                        reject(new Error('Authentication cancelled'));
                        return;
                    }

                    const hash = popup.location.hash;
                    if (!hash || !hash.includes('access_token=')) return;

                    const params = new URLSearchParams(hash.replace(/^#/, ''));
                    const token = params.get('access_token');
                    if (!token) {
                        window.clearInterval(timer);
                        popup.close();
                        reject(new Error('Missing access token'));
                        return;
                    }

                    saveCachedToken(token, Number(params.get('expires_in')) || 3300);
                    window.clearInterval(timer);
                    popup.close();
                    resolve(state.accessToken);
                } catch (error) {
                    if (String(error).includes('cross-origin')) return;
                }
            }, 500);
        });
    },

    connect: async (settings) => OneDriveModule.getAccessToken(settings),

    disconnect: () => {
        state.accessToken = null;
        state.tokenExpiresAt = 0;
        sessionStorage.removeItem(TOKEN_CACHE_KEY);
    },

    uploadFile: async (file, settings, metadata = {}) => {
        const token = await OneDriveModule.getAccessToken(settings);
        const folderPath = String(settings.oneDriveFolderPath || '').trim().replace(/^\/+|\/+$/g, '');
        const fileName = metadata.fileName || file.name;
        const safePath = folderPath ? `${folderPath}/${fileName}` : fileName;
        const encodedPath = safePath.split('/').map(encodeURIComponent).join('/');

        const response = await fetch(`${GRAPH_BASE}/me/drive/root:/${encodedPath}:/content`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': file.type || 'application/octet-stream'
            },
            body: file
        });

        if (!response.ok) {
            throw new Error(`OneDrive upload failed: ${response.status}`);
        }

        const data = await response.json();
        return {
            fileId: data.id,
            fileName: data.name || file.name,
            webUrl: data.webUrl || '',
            downloadUrl: data['@microsoft.graph.downloadUrl'] || data.webUrl || ''
        };
    }
};

window.OneDriveModule = OneDriveModule;
