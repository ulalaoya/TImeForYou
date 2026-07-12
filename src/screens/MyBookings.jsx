import React, { useEffect, useState, useCallback } from 'react';
import { useApp } from '../AppContext.js';
import { Avatar, Spinner, SectionTitle, ConfirmDialog, EmptyState, Toast, StatusPill } from '../components/common.jsx';
import { getBookingsInRange, cancelBooking } from '../data/index.js';
import { toISODate, addDays, fromISODate, formatDateHe, DAY_NAMES_HE } from '../utils/time.js';
import { isActiveStatus } from '../utils/status.js';
import { durationLabel, priceFor, shekel } from '../utils/format.js';

export default function MyBookings({ navigate }) {
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

  if (rows === null) return <div className="screen"><Spinner /></div>;

  const upcoming = rows.filter((b) => isActiveStatus(b.status) && isFuture(b));
  const past = rows.filter((b) => !(isActiveStatus(b.status) && isFuture(b)));

  return (
    <div className="screen">
      <h1>ההזמנות שלי 📖</h1>

      <SectionTitle icon="calendar">תורים קרובים</SectionTitle>
      {upcoming.length === 0 && <EmptyState emoji="🗓️">אין תורים קרובים.</EmptyState>}
      {upcoming.map((b) => (
        <BookingCard key={b.id} b={b} config={config}
          onCancel={() => setConfirmId(b.id)} onEdit={() => startEdit(b)} />
      ))}

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
  const cancelled = !isActiveStatus(b.status);
  return (
    <div className={`booking-item ${cancelled ? 'cancelled' : ''}`}>
      <Avatar avatarId={b.avatarId} size={46} />
      <div className="bi-main">
        <div className="bi-when">יום {DAY_NAMES_HE[d.getDay()]}, {formatDateHe(d)}</div>
        <div className="bi-sub">
          {b.startTime}–{b.endTime} · {durationLabel(b.slotCount)} · {shekel(priceFor(b.slotCount, config.pricePerHourILS))}
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
