import React from 'react';
import {
  gridRowTimes, toISODate, DAY_SHORT_HE, bookingOccupiedTimes,
} from '../utils/time.js';
import { colorById } from '../data/colors.js';
import { Avatar } from './common.jsx';

// יומן רוני — מציג את כל ההזמנות בצבע הילד. מבוטלות (שלא נצפו) מסומנות עם כפתור "ראיתי".
export default function RoniCalendar({ config, weekDays, bookings, now, onSeen }) {
  const rows = gridRowTimes(config);
  const todayISO = toISODate(now);

  // חזותית מציגים booked ו-cancelled (לא cancelled_seen)
  const visible = bookings.filter((b) => b.status === 'booked' || b.status === 'cancelled');

  // אינדקס: מפתח `${iso}|${time}` -> מערך {booking, isStart}
  const cellIndex = {};
  for (const b of visible) {
    const times = bookingOccupiedTimes(b.startTime, b.slotCount);
    times.forEach((t, i) => {
      const key = `${b.date}|${t}`;
      if (!cellIndex[key]) cellIndex[key] = [];
      cellIndex[key].push({ b, isStart: i === 0 });
    });
  }

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
              const entries = cellIndex[`${iso}|${time}`] || [];
              return (
                <div key={iso + time} className={`cal-slot ${entries.length ? 'roni' : ''}`}>
                  {entries.map(({ b, isStart }) => {
                    const c = colorById(b.colorId);
                    const cancelled = b.status === 'cancelled';
                    return (
                      <div
                        key={b.id}
                        className={`roni-chip ${cancelled ? 'cancelled' : ''}`}
                        style={{ background: c.bg, color: c.border, border: `1.5px solid ${c.border}` }}
                        title={`${b.childName} ${b.startTime}-${b.endTime}`}
                      >
                        <Avatar avatarId={b.avatarId} size={15} />
                        {isStart && <span className="rc-name">{b.childName}</span>}
                        {isStart && cancelled && (
                          <button
                            className="btn sm"
                            style={{ padding: '1px 6px', fontSize: 9, background: c.border, marginInlineStart: 'auto' }}
                            onClick={() => onSeen(b.id)}
                            aria-label="ראיתי את הביטול"
                          >
                            ✔
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
