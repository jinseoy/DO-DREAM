import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

export function useScreenReaderEnabled() {
  const [enabled, setEnabled] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    AccessibilityInfo.isScreenReaderEnabled().then((v) => mounted.current && setEnabled(v));
    const sub = AccessibilityInfo.addEventListener('screenReaderChanged', (v) => mounted.current && setEnabled(v));
    return () => {
      mounted.current = false;
      // @ts-ignore
      sub?.remove?.();
    };
  }, []);

  return enabled;
}

export function useDoublePress(intervalMs = 350) {
  const lastAtRef = useRef<number | null>(null);
  const [fired, setFired] = useState(false);

  const mark = () => {
    const now = Date.now();
    if (lastAtRef.current && now - lastAtRef.current <= intervalMs) {
      setFired(true);
      lastAtRef.current = null;
    } else {
      lastAtRef.current = now;
      setFired(false);
    }
  };
  const consume = () => setFired(false);
  return { fired, mark, consume };
}
