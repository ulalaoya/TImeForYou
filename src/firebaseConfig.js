// ─────────────────────────────────────────────────────────────────────────────
//  הגדרות Firebase
//
//  כדי לחבר את האפליקציה ל-Firebase אמיתי (במקום "מצב הדגמה" המקומי):
//  1. היכנסו ל-https://console.firebase.google.com ופתחו פרויקט חדש.
//  2. הוסיפו אפליקציית Web (</>) והעתיקו את אובייקט ה-firebaseConfig.
//  3. הדביקו אותו כאן במקום האובייקט הריק שלמטה.
//  4. ב-Firestore צרו מסמך config/app (אופציונלי — אם חסר, ייעשה שימוש בברירות המחדל).
//
//  כל עוד האובייקט ריק (בלי apiKey), האפליקציה רצה במצב הדגמה מקומי (localStorage).
// ─────────────────────────────────────────────────────────────────────────────

export const firebaseConfig = {
  apiKey: "AIzaSyAZlxF0OJQo7ZITL0rRctAO8uoqqZJvJow",
  authDomain: "timeforyou-9a43d.firebaseapp.com",
  projectId: "timeforyou-9a43d",
  storageBucket: "timeforyou-9a43d.firebasestorage.app",
  messagingSenderId: "94559723099",
  appId: "1:94559723099:web:bd2b8d84e642c64bc2297e",
};

// true אם קיימת הגדרה אמיתית (יש apiKey)
export const hasFirebaseConfig = Boolean(firebaseConfig && firebaseConfig.apiKey);
