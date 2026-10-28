import type { Prisma } from '@prisma/client';

export const MESSAGE_SEARCH_DEFAULT_LIMIT = 20;
export const MESSAGE_SEARCH_MAX_LIMIT = 50;
export const MESSAGE_SEARCH_MAX_TEXT_LENGTH = 200;

const SNIPPET_RADIUS = 60;

// Only what a search hit needs. Deleted messages are filtered in the query
// (`deleted: { not: true }`), which also keeps legacy messages without the flag.
export const MESSAGE_SEARCH_SELECT = {
  id: true,
  messageRoomId: true,
  userId: true,
  text: true,
  created: true,
} as const satisfies Prisma.MessageSelect;

/**
 * Short excerpt around the first match, on a single line, with an ellipsis on
 * each side that was cut.
 */
export function buildSnippet(text: string, query: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  const index = flat.toLowerCase().indexOf(query.toLowerCase());

  if (index === -1) {
    return flat.length > SNIPPET_RADIUS * 2 ? `${flat.slice(0, SNIPPET_RADIUS * 2)}…` : flat;
  }

  const start = Math.max(0, index - SNIPPET_RADIUS);
  const end = Math.min(flat.length, index + query.length + SNIPPET_RADIUS);
  return `${start > 0 ? '…' : ''}${flat.slice(start, end)}${end < flat.length ? '…' : ''}`;
}

export interface MessageSearchCursor {
  created: Date;
  id: string;
}

export function encodeSearchCursor(created: Date, id: string): string {
  return `${created.getTime()}_${id}`;
}

export function parseSearchCursor(cursor: string): MessageSearchCursor | null {
  const match = /^(\d{1,15})_([a-fA-F0-9]{24})$/.exec(cursor);
  if (!match) return null;
  return { created: new Date(Number(match[1])), id: match[2] };
}
