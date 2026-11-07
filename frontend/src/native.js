import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Network } from '@capacitor/network';

// Android hardware/gesture back: go back in history, or exit at the root.
export function useBackButton() {
  useEffect(() => {
    if (Capacitor.getPlatform() !== 'android') return;
    const sub = CapApp.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) window.history.back();
      else CapApp.exitApp();
    });
    return () => { sub.then((h) => h.remove()); };
  }, []);
}

// Device connectivity (works on web too).
export function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    Network.getStatus().then((s) => setOnline(s.connected));
    const sub = Network.addListener('networkStatusChange', (s) => setOnline(s.connected));
    return () => { sub.then((h) => h.remove()); };
  }, []);
  return online;
}
