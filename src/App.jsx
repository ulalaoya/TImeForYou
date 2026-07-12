import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AppContext } from './AppContext.js';
import { useHashRoute } from './router.js';
import { initData, IS_DEMO, getAppConfig, findFamilyByPhone } from './data/index.js';
import { loadManifest, assetUrl } from './utils/assets.js';
import { Spinner } from './components/common.jsx';
import BottomNav from './components/BottomNav.jsx';
import Onboarding from './screens/Onboarding.jsx';
import Home from './screens/Home.jsx';
import NewBooking from './screens/NewBooking.jsx';
import MyBookings from './screens/MyBookings.jsx';
import Profile from './screens/Profile.jsx';
import Roni from './screens/Roni.jsx';

const IDENTITY_KEY = 'tfy_identity';
const DEMO_DISMISS_KEY = 'tfy_demo_dismissed';

export default function App() {
  const [ready, setReady] = useState(false);
  const [config, setConfig] = useState(null);
  const [manifest, setManifest] = useState(null);
  const [family, setFamily] = useState(null);
  const [editing, setEditing] = useState(null); // הזמנה שבעריכה (זרימת "עריכה")
  const [demoDismissed, setDemoDismissed] = useState(
    () => localStorage.getItem(DEMO_DISMISS_KEY) === '1'
  );
  const [path, navigate] = useHashRoute();

  // עזיבת מסך ההזמנה (מעבר החוצה מ-/new) מנקה מצב עריכה (ביטול עריכה).
  // משתמשים ב-ref כדי לזהות מעבר אמיתי, ולא לנקות כשה-path עדיין לא התעדכן
  // מיד אחרי setEditing(...) שקורה לפני הניווט.
  const prevPathRef = useRef(path);
  useEffect(() => {
    const prev = prevPathRef.current;
    prevPathRef.current = path;
    if (prev === '/new' && path !== '/new') setEditing(null);
  }, [path]);

  useEffect(() => {
    (async () => {
      await initData();
      const [cfg, mani] = await Promise.all([getAppConfig(), loadManifest()]);
      setConfig(cfg);
      setManifest(mani);
      // זהות שמורה
      try {
        const raw = localStorage.getItem(IDENTITY_KEY);
        if (raw) {
          const { phone } = JSON.parse(raw);
          const fam = await findFamilyByPhone(phone);
          if (fam) setFamily(fam);
          else localStorage.removeItem(IDENTITY_KEY);
        }
      } catch (e) { /* ignore */ }
      setReady(true);
    })();
  }, []);

  const setIdentity = useCallback((fam) => {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify({ familyId: fam.id, phone: fam.phone }));
    setFamily(fam);
    navigate('/');
  }, [navigate]);

  const clearIdentity = useCallback(() => {
    localStorage.removeItem(IDENTITY_KEY);
    setFamily(null);
    navigate('/');
  }, [navigate]);

  const dismissDemo = () => {
    localStorage.setItem(DEMO_DISMISS_KEY, '1');
    setDemoDismissed(true);
  };

  if (!ready) {
    return (
      <div className="app-shell">
        <div className="screen no-nav center-col">
          <img className="logo-full" src={assetUrl('logo-full.png')} alt="TimeForYou" style={{ marginTop: 60 }} />
          <Spinner />
        </div>
      </div>
    );
  }

  const ctx = { config, manifest, isDemo: IS_DEMO, family, setIdentity, clearIdentity, editing, setEditing };
  const isRoni = path.startsWith('/roni');

  let screen;
  if (isRoni) {
    screen = <Roni navigate={navigate} />;
  } else if (!family) {
    screen = <Onboarding />;
  } else if (path === '/new') {
    screen = <NewBooking navigate={navigate} />;
  } else if (path === '/my-bookings') {
    screen = <MyBookings navigate={navigate} />;
  } else if (path === '/profile') {
    screen = <Profile navigate={navigate} />;
  } else {
    screen = <Home navigate={navigate} />;
  }

  const showNav = family && !isRoni;

  return (
    <AppContext.Provider value={ctx}>
      <div className="app-shell">
        {IS_DEMO && !demoDismissed && (
          <div className="demo-banner">
            <span>🧪 מצב הדגמה מקומי — הנתונים נשמרים במכשיר עד לחיבור Firebase</span>
            <button onClick={dismissDemo} aria-label="סגירה">✕</button>
          </div>
        )}
        {screen}
        {showNav && <BottomNav path={path} navigate={navigate} />}
      </div>
    </AppContext.Provider>
  );
}
