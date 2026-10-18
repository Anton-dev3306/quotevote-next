'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Bell, FileX2, House } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store'

/**
 * Shown instead of a post that can't be loaded (#532). A notification that points
 * at a deleted post links here with `?deleted=1`, so the page can say the post was
 * deleted and offer a way back to Notifications instead of a bare "not found".
 */
export default function PostUnavailable() {
  const searchParams = useSearchParams()
  const deleted = searchParams?.get('deleted') === '1'
  const loggedIn = useAppStore((s) => !!(s.user.data?._id || s.user.data?.id))
  const setNotificationsOpen = useAppStore((s) => s.setNotificationsOpen)

  return (
    <div
      className="mx-auto flex min-h-[50vh] max-w-md flex-col items-center justify-center px-6 py-12 text-center"
      data-testid="post-unavailable"
    >
      <span className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
        <FileX2 className="size-7 text-muted-foreground" aria-hidden="true" />
      </span>
      <h1 className="text-xl font-semibold text-foreground">
        {deleted ? 'This post has been deleted.' : 'This post isn’t available.'}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {deleted
          ? 'It was removed by its author or an admin, so it can no longer be opened.'
          : 'It may have been deleted, or the link may be wrong.'}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {deleted && loggedIn && (
          <Button type="button" onClick={() => setNotificationsOpen(true)}>
            <Bell className="size-4" aria-hidden="true" />
            Back to notifications
          </Button>
        )}
        <Button asChild variant={deleted && loggedIn ? 'outline' : 'default'}>
          <Link href="/">
            <House className="size-4" aria-hidden="true" />
            Go to home
          </Link>
        </Button>
      </div>
    </div>
  )
}
