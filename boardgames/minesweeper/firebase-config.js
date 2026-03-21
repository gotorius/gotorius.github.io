// Firebase 設定（フリーセルと同じプロジェクトを使用）
const firebaseConfig = {
    apiKey: "AIzaSyC8ekdJYar4iiPJWh7QQivHdfMqNcK7iIo",
    authDomain: "freecell-ranking.firebaseapp.com",
    projectId: "freecell-ranking",
    storageBucket: "freecell-ranking.firebasestorage.app",
    messagingSenderId: "481527048040",
    appId: "1:481527048040:web:06fbd035e8eaef89eed8dd",
    measurementId: "G-XNWGTR4CBK"
};

// Firebase初期化
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
