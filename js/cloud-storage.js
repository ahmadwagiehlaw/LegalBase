import { db, cloudOAuthConfig } from './config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const DEFAULT_SETTINGS = {
    provider: 'firebase',
    googleClientId: '',
    googleApiKey: '',
    googleAppId: '',
    googleFolderId: '',
    oneDriveClientId: '',
    oneDriveTenantId: '',
    oneDriveFolderPath: '',
    useCloudLinksOnly: true
};

const PRECONFIGURED_SETTINGS = {
    googleClientId: cloudOAuthConfig.googleClientId || '',
    googleApiKey: cloudOAuthConfig.googleApiKey || '',
    googleAppId: cloudOAuthConfig.googleAppId || '',
    googleFolderId: cloudOAuthConfig.googleFolderId || '',
    oneDriveClientId: cloudOAuthConfig.oneDriveClientId || '',
    oneDriveTenantId: cloudOAuthConfig.oneDriveTenantId || '',
    oneDriveFolderPath: cloudOAuthConfig.oneDriveFolderPath || ''
};

export const CloudStorageModule = {
    settings: { ...DEFAULT_SETTINGS },

    async load() {
        try {
            const snap = await getDoc(doc(db, 'settings', 'cloudStorage'));
            this.settings = snap.exists()
                ? { ...DEFAULT_SETTINGS, ...PRECONFIGURED_SETTINGS, ...snap.data() }
                : { ...DEFAULT_SETTINGS, ...PRECONFIGURED_SETTINGS };
        } catch (error) {
            console.warn('Could not load cloud storage settings', error);
            this.settings = { ...DEFAULT_SETTINGS, ...PRECONFIGURED_SETTINGS };
        }
        return this.settings;
    },

    async save(data) {
        this.settings = { ...DEFAULT_SETTINGS, ...PRECONFIGURED_SETTINGS, ...data };
        await setDoc(doc(db, 'settings', 'cloudStorage'), this.settings);
        return this.settings;
    },

    getResolvedSettings(overrides = {}) {
        return {
            ...DEFAULT_SETTINGS,
            ...PRECONFIGURED_SETTINGS,
            ...this.settings,
            ...overrides
        };
    },

    getProviderLabel(provider = this.settings.provider) {
        if (provider === 'google_drive') return 'Google Drive';
        if (provider === 'onedrive') return 'OneDrive';
        return 'Firebase Storage';
    },

    detectProviderFromUrl(url = '') {
        const value = String(url).toLowerCase();
        if (value.includes('drive.google.com')) return 'google_drive';
        if (value.includes('onedrive.live.com') || value.includes('sharepoint.com') || value.includes('1drv.ms')) return 'onedrive';
        return 'external';
    },

    canUseCloudLink(provider = this.settings.provider) {
        return provider === 'google_drive' || provider === 'onedrive';
    },

    isDirectUploadConfigured(provider = this.settings.provider) {
        const settings = this.getResolvedSettings();
        if (provider === 'google_drive') {
            return !!(settings.googleClientId && settings.googleApiKey && settings.googleAppId);
        }
        if (provider === 'onedrive') {
            return !!settings.oneDriveClientId;
        }
        return true;
    },

    getMissingConfig(provider = this.settings.provider) {
        const settings = this.getResolvedSettings();
        if (provider === 'google_drive') {
            const missing = [];
            if (!settings.googleClientId) missing.push('Google Client ID');
            if (!settings.googleApiKey) missing.push('Google API Key');
            if (!settings.googleAppId) missing.push('Google App ID');
            return missing;
        }
        if (provider === 'onedrive') {
            const missing = [];
            if (!settings.oneDriveClientId) missing.push('OneDrive Client ID');
            return missing;
        }
        return [];
    },

    hasPreconfiguredProvider(provider) {
        if (provider === 'google_drive') {
            return !!(PRECONFIGURED_SETTINGS.googleClientId && PRECONFIGURED_SETTINGS.googleApiKey && PRECONFIGURED_SETTINGS.googleAppId);
        }
        if (provider === 'onedrive') {
            return !!PRECONFIGURED_SETTINGS.oneDriveClientId;
        }
        return true;
    }
};

window.CloudStorageModule = CloudStorageModule;
