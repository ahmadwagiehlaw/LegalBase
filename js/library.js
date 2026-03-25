import { db } from './config.js';
import { collection, getDocs, addDoc, query, orderBy, serverTimestamp, where } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { UI } from './ui.js';

export const LibraryModule = {
    docs: [],
    
    init: async () => {
        LibraryModule.renderBaseUI();
        await LibraryModule.loadLibrary();
        LibraryModule.bindEvents();
    },

    renderBaseUI: () => {
        const container = document.getElementById('content-container');
        if (!container) return;
        
        container.innerHTML = `
            <div class="section-card" style="padding:0; overflow:hidden; border-radius:var(--radius-md); margin-bottom:30px;">
                <div style="background: linear-gradient(135deg, var(--nav-bg), #1e293b); padding:40px; text-align:center; color:white;">
                    <h2 style="color:var(--accent-color); margin-bottom:10px;">المكتبة القانونية والبحوث</h2>
                    <p style="font-size:1.1rem; opacity:0.8; margin-bottom:25px;">ابحث في آلاف القوانين، أحكام النقض، واللوائح التنظيمية</p>
                    <div style="max-width:600px; margin:0 auto; position:relative;">
                        <input type="text" id="library-search-input" placeholder="ابحث بالكلمة المفتاحية، رقم المادة، أو رقم الحكم..." style="width:100%; padding:15px 50px 15px 15px; border-radius:30px; border:none; font-size:1rem; box-shadow:var(--shadow-lg); background:white; color:var(--text-primary);">
                        <i class="fas fa-search" style="position:absolute; right:20px; top:50%; transform:translateY(-50%); color:var(--text-muted);"></i>
                    </div>
                </div>
            </div>

            <div class="actions-bar" style="display:flex; justify-content:flex-end; margin-bottom:20px;">
                <button id="add-lib-doc-btn" class="btn btn-primary"><i class="fas fa-plus"></i> إضافة مستند قانوني</button>
            </div>

            <div id="library-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:20px;">
                <div style="grid-column: 1/-1; text-align:center; padding:40px; color:var(--text-secondary);">
                    جاري تحميل المكتبة... <i class="fas fa-spinner fa-spin"></i>
                </div>
            </div>

            <!-- Add Doc Modal -->
            <div id="lib-doc-modal" class="modal-backdrop hidden" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.5); z-index:1000; display:flex; justify-content:center; align-items:center;">
                <div class="section-card modal-content" style="width: 90%; max-width: 500px; padding: 25px; border-radius: 12px;">
                    <h3>إضافة مستند للمكتبة</h3>
                    <form id="lib-doc-form" style="margin-top:20px;">
                        <div class="form-group">
                            <label>العنوان</label>
                            <input type="text" id="lib-title" required placeholder="مثال: قانون الإجراءات الجنائية">
                        </div>
                        <div class="form-group">
                            <label>التصنيف</label>
                            <select id="lib-category" required style="width:100%; padding:10px; border-radius:8px; background:var(--bg-color); color:var(--text-primary); border:1px solid var(--border-color);">
                                <option value="القانون المدني">القانون المدني</option>
                                <option value="القانون الجنائي">القانون الجنائي</option>
                                <option value="أحكام نقض">أحكام نقض</option>
                                <option value="تعليمات نيابة">تعليمات نيابة</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>رابط المستند / النص</label>
                            <textarea id="lib-content" required style="width:100%; min-height:100px; padding:10px; border-radius:8px; background:var(--bg-color); color:var(--text-primary); border:1px solid var(--border-color);"></textarea>
                        </div>
                        <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
                            <button type="button" id="close-lib-modal" class="btn" style="background:var(--text-muted); color:white;">إلغاء</button>
                            <button type="submit" class="btn btn-primary">إضافة للمكتبة</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
    },

    loadLibrary: async () => {
        try {
            const libRef = collection(db, "library");
            const q = query(libRef, orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            
            LibraryModule.docs = [];
            snapshot.forEach(doc => {
                LibraryModule.docs.push({ id: doc.id, ...doc.data() });
            });
            LibraryModule.renderGrid(LibraryModule.docs);
        } catch (error) {
            console.error("Error loading library", error);
            const grid = document.getElementById('library-grid');
            if(grid) grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:40px;">حدث خطأ أثناء تحميل المكتبة.</div>';
        }
    },

    renderGrid: (data) => {
        const grid = document.getElementById('library-grid');
        if (!grid) return;
        
        if (data.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding:40px;">المكتبة فارغة حالياً.</div>';
            return;
        }

        grid.innerHTML = data.map(doc => `
            <div class="section-card lib-card" style="padding:20px; border-top: 4px solid var(--accent-color); transition:var(--transition); cursor:pointer;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:15px;">
                    <span style="font-size:0.8rem; background:rgba(245, 158, 11, 0.1); color:var(--accent-color); padding:4px 10px; border-radius:15px; font-weight:bold;">${doc.category}</span>
                    <i class="fas fa-file-alt" style="color:var(--text-muted);"></i>
                </div>
                <h4 style="margin-bottom:10px; color:var(--text-primary);">${doc.title}</h4>
                <p style="font-size:0.9rem; color:var(--text-secondary); display:-webkit-box; -webkit-line-clamp:3; -webkit-box-orient:vertical; overflow:hidden;">${doc.content}</p>
                <div style="margin-top:20px; padding-top:15px; border-top:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:0.8rem; color:var(--text-muted);">${new Date(doc.createdAt?.toDate()).toLocaleDateString('ar-EG')}</span>
                    <button class="btn btn-sm" style="padding:5px 10px; font-size:0.8rem; background:var(--bg-color);">اقرأ المزيد</button>
                </div>
            </div>
        `).join('');
    },

    bindEvents: () => {
        const modal = document.getElementById('lib-doc-modal');
        document.getElementById('add-lib-doc-btn')?.addEventListener('click', () => modal.classList.remove('hidden'));
        document.getElementById('close-lib-modal')?.addEventListener('click', () => modal.classList.add('hidden'));
        
        document.getElementById('lib-doc-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const docData = {
                title: document.getElementById('lib-title').value,
                category: document.getElementById('lib-category').value,
                content: document.getElementById('lib-content').value,
                createdAt: serverTimestamp()
            };

            try {
                await addDoc(collection(db, "library"), docData);
                UI.showToast("تم إضافة المستند للمكتبة", "success");
                modal.classList.add('hidden');
                LibraryModule.loadLibrary();
            } catch (error) {
                console.error("Error saving doc", error);
                UI.showToast("حدث خطأ أثناء الحفظ", "error");
            }
        });

        document.getElementById('library-search-input')?.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = LibraryModule.docs.filter(d => 
                d.title.toLowerCase().includes(term) || d.content.toLowerCase().includes(term) || d.category.toLowerCase().includes(term)
            );
            LibraryModule.renderGrid(filtered);
        });
    }
};
