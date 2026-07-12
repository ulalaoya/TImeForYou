// עזרי טקסט בעברית — משך ומחיר.

// slotCount (משבצות של חצי שעה) -> תיאור עם מספר, למשל "1.5 שעות", "5 שעות"
export function durationLabel(slotCount) {
  if (slotCount === 1) return 'חצי שעה';
  const hours = slotCount / 2;
  if (hours === 1) return 'שעה';
  return `${hours} שעות`;
}

// מחיר לפי מספר משבצות ומחיר לשעה
export function priceFor(slotCount, pricePerHourILS) {
  return Math.round((slotCount / 2) * pricePerHourILS);
}

export function shekel(n) {
  return `${n} ₪`;
}
