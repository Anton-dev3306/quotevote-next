'use client'

import { useAppStore } from '@/store'
import ChatContent from '@/components/Chat/ChatContent'

/**
 * Fixed right (Chat / messages) sidebar shared by the dashboard pages that
 * align with the Home feed column: Profile and Settings & Privacy.
 *
 * Notifications used to sit in a matching left sidebar here. They now live in
 * the main navigation as an overlay (#532), so this page no longer repeats them.
 */
export function DashboardSidebars() {
  const user = useAppStore((state) => state.user.data)
  const isLoggedIn = !!(user?._id || user?.id)

  if (!isLoggedIn) return null

  return (
    <aside
      data-dashboard-aside="right"
      className="hidden xl:flex flex-col fixed top-[60px] right-0 w-[360px] 2xl:w-[420px] h-[calc(100vh-60px)] border-l border-border bg-background overflow-hidden z-30"
    >
      <ChatContent />
    </aside>
  )
}
