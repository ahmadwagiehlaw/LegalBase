import { db } from './config.js';
import { collection, addDoc, updateDoc, doc, getDoc, deleteDoc, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { ImportModule } from './import.js';
import { UI } from './ui.js';
import { Utils } from './utils.js';
import { AppealsStore } from './appeals-store.js';
import { AgendaModule } from './agenda.js';
import { CloudStorageModule } from './cloud-storage.js';
import { GoogleDriveModule } from './google-drive.js';
import { OneDriveModule } from './onedrive.js';

export const AppealsModule = {
    appeals: [],
    unsubscribeStore: null,
    selectedIds: new Set(),
    filteredAppeals: [],
    
    init: async () => {
        if (AppealsModule.unsubscribeStore) AppealsModule.unsubscribeStore();
        AppealsModule.unsubscribeStore = AppealsStore.subscribe((items) => {
            AppealsModule.appeals = items;
            if (document.getElementById('search-appeal')) AppealsModule.filterAppeals();
            else AppealsModule.renderTable(items);
        });
        AppealsModule.renderBaseUI();
        await AppealsModule.loadAppeals();
        AppealsModule.bindEvents();
    },

    filterAppeals: () => {
        const searchTerm = document.getElementById('search-appeal')?.value?.trim().toLowerCase() || '';
        const statusFilter = document.getElementById('filter-appeal-status')?.value || '';
        const yearFilter = document.getElementById('filter-appeal-year')?.value?.trim() || '';

        const filtered = AppealsModule.appeals.filter((appeal) => {
            const matchesSearch = !searchTerm ||
                String(appeal.appealNumber || '').toLowerCase().includes(searchTerm) ||
                String(appeal.plaintiff || '').toLowerCase().includes(searchTerm) ||
                String(appeal.defendant || '').toLowerCase().includes(searchTerm) ||
                String(appeal.court || '').toLowerCase().includes(searchTerm);

            const matchesStatus = !statusFilter || appeal.status === statusFilter;
            const matchesYear = !yearFilter || String(appeal.year || '') === yearFilter;

            return matchesSearch && matchesStatus && matchesYear;
        });

        AppealsModule.renderTable(filtered);
    },

    updateBulkActionsState: () => {
        const selectedCount = AppealsModule.selectedIds.size;
        const filteredCount = AppealsModule.filteredAppeals.length;
        const selectedCountEl = document.getElementById('selected-count');
        const deleteSelectedBtn = document.getElementById('delete-selected-btn');
        const deleteFilteredBtn = document.getElementById('delete-filtered-btn');
        const selectAllVisible = document.getElementById('select-all-visible');

        if (selectedCountEl) selectedCountEl.textContent = `${selectedCount}`;
        if (deleteSelectedBtn) deleteSelectedBtn.disabled = selectedCount === 0;
        if (deleteFilteredBtn) deleteFilteredBtn.disabled = filteredCount === 0;

        if (selectAllVisible) {
            const visibleIds = AppealsModule.filteredAppeals.map((appeal) => appeal.id);
            const hasVisible = visibleIds.length > 0;
            const allVisibleSelected = hasVisible && visibleIds.every((id) => AppealsModule.selectedIds.has(id));
            selectAllVisible.checked = allVisibleSelected;
            selectAllVisible.indeterminate = hasVisible && !allVisibleSelected && visibleIds.some((id) => AppealsModule.selectedIds.has(id));
        }
    },

    deleteAppealsByIds: async (appealIds, label = 'العناصر المحددة') => {
        if (!appealIds.length) return;
        if (!confirm(`سيتم حذف ${appealIds.length} من ${label}. هل تريد المتابعة؟`)) return;

        try {
            for (let i = 0; i < appealIds.length; i += 400) {
                const batch = writeBatch(db);
                appealIds.slice(i, i + 400).forEach((appealId) => {
                    batch.delete(doc(db, "appeals", appealId));
                });
                await batch.commit();
            }

            appealIds.forEach((appealId) => {
                AppealsModule.selectedIds.delete(appealId);
                AppealsStore.remove(appealId);
            });

            UI.showToast(`تم حذف ${appealIds.length} طعن بنجاح`, "success");
            AppealsModule.filterAppeals();
        } catch (error) {
            console.error('Bulk delete failed', error);
            UI.showToast("حدث خطأ أثناء الحذف الجماعي", "error");
        }
    },

    renderBaseUI: () => {
        const container = document.getElementById('content-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="actions-bar" style="display:flex; justify-content:space-between; margin-bottom: 20px; gap:15px; flex-wrap:wrap;">
                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                    <button id="add-appeal-btn" class="btn btn-primary" style="background:var(--accent-color);"><i class="fas fa-plus"></i> إضافة طعن جديد</button>
                    <button id="trigger-import-btn" class="btn" style="background:var(--secondary-color); color:white;"><i class="fas fa-file-excel"></i> استيراد بيانات</button>
                    <button id="delete-selected-btn" class="btn" style="background:var(--danger-color); color:white;" disabled><i class="fas fa-trash"></i> حذف المحدد</button>
                    <button id="delete-filtered-btn" class="btn" style="background:#7f1d1d; color:white;" disabled><i class="fas fa-filter"></i> حذف نتائج الفلترة</button>
                </div>
                <div class="search-box" style="display:flex; gap:10px; flex-wrap:wrap;">
                    <input type="text" id="search-appeal" placeholder="ابحث برقم الطعن أو الخصم..." class="form-control" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-color); width: 280px;">
                    <input type="number" id="filter-appeal-year" placeholder="السنة" class="form-control" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-color); width:120px;">
                    <select id="filter-appeal-status" class="form-control" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-color); color:var(--text-color); width:180px;">
                        <option value="">كل الحالات</option>
                        <option value="متداول">متداول</option>
                        <option value="محجوز للحكم">محجوز للحكم</option>
                        <option value="منتهي">منتهي</option>
                    </select>
                    <button id="clear-appeal-filters" class="btn" style="background:var(--bg-color); border:1px solid var(--border-color); color:var(--text-primary);"><i class="fas fa-eraser"></i> مسح</button>
                </div>
            </div>
            
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px; flex-wrap:wrap; gap:12px;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <label style="display:flex; align-items:center; gap:8px; font-weight:600;">
                        <input type="checkbox" id="select-all-visible">
                        تحديد كل الظاهر
                    </label>
                    <button id="clear-selection-btn" class="btn" style="background:var(--bg-color); border:1px solid var(--border-color); color:var(--text-primary);"><i class="fas fa-xmark"></i> إلغاء التحديد</button>
                </div>
                <div style="font-size:0.9rem; color:var(--text-secondary);">
                    المحدد: <strong id="selected-count">0</strong>
                </div>
            </div>

            <div class="section-card" style="overflow-x: auto;">
                <table class="premium-table" style="width:100%;">
                    <thead>
                        <tr>
                            <th style="width:52px; text-align:center;"><i class="fas fa-check-square"></i></th>
                            <th>رقم الطعن</th>
                            <th>السنة</th>
                            <th>الطاعن</th>
                            <th>المطعون ضده</th>
                            <th>الحالة</th>
                            <th>الإجراءات</th>
                        </tr>
                    </thead>
                    <tbody id="appeals-table-body">
                        <tr><td colspan="6" style="text-align:center; padding:20px;">جاري تحميل البيانات... <i class="fas fa-spinner fa-spin"></i></td></tr>
                    </tbody>
                </table>
            </div>

            <!-- Add/Edit Modal (Hidden by default) -->
            <div id="appeal-modal" class="modal-backdrop hidden" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000; display:flex; justify-content:center; align-items:center;">
                <div class="glass-panel modal-content" style="width: 90%; max-width: 600px; padding: 25px; border-radius: 12px; max-height: 90vh; overflow-y: auto;">
                    <h3 id="modal-title" style="margin-bottom: 20px; color: var(--primary-color);">إضافة طعن جديد</h3>
                    <form id="appeal-form">
                        <input type="hidden" id="appeal-id">
                        <div class="form-grid">
                            <div class="form-group">
                                <label>رقم الطعن</label>
                                <input type="text" id="appeal-number" required>
                            </div>
                            <div class="form-group">
                                <label>السنة</label>
                                <input type="number" id="appeal-year" required>
                            </div>
                            <div class="form-group">
                                <label>المحكمة / الدائرة</label>
                                <select id="appeal-court" style="width:100%; padding:12px; border-radius:8px; background:var(--bg-color); color:var(--text-color); border:1px solid var(--border-color);" required>
                                    <option value="">-- اختر من القائمة --</option>
                                    <!-- Dynamic Options from Admin Settings -->
                                </select>
                            </div>
                            <div class="form-group" style="grid-column: span 2;">
                                <label>موضوع الطعن</label>
                                <select id="appeal-subject" style="width:100%; padding:12px; border-radius:8px; background:var(--bg-color); color:var(--text-color); border:1px solid var(--border-color);" required>
                                    <option value="">-- اختر موضوع الطعن --</option>
                                    <!-- Dynamic Options from Admin Settings -->
                                </select>
                            </div>
                            <div class="form-group">
                                <label>اسم الطاعن</label>
                                <input type="text" id="appeal-plaintiff" required>
                            </div>
                            <div class="form-group">
                                <label>اسم المطعون ضده</label>
                                <input type="text" id="appeal-defendant" required>
                            </div>
                            <div class="form-group" style="grid-column: span 2;">
                                <label>الحالة</label>
                                <select id="appeal-status" style="width:100%; padding:12px; border-radius:8px; background:var(--bg-color); color:var(--text-color); border:1px solid var(--border-color);">
                                    <option value="متداول">متداول</option>
                                    <option value="محجوز للحكم">محجوز للحكم</option>
                                    <option value="منتهي">منتهي</option>
                                </select>
                            </div>
                        </div>
                        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top: 20px;">
                            <button type="button" id="close-modal-btn" class="btn btn-secondary">إلغاء</button>
                            <button type="submit" class="btn btn-primary">حفظ <i class="fas fa-save"></i></button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Comprehensive Case Dashboard Modal (Full Screen) -->
            <div id="case-dashboard-modal" class="modal-backdrop hidden" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(15, 23, 42, 0.95); z-index:2000; overflow-y:auto; padding:20px;">
                <div class="glass-panel" style="width:100%; max-width:1200px; margin: 0 auto; min-height:90vh; border-radius:16px; position:relative; display:flex; flex-direction:column;">
                    
                    <!-- Dashboard Header -->
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; padding:25px; border-bottom:1px solid rgba(255,255,255,0.1); background:rgba(0,0,0,0.2); border-radius:16px 16px 0 0;">
                        <div>
                            <h2 style="margin:0; color:var(--accent-color); font-size:1.8rem; display:flex; align-items:center; gap:10px;">
                                <i class="fas fa-folder-open"></i> ملف الطعن: <span id="dash-appeal-number"></span> لسنة <span id="dash-appeal-year"></span>
                            </h2>
                            <div style="display:flex; gap:15px; margin-top:10px; color:var(--text-secondary); font-weight:600; flex-wrap:wrap;">
                                <span><i class="fas fa-gavel"></i> الدائرة: <span id="dash-court" style="color:var(--text-primary);"></span></span>
                                <span><i class="fas fa-balance-scale"></i> الموضوع: <span id="dash-subject" style="color:var(--text-primary);"></span></span>
                                <span><i class="fas fa-user"></i> الطاعن: <span id="dash-plaintiff" style="color:var(--text-primary);"></span></span>
                                <span><i class="fas fa-user-tie"></i> المطعون ضده: <span id="dash-defendant" style="color:var(--text-primary);"></span></span>
                                <span><i class="fas fa-info-circle"></i> الحالة: <span id="dash-status" class="badge"></span></span>
                            </div>
                        </div>
                        <div style="display:flex; gap:10px;">
                            <button id="dash-add-note-btn" class="btn btn-primary" style="white-space:nowrap;"><i class="fas fa-plus"></i> إضافة تحليل</button>
                            <button id="close-dashboard-btn" class="icon-btn" style="background:#ef4444; color:white; width:45px; height:45px; font-size:1.2rem;"><i class="fas fa-times"></i></button>
                        </div>
                    </div>

                    <!-- Dashboard Body -->
                    <div style="padding:25px; flex:1; display:flex; flex-direction:column; gap:25px; background:var(--bg-color); border-radius:0 0 16px 16px;">
                        
                        <!-- Add Note Form (Hidden by default) -->
                        <div id="add-note-form-container" class="section-card hidden" style="border:1px solid var(--accent-color); background:rgba(245, 158, 11, 0.05); padding:20px; animation: fadeIn 0.3s ease-out;">
                            <h4 style="margin-top:0; color:var(--accent-color);"><i class="fas fa-pen"></i> إضافة تحليل أو ملاحظة جديدة</h4>
                            <div class="form-group" style="text-align:right;">
                                <label style="display:block; margin-bottom:8px; font-weight:700;">موضوع الملاحظة (مثال: تحليل الوقائع، أدلة الثبوت)</label>
                                <input type="text" id="note-title" style="width:100%; padding:12px; border-radius:8px; border:1px solid var(--border-color); background:var(--input-bg); color:var(--text-primary);" placeholder="عنون الملاحظة هنا...">
                            </div>
                            <div class="form-group" style="margin-top:15px; text-align:right;">
                                <label style="display:block; margin-bottom:8px; font-weight:700;">التفاصيل أو رابط المرفق (يدعم إظهار الصور من Google Drive)</label>
                                <textarea id="note-content" rows="4" style="width:100%; padding:12px; border-radius:8px; border:1px solid var(--border-color); background:var(--input-bg); color:var(--text-primary); resize:vertical; margin-bottom:12px;" placeholder="اكتب ملاحظتك التوضيحية هنا، أو قم بلصق رابط صورة درايف..."></textarea>
                                
                                <label style="display:block; margin-bottom:8px; font-weight:700; color:var(--text-secondary); font-size:0.9rem;">الرفع المباشر للملفات والصور (اختياري)</label>
                                <div style="display:flex; align-items:center; gap:10px; background:var(--bg-color); padding:10px; border-radius:8px; border:1px dashed var(--border-color); flex-wrap:wrap;">
                                    <div style="flex:1; min-width:200px;">
                                        <input type="file" id="note-file-upload" style="width:100%;" class="form-control">
                                    </div>
                                    <select id="note-cloud-provider" style="padding:10px; border-radius:8px; border:1px solid var(--border-color); background:var(--panel-bg); color:var(--text-primary);">
                                        <option value="google_drive">جوجل درايف (G.Drive)</option>
                                        <option value="onedrive">ون درايف (OneDrive)</option>
                                    </select>
                                    <button id="trigger-note-upload-btn" type="button" class="btn btn-secondary" style="white-space:nowrap; border-color:var(--border-color); color:var(--text-primary);"><i class="fas fa-cloud-upload-alt" style="color:var(--accent-color);"></i> رفع وإرفاق الرابط</button>
                                </div>
                                <div id="note-upload-status" class="hidden" style="margin-top:10px; color:var(--success-color); font-size:0.85rem; font-weight:bold;">
                                    <i class="fas fa-spinner fa-spin"></i> جاري رفع الملف وتأمين الرابط...
                                </div>
                            </div>
                            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
                                <button id="cancel-note-btn" class="btn btn-secondary">إلغاء</button>
                                <button id="save-note-btn" class="btn btn-primary" style="background:var(--success-color); color:white;">حفظ الإضافة <i class="fas fa-check"></i></button>
                            </div>
                        </div>

                        <!-- Notes Feed (Timeline style) -->
                        <div id="notes-feed-container" style="display:flex; flex-direction:column; gap:20px;">
                            <!-- Notes will be injected here dynamically -->
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        if(!document.getElementById('appeals-style')) {
            const style = document.createElement('style');
            style.id = 'appeals-style';
            style.innerHTML = `
                .data-table th, .data-table td { border-bottom: 1px solid var(--border-color); }
                .data-table tbody tr:hover { background-color: rgba(26, 95, 122, 0.05); }
                .badge { padding: 5px 10px; border-radius: 20px; font-size: 12px; font-weight: bold; }
                .badge.متداول { background: var(--primary-color); color: white; }
                .badge.منتهي { background: var(--success-color); color: white; }
                .badge.محجوز { background: var(--warning-color); color: #000; }
                .action-icon { cursor: pointer; color: var(--text-muted); margin-left: 10px; transition: var(--transition); }
                .action-icon:hover { color: var(--primary-color); }
            `;
            document.head.appendChild(style);
        }
    },

    loadAppeals: async () => {
        try {
            const cachedAppeals = AppealsStore.getAll();
            if (cachedAppeals.length > 0) {
                AppealsModule.appeals = cachedAppeals;
                AppealsModule.renderTable(cachedAppeals);
            }

            AppealsModule.appeals = await AppealsStore.load({ allowStale: true });
            AppealsModule.renderTable(AppealsModule.appeals);
        } catch (error) {
            console.error("Error loading appeals: ", error);
            UI.showToast("حدث خطأ أثناء تحميل البيانات", "error");
            
            const tbody = document.getElementById('appeals-table-body');
            if(tbody) tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">لا توجد بيانات أو حدث خطأ</td></tr>`;
        }
    },

    renderTable: (data) => {
        const tbody = document.getElementById('appeals-table-body');
        if (!tbody) return;
        AppealsModule.filteredAppeals = data;
        
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">لا يوجد طعون مسجلة</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(appeal => `
            <tr>
                <td style="padding:15px; text-align:center;">
                    <input type="checkbox" class="appeal-select" data-id="${appeal.id}" ${AppealsModule.selectedIds.has(appeal.id) ? 'checked' : ''}>
                </td>
                <td style="padding:15px; font-weight:bold;"><a href="#" class="case-link" onclick="if(window.AppealsModule) window.AppealsModule.viewAppeal('${appeal.id}'); return false;" style="color:var(--accent-color); text-decoration:none;">${appeal.appealNumber}</a></td>
                <td style="padding:15px;">${appeal.year}</td>
                <td style="padding:15px;">${appeal.plaintiff || '---'}</td>
                <td style="padding:15px;">${appeal.defendant || '---'}</td>
                <td style="padding:15px;"><span class="badge ${appeal.status === 'محجوز للحكم' ? 'محجوز' : (appeal.status === 'منتهي' ? 'منتهي' : 'متداول')}">${appeal.status}</span></td>
                <td style="padding:15px; display:flex; gap:10px; justify-content:flex-end;">
                    <a class="action-icon view-appeal" onclick="if(window.AppealsModule) window.AppealsModule.viewAppeal('${appeal.id}'); return false;" title="عرض ملف القضية"><i class="fas fa-folder-open" style="color:var(--accent-color);"></i></a>
                    <a class="action-icon edit-appeal" data-id="${appeal.id}" title="تعديل"><i class="fas fa-edit" style="color:var(--secondary-color);"></i></a>
                    <a class="action-icon clone-appeal" data-id="${appeal.id}" title="نسخ ببيانات مشابهة"><i class="fas fa-copy" style="color:var(--success-color);"></i></a>
                    <a class="action-icon open-agenda" data-id="${appeal.id}" title="الأجندة والمرفقات"><i class="fas fa-calendar-alt" style="color:var(--nav-active);"></i></a>
                    <a class="action-icon delete-appeal" data-id="${appeal.id}" title="حذف"><i class="fas fa-trash" style="color:var(--danger-color);"></i></a>
                </td>
            </tr>
        `).join('');

        document.querySelectorAll('.appeal-select').forEach((checkbox) => {
            checkbox.addEventListener('change', (e) => {
                const appealId = e.currentTarget.dataset.id;
                if (e.currentTarget.checked) AppealsModule.selectedIds.add(appealId);
                else AppealsModule.selectedIds.delete(appealId);
                AppealsModule.updateBulkActionsState();
            });
        });

        document.querySelectorAll('.delete-appeal').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(confirm('هل أنت متأكد من حذف هذا الطعن؟')) {
                    const id = e.currentTarget.dataset.id;
                    await deleteDoc(doc(db, "appeals", id));
                    AppealsStore.remove(id);
                }
            });
        });

        document.querySelectorAll('.edit-appeal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                AppealsModule.openModal(id);
            });
        });

        document.querySelectorAll('.clone-appeal').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                AppealsModule.cloneAppeal(id);
            });
        });

        document.querySelectorAll('.open-agenda').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                AgendaModule.openSessionModal(id);
            });
        });

        AppealsModule.updateBulkActionsState();
    },

    bindEvents: () => {
        const modal = document.getElementById('appeal-modal');
        const form = document.getElementById('appeal-form');
        const addBtn = document.getElementById('add-appeal-btn');
        const closeBtn = document.getElementById('close-modal-btn');
        const searchInput = document.getElementById('search-appeal');
        const importBtn = document.getElementById('trigger-import-btn');
        const yearFilter = document.getElementById('filter-appeal-year');
        const statusFilter = document.getElementById('filter-appeal-status');
        const clearFiltersBtn = document.getElementById('clear-appeal-filters');
        const clearSelectionBtn = document.getElementById('clear-selection-btn');
        const selectAllVisible = document.getElementById('select-all-visible');
        const deleteSelectedBtn = document.getElementById('delete-selected-btn');
        const deleteFilteredBtn = document.getElementById('delete-filtered-btn');

        if(importBtn) importBtn.addEventListener('click', () => ImportModule.openModal());
        if(addBtn) addBtn.addEventListener('click', () => AppealsModule.openModal());
        
        if(closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.classList.add('hidden');
            });
        }
        
        if(form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = form.querySelector('button[type="submit"]');
                const originalHtml = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

                const id = document.getElementById('appeal-id').value;
                const cacheTimestamp = new Date().toISOString();
                const appealData = {
                    appealNumber: document.getElementById('appeal-number').value,
                    year: parseInt(document.getElementById('appeal-year').value),
                    plaintiff: document.getElementById('appeal-plaintiff').value,
                    defendant: document.getElementById('appeal-defendant').value,
                    court: document.getElementById('appeal-court').value,
                    subject: document.getElementById('appeal-subject').value,
                    status: document.getElementById('appeal-status').value,
                    updatedAt: serverTimestamp()
                };

                const plaintiffVal = document.getElementById('appeal-plaintiff').value.trim();
                const defendantVal = document.getElementById('appeal-defendant').value.trim();
                
                // update local storage autocomplete max 50 items
                let recentNames = JSON.parse(localStorage.getItem('recentNames')) || [];
                if (plaintiffVal && !recentNames.includes(plaintiffVal)) recentNames.push(plaintiffVal);
                if (defendantVal && !recentNames.includes(defendantVal)) recentNames.push(defendantVal);
                if (recentNames.length > 50) recentNames = recentNames.slice(-50);
                localStorage.setItem('recentNames', JSON.stringify(recentNames));

                try {
                    if (id) {
                        const appealRef = doc(db, "appeals", id);
                        await updateDoc(appealRef, appealData);
                        AppealsStore.upsert({ id, ...appealData, updatedAt: cacheTimestamp });
                        UI.showToast("تم تحديث الطعن بنجاح", "success");
                    } else {
                        appealData.createdAt = serverTimestamp();
                        const createdRef = await addDoc(collection(db, "appeals"), appealData);
                        AppealsStore.upsert({ id: createdRef.id, ...appealData, createdAt: cacheTimestamp, updatedAt: cacheTimestamp });
                        UI.showToast("تمت إضافة الطعن بنجاح", "success");
                    }
                    modal.classList.add('hidden');
                } catch (error) {
                    console.error("Error saving: ", error);
                    UI.showToast("حدث خطأ أثناء الحفظ", "error");
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = originalHtml;
                }
            });
        }

        if(searchInput) searchInput.addEventListener('input', AppealsModule.filterAppeals);
        if(yearFilter) yearFilter.addEventListener('input', AppealsModule.filterAppeals);
        if(statusFilter) statusFilter.addEventListener('change', AppealsModule.filterAppeals);

        if(clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                if (yearFilter) yearFilter.value = '';
                if (statusFilter) statusFilter.value = '';
                AppealsModule.filterAppeals();
            });
        }

        if(clearSelectionBtn) {
            clearSelectionBtn.addEventListener('click', () => {
                AppealsModule.selectedIds.clear();
                AppealsModule.renderTable(AppealsModule.filteredAppeals);
            });
        }

        if(selectAllVisible) {
            selectAllVisible.addEventListener('change', (e) => {
                AppealsModule.filteredAppeals.forEach((appeal) => {
                    if (e.currentTarget.checked) AppealsModule.selectedIds.add(appeal.id);
                    else AppealsModule.selectedIds.delete(appeal.id);
                });
                AppealsModule.renderTable(AppealsModule.filteredAppeals);
            });
        }

        if(deleteSelectedBtn) {
            deleteSelectedBtn.addEventListener('click', () => {
                AppealsModule.deleteAppealsByIds([...AppealsModule.selectedIds], 'العناصر المحددة');
            });
        }

        if(deleteFilteredBtn) {
            deleteFilteredBtn.addEventListener('click', () => {
                AppealsModule.deleteAppealsByIds(AppealsModule.filteredAppeals.map((appeal) => appeal.id), 'نتائج الفلترة');
            });
        }

        // Dashboard events
        const dashboardModal = document.getElementById('case-dashboard-modal');
        const closeDashBtn = document.getElementById('close-dashboard-btn');
        const addNoteBtn = document.getElementById('dash-add-note-btn');
        const addNoteForm = document.getElementById('add-note-form-container');
        const cancelNoteBtn = document.getElementById('cancel-note-btn');
        const saveNoteBtn = document.getElementById('save-note-btn');
        const triggerUploadBtn = document.getElementById('trigger-note-upload-btn');

        if (triggerUploadBtn) {
            triggerUploadBtn.addEventListener('click', async () => {
                const fileInput = document.getElementById('note-file-upload');
                const file = fileInput.files[0];
                if (!file) {
                    UI.showToast("الرجاء اختيار ملف أولاً لرفعه", "warning");
                    return;
                }

                const provider = document.getElementById('note-cloud-provider').value;
                const canDirectUpload = CloudStorageModule.isDirectUploadConfigured(provider);
                if (!canDirectUpload) {
                    UI.showToast("لم يتم ربط هذا الحساب السحابي. يرجى تهيئته أولاً من الإعدادات.", "error");
                    return;
                }

                triggerUploadBtn.disabled = true;
                const statusEl = document.getElementById('note-upload-status');
                statusEl.classList.remove('hidden');

                try {
                    let finalUrl = '';
                    if (provider === 'google_drive') {
                        const uploaded = await GoogleDriveModule.uploadFile(file, CloudStorageModule.getResolvedSettings(), { fileName: file.name });
                        finalUrl = uploaded.webViewLink || uploaded.webContentLink;
                    } else if (provider === 'onedrive') {
                        const uploaded = await OneDriveModule.uploadFile(file, CloudStorageModule.getResolvedSettings(), { fileName: file.name });
                        finalUrl = uploaded.webUrl || uploaded.downloadUrl;
                    }

                    if (finalUrl) {
                        const contentArea = document.getElementById('note-content');
                        contentArea.value = (contentArea.value + '\n\n' + finalUrl).trim();
                        UI.showToast("تم الرفع بنجاح وإدراج الرابط في الملاحظة", "success");
                        fileInput.value = ''; // Clear file so it's not confusing
                    }
                } catch(err) {
                    console.error('Note upload failed', err);
                    UI.showToast("حدث خطأ أثناء الرفع للسحابة", "error");
                } finally {
                    triggerUploadBtn.disabled = false;
                    statusEl.classList.add('hidden');
                }
            });
        }

        if (closeDashBtn) closeDashBtn.addEventListener('click', () => {
            dashboardModal.classList.add('hidden');
            // Re-render table just in case we changed data that affects counts
            AppealsModule.filterAppeals(); 
        });
        if (addNoteBtn) addNoteBtn.addEventListener('click', () => {
            document.getElementById('note-title').value = '';
            document.getElementById('note-content').value = '';
            addNoteForm.classList.remove('hidden');
        });
        if (cancelNoteBtn) cancelNoteBtn.addEventListener('click', () => addNoteForm.classList.add('hidden'));
        if (saveNoteBtn) saveNoteBtn.addEventListener('click', async () => {
            const title = document.getElementById('note-title').value.trim();
            const content = document.getElementById('note-content').value.trim();
            const appealId = dashboardModal.dataset.currentAppealId;

            if (!title || !content || !appealId) {
                UI.showToast("الرجاء إدخال عنوان وتفاصيل الملاحظة", "warning");
                return;
            }

            const btnOriginal = saveNoteBtn.innerHTML;
            saveNoteBtn.disabled = true;
            saveNoteBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';

            try {
                const appealRef = doc(db, "appeals", appealId);
                const note = {
                    id: 'note_' + Date.now(),
                    title,
                    content,
                    date: new Date().toISOString()
                };
                
                const appeal = AppealsModule.appeals.find(a => a.id === appealId);
                const currentNotes = appeal.caseNotes || [];
                const updatedNotes = [note, ...currentNotes];

                await updateDoc(appealRef, { caseNotes: updatedNotes });
                
                AppealsStore.upsert({ id: appealId, caseNotes: updatedNotes });
                
                UI.showToast("تم إضافة الملاحظة بنجاح", "success");
                addNoteForm.classList.add('hidden');
                AppealsModule.renderDashNotes(updatedNotes);
            } catch (error) {
                console.error("Error saving note: ", error);
                UI.showToast("حدث خطأ أثناء الحفظ", "error");
            } finally {
                saveNoteBtn.disabled = false;
                saveNoteBtn.innerHTML = btnOriginal;
            }
        });
    },

    openModal: async (id = null) => {
        const modal = document.getElementById('appeal-modal');
        const title = document.getElementById('modal-title');
        const form = document.getElementById('appeal-form');
        form.reset();

        try {
            const courtSelect = document.getElementById('appeal-court');
            const subjectSelect = document.getElementById('appeal-subject');
            
            const docSnap = await getDoc(doc(db, "settings", "lookups"));
            let courts = ["محكمة النقض - الدائرة الجنائية", "محكمة النقض - الدائرة المدنية", "محكمة النقض - دائرة فحص الطعون"];
            let subjects = ["نقض جنائي", "نقض مدني", "إيجارات", "عمال", "تجاري"];
            
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.courts && data.courts.length) courts = data.courts;
                if (data.subjects && data.subjects.length) subjects = data.subjects;
            }
            
            courtSelect.innerHTML = '<option value="">-- اختر من القائمة --</option>' + courts.map(c => `<option value="${c}">${c}</option>`).join('');
            subjectSelect.innerHTML = '<option value="">-- اختر من القائمة --</option>' + subjects.map(s => `<option value="${s}">${s}</option>`).join('');

            // Autocomplete datalist
            const recentNames = JSON.parse(localStorage.getItem('recentNames')) || [];
            let datalist = document.getElementById('recent-names-list');
            if (!datalist) {
                datalist = document.createElement('datalist');
                datalist.id = 'recent-names-list';
                document.body.appendChild(datalist);
                document.getElementById('appeal-plaintiff').setAttribute('list', 'recent-names-list');
                document.getElementById('appeal-defendant').setAttribute('list', 'recent-names-list');
            }
            datalist.innerHTML = recentNames.map(n => `<option value="${n}">`).join('');
            
        } catch(e) { console.error('Error in openModal lookups', e); }
        
        if (id) {
            title.textContent = "تعديل بيانات الطعن";
            const appeal = AppealsModule.appeals.find(a => a.id === id);
            if (appeal) {
                document.getElementById('appeal-id').value = appeal.id;
                document.getElementById('appeal-number').value = appeal.appealNumber || '';
                document.getElementById('appeal-year').value = appeal.year || '';
                document.getElementById('appeal-plaintiff').value = appeal.plaintiff || '';
                document.getElementById('appeal-defendant').value = appeal.defendant || '';
                document.getElementById('appeal-court').value = appeal.court || '';
                document.getElementById('appeal-subject').value = appeal.subject || '';
                document.getElementById('appeal-status').value = appeal.status || 'متداول';
            }
        } else {
            title.textContent = "إضافة طعن جديد";
            document.getElementById('appeal-id').value = '';
            
            // Default Values pre-fill
            const defaultCourt = localStorage.getItem('defaultCourt');
            if (defaultCourt) document.getElementById('appeal-court').value = defaultCourt;
            
            // Remember defaults on change
            document.getElementById('appeal-court').addEventListener('change', (e) => {
                localStorage.setItem('defaultCourt', e.target.value);
            });
        }
        
        modal.classList.remove('hidden');
    },

    cloneAppeal: async (id) => {
        const appeal = AppealsModule.appeals.find(a => a.id === id);
        if (!appeal) return;
        
        await AppealsModule.openModal(); // Opens as new
        
        document.getElementById('appeal-court').value = appeal.court || '';
        document.getElementById('appeal-subject').value = appeal.subject || '';
        document.getElementById('appeal-plaintiff').value = appeal.plaintiff || '';
        document.getElementById('appeal-defendant').value = appeal.defendant || '';
        // Note: Number and Year are intentionally left blank since it's a new case
        
        
        UI.showToast("تم فتح قضية جديدة ونسخ البيانات الأساسية لتسهيل الإدخال", "info");
    },

    viewAppeal: (id) => {
        const appeal = AppealsModule.appeals.find(a => a.id === id);
        if (!appeal) {
            UI.showToast('لم يتم العثور على بيانات الطعن', 'error');
            return;
        }

        const modal = document.getElementById('case-dashboard-modal');
        modal.dataset.currentAppealId = id;

        // Fill Header
        document.getElementById('dash-appeal-number').textContent = appeal.appealNumber || '---';
        document.getElementById('dash-appeal-year').textContent = appeal.year || '---';
        document.getElementById('dash-court').textContent = appeal.court || '---';
        document.getElementById('dash-subject').textContent = appeal.subject || '---';
        document.getElementById('dash-plaintiff').textContent = appeal.plaintiff || '---';
        document.getElementById('dash-defendant').textContent = appeal.defendant || '---';
        
        const statusEl = document.getElementById('dash-status');
        statusEl.textContent = appeal.status || 'متداول';
        statusEl.className = 'badge ' + (appeal.status === 'محجوز للحكم' ? 'محجوز' : (appeal.status === 'منتهي' ? 'منتهي' : 'متداول'));

        // Render Notes
        AppealsModule.renderDashNotes(appeal.caseNotes || []);

        modal.classList.remove('hidden');
    },

    renderDashNotes: (notes) => {
        const container = document.getElementById('notes-feed-container');
        if (!notes || notes.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:40px; color:var(--text-muted); background:var(--surface-bg); border-radius:12px; border:1px dashed var(--border-color);">
                    <i class="fas fa-folder-open" style="font-size:3rem; margin-bottom:15px; opacity:0.5;"></i>
                    <p>لا توجد ملاحظات أو تحليلات مسجلة لهذا الطعن.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = notes.map(note => {
            const dateStr = note.date ? new Date(note.date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
            
            let contentHtml = note.content;
            
            // Check for Google Drive previews
            const gDriveRegex = /https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)\/(view|preview).*?/g;
            if (gDriveRegex.test(contentHtml)) {
                contentHtml = contentHtml.replace(gDriveRegex, (match, fileId) => {
                    return `<div style="margin-top:10px; border-radius:8px; overflow:hidden; border:1px solid var(--border-color);"><iframe src="https://drive.google.com/file/d/${fileId}/preview" width="100%" height="400" allow="autoplay" style="border:none;"></iframe></div>`;
                });
            } 
            // Generic images
            else if (contentHtml.match(/\.(jpeg|jpg|gif|png)$/i)) {
                contentHtml = contentHtml.replace(/(https?:\/\/[^\s]+)/g, '<img src="$1" style="max-width:100%; max-height:400px; border-radius:8px; margin-top:10px;" alt="مرفق">');
            }
            // Normal URLs and newlines
            else {
                contentHtml = Utils.escapeHTML(contentHtml).replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" style="color:var(--accent-color); text-decoration:underline;">$1</a>').replace(/\n/g, '<br>');
            }

            return `
                <div class="section-card" style="padding:20px; border-right:4px solid var(--accent-color); position:relative;" id="${note.id}">
                    <button class="icon-btn delete-note-btn" data-id="${note.id}" style="position:absolute; top:15px; left:15px; color:var(--danger-color); background:rgba(239, 68, 68, 0.1); width:32px; height:32px; font-size:0.9rem;" title="حذف الملاحظة"><i class="fas fa-trash"></i></button>
                    <h4 style="margin-top:0; margin-bottom:10px; color:var(--text-primary); padding-left:40px;">${Utils.escapeHTML(note.title)}</h4>
                    <div style="font-size:0.95rem; color:var(--text-secondary); line-height:1.6; word-wrap:break-word;">
                        ${contentHtml}
                    </div>
                    <div style="margin-top:15px; font-size:0.8rem; color:var(--text-muted); display:flex; align-items:center; gap:5px;">
                        <i class="far fa-clock"></i> ${dateStr}
                    </div>
                </div>
            `;
        }).join('');

        // Bind delete
        container.querySelectorAll('.delete-note-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(!confirm('هل أنت متأكد من حذف هذه الملاحظة؟')) return;
                const noteId = e.currentTarget.dataset.id;
                const appealId = document.getElementById('case-dashboard-modal').dataset.currentAppealId;
                
                try {
                    const appeal = AppealsModule.appeals.find(a => a.id === appealId);
                    const updatedNotes = (appeal.caseNotes || []).filter(n => n.id !== noteId);
                    
                    await updateDoc(doc(db, "appeals", appealId), { caseNotes: updatedNotes });
                    AppealsStore.upsert({ id: appealId, caseNotes: updatedNotes });
                    
                    UI.showToast("تم الحذف بنجاح", "success");
                    AppealsModule.renderDashNotes(updatedNotes);
                } catch(error) {
                    console.error('Delete note failed', error);
                    UI.showToast("خطأ أثناء الحذف", "error");
                }
            });
        });
    }
};

window.AppealsModule = AppealsModule;
