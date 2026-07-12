// ברירות מחדל לתצורת האפליקציה — משמשות אם מסמך config/app חסר ב-Firestore,
// וגם כתצורה במצב ההדגמה המקומי.
export const DEFAULT_APP_CONFIG = {
  roniPin: '1234',
  pricePerHourILS: 20,
  regularHours: { start: '08:00', end: '16:00' },
  specialPeriods: [
    { from: '2026-07-12', to: '2026-07-23', start: '14:00', end: '16:00' },
  ],
};
