// מתאם Firestore — Web SDK v10 מודולרי. יצירת הזמנה רצה ב-runTransaction
// שבודקת מחדש שכל המשבצות עדיין פנויות לפני הכתיבה.
import { initializeApp } from 'firebase/app';
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, collection,
  query, where, getDocs, onSnapshot, runTransaction, serverTimestamp,
} from 'firebase/firestore';
import { firebaseConfig } from '../firebaseConfig.js';
import { DEFAULT_APP_CONFIG } from './defaults.js';
import { pickColorId } from './colors.js';
import { endTimeFor, bookingOccupiedTimes } from '../utils/time.js';
import { normalizePhone } from '../utils/phone.js';
import { SlotTakenError } from './errors.js';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function getAppConfig() {
  try {
    const snap = await getDoc(doc(db, 'config', 'app'));
    if (snap.exists()) return { ...DEFAULT_APP_CONFIG, ...snap.data() };
  } catch (e) { /* fall through to defaults */ }
  return { ...DEFAULT_APP_CONFIG };
}

export async function findFamilyByPhone(phone) {
  const norm = normalizePhone(phone);
  if (!norm) return null;
  // התאמה לפי ספרות בלבד — "050-1234567" ו-"0501234567" הם אותו מספר
  const q = query(collection(db, 'families'), where('phoneKey', '==', norm));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() };
}

