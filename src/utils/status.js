// סטטוסים של הזמנה: pending (ממתין לאישור רוני) → approved (מאושר),
// ובנפרד cancelled → cancelled_seen. משבצת נחשבת תפוסה עבור כל הזמנה "פעילה".
export function isActiveStatus(s) {
  return s === 'pending' || s === 'approved';
}
