import { GraphQLError } from 'graphql';
import { activityResolver, normalizeActivityEvents } from '~/data/resolvers/activityResolver';
import { ACTIVITY_SELECT } from '~/data/resolvers/utils/activities';
import type { GraphQLContext, ActivityQueryArgs } from '~/types/graphql';

jest.mock('~/data/utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

const actorId = '60d5ec49ad414d7a8d5464a0';
const profileId = '60d5ec49ad414d7a8d5464a1';

function mockContext(overrides: Partial<NonNullable<GraphQLContext['user']>> = {}): GraphQLContext {
  const user = {
    _id: actorId,
    username: 'alice',
    email: 'alice@example.com',
    admin: false,
    ...overrides,
  } as NonNullable<GraphQLContext['user']>;
  return {
    prisma: {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
      },
      activity: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
    } as unknown as GraphQLContext['prisma'],
    req: {} as GraphQLContext['req'],
    res: {} as GraphQLContext['res'],
    pubsub: {} as GraphQLContext['pubsub'],
    user,
    userId: String(user._id),
    requestId: 'test-request-id',
  };
}

describe('normalizeActivityEvents', () => {
  it('accepts ActivityEventType arrays', () => {
    expect(normalizeActivityEvents(['VOTED', 'POSTED'])).toEqual(['VOTED', 'POSTED']);
  });

  it('parses legacy JSON array strings', () => {
    expect(normalizeActivityEvents('["COMMENTED"]')).toEqual(['COMMENTED']);
  });

  it('drops unknown event strings', () => {
    expect(normalizeActivityEvents(['VOTED', 'NOT_A_REAL_EVENT'] as string[])).toEqual(['VOTED']);
  });
});

function args(overrides: Partial<ActivityQueryArgs> = {}): ActivityQueryArgs {
  return {
    user_id: profileId,
    limit: 10,
    offset: 0,
    searchKey: '',
    activityEvent: [],
    ...overrides,
  };
}

