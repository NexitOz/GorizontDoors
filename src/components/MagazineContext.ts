import { createContext, useContext } from 'react';
export const MagazineContext = createContext({ paused: false, reduced: false });
export const useMagazine = () => useContext(MagazineContext);
