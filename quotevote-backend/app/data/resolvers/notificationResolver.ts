import { GraphQLError } from 'graphql';
import {
  NOTIFICATION_SELECT,
  attachNotificationRelations,
  loadNotificationPost,
  loadNotificationSender,
  toNotificationEntity,
} from '~/data/resolvers/utils/notifications';
import type * as Common from '~/types/common';
import type { GraphQLContext } from '~/types/graphql';

const DEFAULT_NOTIFICATION_LIMIT = 50;
const MAX_NOTIFICATION_LIMIT = 100;

export const notificationResolver = {
  Query: {
    /**
     * Returns unread notifications for the authenticated user.
     * Matches legacy getNotifications behavior (status: 'new', newest first),
     * with an optional limit to avoid unbounded reads.
     */
    notifications: async (
      _parent: unknown,
      args: { limit?: number | null },
      context: GraphQLContext
    ): Promise<Common.NotificationWithRelations[]> => {
      if (!context.user?._id) {
        throw new GraphQLError('Authentication required', {
          extensions: { code: 'UNAUTHENTICATED' },
        });
      }

      const requested =
        typeof args.limit === 'number' && Number.isFinite(args.limit) ? Math.floor(args.limit) : DEFAULT_NOTIFICATION_LIMIT;
      const limit = Math.min(Math.max(requested, 1), MAX_NOTIFICATION_LIMIT);

      const userId = context.user._id.toString();
      const notifications = await context.prisma.notification.findMany({
        where: { userId, status: 'new' },
        orderBy: { created: 'desc' },
        take: limit,
        select: NOTIFICATION_SELECT,
      });

      return attachNotificationRelations(
        context.prisma,
        notifications.map(toNotificationEntity)
      );
    },
  },
  // The query loads these in a batch. The live notification subscription
  // publishes a bare notification, so they're loaded here for it.
  Notification: {
    userBy: async (
      parent: Common.Notification & { userBy?: Common.User | null },
      _args: unknown,
      context: GraphQLContext
    ): Promise<Common.User | null> =>
      parent.userBy !== undefined
        ? parent.userBy
        : loadNotificationSender(context.prisma, parent.userIdBy),
    post: async (
      parent: Common.Notification & { post?: Common.NotificationPost | null },
      _args: unknown,
      context: GraphQLContext
    ): Promise<Common.NotificationPost | null> =>
      parent.post !== undefined ? parent.post : loadNotificationPost(context.prisma, parent.postId),
  },
};