export async function getFamilyById(id) {
  const snap = await getDoc(doc(db, 'families', id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createFamily(data) {
  // אוסף צבעים שכבר בשימוש כדי לא לחזור
  const famSnap = await getDocs(collection(db, 'families'));
  const usedColors = famSnap.docs.map((d) => d.data().colorId).filter(Boolean);
  const ref = doc(collection(db, 'families'));
  const family = {
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
  await setDoc(ref, family);
  return { id: ref.id, ...family };
}

export async function updateFamily(id, patch) {
  await updateDoc(doc(db, 'families', id), patch);
  return { id, ...patch };
}

// עדכון שדות דה-נורמליזציה (שם/אווטאר) על כל תורי המשפחה — כדי שגם תורים קיימים
// ישקפו את השינוי (למשל אצל רוני ביומן).
export async function updateFamilyBookings(familyId, patch) {
  const q = query(collection(db, 'bookings'), where('familyId', '==', familyId));
  const snap = await getDocs(q);
  await Promise.all(snap.docs.map((d) => updateDoc(d.ref, patch)));
}

export async function getBookingsInRange(fromDate, toDate) {
  const q = query(
    collection(db, 'bookings'),
    where('date', '>=', fromDate),
    where('date', '<=', toDate)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
}

export async function createBooking(data) {
  const endTime = endTimeFor(data.startTime, data.slotCount);
  const times = bookingOccupiedTimes(data.startTime, data.slotCount);
  const slotsRef = doc(db, 'slots', data.date);
  const bookingRef = doc(collection(db, 'bookings'));

  await runTransaction(db, async (tx) => {
    const slotsSnap = await tx.get(slotsRef);
    const occupied = slotsSnap.exists() ? { ...(slotsSnap.data().occupied || {}) } : {};
    for (const t of times) {
      if (occupied[t]) throw new SlotTakenError();
    }
    for (const t of times) occupied[t] = bookingRef.id;
    // כתיבה ללא merge — המסמך מכיל רק את השדה occupied, והחלפה מלאה
    // מבטיחה שמפתחות שנמחקו ייעלמו באמת (merge אינו מוחק מפתחות חסרים).
    tx.set(slotsRef, { occupied });
    tx.set(bookingRef, {
      familyId: data.familyId,
      date: data.date,
      startTime: data.startTime,
      endTime,
      slotCount: data.slotCount,
      priceILS: data.priceILS,
      status: 'pending',
      createdAt: Date.now(),
      serverCreatedAt: serverTimestamp(),
      childName: data.childName,
      avatarId: data.avatarId,
      colorId: data.colorId,
    });
  });

  return {
    id: bookingRef.id, ...data, endTime, status: 'pending', createdAt: Date.now(),
  };
}

// אישור הזמנה ע"י רוני: pending -> approved (התפוסה במסמך slots לא משתנה)
export async function approveBooking(id) {
  await updateDoc(doc(db, 'bookings', id), {
    status: 'approved',
    approvedAt: Date.now(),
  });
}

// עדכון הזמנה קיימת: משחרר את המשבצות הישנות, מוודא שהחדשות פנויות,
// וכותב מועד/משך/מחיר חדשים עם חזרה ל-pending לאישור מחדש.
export async function updateBooking(id, { date, startTime, slotCount, priceILS }) {
  const bookingRef = doc(db, 'bookings', id);
  const endTime = endTimeFor(startTime, slotCount);
  const newTimes = bookingOccupiedTimes(startTime, slotCount);

  await runTransaction(db, async (tx) => {
    // כל הקריאות לפני הכתיבות (דרישת טרנזקציות Firestore)
    const snap = await tx.get(bookingRef);
    if (!snap.exists()) throw new Error('booking not found');
    const b = snap.data();
    const oldDate = b.date;
    const sameDay = oldDate === date;
    const oldSlotsRef = doc(db, 'slots', oldDate);
    const newSlotsRef = doc(db, 'slots', date);
    const oldSlotsSnap = await tx.get(oldSlotsRef);
    const newSlotsSnap = sameDay ? null : await tx.get(newSlotsRef);

    const oldOccupied = oldSlotsSnap.exists() ? { ...(oldSlotsSnap.data().occupied || {}) } : {};
    // שחרור המשבצות הישנות של ההזמנה הזו
    for (const t of bookingOccupiedTimes(b.startTime, b.slotCount)) {
      if (oldOccupied[t] === id) delete oldOccupied[t];
    }

    if (sameDay) {
      for (const t of newTimes) { if (oldOccupied[t]) throw new SlotTakenError(); }
      for (const t of newTimes) oldOccupied[t] = id;
      tx.set(oldSlotsRef, { occupied: oldOccupied });
    } else {
      tx.set(oldSlotsRef, { occupied: oldOccupied });
      const newOccupied = newSlotsSnap.exists() ? { ...(newSlotsSnap.data().occupied || {}) } : {};
      for (const t of newTimes) { if (newOccupied[t]) throw new SlotTakenError(); }
      for (const t of newTimes) newOccupied[t] = id;
      tx.set(newSlotsRef, { occupied: newOccupied });
    }

    tx.update(bookingRef, {
      date, startTime, endTime, slotCount, priceILS,
      status: 'pending', updatedAt: Date.now(),
    });
  });

  return { id, date, startTime, endTime, slotCount, priceILS, status: 'pending' };
}

export async function cancelBooking(id) {
  const bookingRef = doc(db, 'bookings', id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(bookingRef);
    if (!snap.exists()) throw new Error('booking not found');
    const b = snap.data();
    const slotsRef = doc(db, 'slots', b.date);
    const slotsSnap = await tx.get(slotsRef);
    if (slotsSnap.exists()) {
      const occupied = { ...(slotsSnap.data().occupied || {}) };
      for (const t of bookingOccupiedTimes(b.startTime, b.slotCount)) {
        if (occupied[t] === id) delete occupied[t];
      }
      // ללא merge: החלפה מלאה כדי שהמשבצות שבוטלו ישוחררו באמת ב-Firestore
      tx.set(slotsRef, { occupied });
    }
    tx.update(bookingRef, { status: 'cancelled', cancelledAt: Date.now() });
  });
}

export async function markCancellationSeen(id) {
  await updateDoc(doc(db, 'bookings', id), {
    status: 'cancelled_seen',
    seenAt: Date.now(),
  });
}

export function subscribeBookings(fromDate, toDate, cb) {
  const q = query(
    collection(db, 'bookings'),
    where('date', '>=', fromDate),
    where('date', '<=', toDate)
  );
  return onSnapshot(q, (snap) => {
    const rows = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
    cb(rows);
  });
}
