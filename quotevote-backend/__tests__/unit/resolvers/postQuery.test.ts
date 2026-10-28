import { POST_CREATOR_SELECT, POST_RECORD_SELECT } from '~/data/utils/postPrismaMapper';
import { postsResolver } from '~/data/resolvers/postsResolver';
import type { GraphQLContext } from '~/types/graphql';

const postId = '507f1f77bcf86cd799439013';
const authorId = '507f1f77bcf86cd799439011';
const voterId = '507f1f77bcf86cd799439021';
const commenterId = '507f1f77bcf86cd799439022';
const quoterId = '507f1f77bcf86cd799439023';
const roomId = '507f1f77bcf86cd799439031';
const created = new Date('2026-01-01T00:00:00Z');

const postRecord = {
  id: postId,
  userId: authorId,
  tagId: null,
  title: 'A post',
  text: 'Some words to vote on',
  url: null,
  citationUrl: null,
  attribution: null,
  upvotes: 1,
  downvotes: 0,
  reported: 0,
  approved: null,
  votedBy: [],
  dayPoints: 0,
  pointTimestamp: null,
  approvedBy: [],
  rejectedBy: [],
  reportedBy: [],
  bookmarkedBy: [],
  enableVoting: true,
  messageRoomId: null,
  urlId: null,
  featuredSlot: null,
  deleted: false,
  created,
};

const user = (id: string, username: string) => ({
  id,
  name: null,
  username,
  avatar: 'a.png',
  contributorBadge: false,
});

function mockContext(viewer: GraphQLContext['user'] = null): GraphQLContext {
  return {
    prisma: {
      post: {
        findUnique: jest.fn().mockResolvedValue(postRecord),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      user: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            user(authorId, 'author'),
            user(voterId, 'voter'),
            user(commenterId, 'commenter'),
            user(quoterId, 'quoter'),
          ]),
      },
      vote: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'v1',
            userId: voterId,
            postId,
            type: 'up',
            startWordIndex: 0,
            endWordIndex: 2,
            content: 'Some words',
            deleted: null,
            created,
          },
          {
            id: 'v2',
            userId: voterId,
            postId,
            type: 'down',
            startWordIndex: 3,
            endWordIndex: 4,
            content: 'to vote',
            deleted: true,
            created,
          },
        ]),
        findRaw: jest.fn().mockResolvedValue([
          { _id: { $oid: 'v1' }, tags: 'insightful' },
          { _id: { $oid: 'v2' }, tags: ['a', 'b'] },
        ]),
      },
      comment: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'c1',
            userId: commenterId,
            postId,
            content: 'Nice',
            startWordIndex: null,
            endWordIndex: null,
            url: null,
            reaction: null,
            deleted: false,
            created,
          },
          {
            id: 'c2',
            userId: commenterId,
            postId,
            content: 'Removed',
            startWordIndex: 0,
            endWordIndex: 1,
            url: null,
            reaction: null,
            deleted: true,
            created,
          },
        ]),
      },
      quote: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'q1',
            userId: quoterId,
            quoted: authorId,
            postId,
            quote: 'Some words',
            startWordIndex: 0,
            endWordIndex: 1,
            deleted: false,
            created,
          },
        ]),
      },
      messageRoom: {
        findFirst: jest.fn().mockResolvedValue({
          id: roomId,
          postId,
          userIds: [authorId, commenterId],
          messageType: 'POST',
          created,
        }),
      },
    } as unknown as GraphQLContext['prisma'],
    user: viewer,
    userId: viewer?._id?.toString() ?? null,
    requestId: 'test-request-id',
  } as GraphQLContext;
}

