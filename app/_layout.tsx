import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { loadSession } from '../constants/store';

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
  }, []);

  useEffect(() => {
    if (!ready) return;
    const currentRoute = String(segments[0] || '');
    if (loggedIn && (currentRoute === '' || currentRoute === 'index' || currentRoute === '(index)')) {
      router.replace('/dashboard');
    }
  }, [ready, loggedIn, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
