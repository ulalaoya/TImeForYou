// עזרי זמן ותאריך — כל חישובי המשבצות בצעדים של 30 דקות, לפי שעון המכשיר (ישראל).

export const SLOT_MINUTES = 30;
export const DAY_NAMES_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
export const DAY_SHORT_HE = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳'];
export const MONTH_NAMES_HE = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
];

// "HH:mm" -> דקות מתחילת היום
export function timeToMin(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

// דקות -> "HH:mm"
export function minToTime(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Date -> "YYYY-MM-DD" (מקומי, לא UTC)
export function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// "YYYY-MM-DD" -> Date (חצות מקומי)
export function fromISODate(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d, n) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

// יום ראשון של השבוע המכיל את התאריך
export function weekStartSunday(d) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  r.setDate(r.getDate() - r.getDay()); // getDay: ראשון=0
  return r;
}

// מחזיר את 5 ימי השבוע ראשון–חמישי כמערך Date
export function weekDaysSunThu(weekStart) {
  return [0, 1, 2, 3, 4].map((i) => addDays(weekStart, i));
}

// שבוע ברירת המחדל להצגה: בדרך כלל השבוע הנוכחי (ראשון),
// אבל אם כל ימי ההזמנה (ראשון–חמישי) כבר עברו — מדלגים לשבוע הבא.
// כלל: יום שישי(5)/שבת(6), או חמישי(4) אחרי שעת הסגירה → השבוע הבא.
export function defaultWeekStart(now = new Date(), config) {
  const start = weekStartSunday(now);
  const day = now.getDay(); // ראשון=0 .. שבת=6
  const endMin = timeToMin(config?.regularHours?.end || '16:00');
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (day === 5 || day === 6 || (day === 4 && nowMin >= endMin)) {
    return addDays(start, 7);
  }
  return start;
}

export function formatDateHe(d) {
  return `${d.getDate()} ב${MONTH_NAMES_HE[d.getMonth()]} ${d.getFullYear()}`;
}

// האם תאריך (ISO) נופל בתוך תקופה מיוחדת; מחזיר את התקופה או null
export function specialPeriodFor(isoDate, config) {
  const periods = config?.specialPeriods || [];
  return periods.find((p) => isoDate >= p.from && isoDate <= p.to) || null;
}

// האם התאריך (ISO) חסום לחלוטין (יום חופשה) — נופל באחד מ-blockedRanges (כולל הקצוות)
export function isDateBlocked(isoDate, config) {
  const ranges = config?.blockedRanges || [];
  return ranges.some((r) => isoDate >= r.from && isoDate <= r.to);
}

// חסימות ידניות של רוני — טווחי תאריכים (ימים שלמים) או טווחי שעות שבהם אינה זמינה.
// כל חסימה מכסה טווח תאריכים from..to (כולל הקצוות); יום בודד = from===to.
//   { id, from:'YYYY-MM-DD', to:'YYYY-MM-DD', allDay:true }                 — ימים שלמים
//   { id, from:'YYYY-MM-DD', to:'YYYY-MM-DD', start:'HH:mm', end:'HH:mm' }  — טווח שעות בכל יום בטווח
// תאימות לאחור: חסימות ישנות עם שדה `date` בודד עדיין נתמכות.
const blockFrom = (bl) => bl.from || bl.date;
const blockTo = (bl) => bl.to || bl.from || bl.date;

// יום שלם חסום (חסימה ידנית מסוג allDay שנופלת על התאריך)
export function isDayManuallyBlocked(isoDate, config) {
  return (config?.blocks || []).some(
    (bl) => bl.allDay && isoDate >= blockFrom(bl) && isoDate <= blockTo(bl)
  );
}

// האם משבצת (יום+שעה) חסומה ע"י חסימה ידנית של רוני
export function isSlotBlocked(isoDate, time, config) {
  const tMin = timeToMin(time);
  return (config?.blocks || []).some((bl) => {
    if (isoDate < blockFrom(bl) || isoDate > blockTo(bl)) return false;
    if (bl.allDay) return true;
    return tMin >= timeToMin(bl.start) && tMin + SLOT_MINUTES <= timeToMin(bl.end);
  });
}

// כל שעות הגבול של היום (כולל שעת הסיום) — לבחירה בטפסים, למשל 08:00..16:00
export function dayBoundaryTimes(config) {
  const start = timeToMin(config.regularHours.start);
  const end = timeToMin(config.regularHours.end);
  const out = [];
  for (let m = start; m <= end; m += SLOT_MINUTES) out.push(minToTime(m));
  return out;
}

// שעות הפעילות הזמינות ליום נתון: {start, end}
export function bookableHoursFor(isoDate, config) {
  const sp = specialPeriodFor(isoDate, config);
  if (sp) return { start: sp.start, end: sp.end };
  return { start: config.regularHours.start, end: config.regularHours.end };
}

// כל שורות הזמן בגריד (לפי שעות רגילות) — למשל 08:00..15:30
export function gridRowTimes(config) {
  const start = timeToMin(config.regularHours.start);
  const end = timeToMin(config.regularHours.end);
  const rows = [];
  for (let m = start; m + SLOT_MINUTES <= end; m += SLOT_MINUTES) {
    rows.push(minToTime(m));
  }
  return rows;
}

// מצב משבצת ליום/שעה מסוימים, בהתחשב בתצורה ובזמן הנוכחי
// מחזיר: { locked (מחוץ לשעות זמינות), past }
export function slotState(isoDate, time, config, now = new Date()) {
  const tMin = timeToMin(time);
  const slotStart = fromISODate(isoDate);
  slotStart.setHours(Math.floor(tMin / 60), tMin % 60, 0, 0);
  const past = slotStart.getTime() <= now.getTime();

  // יום חסום לחלוטין — כל המשבצות נעולות
  if (isDateBlocked(isoDate, config)) return { locked: true, past };

  // חסימה ידנית של רוני — יום שלם או טווח שעות שסומן כלא-זמין
  if (isSlotBlocked(isoDate, time, config)) return { locked: true, past };

  const hours = bookableHoursFor(isoDate, config);
  const startMin = timeToMin(hours.start);
  const endMin = timeToMin(hours.end);
  // בר-הזמנה אם שעת ההתחלה בתוך [start, end-slot]
  const locked = tMin < startMin || tMin + SLOT_MINUTES > endMin;

  return { locked, past };
}

// כמה משבצות רצופות פנויות יש החל מ-time (עד סוף שעות היום, לפני משבצת תפוסה/עבר)
// busySet: Set של מחרוזות "HH:mm" תפוסות
export function maxRunFrom(isoDate, time, config, busySet, now = new Date()) {
  const hours = bookableHoursFor(isoDate, config);
  const endMin = timeToMin(hours.end);
  let count = 0;
  let m = timeToMin(time);
  while (m + SLOT_MINUTES <= endMin) {
    const t = minToTime(m);
    if (busySet.has(t)) break;
    const st = slotState(isoDate, t, config, now);
    if (st.locked || st.past) break;
    count += 1;
    m += SLOT_MINUTES;
  }
  return count;
}

// בהינתן התחלה ומספר משבצות -> endTime
export function endTimeFor(startTime, slotCount) {
  return minToTime(timeToMin(startTime) + slotCount * SLOT_MINUTES);
}

// קבוצת שעות התחלה תפוסות עבור הזמנה נתונה (כל המשבצות שהיא תופסת)
export function bookingOccupiedTimes(startTime, slotCount) {
  const out = [];
  let m = timeToMin(startTime);
  for (let i = 0; i < slotCount; i++) {
    out.push(minToTime(m));
    m += SLOT_MINUTES;
  }
  return out;
}