describe('postsResolver Query.post', () => {
  it('returns the post with its author, live votes, comments, quotes and room for a guest', async () => {
    const ctx = mockContext();

    const result = await postsResolver.Query.post(null, { postId }, ctx);

    expect(result).not.toBeNull();
    expect(result?._id).toBe(postId);
    expect(result?.creator).toMatchObject({ _id: authorId, username: 'author' });

    expect(result?.votes).toHaveLength(1);
    expect(result?.votes[0]).toMatchObject({
      _id: 'v1',
      type: 'up',
      content: 'Some words',
      tags: 'insightful',
      user: { _id: voterId, username: 'voter' },
    });

    expect(result?.comments).toHaveLength(1);
    expect(result?.comments[0]).toMatchObject({
      _id: 'c1',
      content: 'Nice',
      user: { _id: commenterId, username: 'commenter' },
    });

    expect(result?.quotes).toEqual([
      expect.objectContaining({
        _id: 'q1',
        quote: 'Some words',
        user: expect.objectContaining({ _id: quoterId }),
      }),
    ]);

    expect(result?.messageRoom).toEqual({
      _id: roomId,
      postId,
      users: [authorId, commenterId],
      messageType: 'POST',
      created,
    });
  });

  it('returns the same result for a signed-in viewer', async () => {
    const ctx = mockContext({ _id: voterId } as unknown as GraphQLContext['user']);

    const result = await postsResolver.Query.post(null, { postId }, ctx);

    expect(result?._id).toBe(postId);
    expect(result?.votes).toHaveLength(1);
  });

  it('reads legacy-safe columns and public author fields only', async () => {
    const ctx = mockContext();

    await postsResolver.Query.post(null, { postId }, ctx);

    expect(ctx.prisma.post.findUnique).toHaveBeenCalledWith({
      where: { id: postId },
      select: POST_RECORD_SELECT,
    });
    const userQuery = (ctx.prisma.user.findMany as jest.Mock).mock.calls[0][0];
    expect(userQuery.select).toBe(POST_CREATOR_SELECT);
    expect(userQuery.where.id.in).toEqual(
      expect.arrayContaining([authorId, voterId, commenterId, quoterId])
    );
    expect((ctx.prisma.vote.findMany as jest.Mock).mock.calls[0][0].select).not.toHaveProperty(
      'tags'
    );
  });

  it('loads every user in one query', async () => {
    const ctx = mockContext();

    await postsResolver.Query.post(null, { postId }, ctx);

    expect(ctx.prisma.user.findMany).toHaveBeenCalledTimes(1);
  });

  it('returns null for a deleted post', async () => {
    const ctx = mockContext();
    (ctx.prisma.post.findUnique as jest.Mock).mockResolvedValue({ ...postRecord, deleted: true });

    await expect(postsResolver.Query.post(null, { postId }, ctx)).resolves.toBeNull();
    expect(ctx.prisma.vote.findMany).not.toHaveBeenCalled();
  });

  it('returns null for an unknown post', async () => {
    const ctx = mockContext();
    (ctx.prisma.post.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(postsResolver.Query.post(null, { postId }, ctx)).resolves.toBeNull();
  });

  it('returns null for an id that is not an ObjectId, without querying', async () => {
    const ctx = mockContext();

    await expect(postsResolver.Query.post(null, { postId: 'not-an-id' }, ctx)).resolves.toBeNull();
    expect(ctx.prisma.post.findUnique).not.toHaveBeenCalled();
  });

  it('returns a null room when the post has none', async () => {
    const ctx = mockContext();
    (ctx.prisma.messageRoom.findFirst as jest.Mock).mockResolvedValue(null);

    const result = await postsResolver.Query.post(null, { postId }, ctx);

    expect(result?.messageRoom).toBeNull();
  });
});

describe('postsResolver Query.topPosts', () => {
  it('returns the same page as posts for the same arguments', async () => {
    const ctx = mockContext();
    (ctx.prisma.post.count as jest.Mock).mockResolvedValue(0);
    (ctx.prisma.post.findMany as jest.Mock).mockResolvedValue([]);
    const args = { limit: 5, offset: 10, searchKey: '', sortOrder: 'asc' };

    const top = await postsResolver.Query.topPosts(null, args, ctx);
    const posts = await postsResolver.Query.posts(null, args, ctx);

    expect(top).toEqual(posts);
    expect(top.pagination).toEqual({ total_count: 0, limit: 5, offset: 10 });
    const [first, second] = (ctx.prisma.post.findMany as jest.Mock).mock.calls;
    expect(first[0]).toEqual(second[0]);
  });
});
