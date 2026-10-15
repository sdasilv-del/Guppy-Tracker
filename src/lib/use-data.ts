import { useIsFocused } from 'expo-router';
import { useEffect, useEffectEvent, useState } from 'react';

// Loads data whenever the screen comes into focus, so lists refresh after editing elsewhere.
export function useFocusData<T>(load: () => Promise<T>) {
  const focused = useIsFocused();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    try {
      setData(await load());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const onFocus = useEffectEvent(() => {
    reload();
  });

  useEffect(() => {
    // Data is set after the request resolves, not synchronously in this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (focused) onFocus();
  }, [focused]);

  return { data, error, reload };
}
