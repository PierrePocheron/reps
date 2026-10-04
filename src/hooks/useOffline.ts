import { useEffect, useState } from 'react';
import { isOffline, onNetworkChange } from '@/firebase';

/**
 * Network state for the offline banner. Pending writes are sent by Firestore itself on reconnect.
 */
export function useOffline() {
  const [online, setOnline] = useState(!isOffline());

  useEffect(() => onNetworkChange(setOnline), []);

  return {
    isOnline: online,
    isOffline: !online,
  };
}

