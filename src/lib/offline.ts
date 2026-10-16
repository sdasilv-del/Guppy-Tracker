import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

// Offline support for the fish room, where wifi is often weak.
//
// Every request to Supabase goes through offlineFetch:
// - Reads are saved on the phone after they load, and the saved copy is used when there is no
//   connection, so screens you have opened before still show up offline.
// - Saves that don't need anything back from the server (logs, edits, deletes) are queued on the
//   phone when there is no connection and sent, in order, once it comes back.
// - Saves that need the server's reply (creating a new tank, fish, spawn or group, uploading a
//   photo) fail with a plain "you're offline" message instead.

const QUEUE_KEY = 'gt-offline-queue';
const FAILED_KEY = 'gt-offline-failed';
const CACHE_PREFIX = 'gt-cache:';
const MAX_CACHED_BODY = 500_000;
const RETRY_MS = 20_000;

export type QueuedWrite = {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  label: string;
  queuedAt: string;
  error?: string;
};

export type SyncState = {
  offline: boolean;
  pending: QueuedWrite[];
  failed: QueuedWrite[];
  syncing: boolean;
};

let state: SyncState = { offline: false, pending: [], failed: [], syncing: false };
const listeners = new Set<() => void>();
const syncedListeners = new Set<() => void>();
let getToken: () => Promise<string | null> = async () => null;
let retryTimer: ReturnType<typeof setInterval> | null = null;

const baseFetch: typeof fetch = (...args) => fetch(...args);

