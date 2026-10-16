"use client";

import type { FC } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Quote } from 'lucide-react';

import Avatar from '@/components/Avatar';
import { Card, CardContent } from '@/components/ui/card';
import { useAppStore } from '@/store';
import { toAbsolutePostUrl } from '@/lib/utils/sanitizeUrl';
import type { ChatParticipant } from '@/types/chat';

interface QuotePostDetails {
  _id?: string;
  title?: string | null;
  text?: string | null;
  userId?: string | null;
  url?: string | null;
}

interface QuoteHeaderMessageProps {
  postDetails: QuotePostDetails | null | undefined;
  postCreator: ChatParticipant | null | undefined;
}

const QuoteHeaderMessage: FC<QuoteHeaderMessageProps> = ({
  postDetails,
  postCreator,
}) => {
  const setChatOpen = useAppStore((state) => state.setChatOpen);

  if (!postDetails) return null;

  const { title, text, url } = postDetails;
  const authorName = postCreator?.name || postCreator?.username || null;
  // Same-app path only ('' origin); without one the card simply has no link.
  const postPath = toAbsolutePostUrl(url, '');

  return (
    <div className="px-4 pb-2 pt-3">
      <Card className="relative overflow-hidden rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-br from-slate-50 to-white shadow-sm dark:from-slate-900 dark:to-slate-950">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-emerald-500 to-emerald-600" />
        <CardContent className="relative flex flex-col gap-3 pl-4">
          <div className="flex items-center gap-3">
            {postCreator && authorName && (
              <Avatar
                src={postCreator.avatar}
                alt={authorName}
                size={40}
                className="h-10 w-10 border-2 border-background shadow-sm"
              />
            )}
            <div className="min-w-0 flex-1">
              {authorName && (
                <div className="truncate text-sm font-semibold text-foreground">
                  {authorName}
                </div>
              )}
              <div className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Quote className="h-3.5 w-3.5 text-emerald-500" />
                <span>Original Quote</span>
              </div>
            </div>
          </div>

          {title && (
            <div className="text-sm font-semibold leading-snug text-foreground">
              {title}
            </div>
          )}

          {text && (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {text}
            </div>
          )}

          {postPath && (
            <Link
              href={postPath}
              onClick={() => setChatOpen(false)}
              data-testid="quote-header-view-post"
              className="mt-1 inline-flex items-center gap-1 self-start rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2"
            >
              View post
              <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QuoteHeaderMessage;
