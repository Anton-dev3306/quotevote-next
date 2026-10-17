/**
 * Post selection actions (issue #529)
 * How Post wires the selection popup: Quote stages the passage for the Discussion composer,
 * and votes are cast on the selected passage (one vote per post, switched or retracted in place).
 */

import { render, screen, fireEvent, waitFor } from "@/__tests__/utils/test-utils";
import Post from "@/components/Post/Post";
import { CombinedGraphQLErrors } from "@apollo/client/errors";
import { DELETE_VOTE, VOTE } from "@/graphql/mutations";
import type { PostProps } from "@/types/post";
import type { SelectedText, VotingPopupProps } from "@/types/voting";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));

const mockSetPendingQuote = jest.fn();
jest.mock("@/store", () => ({
  useAppStore: (selector: (state: unknown) => unknown) =>
    selector({
      ui: { linkedPassage: null, mobileDiscussionOpen: false },
      setPendingQuote: mockSetPendingQuote,
    }),
}));

const mockGuestGuard = jest.fn(() => true);
jest.mock("@/hooks/useGuestGuard", () => ({
  __esModule: true,
  default: () => mockGuestGuard,
}));

const mockAddVote = jest.fn();
const mockRemoveVote = jest.fn();
jest.mock("@apollo/client/react", () => ({
  ...jest.requireActual("@apollo/client/react"),
  useQuery: () => ({ data: undefined, loading: false, error: undefined }),
  useMutation: (mutation: unknown) => {
    if (mutation === VOTE) return [mockAddVote, { loading: false }];
    if (mutation === DELETE_VOTE) return [mockRemoveVote, { loading: false }];
    return [jest.fn(), { loading: false }];
  },
}));

const mockToastError = jest.fn();
const mockToastSuccess = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

type ToastOptions = { action?: { label: string; onClick: () => void } };
const lastToastOptions = (): ToastOptions | undefined =>
  mockToastSuccess.mock.calls.at(-1)?.[1] as ToastOptions | undefined;

const SELECTION: SelectedText = {
  startIndex: 5,
  endIndex: 20,
  text: "is a test post",
  points: 0,
};

const mockDismiss = jest.fn();
jest.mock("@/components/VotingComponents/VotingBoard", () => ({
  __esModule: true,
  default: ({
    children,
  }: {
    children?: (selection: SelectedText, controls: { dismiss: () => void }) => React.ReactNode;
  }) => <div data-testid="voting-board">{children?.(SELECTION, { dismiss: mockDismiss })}</div>,
}));

jest.mock("@/components/VotingComponents/VotingPopup", () => ({
  __esModule: true,
  default: ({
    onQuote,
    onVote,
    onRemoveVote,
    onDismiss,
    selectedText,
    userVotes,
  }: VotingPopupProps) => (
    <div
      data-testid="popup-stub"
      data-user-votes={userVotes.map((v) => `${v._id}:${v.type}:${v.tags}`).join(",")}
    >
      <button type="button" onClick={() => onQuote(selectedText)}>
        stub-quote
      </button>
      <button type="button" onClick={() => onVote({ type: "up", tags: "#like" })}>
        stub-like
      </button>
      <button type="button" onClick={() => onVote({ type: "up", tags: "#agree" })}>
        stub-agree
      </button>
      <button type="button" onClick={() => onVote({ type: "down", tags: "#disagree" })}>
        stub-disagree
      </button>
      <button type="button" onClick={() => onRemoveVote("v-old")}>
        stub-remove
      </button>
      <button type="button" onClick={() => onDismiss?.()}>
        stub-dismiss
      </button>
    </div>
  ),
}));

jest.mock("@/components/DisplayAvatar", () => ({ DisplayAvatar: () => <div /> }));
jest.mock("@/components/CustomButtons/FollowButton", () => ({ FollowButton: () => null }));
jest.mock("@/components/CustomButtons/BookmarkIconButton", () => ({
  BookmarkIconButton: () => null,
}));

const basePost = {
  _id: "post1",
  userId: "author1",
  created: "2024-01-15T10:30:00Z",
  title: "Test Post",
  text: "This is a test post content.",
  url: "/post/qa/test-post/post1",
  creator: { _id: "author1", username: "author", name: "Author" },
  votes: [],
  comments: [],
  quotes: [],
  approvedBy: [],
  rejectedBy: [],
};

