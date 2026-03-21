// Firebase設定（オセロ・将棋・五目並べと同じプロジェクト）
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
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
