// שגיאה ייעודית למצב "המשבצת נתפסה" — ה-UI מציג הודעה ידידותית ומרענן.
export class SlotTakenError extends Error {
  constructor(message = 'slot taken') {
    super(message);
    this.name = 'SlotTakenError';
    this.slotTaken = true;
  }
}
