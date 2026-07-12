import React, { useState } from 'react';
import { useApp } from '../AppContext.js';
import { assetUrl, avatarUrl } from '../utils/assets.js';
import { createFamily, findFamilyByPhone } from '../data/index.js';
import { Toast } from '../components/common.jsx';

function validPhone(p) {
  const digits = String(p).replace(/\D/g, '');
  return digits.length >= 9 && digits.length <= 11;
}

export default function Onboarding() {
  const { manifest, setIdentity } = useApp();
  const [mode, setMode] = useState('welcome'); // welcome | register | login
  const [toast, setToast] = useState('');

  const show = (m) => { setToast(m); setTimeout(() => setToast(''), 2600); };

  return (
    <div className="screen no-nav center-col">
      <img className="logo-full" src={assetUrl('logo-wordmark.png')} alt="TimeForYou" />
      <div className="slogan" style={{ marginBottom: 18 }}>את רגועה, הם שמחים 💛</div>

      {mode === 'welcome' && (
        <Welcome onRegister={() => setMode('register')} onLogin={() => setMode('login')} />
      )}
      {mode === 'register' && (
        <Register manifest={manifest} setIdentity={setIdentity} onBack={() => setMode('welcome')} show={show} />
      )}
      {mode === 'login' && (
        <Login setIdentity={setIdentity} onBack={() => setMode('welcome')} show={show} />
      )}

      {toast && <Toast>{toast}</Toast>}
    </div>
  );
}

function Welcome({ onRegister, onLogin }) {
  return (
    <div className="card" style={{ width: '100%' }}>
      <h2>ברוכים הבאים! 👋</h2>
      <p>רוני שומרת על הילדים כשאתם בבית — כדי שיהיה לכם קצת זמן לעצמכם.</p>
      <button className="btn block lg heart" onClick={onRegister} style={{ marginBottom: 12 }}>
        רישום חדש ✨
      </button>
      <button className="btn block ghost" onClick={onLogin}>
        כבר נרשמנו — כניסה עם מספר טלפון
      </button>
      <div className="divider-btn">
        <button className="link-btn" onClick={() => { window.location.hash = '#/roni'; }}>
          כניסת רוני 🔑
        </button>
      </div>
    </div>
  );
}

function Register({ manifest, setIdentity, onBack, show }) {
  const [f, setF] = useState({ childName: '', parentName: '', address: '', phone: '', email: '', notes: '' });
  const [avatarId, setAvatarId] = useState(null);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  function validate() {
    const er = {};
    if (!f.childName.trim()) er.childName = 'צריך למלא את שם הילד/ה 🙂';
    if (!f.parentName.trim()) er.parentName = 'ומה שם ההורה?';
    if (!f.address.trim()) er.address = 'לאן רוני מגיעה?';
    if (!validPhone(f.phone)) er.phone = 'מספר טלפון לא תקין (לפחות 9 ספרות)';
    if (!avatarId) er.avatar = 'בחרו אווטאר לילד/ה 👇';
    setErrors(er);
    return Object.keys(er).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    setBusy(true);
    try {
      const existing = await findFamilyByPhone(f.phone);
      if (existing) {
        show('המספר הזה כבר רשום — נכניס אתכם 🙂');
        setIdentity(existing);
        return;
      }
      const fam = await createFamily({ ...f, avatarId });
      setIdentity(fam);
    } catch (e) {
      show('אופס, משהו השתבש. נסו שוב 🙈');
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ width: '100%', textAlign: 'start' }}>
      <h2>רישום הילד/ה 🧸</h2>

      <Field label="שם הילד/ה" req err={errors.childName}>
        <input value={f.childName} onChange={set('childName')} placeholder="לדוגמה: מאיה" />
      </Field>
      <Field label="שם ההורה" req err={errors.parentName}>
        <input value={f.parentName} onChange={set('parentName')} placeholder="השם שלך" />
      </Field>
      <Field label="כתובת" req err={errors.address}>
        <input value={f.address} onChange={set('address')} placeholder="רחוב ומספר, עיר" />
      </Field>
      <Field label="טלפון" req err={errors.phone}>
        <input value={f.phone} onChange={set('phone')} inputMode="tel" placeholder="050-0000000" />
      </Field>
      <Field label="מייל (לתזכורות בעתיד)" err={errors.email}>
        <input value={f.email} onChange={set('email')} inputMode="email" placeholder="רשות" />
      </Field>
      <Field label="הערות (אלרגיות, דברים שחשוב לדעת)">
        <textarea value={f.notes} onChange={set('notes')} placeholder="רשות" />
      </Field>

      <div className="field">
        <label>בחירת אווטאר <span className="req">*</span></label>
        {errors.avatar && <div className="err" style={{ marginBottom: 6 }}>{errors.avatar}</div>}
        <div className="avatar-grid">
          {manifest?.avatars.map((a) => (
            <button
              type="button"
              key={a.id}
              className={`avatar-pick ${avatarId === a.id ? 'selected' : ''}`}
              onClick={() => setAvatarId(a.id)}
              aria-label={`אווטאר ${a.label || a.id}`}
              aria-pressed={avatarId === a.id}
            >
              {/* התמונה דקורטיבית — השם הנגיש נמצא על הכפתור */}
              <img src={avatarUrl(a.id, manifest)} alt="" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>

      <button className="btn block lg heart" disabled={busy} onClick={submit} style={{ marginTop: 8 }}>
        {busy ? 'רק רגע…' : 'סיימנו, בואו נתחיל! 🎉'}
      </button>
      <div className="divider-btn">
        <button className="link-btn" onClick={onBack}>חזרה</button>
      </div>
    </div>
  );
}

function Login({ setIdentity, onBack, show }) {
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!validPhone(phone)) { show('מספר טלפון לא תקין'); return; }
    setBusy(true);
    try {
      const fam = await findFamilyByPhone(phone);
      if (!fam) { show('לא מצאנו משפחה עם המספר הזה 🤔'); setBusy(false); return; }
      setIdentity(fam);
    } catch (e) {
      show('אופס, משהו השתבש 🙈');
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ width: '100%', textAlign: 'start' }}>
      <h2>כניסה 🔑</h2>
      <p>הזינו את מספר הטלפון שאיתו נרשמתם.</p>
      <Field label="טלפון" req>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="050-0000000" />
      </Field>
      <button className="btn block lg" disabled={busy} onClick={submit}>
        {busy ? 'בודקים…' : 'כניסה'}
      </button>
      <div className="divider-btn">
        <button className="link-btn" onClick={onBack}>חזרה</button>
      </div>
    </div>
  );
}

function Field({ label, req, err, children }) {
  return (
    <div className="field">
      <label>{label} {req && <span className="req">*</span>}</label>
      {children}
      {err && <div className="err">{err}</div>}
    </div>
  );
}
