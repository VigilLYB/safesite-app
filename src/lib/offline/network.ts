import { useSyncExternalStore } from "react";
import NetInfo, { type NetInfoState } from "@react-native-community/netinfo";
import { onlineManager } from "@tanstack/react-query";

/** Unknown (null) counts as online: only a definite "no" pauses the app's network work. */
export const isOnlineState = (state: Pick<NetInfoState, "isConnected" | "isInternetReachable">) =>
  state.isConnected !== false && state.isInternetReachable !== false;

/**
 * React Query's idea of "online" follows NetInfo. While offline, queries keep showing what they
 * have (from memory or the saved cache) instead of failing, and refetch when the connection
 * returns. Call once at startup.
 */
export function connectOnlineManager(): void {
  onlineManager.setEventListener((setOnline) =>
    NetInfo.addEventListener((state) => setOnline(isOnlineState(state))),
  );
}

export const isOnline = (): boolean => onlineManager.isOnline();

/** Runs `fn` every time the device goes from offline to online. Returns an unsubscribe. */
export function onReconnect(fn: () => void): () => void {
  let was = onlineManager.isOnline();
  return onlineManager.subscribe((online) => {
    if (online && !was) fn();
    was = online;
  });
}

export function useIsOnline(): boolean {
  return useSyncExternalStore(
    (listener) => onlineManager.subscribe(listener),
    () => onlineManager.isOnline(),
    () => true,
  );
}
