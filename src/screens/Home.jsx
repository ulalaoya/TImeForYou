import React, { useEffect, useState } from 'react';
import { useApp } from '../AppContext.js';
import { assetUrl } from '../utils/assets.js';
import { Avatar, Spinner, SectionTitle } from '../components/common.jsx';
import { getBookingsInRange } from '../data/index.js';
import { toISODate, addDays, fromISODate, formatDateHe, DAY_NAMES_HE } from '../utils/time.js';
import { durationLabel, priceFor, shekel } from '../utils/format.js';

export default function Home({ navigate }) {
  const { family, config } = useApp();
  const [upcoming, setUpcoming] = useState(null);

  useEffect(() => {
    const now = new Date();
    const from = toISODate(now);
    const to = toISODate(addDays(now, 90));
    getBookingsInRange(from, to).then((rows) => {
      const nowMs = now.getTime();
      const mine = rows
        .filter((b) => b.familyId === family.id && b.status === 'booked')
        .filter((b) => {
          const end = fromISODate(b.date);
          const [h, m] = b.endTime.split(':').map(Number);
          end.setHours(h, m, 0, 0);
          return end.getTime() > nowMs;
        });
      setUpcoming(mine);
    });
  }, [family.id]);

  return (
    <div className="screen">
      <img className="logo-full" src={assetUrl('logo-wordmark.png')} alt="TimeForYou" />

      <div className="hero-greet">
        <Avatar avatarId={family.avatarId} size={64} ring />
        <div>
          <h2 style={{ marginBottom: 2 }}>שלום, {family.childName}! 🌟</h2>
          <div className="slogan">את רגועה, הם שמחים 💛</div>
        </div>
      </div>

      <button className="btn block lg heart" onClick={() => navigate('/new')} style={{ marginBottom: 18 }}>
        📅 הזמנת תור חדש
      </button>

      <SectionTitle icon="calendar">התורים הקרובים</SectionTitle>
      {upcoming === null && <Spinner />}
      {upcoming && upcoming.length === 0 && (
        <div className="card center-col">
          <div style={{ fontSize: 40 }}>🗓️</div>
          <p style={{ marginBottom: 12 }}>אין עדיין תורים. בואו נקבע אחד!</p>
          <button className="btn" onClick={() => navigate('/new')}>לקביעת תור</button>
        </div>
      )}
      {upcoming && upcoming.slice(0, 3).map((b) => {
        const d = fromISODate(b.date);
        return (
          <div className="booking-item" key={b.id}>
            <Avatar avatarId={b.avatarId} size={46} />
            <div className="bi-main">
              <div className="bi-when">יום {DAY_NAMES_HE[d.getDay()]}, {formatDateHe(d)}</div>
              <div className="bi-sub">{b.startTime}–{b.endTime} · {durationLabel(b.slotCount)}</div>
            </div>
            <span className="pill">{shekel(priceFor(b.slotCount, config.pricePerHourILS))}</span>
          </div>
        );
      })}
      {upcoming && upcoming.length > 3 && (
        <div className="divider-btn">
          <button className="link-btn" onClick={() => navigate('/my-bookings')}>לכל ההזמנות שלי</button>
        </div>
      )}
    </div>
  );
}
