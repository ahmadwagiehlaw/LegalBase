import { auth } from './config.js';
import { signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { UI } from './ui.js';

export const AuthModule = {
    init: (onLogin, onLogout) => {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                document.getElementById('user-name').textContent = user.email.split('@')[0];
                onLogin(user);
            } else {
                onLogout();
            }
        });
        
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('login-email').value;
                const password = document.getElementById('login-password').value;
                const errorDiv = document.getElementById('auth-error');
                const btn = loginForm.querySelector('button');
                
                try {
                    errorDiv.textContent = '';
                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الدخول...';
                    
                    await signInWithEmailAndPassword(auth, email, password);
                    UI.showToast('تم تسجيل الدخول بنجاح', 'success');
                } catch (error) {
                    errorDiv.textContent = 'خطأ في البريد الإلكتروني أو كلمة المرور';
                    console.error(error);
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = 'دخول <i class="fas fa-sign-in-alt"></i>';
                }
            });
        }
        
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                signOut(auth);
            });
        }
    }
}
