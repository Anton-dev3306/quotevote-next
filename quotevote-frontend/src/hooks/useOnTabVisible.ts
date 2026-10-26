import { useEffect, useRef } from "react";

/** Calls `callback` each time the tab becomes visible again. */
export function useOnTabVisible(callback: () => void, enabled = true): void {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") callbackRef.current();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [enabled]);
}

export default useOnTabVisible;
