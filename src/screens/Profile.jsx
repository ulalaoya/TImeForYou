import React, { useState } from 'react';
import { useApp } from '../AppContext.js';
import { Avatar, Toast, ConfirmDialog } from '../components/common.jsx';
import { updateFamily } from '../data/index.js';

export default function Profile({ navigate }) {
  const { family, setIdentity, clearIdentity } = useApp();
  const [edit, setEdit] = useState(false);
  const [f, setF] = useState({ ...family });
  const [toast, setToast] = useState('');
  const [confirmOut, setConfirmOut] = useState(false);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const show = (m) => { setToast(m); setTimeout(() => setToast(''), 2400); };

  async function save() {
    const patch = {
      childName: f.childName, parentName: f.parentName,
      address: f.address, phone: String(f.phone).trim(),
      email: f.email, notes: f.notes,
    };
    await updateFamily(family.id, patch);
    setIdentity({ ...family, ...patch });
    setEdit(false);
    show('הפרטים נשמרו 👍');
  }

  return (
    <div className="screen">
      <h1>הפרופיל שלנו 👨‍👩‍👧</h1>

      <div className="card center-col">
        <Avatar avatarId={family.avatarId} size={80} ring />
        <h2 style={{ marginTop: 10 }}>{family.childName}</h2>
        <p className="muted" style={{ marginBottom: 0 }}>המשפחה של {family.parentName}</p>
      </div>

      <div className="card" style={{ textAlign: 'start' }}>
        {edit ? (
          <>
            <Row label="שם הילד/ה"><input value={f.childName} onChange={set('childName')} /></Row>
            <Row label="שם ההורה"><input value={f.parentName} onChange={set('parentName')} /></Row>
            <Row label="כתובת"><input value={f.address} onChange={set('address')} /></Row>
            <Row label="טלפון"><input value={f.phone} onChange={set('phone')} inputMode="tel" /></Row>
            <Row label="מייל"><input value={f.email} onChange={set('email')} inputMode="email" /></Row>
            <Row label="הערות"><textarea value={f.notes} onChange={set('notes')} /></Row>
            <div className="btn-row" style={{ display: 'flex', gap: 10 }}>
              <button className="btn ghost" style={{ flex: 1 }} onClick={() => { setF({ ...family }); setEdit(false); }}>ביטול</button>
              <button className="btn green" style={{ flex: 1 }} onClick={save}>שמירה</button>
            </div>
          </>
        ) : (
          <>
            <Line k="כתובת" v={family.address} />
            <Line k="טלפון" v={family.phone} />
            <Line k="מייל" v={family.email || '—'} />
            <Line k="הערות" v={family.notes || '—'} />
            <button className="btn ghost block" style={{ marginTop: 10 }} onClick={() => { setF({ ...family }); setEdit(true); }}>
              עריכת פרטים ✏️
            </button>
          </>
        )}
      </div>

      <div className="divider-btn">
        <button className="link-btn" onClick={() => setConfirmOut(true)}>יציאה / החלפת משפחה</button>
      </div>

      <div className="card center-col" style={{ marginTop: 24, background: '#f4fafe' }}>
        <button className="link-btn" onClick={() => navigate('/roni')} style={{ fontSize: 14 }}>
          כניסת רוני 🔑
        </button>
      </div>

      {toast && <Toast>{toast}</Toast>}
      {confirmOut && (
        <ConfirmDialog
          title="יציאה"
          message="להתנתק מהמכשיר הזה? תוכלו להיכנס שוב עם מספר הטלפון."
          confirmText="יציאה"
          cancelText="להישאר"
          danger
          onConfirm={() => { setConfirmOut(false); clearIdentity(); }}
          onCancel={() => setConfirmOut(false)}
        />
      )}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

function Line({ k, v }) {
  return (
    <div className="summary-row">
      <span className="k">{k}</span>
      <span className="v" style={{ maxWidth: '65%', textAlign: 'end' }}>{v}</span>
    </div>
  );
}