const user = { _id: "me", admin: false, _followingId: [] };

function renderPost(overrides: Partial<PostProps> = {}, votes: PostProps["post"]["votes"] = []) {
  const props: PostProps = {
    post: { ...basePost, votes },
    user,
    onOpenDiscussion: jest.fn(),
    ...overrides,
  };
  render(<Post {...props} />);
  return props;
}

describe("Post selection actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGuestGuard.mockReturnValue(true);
    mockAddVote.mockResolvedValue({ data: { addVote: { _id: "v-new" } } });
    mockRemoveVote.mockResolvedValue({ data: { deleteVote: { _id: "v-old" } } });
  });

  it("stages the selected passage for the Discussion composer and opens Discussion on Quote", async () => {
    const props = renderPost();

    fireEvent.click(await screen.findByText("stub-quote"));

    expect(mockSetPendingQuote).toHaveBeenCalledWith({
      postId: "post1",
      text: "is a test post",
      startIndex: 5,
      endIndex: 20,
    });
    expect(props.onOpenDiscussion).toHaveBeenCalledTimes(1);
  });

  it("asks guests to sign in instead of staging a quote", async () => {
    mockGuestGuard.mockReturnValue(false);
    const props = renderPost();

    fireEvent.click(await screen.findByText("stub-quote"));

    expect(mockSetPendingQuote).not.toHaveBeenCalled();
    expect(props.onOpenDiscussion).not.toHaveBeenCalled();
  });

  it("casts the vote on the selected passage", async () => {
    renderPost();

    fireEvent.click(await screen.findByText("stub-agree"));

    await waitFor(() => expect(mockAddVote).toHaveBeenCalledTimes(1));
    expect(mockAddVote).toHaveBeenCalledWith({
      variables: {
        vote: {
          content: "is a test post",
          postId: "post1",
          userId: "me",
          type: "up",
          tags: "#agree",
          startWordIndex: 5,
          endWordIndex: 20,
        },
      },
    });
    expect(mockRemoveVote).not.toHaveBeenCalled();
  });

  // The API returns tags as a String even though PostVote types it as string[].
  const vote = (id: string, type: string, tags: string, owner = "me", start = 5, end = 20) => ({
    _id: id,
    type,
    tags: tags as unknown as string[],
    startWordIndex: start,
    endWordIndex: end,
    user: { _id: owner },
  });

  it("passes only the user's votes on the selected passage to the popup", async () => {
    renderPost({}, [
      vote("v-true", "up", "#true"),
      vote("v-like", "up", "#like"),
      vote("v-other-passage", "up", "#agree", "me", 30, 40),
      vote("v-other-user", "down", "#false", "someone-else"),
    ]);

    expect(await screen.findByTestId("popup-stub")).toHaveAttribute(
      "data-user-votes",
      "v-true:up:#true,v-like:up:#like"
    );
  });

  it("adds a response in another pair without removing the existing ones", async () => {
    renderPost({}, [vote("v-true", "up", "#true")]);

    fireEvent.click(await screen.findByText("stub-like"));

    await waitFor(() => expect(mockAddVote).toHaveBeenCalledTimes(1));
    expect(mockAddVote.mock.calls[0][0].variables.vote.tags).toBe("#like");
    expect(mockRemoveVote).not.toHaveBeenCalled();
  });

  it("replaces the other side of the same pair on this passage", async () => {
    renderPost({}, [vote("v-agree", "up", "#agree"), vote("v-like", "up", "#like")]);

    fireEvent.click(await screen.findByText("stub-disagree"));

    await waitFor(() => expect(mockAddVote).toHaveBeenCalledTimes(1));
    expect(mockRemoveVote).toHaveBeenCalledTimes(1);
    expect(mockRemoveVote).toHaveBeenCalledWith({ variables: { voteId: "v-agree" } });
    expect(mockRemoveVote.mock.invocationCallOrder[0]).toBeLessThan(
      mockAddVote.mock.invocationCallOrder[0]
    );
    expect(mockAddVote.mock.calls[0][0].variables.vote.tags).toBe("#disagree");
  });

  it("leaves votes on other passages alone", async () => {
    renderPost({}, [vote("v-agree-elsewhere", "up", "#agree", "me", 30, 40)]);

    fireEvent.click(await screen.findByText("stub-disagree"));

    await waitFor(() => expect(mockAddVote).toHaveBeenCalledTimes(1));
    expect(mockRemoveVote).not.toHaveBeenCalled();
  });

  it("removes a single vote by id", async () => {
    renderPost({}, [vote("v-old", "up", "#true")]);

    fireEvent.click(await screen.findByText("stub-remove"));

    await waitFor(() =>
      expect(mockRemoveVote).toHaveBeenCalledWith({ variables: { voteId: "v-old" } })
    );
    expect(mockAddVote).not.toHaveBeenCalled();
  });

  it("leaves GraphQL errors to the global error toast", async () => {
    mockAddVote.mockRejectedValueOnce(
      new CombinedGraphQLErrors({
        errors: [{ message: "Error: You have already voted on this post" }],
      })
    );
    renderPost({}, [vote("v-true", "up", "#true")]);

    fireEvent.click(await screen.findByText("stub-like"));

    await waitFor(() => expect(mockAddVote).toHaveBeenCalledTimes(1));
    expect(mockToastError).not.toHaveBeenCalled();
  });

  it("reports other vote failures itself", async () => {
    mockAddVote.mockRejectedValueOnce(new Error("socket hang up"));
    renderPost();

    fireEvent.click(await screen.findByText("stub-like"));

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith("Vote error: socket hang up"));
  });

  it("confirms the vote with an Undo that removes it", async () => {
    renderPost();

    fireEvent.click(await screen.findByText("stub-agree"));

    await waitFor(() =>
      expect(mockToastSuccess).toHaveBeenCalledWith("Vote saved: Agree", expect.anything())
    );
    const action = lastToastOptions()?.action;
    expect(action?.label).toBe("Undo");

    action?.onClick();

    await waitFor(() => expect(mockToastSuccess).toHaveBeenLastCalledWith("Vote undone"));
    expect(mockRemoveVote).toHaveBeenCalledWith({ variables: { voteId: "v-new" } });
    expect(mockAddVote).toHaveBeenCalledTimes(1);
  });

  it("puts the replaced response back when the vote is undone", async () => {
    renderPost({}, [vote("v-agree", "up", "#agree")]);

    fireEvent.click(await screen.findByText("stub-disagree"));
    await waitFor(() => expect(lastToastOptions()?.action?.label).toBe("Undo"));

    lastToastOptions()?.action?.onClick();

    await waitFor(() =>
      expect(mockToastSuccess).toHaveBeenLastCalledWith("Vote undone, Agree is back")
    );
    expect(mockRemoveVote).toHaveBeenLastCalledWith({ variables: { voteId: "v-new" } });
    expect(mockAddVote).toHaveBeenCalledTimes(2);
    expect(mockAddVote.mock.calls[1][0].variables.vote).toMatchObject({
      type: "up",
      tags: "#agree",
      startWordIndex: 5,
      endWordIndex: 20,
    });
  });

  it("leaves out Undo when the API doesn't return the new vote's id", async () => {
    mockAddVote.mockResolvedValueOnce({ data: { addVote: { _id: null } } });
    renderPost();

    fireEvent.click(await screen.findByText("stub-agree"));

    await waitFor(() =>
      expect(mockToastSuccess).toHaveBeenCalledWith("Vote saved: Agree", expect.anything())
    );
    expect(lastToastOptions()?.action).toBeUndefined();
  });

  it("reports a failed undo", async () => {
    renderPost();
    fireEvent.click(await screen.findByText("stub-agree"));
    await waitFor(() => expect(lastToastOptions()?.action?.label).toBe("Undo"));
    mockRemoveVote.mockRejectedValueOnce(new Error("socket hang up"));

    lastToastOptions()?.action?.onClick();

    await waitFor(() =>
      expect(mockToastError).toHaveBeenCalledWith("Couldn't undo the vote: socket hang up")
    );
  });

  it("gives the popup VotingBoard's dismiss control", async () => {
    renderPost();

    fireEvent.click(await screen.findByText("stub-dismiss"));

    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });
});
