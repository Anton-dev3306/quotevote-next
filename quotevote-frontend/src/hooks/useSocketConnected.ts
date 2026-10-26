import { useSyncExternalStore } from "react";
import { isSocketConnected, subscribeSocketStatus } from "@/lib/apollo/socketStatus";

/** True while the GraphQL subscription WebSocket is connected. */
export function useSocketConnected(): boolean {
  return useSyncExternalStore(subscribeSocketStatus, isSocketConnected, () => false);
}

export default useSocketConnected;
