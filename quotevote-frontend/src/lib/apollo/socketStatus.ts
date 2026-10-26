/**
 * WebSocket connection status for GraphQL subscriptions.
 *
 * The graphql-ws client in `apollo-client.ts` reports here when it connects
 * and closes, so components can poll only while live updates are down (#625).
 */

import type { SocketStatusListener } from "@/types/hooks";

let connected = false;
const listeners = new Set<SocketStatusListener>();

export function isSocketConnected(): boolean {
  return connected;
}

export function setSocketConnected(value: boolean): void {
  if (connected === value) return;
  connected = value;
  listeners.forEach((listener) => listener());
}

export function subscribeSocketStatus(listener: SocketStatusListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
