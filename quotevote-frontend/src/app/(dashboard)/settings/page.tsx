import type { Metadata } from 'next'
import SettingsPageClient from './SettingsPageClient'

export const metadata: Metadata = {
  title: 'Settings — Quote.Vote',
  description: 'Your account and app preferences.',
}

export const dynamic = 'force-dynamic'

export default function SettingsPage() {
  return <SettingsPageClient />
}
