import { Alert } from 'react-native';

// Runs a delete (or other one-off action) from a confirmation dialog. If it fails, says so
// instead of silently staying on the screen.
export async function attempt(action: () => Promise<unknown>, onDone: () => void, failTitle = "Couldn't delete") {
  try {
    await action();
    onDone();
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    Alert.alert(failTitle, `${message}\n\nCheck your connection and try again.`);
  }
}
