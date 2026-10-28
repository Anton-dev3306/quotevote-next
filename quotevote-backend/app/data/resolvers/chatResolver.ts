import { GraphQLError } from 'graphql';
import type * as Common from '~/types/common';
import type { GraphQLContext } from '~/types/graphql';
import type { MessageSearchResult } from '~/data/types/MessageSearch';
import { getReadableMessageRoom } from './utils/messages';
import { isLive } from '~/data/resolvers/utils/batchLoad';
import { MESSAGE_RECORD_SELECT, toMessageEntity } from '~/data/resolvers/utils/commentsQuotes';
import { escapeRegExp } from '~/data/resolvers/utils/common';

import {
  MESSAGE_SEARCH_DEFAULT_LIMIT,
  MESSAGE_SEARCH_MAX_LIMIT,
  MESSAGE_SEARCH_MAX_TEXT_LENGTH,
  MESSAGE_SEARCH_SELECT,
  buildSnippet,
  encodeSearchCursor,
  parseSearchCursor,
} from './utils/messageSearch';

import {
  PUBLIC_USER_SELECT,
  toPublicUser,
  type PrismaUserRecord,
} from '~/data/utils/userPrismaMapper';

function toMessageRoom(room: {
  id: string;
  userIds: string[];
  postId: string | null;
  messageType: Common.MessageType;
  title: string | null;
  avatar: unknown;
  isDirect: boolean;
  lastMessageTime: Date | null;
  lastActivity: Date | null;
  lastSeenMessages: unknown;
  unreadMessages: number;
  created: Date;
  updatedAt: Date;
}): Common.MessageRoom {
  return {
    _id: room.id,
    users: room.userIds,
    postId: room.postId ?? undefined,
    messageType: room.messageType,
    title: room.title ?? undefined,
    avatar: room.avatar as string | undefined,
    isDirect: room.isDirect,
    lastMessageTime: room.lastMessageTime ?? undefined,
    lastActivity: room.lastActivity ?? undefined,
    lastSeenMessages: room.lastSeenMessages as Record<string, string> | undefined,
    unreadMessages: room.unreadMessages,
    created: room.created,
    updatedAt: room.updatedAt,
  };
}

function toReaction(reaction: {
  id: string;
  userId: string;
  messageId: string | null;
  actionId: string | null;
  emoji: string;
  created: Date;
  updatedAt: Date;
}): Common.Reaction {
  return {
    _id: reaction.id,
    userId: reaction.userId,
    messageId: reaction.messageId ?? undefined,
    actionId: reaction.actionId ?? undefined,
    emoji: reaction.emoji,
    created: reaction.created,
  };
}

