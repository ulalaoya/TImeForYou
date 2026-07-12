import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../AppContext.js';
import RoniCalendar from '../components/RoniCalendar.jsx';
import { Avatar, Spinner, StatusPill } from '../components/common.jsx';
import { colorById } from '../data/colors.js';
import {
  subscribeBookings, markCancellationSeen, approveBooking, getFamilyById,
} from '../data/index.js';
import {
  defaultWeekStart, weekDaysSunThu, toISODate, addDays, fromISODate,
  formatDateHe, DAY_NAMES_HE,
} from '../utils/time.js';
import { durationLabel, priceFor, shekel } from '../utils/format.js';

export default function Roni({ navigate }) {
  const { config } = useApp();
  const [unlocked, setUnlocked] = useState(false);

  if (!unlocked) return <PinGate pin={config.roniPin} onOk={() => setUnlocked(true)} onExit={() => navigate('/')} />;
  return <RoniHome navigate={navigate} />;
}

// ── PIN gate ────────────────────────────────────────────────────────────────
function PinGate({ pin, onOk, onExit }) {
  const [entry, setEntry] = useState('');
  const [err, setErr] = useState(false);

  // בדיקת הקוד כשמושלמות 4 ספרות (effect — עמיד ללחיצות מהירות)
  useEffect(() => {
    if (entry.length !== 4) return;
    const t = setTimeout(() => {
      if (entry === String(pin)) onOk();
      else { setErr(true); setEntry(''); }
    }, 200);
    return () => clearTimeout(t);
  }, [entry, pin, onOk]);

  function press(d) {
    setErr(false);
    setEntry((e) => (e.length >= 4 ? e : e + d));
  }
  function back() { setErr(false); setEntry((e) => e.slice(0, -1)); }

  return (
    <div className="screen no-nav center-col">
      <div style={{ fontSize: 52, marginTop: 24 }}>🔑</div>
      <h1>שלום רוני!</h1>
      <p>הזיני את הקוד הסודי שלך</p>
      <div className="pin-dots">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`pin-dot ${err ? 'err' : ''} ${i < entry.length ? 'on' : ''}`} />
        ))}
      </div>
      {err && <p style={{ color: 'var(--danger)' }}>קוד שגוי, נסי שוב 🙈</p>}
      <div className="numpad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button key={n} className="numkey" onClick={() => press(String(n))}>{n}</button>
        ))}
        <button className="numkey blank" />
        <button className="numkey" onClick={() => press('0')}>0</button>
        <button className="numkey" onClick={back}>⌫</button>
      </div>
      <div className="divider-btn" style={{ marginTop: 20 }}>
        <button className="link-btn" onClick={onExit}>יציאה למסך ההורים</button>
      </div>
    </div>
  );
}

// ── Roni home (calendar + list) ──────────────────────────────────────────────
function RoniHome({ navigate }) {
  const { config } = useApp();
  const now = useMemo(() => new Date(), []);
  const [tab, setTab] = useState('calendar'); // calendar | list
  const [weekStart, setWeekStart] = useState(() => defaultWeekStart(now, config));
  const [bookings, setBookings] = useState(null);
  const [families, setFamilies] = useState({});

  const weekDays = useMemo(() => weekDaysSunThu(weekStart), [weekStart]);

  // מנוי לטווח רחב — משרת גם את היומן וגם את הרשימה
  useEffect(() => {
    const from = toISODate(addDays(now, -30));
    const to = toISODate(addDays(now, 180));
    const unsub = subscribeBookings(from, to, (rows) => setBookings(rows));
    return unsub;
  }, [now]);

  // טעינת פרטי משפחות עבור הרשימה
  useEffect(() => {
    if (!bookings) return;
    const ids = [...new Set(bookings.map((b) => b.familyId))].filter((id) => !families[id]);
    if (ids.length === 0) return;
    Promise.all(ids.map((id) => getFamilyById(id).then((f) => [id, f]))).then((pairs) => {
      setFamilies((prev) => {
        const next = { ...prev };
        for (const [id, f] of pairs) if (f) next[id] = f;
        return next;
      });
    });
  }, [bookings]);

  async function seen(id) {
    await markCancellationSeen(id);
  }
  async function approve(id) {
    await approveBooking(id);
  }

  // רשימות אקשן ותג ההתראה — מכסים את כל התאריכים הקרובים (מהמנוי הרחב),
  // ולא רק את השבוע המוצג ביומן.
  const isFutureBooking = (b) => {
    const end = fromISODate(b.date);
    const [h, m] = b.endTime.split(':').map(Number);
    end.setHours(h, m, 0, 0);
    return end.getTime() > now.getTime();
  };
  const pendingCancels = (bookings || []).filter((b) => b.status === 'cancelled');
  const pendingApprovals = (bookings || []).filter((b) => b.status === 'pending' && isFutureBooking(b));
  const badge = pendingCancels.length + pendingApprovals.length;

  return (
    <div className="screen">
      <div className="roni-topbar">
        <h2>היומן של רוני 🗓️</h2>
        <button className="btn sm ghost" onClick={() => navigate('/')}>יציאה</button>
      </div>

      <div className="roni-tabs">
        <button className={`roni-tab ${tab === 'calendar' ? 'active' : ''}`} onClick={() => setTab('calendar')}>
          יומן
        </button>
        <button className={`roni-tab ${tab === 'list' ? 'active' : ''}`} onClick={() => setTab('list')}>
          הזמנות
          {badge > 0 && <span className="nav-badge">{badge}</span>}
        </button>
      </div>

      {bookings === null && <Spinner />}

      {bookings && tab === 'calendar' && (
        <>
          <div className="week-head">
            {/* RTL: ראשון מימין → ‹ימין› שבוע קודם (עבר); אחרון משמאל → ‹שמאל› שבוע הבא (עתיד) */}
            <button className="week-nav-btn" onClick={() => setWeekStart(addDays(weekStart, -7))}>‹</button>
            <div className="wk-label">
              שבוע {weekDays[0].getDate()}/{weekDays[0].getMonth() + 1} – {weekDays[4].getDate()}/{weekDays[4].getMonth() + 1}
            </div>
            <button className="week-nav-btn" onClick={() => setWeekStart(addDays(weekStart, 7))}>›</button>
          </div>
          <RoniCalendar config={config} weekDays={weekDays} bookings={bookings} now={now} onSeen={seen} />
          <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
            הזמנה מבוטלת מסומנת בקו חוצה. לחצי ✔ אחרי שראית אותה.
          </p>
        </>
      )}

      {bookings && tab === 'list' && (
        <RoniList bookings={bookings} families={families} config={config} now={now}
          pendingCancels={pendingCancels} pendingApprovals={pendingApprovals}
          onSeen={seen} onApprove={approve} />
      )}
    </div>
  );
}

