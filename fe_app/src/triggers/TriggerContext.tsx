import React, { createContext, useCallback, useMemo, useRef, useState } from 'react';

type TriggerMode = 'voice' | 'playpause';

type Ctx = {
  mode: TriggerMode;
  setMode: (m: TriggerMode) => void;
  registerPlayPause: (fn: (() => void) | null) => void;
  getPlayPause: () => (() => void) | null;
};

export const TriggerContext = createContext<Ctx>({
  mode: 'voice',
  setMode: () => {},
  registerPlayPause: () => {},
  getPlayPause: () => null,
});

export function TriggerProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<TriggerMode>('voice');
  const playPauseRef = useRef<(() => void) | null>(null);

  const registerPlayPause = useCallback((fn: (() => void) | null) => {
    playPauseRef.current = fn;
  }, []);

  const getPlayPause = useCallback(() => playPauseRef.current, []);

  const value = useMemo(
    () => ({ mode, setMode, registerPlayPause, getPlayPause }),
    [mode, registerPlayPause, getPlayPause]
  );

  return <TriggerContext.Provider value={value}>{children}</TriggerContext.Provider>;
}