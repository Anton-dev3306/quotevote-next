import { chatResolver } from '~/data/resolvers/chatResolver';
import { MESSAGE_RECORD_SELECT } from '~/data/resolvers/utils/commentsQuotes';

const date = new Date('2026-01-01T00:00:00.000Z');

const createContext = () => ({
  userId: 'user-1',
  prisma: {
    messageRoom: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    message: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    reaction: {
      findMany: jest.fn(),
    },
    post: {
      findUnique: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  },
  pubsub: {
    publish: jest.fn(),
  },
  user: { _id: 'user-1', username: 'alice', name: 'Alice' },
});

describe('chatResolver Prisma queries', () => {
  it('finds a direct room containing both users', async () => {
    const context = createContext();
    context.prisma.messageRoom.findFirst.mockResolvedValue({
      id: 'room-1',
      userIds: ['user-1', 'user-2'],
      postId: null,
      messageType: 'USER',
      title: null,
      avatar: null,
      isDirect: true,
      lastMessageTime: null,
      lastActivity: date,
      lastSeenMessages: {},
      unreadMessages: 0,
      created: date,
      updatedAt: date,
    });

    const result = await chatResolver.Query.messageRoom(
      {},
      { otherUserId: 'user-2' },
      context as never
    );

    expect(context.prisma.messageRoom.findFirst).toHaveBeenCalledWith({
      where: {
        userIds: { hasEvery: ['user-1', 'user-2'] },
        isDirect: true,
      },
    });
    expect(result?._id).toBe('room-1');
    expect(result?.users).toEqual(['user-1', 'user-2']);
  });

  it('lists rooms in descending activity order', async () => {
    const context = createContext();
    context.prisma.messageRoom.findMany.mockResolvedValue([]);

    await chatResolver.Query.messageRooms({}, {}, context as never);

    expect(context.prisma.messageRoom.findMany).toHaveBeenCalledWith({
      where: { userIds: { has: 'user-1' } },
      orderBy: { lastActivity: 'desc' },
    });
  });

  it('maps messages and reactions to the legacy GraphQL shape', async () => {
    const context = createContext();
    context.prisma.messageRoom.findUnique.mockResolvedValue({
      messageType: 'USER',
      userIds: ['user-1'],
    });
    context.prisma.message.findMany.mockResolvedValue([
      {
        id: 'message-1',
        messageRoomId: 'room-1',
        userId: 'user-1',
        userName: 'A User',
        title: null,
        text: 'Hello',
        type: 'USER',
        mutationType: 'CREATE',
        deleted: false,
        readBy: [],
        readByDetailed: [],
        deliveredTo: [],
        created: date,
        updatedAt: date,
      },
    ]);
    context.prisma.reaction.findMany.mockResolvedValue([
      {
        id: 'reaction-1',
        userId: 'user-2',
        messageId: 'message-1',
        actionId: null,
        emoji: '👍',
        created: date,
        updatedAt: date,
      },
    ]);

    const messages = await chatResolver.Query.messages(
      {},
      { messageRoomId: 'room-1' },
      context as never
    );
    const reactions = await chatResolver.Query.messageReactions(
      {},
      { messageId: 'message-1' },
      context as never
    );

    expect(context.prisma.message.findMany).toHaveBeenCalledWith({
      where: { messageRoomId: 'room-1' },
      orderBy: { created: 'asc' },
      select: MESSAGE_RECORD_SELECT,
    });
    expect(messages[0]).toMatchObject({
      _id: 'message-1',
      messageRoomId: 'room-1',
      mutation_type: 'CREATE',
    });

    expect(reactions[0]).toMatchObject({
      _id: 'reaction-1',
      messageId: 'message-1',
      emoji: '👍',
    });
  });

  it('loads post details and room messages through Prisma', async () => {
    const context = createContext();
    context.prisma.post.findUnique.mockResolvedValue({ title: 'Post title', text: 'Post text' });
    context.prisma.messageRoom.findUnique.mockResolvedValue({
      messageType: 'POST',
      userIds: [],
    });
    context.prisma.message.findMany.mockResolvedValue([]);

    const parent = { _id: 'room-1', postId: 'post-1', created: date };
    const postDetails = await chatResolver.MessageRoom.postDetails(parent, {}, context as never);
    const messages = await chatResolver.MessageRoom.messages(parent, {}, context as never);

    expect(context.prisma.post.findUnique).toHaveBeenCalledWith({
      where: { id: 'post-1' },
    });
    expect(postDetails).toEqual({ title: 'Post title', text: 'Post text' });
    expect(context.prisma.message.findMany).toHaveBeenCalledWith({
      where: { messageRoomId: 'room-1' },
      orderBy: { created: 'asc' },
      select: MESSAGE_RECORD_SELECT,
    });
    expect(messages).toEqual([]);
  });

  it('does not return nested history for a room the current user cannot access', async () => {
    const context = createContext();
    context.prisma.messageRoom.findUnique.mockResolvedValue(null);

    await expect(
      chatResolver.MessageRoom.messages(
        { _id: 'private-room', created: date },
        {},
        context as never
      )
    ).resolves.toEqual([]);
    expect(context.prisma.message.findMany).not.toHaveBeenCalled();
  });

  it('does not return history for a room the current user cannot access', async () => {
    const context = createContext();
    context.prisma.messageRoom.findUnique.mockResolvedValue(null);

    await expect(
      chatResolver.Query.messages({}, { messageRoomId: 'private-room' }, context as never)
    ).resolves.toEqual([]);
    expect(context.prisma.message.findMany).not.toHaveBeenCalled();
  });

  it('allows unauthenticated readers to load post-room history', async () => {
    const context = createContext();
    context.userId = null;
    context.prisma.messageRoom.findUnique.mockResolvedValue({
      messageType: 'POST',
      userIds: [],
    });
    context.prisma.message.findMany.mockResolvedValue([]);

    await expect(
      chatResolver.Query.messages({}, { messageRoomId: 'post-room' }, context as never)
    ).resolves.toEqual([]);

    expect(context.prisma.messageRoom.findUnique).toHaveBeenCalledWith({
      where: { id: 'post-room' },
      select: { messageType: true, userIds: true },
    });
    expect(context.prisma.message.findMany).toHaveBeenCalledWith({
      where: { messageRoomId: 'post-room' },
      orderBy: { created: 'asc' },
      select: MESSAGE_RECORD_SELECT,
    });
  });

  it('does not expose a private room to a non-member', async () => {
    const context = createContext();
    context.userId = 'outsider';
    context.prisma.messageRoom.findUnique.mockResolvedValue({
      messageType: 'USER',
      userIds: ['member'],
    });

    await expect(
      chatResolver.Query.messages({}, { messageRoomId: 'private-room' }, context as never)
    ).resolves.toEqual([]);
    expect(context.prisma.message.findMany).not.toHaveBeenCalled();
  });

  it('does not return soft-deleted messages', async () => {
    const context = createContext();
    context.prisma.messageRoom.findUnique.mockResolvedValue({
      messageType: 'POST',
      userIds: [],
    });
    context.prisma.message.findMany.mockResolvedValue([
      {
        id: 'visible',
        messageRoomId: 'post-room',
        userId: 'user-1',
        userName: 'A User',
        title: null,
        text: 'Visible',
        type: 'POST',
        mutationType: 'CREATE',
        deleted: false,
        readBy: [],
        readByDetailed: [],
        deliveredTo: [],
        created: date,
        updatedAt: date,
      },
      {
        id: 'deleted',
        messageRoomId: 'post-room',
        userId: 'user-1',
        userName: 'A User',
        title: null,
        text: 'Deleted',
        type: 'POST',
        mutationType: 'DELETE',
        deleted: true,
        readBy: [],
        readByDetailed: [],
        deliveredTo: [],
        created: date,
        updatedAt: date,
      },
    ]);

    const messages = await chatResolver.Query.messages(
      {},
      { messageRoomId: 'post-room' },
      context as never
    );

    expect(messages.map((message) => message._id)).toEqual(['visible']);
    expect(context.prisma.message.findMany).toHaveBeenCalledWith({
      where: { messageRoomId: 'post-room' },
      orderBy: { created: 'asc' },
      select: MESSAGE_RECORD_SELECT,
    });
  });

  it('returns legacy messages that have no deleted flag or timestamps', async () => {
    const context = createContext();
    context.prisma.messageRoom.findUnique.mockResolvedValue({ messageType: 'POST', userIds: [] });
    context.prisma.message.findMany.mockResolvedValue([
      {
        id: 'legacy',
        messageRoomId: 'post-room',
        userId: 'user-1',
        userName: null,
        title: null,
        text: 'From the legacy API',
        type: null,
        mutationType: null,
        readBy: [],
        readByDetailed: [],
        deliveredTo: [],
        created: date,
      },
    ]);

    const messages = await chatResolver.MessageRoom.messages(
      { _id: 'post-room' } as never,
      {},
      context as never
    );

    expect(messages.map((message) => message._id)).toEqual(['legacy']);
    const { select } = context.prisma.message.findMany.mock.calls[0][0];
    expect(select).not.toHaveProperty('createdAt');
    expect(select).not.toHaveProperty('updatedAt');
  });
});

describe('chatResolver.Query.searchMessages', () => {
  const roomId = '507f1f77bcf86cd799439021';
  const authorId = '507f1f77bcf86cd799439022';
  const otherAuthorId = '507f1f77bcf86cd799439023';
  const ids = ['507f1f77bcf86cd7994390a1', '507f1f77bcf86cd7994390a2', '507f1f77bcf86cd7994390a3'];

  const row = (overrides: Record<string, unknown> = {}) => ({
    id: ids[0],
    messageRoomId: roomId,
    userId: authorId,
    text: 'See you at the town hall tonight',
    created: date,
    deleted: false,
    ...overrides,
  });

  const search = (
    context: ReturnType<typeof createContext>,
    args: { text: string; limit?: number | null; cursor?: string | null }
  ) => chatResolver.Query.searchMessages({}, args, context as never);

  it('rejects a guest without reading anything', async () => {
    const context = { ...createContext(), userId: null };

    await expect(search(context as never, { text: 'hall' })).rejects.toMatchObject({
      extensions: { code: 'UNAUTHENTICATED' },
    });
    expect(context.prisma.messageRoom.findMany).not.toHaveBeenCalled();
  });

  it('returns nothing for blank text and does not query', async () => {
    const context = createContext();

    await expect(search(context, { text: '   ' })).resolves.toEqual({
      results: [],
      nextCursor: null,
    });
    expect(context.prisma.messageRoom.findMany).not.toHaveBeenCalled();
  });

  it.each([
    { label: 'text that is too long', args: { text: 'a'.repeat(201) } },
    { label: 'a non-positive limit', args: { text: 'hall', limit: 0 } },
    { label: 'a malformed cursor', args: { text: 'hall', cursor: 'nope' } },
  ])('rejects $label', async ({ args }) => {
    const context = createContext();

    await expect(search(context, args)).rejects.toMatchObject({
      extensions: { code: 'BAD_USER_INPUT' },
    });
    expect(context.prisma.message.findMany).not.toHaveBeenCalled();
  });

  it('returns nothing when the user is in no conversation', async () => {
    const context = createContext();
    context.prisma.messageRoom.findMany.mockResolvedValue([]);

    await expect(search(context, { text: 'hall' })).resolves.toEqual({
      results: [],
      nextCursor: null,
    });
    expect(context.prisma.message.findMany).not.toHaveBeenCalled();
  });

  it("only searches the signed-in user's own rooms", async () => {
    const context = createContext();
    context.prisma.messageRoom.findMany.mockResolvedValue([{ id: roomId }]);
    context.prisma.message.findMany.mockResolvedValue([]);

    await search(context, { text: ' town hall ' });

    expect(context.prisma.messageRoom.findMany).toHaveBeenCalledWith({
      where: { userIds: { has: 'user-1' } },
      select: { id: true },
    });
    expect(context.prisma.message.findMany).toHaveBeenCalledWith({
      where: {
        messageRoomId: { in: [roomId] },
        text: { contains: 'town hall', mode: 'insensitive' },
      },
      orderBy: [{ created: 'desc' }, { id: 'desc' }],
      take: 21,
      select: expect.objectContaining({ text: true, deleted: true }),
    });
  });

  it('caps the page size', async () => {
    const context = createContext();
    context.prisma.messageRoom.findMany.mockResolvedValue([{ id: roomId }]);
    context.prisma.message.findMany.mockResolvedValue([]);

    await search(context, { text: 'hall', limit: 1000 });

    expect(context.prisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 51 })
    );
  });

  it('resumes after the (created, _id) cursor and returns the next one', async () => {
    const context = createContext();
    context.prisma.messageRoom.findMany.mockResolvedValue([{ id: roomId }]);
    context.prisma.message.findMany.mockResolvedValue([
      row({ id: ids[0] }),
      row({ id: ids[1] }),
      row({ id: ids[2] }),
    ]);
    context.prisma.user.findMany.mockResolvedValue([
      { id: authorId, username: 'bob', name: 'Bob' },
    ]);

    const result = await search(context, {
      text: 'hall',
      limit: 2,
      cursor: `${date.getTime()}_${ids[2]}`,
    });

    expect(context.prisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 3,
        where: expect.objectContaining({
          OR: [{ created: { lt: date } }, { created: date, id: { lt: ids[2] } }],
        }),
      })
    );
    expect(result.results.map((hit) => hit._id)).toEqual([ids[0], ids[1]]);
    expect(result.nextCursor).toBe(`${date.getTime()}_${ids[1]}`);
  });

  it('drops deleted messages in code, keeps legacy rows without the flag, and advances the cursor', async () => {
    const context = createContext();
    context.prisma.messageRoom.findMany.mockResolvedValue([{ id: roomId }]);
    context.prisma.message.findMany.mockResolvedValue([
      row({ id: ids[0], deleted: undefined }),
      row({ id: ids[1], deleted: true }),
      row({ id: ids[2] }),
    ]);
    context.prisma.user.findMany.mockResolvedValue([
      { id: authorId, username: 'bob', name: 'Bob' },
    ]);

    const result = await search(context, { text: 'hall', limit: 2 });

    const { where } = context.prisma.message.findMany.mock.calls[0][0];
    expect(where).not.toHaveProperty('deleted');
    expect(result.results.map((hit) => hit._id)).toEqual([ids[0]]);
    expect(result.nextCursor).toBe(`${date.getTime()}_${ids[1]}`);
  });

  it('returns a snippet, public author fields, and null for a missing account', async () => {
    const context = createContext();
    context.prisma.messageRoom.findMany.mockResolvedValue([{ id: roomId }]);
    context.prisma.message.findMany.mockResolvedValue([
      row({ id: ids[0] }),
      row({ id: ids[1], userId: otherAuthorId }),
    ]);
    context.prisma.user.findMany.mockResolvedValue([
      { id: authorId, username: 'bob', name: 'Bob' },
    ]);

    const result = await search(context, { text: 'hall' });

    expect(context.prisma.user.findMany).toHaveBeenCalledWith({
      where: { id: { in: [authorId, otherAuthorId] } },
      select: expect.objectContaining({ id: true, username: true }),
    });
    expect(result.results[0]).toMatchObject({
      _id: ids[0],
      messageRoomId: roomId,
      snippet: 'See you at the town hall tonight',
      user: { _id: authorId, username: 'bob' },
    });
    expect(result.results[1].user).toBeNull();
  });

  it.each([
    ['.*', '\\.\\*'],
    ['(', '\\('],
    ['a+b?', 'a\\+b\\?'],
    ['[x', '\\[x'],
  ])('escapes %s before it reaches contains', async (term, escaped) => {
    const context = createContext();
    context.prisma.messageRoom.findMany.mockResolvedValue([{ id: roomId }]);
    context.prisma.message.findMany.mockResolvedValue([row({ text: `price is 5 ${term} today` })]);
    context.prisma.user.findMany.mockResolvedValue([
      { id: authorId, username: 'bob', name: 'Bob' },
    ]);

    const result = await search(context, { text: term });

    expect(context.prisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ text: { contains: escaped, mode: 'insensitive' } }),
      })
    );
    expect(result.results[0].snippet).toContain(term);
  });
});
