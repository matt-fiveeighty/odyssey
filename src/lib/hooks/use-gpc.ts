"use client";

import { useSyncExternalStore } from "react";

/**
 * Detect the Global Privacy Control (GPC) signal.
 * See: https://globalprivacycontrol.github.io/gpc-spec/
 *
 * Returns `true` if the browser advertises `navigator.globalPrivacyControl`.
 * Falls back to `false` when the signal is absent or on the server.
 */

// GPC is a static property — it never changes during a session,
// so we use a no-op subscribe and read the snapshot synchronously.
const noop = () => () => {};

function getSnapshot(): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (globalThis.navigator as any)?.globalPrivacyControl === true;
}

function getServerSnapshot(): boolean {
  return false;
}

export function useGPC(): boolean {
  return useSyncExternalStore(noop, getSnapshot, getServerSnapshot);
}
