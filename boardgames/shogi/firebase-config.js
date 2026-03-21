// Firebase 設定
// オセロ共通プロジェクト (othello-match) を使用
// 将棋のオンライン対戦もこのプロジェクトで管理
// 本番環境ではセキュリティルールを設定してください

console.log('firebase-config.js loading...');
console.log('firebase object available:', typeof firebase);

const firebaseConfig = {
    apiKey: "AIzaSyAr4rbfvOjtJD2SLOH5Gd8xsnkatVFS8RE",
    authDomain: "othello-match.firebaseapp.com",
    projectId: "othello-match",
    storageBucket: "othello-match.firebasestorage.app",
    messagingSenderId: "73574530386",
    appId: "1:73574530386:web:936eefc2564130c5784e8b",
    measurementId: "G-DHSYLYV3CR"
};

// Firebase初期化
window.firebaseInitReady = new Promise((resolve, reject) => {
    try {
        if (typeof firebase === 'undefined') {
            console.error('Firebase SDK not loaded');
            reject('Firebase SDK not loaded');
            return;
        }
        
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        window.db = firebase.firestore();
        console.log('✓ Firebase initialized successfully');
        console.log('✓ Firestore database available:', window.db !== undefined);
        resolve(true);
    } catch (error) {
        console.error('✗ Firebase initialization error:', error);
        reject(error);
    }
});
