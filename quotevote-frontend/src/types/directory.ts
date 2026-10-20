/**
 * Types for the home page's search, Filters and Date range controls (#515).
 */

export type DirectorySort = "latest" | "popular";

/** A public tag (group) offered as a topic in search suggestions and Filters. */
export interface DirectoryTopic {
  _id: string;
  title: string;
}

export interface DirectorySearchProps {
  value: string;
  onChange: (value: string) => void;
  /** Runs the search for what is typed (Enter without a highlighted topic). */
  onSubmit: (value: string) => void;
  topics: DirectoryTopic[];
  onSelectTopic: (topic: DirectoryTopic) => void;
}

export interface DirectoryFiltersPanelProps {
  sort: DirectorySort;
  onSortChange: (sort: DirectorySort) => void;
  /** Only offered to signed-in users. */
  showFollowing: boolean;
  following: boolean;
  onFollowingChange: (following: boolean) => void;
  topics: DirectoryTopic[];
  topicId: string;
  onTopicChange: (topicId: string) => void;
  onClear: () => void;
  onDone: () => void;
}

export interface ActiveFilter {
  key: string;
  label: string;
  value: string;
  onRemove: () => void;
}

export interface ActiveFiltersProps {
  filters: ActiveFilter[];
  /** Shown when two or more filters are on. */
  onClearAll?: () => void;
}
