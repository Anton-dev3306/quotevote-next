"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import type { UseAutoResizeTextareaReturn } from "@/types/hooks";

/**
 * Grow a textarea to fit its content instead of scrolling inside a fixed box.
 *
 * CSS `field-sizing: content` would do this, but Safari and Firefox don't
 * support it yet, so the height is set from `scrollHeight` whenever the value
 * changes. Minimum height still comes from the textarea's own CSS (`min-h-*`).
 *
 * @param value - Current textarea value; the height is recomputed when it changes
 *
 * @example
 * ```tsx
 * const text = watch('text') ?? ''
 * const { ref: autoResizeRef } = useAutoResizeTextarea(text)
 * const { ref: registerRef, ...rest } = register('text')
 * <Textarea {...rest} ref={(el) => { registerRef(el); autoResizeRef.current = el }} />
 * ```
 */
export function useAutoResizeTextarea(value: string): UseAutoResizeTextareaReturn {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useLayoutEffect(() => {
    resize();
  }, [value, resize]);

  return { ref, resize };
}
