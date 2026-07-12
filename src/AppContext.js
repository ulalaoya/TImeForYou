import { createContext, useContext } from 'react';

// context גלובלי: config, manifest, family (זהות), פעולות
export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);
