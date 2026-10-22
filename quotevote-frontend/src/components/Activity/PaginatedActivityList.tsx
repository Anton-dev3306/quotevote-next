'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
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
import { postToActivity } from '@/lib/utils/postToActivity'
import { isSignInRequiredError } from '@/lib/utils/isSignInRequiredError'
import { useAuthModal } from '@/context/AuthModalContext'
import { FOCUS_RING_CLASS, PRIMARY_ACTION_CLASS } from '@/lib/constants/formControls'
import { cn } from '@/lib/utils'
import { AlertCircle, Inbox, Loader2, Lock, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { PaginatedActivityListProps, ActivityEntity } from '@/types/activity'
import type { Post } from '@/types/post'

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

const RETRY_BUTTON_CLASS =
  'mt-2 focus-visible:ring-2 focus-visible:ring-[#2f7a4c] focus-visible:ring-offset-2 focus-visible:ring-offset-card dark:focus-visible:ring-[#7fdc9c]'

/** Keys must be stable across inserts/removes/reorders; composite fields are fallbacks only. */
function activityKey(activity: ActivityEntity): string {
  return (
    activity._id ||
    [activity.postId, activity.activityType, activity.voteId, activity.commentId, activity.quoteId]
      .filter((part) => part !== undefined && part !== null && part !== '')
      .join('-')
  )
}

function ActivityEmpty({
  title,
  message,
  onClearFilters,
}: {
  title: string
  message: string
  onClearFilters?: () => void
}) {
  return (
    <div
      role="status"
      data-testid="activity-empty"
      className="flex flex-col items-center gap-2 rounded-lg border border-border/60 bg-card px-6 py-10 text-center"
    >
      <Inbox className="size-8 text-foreground/50" aria-hidden="true" />
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="max-w-sm text-sm text-foreground/75">{message}</p>
      {onClearFilters && (
        <Button type="button" variant="outline" onClick={() => onClearFilters()} className={RETRY_BUTTON_CLASS}>
          Show all activity
        </Button>
      )}
    </div>
  )
}

function ActivityError({ onRetry }: { onRetry?: () => void }) {
  return (
    <div
      role="alert"
      data-testid="activity-error"
      className="flex flex-col items-center gap-2 rounded-lg border border-border/60 bg-card px-6 py-10 text-center"
    >
      <AlertCircle className="size-8 text-destructive" aria-hidden="true" />
      <h3 className="text-base font-semibold">Activity couldn&apos;t load</h3>
      <p className="max-w-sm text-sm text-foreground/75">Check your connection and try again.</p>
      {onRetry && (
        // Call with no arguments: passing the click event would reach refetch as variables.
        <Button type="button" variant="outline" onClick={() => onRetry()} className={RETRY_BUTTON_CLASS}>
          <RotateCw className="size-4" aria-hidden="true" />
          Try again
        </Button>
      )}
    </div>
  )
}

function ActivityLoading() {
  return (
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
}

/** Shown to a guest who filters to votes, comments or quotes while those need an account. */
function MembersOnlyActivity({ onClearFilters }: { onClearFilters?: () => void }) {
  const { openAuthModal } = useAuthModal()
  return (
    <div
      role="status"
      data-testid="activity-members-only"
      className="flex flex-col items-center gap-2 rounded-lg border border-border/60 bg-card px-6 py-10 text-center"
    >
      <Lock className="size-8 text-foreground/70" aria-hidden="true" />
      <h3 className="text-base font-semibold">Votes, comments and quotes are for members</h3>
      <p className="max-w-sm text-sm text-foreground/75">
        Sign in to see them. Quote.Vote is invite-only, so new members start by requesting an
        invite.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <Button
          type="button"
          onClick={() => openAuthModal({ view: 'login' })}
          className={cn('min-h-10 px-5', PRIMARY_ACTION_CLASS, FOCUS_RING_CLASS)}
        >
          Sign in
        </Button>
        <Button asChild variant="outline" className={cn('min-h-10 px-5', FOCUS_RING_CLASS)}>
          <Link href="/auths/request-access">Request an invite</Link>
        </Button>
        {onClearFilters && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => onClearFilters()}
            className={cn('min-h-10 px-4', FOCUS_RING_CLASS)}
          >
            Show posts
          </Button>
        )}
      </div>
    </div>
  )
}

// Once the API has said the activity list needs an account, later guest profile
// views in this session go straight to the public posts instead of asking again.
let activityNeedsSignIn = false

/**
 * A guest's view while the live API only returns the activity list to members:
 * the profile's public posts, shown as "Posted" activity cards with the same
 * filters and pages. Votes, comments and quotes show a members-only state.
 */
