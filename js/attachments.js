import { db, storage } from './config.js';
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";
import { UI } from './ui.js';
import { Utils } from './utils.js';
import { AppealsModule } from './appeals.js';
import { CloudStorageModule } from './cloud-storage.js';
import { GoogleDriveModule } from './google-drive.js';
import { OneDriveModule } from './onedrive.js';

export const AttachmentsModule = {
    attachments: [],
    cloudSettings: { provider: 'google_drive', useCloudLinksOnly: true },
    
    init: async () => {
        AttachmentsModule.cloudSettings = await CloudStorageModule.load();
        AttachmentsModule.renderBaseUI();
        AttachmentsModule.ensureCloudFields();
        AttachmentsModule.applyStaticLabels();
        await AttachmentsModule.loadAttachments();
        if (AppealsModule.appeals.length === 0) {
            await AppealsModule.loadAppeals();
        }
        AttachmentsModule.bindEvents();
    },

    ensureCloudFields: () => {
        const fileGroup = document.getElementById('attach-file')?.closest('.form-group');
        if (!fileGroup || document.getElementById('attach-provider')) return;

        fileGroup.insertAdjacentHTML('beforebegin', `
            <div class="form-group">
                <label>مزود التخزين</label>
                <select id="attach-provider" style="width:100%; padding:12px; border-radius:8px; background:var(--bg-color); color:var(--text-color); border:1px solid var(--border-color);">
                    <option value="google_drive">Google Drive</option>
                    <option value="onedrive">OneDrive</option>
                </select>
                <small id="attach-provider-status" style="display:block; margin-top:8px; color:var(--text-muted);"></small>
            </div>
        `);
        fileGroup.id = 'attach-file-group';
        fileGroup.insertAdjacentHTML('afterend', `
            <div class="form-group hidden" id="attach-cloud-link-group">
                <label>رابط الملف السحابي</label>
                <input type="url" id="attach-cloud-link" placeholder="https://drive.google.com/... أو https://onedrive.live.com/...">
                <small style="display:block; margin-top:8px; color:var(--text-muted);">
                    يمكنك حفظ رابط Google Drive أو OneDrive الآن. الرفع المباشر سيتفعّل بعد استكمال OAuth في الإعدادات.
                </small>
            </div>
        `);

        const providerGroup = document.getElementById('attach-provider')?.closest('.form-group');
        const providerLabel = providerGroup?.querySelector('label');
        if (providerLabel) providerLabel.textContent = '\u0645\u0632\u0648\u062f \u0627\u0644\u062a\u062e\u0632\u064a\u0646';
        const providerStatus = document.getElementById('attach-provider-status');
        if (providerStatus) providerStatus.textContent = '\u0633\u064a\u062a\u0645 \u0627\u0644\u062a\u062d\u0642\u0642 \u0645\u0646 \u062d\u0627\u0644\u0629 \u0627\u0644\u0631\u0628\u0637 \u0628\u0639\u062f \u0627\u062e\u062a\u064a\u0627\u0631 \u0627\u0644\u0645\u0632\u0648\u062f.';
        const cloudGroup = document.getElementById('attach-cloud-link-group');
        const cloudLabel = cloudGroup?.querySelector('label');
        if (cloudLabel) cloudLabel.textContent = '\u0631\u0627\u0628\u0637 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0633\u062d\u0627\u0628\u064a';
        const cloudHelp = cloudGroup?.querySelector('small');
        if (cloudHelp) cloudHelp.textContent = '\u064a\u0645\u0643\u0646\u0643 \u062d\u0641\u0638 \u0631\u0627\u0628\u0637 Google Drive \u0623\u0648 OneDrive \u0627\u0644\u0622\u0646. \u0627\u0644\u0631\u0641\u0639 \u0627\u0644\u0645\u0628\u0627\u0634\u0631 \u0633\u064a\u062a\u0641\u0639\u0651\u0644 \u0628\u0639\u062f \u0627\u0633\u062a\u0643\u0645\u0627\u0644 OAuth \u0641\u064a \u0627\u0644\u0625\u0639\u062f\u0627\u062f\u0627\u062a.';
    },

    applyStaticLabels: () => {
        const addBtn = document.getElementById('add-attachment-btn');
        if (addBtn) addBtn.innerHTML = '<i class="fas fa-upload"></i> رفع مرفق جديد';

        const searchInput = document.getElementById('search-attachment');
        if (searchInput) searchInput.placeholder = 'ابحث في المرفقات...';

        const headers = document.querySelectorAll('.premium-table thead th');
        if (headers.length >= 5) {
            headers[0].textContent = 'رقم الطعن';
            headers[1].textContent = 'اسم الملف';
            headers[2].textContent = 'الوصف';
            headers[3].textContent = 'تاريخ الرفع';
            headers[4].textContent = 'الإجراءات';
        }

        const modalTitle = document.querySelector('#attachment-modal h3');
        if (modalTitle) modalTitle.textContent = 'رفع مرفق جديد';

        const infoBox = document.querySelector('#attachment-modal .alert.alert-info');
        if (infoBox) infoBox.innerHTML = '<i class="fas fa-info-circle"></i> يتم رفع ملفات PDF والصور بحجم أقصى 5 ميجابايت لتقليل استهلاك المساحة.';

        const labels = document.querySelectorAll('#attachment-form label');
        if (labels[0]) labels[0].textContent = 'رقم الطعن المرتبط';
        if (labels[1]) labels[1].textContent = 'وصف الملف';
        if (labels[2]) labels[2].textContent = 'الملف';

        const appealSelect = document.getElementById('attach-appeal-id');
        if (appealSelect?.options?.[0]) appealSelect.options[0].textContent = 'اختر الطعن...';

        const descInput = document.getElementById('attach-desc');
        if (descInput) descInput.placeholder = 'مثال: مذكرة دفاع، توكيل، صورة حكم';

        const progressLabel = document.querySelector('#upload-progress-container span');
        if (progressLabel) progressLabel.textContent = 'جاري الرفع...';

        const closeBtn = document.getElementById('close-attach-modal-btn');
        if (closeBtn) closeBtn.textContent = 'إلغاء';

        const submitBtn = document.getElementById('attach-submit-btn');
        if (submitBtn) submitBtn.innerHTML = 'رفع <i class="fas fa-upload"></i>';
    },

    renderBaseUI: () => {
        const container = document.getElementById('content-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="actions-bar" style="display:flex; justify-content:space-between; margin-bottom: 20px;">
                <button id="add-attachment-btn" class="btn btn-primary"><i class="fas fa-upload"></i> رفع مرفق جديد</button>
                <div class="search-box">
                    <input type="text" id="search-attachment" placeholder="ابحث في المرفقات..." class="form-control" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-color);">
                </div>
            </div>
            
            <div class="section-card" style="overflow-x: auto;">
                <table class="premium-table" style="width:100%;">
                    <thead>
                        <tr>
                            <th>رقم الطعن المرتبط</th>
                            <th>اسم الملف</th>
                            <th>الوصف</th>
                            <th>تاريخ الرفع</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody id="attachments-table-body">
                        <tr><td colspan="5" style="text-align:center; padding:20px;">جاري تحميل البيانات... <i class="fas fa-spinner fa-spin"></i></td></tr>
                    </tbody>
                </table>
            </div>

            <div id="attachment-modal" class="modal-backdrop hidden" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000; display:flex; justify-content:center; align-items:center;">
                <div class="section-card modal-content" style="width: 90%; max-width: 500px; padding: 25px; border-radius: 12px; max-height: 90vh; overflow-y:auto;">
                    <h3 style="margin-bottom: 20px; color: var(--primary-color);">رفع مرفق جديد</h3>
                    
                    <div class="alert alert-info" style="background:#e3f2fd; color:#0c5460; padding:10px; border-radius:8px; margin-bottom:15px; font-size:14px;">
                        <i class="fas fa-info-circle"></i> يتم رفع ملفات PDF وصور بحجم أقصى 5 ميجابايت تقليلاً للمساحة.
                    </div>

                    <form id="attachment-form">
                        <div style="display:grid; grid-template-columns: 1fr; gap: 15px;">
                            <div class="form-group">
                                <label>رقم الطعن المرتبط</label>
                                <select id="attach-appeal-id" required style="width:100%; padding:12px; border-radius:8px; background:var(--bg-color); color:var(--text-color); border:1px solid var(--border-color);">
                                    <option value="">اختر الطعن...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>وصف الملف</label>
                                <input type="text" id="attach-desc" required placeholder="مثال: مذكرة دفاع، توكيل...">
                            </div>
                            <div class="form-group">
                                <label>الملف</label>
                                <input type="file" id="attach-file" accept=".pdf,image/jpeg,image/png" required style="border: 2px dashed var(--border-color); padding: 20px; cursor: pointer;">
                            </div>
                        </div>

                        <div id="upload-progress-container" class="hidden" style="margin-top:15px;">
                            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:5px;">
                                <span>جاري الرفع...</span>
                                <span id="upload-percent">0%</span>
                            </div>
                            <div style="width:100%; background:#e0e0e0; border-radius:10px; height:8px;">
                                <div id="upload-progress-bar" style="width:0%; background:var(--primary-color); height:100%; border-radius:10px; transition:width 0.2s;"></div>
                            </div>
                        </div>

                        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top: 20px;">
                            <button type="button" id="close-attach-modal-btn" class="btn" style="background:var(--text-muted); color:white;">إلغاء</button>
                            <button type="submit" id="attach-submit-btn" class="btn btn-primary">رفع <i class="fas fa-upload"></i></button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    },

    loadAttachments: async () => {
        try {
            const attRef = collection(db, "attachments");
            const q = query(attRef, orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            
            AttachmentsModule.attachments = [];
            snapshot.forEach(doc => {
                AttachmentsModule.attachments.push({ id: doc.id, ...doc.data() });
            });
            AttachmentsModule.renderTable(AttachmentsModule.attachments);
        } catch (error) {
            console.error("Error loading attachments", error);
            UI.showToast("خطأ في تحميل المرفقات", "error");
            const tbody = document.getElementById('attachments-table-body');
            if(tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">لا توجد بيانات</td></tr>`;
        }
    },

    getProviderMeta: (attachment) => {
        const provider = attachment.cloudProvider || CloudStorageModule.detectProviderFromUrl(attachment.downloadURL || '');
        if (provider === 'google_drive') {
            return {
                label: 'Google Drive',
                iconClass: 'fab fa-google-drive',
                iconColor: '#174ea6',
                actionTitle: 'فتح من Google Drive'
            };
        }
        if (provider === 'onedrive') {
            return {
                label: 'OneDrive',
                iconClass: 'fab fa-microsoft',
                iconColor: '#0f6cbd',
                actionTitle: 'فتح من OneDrive'
            };
        }
        return {
            label: 'Firebase Storage',
            iconClass: attachment.fileType?.includes('pdf') ? 'fas fa-file-pdf' : 'fas fa-file-image',
            iconColor: 'var(--danger-color)',
            actionTitle: 'فتح الملف'
        };
    },

    renderTable: (data) => {
        const tbody = document.getElementById('attachments-table-body');
        if (!tbody) return;

        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">لا يوجد مرفقات مسجلة</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map((attachment) => {
            const providerMeta = AttachmentsModule.getProviderMeta(attachment);
            return `
                <tr>
                    <td style="font-weight:bold;"><a href="#" class="case-link" onclick="if(window.AppealsModule) window.AppealsModule.viewAppeal('${attachment.appealId}'); return false;" style="color:var(--accent-color); text-decoration:none;">${attachment.appealNumber || ''}</a></td>
                    <td>
                        <i class="${providerMeta.iconClass}" style="color:${providerMeta.iconColor}; font-size:1.1rem; margin-left:5px;"></i>
                        ${attachment.fileName || '---'}
                    </td>
                    <td style="max-width:280px; white-space:normal;">${attachment.description || '---'}</td>
                    <td style="direction:ltr; text-align:right;">${Utils.formatDate(attachment.createdAt)}</td>
                    <td style="display:flex; gap:10px;">
                        <a href="${attachment.downloadURL}" target="_blank" rel="noopener noreferrer" class="icon-btn" title="${providerMeta.actionTitle}">
                            <i class="fas fa-arrow-up-right-from-square" style="color:var(--accent-color);"></i>
                        </a>
                        <button class="icon-btn delete-attachment" data-id="${attachment.id}" data-path="${attachment.storagePath || ''}" data-provider="${attachment.cloudProvider || ''}" title="حذف" style="color:var(--danger-color); cursor:pointer;"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `;
        }).join('');

        document.querySelectorAll('.delete-attachment').forEach((btn) => {
            btn.addEventListener('click', async (e) => {
                if (confirm('هل أنت متأكد من حذف هذا المرفق؟ لا يمكن التراجع عن هذا الإجراء.')) {
                    const id = e.currentTarget.dataset.id;
                    const path = e.currentTarget.dataset.path;
                    const provider = e.currentTarget.dataset.provider || 'firebase';
                    await AttachmentsModule.deleteAttachment(id, path, provider);
                }
            });
        });
    },

    populateAppealSelect: () => {
        const select = document.getElementById('attach-appeal-id');
        if(!select) return;
        select.innerHTML = '<option value="">اختر الطعن...</option>' + 
            AppealsModule.appeals.map(a => `<option value="${a.id}">${a.appealNumber} - ${a.plaintiff}</option>`).join('');
    },


    syncUploadModeUI: () => {
        const provider = document.getElementById('attach-provider')?.value || AttachmentsModule.cloudSettings.provider || 'firebase';
        const fileGroup = document.getElementById('attach-file-group');
        const cloudLinkGroup = document.getElementById('attach-cloud-link-group');
        const fileInput = document.getElementById('attach-file');
        const cloudLinkInput = document.getElementById('attach-cloud-link');
        const providerStatus = document.getElementById('attach-provider-status');
        const canDirectGoogleUpload = provider === 'google_drive'
            && !AttachmentsModule.cloudSettings.useCloudLinksOnly
            && CloudStorageModule.isDirectUploadConfigured('google_drive');
        const canDirectOneDriveUpload = provider === 'onedrive'
            && !AttachmentsModule.cloudSettings.useCloudLinksOnly
            && CloudStorageModule.isDirectUploadConfigured('onedrive');
        const useCloudLink = !!AttachmentsModule.cloudSettings.useCloudLinksOnly
            || (provider === 'google_drive' && !canDirectGoogleUpload)
            || (provider === 'onedrive' && !canDirectOneDriveUpload);

        fileGroup?.classList.toggle('hidden', useCloudLink);
        cloudLinkGroup?.classList.toggle('hidden', !useCloudLink);
        if (fileInput) fileInput.required = !useCloudLink;
        if (cloudLinkInput) cloudLinkInput.required = useCloudLink;

        if (!providerStatus) return;

        if (provider === 'firebase') {
            providerStatus.textContent = 'سيتم الرفع مباشرة إلى Firebase Storage.';
            providerStatus.style.color = 'var(--text-muted)';
            return;
        }

        if (provider === 'google_drive') {
            if (canDirectGoogleUpload) {
                providerStatus.textContent = 'Google Drive جاهز للرفع المباشر. قد يُطلب تسجيل الدخول الرسمي عند الرفع.';
                providerStatus.style.color = 'var(--success-color)';
            } else if (CloudStorageModule.hasPreconfiguredProvider('google_drive')) {
                providerStatus.textContent = 'سيتم استخدام رابط Google Drive فقط حتى يتم الربط من صفحة الإدارة.';
                providerStatus.style.color = 'var(--warning-color)';
            } else {
                providerStatus.textContent = `Google Drive غير مهيأ بعد. الناقص: ${CloudStorageModule.getMissingConfig('google_drive').join('، ')}`;
                providerStatus.style.color = 'var(--warning-color)';
            }
            return;
        }

        if (provider === 'onedrive') {
            if (canDirectOneDriveUpload) {
                providerStatus.textContent = 'OneDrive جاهز للرفع المباشر. قد يُطلب تسجيل الدخول الرسمي عند الرفع.';
                providerStatus.style.color = 'var(--success-color)';
            } else if (CloudStorageModule.hasPreconfiguredProvider('onedrive')) {
                providerStatus.textContent = 'سيتم استخدام رابط OneDrive فقط حتى يتم الربط من صفحة الإدارة.';
                providerStatus.style.color = 'var(--warning-color)';
            } else {
                providerStatus.textContent = `OneDrive غير مهيأ بعد. الناقص: ${CloudStorageModule.getMissingConfig('onedrive').join('، ')}`;
                providerStatus.style.color = 'var(--warning-color)';
            }
        }
    },

    saveCloudLinkAttachment: async ({ appealId, selectedAppeal, desc, provider, link }) => {
        await addDoc(collection(db, "attachments"), {
            appealId,
            appealNumber: selectedAppeal ? selectedAppeal.appealNumber : '',
            fileName: desc || link,
            fileType: 'cloud-link',
            fileSize: 0,
            storagePath: '',
            downloadURL: link,
            description: desc,
            cloudProvider: provider,
            createdAt: serverTimestamp()
        });
    },
    bindEvents: () => {
        const modal = document.getElementById('attachment-modal');
        const form = document.getElementById('attachment-form');
        const addBtn = document.getElementById('add-attachment-btn');
        const closeBtn = document.getElementById('close-attach-modal-btn');
        const searchInput = document.getElementById('search-attachment');
        const providerSelect = document.getElementById('attach-provider');

        if(addBtn) addBtn.addEventListener('click', () => {
            AttachmentsModule.populateAppealSelect();
            form.reset();
            if (providerSelect) providerSelect.value = AttachmentsModule.cloudSettings.provider || 'google_drive';
            document.getElementById('upload-progress-container').classList.add('hidden');
            AttachmentsModule.syncUploadModeUI();
            modal.classList.remove('hidden');
        });
        
        if(closeBtn) closeBtn.addEventListener('click', () => modal.classList.add('hidden'));
        providerSelect?.addEventListener('change', AttachmentsModule.syncUploadModeUI);
        AttachmentsModule.syncUploadModeUI();

        if(form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const fileInput = document.getElementById('attach-file');
                const file = fileInput.files[0];
                const provider = document.getElementById('attach-provider')?.value || 'google_drive';
                const cloudLink = document.getElementById('attach-cloud-link')?.value.trim() || '';
                const canDirectGoogleUpload = provider === 'google_drive'
                    && !AttachmentsModule.cloudSettings.useCloudLinksOnly
                    && CloudStorageModule.isDirectUploadConfigured('google_drive');
                const canDirectOneDriveUpload = provider === 'onedrive'
                    && !AttachmentsModule.cloudSettings.useCloudLinksOnly
                    && CloudStorageModule.isDirectUploadConfigured('onedrive');
                const useCloudLink = !!AttachmentsModule.cloudSettings.useCloudLinksOnly
                    || (provider === 'google_drive' && !canDirectGoogleUpload)
                    || (provider === 'onedrive' && !canDirectOneDriveUpload);

                const btn = document.getElementById('attach-submit-btn');
                const appealSelect = document.getElementById('attach-appeal-id');
                const appealId = appealSelect.value;
                const desc = document.getElementById('attach-desc').value;
                const selectedAppeal = AppealsModule.appeals.find(a => a.id === appealId);

                if (useCloudLink && !cloudLink) return UI.showToast('\u064a\u0631\u062c\u0649 \u0625\u062f\u062e\u0627\u0644 \u0631\u0627\u0628\u0637 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0633\u062d\u0627\u0628\u064a', 'error');
                if (!useCloudLink && !file) return UI.showToast('\u064a\u0631\u062c\u0649 \u0627\u062e\u062a\u064a\u0627\u0631 \u0645\u0644\u0641', 'error');

                if (!useCloudLink) {
                    const validation = Utils.validateFile(file);
                    if (!validation.isValid) return UI.showToast(validation.errors[0], 'error');
                }

                btn.disabled = true;
                const progressContainer = document.getElementById('upload-progress-container');
                const progressBar = document.getElementById('upload-progress-bar');
                const progressText = document.getElementById('upload-percent');

                if (useCloudLink) {
                    try {
                        await AttachmentsModule.saveCloudLinkAttachment({ appealId, selectedAppeal, desc, provider, link: cloudLink });
                        UI.showToast('\u062a\u0645 \u062d\u0641\u0638 \u0631\u0627\u0628\u0637 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0633\u062d\u0627\u0628\u064a', 'success');
                        modal.classList.add('hidden');
                        await AttachmentsModule.loadAttachments();
                    } catch(err) {
                        console.error(err);
                        UI.showToast('\u062a\u0639\u0630\u0631 \u062d\u0641\u0638 \u0631\u0627\u0628\u0637 \u0627\u0644\u0645\u0644\u0641 \u0627\u0644\u0633\u062d\u0627\u0628\u064a', 'error');
                    } finally {
                        btn.disabled = false;
                    }
                    return;
                }

                if (provider === 'google_drive') {
                    try {
                        progressContainer.classList.remove('hidden');
                        progressBar.style.width = '35%';
                        progressText.textContent = '35%';

                        const uploaded = await GoogleDriveModule.uploadFile(file, AttachmentsModule.cloudSettings, {
                            fileName: file.name
                        });

                        progressBar.style.width = '100%';
                        progressText.textContent = '100%';

                        await addDoc(collection(db, "attachments"), {
                            appealId,
                            appealNumber: selectedAppeal ? selectedAppeal.appealNumber : '',
                            fileName: uploaded.fileName,
                            fileType: file.type || 'application/octet-stream',
                            fileSize: file.size,
                            storagePath: uploaded.fileId,
                            downloadURL: uploaded.webViewLink || uploaded.webContentLink,
                            description: desc,
                            cloudProvider: 'google_drive',
                            createdAt: serverTimestamp()
                        });

                        UI.showToast('تم رفع الملف إلى Google Drive بنجاح', 'success');
                        modal.classList.add('hidden');
                        await AttachmentsModule.loadAttachments();
                    } catch (err) {
                        console.error(err);
                        UI.showToast('تعذر الرفع إلى Google Drive', 'error');
                    } finally {
                        btn.disabled = false;
                        progressContainer.classList.add('hidden');
                    }
                    return;
                }

                if (provider === 'onedrive') {
                    try {
                        progressContainer.classList.remove('hidden');
                        progressBar.style.width = '35%';
                        progressText.textContent = '35%';

                        const uploaded = await OneDriveModule.uploadFile(file, AttachmentsModule.cloudSettings, {
                            fileName: file.name
                        });

                        progressBar.style.width = '100%';
                        progressText.textContent = '100%';

                        await addDoc(collection(db, "attachments"), {
                            appealId,
                            appealNumber: selectedAppeal ? selectedAppeal.appealNumber : '',
                            fileName: uploaded.fileName,
                            fileType: file.type || 'application/octet-stream',
                            fileSize: file.size,
                            storagePath: uploaded.fileId,
                            downloadURL: uploaded.webUrl || uploaded.downloadUrl,
                            description: desc,
                            cloudProvider: 'onedrive',
                            createdAt: serverTimestamp()
                        });

                        UI.showToast('تم رفع الملف إلى OneDrive بنجاح', 'success');
                        modal.classList.add('hidden');
                        await AttachmentsModule.loadAttachments();
                    } catch (err) {
                        console.error(err);
                        UI.showToast('تعذر الرفع إلى OneDrive', 'error');
                    } finally {
                        btn.disabled = false;
                        progressContainer.classList.add('hidden');
                    }
                    return;
                }

                progressContainer.classList.remove('hidden');
                const uniqueName = Utils.generateId() + '_' + file.name;
                const storagePath = 'appeals/' + appealId + '/' + uniqueName;
                const fileRef = ref(storage, storagePath);
                const uploadTask = uploadBytesResumable(fileRef, file);

                uploadTask.on('state_changed', 
                    (snapshot) => {
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        progressBar.style.width = progress + '%';
                        progressText.textContent = Math.round(progress) + '%';
                    }, 
                    (error) => {
                        console.error('Upload error', error);
                        UI.showToast('\u0641\u0634\u0644 \u0631\u0641\u0639 \u0627\u0644\u0645\u0644\u0641', 'error');
                        btn.disabled = false;
                        progressContainer.classList.add('hidden');
                    }, 
                    async () => {
                        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                        const docData = {
                            appealId: appealId,
                            appealNumber: selectedAppeal ? selectedAppeal.appealNumber : '',
                            fileName: file.name,
                            fileType: file.type,
                            fileSize: file.size,
                            storagePath: storagePath,
                            downloadURL: downloadURL,
                            description: desc,
                            cloudProvider: 'firebase',
                            createdAt: serverTimestamp()
                        };

                        try {
                            await addDoc(collection(db, 'attachments'), docData);
                            UI.showToast('\u062a\u0645 \u0631\u0641\u0639 \u0627\u0644\u0645\u0644\u0641 \u0628\u0646\u062c\u0627\u062d', 'success');
                            modal.classList.add('hidden');
                            await AttachmentsModule.loadAttachments();
                        } catch(err) {
                            console.error(err);
                            UI.showToast('\u0646\u062c\u062d \u0627\u0644\u0631\u0641\u0639 \u0648\u0644\u0643\u0646 \u0641\u0634\u0644 \u062d\u0641\u0638 \u0627\u0644\u0628\u064a\u0627\u0646\u0627\u062a', 'error');
                        } finally {
                            btn.disabled = false;
                        }
                    }
                );
            });
        }
        
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                const filtered = AttachmentsModule.attachments.filter(a => 
                    (a.appealNumber && a.appealNumber.toLowerCase().includes(term)) ||
                    (a.fileName && a.fileName.toLowerCase().includes(term)) ||
                    (a.description && a.description.toLowerCase().includes(term))
                );
                AttachmentsModule.renderTable(filtered);
            });
        }
    },

    deleteAttachment: async (id, path, provider = 'firebase') => {
        try {
            if (provider === 'firebase' && (path || '').trim()) {
                const fileRef = ref(storage, path);
                await deleteObject(fileRef);
            }
            await deleteDoc(doc(db, "attachments", id));
            UI.showToast("\u062a\u0645 \u062d\u0630\u0641 \u0627\u0644\u0645\u0631\u0641\u0642", "success");
            await AttachmentsModule.loadAttachments();
        } catch (error) {
            console.error("Error deleting", error);
            try {
                await deleteDoc(doc(db, "attachments", id));
                UI.showToast("\u062a\u0645 \u062d\u0630\u0641 \u0645\u0631\u062c\u0639 \u0627\u0644\u0645\u0631\u0641\u0642 \u0645\u0646 \u0627\u0644\u0646\u0638\u0627\u0645", "success");
                await AttachmentsModule.loadAttachments();
            } catch (dbError) {
                console.error("Error deleting attachment document", dbError);
                UI.showToast("\u062a\u0639\u0630\u0631 \u062d\u0630\u0641 \u0627\u0644\u0645\u0631\u0641\u0642", "error");
            }
        }
    }
};
