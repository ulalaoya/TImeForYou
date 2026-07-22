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
  formatDateHe, DAY_NAMES_HE, dayBoundaryTimes, timeToMin,
} from '../utils/time.js';
import { durationLabel, priceFor, shekel } from '../utils/format.js';
import { sendApprovalEmail } from '../utils/email.js';

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
      <div style={{ fontSize: 52, marginTop: 24 }}>💛</div>
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
    // מייל אישור להורה (רק אם הוגדר שירות מייל ויש כתובת אצל המשפחה)
    const b = (bookings || []).find((x) => x.id === id);
    const fam = b && families[b.familyId];
    if (b && fam) sendApprovalEmail({ ...b, status: 'approved' }, fam);
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
        <button className={`roni-tab ${tab === 'blocks' ? 'active' : ''}`} onClick={() => setTab('blocks')}>
          חסימות
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

      {tab === 'blocks' && <RoniBlocks now={now} />}
    </div>
  );
}

// ── ניהול חסימות — ימים/שעות שרוני אינה זמינה ──────────────────────────────────
function RoniBlocks({ now }) {
  const { config, updateConfig } = useApp();
  const blocks = config.blocks || [];
  const todayISO = toISODate(now);
  const times = useMemo(() => dayBoundaryTimes(config), [config]);

  const [from, setFrom] = useState(todayISO);
  const [to, setTo] = useState(todayISO);
  const [mode, setMode] = useState('allDay'); // allDay | range
  const [start, setStart] = useState(config.regularHours.start);
  const [end, setEnd] = useState(config.regularHours.end);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  // חסימות שלא הסתיימו (תאריך הסיום מהיום והלאה), ממוינות לפי תאריך ההתחלה ואז שעה
  const upcoming = useMemo(() => {
    const f = (bl) => bl.from || bl.date;
    const t = (bl) => bl.to || bl.from || bl.date;
    return blocks
      .filter((bl) => t(bl) >= todayISO)
      .sort((a, b) => (f(a) + (a.start || '')).localeCompare(f(b) + (b.start || '')));
  }, [blocks, todayISO]);

  async function addBlock() {
    setErr('');
    if (!from || !to) { setErr('בחרי תאריך'); return; }
    if (to < from) { setErr('תאריך הסיום חייב להיות אחרי או שווה לתאריך ההתחלה'); return; }
    let block;
    if (mode === 'allDay') {
      block = { id: uid(), from, to, allDay: true };
    } else {
      if (timeToMin(end) <= timeToMin(start)) { setErr('שעת הסיום חייבת להיות אחרי שעת ההתחלה'); return; }
      block = { id: uid(), from, to, start, end };
    }
    setBusy(true);
    try {
      await updateConfig({ blocks: [...blocks, block] });
    } catch (e) {
      setErr('אופס, השמירה נכשלה. בדקי חיבור לאינטרנט ונסי שוב');
    } finally {
      setBusy(false);
    }
  }

  async function removeBlock(id) {
    setErr('');
    setBusy(true);
    try {
      await updateConfig({ blocks: blocks.filter((bl) => bl.id !== id) });
    } catch (e) {
      setErr('אופס, ההסרה נכשלה. נסי שוב');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="muted" style={{ fontSize: 13, marginTop: 6 }}>
        סמני ימים שלמים או טווחי שעות שבהם את לא זמינה — המשבצות ייחסמו וההורים לא יוכלו להזמין אותן.
        אפשר לחסום יום בודד או טווח של כמה ימים.
      </p>

      <div className="card">
        <div style={{ display: 'flex', gap: 10 }}>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label htmlFor="blk-from">מתאריך</label>
            <input id="blk-from" type="date" value={from} min={todayISO}
              onChange={(e) => { setFrom(e.target.value); if (to < e.target.value) setTo(e.target.value); }} />
          </div>
          <div className="field" style={{ flex: 1, marginBottom: 0 }}>
            <label htmlFor="blk-to">עד תאריך</label>
            <input id="blk-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        <div className="seg" style={{ marginTop: 12 }}>
          <button className={`seg-btn ${mode === 'allDay' ? 'active' : ''}`} onClick={() => setMode('allDay')}>
            יום שלם
          </button>
          <button className={`seg-btn ${mode === 'range' ? 'active' : ''}`} onClick={() => setMode('range')}>
            טווח שעות
          </button>
        </div>

        {mode === 'range' && (
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <label htmlFor="blk-start">מ־</label>
              <select id="blk-start" value={start} onChange={(e) => setStart(e.target.value)}>
                {times.slice(0, -1).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="field" style={{ flex: 1, marginBottom: 0 }}>
              <label htmlFor="blk-end">עד</label>
              <select id="blk-end" value={end} onChange={(e) => setEnd(e.target.value)}>
                {times.slice(1).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
        )}

        {err && <p style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8 }}>{err}</p>}

        <button className="btn block green" style={{ marginTop: 14 }} disabled={busy} onClick={addBlock}>
          {busy ? 'שומרים…' : 'הוספת חסימה 🚫'}
        </button>
      </div>

      <h3 style={{ marginTop: 20 }}>חסימות קרובות ({upcoming.length})</h3>
      {upcoming.length === 0 && <p className="muted">אין חסימות מתוכננות.</p>}
      {upcoming.map((bl) => (
        <div key={bl.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ fontSize: 22 }}>🚫</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700 }}>{blockDateLabel(bl)}</div>
            <div style={{ fontSize: 13, color: 'var(--text-soft)' }}>
              {bl.allDay
                ? 'כל היום'
                : <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>{bl.start}–{bl.end}</span>}
            </div>
          </div>
          <button className="btn sm ghost" disabled={busy} onClick={() => removeBlock(bl.id)}>הסרה</button>
        </div>
      ))}

      <p className="muted" style={{ fontSize: 12, marginTop: 14 }}>
        שימי לב: חסימה מונעת הזמנות חדשות בלבד. הזמנות שכבר אושרו באותו זמן ימשיכו להופיע ביומן.
      </p>
    </div>
  );
}

// תיאור טווח התאריכים של חסימה (יום בודד או טווח)
function blockDateLabel(bl) {
  const from = bl.from || bl.date;
  const to = bl.to || bl.from || bl.date;
  const df = fromISODate(from);
  if (from === to) return `יום ${DAY_NAMES_HE[df.getDay()]}, ${formatDateHe(df)}`;
  const dt = fromISODate(to);
  return `${formatDateHe(df)} – ${formatDateHe(dt)}`;
}

function uid() {
  return `blk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
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
