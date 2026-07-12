// עזרי טקסט בעברית — משך ומחיר.

const WHOLE = {
  1: 'שעה', 2: 'שעתיים', 3: 'שלוש שעות', 4: 'ארבע שעות',
  5: 'חמש שעות', 6: 'שש שעות', 7: 'שבע שעות', 8: 'שמונה שעות',
};

// slotCount (משבצות של חצי שעה) -> תיאור עברי, למשל "שעה וחצי"
export function durationLabel(slotCount) {
  const whole = Math.floor(slotCount / 2);
  const half = slotCount % 2 === 1;
  if (whole === 0) return 'חצי שעה';
  const w = WHOLE[whole] || `${whole} שעות`;
  return half ? `${w} וחצי` : w;
}

// מחיר לפי מספר משבצות ומחיר לשעה
export function priceFor(slotCount, pricePerHourILS) {
  return Math.round((slotCount / 2) * pricePerHourILS);
}

export function shekel(n) {
  return `${n} ₪`;
}