function setState(patch: Partial<SyncState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function getSyncState() {
  return state;
}

export function subscribeSync(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// Called after queued saves reach the server, so open screens can reload.
export function onSynced(listener: () => void) {
  syncedListeners.add(listener);
  return () => {
    syncedListeners.delete(listener);
  };
}

// Replayed saves use the current sign-in, not the one saved with the request, which may have expired.
export function setTokenProvider(provider: () => Promise<string | null>) {
  getToken = provider;
}

const loaded = (async () => {
  try {
    const [q, f] = await AsyncStorage.multiGet([QUEUE_KEY, FAILED_KEY]);
    setState({
      pending: q[1] ? JSON.parse(q[1]) : [],
      failed: f[1] ? JSON.parse(f[1]) : [],
    });
  } catch {
    // A broken queue shouldn't stop the app from opening.
  }
  scheduleRetry();
})();

async function persist() {
  await AsyncStorage.multiSet([
    [QUEUE_KEY, JSON.stringify(state.pending)],
    [FAILED_KEY, JSON.stringify(state.failed)],
  ]);
}

function scheduleRetry() {
  if (state.pending.length > 0 && !retryTimer) {
    retryTimer = setInterval(() => void syncNow(), RETRY_MS);
  } else if (state.pending.length === 0 && retryTimer) {
    clearInterval(retryTimer);
    retryTimer = null;
  }
}

AppState.addEventListener('change', (s) => {
  if (s === 'active') void syncNow();
});

// Names for the "couldn't save" list, e.g. "New water test".
const TABLE_NAMES: Record<string, string> = {
  tanks: 'tank',
  fish: 'fish',
  water_tests: 'water test',
  water_changes: 'water change',
  fish_moves: 'fish move',
  fish_photos: 'photo',
  traits: 'trait',
  fish_traits: 'trait record',
  breeding_groups: 'breeding group',
  breeding_group_members: 'group members',
  breeding_group_traits: 'group traits',
  spawns: 'spawn',
  spawn_events: 'spawn event',
  evaluations: 'evaluation',
  show_entries: 'show entry',
  sales: 'sale',
  profiles: 'profile',
};

function describe(url: string, method: string) {
  const table = url.match(/\/rest\/v1\/([^?/]+)/)?.[1] ?? '';
  const name = TABLE_NAMES[table] ?? table.replace(/_/g, ' ');
  const verb = method === 'POST' ? 'New' : method === 'DELETE' ? 'Deleted' : 'Edited';
  return `${verb} ${name}`;
}

function plainHeaders(init?: RequestInit): Record<string, string> {
  const out: Record<string, string> = {};
  new Headers(init?.headers).forEach((value, key) => {
    out[key.toLowerCase()] = value;
  });
  return out;
}

function isNetworkError(e: unknown) {
  // A lost connection makes fetch throw a TypeError ("Network request failed"). Anything else,
  // such as an abort or a bug, is passed through so the real error shows instead of "offline".
  return e instanceof TypeError;
}

// 504 rather than 503: Supabase retries 503s, which would only delay the message.
function offlineResponse(message: string) {
  return new Response(JSON.stringify({ message, code: 'OFFLINE' }), {
    status: 504,
    headers: { 'content-type': 'application/json' },
  });
}

function rebuild(status: number, statusText: string, headers: Record<string, string>, body: string) {
  const empty = status === 204 || status === 205 || status === 304;
  return new Response(empty ? null : body, { status, statusText, headers });
}

function cacheKey(method: string, url: string, headers: Record<string, string>, body: string | null) {
  return `${CACHE_PREFIX}${method} ${headers.accept ?? ''} ${headers.prefer ?? ''} ${url} ${body ?? ''}`;
}

async function cachedRead(method: string, url: string, init: RequestInit | undefined, body: string | null) {
  const headers = plainHeaders(init);
  const key = cacheKey(method, url, headers, body);
  let res: Response;
  try {
    res = await baseFetch(url, init);
  } catch (e) {
    if (!isNetworkError(e)) throw e;
    setState({ offline: true });
    const saved = await AsyncStorage.getItem(key).catch(() => null);
    if (!saved) {
      return offlineResponse("You're offline, and this hasn't been opened on this phone yet.");
    }
    const { status, statusText, headers: savedHeaders, body: savedBody } = JSON.parse(saved);
    return rebuild(status, statusText, savedHeaders, savedBody);
  }
  wentOnline();
  // Back online with a sign-in that expired while offline: show the saved copy this once;
  // the sign-in refreshes and the next load is live.
  if (res.status === 401) {
    const saved = await AsyncStorage.getItem(key).catch(() => null);
    if (saved) {
      const { status, statusText, headers: savedHeaders, body: savedBody } = JSON.parse(saved);
      return rebuild(status, statusText, savedHeaders, savedBody);
    }
  }
  const text = await res.text();
  const keep: Record<string, string> = {};
  for (const h of ['content-type', 'content-range']) {
    const v = res.headers.get(h);
    if (v) keep[h] = v;
  }
  if (res.ok && text.length <= MAX_CACHED_BODY) {
    AsyncStorage.setItem(
      key,
      JSON.stringify({ status: res.status, statusText: res.statusText, headers: keep, body: text }),
    ).catch(() => {});
  }
  return rebuild(res.status, res.statusText, keep, text);
}

async function enqueue(url: string, method: string, headers: Record<string, string>, body: string | null) {
  await loaded;
  delete headers.authorization;
  delete headers['x-retry-count'];
  const item: QueuedWrite = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    url,
    method,
    headers,
    body,
    label: describe(url, method),
    queuedAt: new Date().toISOString(),
  };
  setState({ pending: [...state.pending, item] });
  await persist();
  scheduleRetry();
  return new Response(null, { status: method === 'POST' ? 201 : 204 });
}

async function queueableWrite(url: string, method: string, init: RequestInit | undefined) {
  const headers = plainHeaders(init);
  const body = typeof init?.body === 'string' ? init.body : null;
  await loaded;
  // Keep saves in order: while older ones are waiting, newer ones wait behind them.
  if (state.pending.length > 0) {
    const res = await enqueue(url, method, headers, body);
    void syncNow();
    return res;
  }
  try {
    const res = await baseFetch(url, init);
    wentOnline();
    // The sign-in expired while offline: keep the save and send it once the sign-in has refreshed.
    if (res.status === 401) return enqueue(url, method, headers, body);
    return res;
  } catch (e) {
    if (!isNetworkError(e)) throw e;
    setState({ offline: true });
    return enqueue(url, method, headers, body);
  }
}

async function onlineOnly(url: string, init: RequestInit | undefined) {
  try {
    const res = await baseFetch(url, init);
    wentOnline();
    return res;
  } catch (e) {
    if (!isNetworkError(e)) throw e;
    setState({ offline: true });
    return offlineResponse("You're offline. This needs a connection, so try again once you're back online.");
  }
}

function wentOnline() {
  if (state.offline) setState({ offline: false });
  if (state.pending.length > 0) void syncNow();
}

export const offlineFetch: typeof fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  const method = (init?.method ?? 'GET').toUpperCase();
  const body = typeof init?.body === 'string' ? init.body : null;

  if (url.includes('/rest/v1/')) {
    if (method === 'GET' || method === 'HEAD') return cachedRead(method, url, init, null);
    const prefer = plainHeaders(init).prefer ?? '';
    const needsReply = prefer.includes('return=representation') || url.includes('/rest/v1/rpc/');
    if (needsReply) return onlineOnly(url, init);
    return queueableWrite(url, method, init);
  }
  // Signed photo links: reusing the saved ones lets the image cache show photos offline.
  if (url.includes('/storage/v1/object/sign/')) return cachedRead(method, url, init, body);
  if (url.includes('/storage/v1/')) return onlineOnly(url, init);
  try {
    return await baseFetch(input, init);
  } catch (e) {
    // A failed sign-in refresh is often the first sign the connection is gone.
    if (isNetworkError(e)) setState({ offline: true });
    throw e;
  }
};

