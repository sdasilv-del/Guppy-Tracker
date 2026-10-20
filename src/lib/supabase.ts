import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type Session } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import type { Database } from '@/lib/database.types';
import { clearOfflineData, getSyncState, offlineFetch, setTokenProvider } from '@/lib/offline';

// The Guppy Tracker project. The publishable key is safe to ship in the app:
// row level security decides what each signed-in account can read and write.
// Set EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY in .env to point at another project.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://mhikrakszlfmwicgeoba.supabase.co';
const anonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_jrO8ZUnEN4SObJikuiMm4A_Xgpizxml';

export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  // Saves reads for offline use and queues saves made without a connection.
  global: { fetch: offlineFetch },
});

// Offline with an expired sign-in, Supabase keeps retrying the refresh for up to 30 seconds and then
// reports no session, which would send you back to the sign-in screen. Instead, wait a few seconds
// at most and keep using the saved sign-in; it refreshes on its own once you're back online.
const getSessionOnline = supabase.auth.getSession.bind(supabase.auth);
const SESSION_WAIT_MS = 4000;

async function savedSession(): Promise<Session | null> {
  try {
    const key = (supabase.auth as unknown as { storageKey: string }).storageKey;
    const saved = JSON.parse((await AsyncStorage.getItem(key)) ?? 'null');
    return saved?.access_token && saved?.user ? (saved as Session) : null;
  } catch {
    return null;
  }
}

supabase.auth.getSession = async () => {
  const saved = await savedSession();
  if (!saved) return getSessionOnline();
  // Already known to be offline: don't wait on a refresh that can't succeed.
  const expired = (saved.expires_at ?? 0) * 1000 < Date.now();
  if (expired && getSyncState().offline) return { data: { session: saved }, error: null };
  const online = getSessionOnline();
  online.catch(() => {});
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), SESSION_WAIT_MS));
  const result = await Promise.race([online, timeout]);
  if (result && (result.data.session || !getSyncState().offline)) return result;
  return { data: { session: saved }, error: null };
};

setTokenProvider(async () => (await supabase.auth.getSession()).data.session?.access_token ?? null);

supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') void clearOfflineData();
});

// Keep the session fresh only while the app is in the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
