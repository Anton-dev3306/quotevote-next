/**
 * PaginatedActivityList states (#536): profile activity empty, filtered-empty,
 * error with a working Try again, and loading.
 */

import { ServerError } from "@apollo/client/errors";
import { fireEvent, render, screen } from "../../utils/test-utils";
import { PaginatedActivityList } from "@/components/Activity/PaginatedActivityList";
import { GET_TOP_POSTS, GET_USER_ACTIVITY } from "@/graphql/queries";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/profile/testuser",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock both pagination hooks (PaginatedList uses usePagination)
jest.mock("@/hooks/usePagination", () => {
  const hook = () => ({
    currentPage: 1,
    pageSize: 15,
    handlePageChange: jest.fn(),
    handlePageSizeChange: jest.fn(),
    resetToFirstPage: jest.fn(),
    calculatePagination: jest.fn((total: number) => ({
      currentPage: 1,
      totalPages: Math.max(1, Math.ceil(total / 15)),
      pageSize: 15,
      totalCount: total,
      hasNextPage: false,
      hasPreviousPage: false,
    })),
  });
  return { usePaginationWithFilters: jest.fn(hook), usePagination: jest.fn(hook) };
});

jest.mock("@/store", () => ({
  useAppStore: (selector: (state: unknown) => unknown) =>
    selector({ ui: { hiddenPosts: [] }, user: { data: { _id: "user-1" } } }),
}));

const mockOpenAuthModal = jest.fn();
jest.mock("@/context/AuthModalContext", () => ({
  ...jest.requireActual("@/context/AuthModalContext"),
  useAuthModal: () => ({ openAuthModal: mockOpenAuthModal }),
}));

const mockUseQuery = jest.fn();
jest.mock("@apollo/client/react", () => ({
  ...jest.requireActual("@apollo/client/react"),
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: () => [jest.fn(), { loading: false }],
}));

const emptyResult = {
  data: { activities: { entities: [], pagination: { total_count: 0, limit: 15, offset: 0 } } },
  loading: false,
  error: undefined,
  refetch: jest.fn(),
};

describe("PaginatedActivityList (#536)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("says there is no activity yet when nothing is filtered", () => {
    mockUseQuery.mockReturnValue(emptyResult);
    render(<PaginatedActivityList userId="user-1" activityEvent={[]} />);
    const empty = screen.getByTestId("activity-empty");
    expect(empty).toHaveTextContent("No activity yet");
    expect(screen.queryByRole("button", { name: "Show all activity" })).not.toBeInTheDocument();
  });

  it('offers "Show all activity" when filters hide everything', () => {
    mockUseQuery.mockReturnValue(emptyResult);
    const onClearFilters = jest.fn();
    render(
      <PaginatedActivityList
        userId="user-1"
        activityEvent={["QUOTED"]}
        onClearFilters={onClearFilters}
      />
    );
    expect(screen.getByTestId("activity-empty")).toHaveTextContent("Try another filter.");
    fireEvent.click(screen.getByRole("button", { name: "Show all activity" }));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });

  it("Try again refetches with no arguments (not the click event)", () => {
    const refetch = jest.fn();
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: false,
      error: new Error("Network error"),
      refetch,
    });
    render(<PaginatedActivityList userId="user-1" activityEvent={[]} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Activity couldn't load");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(refetch).toHaveBeenCalledWith();
  });

  it("announces loading", () => {
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: true,
      error: undefined,
      refetch: jest.fn(),
    });
    render(<PaginatedActivityList userId="user-1" activityEvent={[]} />);
    expect(screen.getByTestId("activity-loading")).toHaveTextContent("Loading activity…");
  });
});

describe("PaginatedActivityList page count", () => {
  beforeEach(() => jest.clearAllMocks());

  it("shows the page links when there is more than one page of activity", () => {
    mockUseQuery.mockReturnValue({
      ...emptyResult,
      data: { activities: { entities: [], pagination: { total_count: 40, limit: 15, offset: 0 } } },
    });
    render(<PaginatedActivityList userId="user-1" activityEvent={[]} />);
    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeInTheDocument();
  });
});

