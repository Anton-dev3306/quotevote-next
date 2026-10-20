import type { PresenceStatus } from "@/types/chat";

/** What each presence status is called in the Messages panel. */
export const PRESENCE_LABEL: Record<PresenceStatus, string> = {
  online: "Online",
  away: "Away",
  dnd: "Do Not Disturb",
  offline: "Offline",
  invisible: "Offline",
};

/**
 * Presence dot fill and edge (#531). Away is a clear yellow, not the amber that
 * read as a second orange-green next to Online; each dot has a darker edge so
 * it stays visible on white and on the green header.
 */
export const PRESENCE_DOT_CLASS: Record<PresenceStatus, string> = {
  online: "border border-[#2f7a4c] bg-[#52b274]",
  away: "border border-[#a16207] bg-[#facc15]",
  dnd: "border border-[#b91c1c] bg-[#ef4444]",
  offline: "border border-[#71717a] bg-[#a1a1aa]",
  invisible: "border border-[#71717a] bg-[#a1a1aa]",
};

/** Readable status text next to a name, in both themes. */
export const PRESENCE_TEXT_CLASS: Record<PresenceStatus, string> = {
  online: "text-[#2f6f4a] dark:text-[#7fdc9c]",
  away: "text-[#854d0e] dark:text-[#fde047]",
  dnd: "text-[#b91c1c] dark:text-[#fca5a5]",
  offline: "text-muted-foreground",
  invisible: "text-muted-foreground",
};

export const toPresenceStatus = (status: string | null | undefined): PresenceStatus =>
  status && status in PRESENCE_LABEL ? (status as PresenceStatus) : "offline";