function PublicPostActivityList({
  defaultPageSize = 15,
  pageParam = 'page',
  pageSizeParam = 'page_size',
  userId,
  activityEvent = [],
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
  const showsPosts = activityEvent.length === 0 || activityEvent.includes('POSTED')

  const pagination = usePaginationWithFilters(
    { defaultPageSize, pageParam, pageSizeParam, onPageChange, onPageSizeChange },
    [userId, showsPosts]
  )
  const { limit, offset } = pageToOffset(pagination.currentPage, pagination.pageSize)

  const { loading, error, data, refetch } = useQuery(GET_TOP_POSTS, {
    variables: { limit, offset, searchKey: '', userId },
    fetchPolicy: 'cache-and-network',
    errorPolicy: 'all',
    notifyOnNetworkStatusChange: true,
    skip: !userId || !showsPosts,
  })

  if (!showsPosts) return <MembersOnlyActivity onClearFilters={onClearFilters} />

  const { data: posts, pagination: paginationData } = extractPaginationData<Post>(
    data as Record<string, unknown>,
    'posts'
  )
  const activities = (posts ?? [])
    .filter((post) => !hiddenPosts.includes(post._id))
    .map(postToActivity)

  return (
    <PaginatedList
      data={activities}
      loading={loading}
      error={error}
      totalCount={paginationData?.total ?? 0}
      defaultPageSize={defaultPageSize}
      pageParam={pageParam}
      pageSizeParam={pageSizeParam}
      showPageInfo={showPageInfo}
      showFirstLast={showFirstLast}
      maxVisiblePages={maxVisiblePages}
      renderItem={(activity) => <LoadActivityCard key={activityKey(activity)} activity={activity} width={width} />}
      renderEmpty={() => <ActivityEmpty title="No posts yet" message="Posts will show up here." />}
      renderError={(_error, onRetry) => <ActivityError onRetry={onRetry} />}
      renderLoading={() => <ActivityLoading />}
      onRefresh={onRefresh ?? refetch}
      className={className}
      contentClassName={contentClassName}
      paginationClassName={paginationClassName}
    >
      <div className="flex flex-col gap-5">
        {activities.map((activity) => (
          <LoadActivityCard key={activityKey(activity)} activity={activity} width={width} />
        ))}
      </div>
    </PaginatedList>
  )
}

export function PaginatedActivityList(props: PaginatedActivityListProps) {
  const {
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
    publicFallback = false,
    onMembersOnlyChange,
    className,
    contentClassName,
    paginationClassName,
  } = props
  const width = useWidth()
  const hiddenPosts = useAppStore((state) => state.ui.hiddenPosts) || []
  const [membersOnly, setMembersOnly] = useState(() => publicFallback && activityNeedsSignIn)
  const showPublicPosts = publicFallback && membersOnly

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
    skip: !userId || showPublicPosts,
  })

  // A guest asked for activity the API keeps for members: switch to the public posts
  // in this same render, so the error state never shows.
  const signInRequired = publicFallback && isSignInRequiredError(error)
  if (signInRequired && !membersOnly) setMembersOnly(true)

  // Read from committed state: the render that saw the refusal is replaced at once.
  useEffect(() => {
    if (showPublicPosts) activityNeedsSignIn = true
  }, [showPublicPosts])

  useEffect(() => {
    onMembersOnlyChange?.(showPublicPosts)
  }, [onMembersOnlyChange, showPublicPosts])

  // Ensure data is fetched when component mounts with page parameter
  useEffect(() => {
    if (!showPublicPosts && pagination.currentPage > 1 && !data) {
      refetch()
    }
  }, [showPublicPosts, pagination.currentPage, data, refetch])

  if (showPublicPosts) return <PublicPostActivityList {...props} />

  // Extract and process data
  const { data: entities, pagination: paginationData } = extractPaginationData(
    data as Record<string, unknown>,
    'activities'
  )

  // Filter out hidden posts
  const processedActivities = (entities as ActivityEntity[]).filter(
    (activity) => !hiddenPosts.includes(activity._id)
  )

  const renderActivity = (activity: ActivityEntity) => (
    <LoadActivityCard key={activityKey(activity)} activity={activity} width={width} />
  )

  return (
    <PaginatedList
      data={processedActivities}
      loading={loading}
      error={error}
      // extractPaginationData reports the API's total_count as `total`. Reading
      // total_count here gave 0, so the page links never showed.
      totalCount={paginationData?.total ?? 0}
      defaultPageSize={defaultPageSize}
      pageParam={pageParam}
      pageSizeParam={pageSizeParam}
      showPageInfo={showPageInfo}
      showFirstLast={showFirstLast}
      maxVisiblePages={maxVisiblePages}
      renderItem={renderActivity}
      renderEmpty={() => (
        <ActivityEmpty
          title={searchKey || onClearFilters ? 'Nothing matches' : 'No activity yet'}
          message={
            searchKey
              ? `No activity matches "${searchKey}".`
              : onClearFilters
                ? 'Nothing of this kind yet. Try another filter.'
                : 'Posts, votes, comments and quotes will show up here.'
          }
          onClearFilters={onClearFilters}
        />
      )}
      renderError={(_error, onRetry) => <ActivityError onRetry={onRetry} />}
      renderLoading={() => <ActivityLoading />}
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
