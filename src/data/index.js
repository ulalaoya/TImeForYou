// נקודת כניסה יחידה לשכבת הנתונים. בוחר אוטומטית בין Firestore למצב הדגמה מקומי.
import { hasFirebaseConfig } from '../firebaseConfig.js';
import * as local from './localAdapter.js';

let adapter = local;
export const IS_DEMO = !hasFirebaseConfig;

// טעינת מתאם Firestore רק אם יש הגדרה אמיתית (טעינה עצלה כדי לא לייבא firebase לחינם)
export async function initData() {
  if (hasFirebaseConfig) {
    adapter = await import('./firestoreAdapter.js');
  }
  return adapter;
}

export const getAppConfig = (...a) => adapter.getAppConfig(...a);
export const findFamilyByPhone = (...a) => adapter.findFamilyByPhone(...a);
export const getFamilyById = (...a) => adapter.getFamilyById(...a);
export const createFamily = (...a) => adapter.createFamily(...a);
export const updateFamily = (...a) => adapter.updateFamily(...a);
export const updateFamilyBookings = (...a) => adapter.updateFamilyBookings(...a);
export const getBookingsInRange = (...a) => adapter.getBookingsInRange(...a);
export const createBooking = (...a) => adapter.createBooking(...a);
export const updateBooking = (...a) => adapter.updateBooking(...a);
export const cancelBooking = (...a) => adapter.cancelBooking(...a);
export const approveBooking = (...a) => adapter.approveBooking(...a);
export const markCancellationSeen = (...a) => adapter.markCancellationSeen(...a);
export const subscribeBookings = (...a) => adapter.subscribeBookings(...a);

export { SlotTakenError } from './errors.js';
