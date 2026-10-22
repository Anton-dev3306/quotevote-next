import type { ActivityEntity, ActivityPost, ActivityUser } from '@/types/activity'
import type { Post } from '@/types/post'

const ids = (list?: Array<{ _id: string }> | null): Array<{ _id: string }> =>
  (list ?? []).map(({ _id }) => ({ _id }))

/**
 * Show a post as a "Posted" activity, so a profile's public posts render with the
 * same activity cards as the full activity list. Used while the live API only
 * returns the activity list to members.
 */
export function postToActivity(post: Post): ActivityEntity {
  const creator = post.creator
  const user: ActivityUser = {
    _id: creator?._id ?? post.userId,
    name: creator?.name ?? undefined,
    username: creator?.username ?? '',
    avatar: (creator?.avatar ?? undefined) as ActivityUser['avatar'],
  }
  const activityPost: ActivityPost = {
    _id: post._id,
    title: post.title ?? undefined,
    text: post.text ?? '',
    url: post.url ?? '',
    upvotes: post.upvotes ?? 0,
    downvotes: post.downvotes ?? 0,
    votes: ids(post.votes),
    quotes: ids(post.quotes),
    comments: ids(post.comments),
    messageRoom: post.messageRoom
      ? {
          _id: post.messageRoom._id,
          messages: ids((post.messageRoom as { messages?: Array<{ _id: string }> | null }).messages),
        }
      : undefined,
    bookmarkedBy: post.bookmarkedBy ?? [],
    created: post.created,
    creator: user,
  }

  return {
    _id: `posted-${post._id}`,
    created: post.created,
    postId: post._id,
    userId: post.userId,
    user,
    activityType: 'POSTED',
    content: post.text ?? '',
    post: activityPost,
  }
}
