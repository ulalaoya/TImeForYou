import React from 'react';
import { useApp } from '../AppContext.js';
import { avatarUrl, iconUrl } from '../utils/assets.js';

export function Avatar({ avatarId, size = 48, ring = false, className = '' }) {
  const { manifest } = useApp();
  const url = avatarUrl(avatarId, manifest);
  return (
    <img
      className={`avatar ${ring ? 'ring' : ''} ${className}`}
      src={url}
      alt=""
      style={{ width: size, height: size }}
    />
  );
}

export function Icon({ name, size = 24, alt = '', style }) {
  const { manifest } = useApp();
  const url = iconUrl(name, manifest);
  if (!url) return null;
  return <img src={url} alt={alt} style={{ width: size, height: size, objectFit: 'contain', ...style }} />;
}

export function Spinner() {
  return <div className="spinner" aria-label="טוען" />;
}

export function SectionTitle({ icon, children }) {
  return (
    <div className="section-title">
      {icon && <Icon name={icon} size={24} />}
      <h3>{children}</h3>
    </div>
  );
}

export function ConfirmDialog({ title, message, confirmText = 'כן', cancelText = 'לא', onConfirm, onCancel, danger }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {title && <h2>{title}</h2>}
        {message && <p style={{ marginBottom: 0 }}>{message}</p>}
        <div className="btn-row">
          <button className="btn ghost" onClick={onCancel}>{cancelText}</button>
          <button className={`btn ${danger ? 'heart' : ''}`} onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

export function Toast({ children }) {
  return <div className="toast">{children}</div>;
}

// תגית סטטוס להזמנה: ממתין לאישור / מאושר
export function StatusPill({ status }) {
  if (status === 'pending') return <span className="pill pending">ממתין לאישור ⏳</span>;
  if (status === 'approved') return <span className="pill approved">מאושר ✓</span>;
  return null;
}

export function EmptyState({ emoji = '🗓️', children }) {
  return (
    <div className="empty-state">
      <div className="big">{emoji}</div>
      <div>{children}</div>
    </div>
  );
}
