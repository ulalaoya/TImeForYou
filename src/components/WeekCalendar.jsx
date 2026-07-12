import React from 'react';
import {
  gridRowTimes, slotState, toISODate, DAY_SHORT_HE, DAY_NAMES_HE, bookingOccupiedTimes,
} from '../utils/time.js';
import { isActiveStatus } from '../utils/status.js';

// יומן שבועי לצד ההורה — בחירת משבצת התחלה פנויה.
export default function WeekCalendar({ config, weekDays, bookings, now, selected, editingBooking, onPick }) {
  const rows = gridRowTimes(config);
  const todayISO = toISODate(now);

  // מפת תפוסה ליום -> Set של שעות
  const busyByDay = {};
  for (const b of bookings) {
    if (!isActiveStatus(b.status)) continue;
    if (!busyByDay[b.date]) busyByDay[b.date] = new Set();
    for (const t of bookingOccupiedTimes(b.startTime, b.slotCount)) busyByDay[b.date].add(t);
  }

  // בעריכה — המשבצות של התור הנוכחי מסומנות "נוכחי" (📍), ניתנות לבחירה
  const editSet = editingBooking
    ? new Set(bookingOccupiedTimes(editingBooking.startTime, editingBooking.slotCount))
    : null;

  const selTimes = selected
    ? new Set(bookingOccupiedTimes(selected.time, selected.count || 1))
    : null;

  return (
    <div className="cal-scroll">
      <div className="cal-grid">
        <div className="cal-corner" />
        {weekDays.map((d) => {
          const iso = toISODate(d);
          return (
            <div key={iso} className={`cal-daycol-head ${iso === todayISO ? 'is-today' : ''}`}>
              <div>{DAY_SHORT_HE[d.getDay()]}</div>
              <div className="dnum">{d.getDate()}/{d.getMonth() + 1}</div>
            </div>
          );
        })}

        {rows.map((time) => (
          <React.Fragment key={time}>
            <div className="cal-timelabel">{time}</div>
            {weekDays.map((d) => {
              const iso = toISODate(d);
              const busy = busyByDay[iso]?.has(time);
              const st = slotState(iso, time, config, now);
              const isSel = selected && selected.date === iso && selTimes.has(time);
              const isSelStart = selected && selected.date === iso && selected.time === time;
              const isCurrent = editSet && editingBooking.date === iso && editSet.has(time);
              const isCurrentStart = isCurrent && editingBooking.startTime === time;

              let cls = 'cal-slot';
              let clickable = false;
              if (isSelStart) cls += ' selstart';
              else if (isSel) cls += ' selrange';
              else if (isCurrent) { cls += ' current'; clickable = true; }
              else if (busy) cls += ' busy';
              else if (st.locked) cls += ' locked';
              else if (st.past) cls += ' past';
              else { cls += ' free'; clickable = true; }

              // תווית נגישה: "יום שלישי 28/7 בשעה 10:00 — פנוי"
              const stateLabel = isCurrent ? 'התור הנוכחי'
                : busy ? 'תפוס'
                : st.locked ? 'סגור'
                : st.past ? 'עבר'
                : 'פנוי';
              const label = `יום ${DAY_NAMES_HE[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1} בשעה ${time} — ${stateLabel}`;

              const a11yProps = clickable
                ? {
                    role: 'button',
                    tabIndex: 0,
                    'aria-label': label,
                    onKeyDown: (e) => {
                      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                        e.preventDefault();
                        onPick(iso, time);
                      }
                    },
                  }
                : { 'aria-label': label, 'aria-disabled': 'true' };

              return (
                <div
                  key={iso + time}
                  className={cls}
                  onClick={clickable ? () => onPick(iso, time) : undefined}
                  {...a11yProps}
                >
                  {isCurrentStart ? '📍' : isCurrent ? '' : busy ? '✕' : st.locked ? '🔒' : ''}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
