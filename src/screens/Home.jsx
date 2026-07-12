import React, { useEffect, useState, useCallback } from 'react';
import { useApp } from '../AppContext.js';
import { assetUrl } from '../utils/assets.js';
import {
  Avatar, Spinner, SectionTitle, StatusPill, TimeRange, CareTagline,
  ConfirmDialog, EmptyState, Toast,
} from '../components/common.jsx';
import { getBookingsInRange, cancelBooking } from '../data/index.js';
import { toISODate, addDays, fromISODate, formatDateHe, DAY_NAMES_HE } from '../utils/time.js';
import { durationLabel, priceFor, shekel } from '../utils/format.js';

export default function Home({ navigate }) {
  const { family, config, setEditing } = useApp();
  const [rows, setRows] = useState(null);
  const [confirmId, setConfirmId] = useState(null);
  const [showPast, setShowPast] = useState(false);
  const [toast, setToast] = useState('');

  const load = useCallback(() => {
    const from = toISODate(addDays(new Date(), -180));
    const to = toISODate(addDays(new Date(), 120));
    getBookingsInRange(from, to).then((all) => {
      setRows(all.filter((b) => b.familyId === family.id));
    });
  }, [family.id]);

  useEffect(() => { load(); }, [load]);

  function isFuture(b) {
    const end = fromISODate(b.date);
    const [h, m] = b.endTime.split(':').map(Number);
    end.setHours(h, m, 0, 0);
    return end.getTime() > Date.now();
  }

  async function doCancel() {
    const id = confirmId;
    setConfirmId(null);
    await cancelBooking(id);
    setToast('התור בוטל. המשבצת השתחררה 🙏');
    setTimeout(() => setToast(''), 2600);
    load();
  }

  function startEdit(b) {
    setEditing(b);
    navigate('/new');
  }

  const upcoming = rows ? rows.filter((b) => (b.status === 'pending' || b.status === 'approved') && isFuture(b)) : [];
  const past = rows ? rows.filter((b) => !((b.status === 'pending' || b.status === 'approved') && isFuture(b))) : [];
  const noEmail = !family.email;

  return (
    <div className="screen">
      <img className="logo-full" src={assetUrl('logo-wordmark.png')} alt="TimeForYou" />

      <div className="hero-greet">
        <Avatar avatarId={family.avatarId} size={64} ring />
        <div>
          <h2 style={{ marginBottom: 2 }}>שלום, {family.parentName}! 🌟</h2>
          <div className="slogan">את רגועה, הם שמחים 💛</div>
        </div>
      </div>
      <CareTagline />

      <button className="btn block lg heart" onClick={() => navigate('/new')} style={{ marginBottom: 18 }}>
        📅 קביעת תור חדש ל{family.childName}
      </button>

      <SectionTitle icon="calendar">התורים שלי</SectionTitle>
      {rows === null && <Spinner />}
      {rows && upcoming.length === 0 && (
        <EmptyState emoji="🗓️">אין עדיין תורים ביומן של רוני</EmptyState>
      )}
      {upcoming.map((b) => (
        <BookingCard key={b.id} b={b} config={config}
          onCancel={() => setConfirmId(b.id)} onEdit={() => startEdit(b)} />
      ))}

      {rows && upcoming.length > 0 && noEmail && (
        <div className="card" style={{ background: '#fff8e6', marginTop: 6 }}>
          <p className="muted" style={{ margin: 0, fontSize: 13 }}>
            📩 רוצים לקבל אישור במייל כשרוני מאשרת את התור?{' '}
            <button className="link-btn" onClick={() => navigate('/profile')} style={{ fontSize: 13 }}>
              הוסיפו מייל בפרופיל
            </button>
          </p>
        </div>
      )}

      {past.length > 0 && (
        <>
          <div className="divider-btn" style={{ marginTop: 18 }}>
            <button className="link-btn" onClick={() => setShowPast((s) => !s)}>
              {showPast ? 'הסתרת היסטוריה' : `היסטוריה (${past.length})`}
            </button>
          </div>
          {showPast && past.map((b) => (
            <BookingCard key={b.id} b={b} config={config} past />
          ))}
        </>
      )}

      {confirmId && (
        <ConfirmDialog
          title="ביטול תור"
          message="בטוח לבטל?"
          confirmText="כן, לבטל"
          cancelText="לא"
          danger
          onConfirm={doCancel}
          onCancel={() => setConfirmId(null)}
        />
      )}
      {toast && <Toast>{toast}</Toast>}
    </div>
  );
}

function BookingCard({ b, config, onCancel, onEdit, past }) {
  const d = fromISODate(b.date);
  const cancelled = b.status === 'cancelled' || b.status === 'cancelled_seen';
  return (
    <div className={`booking-item ${cancelled ? 'cancelled' : ''}`}>
      <Avatar avatarId={b.avatarId} size={46} />
      <div className="bi-main">
        <div className="bi-when">יום {DAY_NAMES_HE[d.getDay()]}, {formatDateHe(d)}</div>
        <div className="bi-sub">
          <TimeRange from={b.startTime} to={b.endTime} /> · {durationLabel(b.slotCount)} · {shekel(priceFor(b.slotCount, config.pricePerHourILS))}
        </div>
      </div>
      {cancelled ? (
        <span className="pill cancel">בוטל</span>
      ) : past ? (
        <span className="pill">הסתיים</span>
      ) : (
        <div className="bi-actions">
          <StatusPill status={b.status} />
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn sm ghost" onClick={onEdit}>עריכה</button>
            <button className="btn sm danger-outline" onClick={onCancel}>ביטול</button>
          </div>
        </div>
      )}
    </div>
  );
}
