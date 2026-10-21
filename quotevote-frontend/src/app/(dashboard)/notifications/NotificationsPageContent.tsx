'use client';

import { useQuery, useSubscription } from '@apollo/client/react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GET_NOTIFICATIONS } from '@/graphql/queries';
import { NEW_NOTIFICATION_SUBSCRIPTION } from '@/graphql/subscriptions';
import { useAppStore } from '@/store';
import { NotificationLists } from '@/components/Notifications/NotificationLists';
import { Skeleton } from '@/components/ui/skeleton';
import { useHasMounted } from '@/hooks/useMediaQuery';
import type { Notification } from '@/types/notification';

export function NotificationsPageContent() {
  const hasMounted = useHasMounted();
  const userId = useAppStore((state) => (state.user.data._id || state.user.data.id) as string | undefined);

  const { loading, data, refetch, error } = useQuery(GET_NOTIFICATIONS, {
    skip: !userId,
  });

  useSubscription(NEW_NOTIFICATION_SUBSCRIPTION, {
    variables: { userId: userId || '' },
    skip: !userId,
    onData: async () => {
      await refetch();
    },
  });

  // The server doesn't know who is signed in, so it can't tell the list from the
  // empty state. Until the browser has mounted (and the first fetch is back), both
  // sides render the loading state, which keeps hydration consistent (#605).
  const pending = !hasMounted || loading || (Boolean(userId) && !data && !error);

  const notifications: Notification[] =
    pending || error || !data
      ? []
      : (data as { notifications?: Notification[] }).notifications || [];

  return (
    <div className="px-4 md:px-0 py-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
        </div>
        {!pending && notifications.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {pending ? (
        <div className="space-y-3" aria-busy="true" data-testid="notifications-loading">
          <span className="sr-only">Loading notifications</span>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-card rounded-lg p-4 border border-border">
              <div className="flex items-start gap-3">
                <Skeleton className="w-10 h-10 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div
          role="alert"
          className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card px-4 py-8 text-center"
        >
          <div>
            <p className="text-sm font-medium text-foreground">
              We couldn&apos;t load your notifications.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Check your connection and try again.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="focus-visible:ring-[#2f7a4c] dark:focus-visible:ring-[#7fdc9c]"
            onClick={() => void refetch()}
          >
            Try again
          </Button>
        </div>
      ) : (
        <NotificationLists notifications={notifications} pageView />
      )}
    </div>
  );
}
