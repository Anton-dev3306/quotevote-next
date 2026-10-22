import { GraphQLError } from 'graphql';
import type { Prisma } from '@prisma/client';
import { ACTIVITY_SELECT, toActivityEntity } from '~/data/resolvers/utils/activities';
import { hydrateActivities } from '~/data/resolvers/utils/hydrateActivities';
import { logger } from '~/data/utils/logger';
import { ActivityEventTypeValues } from '~/data/utils/constants';
import type * as Common from '~/types/common';
import type { ActivityQueryArgs, GraphQLContext } from '~/types/graphql';

const OBJECT_ID_PATTERN = /^[a-fA-F0-9]{24}$/;

const ALLOWED_ACTIVITY_EVENTS = new Set<string>(Object.values(ActivityEventTypeValues));

/**
 * Normalize activityEvent filter from GraphQL.
 * Prefer `[ActivityEventType!]`; still accepts a legacy JSON-encoded array string.
 */
export function normalizeActivityEvents(
  activityEvent: ActivityQueryArgs['activityEvent'] | string | string[] | null | undefined
): Common.ActivityEventType[] {
  if (activityEvent == null) return [];

  let parsed: unknown = activityEvent;
  if (typeof activityEvent === 'string') {
    try {
      parsed = JSON.parse(activityEvent);
    } catch (err) {
      logger.warn('activities.activityEvent JSON parse failed; ignoring filter', {
        raw: activityEvent.slice(0, 200),
        error: err instanceof Error ? err.message : String(err),
      });
      return [];
    }
  }

  if (!Array.isArray(parsed)) {
    logger.warn('activities.activityEvent is not an array; ignoring filter', {
      receivedType: typeof parsed,
    });
    return [];
  }

  return parsed.filter(
    (v): v is Common.ActivityEventType =>
      typeof v === 'string' && ALLOWED_ACTIVITY_EVENTS.has(v)
  );
}

export const activityResolver = {
  Query: {
    /**
     * Paginated activity feed for a user (or the caller's following list).
     * Matches legacy getUserActivities return shape: { entities, pagination }.
     * One user's activity is public, like their posts and profile. The following
     * feed (no user_id) needs a signed-in viewer.
     */
    activities: async (
      _parent: unknown,
      args: ActivityQueryArgs,
      context: GraphQLContext
    ): Promise<Common.PaginatedResult<Common.HydratedActivity>> => {
      const viewerId = context.user?._id;
      if (!args.user_id && !viewerId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const limit = typeof args.limit === 'number' && args.limit > 0 ? args.limit : 10;
      const offset = typeof args.offset === 'number' && args.offset >= 0 ? args.offset : 0;

      const where: Prisma.ActivityWhereInput = {};

      // Legacy used Mongo `$text` (word match with stemming). Prisma on MongoDB
      // has no `$text`, so this is a case-insensitive substring match on content
      // (same tradeoff as posts and user search).
      const searchKey = args.searchKey?.trim();
      if (searchKey) {
        where.content = { contains: searchKey, mode: 'insensitive' };
      }

      const events = normalizeActivityEvents(args.activityEvent);
      if (events.length > 0) {
        where.activityType = { in: events };
      }

      if (args.startDateRange && args.endDateRange) {
        const start = new Date(args.startDateRange);
        const end = new Date(args.endDateRange);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
          throw new GraphQLError('Invalid date range', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
        where.created = { gte: start, lte: end };
      }

      if (args.user_id) {
        if (!OBJECT_ID_PATTERN.test(args.user_id)) {
          throw new GraphQLError('Invalid user_id', {
            extensions: { code: 'BAD_USER_INPUT' },
          });
        }
        where.userId = args.user_id;
      } else {
        const viewer = await context.prisma.user.findUnique({
          where: { id: String(viewerId) },
          select: { followingIds: true },
        });
        where.userId = { in: viewer?.followingIds ?? [] };
      }

      const [total, activitiesResult] = await Promise.all([
        context.prisma.activity.count({ where }),
        context.prisma.activity.findMany({
          where,
          orderBy: { created: 'desc' },
          skip: offset,
          take: limit,
          select: ACTIVITY_SELECT,
        }),
      ]);

      // The schema has no Activity field resolvers, so attach the user, post and
      // the vote, comment or quote here, in batches for the whole page.
      const entities = await hydrateActivities(
        context.prisma,
        activitiesResult.map(toActivityEntity)
      );

      return {
        entities,
        pagination: {
          total_count: total,
          limit,
          offset,
        },
      };
    },
  },
};
