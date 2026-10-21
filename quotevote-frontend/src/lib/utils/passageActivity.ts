import { parseApiDate } from "@/lib/utils/apiDate";
import type { PassageAction, PassageActivitySegment } from "@/types/voting";

type Kind = "up" | "down" | "quote" | "comment";

interface RangedAction {
  id: string;
  start: number;
  end: number;
  kind: Kind;
  created: number;
}

const toRanged = (action: PassageAction, kind: Kind, textLength: number): RangedAction | null => {
  if (action.startWordIndex == null || action.endWordIndex == null) return null;
  const start = Number(action.startWordIndex);
  const end = Number(action.endWordIndex);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  const s = Math.max(0, Math.min(start, textLength));
  const e = Math.max(0, Math.min(end, textLength));
  if (e <= s) return null;
  const created = parseApiDate(action.created)?.getTime() ?? 0;
  return { id: action._id, start: s, end: e, kind, created };
};

/**
 * Passages of a post that already have votes, quotes or passage comments (#548).
 * Overlapping or touching ranges merge into one segment, so the text stays
 * readable and each segment matches one mark (react-highlight-words joins
 * touching chunks too). Segments are sorted by position.
 */
export function buildPassageActivity(
  text: string,
  {
    votes = [],
    quotes = [],
    comments = [],
  }: {
    votes?: Array<PassageAction & { type?: string | null }> | null;
    quotes?: PassageAction[] | null;
    comments?: PassageAction[] | null;
  }
): PassageActivitySegment[] {
  const length = text.length;
  const ranged: RangedAction[] = [
    ...(votes ?? []).map((v) => toRanged(v, v.type === "down" ? "down" : "up", length)),
    ...(quotes ?? []).map((q) => toRanged(q, "quote", length)),
    ...(comments ?? []).map((c) => toRanged(c, "comment", length)),
  ].filter((r): r is RangedAction => r !== null);

  ranged.sort((a, b) => a.start - b.start || a.end - b.end);

  const groups: RangedAction[][] = [];
  let groupEnd = -1;
  for (const action of ranged) {
    if (groups.length > 0 && action.start <= groupEnd) {
      groups[groups.length - 1].push(action);
      groupEnd = Math.max(groupEnd, action.end);
    } else {
      groups.push([action]);
      groupEnd = action.end;
    }
  }

  return groups.map((group) => {
    const count = (kind: Kind) => group.filter((a) => a.kind === kind).length;
    return {
      start: Math.min(...group.map((a) => a.start)),
      end: Math.max(...group.map((a) => a.end)),
      upvotes: count("up"),
      downvotes: count("down"),
      quotes: count("quote"),
      comments: count("comment"),
      actionIds: [...group].sort((a, b) => b.created - a.created).map((a) => a.id),
    };
  });
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** "2 votes and 1 quote", for the mark's label and tooltip. */
export function describePassageActivity(segment: PassageActivitySegment): string {
  const parts: string[] = [];
  const votes = segment.upvotes + segment.downvotes;
  if (votes) parts.push(plural(votes, "vote"));
  if (segment.quotes) parts.push(plural(segment.quotes, "quote"));
  if (segment.comments) parts.push(plural(segment.comments, "comment"));
  if (parts.length <= 1) return parts[0] ?? "";
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

export function passageActivityTotal(segment: PassageActivitySegment): number {
  return segment.upvotes + segment.downvotes + segment.quotes + segment.comments;
}
