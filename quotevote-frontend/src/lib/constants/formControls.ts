/**
 * Shared control styling for the Edit Profile and Settings forms (#536).
 *
 * The default input border token (#e4e4e7) is about 1.2:1 on a white card, so
 * a field's edge is hard to see. These borders read at 3:1 or better in both
 * themes, and the focus state switches to a dark green border plus a ring.
 */
export const FORM_FIELD_CLASS =
  "border-[#8a8a93] dark:border-[#6e7681] focus-visible:border-[#2f7a4c] focus-visible:ring-[#52b274]/40 dark:focus-visible:border-[#7fdc9c]";

/** Visible keyboard focus for buttons and links on these pages, 3:1 or better in both themes. */
export const FOCUS_RING_CLASS =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2f7a4c] focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:focus-visible:ring-[#7fdc9c]";

/** White on the brand green is 2.6:1; this darker green keeps button text readable (5.2:1). */
export const PRIMARY_ACTION_CLASS = "bg-[#2f7a4c] text-white hover:bg-[#276640]";

/**
 * Switch track colors that read at 3:1 against the card: the default "off"
 * track (#e4e4e7) and the brand-green "on" track (2.6:1) are both too faint.
 */
export const SWITCH_CLASS =
  "data-[state=unchecked]:bg-[#8a8a93] data-[state=checked]:bg-[#2f7a4c] dark:data-[state=unchecked]:bg-[#6e7681] dark:data-[state=checked]:bg-[#2f7a4c]";

/**
 * Error text for these forms. The theme's destructive red (#f55145) is about
 * 3.4:1 on white; these reds are 5.6:1 (light) and 6.2:1 (dark).
 */
export const FORM_ERROR_TEXT_CLASS = "text-[#c62828] dark:text-[#ff6b6b]";

/** A field label turns red with its error; same readable reds as the message. */
export const FORM_LABEL_CLASS =
  "data-[error=true]:text-[#c62828] dark:data-[error=true]:text-[#ff6b6b]";
