// פלטה של 12 צבעים ייחודיים, מותאמים ליומן (border/text רווי + רקע בהיר).
// הצבע מוקצה אוטומטית ואקראית בזמן הרישום, ומשמש רק את היומן של רוני.
export const CHILD_COLORS = [
  { id: 'c01', border: '#E53935', bg: '#FFEBEE' }, // red
  { id: 'c02', border: '#8E24AA', bg: '#F5EAFB' }, // purple
  { id: 'c03', border: '#3949AB', bg: '#E8EAF6' }, // indigo
  { id: 'c04', border: '#1E88E5', bg: '#E3F2FD' }, // blue
  { id: 'c05', border: '#00897B', bg: '#E0F2F1' }, // teal
  { id: 'c06', border: '#43A047', bg: '#E8F5E9' }, // green
  { id: 'c07', border: '#C0CA33', bg: '#F9FBE7' }, // lime
  { id: 'c08', border: '#FB8C00', bg: '#FFF3E0' }, // orange
  { id: 'c09', border: '#F4511E', bg: '#FBE9E7' }, // deep orange
  { id: 'c10', border: '#6D4C41', bg: '#EFEBE9' }, // brown
  { id: 'c11', border: '#D81B60', bg: '#FCE4EC' }, // pink
  { id: 'c12', border: '#00ACC1', bg: '#E0F7FA' }, // cyan
];

export function colorById(id) {
  return CHILD_COLORS.find((c) => c.id === id) || CHILD_COLORS[0];
}

// בוחר צבע אקראי שאינו בשימוש; אם כל 12 תפוסים — בוחר אקראי מהכול.
export function pickColorId(usedColorIds) {
  const used = new Set(usedColorIds);
  const free = CHILD_COLORS.filter((c) => !used.has(c.id));
  const pool = free.length > 0 ? free : CHILD_COLORS;
  return pool[Math.floor(Math.random() * pool.length)].id;
}
