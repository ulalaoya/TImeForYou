import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../AppContext.js';
import WeekCalendar from '../components/WeekCalendar.jsx';
import { Spinner, Toast } from '../components/common.jsx';
import { subscribeBookings, createBooking, updateBooking, SlotTakenError } from '../data/index.js';
import {
  defaultWeekStart, weekStartSunday, weekDaysSunThu, toISODate, addDays, fromISODate,
  formatDateHe, DAY_NAMES_HE, maxRunFrom, endTimeFor, bookingOccupiedTimes,
} from '../utils/time.js';
import { isActiveStatus } from '../utils/status.js';
import { durationLabel, priceFor, shekel } from '../utils/format.js';
import { bookingWaLink } from '../utils/whatsapp.js';

export default function NewBooking({ navigate }) {
  const { family, config, editing, setEditing } = useApp();
  const now = useMemo(() => new Date(), []);
  const thisWeekStart = useMemo(() => defaultWeekStart(now, config), [now, config]);

  const [weekStart, setWeekStart] = useState(
    () => (editing ? weekStartSunday(fromISODate(editing.date)) : thisWeekStart)
  );
  const [bookings, setBookings] = useState(null);
  const [step, setStep] = useState('calendar'); // calendar | duration | summary | success
  const [selected, setSelected] = useState(null); // {date, time}
  const [count, setCount] = useState(1);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [created, setCreated] = useState(null);

  const weekDays = useMemo(() => weekDaysSunThu(weekStart), [weekStart]);

  // מנוי להזמנות בשבוע המוצג
  useEffect(() => {
    const from = toISODate(weekDays[0]);
    const to = toISODate(weekDays[4]);
    setBookings(null);
    const unsub = subscribeBookings(from, to, (rows) => setBookings(rows));
    return unsub;
  }, [weekStart]);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(''), 2800); };

  function pickSlot(date, time) {
    setSelected({ date, time });
    setCount(1);
    setStep('duration');
  }

  // בעריכה — מתעלמים מההזמנה הנוכחית עצמה כך שהמשבצות שלה נחשבות פנויות/נבחרות
  const visibleBookings = useMemo(
    () => (editing ? (bookings || []).filter((b) => b.id !== editing.id) : bookings),
    [bookings, editing]
  );

  const busySetForSelected = useMemo(() => {
    if (!selected || !visibleBookings) return new Set();
    const s = new Set();
    for (const b of visibleBookings) {
      if (b.date !== selected.date || !isActiveStatus(b.status)) continue;
      for (const t of bookingOccupiedTimes(b.startTime, b.slotCount)) s.add(t);
    }
    return s;
  }, [selected, visibleBookings]);

  const maxRun = useMemo(() => {
    if (!selected) return 0;
    return maxRunFrom(selected.date, selected.time, config, busySetForSelected, now);
  }, [selected, busySetForSelected, config, now]);

  async function confirm() {
    setBusy(true);
    try {
      const price = priceFor(count, config.pricePerHourILS);
      let b;
      if (editing) {
        b = await updateBooking(editing.id, {
          date: selected.date,
          startTime: selected.time,
          slotCount: count,
          priceILS: price,
        });
        setCreated({ ...editing, ...b, priceILS: price, slotCount: count, _edited: true });
        setEditing(null);
      } else {
        b = await createBooking({
          familyId: family.id,
          date: selected.date,
          startTime: selected.time,
          slotCount: count,
          priceILS: price,
          childName: family.childName,
          avatarId: family.avatarId,
          colorId: family.colorId,
        });
        setCreated({ ...b, priceILS: price, slotCount: count });
      }
      setStep('success');
    } catch (e) {
      if (e instanceof SlotTakenError || e.slotTaken) {
        showToast('אופס, מישהו הספיק לפנייך 🙈 בחרו משבצת אחרת');
        setStep('calendar');
        setSelected(null);
      } else {
        showToast('אופס, משהו השתבש. נסו שוב');
      }
    } finally {
      setBusy(false);
    }
  }

  // ── רינדור ─────────────────────────────────────────────────────────────
  if (step === 'success' && created) {
    return <Success created={created} family={family} config={config} navigate={navigate}
      onAgain={() => { setStep('calendar'); setSelected(null); setCreated(null); }} />;
  }

  if (step === 'duration' && selected) {
    return (
      <DurationPicker
        selected={selected} maxRun={maxRun} count={count} setCount={setCount} config={config}
        onBack={() => { setStep('calendar'); setSelected(null); }}
        onNext={() => setStep('summary')}
      />
    );
  }

  if (step === 'summary' && selected) {
    return (
      <Summary
        selected={selected} count={count} config={config} busy={busy}
        onBack={() => setStep('duration')} onConfirm={confirm}
      />
    );
  }

  // calendar
  const canPrev = weekStart > thisWeekStart;
  return (
    <div className="screen">
      <h1>{editing ? 'עריכת תור 📝' : 'הזמנת תור חדש 📅'}</h1>
      {editing && (
        <div className="edit-banner">
          <div>התור הנוכחי (📍): יום {DAY_NAMES_HE[fromISODate(editing.date).getDay()]} {formatDateHe(fromISODate(editing.date))}, {editing.startTime}–{editing.endTime}</div>
          <div style={{ fontWeight: 400, marginTop: 2 }}>בחרו מועד חדש, או השאירו את הנוכחי.</div>
        </div>
      )}
      <p>בחרו יום ושעת התחלה פנויה (ירוק).</p>

      <div className="week-head">
        {/* RTL: הילד הראשון מוצג מימין → ‹ימין› שבוע קודם (עבר); האחרון משמאל → ‹שמאל› שבוע הבא (עתיד) */}
        <button className="week-nav-btn" disabled={!canPrev}
          onClick={() => canPrev && setWeekStart(addDays(weekStart, -7))}>›</button>
        <div className="wk-label">
          שבוע {weekDays[0].getDate()}/{weekDays[0].getMonth() + 1} – {weekDays[4].getDate()}/{weekDays[4].getMonth() + 1}
        </div>
        <button className="week-nav-btn"
          onClick={() => setWeekStart(addDays(weekStart, 7))}>‹</button>
      </div>

      <div className="cal-legend" style={{ display: 'flex', gap: 12, fontSize: 12, marginBottom: 8, color: 'var(--text-soft)', flexWrap: 'wrap' }}>
        <span>🟩 פנוי</span><span>✕ תפוס</span><span>🔒 סגור</span>
      </div>

      {bookings === null ? <Spinner /> : (
        <WeekCalendar config={config} weekDays={weekDays} bookings={visibleBookings} editingBooking={editing} now={now} onPick={pickSlot} />
      )}

      {toast && <Toast>{toast}</Toast>}
    </div>
  );
}

