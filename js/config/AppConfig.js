const DEFAULT_RUNTIME_CONFIG = {
    firebase: {
        apiKey: '',
        authDomain: '',
        projectId: '',
        storageBucket: '',
        messagingSenderId: '',
        appId: ''
    },
    googleDrive: {
        googleClientId: '',
        googleAppId: ''
    }
};

function isObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value);
}

function cloneDefaultConfig() {
    return JSON.parse(JSON.stringify(DEFAULT_RUNTIME_CONFIG));
}

function readLocalJson(key) {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return isObject(parsed) ? parsed : null;
    } catch (error) {
        console.warn(`Failed to parse runtime config from localStorage key "${key}"`, error);
        return null;
    }
}

function mergeConfig(baseConfig, patchConfig) {
    if (!isObject(patchConfig)) return baseConfig;

    Object.entries(patchConfig).forEach(([section, value]) => {
        if (!isObject(value)) return;
        baseConfig[section] = {
            ...(baseConfig[section] || {}),
            ...value
        };
    });

    return baseConfig;
}

function loadRuntimeConfig() {
    const config = cloneDefaultConfig();
    const firebaseLocalConfig = readLocalJson('SLA_FIREBASE_CONFIG');
    const googleDriveLocalConfig = readLocalJson('SLA_GOOGLE_DRIVE_CONFIG');

    mergeConfig(config, window.__SLA_RUNTIME_CONFIG__);
    mergeConfig(config, readLocalJson('SLA_RUNTIME_CONFIG'));
    mergeConfig(config, firebaseLocalConfig ? { firebase: firebaseLocalConfig } : null);
    mergeConfig(config, googleDriveLocalConfig ? { googleDrive: googleDriveLocalConfig } : null);

    return config;
}

function hasRequiredValues(configSection, keys) {
    return keys.every((key) => String(configSection?.[key] || '').trim());
}

export function getRuntimeConfig() {
    return loadRuntimeConfig();
}

export function getFirebaseRuntimeConfig() {
    return loadRuntimeConfig().firebase;
}

export function getGoogleDriveRuntimeConfig() {
    return loadRuntimeConfig().googleDrive;
}

export function hasFirebaseRuntimeConfig() {
    return hasRequiredValues(getFirebaseRuntimeConfig(), [
        'apiKey',
        'authDomain',
        'projectId',
        'appId'
    ]);
}

export function hasGoogleDriveRuntimeConfig() {
    return hasRequiredValues(getGoogleDriveRuntimeConfig(), [
        'googleClientId'
    ]);
}
