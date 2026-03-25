import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBFp4eAO3_VVXBIJLmZ7uSUed3mfzmAC6c",
  authDomain: "casesmanagment-db907.firebaseapp.com",
  projectId: "casesmanagment-db907",
  storageBucket: "casesmanagment-db907.firebasestorage.app",
  messagingSenderId: "931023597220",
  appId: "1:931023597220:web:05d5efb19e9330d56ec031"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// One-time developer configuration for cloud providers.
// End users should only use the connect/disconnect buttons from the admin screen.
export const cloudOAuthConfig = {
  googleClientId: '307661492912-50gael7mr76n0d1f4fmetq7n3tl51vjc.apps.googleusercontent.com',
  googleApiKey: 'AIzaSyBw92wqgtKPIFSf6VYP4G7ntbm4tH5ZZAs',
  googleAppId: '644227108524-9j2m2aesb34l28eb0buku6ev7a3p9qml.apps.googleusercontent.com',
  googleFolderId: '',
  oneDriveClientId: '',
  oneDriveTenantId: 'common',
  oneDriveFolderPath: ''
};
