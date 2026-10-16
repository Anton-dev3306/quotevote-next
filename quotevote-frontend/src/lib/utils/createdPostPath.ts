import { toAppPostUrl } from "@/lib/utils/sanitizeUrl";

/**
 * In-app path for a post the API just created, or null when the response has
 * no usable path. Only same-app relative paths are accepted, so the success
 * toast never links off-site.
 */
export const getCreatedPostPath = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const path = toAppPostUrl(url.trim());
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  return path;
};
