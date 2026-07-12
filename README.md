# TimeForYou 📅💛

> "את רגועה, הם שמחים" — אפליקציית PWA להזמנת שירותי בייביסיטר של רוני (בת 11).

אפליקציה בעברית, RTL, mobile-first. ההורים קובעים תור ביומן, רוני מגיעה ומעסיקה את הילדים **כשההורים בבית**.

## הרצה מקומית

```bash
npm install
npm run dev       # שרת פיתוח (http://localhost:5173)
npm run build     # בנייה לפרודקשן -> dist/
npm run preview   # תצוגה מקדימה של הבנייה
npm run slice     # חיתוך מחדש של נכסי הגרפיקה מהגיליון
```

ללא הגדרת Firebase, האפליקציה רצה ב**מצב הדגמה מקומי** (localStorage) — אפשר להתנסות בכל הזרימות מיד.

## חיבור Firebase (אופציונלי)

1. פתחו פרויקט חדש ב-[Firebase Console](https://console.firebase.google.com).
2. הפעילו **Firestore Database** (מצב Production / Spark חינמי).
3. הוסיפו אפליקציית Web ‏(</>) והעתיקו את אובייקט `firebaseConfig`.
4. הדביקו אותו בקובץ `src/firebaseConfig.js` (במקום האובייקט הריק).
5. (אופציונלי) צרו מסמך `config/app` ב-Firestore. אם הוא חסר — ייעשה שימוש בברירות המחדל:

```
config/app  { roniPin: "1234", pricePerHourILS: 20,
              regularHours: {start:"08:00", end:"16:00"},
              specialPeriods: [{from:"2026-07-12", to:"2026-07-23", start:"14:00", end:"16:00"}] }
```

ברגע ש-`apiKey` קיים — האפליקציה עוברת אוטומטית לעבוד מול Firestore (עם `onSnapshot` בזמן אמת
ויצירת הזמנה בטרנזקציה שמונעת כפילויות).

### כללי אבטחה מוצעים (Firestore Rules)

מודל אמון פשוט המתאים לשירות שכונתי: קריאה/כתיבה פתוחות ל-`bookings`,‏ `families`,‏ `slots`;
‏`config` לקריאה בלבד מהקליינט.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{db}/documents {
    match /config/{doc}   { allow read: if true; allow write: if false; }
    match /families/{doc} { allow read, write: if true; }
    match /bookings/{doc} { allow read, write: if true; }
    match /slots/{doc}    { allow read, write: if true; }
  }
}
```

## פריסה ל-GitHub Pages — צעד אחר צעד (גם למי שלא מתכנת/ת)

1. פתחו חשבון ב-[github.com](https://github.com) (אם אין) והתחברו.
2. לחצו על **+** (למעלה מימין) → **New repository** → שם: `timeforyou` → **Public** → **Create repository**.
3. במחשב, בתיקיית הפרויקט, הריצו בטרמינל (החליפו `USERNAME` בשם המשתמש שלכם):
   ```bash
   git remote add origin https://github.com/USERNAME/timeforyou.git
   git push -u origin main
   ```
4. בדף הריפו ב-GitHub: **Settings → Pages → Source: GitHub Actions**.
5. המתינו כ-2 דקות שה-workflow (ב-`.github/workflows/deploy.yml`) יבנה ויפרסם — הקישור יופיע
   ב-**Settings → Pages** וייראה כך: `https://USERNAME.github.io/timeforyou/`.
6. את הקישור הזה שולחים להורים 🎉

### התקנה על הטלפון (להורים)

- **אנדרואיד (Chrome):** פותחים את הקישור → תפריט ⋮ → **הוספה למסך הבית**.
- **אייפון (Safari):** פותחים את הקישור → כפתור שיתוף (ריבוע עם חץ) → **הוסף למסך הבית**.

האפליקציה תופיע עם אייקון TimeForYou כמו אפליקציה רגילה.

### החלפת הקוד הסודי של רוני

ברירת המחדל היא `1234`. כדי להחליף: ב-Firebase Console → Firestore → צרו/ערכו מסמך
`config/app` עם שדה `roniPin` (מחרוזת, למשל `"7391"`). בלי Firebase (מצב הדגמה) הקוד הוא `1234`.

### כפתור "עדכנו את רוני בוואטסאפ"

אחרי שהורה קובע תור, מופיע כפתור שפותח הודעת וואטסאפ מוכנה לרוני עם פרטי התור.
כדי שהוא יופיע צריך להגדיר את **מספר הוואטסאפ של רוני**:

- **עם Firebase:** במסמך `config/app`, שדה `roniPhone` (למשל `"0501234567"`).
- **בלי Firebase / לבדיקה מהירה:** ערכו את ברירת המחדל ב-`src/data/defaults.js`
  (שדה `roniPhone`).

המספר יכול להיות בפורמט ישראלי רגיל (`0501234567`) והמערכת ממירה אותו אוטומטית לפורמט
הבינלאומי של וואטסאפ. אם השדה ריק — הכפתור פשוט לא מוצג.

`vite.config.js` מוגדר עם `base: './'` (נתיבים יחסיים), כך שהאתר עובד תחת כל שם ריפו,
והראוטינג מבוסס-hash כדי לתמוך ב-refresh בכל מסך.

## PWA

`public/manifest.webmanifest` + service worker (‏`public/sw.js`,‏ נרשם בפרודקשן בלבד):
cache-first לנכסים, network-first לשאר. ניתן להתקנה על אנדרואיד/iOS ("הוסף למסך הבית").

## מבנה

```
public/assets/         נכסים חתוכים + manifest.json (27 אווטארים, אייקונים)
scripts/slice-assets.mjs   סקריפט חיתוך הגיליון
src/
  data/                שכבת נתונים (adapter: firestore / local) + פלטת צבעים
  utils/               חישובי זמן/משבצות, נכסים, פורמט עברי
  components/          רכיבים משותפים + יומנים
  screens/             מסכים (רישום, בית, הזמנה, התורים שלי, פרופיל, רוני)
```