export const chatResolver = {
  Query: {
    messageRoom: async (
      _parent: unknown,
      args: { otherUserId: string },
      context: GraphQLContext
    ): Promise<Common.MessageRoom | null> => {
      if (!context.userId) return null;
      const room = await context.prisma.messageRoom.findFirst({
        where: {
          userIds: { hasEvery: [context.userId, args.otherUserId] },
          isDirect: true,
        },
      });
      return room ? toMessageRoom(room) : null;
    },

    messageRooms: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext
    ): Promise<Common.MessageRoom[]> => {
      if (!context.userId) return [];
      const rooms = await context.prisma.messageRoom.findMany({
        where: { userIds: { has: context.userId } },
        orderBy: { lastActivity: 'desc' },
      });
      return rooms.map(toMessageRoom);
    },

    messages: async (
      _parent: unknown,
      args: { messageRoomId: string },
      context: GraphQLContext
    ): Promise<Common.Message[]> => {
      const room = await getReadableMessageRoom(context.prisma, args.messageRoomId, context.userId);
      if (!room) return [];
      // Legacy messages have no createdAt/updatedAt and may lack `deleted`, so read
      // the safe columns and check the flag in code.
      const messages = await context.prisma.message.findMany({
        where: { messageRoomId: args.messageRoomId },
        orderBy: { created: 'asc' },
        select: MESSAGE_RECORD_SELECT,
      });
      return messages.filter(isLive).map(toMessageEntity);
    },

    messageReactions: async (
      _parent: unknown,
      args: { messageId: string },
      context: GraphQLContext
    ): Promise<Common.Reaction[]> => {
      const reactions = await context.prisma.reaction.findMany({
        where: { messageId: args.messageId },
      });
      return reactions.map(toReaction);
    },

    searchMessages: async (
      _parent: unknown,
      args: { text: string; limit?: number | null; cursor?: string | null },
      context: GraphQLContext
    ): Promise<MessageSearchResult> => {
      if (!context.userId) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const text = args.text.trim();
      if (text.length > MESSAGE_SEARCH_MAX_TEXT_LENGTH) {
        throw new GraphQLError('Search text is too long', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      const limit = args.limit ?? MESSAGE_SEARCH_DEFAULT_LIMIT;
      if (!Number.isInteger(limit) || limit < 1) {
        throw new GraphQLError('limit must be a positive integer', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }
      const cursor = args.cursor ? parseSearchCursor(args.cursor) : null;
      if (args.cursor && !cursor) {
        throw new GraphQLError('Invalid cursor', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      if (!text) return { results: [], nextCursor: null };

      const rooms = await context.prisma.messageRoom.findMany({
        where: { userIds: { has: context.userId } },
        select: { id: true },
      });
      if (rooms.length === 0) return { results: [], nextCursor: null };

      const pageSize = Math.min(limit, MESSAGE_SEARCH_MAX_LIMIT);
      const rows = await context.prisma.message.findMany({
        where: {
          messageRoomId: { in: rooms.map((room) => room.id) },
          text: { contains: escapeRegExp(text), mode: 'insensitive' },
          // Also matches legacy messages that have no `deleted` field.
          deleted: { not: true },
          ...(cursor
            ? {
                OR: [
                  { created: { lt: cursor.created } },
                  { created: cursor.created, id: { lt: cursor.id } },
                ],
              }
            : {}),
        },
        orderBy: [{ created: 'desc' }, { id: 'desc' }],
        take: pageSize + 1,
        select: MESSAGE_SEARCH_SELECT,
      });

      const page = rows.slice(0, pageSize);
      const lastRead = page[page.length - 1];
      const nextCursor =
        rows.length > pageSize ? encodeSearchCursor(lastRead.created, lastRead.id) : null;

      const authorIds = [...new Set(page.map((message) => message.userId))];
      const authors = authorIds.length
        ? await context.prisma.user.findMany({
            where: { id: { in: authorIds } },
            select: PUBLIC_USER_SELECT,
          })
        : [];
      const authorsById = new Map(authors.map((u) => [u.id, toPublicUser(u as PrismaUserRecord)]));

      return {
        results: page.map((message) => ({
          _id: message.id,
          messageRoomId: message.messageRoomId,
          created: message.created,
          snippet: buildSnippet(message.text, text),
          user: authorsById.get(message.userId) ?? null,
        })),
        nextCursor,
      };
    },
  },
  MessageRoom: {
    postDetails: async (parent: Common.MessageRoom, _args: unknown, context: GraphQLContext) => {
      if (!parent.postId) return null;
      const post = await context.prisma.post.findUnique({
        where: { id: parent.postId },
      });
      if (!post) return null;
      return {
        title: post.title,
        text: post.text,
      };
    },
    messages: async (
      parent: Common.MessageRoom,
      _args: unknown,
      context: GraphQLContext
    ): Promise<Common.Message[]> => {
      const room = await getReadableMessageRoom(context.prisma, parent._id, context.userId);
      if (!room) return [];
      // Legacy messages have no createdAt/updatedAt and may lack `deleted`, so read
      // the safe columns and check the flag in code.
      const messages = await context.prisma.message.findMany({
        where: { messageRoomId: parent._id },
        orderBy: { created: 'asc' },
        select: MESSAGE_RECORD_SELECT,
      });
      return messages.filter(isLive).map(toMessageEntity);
    },
  },
};
