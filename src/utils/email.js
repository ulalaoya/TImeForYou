// שליחת מייל אישור להורה כשרוני מאשרת תור, דרך EmailJS REST (ללא תלות ב-SDK).
import { emailConfig } from '../emailConfig.js';

export function isEmailEnabled() {
  return Boolean(emailConfig.serviceId && emailConfig.templateId && emailConfig.publicKey);
}

// שולח מייל אישור. מחזיר true אם נשלח, false אחרת (כולל כשאין הגדרה או אין מייל).
export async function sendApprovalEmail(booking, family) {
  if (!isEmailEnabled() || !family || !family.email) return false;
  const params = {
    to_email: family.email,
    parent_name: family.parentName || '',
    child_name: family.childName || '',
    date: booking.date,
    start_time: booking.startTime,
    end_time: booking.endTime,
    price: booking.priceILS,
    address: family.address || '',
  };
  try {
    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: emailConfig.serviceId,
        template_id: emailConfig.templateId,
        user_id: emailConfig.publicKey,
        template_params: params,
      }),
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}
