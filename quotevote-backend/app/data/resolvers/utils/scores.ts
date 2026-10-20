import type { Prisma, PrismaClient } from '@prisma/client';
import { logger } from '~/data/utils/logger';

// ============================================================================
// Types
// ============================================================================

export type ScoresPrisma = Pick<PrismaClient, 'vote' | 'user'>;

interface ScoreFilterArgs {
  user_id?: string;
  song_id?: string;
  artist_id?: string;
}

interface VoteFilterArgs extends ScoreFilterArgs {
  vote_type?: boolean;
}

interface LeaderboardEntry {
  score: number;
  userId: string;
  user: string;
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Build a Prisma vote filter from legacy score args.
 * `song_id` / `artist_id` have no Prisma Vote columns (and were never on the
 * Mongoose Vote schema). Callers that pass them get an empty result without querying.
 */
const buildWhere = (args: ScoreFilterArgs): Prisma.VoteWhereInput | null => {
  if (args.song_id || args.artist_id) {
    return null;
  }

  const where: Prisma.VoteWhereInput = {};
  if (args.user_id) where.userId = args.user_id;
  return where;
};

/**
 * Net score = up votes − down votes, counted in the database.
 */
const netVoteScore = async (
  prisma: ScoresPrisma,
  where: Prisma.VoteWhereInput
): Promise<number> => {
  const [upCount, downCount] = await Promise.all([
    prisma.vote.count({ where: { ...where, type: 'up' } }),
    prisma.vote.count({ where: { ...where, type: 'down' } }),
  ]);
  return upCount - downCount;
};

// ============================================================================
// Score Utilities
// ============================================================================

/**
 * Calculate the net score for votes matching the given filter.
 */
export const scoreUtil = async (
  prisma: ScoresPrisma,
  args: ScoreFilterArgs
): Promise<number> => {
  const where = buildWhere(args);
  if (where === null) return 0;

  return netVoteScore(prisma, where);
};

/**
 * Calculate the score for a specific vote type (up or down).
 */
export const voteTypeUtil = async (
  prisma: ScoresPrisma,
  args: VoteFilterArgs
): Promise<number> => {
  const where = buildWhere(args);
  if (where === null) return 0;

  const type = args.vote_type ? 'up' : 'down';
  const count = await prisma.vote.count({
    where: { ...where, type },
  });
  // Preserve prior polarity: up votes contribute +count, down votes −count
  return args.vote_type ? count : -count;
};

/**
 * Count upvotes matching the given filter.
 */
export const upvotes = async (prisma: ScoresPrisma, args: ScoreFilterArgs): Promise<number> => {
  logger.debug('Function: upvotes', { args });
  const where = buildWhere(args);
  if (where === null) return 0;

  return prisma.vote.count({
    where: { ...where, type: 'up' },
  });
};

/**
 * Count downvotes matching the given filter.
 */
export const downvotes = async (
  prisma: ScoresPrisma,
  args: ScoreFilterArgs
): Promise<number> => {
  logger.debug('Function: downvotes', { args });
  const where = buildWhere(args);
  if (where === null) return 0;

  return prisma.vote.count({
    where: { ...where, type: 'down' },
  });
};

/**
 * Get top users by net vote score.
 */
export const topUsers = async (
  prisma: ScoresPrisma,
  limit: number
): Promise<LeaderboardEntry[]> => {
  const users = await prisma.user.findMany({
    select: { id: true, username: true },
  });

  const entries = await Promise.all(
    users.map(async (user) => {
      const score = await netVoteScore(prisma, { userId: user.id });
      return {
        score,
        userId: user.id,
        user: user.username ?? 'unknown',
      };
    })
  );

  entries.sort((a, b) => b.score - a.score);
  return entries.slice(0, limit);
};
