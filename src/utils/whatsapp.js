// בניית קישור וואטסאפ לעדכון רוני על תור שנקבע.
import { normalizePhone } from './phone.js';
import { DAY_NAMES_HE, fromISODate, formatDateHe, endTimeFor } from './time.js';
import { durationLabel, shekel } from './format.js';

// ממיר מספר ישראלי לפורמט בינלאומי לוואטסאפ:
// '0501234567' -> '972501234567'; '972...' נשאר; מספר ריק/לא תקין -> ''.
export function toWaNumber(phone) {
  const digits = normalizePhone(phone);
  if (!digits) return '';
  if (digits.startsWith('972')) return digits;
  if (digits.startsWith('0')) return `972${digits.slice(1)}`;
  return digits;
}

// בונה את הודעת העדכון לרוני עם פרטי התור והמשפחה.
export function bookingWaMessage(booking, family) {
  const d = fromISODate(booking.date);
  const end = booking.endTime || endTimeFor(booking.startTime, booking.slotCount);
  const lines = [
    'היי רוני! 😊 קבעתי תור דרך TimeForYou:',
    `👶 ${family.childName}`,
    `📅 יום ${DAY_NAMES_HE[d.getDay()]}, ${formatDateHe(d)}`,
    `🕐 ${booking.startTime}–${end} (${durationLabel(booking.slotCount)})`,
    `💰 ${shekel(booking.priceILS)}`,
  ];
  if (family.address) lines.push(`📍 ${family.address}`);
  lines.push(`— ${family.parentName}`);
  return lines.join('\n');
}

// קישור wa.me מלא, או '' אם אין מספר מוגדר.
export function bookingWaLink(booking, family, roniPhone) {
  const num = toWaNumber(roniPhone);
  if (!num) return '';
  return `https://wa.me/${num}?text=${encodeURIComponent(bookingWaMessage(booking, family))}`;
}