function DurationPicker({ selected, maxRun, count, setCount, config, onBack, onNext }) {
  const d = fromISODate(selected.date);
  const opts = [];
  for (let c = 1; c <= maxRun; c++) opts.push(c);
  return (
    <div className="screen">
      <h1>כמה זמן? ⏱️</h1>
      <div className="card">
        <div className="summary-row"><span className="k">יום</span><span className="v">{DAY_NAMES_HE[d.getDay()]}, {formatDateHe(d)}</span></div>
        <div className="summary-row"><span className="k">שעת התחלה</span><span className="v">{selected.time}</span></div>
      </div>

      <h3 style={{ marginTop: 6 }}>בחרו משך</h3>
      {maxRun === 0 ? (
        <p>אין רצף פנוי מהמשבצת הזו 🙈</p>
      ) : (
        <div className="dur-options">
          {opts.map((c) => (
            <button key={c} className={`dur-opt ${count === c ? 'selected' : ''}`} onClick={() => setCount(c)}>
              {durationLabel(c)}
              <div style={{ fontSize: 11, fontWeight: 500 }}>עד {endTimeFor(selected.time, c)}</div>
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
        <button className="btn ghost" style={{ flex: 1 }} onClick={onBack}>חזרה</button>
        <button className="btn" style={{ flex: 1 }} disabled={maxRun === 0} onClick={onNext}>המשך</button>
      </div>
    </div>
  );
}

function Summary({ selected, count, config, busy, onBack, onConfirm }) {
  const d = fromISODate(selected.date);
  const end = endTimeFor(selected.time, count);
  const price = priceFor(count, config.pricePerHourILS);
  return (
    <div className="screen">
      <h1>סיכום ההזמנה 📝</h1>
      <div className="card">
        <div className="summary-row"><span className="k">יום</span><span className="v">{DAY_NAMES_HE[d.getDay()]}</span></div>
        <div className="summary-row"><span className="k">תאריך</span><span className="v">{formatDateHe(d)}</span></div>
        <div className="summary-row"><span className="k">שעות</span><span className="v">{selected.time}–{end}</span></div>
        <div className="summary-row"><span className="k">משך</span><span className="v">{durationLabel(count)}</span></div>
      </div>

      <div className="card">
        <div className="summary-row">
          <span className="k">{durationLabel(count)} × {config.pricePerHourILS} ₪ לשעה</span>
          <span className="v">{shekel(price)}</span>
        </div>
        <div className="price-big">{shekel(price)}</div>
        <p className="muted" style={{ textAlign: 'center', fontSize: 13, margin: 0 }}>
          ניתן לשלם במזומן / Paybox 💵
        </p>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button className="btn ghost" style={{ flex: 1 }} onClick={onBack} disabled={busy}>חזרה</button>
        <button className="btn green" style={{ flex: 1.5 }} onClick={onConfirm} disabled={busy}>
          {busy ? 'שומרים…' : 'אישור וקביעת התור ✓'}
        </button>
      </div>
    </div>
  );
}

function Success({ created, family, config, navigate, onAgain }) {
  const d = fromISODate(created.date);
  const end = created.endTime || endTimeFor(created.startTime, created.slotCount);
  const waLink = bookingWaLink(created, family, config.roniPhone);
  const edited = created._edited;
  return (
    <div className="screen center-col">
      <div className="success-emoji">{edited ? '📝' : '⏳'}</div>
      <h1 style={{ marginTop: 8 }}>{edited ? 'התור עודכן ונשלח לאישור ⏳' : 'הבקשה נשלחה! ⏳'}</h1>
      <p>התור ממתין לאישור של רוני</p>
      <p style={{ marginTop: -4 }}>יום {DAY_NAMES_HE[d.getDay()]}, {formatDateHe(d)}</p>
      <div className="card" style={{ width: '100%' }}>
        <div className="summary-row"><span className="k">שעות</span><span className="v">{created.startTime}–{end}</span></div>
        <div className="summary-row"><span className="k">משך</span><span className="v">{durationLabel(created.slotCount)}</span></div>
        <div className="price-big">{shekel(created.priceILS)}</div>
      </div>
      {waLink && (
        <a className="btn block wa" href={waLink} target="_blank" rel="noopener noreferrer">
          בקשו מרוני לאשר בוואטסאפ 💬
        </a>
      )}
      <button className="btn block heart" onClick={() => navigate('/my-bookings')}>לצפייה בהזמנות שלי</button>
      <div className="divider-btn">
        <button className="link-btn" onClick={onAgain}>הזמנת תור נוסף</button>
      </div>
    </div>
  );
}
