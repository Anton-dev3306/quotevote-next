import type { PrismaClient } from '@prisma/client';
import type * as Common from '~/types/common';
import { COMMENT_SELECT, QUOTE_SELECT, toComment, toQuote } from './commentsQuotes';
import { POST_RECORD_SELECT, toGraphQLPost } from '~/data/utils/postPrismaMapper';
import {
  PUBLIC_USER_SELECT,
  toPublicUser,
  type PrismaUserRecord,
} from '~/data/utils/userPrismaMapper';

type HydratePrisma = Pick<PrismaClient, 'user' | 'post' | 'vote' | 'comment' | 'quote'>;

/**
 * Post columns an activity card needs. `votedBy` is left out: legacy stores it as
 * objects, which Prisma can't read as strings, and the card doesn't use it.
 */
const ACTIVITY_POST_SELECT = { ...POST_RECORD_SELECT, votedBy: false } as const;

/**
 * Vote columns an activity card needs. `tags` is left out: legacy stores it as a
 * single string, which Prisma can't read as a list, and the card doesn't show it.
 */
const VOTE_SELECT = {
  id: true,
  userId: true,
  postId: true,
  type: true,
  startWordIndex: true,
  endWordIndex: true,
  deleted: true,
  created: true,
} as const;

const unique = (ids: (string | null | undefined)[]): string[] => [
  ...new Set(ids.filter((id): id is string => Boolean(id))),
];

/** Skip the query when there is nothing to look up. */
async function whenAny<T>(ids: string[], load: (ids: string[]) => Promise<T[]>): Promise<T[]> {
  return ids.length > 0 ? load(ids) : [];
}

const isLive = (row: { deleted?: boolean | null }): boolean => row.deleted !== true;

const groupIdsByPost = (
  rows: { id: string; postId: string; deleted?: boolean | null }[]
): Map<string, { _id: string }[]> => {
  const byPost = new Map<string, { _id: string }[]>();
  for (const row of rows.filter(isLive)) {
    const list = byPost.get(row.postId) ?? [];
    list.push({ _id: row.id });
    byPost.set(row.postId, list);
  }
  return byPost;
};

/**
 * Load what an activity card shows (who acted, the post with its author and
 * counts, and the vote, comment or quote) for a page of activities. Uses a fixed
 * number of queries per page instead of several per entry. Users are read with
 * public profile fields only, since the activity list is public. Deleted posts,
 * comments, quotes and votes come back as null and are left out of the counts.
 */
export async function hydrateActivities(
  prisma: HydratePrisma,
  activities: Common.Activity[]
): Promise<Common.HydratedActivity[]> {
  if (activities.length === 0) return [];

  const postIds = unique(activities.map((a) => a.postId));
  const voteIds = unique(activities.map((a) => a.voteId));
  const commentIds = unique(activities.map((a) => a.commentId));
  const quoteIds = unique(activities.map((a) => a.quoteId));

  // Deleted flags are checked here rather than in the query: legacy documents
  // may not have the field, and a `deleted: false` filter would skip them.
  const posts = (
    await whenAny(postIds, (ids) =>
      prisma.post.findMany({ where: { id: { in: ids } }, select: ACTIVITY_POST_SELECT })
    )
  ).filter((p) => p.deleted !== true);
  const livePostIds = posts.map((p) => p.id);
  const userIds = unique([...activities.map((a) => a.userId), ...posts.map((p) => p.userId)]);
  const idAndPost = { id: true, postId: true, deleted: true } as const;

  const [users, postVotes, postComments, postQuotes, votes, comments, quotes] = await Promise.all([
    whenAny(userIds, (ids) =>
      prisma.user.findMany({ where: { id: { in: ids } }, select: PUBLIC_USER_SELECT })
    ),
    whenAny(livePostIds, (ids) =>
      prisma.vote.findMany({ where: { postId: { in: ids } }, select: idAndPost })
    ),
    whenAny(livePostIds, (ids) =>
      prisma.comment.findMany({ where: { postId: { in: ids } }, select: idAndPost })
    ),
    whenAny(livePostIds, (ids) =>
      prisma.quote.findMany({ where: { postId: { in: ids } }, select: idAndPost })
    ),
    whenAny(voteIds, (ids) =>
      prisma.vote.findMany({ where: { id: { in: ids } }, select: VOTE_SELECT })
    ),
    whenAny(commentIds, (ids) =>
      prisma.comment.findMany({ where: { id: { in: ids } }, select: COMMENT_SELECT })
    ),
    whenAny(quoteIds, (ids) =>
      prisma.quote.findMany({ where: { id: { in: ids } }, select: QUOTE_SELECT })
    ),
  ]);

  const userRecords = new Map(users.map((u) => [u.id, u as PrismaUserRecord]));
  const publicUser = (id: string): Common.User | null => {
    const record = userRecords.get(id);
    return record ? toPublicUser(record) : null;
  };

  const votesByPost = groupIdsByPost(postVotes);
  const commentsByPost = groupIdsByPost(postComments);
  const quotesByPost = groupIdsByPost(postQuotes);
  const postsById = new Map(
    posts.map((p) => {
      const creator = userRecords.get(p.userId);
      return [
        p.id,
        {
          ...toGraphQLPost(p, creator ?? null),
          creator: creator ? toPublicUser(creator) : null,
          votes: votesByPost.get(p.id) ?? [],
          comments: commentsByPost.get(p.id) ?? [],
          quotes: quotesByPost.get(p.id) ?? [],
        },
      ];
    })
  );
  const votesById = new Map(
    votes.filter(isLive).map((v): [string, Common.Vote] => [
      v.id,
      {
        _id: v.id,
        userId: v.userId,
        postId: v.postId,
        type: v.type,
        startWordIndex: v.startWordIndex ?? undefined,
        endWordIndex: v.endWordIndex ?? undefined,
        created: v.created,
      },
    ])
  );
  const commentsById = new Map(comments.filter(isLive).map((c) => [c.id, toComment(c)]));
  const quotesById = new Map(quotes.filter(isLive).map((q) => [q.id, toQuote(q)]));

  return activities.map((a) => ({
    ...a,
    user: publicUser(a.userId),
    post: (a.postId && postsById.get(a.postId)) || null,
    vote: (a.voteId && votesById.get(a.voteId)) || null,
    comment: (a.commentId && commentsById.get(a.commentId)) || null,
    quote: (a.quoteId && quotesById.get(a.quoteId)) || null,
  }));
}
