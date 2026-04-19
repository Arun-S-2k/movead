import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { loadSession, setAuthListener } from '../constants/store';

export default function Layout() {
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const init = async () => {
      const hasSession = await loadSession();
      setLoggedIn(hasSession);
      setReady(true);
    };
    init();

    // Listen for login/logout events
    setAuthListener((isLoggedIn) => {
      setLoggedIn(isLoggedIn);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    const currentRoute = String(segments[0] || '');
    if (loggedIn && (currentRoute === '' || currentRoute === 'index' || currentRoute === '(index)')) {
      router.replace('/dashboard');
    }
    if (!loggedIn && currentRoute === 'dashboard') {
      router.replace('/');
    }
  }, [ready, loggedIn, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
