/**
 * PostUnavailable (#532): the state shown for a deleted or missing post.
 */

import { render, screen, resetStore } from "../../utils/test-utils";
import userEvent from "@testing-library/user-event";
import PostUnavailable from "@/components/Post/PostUnavailable";
import { useAppStore } from "@/store";

let mockSearch = "";
jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

function signIn() {
  useAppStore.setState((s) => ({ user: { ...s.user, data: { _id: "user-1", username: "alice" } } }));
}

describe("PostUnavailable (#532)", () => {
  beforeEach(() => {
    resetStore();
    mockSearch = "";
  });

  it("says the post has been deleted when a notification links here", () => {
    mockSearch = "deleted=1";
    signIn();
    render(<PostUnavailable />);

    expect(
      screen.getByRole("heading", { level: 1, name: "This post has been deleted." })
    ).toBeInTheDocument();
    expect(screen.queryByText(/not found/i)).not.toBeInTheDocument();
  });

  it("reopens the Notifications panel from Back to notifications", async () => {
    mockSearch = "deleted=1";
    signIn();
    render(<PostUnavailable />);

    await userEvent.setup().click(screen.getByRole("button", { name: "Back to notifications" }));
    expect(useAppStore.getState().ui.notificationsOpen).toBe(true);
  });

  it("always offers a way home", () => {
    mockSearch = "deleted=1";
    signIn();
    render(<PostUnavailable />);
    expect(screen.getByRole("link", { name: /go to home/i })).toHaveAttribute("href", "/");
  });

  it("uses a neutral message for a link that isn't known to be deleted", () => {
    signIn();
    render(<PostUnavailable />);

    expect(
      screen.getByRole("heading", { level: 1, name: "This post isn’t available." })
    ).toBeInTheDocument();
    expect(screen.getByText(/may have been deleted, or the link may be wrong/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back to notifications" })).not.toBeInTheDocument();
  });

  it("doesn't offer Notifications to a signed-out visitor", () => {
    mockSearch = "deleted=1";
    render(<PostUnavailable />);

    expect(screen.getByText("This post has been deleted.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back to notifications" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /go to home/i })).toBeInTheDocument();
  });
});
