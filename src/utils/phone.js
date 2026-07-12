// נרמול מספר טלפון להשוואה — ספרות בלבד.
// "050-123 4567" -> "0501234567". שדה התצוגה (phone) נשמר כפי שהוקלד.
export function normalizePhone(p) {
  return String(p ?? '').replace(/\D/g, '');
}
