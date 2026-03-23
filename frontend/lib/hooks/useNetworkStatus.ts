/**
 * Hook to monitor network status using @capacitor/network.
 * Updates the Zustand store's isOnline state.
 *
 * NOTE: This is a stub — the full implementation is provided by plan 07-02.
 * This stub enables plan 07-03 (BottomTabBar/layout) to compile and run
 * while 07-02 executes in parallel.
 */
import { useEffect } from 'react'

export function useNetworkStatus() {
  useEffect(() => {
    // Stub: real implementation wires @capacitor/network events to setIsOnline in store
  }, [])
}
