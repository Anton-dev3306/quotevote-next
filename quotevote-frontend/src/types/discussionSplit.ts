/**
 * Types and constants for the Quote page split view: the vertical split on
 * portrait phones and the side-by-side split everywhere else (#516).
 */

import type { ReactNode } from "react";

export const DISCUSSION_BAR_HEIGHT_PX = 56;
/** Opening the discussion on a phone starts at about half and half (#516). */
export const DEFAULT_QUOTE_RATIO = 0.5;
export const SNAP_QUOTE_RATIOS = [0.75, 0.5, 0.25] as const;
export const SNAP_THRESHOLD = 0.045;
/** Smallest Quote share while Discussion stays open (~80/20). */
export const MIN_QUOTE_RATIO = 0.2;
/** Largest Quote share while Discussion stays open. Releasing here collapses. */
export const MAX_QUOTE_RATIO = 0.8;
export const SPLIT_RATIO_STORAGE_KEY = "qv-mobile-discussion-split";

/** Side-by-side split (desktop, tablet, landscape phones), as the post pane's share. */
export const DEFAULT_CONTENT_RATIO = 0.5;
/** Neither side gets narrower than this, so both stay usable. */
export const MIN_SPLIT_PANE_WIDTH_PX = 320;
/** Arrow keys move the divider by this share; Shift+Arrow by twice as much. */
export const SPLIT_KEYBOARD_STEP = 0.05;
export const DESKTOP_SPLIT_RATIO_STORAGE_KEY = "qv-discussion-split";

/**
 * A comment (or other action) that references a specific passage in the Quote.
 */
export interface LinkedPassage {
  actionId: string;
  startWordIndex: number;
  endWordIndex: number;
}

export interface TextRange {
  start: number;
  end: number;
}

export interface MobileDiscussionSplitProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discussionCount: number;
  quotePane: ReactNode;
  children: ReactNode;
}

export interface DiscussionSplitPaneProps {
  contentPane: ReactNode;
  children: ReactNode;
  className?: string;
}

export interface SplitRatioBounds {
  min: number;
  max: number;
}