describe('activityResolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Query.activities', () => {
    it('requires authentication for the following feed (no user_id)', async () => {
      const ctx = { ...mockContext(), user: null };

      const promise = activityResolver.Query.activities(null, args({ user_id: '' }), ctx);
      await expect(promise).rejects.toThrow(GraphQLError);
      await expect(promise).rejects.toMatchObject({ extensions: { code: 'UNAUTHENTICATED' } });
      expect(ctx.prisma.activity.findMany).not.toHaveBeenCalled();
      expect(ctx.prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it("returns one user's activity to a signed-out visitor", async () => {
      const ctx = { ...mockContext(), user: null };
      (ctx.prisma.activity.count as jest.Mock).mockResolvedValue(1);
      (ctx.prisma.activity.findMany as jest.Mock).mockResolvedValue([
        {
          id: '60d5ec49ad414d7a8d5464b0',
          userId: profileId,
          postId: '60d5ec49ad414d7a8d5464b1',
          voteId: null,
          commentId: null,
          quoteId: null,
          activityType: 'POSTED',
          content: 'posted',
          created: new Date('2024-01-01T00:00:00Z'),
        },
      ]);

      const result = await activityResolver.Query.activities(null, args(), ctx);

      expect(ctx.prisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: profileId } })
      );
      expect(ctx.prisma.user.findUnique).not.toHaveBeenCalled();
      expect(result.entities).toHaveLength(1);
      expect(result.pagination.total_count).toBe(1);
    });

    it('still rejects a malformed user_id from a signed-out visitor', async () => {
      const ctx = { ...mockContext(), user: null };

      const promise = activityResolver.Query.activities(null, args({ user_id: '{"$ne":null}' }), ctx);
      await expect(promise).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
      expect(ctx.prisma.activity.findMany).not.toHaveBeenCalled();
    });

    it('accepts a legacy JSON-encoded activityEvent string', async () => {
      const ctx = mockContext();

      await activityResolver.Query.activities(
        null,
        args({
          activityEvent: '["COMMENTED"]' as unknown as ActivityQueryArgs['activityEvent'],
        }),
        ctx
      );

      expect(ctx.prisma.activity.count).toHaveBeenCalledWith({
        where: { activityType: { in: ['COMMENTED'] }, userId: profileId },
      });
    });

    it('drops the activityType filter when no event is valid', async () => {
      const ctx = mockContext();

      await activityResolver.Query.activities(
        null,
        args({
          activityEvent: ['NOT_A_REAL_EVENT'] as unknown as ActivityQueryArgs['activityEvent'],
        }),
        ctx
      );

      expect(ctx.prisma.activity.count).toHaveBeenCalledWith({
        where: { userId: profileId },
      });
    });

    it('rejects an invalid date range before querying', async () => {
      const ctx = mockContext();

      await expect(
        activityResolver.Query.activities(
          null,
          args({ startDateRange: 'not-a-date', endDateRange: '2024-01-31T00:00:00Z' }),
          ctx
        )
      ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
      expect(ctx.prisma.activity.count).not.toHaveBeenCalled();
    });

    it('rejects an invalid date range before the following-feed lookup', async () => {
      const ctx = mockContext();

      await expect(
        activityResolver.Query.activities(
          null,
          args({ user_id: '', startDateRange: '2024-01-01T00:00:00Z', endDateRange: 'nope' }),
          ctx
        )
      ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
      expect(ctx.prisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('returns paginated activities for a user', async () => {
      const ctx = mockContext();
      const activityId = '60d5ec49ad414d7a8d5464b0';
      const postId = '60d5ec49ad414d7a8d5464b1';
      const created = new Date('2024-01-01T00:00:00Z');
      (ctx.prisma.activity.count as jest.Mock).mockResolvedValue(1);
      (ctx.prisma.activity.findMany as jest.Mock).mockResolvedValue([
        {
          id: activityId,
          userId: profileId,
          postId,
          voteId: null,
          commentId: null,
          quoteId: null,
          activityType: 'VOTED',
          content: 'voted',
          created,
        },
      ]);

      const result = await activityResolver.Query.activities(
        null,
        args({ limit: 15, activityEvent: ['VOTED'] }),
        ctx
      );

      const where = { activityType: { in: ['VOTED'] }, userId: profileId };
      expect(ctx.prisma.activity.count).toHaveBeenCalledWith({ where });
      expect(ctx.prisma.activity.findMany).toHaveBeenCalledWith({
        where,
        orderBy: { created: 'desc' },
        skip: 0,
        take: 15,
        select: ACTIVITY_SELECT,
      });
      expect(ctx.prisma.user.findUnique).not.toHaveBeenCalled();
      expect(result).toEqual({
        entities: [
          {
            _id: activityId,
            userId: profileId,
            postId,
            voteId: undefined,
            commentId: undefined,
            quoteId: undefined,
            activityType: 'VOTED',
            content: 'voted',
            created,
          },
        ],
        pagination: { total_count: 1, limit: 15, offset: 0 },
      });
    });

    it('defaults limit to 10 and offset to 0 for missing or invalid values', async () => {
      const ctx = mockContext();

      const result = await activityResolver.Query.activities(
        null,
        args({ limit: 0, offset: -5 }),
        ctx
      );

      expect(ctx.prisma.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 })
      );
      expect(result.pagination).toEqual({ total_count: 0, limit: 10, offset: 0 });
    });

    it('rejects a malformed user_id before querying', async () => {
      const ctx = mockContext();

      await expect(
        activityResolver.Query.activities(null, args({ user_id: 'not-an-id' }), ctx)
      ).rejects.toMatchObject({ extensions: { code: 'BAD_USER_INPUT' } });
      expect(ctx.prisma.activity.count).not.toHaveBeenCalled();
      expect(ctx.prisma.activity.findMany).not.toHaveBeenCalled();
    });

    it('falls back to following feed when user_id is omitted', async () => {
      const ctx = mockContext();
      const followingId = '60d5ec49ad414d7a8d5464a2';
      (ctx.prisma.user.findUnique as jest.Mock).mockResolvedValue({
        followingIds: [followingId],
      });

      await activityResolver.Query.activities(null, args({ user_id: '' }), ctx);

      expect(ctx.prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: actorId },
        select: { followingIds: true },
      });
      expect(ctx.prisma.activity.count).toHaveBeenCalledWith({
        where: { userId: { in: [followingId] } },
      });
    });

    it('uses an empty following list when the viewer record is missing', async () => {
      const ctx = mockContext();

      const result = await activityResolver.Query.activities(null, args({ user_id: '' }), ctx);

      expect(ctx.prisma.activity.count).toHaveBeenCalledWith({
        where: { userId: { in: [] } },
      });
      expect(result.entities).toEqual([]);
    });

    it('applies searchKey as a case-insensitive content match', async () => {
      const ctx = mockContext();

      await activityResolver.Query.activities(null, args({ searchKey: '  hello  ' }), ctx);

      expect(ctx.prisma.activity.count).toHaveBeenCalledWith({
        where: {
          content: { contains: 'hello', mode: 'insensitive' },
          userId: profileId,
        },
      });
    });

    it('applies the date range only when both ends are given', async () => {
      const ctx = mockContext();

      await activityResolver.Query.activities(
        null,
        args({ startDateRange: '2024-01-01T00:00:00Z', endDateRange: '2024-01-31T00:00:00Z' }),
        ctx
      );
      await activityResolver.Query.activities(
        null,
        args({ startDateRange: '2024-01-01T00:00:00Z' }),
        ctx
      );

      expect(ctx.prisma.activity.count).toHaveBeenNthCalledWith(1, {
        where: {
          userId: profileId,
          created: {
            gte: new Date('2024-01-01T00:00:00Z'),
            lte: new Date('2024-01-31T00:00:00Z'),
          },
        },
      });
      expect(ctx.prisma.activity.count).toHaveBeenNthCalledWith(2, {
        where: { userId: profileId },
      });
    });
  });
});
