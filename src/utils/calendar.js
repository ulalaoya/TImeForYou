// יצירת אירוע יומן להזמנת בייביסיטר — קישור ליומן Google וגם קובץ ICS (אפל/אאוטלוק/כל יומן).
// כולל תזכורת יום לפני.

// "YYYY-MM-DD" + "HH:mm" -> "YYYYMMDDTHHMMSS" (זמן מקומי, אזור Asia/Jerusalem)
function stamp(date, time) {
  return `${date.replace(/-/g, '')}T${time.replace(':', '')}00`;
}

function eventTitle(family) {
  return `בייביסיטר עם רוני — ${family.childName}`;
}

function eventDetails(booking) {
  return `הזמנת בייביסיטר דרך TimeForYou.\nמחיר: ${booking.priceILS} ₪ · תשלום במזומן / Paybox`;
}

// קישור "הוספה ליומן Google". אם יש מייל — מוסיפים אותו כמוזמן, כך שהאירוע יגיע ליומן שלו.
export function googleCalUrl(booking, family) {
  const dates = `${stamp(booking.date, booking.startTime)}/${stamp(booking.date, booking.endTime)}`;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: eventTitle(family),
    dates,
    details: eventDetails(booking),
    location: family.address || '',
    ctz: 'Asia/Jerusalem',
  });
  let url = `https://calendar.google.com/calendar/render?${params.toString()}`;
  if (family.email) url += `&add=${encodeURIComponent(family.email)}`;
  return url;
}

// escaping לערכי טקסט ב-ICS
function esc(s) {
  return String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function icsForBooking(booking, family) {
  const uid = `tfy-${booking.id || Date.now()}@timeforyou`;
  const dtstamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TimeForYou//HE',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;TZID=Asia/Jerusalem:${stamp(booking.date, booking.startTime)}`,
    `DTEND;TZID=Asia/Jerusalem:${stamp(booking.date, booking.endTime)}`,
    `SUMMARY:${esc(eventTitle(family))}`,
    `LOCATION:${esc(family.address)}`,
    `DESCRIPTION:${esc(eventDetails(booking))}`,
    ...(family.email ? [`ORGANIZER;CN=${esc(family.parentName)}:mailto:${family.email}`] : []),
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    'DESCRIPTION:תזכורת: מחר בייביסיטר עם רוני',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.join('\r\n');
}

// מוריד/פותח את קובץ ה-ICS (בנייד נפתח ישירות באפליקציית היומן)
export function downloadIcs(booking, family) {
  const blob = new Blob([icsForBooking(booking, family)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'timeforyou.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
