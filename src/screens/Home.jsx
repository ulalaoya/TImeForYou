import React, { useEffect, useState } from 'react';
import { useApp } from '../AppContext.js';
import { assetUrl } from '../utils/assets.js';
import { Avatar, Spinner, SectionTitle, StatusPill, TimeRange } from '../components/common.jsx';
import { getBookingsInRange } from '../data/index.js';
import { toISODate, addDays, fromISODate, formatDateHe, DAY_NAMES_HE } from '../utils/time.js';
import { isActiveStatus } from '../utils/status.js';
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
        .filter((b) => b.familyId === family.id && isActiveStatus(b.status))
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
          <h2 style={{ marginBottom: 2 }}>שלום, {family.parentName}! 🌟</h2>
          <div className="slogan">את רגועה, הם שמחים 💛</div>
        </div>
      </div>

      <button className="btn block lg heart" onClick={() => navigate('/new')} style={{ marginBottom: 18 }}>
        📅 קביעת תור חדש ל{family.childName}
      </button>

      <SectionTitle icon="calendar">התורים הקרובים</SectionTitle>
      {upcoming === null && <Spinner />}
      {upcoming && upcoming.length === 0 && (
        <div className="card center-col">
          <div style={{ fontSize: 40 }}>🗓️</div>
          <p style={{ marginBottom: 0 }}>אין עדיין תורים ביומן של רוני</p>
        </div>
      )}
      {upcoming && upcoming.slice(0, 3).map((b) => {
        const d = fromISODate(b.date);
        return (
          <div className="booking-item" key={b.id}>
            <Avatar avatarId={b.avatarId} size={46} />
            <div className="bi-main">
              <div className="bi-when">יום {DAY_NAMES_HE[d.getDay()]}, {formatDateHe(d)}</div>
              <div className="bi-sub"><TimeRange from={b.startTime} to={b.endTime} /> · {durationLabel(b.slotCount)}</div>
            </div>
            <div className="bi-actions">
              <StatusPill status={b.status} />
              <span className="pill">{shekel(priceFor(b.slotCount, config.pricePerHourILS))}</span>
            </div>
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
