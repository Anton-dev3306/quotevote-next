"use client";

import type { PresenceIconProps } from '@/types/chat';
import { PRESENCE_DOT_CLASS } from '@/lib/constants/presence';

const PresenceIcon = ({ status, className }: PresenceIconProps) => {
  const classes = PRESENCE_DOT_CLASS[status] ?? PRESENCE_DOT_CLASS.offline;

  return (
    <span
      className={`inline-block h-3 w-3 shrink-0 rounded-full ${classes} ${className ?? ''}`.trim()}
      aria-hidden="true"
    />
  );
};

export default PresenceIcon;
