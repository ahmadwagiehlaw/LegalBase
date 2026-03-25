import { db } from './config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { UI } from './ui.js';
import { CloudStorageModule } from './cloud-storage.js';
import { GoogleDriveModule } from './google-drive.js';
import { OneDriveModule } from './onedrive.js';

export const AdminModule = {
    lookups: { courts: [], subjects: [] },
    identity: { appTitle: '', appSubTitle: '', consultantName: '', consultantRole: '' },
    cloudStorage: { provider: 'google_drive', useCloudLinksOnly: true },

    init: async () => {
        AdminModule.renderBaseUI();
        await AdminModule.loadLookups();
        await AdminModule.loadIdentity();
        await AdminModule.loadCloudStorage();
        AdminModule.setupCloudStorageUI();
        AdminModule.applyStaticLabels();
        AdminModule.refreshCloudConnectionStatus();
        AdminModule.loadTabsSettings();
        AdminModule.bindEvents();
    },

    loadLookups: async () => {
        try {
            const docRef = doc(db, "settings", "lookups");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                AdminModule.lookups = docSnap.data();
            }
            AdminModule.renderTags('courts-list', AdminModule.lookups.courts || []);
            AdminModule.renderTags('subjects-list', AdminModule.lookups.subjects || []);
        } catch(e) { console.error('Error loading lookups', e); }
    },

    loadIdentity: async () => {
        try {
            const docRef = doc(db, "settings", "identity");
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                AdminModule.identity = docSnap.data();
                document.getElementById('id-app-title').value = AdminModule.identity.appTitle || '';
                document.getElementById('id-app-subtitle').value = AdminModule.identity.appSubTitle || '';
                document.getElementById('id-consultant-name').value = AdminModule.identity.consultantName || '';
                document.getElementById('id-consultant-role').value = AdminModule.identity.consultantRole || '';
            }
        } catch(e) { console.error('Error loading identity', e); }
    },

    loadCloudStorage: async () => {
        try {
            AdminModule.cloudStorage = await CloudStorageModule.load();
            const providerValue = (AdminModule.cloudStorage.provider === 'onedrive' || AdminModule.cloudStorage.provider === 'google_drive')
                ? AdminModule.cloudStorage.provider
                : 'google_drive';
            document.getElementById('cloud-provider').value = providerValue;
            document.getElementById('cloud-google-client-id').value = AdminModule.cloudStorage.googleClientId || '';
            document.getElementById('cloud-google-api-key').value = AdminModule.cloudStorage.googleApiKey || '';
            document.getElementById('cloud-google-app-id').value = AdminModule.cloudStorage.googleAppId || '';
            document.getElementById('cloud-google-folder-id').value = AdminModule.cloudStorage.googleFolderId || '';
            document.getElementById('cloud-onedrive-client-id').value = AdminModule.cloudStorage.oneDriveClientId || '';
            document.getElementById('cloud-onedrive-tenant-id').value = AdminModule.cloudStorage.oneDriveTenantId || '';
            document.getElementById('cloud-onedrive-folder-path').value = AdminModule.cloudStorage.oneDriveFolderPath || '';
            document.getElementById('cloud-links-only').checked = !!AdminModule.cloudStorage.useCloudLinksOnly;
        } catch(e) {
            console.error('Error loading cloud settings', e);
        }
    },

    setupCloudStorageUI: () => {
        const section = document.getElementById('save-cloud-settings-btn')?.closest('.section-card');
        if (!section || document.getElementById('cloud-connect-panel')) return;

        [
            'cloud-google-client-id',
            'cloud-google-api-key',
            'cloud-google-app-id',
            'cloud-onedrive-client-id',
            'cloud-onedrive-tenant-id',
            'cloud-provider'
        ].forEach((id) => {
            document.getElementById(id)?.closest('.form-group')?.classList.add('hidden');
        });

        const folderLabel = document.querySelector('label[for="cloud-google-folder-id"]') || document.getElementById('cloud-google-folder-id')?.closest('.form-group')?.querySelector('label');
        if (folderLabel) folderLabel.textContent = 'مجلد Google Drive الافتراضي';

        const oneDriveFolderLabel = document.querySelector('label[for="cloud-onedrive-folder-path"]') || document.getElementById('cloud-onedrive-folder-path')?.closest('.form-group')?.querySelector('label');
        if (oneDriveFolderLabel) oneDriveFolderLabel.textContent = 'مجلد OneDrive الافتراضي';

        const googleFolderGroup = document.getElementById('cloud-google-folder-id')?.closest('.form-group');
        if (googleFolderGroup) googleFolderGroup.classList.add('hidden');
        const oneDriveFolderGroup = document.getElementById('cloud-onedrive-folder-path')?.closest('.form-group');
        if (oneDriveFolderGroup) oneDriveFolderGroup.classList.add('hidden');
        document.getElementById('cloud-links-only')?.closest('label')?.classList.add('hidden');

        const providerSelect = document.getElementById('cloud-provider');
        if (providerSelect) {
            providerSelect.innerHTML = `
                <option value="google_drive">Google Drive</option>
                <option value="onedrive">OneDrive</option>
            `;
            providerSelect.value = providerSelect.value === 'onedrive' ? 'onedrive' : 'google_drive';
        }

        const infoBox = section.querySelector('.alert.alert-info');
        if (infoBox) {
            infoBox.innerHTML = 'يتم إعداد الربط التقني مرة واحدة داخل التطبيق. بعد ذلك يكفي أن يضغط المستخدم على زر الربط ويسجل الدخول بحسابه الرسمي من Google أو Microsoft.';
        }

        section.insertAdjacentHTML('beforeend', `
            <div id="cloud-connect-panel" style="margin-top:18px; border-top:1px solid var(--border-color); padding-top:18px;">
                <div class="alert alert-info" style="background:#f4f8ff; color:#234e70; padding:14px; border-radius:10px; margin-bottom:16px; font-size:0.92rem;">
                    إعداد المطوّر يتم مرة واحدة فقط في ملف <code>js/config.js</code> داخل <code>cloudOAuthConfig</code>. بعد ذلك يستخدم كل عميل أزرار الربط فقط.
                    <div style="margin-top:8px; font-weight:700; display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                        <span>Redirect URL: <span id="cloud-redirect-uri" style="direction:ltr; display:inline-block;">${window.location.origin + window.location.pathname}</span></span>
                        <button type="button" id="copy-cloud-redirect-btn" class="btn" style="background:#fff; border:1px solid #bcd0f7; color:#234e70; padding:6px 12px;">نسخ الرابط</button>
                    </div>
                </div>
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(260px, 1fr)); gap:16px;">
                    <div class="section-card" style="margin:0; padding:16px; border:1px solid var(--border-color); box-shadow:none;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                            <strong>Google Drive</strong>
                            <span id="google-drive-status" class="badge badge-warning">غير متصل</span>
                        </div>
                        <div id="google-drive-hint" style="font-size:0.9rem; color:var(--text-muted); margin-bottom:12px;">سيتم فتح تسجيل الدخول الرسمي من Google.</div>
                        <div id="google-drive-missing" style="font-size:0.85rem; color:var(--danger-color); margin-bottom:12px;"></div>
                        <div style="display:flex; gap:10px; flex-wrap:wrap;">
                            <button id="connect-google-drive-btn" class="btn btn-primary"><i class="fab fa-google-drive"></i> ربط Google Drive</button>
                            <button id="disconnect-google-drive-btn" class="btn" style="background:var(--bg-color); border:1px solid var(--border-color); color:var(--text-primary);">فصل</button>
                        </div>
                    </div>
                    <div class="section-card" style="margin:0; padding:16px; border:1px solid var(--border-color); box-shadow:none;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                            <strong>OneDrive</strong>
                            <span id="onedrive-status" class="badge badge-warning">غير متصل</span>
                        </div>
                        <div id="onedrive-hint" style="font-size:0.9rem; color:var(--text-muted); margin-bottom:12px;">سيتم فتح تسجيل الدخول الرسمي من Microsoft.</div>
                        <div id="onedrive-missing" style="font-size:0.85rem; color:var(--danger-color); margin-bottom:12px;"></div>
                        <div style="display:flex; gap:10px; flex-wrap:wrap;">
                            <button id="connect-onedrive-btn" class="btn btn-primary"><i class="fab fa-microsoft"></i> ربط OneDrive</button>
                            <button id="disconnect-onedrive-btn" class="btn" style="background:var(--bg-color); border:1px solid var(--border-color); color:var(--text-primary);">فصل</button>
                        </div>
                    </div>
                </div>
            </div>
        `);
    },

    applyStaticLabels: () => {
        const saveCloudBtn = document.getElementById('save-cloud-settings-btn');
        if (saveCloudBtn) saveCloudBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> حفظ تفضيلات التخزين';
    },

    refreshCloudConnectionStatus: () => {
        const googleConfigured = CloudStorageModule.hasPreconfiguredProvider('google_drive');
        const oneDriveConfigured = CloudStorageModule.hasPreconfiguredProvider('onedrive');
        const googleMissing = CloudStorageModule.getMissingConfig('google_drive');
        const oneDriveMissing = CloudStorageModule.getMissingConfig('onedrive');

        const googleStatus = document.getElementById('google-drive-status');
        const googleHint = document.getElementById('google-drive-hint');
        const connectGoogleBtn = document.getElementById('connect-google-drive-btn');
        const disconnectGoogleBtn = document.getElementById('disconnect-google-drive-btn');
        const googleMissingEl = document.getElementById('google-drive-missing');
        if (googleStatus) {
            googleStatus.className = `badge ${GoogleDriveModule.isConnected() ? 'badge-success' : googleConfigured ? 'badge-warning' : 'badge-danger'}`;
            googleStatus.textContent = GoogleDriveModule.isConnected() ? 'متصل' : googleConfigured ? 'جاهز للربط' : 'غير مهيأ';
        }
        if (googleHint) {
            googleHint.textContent = googleConfigured
                ? 'اضغط على ربط Google Drive ثم سجّل الدخول بالحساب المطلوب.'
                : 'يلزم ضبط بيانات Google مرة واحدة داخل ملف الإعدادات بالمشروع.';
        }
        if (connectGoogleBtn) connectGoogleBtn.disabled = !googleConfigured;
        if (disconnectGoogleBtn) disconnectGoogleBtn.disabled = !GoogleDriveModule.isConnected();
        if (googleMissingEl) {
            googleMissingEl.textContent = googleConfigured ? '' : `الناقص في الإعداد: ${googleMissing.join('، ')}`;
        }

        const oneDriveStatus = document.getElementById('onedrive-status');
        const oneDriveHint = document.getElementById('onedrive-hint');
        const connectOneDriveBtn = document.getElementById('connect-onedrive-btn');
        const disconnectOneDriveBtn = document.getElementById('disconnect-onedrive-btn');
        const oneDriveMissingEl = document.getElementById('onedrive-missing');
        if (oneDriveStatus) {
            oneDriveStatus.className = `badge ${OneDriveModule.isConnected() ? 'badge-success' : oneDriveConfigured ? 'badge-warning' : 'badge-danger'}`;
            oneDriveStatus.textContent = OneDriveModule.isConnected() ? 'متصل' : oneDriveConfigured ? 'جاهز للربط' : 'غير مهيأ';
        }
        if (oneDriveHint) {
            oneDriveHint.textContent = oneDriveConfigured
                ? 'اضغط على ربط OneDrive ثم سجّل الدخول بالحساب المطلوب.'
                : 'يلزم ضبط بيانات Microsoft مرة واحدة داخل ملف الإعدادات بالمشروع.';
        }
        if (connectOneDriveBtn) connectOneDriveBtn.disabled = !oneDriveConfigured;
        if (disconnectOneDriveBtn) disconnectOneDriveBtn.disabled = !OneDriveModule.isConnected();
        if (oneDriveMissingEl) {
            oneDriveMissingEl.textContent = oneDriveConfigured ? '' : `الناقص في الإعداد: ${oneDriveMissing.join('، ')}`;
        }
    },

    connectCloudProvider: async (provider) => {
        try {
            const settings = CloudStorageModule.getResolvedSettings({
                provider,
                useCloudLinksOnly: false
            });
            if (provider === 'google_drive') {
                await GoogleDriveModule.connect(settings);
            } else if (provider === 'onedrive') {
                await OneDriveModule.connect(settings);
            }

            document.getElementById('cloud-provider').value = provider;
            document.getElementById('cloud-links-only').checked = false;
            await AdminModule.saveCloudStorage();
            AdminModule.refreshCloudConnectionStatus();
            UI.showToast(`تم ربط ${CloudStorageModule.getProviderLabel(provider)} بنجاح`, 'success');
        } catch (error) {
            console.error(error);
            UI.showToast(`تعذر ربط ${CloudStorageModule.getProviderLabel(provider)}`, 'error');
        }
    },

    disconnectCloudProvider: async (provider) => {
        if (provider === 'google_drive') {
            GoogleDriveModule.disconnect();
        } else if (provider === 'onedrive') {
            OneDriveModule.disconnect();
        }
        AdminModule.refreshCloudConnectionStatus();
        UI.showToast(`تم فصل ${CloudStorageModule.getProviderLabel(provider)}`, 'success');
    },

    saveIdentity: async () => {
        const data = {
            appTitle: document.getElementById('id-app-title')?.value || '',
            appSubTitle: document.getElementById('id-app-subtitle')?.value || '',
            consultantName: document.getElementById('id-consultant-name')?.value || '',
            consultantRole: document.getElementById('id-consultant-role')?.value || ''
        };

        try {
            await setDoc(doc(db, "settings", "identity"), data);
            AdminModule.identity = data;
            
            // Apply changes immediately to the header
            if(data.appTitle) document.getElementById('app-main-title').textContent = data.appTitle;
            if(data.appSubTitle) document.getElementById('app-sub-title').textContent = data.appSubTitle;
            if(data.consultantName) document.getElementById('user-name').textContent = data.consultantName;
            if(data.consultantRole) document.getElementById('user-role').textContent = data.consultantRole;

            UI.showToast("تم حفظ بيانات الهوية بنجاح", "success");
        } catch(e) {
            console.error(e);
            UI.showToast("حدث خطأ أثناء الحفظ", "error");
        }
    },

    saveCloudStorage: async () => {
        const data = {
            provider: document.getElementById('cloud-provider')?.value || 'google_drive',
            googleClientId: document.getElementById('cloud-google-client-id')?.value.trim() || '',
            googleApiKey: document.getElementById('cloud-google-api-key')?.value.trim() || '',
            googleAppId: document.getElementById('cloud-google-app-id')?.value.trim() || '',
            googleFolderId: document.getElementById('cloud-google-folder-id')?.value.trim() || '',
            oneDriveClientId: document.getElementById('cloud-onedrive-client-id')?.value.trim() || '',
            oneDriveTenantId: document.getElementById('cloud-onedrive-tenant-id')?.value.trim() || '',
            oneDriveFolderPath: document.getElementById('cloud-onedrive-folder-path')?.value.trim() || '',
            useCloudLinksOnly: !!document.getElementById('cloud-links-only')?.checked
        };

        try {
            await CloudStorageModule.save(data);
            AdminModule.cloudStorage = data;
            UI.showToast('تم حفظ إعدادات التخزين السحابي', 'success');
        } catch(e) {
            console.error(e);
            UI.showToast('تعذر حفظ إعدادات التخزين السحابي', 'error');
        }
    },

    loadTabsSettings: () => {
        const customTabs = JSON.parse(localStorage.getItem('customTabs')) || {};
        const defaultScreen = localStorage.getItem('defaultStartScreen') || 'dashboard';
        const defaultTabs = [
            { route: 'dashboard', defaultName: 'لوحة التحكم' },
            { route: 'appeals', defaultName: 'الدعاوى والطعون' },
            { route: 'agenda', defaultName: 'أجندة الجلسات' },
            { route: 'sessions', defaultName: 'سجل الجلسات' },
            { route: 'tasks', defaultName: 'إدارة المهام' },
            { route: 'memos', defaultName: 'المذكرات القانونية' },
            { route: 'library', defaultName: 'المكتبة والبحوث' },
            { route: 'circulars', defaultName: 'القرارات والتعاميم' },
            { route: 'rolls', defaultName: 'رولات الجلسات (PDF)' },
            { route: 'attachments', defaultName: 'الأرشيف الرقمي' },
            { route: 'reports', defaultName: 'التقارير الذكية' },
            { route: 'settings', defaultName: 'الإعدادات العامة' }
        ];

        const container = document.getElementById('tabs-customization-container');
        if (!container) return;

        container.innerHTML = defaultTabs.map(tab => {
            const isHidden = customTabs[tab.route]?.hidden || false;
            const customName = customTabs[tab.route]?.name || tab.defaultName;
            const disableHide = tab.route === 'settings' ? 'disabled' : '';
            
            return `
                <div style="border:1px solid var(--border-color); padding:10px; border-radius:8px; background:var(--surface-bg);">
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
                        <input type="checkbox" id="hide-tab-${tab.route}" ${isHidden ? 'checked' : ''} ${disableHide}>
                        <label for="hide-tab-${tab.route}" style="font-size:0.9rem; color:var(--text-secondary); cursor:pointer;">إخفاء التبويب</label>
                    </div>
                    <input type="text" id="name-tab-${tab.route}" class="form-control" value="${customName}" placeholder="${tab.defaultName}" style="width:100%; padding:8px; border-radius:6px; border:1px solid var(--border-color); background:var(--input-bg); color:var(--text-primary);">
                </div>
            `;
        }).join('');

        const defaultScreenSelect = document.getElementById('default-start-screen');
        if (defaultScreenSelect) defaultScreenSelect.value = defaultScreen;
    },

    saveTabsSettings: () => {
        const defaultTabs = ['dashboard', 'appeals', 'agenda', 'sessions', 'tasks', 'memos', 'library', 'circulars', 'rolls', 'attachments', 'reports', 'settings'];
        const customTabs = {};
        
        defaultTabs.forEach(route => {
            const hideCheckbox = document.getElementById(`hide-tab-${route}`);
            const nameInput = document.getElementById(`name-tab-${route}`);
            if (hideCheckbox && nameInput) {
                customTabs[route] = {
                    hidden: hideCheckbox.checked,
                    name: nameInput.value.trim()
                };
            }
        });
        
        const defaultScreenVal = document.getElementById('default-start-screen')?.value || 'dashboard';
        
        localStorage.setItem('customTabs', JSON.stringify(customTabs));
        localStorage.setItem('defaultStartScreen', defaultScreenVal);
        UI.showToast("تم حفظ التخصيصات بنجاح", "success");
        if (window.App && window.App.applyCustomTabs) {
            window.App.applyCustomTabs();
        }
    },

    renderBaseUI: () => {
        const container = document.getElementById('content-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="dashboard-grid">

                <!-- Identity Settings -->
                <div class="grid-col-12 section-card" style="border-top: 4px solid var(--accent-color);">
                    <div class="section-header" style="margin-bottom:20px; padding-bottom:15px;">
                        <h3><i class="fas fa-id-card-alt" style="color:var(--accent-color);"></i> &nbsp;تخصيص هوية المنصة والترحيب</h3>
                    </div>
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:20px;">
                        <div class="form-group" style="margin:0;">
                            <label>عنوان التطبيق الرئيسي</label>
                            <input type="text" id="id-app-title" class="form-control" placeholder="مثال: نيابة شمال القاهرة" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-primary); width:100%;">
                        </div>
                        <div class="form-group" style="margin:0;">
                            <label>العنوان الفرعي</label>
                            <input type="text" id="id-app-subtitle" class="form-control" placeholder="مثال: المنصة القضائية المتكاملة" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-primary); width:100%;">
                        </div>
                        <div class="form-group" style="margin:0;">
                            <label>اسم المستشار / المستخدم</label>
                            <input type="text" id="id-consultant-name" class="form-control" placeholder="مثال: المستشار أحمد محمد" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-primary); width:100%;">
                        </div>
                        <div class="form-group" style="margin:0;">
                            <label>الوظيفة / اللقب</label>
                            <input type="text" id="id-consultant-role" class="form-control" placeholder="مثال: رئيس النيابة" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-primary); width:100%;">
                        </div>
                    </div>
                    <div style="display:flex; justify-content:flex-end; margin-top:20px;">
                        <button id="save-identity-btn" class="btn btn-primary">
                            <i class="fas fa-save"></i> حفظ وتطبيق الهوية
                        </button>
                    </div>
                </div>

                <!-- Theme Settings -->
                <div class="grid-col-4 section-card">
                    <div class="section-header">
                        <h3><i class="fas fa-paint-roller" style="color:var(--accent-color);"></i> &nbsp;إعدادات المظهر</h3>
                    </div>
                    <div class="form-group" style="margin-bottom:15px;">
                        <label>السمة البصرية (Theme)</label>
                        <select id="theme-select" class="form-control" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border-color);">
                            <option value="light" ${!document.body.classList.contains('dark-mode') ? 'selected' : ''}>الوضع النهاري (Light)</option>
                            <option value="dark" ${document.body.classList.contains('dark-mode') ? 'selected' : ''}>الوضع الليلي (Dark)</option>
                        </select>
                    </div>
                    <div class="alert alert-info" style="background:#e6fffa; color:#234e52; padding:15px; border-radius:8px; font-size:0.9rem;">
                        <i class="fas fa-info-circle"></i> <strong>إدارة المستخدمين:</strong> يتم إدارتها حالياً عبر لوحة تحكم Firebase.
                    </div>
                </div>

                <!-- Tabs Customization -->
                <div class="grid-col-8 section-card">
                    <div class="section-header" style="margin-bottom:20px; padding-bottom:15px;">
                        <h3><i class="fas fa-bars" style="color:var(--accent-color);"></i> &nbsp;تخصيص التبويبات (إخفاء وتغيير الأسماء)</h3>
                    </div>
                    <div id="tabs-customization-container" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:15px;">
                        <!-- Rendered dynamically -->
                    </div>
                    
                    <div style="margin-top:25px; border-top:1px solid var(--border-color); padding-top:20px;">
                        <label style="display:block; font-weight:700; font-size:0.9rem; margin-bottom:8px; color:var(--text-primary);">شاشة البدء الافتراضية</label>
                        <select id="default-start-screen" class="form-control" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--input-bg); color:var(--text-primary);">
                            <option value="dashboard">لوحة التحكم</option>
                            <option value="appeals">الدعاوى والطعون</option>
                            <option value="agenda">أجندة الجلسات</option>
                            <option value="reports">التقارير الذكية</option>
                            <option value="tasks">إدارة المهام</option>
                        </select>
                    </div>

                    <div style="display:flex; justify-content:flex-end; margin-top:20px;">
                        <button id="save-tabs-btn" class="btn btn-primary"><i class="fas fa-save"></i> حفظ التخصيصات</button>
                    </div>
                </div>

                <!-- Lookup Values -->
                <div class="grid-col-8 section-card">
                    <div class="section-header">
                        <h3><i class="fas fa-list-alt" style="color:var(--accent-color);"></i> &nbsp;القوائم المنسدلة (لتسهيل إدخال البيانات)</h3>
                    </div>
                    
                    <div style="margin-bottom: 25px;">
                        <label style="font-weight:bold; display:block; margin-bottom:10px;">قائمة المحاكم والدوائر</label>
                        <div style="display:flex; gap:10px; margin-bottom:10px;">
                            <input type="text" id="new-court" class="form-control" placeholder="أضف محكمة أو دائرة جديدة..." style="flex:1; padding:10px; border-radius:8px; border:1px solid var(--border-color);">
                            <button id="add-court-btn" class="btn btn-primary"><i class="fas fa-plus"></i> إضافة</button>
                        </div>
                        <div id="courts-list" style="display:flex; flex-wrap:wrap; gap:10px;"></div>
                    </div>

                    <div style="padding-top:20px; border-top:1px solid var(--border-color);">
                        <label style="font-weight:bold; display:block; margin-bottom:10px;">قائمة موضوعات الطعون</label>
                        <div style="display:flex; gap:10px; margin-bottom:10px;">
                            <input type="text" id="new-subject" class="form-control" placeholder="مثال: إلغاء قرار إداري، تعويض..." style="flex:1; padding:10px; border-radius:8px; border:1px solid var(--border-color);">
                            <button id="add-subject-btn" class="btn btn-primary"><i class="fas fa-plus"></i> إضافة</button>
                        </div>
                        <div id="subjects-list" style="display:flex; flex-wrap:wrap; gap:10px;"></div>
                    </div>
                <div class="grid-col-12 section-card" style="border-top:4px solid var(--nav-bg);">
                    <div class="section-header" style="margin-bottom:20px; padding-bottom:15px;">
                        <h3><i class="fas fa-cloud" style="color:var(--nav-bg);"></i> &nbsp;\u0627\u0644\u062a\u062e\u0632\u064a\u0646 \u0627\u0644\u0633\u062d\u0627\u0628\u064a \u0644\u0644\u0645\u0631\u0641\u0642\u0627\u062a</h3>
                    </div>
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:16px;">
                        <div class="form-group" style="margin:0;">
                            <label>\u0627\u0644\u0645\u0632\u0648\u062f \u0627\u0644\u0627\u0641\u062a\u0631\u0627\u0636\u064a</label>
                            <select id="cloud-provider" class="form-control" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-primary); width:100%;">
                                <option value="google_drive">Google Drive</option>
                                <option value="onedrive">OneDrive</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin:0;"><label>Google Client ID</label><input type="text" id="cloud-google-client-id" class="form-control" placeholder="OAuth Client ID" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-primary); width:100%;"></div>
                        <div class="form-group" style="margin:0;"><label>Google API Key</label><input type="text" id="cloud-google-api-key" class="form-control" placeholder="Browser API Key" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-primary); width:100%;"></div>
                        <div class="form-group" style="margin:0;"><label>Google App ID</label><input type="text" id="cloud-google-app-id" class="form-control" placeholder="Cloud Project App ID" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-primary); width:100%;"></div>
                        <div class="form-group" style="margin:0;"><label>Google Folder ID</label><input type="text" id="cloud-google-folder-id" class="form-control" placeholder="Shared folder id" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-primary); width:100%;"></div>
                        <div class="form-group" style="margin:0;"><label>OneDrive Client ID</label><input type="text" id="cloud-onedrive-client-id" class="form-control" placeholder="Azure App Client ID" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-primary); width:100%;"></div>
                        <div class="form-group" style="margin:0;"><label>Tenant ID</label><input type="text" id="cloud-onedrive-tenant-id" class="form-control" placeholder="organizations / tenant id" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-primary); width:100%;"></div>
                        <div class="form-group" style="margin:0;"><label>OneDrive Folder Path</label><input type="text" id="cloud-onedrive-folder-path" class="form-control" placeholder="/Appeals/2026" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-primary); width:100%;"></div>
                    </div>
                    <label style="display:flex; align-items:center; gap:10px; margin-top:18px; font-weight:700; color:var(--text-primary);">
                        <input type="checkbox" id="cloud-links-only">
                        \u0627\u0633\u062a\u062e\u062f\u0627\u0645 \u0627\u0644\u0631\u0648\u0627\u0628\u0637 \u0627\u0644\u0633\u062d\u0627\u0628\u064a\u0629 \u0641\u0642\u0637 \u062d\u062a\u0649 \u064a\u062a\u0645 \u0627\u0633\u062a\u0643\u0645\u0627\u0644 OAuth \u0648\u0627\u0644\u0631\u0641\u0639 \u0627\u0644\u0645\u0628\u0627\u0634\u0631
                    </label>
                    <div class="alert alert-info" style="background:#e8f3ff; color:#234e70; padding:14px; border-radius:10px; margin-top:16px; font-size:0.92rem;">
                        \u0627\u0644\u0631\u0628\u0637 \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \u0645\u0639 Google Drive \u0648 OneDrive \u064a\u062d\u062a\u0627\u062c \u0628\u064a\u0627\u0646\u0627\u062a OAuth \u0627\u0644\u062e\u0627\u0635\u0629 \u0628\u0643. \u0628\u0639\u062f \u0625\u0636\u0627\u0641\u062a\u0647\u0627 \u0647\u0646\u0627\u060c \u0633\u064a\u0633\u062a\u062e\u062f\u0645 \u0627\u0644\u062a\u0637\u0628\u064a\u0642 \u0646\u0641\u0633 \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0641\u064a \u0634\u0627\u0634\u0629 \u0627\u0644\u0645\u0631\u0641\u0642\u0627\u062a.
                    </div>
                    <div style="display:flex; justify-content:flex-end; margin-top:18px;">
                        <button id="save-cloud-settings-btn" class="btn btn-primary"><i class="fas fa-cloud-upload-alt"></i> \u062d\u0641\u0638 \u0625\u0639\u062f\u0627\u062f\u0627\u062a \u0627\u0644\u062a\u062e\u0632\u064a\u0646</button>
                    </div>
                </div>

            </div>
        `;
    },

    renderTags: (containerId, items) => {
        const container = document.getElementById(containerId);
        if(!container) return;
        container.innerHTML = items.map((item, index) => `
            <span style="background:var(--bg-color); border:1px solid var(--border-color); padding:5px 12px; border-radius:15px; display:inline-flex; align-items:center; gap:8px; font-size:0.9rem;">
                ${item}
                <i class="fas fa-times delete-lookup" data-list="${containerId}" data-index="${index}" style="color:var(--danger-color); cursor:pointer;"></i>
            </span>
        `).join('');

        container.querySelectorAll('.delete-lookup').forEach(icon => {
            icon.addEventListener('click', async (e) => {
                const listId = e.target.dataset.list;
                const idx = parseInt(e.target.dataset.index);
                const listKey = listId === 'courts-list' ? 'courts' : 'subjects';
                
                AdminModule.lookups[listKey].splice(idx, 1);
                await AdminModule.saveLookups();
                AdminModule.renderTags(listId, AdminModule.lookups[listKey]);
            });
        });
    },

    saveLookups: async () => {
        try {
            await setDoc(doc(db, "settings", "lookups"), AdminModule.lookups);
            UI.showToast("تم تحديث القوائم", "success");
        } catch(e) {
            console.error(e);
            UI.showToast("حدث خطأ أثناء الحفظ", "error");
        }
    },

    bindEvents: () => {
        document.getElementById('save-identity-btn')?.addEventListener('click', AdminModule.saveIdentity);
        document.getElementById('save-tabs-btn')?.addEventListener('click', AdminModule.saveTabsSettings);
        document.getElementById('save-cloud-settings-btn')?.addEventListener('click', async () => {
            await AdminModule.saveCloudStorage();
            AdminModule.refreshCloudConnectionStatus();
        });
        document.getElementById('cloud-provider')?.addEventListener('change', AdminModule.refreshCloudConnectionStatus);
        document.getElementById('copy-cloud-redirect-btn')?.addEventListener('click', async () => {
            const redirectUri = document.getElementById('cloud-redirect-uri')?.textContent?.trim() || '';
            if (!redirectUri) return;
            try {
                await navigator.clipboard.writeText(redirectUri);
                UI.showToast('تم نسخ رابط التحويل', 'success');
            } catch (error) {
                console.error(error);
                UI.showToast('تعذر نسخ الرابط', 'error');
            }
        });
        document.getElementById('connect-google-drive-btn')?.addEventListener('click', () => AdminModule.connectCloudProvider('google_drive'));
        document.getElementById('disconnect-google-drive-btn')?.addEventListener('click', () => AdminModule.disconnectCloudProvider('google_drive'));
        document.getElementById('connect-onedrive-btn')?.addEventListener('click', () => AdminModule.connectCloudProvider('onedrive'));
        document.getElementById('disconnect-onedrive-btn')?.addEventListener('click', () => AdminModule.disconnectCloudProvider('onedrive'));

        document.getElementById('theme-select')?.addEventListener('change', (e) => {
            const isDark = document.body.classList.contains('dark-mode');
            if(e.target.value === 'dark' && !isDark) document.getElementById('theme-toggle').click();
            if(e.target.value === 'light' && isDark) document.getElementById('theme-toggle').click();
        });

        const addListItem = async (inputId, listKey) => {
            const input = document.getElementById(inputId);
            const val = input.value.trim();
            if(!val) return;
            
            if(!AdminModule.lookups[listKey]) AdminModule.lookups[listKey] = [];
            if(!AdminModule.lookups[listKey].includes(val)) {
                AdminModule.lookups[listKey].push(val);
                await AdminModule.saveLookups();
                AdminModule.loadLookups();
                input.value = '';
            } else {
                UI.showToast("القيمة موجودة مسبقاً", "error");
            }
        };

        document.getElementById('add-court-btn')?.addEventListener('click', () => addListItem('new-court', 'courts'));
        document.getElementById('add-subject-btn')?.addEventListener('click', () => addListItem('new-subject', 'subjects'));
    }
};