// The legacy API refuses a guest with HTTP 400 and the errors in the body.
const legacySignInError = () =>
  new ServerError("Response not successful: Received status code 400", {
    response: { status: 400 } as Response,
    bodyText: JSON.stringify({
      errors: [{ message: "Auth token not found", extensions: { code: "UNAUTHENTICATED" } }],
    }),
  });

const post = {
  _id: "post-1",
  userId: "author-1",
  created: "2026-10-21T17:08:16.664Z",
  title: "A public post",
  text: "Careful reading before voting.",
  url: "/post/tag/a-public-post/post-1",
  upvotes: 1,
  downvotes: 0,
  bookmarkedBy: [],
  creator: { _id: "author-1", name: "Alice", username: "alice", avatar: null },
  votes: [{ _id: "v1" }],
  comments: [],
  quotes: [],
  messageRoom: null,
};

function mockGuestQueries(activityError: unknown) {
  mockUseQuery.mockImplementation((doc: unknown, options: { skip?: boolean }) => {
    if (doc === GET_USER_ACTIVITY) {
      return options?.skip
        ? { ...emptyResult, data: undefined }
        : { data: undefined, loading: false, error: activityError, refetch: jest.fn() };
    }
    if (doc === GET_TOP_POSTS) {
      return {
        data: { posts: { entities: [post], pagination: { total_count: 1, limit: 15, offset: 0 } } },
        loading: false,
        error: undefined,
        refetch: jest.fn(),
      };
    }
    return emptyResult;
  });
}

const activityCalls = () =>
  mockUseQuery.mock.calls.filter(
    ([doc, options]) => doc === GET_USER_ACTIVITY && !(options as { skip?: boolean }).skip
  );

// These run in order: after the first refusal the list remembers, for the session,
// that guests get posts, the way it works in the browser.
describe("PaginatedActivityList for signed-out visitors (#620)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("keeps the error state for a guest when the failure is not about signing in", () => {
    mockGuestQueries(new Error("Network error"));
    const onMembersOnlyChange = jest.fn();
    render(
      <PaginatedActivityList
        userId="author-1"
        activityEvent={[]}
        publicFallback
        onMembersOnlyChange={onMembersOnlyChange}
      />
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Activity couldn't load");
    expect(onMembersOnlyChange).toHaveBeenLastCalledWith(false);
  });

  it("does not fall back for a member, even if the API says sign in", () => {
    mockGuestQueries(legacySignInError());
    render(<PaginatedActivityList userId="author-1" activityEvent={[]} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Activity couldn't load");
  });

  it("shows a guest the public posts as activity cards when the API keeps activity for members", () => {
    mockGuestQueries(legacySignInError());
    const onMembersOnlyChange = jest.fn();
    render(
      <PaginatedActivityList
        userId="author-1"
        activityEvent={[]}
        publicFallback
        onMembersOnlyChange={onMembersOnlyChange}
      />
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("article", { name: "posted: A public post" })).toBeInTheDocument();
    expect(onMembersOnlyChange).toHaveBeenLastCalledWith(true);
    expect(mockUseQuery).toHaveBeenCalledWith(
      GET_TOP_POSTS,
      expect.objectContaining({
        variables: expect.objectContaining({ userId: "author-1", limit: 15, offset: 0 }),
      })
    );
  });

  it("goes straight to the posts on the next guest profile, without asking for activity again", () => {
    mockGuestQueries(legacySignInError());
    render(<PaginatedActivityList userId="author-2" activityEvent={[]} publicFallback />);
    expect(activityCalls()).toHaveLength(0);
    expect(screen.getByRole("article", { name: "posted: A public post" })).toBeInTheDocument();
  });

  it("says votes, comments and quotes are for members when a guest filters to them", () => {
    mockGuestQueries(legacySignInError());
    const onClearFilters = jest.fn();
    render(
      <PaginatedActivityList
        userId="author-1"
        activityEvent={["VOTED", "COMMENTED"]}
        publicFallback
        onClearFilters={onClearFilters}
      />
    );
    const state = screen.getByTestId("activity-members-only");
    expect(state).toHaveTextContent("Votes, comments and quotes are for members");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(mockOpenAuthModal).toHaveBeenCalledWith({ view: "login" });
    expect(screen.getByRole("link", { name: "Request an invite" })).toHaveAttribute(
      "href",
      "/auths/request-access"
    );
    fireEvent.click(screen.getByRole("button", { name: "Show posts" }));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });
});
