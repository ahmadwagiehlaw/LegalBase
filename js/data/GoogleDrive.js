import { getGoogleDriveRuntimeConfig } from '../config/AppConfig.js';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const GIS_SRC = 'https://accounts.google.com/gsi/client';

export const cloudOAuthConfig = getGoogleDriveRuntimeConfig();

export class GoogleDriveIntegration {
    constructor(app) {
        this.app = app;
        this.tokenCacheKey = 'sla_v2_google_drive_token';
        this.state = {
            scriptPromise: null,
            tokenClient: null,
            accessToken: null,
            tokenExpiresAt: 0
        };
    }

    loadCachedToken() {
        try {
            const cached = JSON.parse(sessionStorage.getItem(this.tokenCacheKey) || 'null');
            if (!cached?.token || !cached?.expiresAt) return null;
            if (Date.now() >= cached.expiresAt) return null;
            this.state.accessToken = cached.token;
            this.state.tokenExpiresAt = cached.expiresAt;
            return cached.token;
        } catch {
            return null;
        }
    }

    saveCachedToken(token, expiresIn = 3300) {
        const expiresAt = Date.now() + (Number(expiresIn) || 3300) * 1000;
        this.state.accessToken = token;
        this.state.tokenExpiresAt = expiresAt;
        sessionStorage.setItem(this.tokenCacheKey, JSON.stringify({ token, expiresAt }));
    }

    loadScript() {
        if (window.google?.accounts?.oauth2) return Promise.resolve();
        if (this.state.scriptPromise) return this.state.scriptPromise;

        this.state.scriptPromise = new Promise((resolve, reject) => {
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

        return this.state.scriptPromise;
    }

    async getAccessToken() {
        if (!String(cloudOAuthConfig.googleClientId || '').trim()) {
            throw new Error('إعدادات Google Drive غير مهيأة. أضف googleClientId محليًا قبل الربط.');
        }

        const cached = this.loadCachedToken();
        if (cached) return cached;

        await this.loadScript();

        return new Promise((resolve, reject) => {
            if (!this.state.tokenClient) {
                this.state.tokenClient = window.google.accounts.oauth2.initTokenClient({
                    client_id: cloudOAuthConfig.googleClientId,
                    scope: DRIVE_SCOPE,
                    callback: (response) => {
                        if (response?.error) {
                            reject(new Error(response.error));
                            return;
                        }
                        this.saveCachedToken(response.access_token, response.expires_in);
                        resolve(this.state.accessToken);
                    }
                });
            } else {
                this.state.tokenClient.callback = (response) => {
                    if (response?.error) {
                        reject(new Error(response.error));
                        return;
                    }
                    this.saveCachedToken(response.access_token, response.expires_in);
                    resolve(this.state.accessToken);
                };
            }

            this.state.tokenClient.requestAccessToken({
                prompt: this.state.accessToken ? '' : 'consent'
            });
        });
    }

    async uploadFile(file, metadata = {}) {
        const settings = this.app.storage.loadSettings();
        const token = await this.getAccessToken();
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
            throw new Error(`تعذر رفع الملف: ${response.status}`);
        }

        const data = await response.json();
        return {
            fileId: data.id,
            fileName: data.name || file.name,
            webViewLink: data.webViewLink || '',
            webContentLink: data.webContentLink || data.webViewLink || ''
        };
    }
}
