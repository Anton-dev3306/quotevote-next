import type { ChatRoom, ConversationPerson, ConversationSearchContext } from "@/types/chat";
import type { ParsedSearchQuery } from "@/types/search";

const normalize = (value: string | null | undefined): string => (value || "").toLowerCase();

/** A tag title as a search token: `Local News` becomes `LocalNews`, for `#LocalNews`. */
export function tagToken(title: string): string {
  return title.replace(/[^\w]/g, "");
}

/** True when the query has something to filter by (a lone `@` or `#` does not). */
export function hasSearchTerms(query: ParsedSearchQuery): boolean {
  return query.keywords.length > 0 || query.usernames.length > 0 || query.hashtags.length > 0;
}

const personMatches = (person: ConversationPerson, handle: string): boolean => {
  if (normalize(person.username).startsWith(handle)) return true;
  return normalize(person.name)
    .split(/\s+/)
    .some((word) => word.startsWith(handle));
};

/**
 * Whether a conversation matches a Messages search (#531). Every term has to match:
 * - plain words: the title, the post, any message, a person's name or the tag
 * - `@user`: someone in the conversation, by username or a word of their name
 * - `#tag`: the start of the discussion's tag
 */
export function conversationMatches(
  room: ChatRoom,
  query: ParsedSearchQuery,
  context: ConversationSearchContext
): boolean {
  const tagTitle = context.tag?.title ?? "";

  if (query.hashtags.length > 0) {
    const tag = normalize(tagToken(tagTitle));
    if (!tag || !query.hashtags.every((hashtag) => tag.startsWith(hashtag))) return false;
  }

  if (query.usernames.length > 0) {
    if (!query.usernames.every((handle) => context.people.some((p) => personMatches(p, handle)))) {
      return false;
    }
  }

  if (query.keywords.length > 0) {
    const haystack = [
      room.title,
      room.postDetails?.title,
      room.postDetails?.text,
      tagTitle,
      ...context.messages,
      ...context.people.flatMap((p) => [p.username, p.name]),
    ]
      .map(normalize)
      .join("\n");
    if (!query.keywords.every((word) => haystack.includes(word.toLowerCase()))) return false;
  }

  return true;
}
