import { useNavigation } from 'expo-router';
import { usePreventRemove } from 'expo-router/react-navigation';
import { useRef } from 'react';
import { Alert } from 'react-native';

// Asks before leaving a screen with unsaved changes (back button, swipe back, or closing).
// Call allowLeave() just before navigating away after a successful save, and blockLeave() if the save fails.
export function useUnsavedChanges(dirty: boolean) {
  const navigation = useNavigation();
  const leaving = useRef(false);

  usePreventRemove(dirty, ({ data }) => {
    if (leaving.current) {
      navigation.dispatch(data.action);
      return;
    }
    Alert.alert('Discard your changes?', 'You have changes on this screen that are not saved yet.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => navigation.dispatch(data.action) },
    ]);
  });

  return {
    allowLeave: () => {
      leaving.current = true;
    },
    blockLeave: () => {
      leaving.current = false;
    },
  };
}
