// ─────────────────────────────────────────────────────────────────────────────
//  שליחת מייל אישור להורה כשרוני מאשרת תור — דרך EmailJS (חינמי, ללא שרת).
//
//  הפעלה (חד-פעמי, ~5 דקות):
//  1. פותחים חשבון חינמי ב-https://www.emailjs.com
//  2. Email Services → Add service (למשל Gmail) → מעתיקים את ה-Service ID
//  3. Email Templates → Create template. בתוכן ההודעה משתמשים במשתנים:
//     {{to_email}} {{parent_name}} {{child_name}} {{date}} {{start_time}}
//     {{end_time}} {{price}} {{address}}
//     ובשדה "To email" של התבנית שמים {{to_email}}. מעתיקים את ה-Template ID.
//  4. Account → מעתיקים את ה-Public Key.
//  5. מדביקים את שלושת הערכים כאן. כל עוד הם ריקים — לא נשלח מייל (האישור עדיין עובד).
// ─────────────────────────────────────────────────────────────────────────────

export const emailConfig = {
  serviceId: '',
  templateId: '',
  publicKey: '',
};