function RoniList({ bookings, families, config, now, pendingCancels, pendingApprovals, onSeen, onApprove }) {
  const nowMs = now.getTime();
  const upcoming = bookings
    .filter((b) => b.status === 'approved')
    .filter((b) => {
      const end = fromISODate(b.date);
      const [h, m] = b.endTime.split(':').map(Number);
      end.setHours(h, m, 0, 0);
      return end.getTime() > nowMs;
    });

  return (
    <div>
      <h3 style={{ marginTop: 6 }}>ממתינים לאישור ({pendingApprovals.length})</h3>
      {pendingApprovals.length === 0 && <p className="muted">אין תורים שממתינים לאישור 🎉</p>}
      {pendingApprovals.map((b) => (
        <RoniBookingCard key={b.id} b={b} fam={families[b.familyId]} config={config} pending
          onApprove={() => onApprove(b.id)} />
      ))}

      <h3 style={{ marginTop: 20 }}>הזמנות מאושרות קרובות ({upcoming.length})</h3>
      {upcoming.length === 0 && <p className="muted">אין הזמנות מאושרות קרובות.</p>}
      {upcoming.map((b) => (
        <RoniBookingCard key={b.id} b={b} fam={families[b.familyId]} config={config} />
      ))}

      <h3 style={{ marginTop: 20 }}>ביטולים ממתינים ({pendingCancels.length})</h3>
      {pendingCancels.length === 0 && <p className="muted">אין ביטולים ממתינים 🎉</p>}
      {pendingCancels.map((b) => (
        <RoniBookingCard key={b.id} b={b} fam={families[b.familyId]} config={config} cancelled
          onSeen={() => onSeen(b.id)} />
      ))}
    </div>
  );
}

function RoniBookingCard({ b, fam, config, cancelled, pending, onSeen, onApprove }) {
  const d = fromISODate(b.date);
  const c = colorById(b.colorId);
  return (
    <div className="card" style={{ borderInlineStart: `6px solid ${c.border}`, borderStyle: pending ? 'dashed' : 'solid', marginBottom: 10, opacity: cancelled ? 0.85 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <Avatar avatarId={b.avatarId} size={40} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, textDecoration: cancelled ? 'line-through' : 'none', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {b.childName}
            {!cancelled && <StatusPill status={b.status} />}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-soft)' }}>
            יום {DAY_NAMES_HE[d.getDay()]}, {formatDateHe(d)}
          </div>
        </div>
        <span className={`pill ${cancelled ? 'cancel' : ''}`}>
          <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>{b.startTime}–{b.endTime}</span>
        </span>
      </div>
      <div className="summary-row" style={{ padding: '6px 0' }}>
        <span className="k">משך / מחיר</span>
        <span className="v">{durationLabel(b.slotCount)} · {shekel(priceFor(b.slotCount, config.pricePerHourILS))}</span>
      </div>
      {fam ? (
        <>
          <div className="summary-row" style={{ padding: '6px 0' }}>
            <span className="k">הורה</span><span className="v">{fam.parentName}</span>
          </div>
          <div className="summary-row" style={{ padding: '6px 0' }}>
            <span className="k">טלפון</span>
            <a className="v" href={`tel:${fam.phone}`} style={{ color: 'var(--sky-deep)' }}>{fam.phone} 📞</a>
          </div>
          <div className="summary-row" style={{ padding: '6px 0' }}>
            <span className="k">כתובת</span><span className="v" style={{ maxWidth: '60%', textAlign: 'end' }}>{fam.address}</span>
          </div>
          {fam.notes && (
            <div className="summary-row" style={{ padding: '6px 0' }}>
              <span className="k">הערות</span><span className="v" style={{ maxWidth: '60%', textAlign: 'end' }}>{fam.notes}</span>
            </div>
          )}
        </>
      ) : (
        <div className="muted" style={{ fontSize: 13 }}>טוען פרטי הורה…</div>
      )}
      {cancelled && (
        <button className="btn sm block green" style={{ marginTop: 8 }} onClick={onSeen}>ראיתי ✔</button>
      )}
      {pending && (
        <button className="btn sm block green" style={{ marginTop: 8 }} onClick={onApprove}>אישור ✓</button>
      )}
    </div>
  );
}
