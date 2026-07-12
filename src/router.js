import { useState, useEffect, useCallback } from 'react';

// ראוטר hash זעיר. מסלולים: '#/', '#/new', '#/my-bookings', '#/profile', '#/roni'
function currentPath() {
  const h = window.location.hash.replace(/^#/, '');
  return h || '/';
}

export function useHashRoute() {
  const [path, setPath] = useState(currentPath());
  useEffect(() => {
    const onChange = () => setPath(currentPath());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  const navigate = useCallback((to) => {
    window.location.hash = to.startsWith('/') ? to : `/${to}`;
  }, []);
  return [path, navigate];
}

export function navigate(to) {
  window.location.hash = to.startsWith('/') ? to : `/${to}`;
}
