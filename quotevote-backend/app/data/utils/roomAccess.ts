import type { RoomAccessInput } from '~/types/roomAccess';
import { RoomAccessDeniedError, RoomNotFoundError } from '~/types/roomAccess';

/**
 * The one room-access rule: POST rooms are open to everyone who can reach
 * them, USER and SYSTEM rooms require membership.
 */
export function canAccessRoom(room: RoomAccessInput, userId: string | null): boolean {
  if (room.messageType === 'POST') return true;
  return userId !== null && room.userIds.includes(userId);
}

export function assertRoomAccess(room: RoomAccessInput | null, userId: string | null): void {
  if (!room) {
    throw new RoomNotFoundError();
  }
  if (!canAccessRoom(room, userId)) {
    throw new RoomAccessDeniedError();
  }
}
