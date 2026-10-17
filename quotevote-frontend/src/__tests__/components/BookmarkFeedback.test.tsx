/**
 * Bookmark feedback (issue #535): the saved state is visible and each toggle is confirmed.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { BookmarkIconButton } from "@/components/CustomButtons/BookmarkIconButton";
import { UPDATE_POST_BOOKMARK } from "@/graphql/mutations";
import type { BookmarkIconButtonProps } from "@/types/components";

const mockUpdateBookmark = jest.fn();
const mockCreateRoom = jest.fn();
jest.mock("@apollo/client/react", () => ({
  useMutation: (mutation: unknown) =>
    mutation === UPDATE_POST_BOOKMARK ? [mockUpdateBookmark] : [mockCreateRoom],
}));

jest.mock("@/hooks/useGuestGuard", () => ({
  __esModule: true,
  default: () => () => true,
}));

const mockToastSuccess = jest.fn();
jest.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => mockToastSuccess(...a) } }));

const user = { _id: "me" } as BookmarkIconButtonProps["user"];
const post = (bookmarkedBy: string[]) =>
  ({ _id: "post1", bookmarkedBy }) as unknown as BookmarkIconButtonProps["post"];

describe("BookmarkIconButton feedback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateBookmark.mockResolvedValue({ data: {} });
    mockCreateRoom.mockResolvedValue({ data: {} });
  });

  it("confirms a new bookmark", async () => {
    render(<BookmarkIconButton post={post([])} user={user} />);

    fireEvent.click(screen.getByRole("button", { name: "Save post" }));

    await waitFor(() => expect(mockToastSuccess).toHaveBeenCalledWith("Post saved"));
  });

  it("confirms a removed bookmark", async () => {
    render(<BookmarkIconButton post={post(["me"])} user={user} />);

    fireEvent.click(screen.getByRole("button", { name: "Remove saved post" }));

    await waitFor(() =>
      expect(mockToastSuccess).toHaveBeenCalledWith("Removed from your saved posts")
    );
  });

  it("says nothing when the bookmark fails", async () => {
    mockUpdateBookmark.mockRejectedValueOnce(new Error("network"));
    render(<BookmarkIconButton post={post([])} user={user} />);

    fireEvent.click(screen.getByRole("button", { name: "Save post" }));

    await waitFor(() => expect(mockUpdateBookmark).toHaveBeenCalled());
    expect(mockToastSuccess).not.toHaveBeenCalled();
    expect(mockCreateRoom).not.toHaveBeenCalled();
  });

  it("shows the saved state on the labelled button", () => {
    render(<BookmarkIconButton post={post(["me"])} user={user} showLabel />);

    const button = screen.getByRole("button", { name: "Remove saved post" });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveTextContent("Saved");
  });

  it("marks the icon button as pressed once saved", () => {
    render(<BookmarkIconButton post={post(["me"])} user={user} />);

    expect(screen.getByRole("button", { name: "Remove saved post" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });
});
