'use client'

/**
 * Loading placeholder shaped like PostCard (#528): tag row, title, preview,
 * then the author / activity footer, so nothing jumps when the posts arrive.
 */
export default function PostSkeleton() {
  return (
    <div
      className="flex flex-col gap-4 px-4 py-4"
      role="status"
      aria-live="polite"
      aria-busy="true"
      data-testid="post-skeleton-list"
    >
      <span className="sr-only">Loading…</span>
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          aria-hidden="true"
          className="bg-card rounded-[7px] border-2 border-b-8 border-border/70 overflow-hidden animate-pulse motion-reduce:animate-none"
        >
          <div className="px-4 pt-3 pb-3">
            {/* Tag + save/share */}
            <div className="mb-2 flex items-center justify-between">
              <div className="h-6 w-14 rounded-full bg-muted/60" />
              <div className="flex gap-1">
                <div className="size-7 rounded bg-muted/40" />
                <div className="size-7 rounded bg-muted/40" />
              </div>
            </div>
            {/* Title */}
            <div className="mb-2 h-6 w-3/4 rounded bg-muted/70" />
            {/* Preview */}
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-muted/50" />
              <div className="h-4 w-full rounded bg-muted/50" />
              <div className="h-4 w-2/3 rounded bg-muted/40" />
            </div>
          </div>

          {/* Author, time, activity */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border/30 bg-muted/10">
            <div className="size-7 rounded-full bg-muted/60" />
            <div className="h-4 w-20 rounded bg-muted/50" />
            <div className="h-3 w-28 rounded bg-muted/40" />
            <div className="ml-auto h-3 w-24 rounded bg-muted/40" />
          </div>
        </div>
      ))}
    </div>
  )
}
