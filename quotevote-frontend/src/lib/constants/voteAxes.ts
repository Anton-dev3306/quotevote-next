import type { VoteAxis, VoteOption } from "@/types/voting";

/**
 * Which response pair each vote tag belongs to. A passage can hold one response per pair,
 * so choosing the other side of a pair replaces it while the three pairs stay independent.
 */
export const VOTE_AXIS: Record<VoteOption, VoteAxis> = {
  "#agree": "agreement",
  "#disagree": "agreement",
  "#true": "truth",
  "#false": "truth",
  "#like": "liking",
  "#dislike": "liking",
};

/** Display name of each vote response, as shown in the voting popup. */
export const VOTE_LABELS: Record<VoteOption, string> = {
  "#agree": "Agree",
  "#disagree": "Disagree",
  "#true": "True",
  "#false": "False",
  "#like": "Like",
  "#dislike": "Dislike",
};
