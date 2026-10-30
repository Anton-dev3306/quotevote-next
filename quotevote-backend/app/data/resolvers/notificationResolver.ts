import { GraphQLError } from 'graphql';
import { isObjectId } from '~/data/resolvers/utils/common';
import { NOTIFICATION_SELECT, toNotificationEntity } from '~/data/resolvers/utils/notifications';
import type * as Common from '~/types/common';
import type { GraphQLContext } from '~/types/graphql';

const DEFAULT_NOTIFICATION_LIMIT = 50;
const MAX_NOTIFICATION_LIMIT = 100;

function requireUserId(context: GraphQLContext): string {
  if (!context.user?._id) {
    throw new GraphQLError('Authentication required', {
      extensions: { code: 'UNAUTHENTICATED' },
    });
  }
  return context.user._id.toString();
}

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
    ): Promise<Common.Notification[]> => {
      const userId = requireUserId(context);

      const requested =
        typeof args.limit === 'number' && Number.isFinite(args.limit) ? Math.floor(args.limit) : DEFAULT_NOTIFICATION_LIMIT;
      const limit = Math.min(Math.max(requested, 1), MAX_NOTIFICATION_LIMIT);

      const notifications = await context.prisma.notification.findMany({
        where: { userId, status: 'new' },
        orderBy: { created: 'desc' },
        take: limit,
        select: NOTIFICATION_SELECT,
      });

      return notifications.map(toNotificationEntity);
    },
  },
  Mutation: {
    /**
     * Soft-deletes a notification (status → `deleted`), matching legacy.
     * Only the recipient may remove their own notification.
     */
    removeNotification: async (
      _parent: unknown,
      args: { notificationId: string },
      context: GraphQLContext
    ): Promise<Common.Notification> => {
      const userId = requireUserId(context);

      if (!args.notificationId || !isObjectId(args.notificationId)) {
        throw new GraphQLError('Invalid notificationId', {
          extensions: { code: 'BAD_USER_INPUT' },
        });
      }

      const existing = await context.prisma.notification.findUnique({
        where: { id: args.notificationId },
        select: NOTIFICATION_SELECT,
      });
      if (!existing) {
        throw new GraphQLError('Notification not found', {
          extensions: { code: 'NOT_FOUND' },
        });
      }

      if (existing.userId !== userId) {
        throw new GraphQLError('Not authorized to remove this notification', {
          extensions: { code: 'FORBIDDEN' },
        });
      }

      if (existing.status === 'deleted') {
        return toNotificationEntity(existing);
      }

      const updated = await context.prisma.notification.update({
        where: { id: args.notificationId },
        data: { status: 'deleted' },
        select: NOTIFICATION_SELECT,
      });

      return toNotificationEntity(updated);
    },
  },
};
