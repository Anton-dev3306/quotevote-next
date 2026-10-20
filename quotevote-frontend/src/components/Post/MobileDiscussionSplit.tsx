"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  clampQuoteRatio,
  loadPersistedQuoteRatio,
  persistQuoteRatio,
  shouldCollapseOpenSplit,
  snapQuoteRatio,
} from "@/lib/utils/discussionSplit";
import {
  DEFAULT_QUOTE_RATIO,
  DISCUSSION_BAR_HEIGHT_PX,
  MAX_QUOTE_RATIO,
  MIN_QUOTE_RATIO,
  SNAP_QUOTE_RATIOS,
  SPLIT_KEYBOARD_STEP,
} from "@/types/discussionSplit";
import type { MobileDiscussionSplitProps } from "@/types/discussionSplit";

function subscribeSplitRatio(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);
  return () => window.removeEventListener("storage", onStoreChange);
}

/**
 * Mobile Quote page split-screen: collapsed discussion bar, or a vertically
 * resizable Quote / Discussion pair with snap points.
 */
export default function MobileDiscussionSplit({
  open,
  onOpenChange,
  discussionCount,
  quotePane,
  children,
}: MobileDiscussionSplitProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef(0);
  const dragStartRatio = useRef(DEFAULT_QUOTE_RATIO);
  const draggingRef = useRef(false);

  const persistedRatio = useSyncExternalStore(
    subscribeSplitRatio,
    loadPersistedQuoteRatio,
    () => DEFAULT_QUOTE_RATIO
  );
  const [overrideRatio, setOverrideRatio] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const quoteRatio = overrideRatio ?? persistedRatio;
  const quoteRatioRef = useRef(quoteRatio);
  useEffect(() => {
    quoteRatioRef.current = quoteRatio;
  }, [quoteRatio]);

  const restoreDefaultRatio = useCallback(() => {
    persistQuoteRatio(DEFAULT_QUOTE_RATIO);
    setOverrideRatio(DEFAULT_QUOTE_RATIO);
  }, []);

  const handleCollapse = useCallback(() => {
    restoreDefaultRatio();
    onOpenChange(false);
  }, [onOpenChange, restoreDefaultRatio]);

  const finishDrag = useCallback(() => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setIsDragging(false);
    const ratio = quoteRatioRef.current;
    if (shouldCollapseOpenSplit(ratio)) {
      restoreDefaultRatio();
      onOpenChange(false);
      return;
    }
    const snapped = snapQuoteRatio(ratio);
    persistQuoteRatio(snapped);
    setOverrideRatio(snapped);
  }, [onOpenChange, restoreDefaultRatio]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleCollapse();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleCollapse, open]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!open) return;
      draggingRef.current = true;
      dragStartY.current = e.clientY;
      dragStartRatio.current = quoteRatioRef.current;
      setIsDragging(true);
      if (typeof e.currentTarget.setPointerCapture === "function") {
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    },
    [open]
  );

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current || !containerRef.current) return;
    const height = containerRef.current.clientHeight;
    if (height <= 0) return;
    const deltaY = e.clientY - dragStartY.current;
    const next = clampQuoteRatio(dragStartRatio.current + deltaY / height);
    quoteRatioRef.current = next;
    setOverrideRatio(next);
  }, []);

  const handlePointerUp = useCallback(() => {
    finishDrag();
  }, [finishDrag]);

  // Keyboard resizing (#516): Up gives the discussion more room, Down gives the
  // quote more. Home and End go to the largest and smallest snap points.
  const handleDividerKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? SPLIT_KEYBOARD_STEP * 2 : SPLIT_KEYBOARD_STEP;
    const current = quoteRatioRef.current;
    let next: number | null = null;
    if (e.key === "ArrowUp") next = current - step;
    else if (e.key === "ArrowDown") next = current + step;
    else if (e.key === "Home") next = Math.min(...SNAP_QUOTE_RATIOS);
    else if (e.key === "End") next = Math.max(...SNAP_QUOTE_RATIOS);
    else if (e.key === "Enter") next = DEFAULT_QUOTE_RATIO;
    if (next === null) return;
    e.preventDefault();
    // Keys never collapse the pane; that stays a deliberate drag or the close button.
    const clamped = Math.min(MAX_QUOTE_RATIO - step / 2, Math.max(MIN_QUOTE_RATIO, next));
    quoteRatioRef.current = clamped;
    persistQuoteRatio(clamped);
    setOverrideRatio(clamped);
  }, []);

  const title = `Discussion · ${discussionCount}`;
  const quotePercent = Math.round(quoteRatio * 100);
  const discussionPercent = 100 - quotePercent;

  return (
    <div
      ref={containerRef}
      className="flex h-full min-h-0 flex-col overflow-hidden relative"
      data-testid={open ? "discussion-split-view" : "discussion-reading-view"}
    >
      <div
        data-post-detail-pane="content"
        className={cn(
          "min-h-0 overflow-y-auto overscroll-contain",
          open ? "shrink-0" : "flex-1",
          open && !isDragging && "transition-[height] duration-200 ease-out"
        )}
        style={open ? { height: `${quotePercent}%` } : undefined}
      >
        {quotePane}
      </div>

      <div
        data-post-detail-pane="discussion"
        data-testid="discussion-pane"
        className={cn(
          "flex min-h-0 flex-col overflow-hidden bg-card",
          open ? "border-t border-border rounded-t-2xl" : "hidden",
          open && !isDragging && "transition-[height] duration-200 ease-out"
        )}
        style={open ? { height: `${discussionPercent}%` } : undefined}
        hidden={!open}
      >
        <div
          data-discussion-header
          data-testid="discussion-resize-handle"
          className="flex shrink-0 cursor-row-resize touch-none select-none flex-col bg-card border-b border-border/60 has-[[role=separator]:focus-visible]:ring-2 has-[[role=separator]:focus-visible]:ring-inset has-[[role=separator]:focus-visible]:ring-[#52b274]"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div
            role="separator"
            aria-orientation="horizontal"
            aria-valuemin={20}
            aria-valuemax={80}
            aria-valuenow={quotePercent}
            aria-valuetext={`Quote ${quotePercent}%, discussion ${discussionPercent}%`}
            aria-label="Resize quote and discussion panes"
            tabIndex={0}
            onKeyDown={handleDividerKeyDown}
            data-testid="discussion-divider"
            className="flex flex-col items-center pt-1.5 pb-0.5 focus-visible:outline-none"
          >
            {/* A clearer grip: wider, darker and with two lines, so it reads as draggable. */}
            <div className="flex w-12 flex-col gap-[3px] [.neo-brutalism_&]:mt-0">
              <div className="h-[3px] rounded-full bg-foreground/40" />
              <div className="h-[3px] rounded-full bg-foreground/40" />
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 pb-2">
            <span className="text-sm font-semibold text-foreground">{title}</span>
            <button
              type="button"
              className="ml-auto inline-flex size-8 cursor-pointer items-center justify-center rounded-full text-foreground/70 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52b274]"
              aria-label="Collapse discussion"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={handleCollapse}
            >
              {/* The panel slides down when it closes, so the arrow points down. */}
              <ChevronDown className="size-4" />
            </button>
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
      </div>

      {!open ? (
        <button
          type="button"
          data-testid="discussion-collapsed-bar"
          aria-expanded={false}
          aria-label={`Open discussion, ${discussionCount} items`}
          onClick={() => onOpenChange(true)}
          className={cn(
            "flex shrink-0 flex-col items-center justify-center bg-card border-t border-border rounded-t-2xl shadow-[0_-4px_16px_rgba(0,0,0,0.06)]",
            "w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#52b274]"
          )}
          style={{ height: DISCUSSION_BAR_HEIGHT_PX }}
        >
          {/* Hidden spacer so the collapsed bar stays 56px without looking draggable. */}
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mt-1.5 mb-1 opacity-0" />
          <div className="flex w-full items-center gap-2 px-4 pb-2">
            <span className="text-sm font-semibold text-foreground">{title}</span>
            <ChevronUp className="ml-auto size-4 text-foreground/70" aria-hidden="true" />
          </div>
        </button>
      ) : null}
    </div>
  );
}
