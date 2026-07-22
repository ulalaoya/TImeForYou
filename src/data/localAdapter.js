// מתאם מקומי — "מצב הדגמה". אותה API כמו firestoreAdapter, מגובה ב-localStorage.
import { DEFAULT_APP_CONFIG } from './defaults.js';
import { pickColorId } from './colors.js';
import { endTimeFor, bookingOccupiedTimes } from '../utils/time.js';
import { isActiveStatus } from '../utils/status.js';
import { normalizePhone } from '../utils/phone.js';
import { SlotTakenError } from './errors.js';

const KEY = 'tfy_store_v1';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* ignore */ }
  return { families: [], bookings: [] };
}

function save(store) {
  localStorage.setItem(KEY, JSON.stringify(store));
}

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ── מנוי ורענון ──────────────────────────────────────────────────────────────
const listeners = new Set();
function notifyAll() {
  for (const l of listeners) l();
}
if (typeof window !== 'undefined') {
  window.addEventListener('focus', notifyAll);
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) notifyAll();
  });
}

// ── API ──────────────────────────────────────────────────────────────────────

export async function getAppConfig() {
  const store = load();
  return { ...DEFAULT_APP_CONFIG, ...(store.config || {}) };
}

// עדכון תצורת האפליקציה (למשל חסימות של רוני). מחזיר את התצורה המלאה המעודכנת.
export async function updateAppConfig(patch) {
  const store = load();
  store.config = { ...(store.config || {}), ...patch };
  save(store);
  notifyAll();
  return { ...DEFAULT_APP_CONFIG, ...store.config };
}

export async function findFamilyByPhone(phone) {
  const store = load();
  const norm = normalizePhone(phone);
  if (!norm) return null;
  // התאמה לפי ספרות בלבד; fallback ל-phone עבור רשומות ישנות ללא phoneKey
  return store.families.find((f) => (f.phoneKey || normalizePhone(f.phone)) === norm) || null;
}

export async function getFamilyById(id) {
  const store = load();
  return store.families.find((f) => f.id === id) || null;
}

export async function createFamily(data) {
  const store = load();
  const usedColors = store.families.map((f) => f.colorId);
  const family = {
    id: uid('fam'),
    childName: data.childName,
    parentName: data.parentName,
    address: data.address,
    phone: String(data.phone).trim(), // תצוגה — כפי שהוקלד (לקישורי tel: ול-UI)
    phoneKey: normalizePhone(data.phone), // ספרות בלבד — לחיפוש בכניסה
    email: data.email || '',
    notes: data.notes || '',
    avatarId: data.avatarId,
    colorId: pickColorId(usedColors),
    createdAt: Date.now(),
  };
  store.families.push(family);
  save(store);
  return family;
}

export async function updateFamily(id, patch) {
  const store = load();
  const f = store.families.find((x) => x.id === id);
  if (!f) throw new Error('family not found');
  Object.assign(f, patch);
  save(store);
  notifyAll();
  return f;
}

// עדכון שדות דה-נורמליזציה (שם/אווטאר) על כל תורי המשפחה — כדי שגם תורים קיימים
// ישקפו את השינוי (למשל אצל רוני ביומן).
export async function updateFamilyBookings(familyId, patch) {
  const store = load();
  for (const b of store.bookings) {
    if (b.familyId === familyId) Object.assign(b, patch);
  }
  save(store);
  notifyAll();
}

export async function getBookingsInRange(fromDate, toDate) {
  const store = load();
  return store.bookings
    .filter((b) => b.date >= fromDate && b.date <= toDate)
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
}

// בדיקת פנויות סינכרונית + כתיבה
export async function createBooking(data) {
  const store = load();
  const endTime = endTimeFor(data.startTime, data.slotCount);
  const occupied = new Set(bookingOccupiedTimes(data.startTime, data.slotCount));

  // בדיקה שכל המשבצות עדיין פנויות (רק הזמנות פעילות באותו יום)
  for (const b of store.bookings) {
    if (b.date !== data.date || !isActiveStatus(b.status)) continue;
    for (const t of bookingOccupiedTimes(b.startTime, b.slotCount)) {
      if (occupied.has(t)) throw new SlotTakenError();
    }
  }

  const booking = {
    id: uid('bk'),
    familyId: data.familyId,
    date: data.date,
    startTime: data.startTime,
    endTime,
    slotCount: data.slotCount,
    priceILS: data.priceILS,
    status: 'pending',
    createdAt: Date.now(),
    childName: data.childName,
    avatarId: data.avatarId,
    colorId: data.colorId,
  };
  store.bookings.push(booking);
  save(store);
  notifyAll();
  return booking;
}

export async function cancelBooking(id) {
  const store = load();
  const b = store.bookings.find((x) => x.id === id);
  if (!b) throw new Error('booking not found');
  b.status = 'cancelled';
  b.cancelledAt = Date.now();
  save(store);
  notifyAll();
  return b;
}

// אישור הזמנה ע"י רוני: pending -> approved
export async function approveBooking(id) {
  const store = load();
  const b = store.bookings.find((x) => x.id === id);
  if (!b) throw new Error('booking not found');
  if (b.status === 'pending') {
    b.status = 'approved';
    b.approvedAt = Date.now();
    save(store);
    notifyAll();
  }
  return b;
}

// עדכון הזמנה קיימת (עריכה ע"י ההורה). משחרר את המשבצות הישנות,
// מוודא שהחדשות פנויות (למעט חפיפה עם ההזמנה עצמה), ומחזיר ל-pending לאישור מחדש.
export async function updateBooking(id, { date, startTime, slotCount, priceILS }) {
  const store = load();
  const b = store.bookings.find((x) => x.id === id);
  if (!b) throw new Error('booking not found');
  const endTime = endTimeFor(startTime, slotCount);
  const occupied = new Set(bookingOccupiedTimes(startTime, slotCount));

  // בדיקת פנויות מול שאר ההזמנות הפעילות (לא כולל ההזמנה הנוכחית)
  for (const other of store.bookings) {
    if (other.id === id) continue;
    if (other.date !== date || !isActiveStatus(other.status)) continue;
    for (const t of bookingOccupiedTimes(other.startTime, other.slotCount)) {
      if (occupied.has(t)) throw new SlotTakenError();
    }
  }

  b.date = date;
  b.startTime = startTime;
  b.endTime = endTime;
  b.slotCount = slotCount;
  b.priceILS = priceILS;
  b.status = 'pending';
  b.updatedAt = Date.now();
  save(store);
  notifyAll();
  return b;
}

export async function markCancellationSeen(id) {
  const store = load();
  const b = store.bookings.find((x) => x.id === id);
  if (!b) throw new Error('booking not found');
  b.status = 'cancelled_seen';
  b.seenAt = Date.now();
  save(store);
  notifyAll();
  return b;
}

// מנוי: מרענן אחרי כל מוטציה ובעת focus על החלון
export function subscribeBookings(fromDate, toDate, cb) {
  const run = () => {
    getBookingsInRange(fromDate, toDate).then(cb);
  };
  listeners.add(run);
  run();
  return () => listeners.delete(run);
}
