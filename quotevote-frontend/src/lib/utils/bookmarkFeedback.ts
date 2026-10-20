import { toast } from "sonner";

/**
 * Confirms a bookmark toggle. `wasSaved` is the state before the click, since the
 * bookmark mutation toggles. Sonner renders toasts in a live region, so screen readers hear it.
 */
export function announceBookmarkChange(wasSaved: boolean): void {
  toast.success(wasSaved ? "Removed from your saved posts" : "Post saved");
}
