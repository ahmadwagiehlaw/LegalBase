import { auth, db, firebaseEnabled, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, doc, getDoc, setDoc } from './FirebaseConfig.js';

const AUTH_UNAVAILABLE_ERROR = 'خدمة تسجيل الدخول غير مهيأة بعد. أضف مفاتيح Firebase محليًا في js/runtime-config.js أو عبر localStorage.';

export class AuthService {
    constructor(onAuthStateChange) {
        this.currentUser = null;
        this.userProfile = null; // Contains role, teamId, etc.
        this.onAuthStateChange = onAuthStateChange; // Callback when auth state resolves

        this.init();
    }

    init() {
        if (!firebaseEnabled || !auth) {
            this.onAuthStateChange(null, null);
            return;
        }

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                this.currentUser = user;
                // Fetch user profile from Firestore
                await this.fetchUserProfile(user.uid);
            } else {
                this.currentUser = null;
                this.userProfile = null;
                this.onAuthStateChange(null, null);
            }
        });
    }

    async fetchUserProfile(uid) {
        if (!firebaseEnabled || !db) {
            this.onAuthStateChange(null, null);
            return;
        }

        try {
            const userRef = doc(db, 'users', uid);
            const userSnap = await getDoc(userRef);
            
            if (userSnap.exists()) {
                this.userProfile = userSnap.data();
            } else {
                // If the user document doesn't exist, create it with 'pending' status
                const defaultProfile = {
                    email: this.currentUser.email,
                    role: 'pending', // 'admin', 'user', 'pending'
                    teamId: null, // Null until assigned or if they create a team
                    createdAt: new Date().toISOString()
                };
                await setDoc(userRef, defaultProfile);
                this.userProfile = defaultProfile;
            }
            
            this.onAuthStateChange(this.currentUser, this.userProfile);
        } catch (error) {
            console.error("Error fetching user profile:", error);
            this.onAuthStateChange(null, null);
        }
    }

    async login(email, password) {
        if (!firebaseEnabled || !auth) {
            return { success: false, error: AUTH_UNAVAILABLE_ERROR };
        }

        try {
            await signInWithEmailAndPassword(auth, email, password);
            return { success: true };
        } catch (error) {
            console.error(error);
            return { success: false, error: 'البريد الإلكتروني أو كلمة المرور خاطئة.' };
        }
    }

    async register(email, password) {
        if (!firebaseEnabled || !auth) {
            return { success: false, error: AUTH_UNAVAILABLE_ERROR };
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            // Profile creation is handled automatically in onAuthStateChanged
            return { success: true };
        } catch (error) {
            console.error(error);
            return { success: false, error: 'تعذر إنشاء الحساب. قد يكون مسجلاً بالفعل أو كلمة المرور ضعيفة.' };
        }
    }

    async logout() {
        if (!firebaseEnabled || !auth) return;
        await signOut(auth);
    }
}
