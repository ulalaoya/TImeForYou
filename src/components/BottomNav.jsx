import React from 'react';
import { Icon } from './common.jsx';

const ITEMS = [
  { path: '/', label: 'בית והתורים שלי', icon: 'nav-home' },
  { path: '/new', label: 'הזמנה חדשה', icon: 'nav-new-booking' },
  { path: '/profile', label: 'פרופיל', icon: 'nav-profile' },
];

export default function BottomNav({ path, navigate }) {
  return (
    <nav className="bottom-nav">
      {ITEMS.map((it) => {
        const active = path === it.path;
        return (
          <button
            key={it.path}
            className={`nav-item ${active ? 'active' : ''}`}
            onClick={() => navigate(it.path)}
          >
            <Icon name={it.icon} size={26} alt={it.label} />
            <span>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