let syncing: Promise<void> | null = null;

// Sends queued saves in order. Stops at the first one that can't get through and tries again later.
export function syncNow(): Promise<void> {
  if (!syncing) {
    syncing = runSync().finally(() => {
      syncing = null;
    });
  }
  return syncing;
}

async function runSync() {
  await loaded;
  if (state.pending.length === 0) return;
  setState({ syncing: true });
  let sent = 0;
  try {
    while (state.pending.length > 0) {
      const item = state.pending[0];
      const token = await getToken();
      if (!token) break;
      let res: Response;
      try {
        res = await baseFetch(item.url, {
          method: item.method,
          headers: { ...item.headers, authorization: `Bearer ${token}` },
          body: item.body ?? undefined,
        });
      } catch {
        setState({ offline: true });
        break;
      }
      if (state.offline) setState({ offline: false });
      // Expired sign-in or a server hiccup: leave it queued and try again later.
      if (res.status === 401 || res.status >= 500) break;
      const rest = state.pending.slice(1);
      if (res.ok) {
        setState({ pending: rest });
        sent++;
      } else {
        const text = await res.text().catch(() => '');
        let message = text;
        try {
          message = JSON.parse(text).message ?? text;
        } catch {}
        setState({ pending: rest, failed: [...state.failed, { ...item, error: message || `Error ${res.status}` }] });
      }
      await persist();
    }
  } finally {
    setState({ syncing: false });
    scheduleRetry();
  }
  if (sent > 0) syncedListeners.forEach((l) => l());
}

// Puts saves the server turned down back in the queue, e.g. after fixing what blocked them.
export async function retryFailed() {
  await loaded;
  setState({ pending: [...state.pending, ...state.failed.map(({ error: _, ...item }) => item)], failed: [] });
  await persist();
  scheduleRetry();
  await syncNow();
}

export async function discardFailed() {
  await loaded;
  setState({ failed: [] });
  await persist();
}

// On sign-out, forget everything saved for that account so the next person can't see or send it.
export async function clearOfflineData() {
  await loaded;
  setState({ pending: [], failed: [], offline: false });
  scheduleRetry();
  const keys = await AsyncStorage.getAllKeys();
  await AsyncStorage.multiRemove([QUEUE_KEY, FAILED_KEY, ...keys.filter((k) => k.startsWith(CACHE_PREFIX))]);
}
