import { db } from './config.js';
import { collection, getDocs, addDoc, doc, deleteDoc, query, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { ref, uploadBytesResumable, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";
import { storage } from './config.js';
import { UI } from './ui.js';
import { Utils } from './utils.js';
import { CloudStorageModule } from './cloud-storage.js';
import { GoogleDriveModule } from './google-drive.js';
import { OneDriveModule } from './onedrive.js';

export const RollsModule = {
    rolls: [],
    
    init: async () => {
        RollsModule.renderBaseUI();
        await RollsModule.loadRolls();
        RollsModule.bindEvents();
    },

    renderBaseUI: () => {
        const container = document.getElementById('content-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="actions-bar" style="display:flex; justify-content:space-between; margin-bottom: 20px;">
                <button id="add-roll-btn" class="btn btn-primary"><i class="fas fa-plus"></i> إضافة رول جلسة جديد</button>
                <div class="search-box">
                    <input type="text" id="search-rolls" placeholder="ابحث في الرولات..." class="form-control" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-primary);">
                </div>
            </div>
            
            <div class="section-card" style="overflow-x: auto;">
                <table class="premium-table" style="width:100%;">
                    <thead>
                        <tr>
                            <th>التاريخ</th>
                            <th>المحكمة</th>
                            <th>الوصف / المرفق</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody id="rolls-table-body">
                        <tr><td colspan="4" style="text-align:center; padding:20px;">جاري تحميل البيانات...</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- Add Roll Modal -->
            <div id="roll-modal" class="modal-backdrop hidden" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000; display:flex; justify-content:center; align-items:center;">
                <div class="section-card modal-content" style="width: 90%; max-width: 450px; padding: 25px; border-radius: 12px;">
                    <h3 style="margin-bottom: 20px;">إضافة رول جلسة</h3>
                    <form id="roll-form">
                        <div class="form-group">
                            <label>تاريخ الرول</label>
                            <input type="date" id="roll-date" required>
                        </div>
                        <div class="form-group">
                            <label>المحكمة</label>
                            <input type="text" id="roll-court" placeholder="مثال: الدائرة 5 جنايات" required>
                        </div>
                        <div class="form-group">
                            <label>رابط الملف / ملاحظات</label>
                            <input type="text" id="roll-link" placeholder="رابط الملف المرفوع أو ملاحظات..." required>
                        </div>
                        <div class="form-group">
                            <label>مزوّد الرفع</label>
                            <select id="roll-provider" style="width:100%; padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-primary);">
                                <option value="google_drive">Google Drive</option>
                                <option value="onedrive">OneDrive</option>
                            </select>
                        </div>
                        <div class="form-group" id="roll-file-group">
                            <label>ملف الرول PDF</label>
                            <input type="file" id="roll-file" accept=".pdf,application/pdf">
                        </div>
                        <div class="form-group hidden" id="roll-cloud-link-group">
                            <label>رابط الملف السحابي</label>
                            <input type="url" id="roll-cloud-link" placeholder="https://drive.google.com/... أو https://onedrive.live.com/...">
                        </div>
                        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top: 20px;">
                            <button type="button" id="close-roll-modal" class="btn" style="background:var(--text-muted); color:white;">إلغاء</button>
                            <button type="submit" class="btn btn-primary">حفظ <i class="fas fa-save"></i></button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    },

    syncUploadModeUI: () => {
        const provider = document.getElementById('roll-provider')?.value || 'google_drive';
        const fileGroup = document.getElementById('roll-file-group');
        const cloudLinkGroup = document.getElementById('roll-cloud-link-group');
        const fileInput = document.getElementById('roll-file');
        const cloudLinkInput = document.getElementById('roll-cloud-link');
        const canDirectGoogleUpload = provider === 'google_drive' && CloudStorageModule.isDirectUploadConfigured('google_drive');
        const canDirectOneDriveUpload = provider === 'onedrive' && CloudStorageModule.isDirectUploadConfigured('onedrive');
        const useCloudLink = (provider === 'google_drive' && !canDirectGoogleUpload)
            || (provider === 'onedrive' && !canDirectOneDriveUpload);

        fileGroup?.classList.toggle('hidden', useCloudLink);
        cloudLinkGroup?.classList.toggle('hidden', !useCloudLink);
        if (fileInput) fileInput.required = !useCloudLink;
        if (cloudLinkInput) cloudLinkInput.required = useCloudLink;
    },

    loadRolls: async () => {
        try {
            const rollsRef = collection(db, "rolls");
            const q = query(rollsRef, orderBy("date", "desc"));
            const snapshot = await getDocs(q);
            
            RollsModule.rolls = [];
            snapshot.forEach(doc => {
                RollsModule.rolls.push({ id: doc.id, ...doc.data() });
            });
            RollsModule.renderTable(RollsModule.rolls);
        } catch (error) {
            console.error("Error loading rolls", error);
            UI.showToast("خطأ في تحميل الرولات", "error");
        }
    },

    renderTable: (data) => {
        const tbody = document.getElementById('rolls-table-body');
        if (!tbody) return;
        
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px;">لا يوجد رولات مسجلة</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(r => `
            <tr>
                <td style="font-weight:bold;">${r.date}</td>
                <td>${r.court}</td>
                <td><a href="${r.link}" target="_blank" style="color:var(--accent-color); text-decoration:none;"><i class="fas fa-external-link-alt"></i> عرض الرول</a></td>
                <td>
                    <button class="icon-btn delete-roll" data-id="${r.id}"><i class="fas fa-trash" style="color:var(--danger-color);"></i></button>
                </td>
            </tr>
        `).join('');

        document.querySelectorAll('.delete-roll').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(confirm('هل أنت متأكد من حذف هذا الرول؟')) {
                    const id = e.currentTarget.dataset.id;
                    await deleteDoc(doc(db, "rolls", id));
                    RollsModule.loadRolls();
                }
            });
        });
    },

    bindEvents: () => {
        const modal = document.getElementById('roll-modal');
        document.getElementById('add-roll-btn')?.addEventListener('click', () => modal.classList.remove('hidden'));
        document.getElementById('close-roll-modal')?.addEventListener('click', () => modal.classList.add('hidden'));
        document.getElementById('roll-provider')?.addEventListener('change', RollsModule.syncUploadModeUI);
        RollsModule.syncUploadModeUI();
        
        document.getElementById('roll-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const rollData = {
                date: document.getElementById('roll-date').value,
                court: document.getElementById('roll-court').value,
                createdAt: serverTimestamp()
            };
            const provider = document.getElementById('roll-provider')?.value || 'google_drive';
            const file = document.getElementById('roll-file')?.files?.[0];
            const cloudLink = document.getElementById('roll-cloud-link')?.value.trim() || '';
            const notes = document.getElementById('roll-link').value;
            const canDirectGoogleUpload = provider === 'google_drive' && CloudStorageModule.isDirectUploadConfigured('google_drive');
            const canDirectOneDriveUpload = provider === 'onedrive' && CloudStorageModule.isDirectUploadConfigured('onedrive');
            const useCloudLink = (provider === 'google_drive' && !canDirectGoogleUpload)
                || (provider === 'onedrive' && !canDirectOneDriveUpload);

            try {
                if (useCloudLink) {
                    await addDoc(collection(db, "rolls"), {
                        ...rollData,
                        link: cloudLink,
                        cloudProvider: provider,
                        fileName: file?.name || '',
                        fileType: 'cloud-link'
                    });
                } else if (provider === 'google_drive' && file) {
                    const uploaded = await GoogleDriveModule.uploadFile(file, CloudStorageModule.getResolvedSettings(), { fileName: file.name });
                    await addDoc(collection(db, "rolls"), {
                        ...rollData,
                        link: uploaded.webViewLink || uploaded.webContentLink,
                        cloudProvider: 'google_drive',
                        fileName: uploaded.fileName,
                        fileType: 'application/pdf',
                        storagePath: uploaded.fileId
                    });
                } else if (provider === 'onedrive' && file) {
                    const uploaded = await OneDriveModule.uploadFile(file, CloudStorageModule.getResolvedSettings(), { fileName: file.name });
                    await addDoc(collection(db, "rolls"), {
                        ...rollData,
                        link: uploaded.webUrl || uploaded.downloadUrl,
                        cloudProvider: 'onedrive',
                        fileName: uploaded.fileName,
                        fileType: 'application/pdf',
                        storagePath: uploaded.fileId
                    });
                } else if (file) {
                    const uniqueName = `${Date.now()}_${file.name}`;
                    const storagePath = `rolls/${uniqueName}`;
                    const fileRef = ref(storage, storagePath);
                    const uploadTask = uploadBytesResumable(fileRef, file);
                    await new Promise((resolve, reject) => {
                        uploadTask.on('state_changed', null, reject, resolve);
                    });
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    await addDoc(collection(db, "rolls"), {
                        ...rollData,
                        link: notes || downloadURL,
                        cloudProvider: 'firebase',
                        fileName: file.name,
                        fileType: file.type || 'application/pdf',
                        storagePath,
                        downloadURL
                    });
                } else {
                    await addDoc(collection(db, "rolls"), {
                        ...rollData,
                        link: notes,
                        cloudProvider: provider
                    });
                }
                UI.showToast("تم إضافة الرول بنجاح", "success");
                modal.classList.add('hidden');
                RollsModule.loadRolls();
            } catch (error) {
                console.error("Error saving roll", error);
                UI.showToast("حدث خطأ أثناء الحفظ", "error");
            }
        });

        document.getElementById('search-rolls')?.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = RollsModule.rolls.filter(r => 
                String(r.court || '').toLowerCase().includes(term) || String(r.date || '').includes(term)
            );
            RollsModule.renderTable(filtered);
        });
    }
};
