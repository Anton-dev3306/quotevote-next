'use client'

import { useEffect } from 'react'
import { useQuery, useMutation } from '@apollo/client/react'
import { PaginatedList } from '@/components/common/PaginatedList'
import { ActivityCard } from '@/components/ui/ActivityCard'
import { GET_USER_ACTIVITY } from '@/graphql/queries'
import { pageToOffset, extractPaginationData } from '@/lib/utils/pagination'
import { usePaginationWithFilters } from '@/hooks/usePagination'
import { useWidth } from '@/hooks/useResponsive'
import getCardBackgroundColor from '@/lib/utils/getCardBackgroundColor'
import { getActivityContent } from '@/lib/utils/getActivityContent'
import { CREATE_POST_MESSAGE_ROOM, UPDATE_POST_BOOKMARK } from '@/graphql/mutations'
import {
  GET_CHAT_ROOMS,
  GET_POST,
  GET_TOP_POSTS,
} from '@/graphql/queries'
import { useAppStore } from '@/store'
import useGuestGuard from '@/hooks/useGuestGuard'
import { announceBookmarkChange } from '@/lib/utils/bookmarkFeedback'
import { useRouter } from 'next/navigation'
import { toAppPostUrl } from '@/lib/utils/sanitizeUrl'
import { isPostedActivityType } from '@/lib/constants/postCardTheme'
import { cn } from '@/lib/utils'
import { AlertCircle, Inbox, Loader2, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PaginatedActivityListProps, ActivityEntity } from '@/types/activity'

function LoadActivityCard({
  width,
  activity,
}: {
  width: 'lg' | 'md' | 'sm' | 'xl' | 'xs'
  activity: ActivityEntity
}) {
  const router = useRouter()
  const {
    post,
    user,
    quote,
    comment,
    vote,
    created,
    activityType,
  } = activity

  // Hooks must be called unconditionally before any early returns
  const currentUser = useAppStore((state) => state.user.data)
  const [createPostMessageRoom] = useMutation(CREATE_POST_MESSAGE_ROOM)
  const [updatePostBookmark] = useMutation(UPDATE_POST_BOOKMARK)
  const ensureAuth = useGuestGuard()
  const setSelectedPost = useAppStore((state) => state.setSelectedPost)

  if (!post) {
    return null
  }

  const {
    url,
    bookmarkedBy = [],
    upvotes = 0,
    downvotes = 0,
    comments = [],
    votes = [],
    quotes = [],
    messageRoom,
  } = post

  const messages = messageRoom?.messages || []
  const postId = post._id
  const { username, avatar, name } = user
  const limit = 5

  const type =
    activityType === 'VOTED' && vote
      ? `${vote.type}${activityType}`
      : activityType

  const content = getActivityContent(
    type,
    post as unknown as { text: string; [key: string]: unknown },
    quote as unknown as { startWordIndex: number; endWordIndex: number; [key: string]: unknown } | undefined,
    vote as unknown as { startWordIndex: number; endWordIndex: number; type?: string; [key: string]: unknown } | undefined,
    comment as unknown as { startWordIndex: number; endWordIndex: number; [key: string]: unknown } | undefined
  )

  const handleLike = async () => {
    if (!ensureAuth() || !currentUser?._id) return

    // GraphQL errors are already shown by the global Apollo error link.
    try {
      await updatePostBookmark({
        variables: { postId, userId: currentUser._id },
      })
    } catch {
      return
    }
    announceBookmarkChange(Boolean(isLiked))

    await createPostMessageRoom({
      variables: { postId },
      refetchQueries: [
        {
          query: GET_CHAT_ROOMS,
        },
        {
          query: GET_POST,
          variables: {
            postId,
          },
        },
        {
          query: GET_USER_ACTIVITY,
          variables: {
            user_id: currentUser._id,
            limit,
            offset: 0,
            searchKey: '',
            activityEvent: [],
          },
        },
        {
          query: GET_TOP_POSTS,
          variables: { limit, offset: 0, searchKey: '', interactions: false },
        },
      ],
    })
  }

  const handleRedirectToProfile = (profileUsername: string) => {
    router.push(`/profile/${profileUsername}`)
  }

  const isLiked = currentUser?._id && typeof currentUser._id === 'string' ? bookmarkedBy.includes(currentUser._id) : false

  const handleCardClick = () => {
    setSelectedPost(postId)
    router.push(toAppPostUrl(url.replace(/\?/g, '')))
  }

  // POSTED cards own blue PostCard chrome (#380); skip competing wrapper border.
  const isPosted = isPostedActivityType(type)

  return (
    <div
      className={cn(
        'mb-2 w-full max-w-full overflow-x-hidden box-border',
        // The keyboard focus outline sits here: this wrapper's overflow would clip one on the card.
        'has-[>[role=article]:focus-visible]:outline-3 has-[>[role=article]:focus-visible]:outline-offset-2 has-[>[role=article]:focus-visible]:outline-[#52b274]',
        !isPosted && 'rounded-lg shadow-lg border'
      )}
      style={{ borderRadius: 7 }}
    >
      <ActivityCard
        avatar={avatar}
        cardColor={getCardBackgroundColor(type)}
        name={name}
        username={username}
        date={created}
        upvotes={upvotes}
        downvotes={downvotes}
        comments={comments}
        messages={messages}
        votes={votes}
        quotes={quotes}
        liked={isLiked}
        post={post ? { ...post, created: typeof post.created === 'number' ? String(post.created) : post.created, title: post.title ?? null } as Partial<import('@/types/post').Post> : undefined}
        content={content}
        width={width}
        onLike={handleLike}
        handleRedirectToProfile={handleRedirectToProfile}
        onCardClick={handleCardClick}
        activityType={type}
      />
    </div>
  )
}

