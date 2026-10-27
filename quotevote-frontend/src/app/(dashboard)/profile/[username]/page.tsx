import type { Metadata } from 'next';
import { buildPageMetadata, decodeParam, pageTitle, SITE_NAME } from '@/lib/seo/metadata';
import { getUserForMetadata } from '@/lib/seo/serverData';
import { ProfileUsernamePage } from './ProfileUsernamePageContent';

interface Props {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const username = decodeParam((await params).username);
  const user = await getUserForMetadata(username);

  const handle = `@${user?.username ?? username}`;
  const name = user?.name?.trim();
  const displayName = name ? `${name} (${handle})` : handle;

  return buildPageMetadata({
    title: pageTitle(displayName),
    description: `See ${displayName}'s posts, quotes and votes on ${SITE_NAME}.`,
    path: `/profile/${encodeURIComponent(user?.username ?? username)}`,
    type: 'profile',
  });
}

export const dynamic = 'force-dynamic';

export default async function ProfileByUsernamePage({ params }: Props) {
  const { username } = await params;
  return <ProfileUsernamePage username={username} />;
}
