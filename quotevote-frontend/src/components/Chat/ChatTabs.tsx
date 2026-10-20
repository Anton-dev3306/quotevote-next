"use client";

import type { FC, KeyboardEvent, MouseEvent } from 'react';
import { useRef } from 'react';
import { MessageCircle, Users2, UserRound } from 'lucide-react';

import { cn } from '@/lib/utils';

type ChatTabValue = 'chats' | 'groups' | 'buddies';

interface ChatTabsProps {
  value: ChatTabValue;
  onChange: (event: MouseEvent<HTMLButtonElement> | KeyboardEvent<HTMLButtonElement>, value: ChatTabValue) => void;
  dmCount?: number;
  groupCount?: number;
  onlineCount?: number;
  /** id of the element the tabs switch, for aria-controls */
  panelId?: string;
}

const TABS: Array<{ value: ChatTabValue; label: string; Icon: typeof MessageCircle }> = [
  { value: 'chats', label: 'Chats', Icon: MessageCircle },
  { value: 'groups', label: 'Discussions', Icon: Users2 },
  { value: 'buddies', label: 'Buddies', Icon: UserRound },
];

const ChatTabs: FC<ChatTabsProps> = ({
  value,
  onChange,
  dmCount = 0,
  groupCount = 0,
  onlineCount = 0,
  panelId,
}) => {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const counts: Record<ChatTabValue, number> = { chats: dmCount, groups: groupCount, buddies: onlineCount };

  // Arrow keys move between tabs, as in any tab list.
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = -1;
    if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + TABS.length) % TABS.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = TABS.length - 1;
    if (next < 0) return;
    event.preventDefault();
    tabRefs.current[next]?.focus();
    onChange(event, TABS[next].value);
  };

  return (
    <div role="tablist" aria-label="Messages" className="flex border-b border-border bg-background/80 px-1">
      {TABS.map(({ value: tab, label, Icon }, index) => {
        const selected = value === tab;
        const count = counts[tab];
        return (
          <button
            key={tab}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={`chat-tab-${tab}`}
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={(event) => onChange(event, tab)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              'flex min-h-11 flex-1 items-center justify-center gap-1.5 border-b-[3px] border-transparent px-2 py-2.5 text-xs font-medium tracking-wide text-zinc-600 transition-colors dark:text-zinc-400',
              'hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#52b274]',
              selected &&
                'border-[#2f7a4c] bg-[#52b274]/10 font-semibold text-[#2f6f4a] dark:border-[#7fdc9c] dark:bg-[#52b274]/15 dark:text-[#7fdc9c]'
            )}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            <span>{label}</span>
            {count > 0 && (
              <span className="inline-flex min-w-[1.5rem] items-center justify-center rounded-full bg-[#2f7a4c] px-1.5 text-[10px] font-semibold text-white">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ChatTabs;