export function PaginatedActivityList({
  defaultPageSize = 15,
  pageParam = 'page',
  pageSizeParam = 'page_size',
  userId,
  searchKey = '',
  startDateRange,
  endDateRange,
  activityEvent = ['POSTED'],
  showPageInfo = true,
  showFirstLast = true,
  maxVisiblePages = 5,
  onPageChange,
  onPageSizeChange,
  onRefresh,
  onClearFilters,
  className,
  contentClassName,
  paginationClassName,
}: PaginatedActivityListProps) {
  const width = useWidth()
  const hiddenPosts = useAppStore((state) => state.ui.hiddenPosts) || []

  // Use pagination hook with filter dependencies
  const pagination = usePaginationWithFilters(
    {
      defaultPageSize,
      pageParam,
      pageSizeParam,
      onPageChange,
      onPageSizeChange,
    },
    [userId, searchKey, startDateRange, endDateRange, activityEvent]
  )

  // Create GraphQL variables - convert page to offset
  const { limit, offset } = pageToOffset(pagination.currentPage, pagination.pageSize)

  // Fetch data
  const { loading, error, data, refetch } = useQuery(GET_USER_ACTIVITY, {
    variables: {
      user_id: userId || '',
      limit,
      offset,
      searchKey: searchKey || '',
      startDateRange: startDateRange || null,
      endDateRange: endDateRange || null,
      activityEvent: activityEvent,
    },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true,
    skip: !userId,
  })

  // Ensure data is fetched when component mounts with page parameter
  useEffect(() => {
    if (pagination.currentPage > 1 && !data) {
      refetch()
    }
  }, [pagination.currentPage, data, refetch])

  // Extract and process data
  const { data: entities, pagination: paginationData } = extractPaginationData(
    data as Record<string, unknown>,
    'activities'
  )

  // Filter out hidden posts
  const processedActivities = (entities as ActivityEntity[]).filter(
    (activity) => !hiddenPosts.includes(activity._id)
  )

  // Render individual activity — keys must be stable across inserts/removes/reorders.
  // `_id` is requested by GET_USER_ACTIVITY; composite fields are stable fallbacks only.
  const renderActivity = (activity: ActivityEntity) => {
    const key =
      activity._id ||
      [
        activity.postId,
        activity.activityType,
        activity.voteId,
        activity.commentId,
        activity.quoteId,
      ]
        .filter((part) => part !== undefined && part !== null && part !== '')
        .join('-')

    return <LoadActivityCard key={key} activity={activity} width={width} />
  }

  // Render empty state
  const renderEmpty = () => (
    <div
      role="status"
      data-testid="activity-empty"
      className="flex flex-col items-center gap-2 rounded-lg border border-border/60 bg-card px-6 py-10 text-center"
    >
      <Inbox className="size-8 text-foreground/50" aria-hidden="true" />
      <h3 className="text-base font-semibold">
        {searchKey || onClearFilters ? 'Nothing matches' : 'No activity yet'}
      </h3>
      <p className="max-w-sm text-sm text-foreground/75">
        {searchKey
          ? `No activity matches "${searchKey}".`
          : onClearFilters
            ? 'Nothing of this kind yet. Try another filter.'
            : 'Posts, votes, comments and quotes will show up here.'}
      </p>
      {onClearFilters && (
        <Button
          type="button"
          variant="outline"
          onClick={() => onClearFilters()}
          className="mt-2 focus-visible:ring-2 focus-visible:ring-[#2f7a4c] focus-visible:ring-offset-2 focus-visible:ring-offset-card dark:focus-visible:ring-[#7fdc9c]"
        >
          Show all activity
        </Button>
      )}
    </div>
  )

  // Render error state
  const renderError = (
    _error: Error | { message?: string },
    onRetry?: () => void
  ) => (
    <div
      role="alert"
      data-testid="activity-error"
      className="flex flex-col items-center gap-2 rounded-lg border border-border/60 bg-card px-6 py-10 text-center"
    >
      <AlertCircle className="size-8 text-destructive" aria-hidden="true" />
      <h3 className="text-base font-semibold">Activity couldn&apos;t load</h3>
      <p className="max-w-sm text-sm text-foreground/75">Check your connection and try again.</p>
      {onRetry && (
        <Button
          type="button"
          variant="outline"
          // Call with no arguments: passing the click event would reach refetch as variables.
          onClick={() => onRetry()}
          className="mt-2 focus-visible:ring-2 focus-visible:ring-[#2f7a4c] focus-visible:ring-offset-2 focus-visible:ring-offset-card dark:focus-visible:ring-[#7fdc9c]"
        >
          <RotateCw className="size-4" aria-hidden="true" />
          Try again
        </Button>
      )}
    </div>
  )

  // Render loading state
  const renderLoading = () => (
    <div
      role="status"
      aria-busy="true"
      data-testid="activity-loading"
      className="flex items-center justify-center gap-2 p-8 text-sm text-foreground/75"
    >
      <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      Loading activity…
    </div>
  )

  return (
    <PaginatedList
      data={processedActivities}
      loading={loading}
      error={error}
      totalCount={typeof paginationData?.total_count === 'number' ? paginationData.total_count : 0}
      defaultPageSize={defaultPageSize}
      pageParam={pageParam}
      pageSizeParam={pageSizeParam}
      showPageInfo={showPageInfo}
      showFirstLast={showFirstLast}
      maxVisiblePages={maxVisiblePages}
      renderItem={renderActivity}
      renderEmpty={renderEmpty}
      renderError={renderError}
      renderLoading={renderLoading}
      onRefresh={onRefresh ?? refetch}
      className={className}
      contentClassName={contentClassName}
      paginationClassName={paginationClassName}
    >
      <div className="flex flex-col gap-5">
        {processedActivities.map(renderActivity)}
      </div>
    </PaginatedList>
  )
}

