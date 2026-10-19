"use client";

import { useEffect, useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { Hash, MessageCircle, SearchX } from 'lucide-react';

import { GET_BUDDY_LIST, GET_CHAT_ROOMS, GET_CHAT_ROOM_SEARCH_DATA } from '@/graphql/queries';
import { useConversationTags } from '@/hooks/useConversationTags';
import { conversationMatches, hasSearchTerms, tagToken } from '@/lib/utils/conversationSearch';
import { parseSearchQuery } from '@/utils/parseSearchQuery';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/store';
import { LoadingSpinner } from '../LoadingSpinner';
import { DisplayAvatar } from '@/components/DisplayAvatar';
import { parseAvatarToUrl } from '@/lib/avatar';
import type {
  ChatRoom,
  ChatRoomSearchMessage,
  ConversationPerson,
  ConversationTag,
  GetChatRoomSearchData,
} from '@/types/chat';
import type { GetBuddyListData } from '@/types/buddylist';

type ChatListFilter = 'chats' | 'groups';

interface GetChatRoomsData {
  messageRooms: ChatRoom[];
}

interface ChatListProps {
  search?: string;
  filterType: ChatListFilter;
  /** Sets the panel's search, e.g. to `#tag` when a discussion's tag is clicked (#531) */
  onSearchChange?: (value: string) => void;
}

const isDirectMessage = (room: ChatRoom) =>
  room.messageType === 'USER' && (room.users?.length ?? 0) === 2;

const snippet = (text: string, word: string): string => {
  const at = text.toLowerCase().indexOf(word.toLowerCase());
  if (at <= 30) return text.length > 80 ? `${text.slice(0, 80)}…` : text;
  const start = text.lastIndexOf(' ', at - 20) + 1;
  const body = text.slice(start, start + 80);
  return `…${body}${start + 80 < text.length ? '…' : ''}`;
};

const ChatList: React.FC<ChatListProps> = ({ search = '', filterType, onSearchChange }) => {
  const selectedRoomId = useAppStore((state) => state.chat.selectedRoom);
  const setSelectedChatRoom = useAppStore((state) => state.setSelectedChatRoom);
  const currentUserId = useAppStore((state) => state.user.data?._id);

  const query = useMemo(() => parseSearchQuery(search), [search]);
  const searching = hasSearchTerms(query);

  const { loading, data, refetch } = useQuery<GetChatRoomsData>(GET_CHAT_ROOMS, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 10000,
  });

  // Message text and authors are only needed while searching, so they stay out
  // of the polled room list.
  const { data: searchData } = useQuery<GetChatRoomSearchData>(GET_CHAT_ROOM_SEARCH_DATA, {
    fetchPolicy: 'cache-and-network',
    skip: !searching || (query.keywords.length === 0 && query.usernames.length === 0),
  });
  const { data: buddyData } = useQuery<GetBuddyListData>(GET_BUDDY_LIST, {
    fetchPolicy: 'cache-first',
    skip: !searching || query.usernames.length === 0,
  });

  useEffect(() => {
    refetch();
  }, [refetch]);

  const rooms: ChatRoom[] = useMemo(() => data?.messageRooms ?? [], [data]);

  const filteredRooms = rooms.filter((room) => {
    if (filterType === 'chats') {
      // Direct messages - USER type with 2 users
      return isDirectMessage(room);
    } else if (filterType === 'groups') {
      // Discussions - POST type or more than 2 users
      return room.messageType === 'POST' || (room.users?.length ?? 0) > 2;
    }
    return true;
  });

  const tags = useConversationTags(
    filteredRooms
      .filter((room) => room.messageType === 'POST' && room.postDetails?._id)
      .map((room) => room.postDetails?._id as string)
  );
  const tagFor = (room: ChatRoom): ConversationTag | null =>
    room.postDetails?._id ? tags[room.postDetails._id] ?? null : null;

  const messagesByRoom = useMemo(() => {
    const map = new Map<string, ChatRoomSearchMessage[]>();
    searchData?.messageRooms?.forEach((room) => {
      if (room?._id) map.set(room._id, room.messages ?? []);
    });
    return map;
  }, [searchData]);

  const buddies = useMemo(() => {
    const map = new Map<string, ConversationPerson>();
    buddyData?.getBuddyList?.forEach((entry) => {
      if (entry?.user?._id) map.set(entry.user._id, entry.user);
    });
    return map;
  }, [buddyData]);

  const peopleIn = (room: ChatRoom, messages: ChatRoomSearchMessage[]): ConversationPerson[] => {
    const people: ConversationPerson[] = [];
    // A direct message's title is the other person's name.
    if (isDirectMessage(room) && room.title) people.push({ name: room.title });
    room.users?.forEach((id) => {
      const person = buddies.get(String(id));
      if (person && String(id) !== currentUserId) people.push(person);
    });
    messages.forEach((message) => {
      if (message.user && message.user._id !== currentUserId) people.push(message.user);
    });
    return people;
  };

  // Filter by search: text in the title, post or messages, @person and #tag (#531)
  const matchedMessage = new Map<string, string>();
  const searchFiltered = searching
    ? filteredRooms.filter((room) => {
      const messages = messagesByRoom.get(room._id) ?? [];
      const texts = messages.map((m) => m.text || '').filter(Boolean);
      const matches = conversationMatches(room, query, {
        messages: texts,
        people: peopleIn(room, messages),
        tag: tagFor(room),
      });
      if (matches && query.keywords.length > 0) {
        const word = query.keywords[0];
        const hit = texts.find((t) => t.toLowerCase().includes(word.toLowerCase()));
        if (hit) matchedMessage.set(room._id, snippet(hit, word));
      }
      return matches;
    })
    : filteredRooms;

  if (loading && !data) return <LoadingSpinner size={50} />;

  // Sort by last message time (most recent first), fallback to lastActivity, then created
  const sortedRooms = [...searchFiltered].sort((a, b) => {
    const aTime = a.lastMessageTime
      ? new Date(a.lastMessageTime).getTime()
      : a.lastActivity
        ? new Date(a.lastActivity).getTime()
        : new Date(a.created).getTime();
    const bTime = b.lastMessageTime
      ? new Date(b.lastMessageTime).getTime()
      : b.lastActivity
        ? new Date(b.lastActivity).getTime()
        : new Date(b.created).getTime();
    return bTime - aTime;
  });

  const handleRoomClick = (room: ChatRoom) => {
    setSelectedChatRoom(room._id);
  };

  const resolveAvatar = (raw: ChatRoom['avatar']): string | null =>
    parseAvatarToUrl(raw as string | Record<string, unknown> | undefined) || null;

  const getRoomDisplayInfo = (room: ChatRoom) => {
    if (isDirectMessage(room)) {
      return {
        name: room.title || 'Direct Message',
        avatar: resolveAvatar(room.avatar),
        subtitle: 'Direct message',
      };
    } else if (room.messageType === 'POST') {
      const postTitle = room.postDetails?.title || room.title || 'Quote Discussion';
      const postText = room.postDetails?.text || '';
      const preview = postText.length > 80 ? `${postText.substring(0, 80)}…` : postText;
      return {
        name: postTitle,
        avatar: resolveAvatar(room.avatar),
        subtitle: preview || 'Discussion',
      };
    } else {
      return {
        name: room.title || 'Discussion',
        avatar: resolveAvatar(room.avatar),
        subtitle: `${room.users?.length || 0} members`,
      };
    }
  };

  const noun = filterType === 'chats' ? 'chats' : 'discussions';

  if (sortedRooms.length === 0) {
    return (
      <div
        className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center text-muted-foreground"
        data-testid={searching ? "chat-empty-search-state" : undefined}
      >
        <div className="mb-4 rounded-full bg-muted p-3">
          {searching ? <SearchX className="h-8 w-8" aria-hidden="true" /> : <MessageCircle className="h-8 w-8" aria-hidden="true" />}
        </div>
        <h3 className="mb-2 text-lg font-semibold text-foreground">
          {searching ? `No ${noun} match “${search.trim()}”` : `No ${noun} yet`}
        </h3>
        <p className="max-w-sm text-sm">
          {searching
            ? 'Try other words, @name for a person or #tag for a tag.'
            : filterType === 'chats'
              ? 'Open a buddy from the Buddies tab to start a conversation.'
              : 'Discussions on posts you write or comment on show up here.'}
        </p>
        {searching && onSearchChange && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="mt-4 inline-flex min-h-9 items-center rounded-md border border-[#8a8a93] px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52b274] dark:border-[#6e7681]"
          >
            Clear search
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto py-2 pr-1" data-testid="discussion-list">
      {searching && (
        <p className="sr-only" role="status">
          {`${sortedRooms.length} ${sortedRooms.length === 1 ? noun.replace(/s$/, '') : noun} found`}
        </p>
      )}
      <ul className="flex flex-col gap-2 px-2">
        {sortedRooms.map((room) => {
          const displayInfo = getRoomDisplayInfo(room);
          const isSelected = typeof selectedRoomId === 'string' && selectedRoomId === room._id;
          const tag = tagFor(room);
          const unread = room.unreadMessages ?? 0;
          const subtitle = matchedMessage.get(room._id) ?? displayInfo.subtitle;

          return (
            <li key={room._id} data-testid={searching ? "chat-search-result" : undefined}>
              <div
                className={cn(
                  'rounded-2xl border border-transparent bg-background shadow-sm transition-colors hover:border-[#52b274]/40 hover:bg-[#52b274]/5 dark:hover:bg-[#52b274]/10',
                  isSelected && 'border-[#2f7a4c] bg-[#52b274]/10 shadow-md dark:border-[#7fdc9c]'
                )}
              >
                <button
                  type="button"
                  onClick={() => handleRoomClick(room)}
                  data-testid="discussion-thread"
                  aria-current={isSelected ? 'true' : undefined}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#52b274]"
                >
                  <DisplayAvatar
                    avatar={displayInfo.avatar}
                    username={displayInfo.name || ''}
                    size={48}
                    className="ring-2 ring-white dark:ring-background shadow-sm"
                  />

                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-foreground">
                      {displayInfo.name}
                    </span>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                      {subtitle}
                    </p>
                  </div>

                  {unread > 0 && (
                    <div className="ml-2 flex h-6 min-w-[1.75rem] items-center justify-center rounded-full bg-[#2f7a4c] px-1.5 text-[11px] font-bold text-white shadow-md">
                      {unread > 99 ? '99+' : unread}
                      <span className="sr-only"> unread</span>
                    </div>
                  )}
                </button>

                {/* The post's tag replaces the generic "Group" label; it filters the list (#531). */}
                {tag && (
                  <div className="-mt-1.5 flex pb-2.5 pl-[72px] pr-3">
                    <button
                      type="button"
                      data-testid="discussion-tag"
                      onClick={() => onSearchChange?.(`#${tagToken(tag.title)}`)}
                      aria-label={`Show discussions tagged #${tag.title}`}
                      title={`Show discussions tagged #${tag.title}`}
                      className="inline-flex min-h-7 max-w-full items-center gap-0.5 rounded-full border border-[#52b274]/40 bg-[#52b274]/10 px-2.5 text-xs font-semibold text-[#2f6f4a] transition-colors hover:bg-[#52b274]/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#52b274] focus-visible:ring-offset-1 dark:text-[#7fdc9c]"
                    >
                      <Hash className="h-3 w-3 shrink-0" aria-hidden="true" />
                      <span className="truncate">{tag.title}</span>
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ChatList;
