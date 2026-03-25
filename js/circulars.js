import { db } from './config.js';
import { collection, getDocs, addDoc, deleteDoc, doc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { UI } from './ui.js';
import { CloudStorageModule } from './cloud-storage.js';
import { GoogleDriveModule } from './google-drive.js';
import { OneDriveModule } from './onedrive.js';
import { storage } from './config.js';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

export const CircularsModule = {
    circulars: [],

    init: async () => {
        CircularsModule.renderBaseUI();
        CircularsModule.syncUploadModeUI();
        await CircularsModule.loadCirculars();
        CircularsModule.bindEvents();
    },

    renderBaseUI: () => {
        const container = document.getElementById('content-container');
        if (!container) return;

        container.innerHTML = `
            <div class="actions-bar" style="display:flex; justify-content:space-between; margin-bottom: 20px;">
                <button id="add-circular-btn" class="btn btn-primary" style="background:var(--secondary-color);"><i class="fas fa-file-upload"></i> رفع قرار/منشور جديد</button>
            </div>

            <div class="section-card">
                <div class="section-header">
                    <h3>أرشيف القرارات والمنشورات الخاصة بالعمل</h3>
                </div>
                <div id="circulars-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap:20px;">
                    <i class="fas fa-spinner fa-spin"></i> جاري التحميل...
                </div>
            </div>

            <div id="circular-modal" class="modal-backdrop hidden" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000; display:flex; justify-content:center; align-items:center;">
                <div class="section-card modal-content" style="width: 90%; max-width: 500px; padding: 25px;">
                    <h3 style="margin-bottom:20px; color:var(--primary-color);">رفع منشور جديد</h3>
                    <form id="circular-form">
                        <div class="form-group">
                            <label>عنوان المنشور / القرار</label>
                            <input type="text" id="circ-title" required>
                        </div>
                        <div class="form-group">
                            <label>التصنيف</label>
                            <select id="circ-category" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border-color);">
                                <option value="قرار إداري">قرار إداري</option>
                                <option value="منشور فني">منشور فني</option>
                                <option value="تعليمات نيابة">تعليمات نيابة</option>
                                <option value="أخرى">أخرى</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>مزوّد الرفع</label>
                            <select id="circ-provider" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-primary);">
                                <option value="google_drive">Google Drive</option>
                                <option value="onedrive">OneDrive</option>
                            </select>
                        </div>
                        <div class="form-group" id="circ-file-group">
                            <label>الملف (PDF)</label>
                            <input type="file" id="circ-file" accept=".pdf,application/pdf" required>
                        </div>
                        <div class="form-group hidden" id="circ-cloud-link-group">
                            <label>رابط الملف السحابي</label>
                            <input type="url" id="circ-cloud-link" placeholder="https://drive.google.com/... أو https://onedrive.live.com/...">
                        </div>
                        <div id="upload-status" class="hidden" style="margin-top:10px; color:var(--accent-color); font-size:0.8rem;">جاري الرفع...</div>
                        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top: 20px;">
                            <button type="button" id="close-circ-modal-btn" class="btn" style="background:var(--text-muted); color:white;">إلغاء</button>
                            <button type="submit" class="btn btn-primary">رفع الملف <i class="fas fa-upload"></i></button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    },

    syncUploadModeUI: () => {
        const provider = document.getElementById('circ-provider')?.value || 'google_drive';
        const fileGroup = document.getElementById('circ-file-group');
        const cloudLinkGroup = document.getElementById('circ-cloud-link-group');
        const fileInput = document.getElementById('circ-file');
        const cloudLinkInput = document.getElementById('circ-cloud-link');
        const canDirectGoogleUpload = provider === 'google_drive' && CloudStorageModule.isDirectUploadConfigured('google_drive');
        const canDirectOneDriveUpload = provider === 'onedrive' && CloudStorageModule.isDirectUploadConfigured('onedrive');
        const useCloudLink = (provider === 'google_drive' && !canDirectGoogleUpload) || (provider === 'onedrive' && !canDirectOneDriveUpload);

        fileGroup?.classList.toggle('hidden', useCloudLink);
        cloudLinkGroup?.classList.toggle('hidden', !useCloudLink);
        if (fileInput) fileInput.required = !useCloudLink;
        if (cloudLinkInput) cloudLinkInput.required = useCloudLink;
    },

    loadCirculars: async () => {
        try {
            const q = query(collection(db, "circulars"), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            CircularsModule.circulars = [];
            snapshot.forEach(doc => CircularsModule.circulars.push({ id: doc.id, ...doc.data() }));
            CircularsModule.renderGrid();
        } catch (e) { console.error(e); }
    },

    renderGrid: () => {
        const grid = document.getElementById('circulars-grid');
        if (!grid) return;

        if (CircularsModule.circulars.length === 0) {
            grid.innerHTML = '<p>لا توجد منشورات مسجلة</p>';
            return;
        }

        grid.innerHTML = CircularsModule.circulars.map(c => `
            <div class="premium-stat" style="flex-direction:column; align-items:center; text-align:center; padding:20px; gap:10px;">
                <i class="fas fa-file-pdf" style="font-size:3rem; color:var(--danger-color);"></i>
                <strong style="color:var(--primary-color)">${c.title}</strong>
                <span class="badge badge-info">${c.category}</span>
                <div style="display:flex; gap:10px; margin-top:10px; width:100%;">
                    <a href="${c.url}" target="_blank" class="btn btn-primary btn-block" style="padding:8px; font-size:0.8rem; flex:1;">فتح <i class="fas fa-external-link-alt"></i></a>
                    <button class="btn btn-danger delete-circ" data-id="${c.id}" data-path="${c.path}" data-provider="${c.cloudProvider || 'firebase'}" style="padding:8px; flex:0 0 40px;"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');

        document.querySelectorAll('.delete-circ').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(confirm('حذف هذا المنشور؟')) {
                    const id = e.currentTarget.dataset.id;
                    const path = e.currentTarget.dataset.path;
                    const provider = e.currentTarget.dataset.provider || 'google_drive';
                    try {
                        if (provider === 'firebase' && path) {
                            await deleteObject(ref(storage, path));
                        }
                        await deleteDoc(doc(db, "circulars", id));
                        CircularsModule.loadCirculars();
                    } catch(err) {
                        console.error(err);
                        await deleteDoc(doc(db, "circulars", id));
                        CircularsModule.loadCirculars();
                    }
                }
            });
        });
    },

    bindEvents: () => {
        const modal = document.getElementById('circular-modal');
        const form = document.getElementById('circular-form');
        const providerSelect = document.getElementById('circ-provider');

        document.getElementById('add-circular-btn')?.addEventListener('click', () => {
            form.reset();
            CircularsModule.syncUploadModeUI();
            modal.classList.remove('hidden');
        });

        document.getElementById('close-circ-modal-btn')?.addEventListener('click', () => modal.classList.add('hidden'));
        providerSelect?.addEventListener('change', CircularsModule.syncUploadModeUI);

        form?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const file = document.getElementById('circ-file').files[0];
            const cloudLink = document.getElementById('circ-cloud-link')?.value.trim() || '';
            const title = document.getElementById('circ-title').value;
            const cat = document.getElementById('circ-category').value;
            const provider = document.getElementById('circ-provider')?.value || 'google_drive';
            const canDirectGoogleUpload = provider === 'google_drive' && CloudStorageModule.isDirectUploadConfigured('google_drive');
            const canDirectOneDriveUpload = provider === 'onedrive' && CloudStorageModule.isDirectUploadConfigured('onedrive');
            const useCloudLink = (provider === 'google_drive' && !canDirectGoogleUpload) || (provider === 'onedrive' && !canDirectOneDriveUpload);

            if (!useCloudLink && !file) return;
            if (useCloudLink && !cloudLink) return UI.showToast('يرجى إدخال رابط الملف السحابي', 'error');

            const btn = form.querySelector('button[type="submit"]');
            btn.disabled = true;
            document.getElementById('upload-status').classList.remove('hidden');

            try {
                if (useCloudLink) {
                    await addDoc(collection(db, "circulars"), {
                        title,
                        category: cat,
                        url: cloudLink,
                        path: '',
                        cloudProvider: provider,
                        createdAt: serverTimestamp()
                    });
                } else if (provider === 'google_drive') {
                    const uploaded = await GoogleDriveModule.uploadFile(file, CloudStorageModule.getResolvedSettings(), { fileName: file.name });
                    await addDoc(collection(db, "circulars"), {
                        title,
                        category: cat,
                        url: uploaded.webViewLink || uploaded.webContentLink,
                        path: uploaded.fileId,
                        cloudProvider: 'google_drive',
                        createdAt: serverTimestamp()
                    });
                } else if (provider === 'onedrive') {
                    const uploaded = await OneDriveModule.uploadFile(file, CloudStorageModule.getResolvedSettings(), { fileName: file.name });
                    await addDoc(collection(db, "circulars"), {
                        title,
                        category: cat,
                        url: uploaded.webUrl || uploaded.downloadUrl,
                        path: uploaded.fileId,
                        cloudProvider: 'onedrive',
                        createdAt: serverTimestamp()
                    });
                }

                modal.classList.add('hidden');
                CircularsModule.loadCirculars();
                UI.showToast("تم رفع المنشور بنجاح", "success");
            } catch(err) {
                console.error(err);
                UI.showToast("خطأ في الرفع", "error");
            } finally {
                btn.disabled = false;
                document.getElementById('upload-status').classList.add('hidden');
            }
        });
    }
};
