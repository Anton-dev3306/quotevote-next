'use client';

import { useState, useCallback, useMemo } from 'react';
import { Check, ListFilter } from 'lucide-react';
import Link from 'next/link';
import type { ProfileViewProps } from '@/types/profile';
import { ProfileHeader } from './ProfileHeader';
import { ReputationDisplay } from './ReputationDisplay';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Card, CardContent } from '@/components/ui/card';
import { PaginatedActivityList } from '@/components/Activity/PaginatedActivityList';
import { ProfileActivitySignIn } from './ProfileActivitySignIn';
import { useHasMounted } from '@/hooks/useMediaQuery';
import { isAuthenticated } from '@/lib/utils/auth';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';

export type ProfileActivityType = 'POSTED' | 'VOTED' | 'COMMENTED' | 'QUOTED';

export const ACTIVITY_FILTERS: Array<{
  id: ProfileActivityType;
  label: string;
}> = [
  { id: 'POSTED', label: 'Posts' },
  { id: 'VOTED', label: 'Voted' },
  { id: 'COMMENTED', label: 'Commented' },
  { id: 'QUOTED', label: 'Quoted' },
];

// Dot beside each filter, matching the activity card it shows: post cards have
// the blue border, votes are green, comments yellow and quotes pink.
export const ACTIVITY_FILTER_DOT_COLORS: Record<ProfileActivityType, string> = {
  POSTED: '#56b3ff',
  VOTED: '#52b274',
  COMMENTED: '#FDD835',
  QUOTED: '#E36DFA',
};

export const ALL_ACTIVITY_TYPES: ProfileActivityType[] = [
  'POSTED',
  'VOTED',
  'COMMENTED',
  'QUOTED',
];

const NO_ACTIVITY_FILTER: ProfileActivityType[] = [];

const FILTER_CHIP_CLASS =
  'inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f7a4c] focus-visible:ring-offset-2 focus-visible:ring-offset-card dark:focus-visible:ring-[#7fdc9c]';
const FILTER_CHIP_ACTIVE_CLASS =
  'border-[#2f7a4c] bg-[#2f7a4c]/10 text-[#2f6f4a] dark:border-[#7fdc9c] dark:bg-[#7fdc9c]/10 dark:text-[#7fdc9c]';
const FILTER_CHIP_IDLE_CLASS =
  'border-border text-foreground/80 hover:bg-muted hover:text-foreground';

export function ProfileView({
  profileUser,
  loading,
  errorMessage,
}: ProfileViewProps) {
  const [selectedFilters, setSelectedFilters] = useState<ProfileActivityType[]>([]);
  // The live API only returns activity to members (#606). The session lives in the
  // browser, so decide after mount to keep the server and client HTML the same.
  const hasMounted = useHasMounted();
  const sessionUserId = useAppStore((state) => state.user.data._id || state.user.data.id);
  const signedIn = hasMounted && (Boolean(sessionUserId) || isAuthenticated());

  const handleSelectAll = useCallback(() => {
    setSelectedFilters([]);
  }, []);

  const handleToggleFilter = useCallback((filterId: ProfileActivityType) => {
    setSelectedFilters((prev) => {
      if (prev.length === 0 || prev.length === ALL_ACTIVITY_TYPES.length) {
        return [filterId];
      }
      if (prev.includes(filterId)) {
        return prev.filter((id) => id !== filterId);
      }
      return [...prev, filterId];
    });
  }, []);

  const isAllActive =
    selectedFilters.length === 0 || selectedFilters.length === ALL_ACTIVITY_TYPES.length;
  // Stable reference: a new [] on every render would send the list back to page 1.
  const activityEvent = useMemo(
    () => (isAllActive ? NO_ACTIVITY_FILTER : selectedFilters),
    [isAllActive, selectedFilters]
  );

  if (loading) return <LoadingSpinner />;

  if (errorMessage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-5">
        <Card>
          <CardContent className="pt-6 text-center space-y-2">
            <h3 className="text-lg font-semibold">Couldn&apos;t load this profile</h3>
            <p className="text-sm text-muted-foreground">{errorMessage}</p>
            <Link href="/" className="text-primary hover:underline inline-block mt-2">
              Back to Explore
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-5">
        <Card>
          <CardContent className="pt-6 text-center">
            <h3 className="text-lg font-semibold mb-2">Invalid user</h3>
            <Link href="/" className="text-primary hover:underline">
              Return to homepage.
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full pb-8">
      <ProfileHeader profileUser={profileUser} />

      <div className="w-full mt-3">
        {!hasMounted ? (
          <div
            role="status"
            aria-busy="true"
            data-testid="activity-loading"
            className="flex items-center justify-center p-8 text-sm text-foreground/75"
          >
            Loading activity…
          </div>
        ) : !signedIn ? (
          <ProfileActivitySignIn displayName={profileUser.name || profileUser.username} />
        ) : (
          <>
          {/* A filter, not tabs (#536): labelled chips that can be combined. */}
          <div
            role="group"
            aria-labelledby="profile-activity-filter-label"
            data-testid="profile-activity-filters"
            className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5"
          >
            <span
              id="profile-activity-filter-label"
              className="mr-1 inline-flex items-center gap-1.5 text-sm font-medium text-foreground/80"
            >
              <ListFilter className="size-4" aria-hidden="true" />
              Show
            </span>
            <button
              type="button"
              aria-pressed={isAllActive}
              data-state={isAllActive ? 'active' : 'inactive'}
              onClick={handleSelectAll}
              className={cn(FILTER_CHIP_CLASS, isAllActive ? FILTER_CHIP_ACTIVE_CLASS : FILTER_CHIP_IDLE_CLASS)}
            >
              {isAllActive && <Check className="size-3.5" aria-hidden="true" />}
              All
            </button>

            {ACTIVITY_FILTERS.map(({ id, label }) => {
              const isActive = !isAllActive && selectedFilters.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={isActive}
                  data-state={isActive ? 'active' : 'inactive'}
                  onClick={() => handleToggleFilter(id)}
                  className={cn(FILTER_CHIP_CLASS, isActive ? FILTER_CHIP_ACTIVE_CLASS : FILTER_CHIP_IDLE_CLASS)}
                >
                  {isActive ? (
                    <Check className="size-3.5" aria-hidden="true" />
                  ) : (
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: ACTIVITY_FILTER_DOT_COLORS[id] }}
                      aria-hidden="true"
                    />
                  )}
                  {label}
                </button>
              );
            })}

            {!isAllActive && (
              <button
                type="button"
                onClick={handleSelectAll}
                className="ml-auto inline-flex min-h-8 items-center rounded-md px-2 text-sm font-medium text-[#2f6f4a] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f7a4c] dark:text-[#7fdc9c] dark:focus-visible:ring-[#7fdc9c]"
              >
                Clear
              </button>
            )}
          </div>

          {/* Content Section */}
          <div className="mt-4" data-testid="profile-activity-section">
            <PaginatedActivityList
              userId={profileUser._id}
              activityEvent={activityEvent}
              onClearFilters={isAllActive ? undefined : handleSelectAll}
              defaultPageSize={15}
              maxVisiblePages={5}
            />
          </div>
          </>
        )}

        {profileUser.reputation ? (
          <div className="mt-4" data-testid="profile-reputation-section">
            <ReputationDisplay
              reputation={profileUser.reputation}
              onRefresh={() => window.location.reload()}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
