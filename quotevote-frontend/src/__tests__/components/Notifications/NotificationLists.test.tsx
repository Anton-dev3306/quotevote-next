/**
 * NotificationLists navigation (#532): deleted posts get an explicit state, and the
 * panel can close itself after a notification is opened.
 */

import { render, screen } from "@/__tests__/utils/test-utils";
import userEvent from "@testing-library/user-event";
import { NotificationLists } from "@/components/Notifications/NotificationLists";
import type { Notification } from "@/types/notification";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));
jest.mock("@/hooks/useGuestGuard", () => ({
  __esModule: true,
  default: () => () => true,
}));

const base = {
  userId: "alice-id",
  userIdBy: "bob-id",
  userBy: { _id: "bob-id", name: "Bob Local", username: "bob" },
  status: "new",
  created: new Date().toISOString(),
};

const commentOnLivePost: Notification = {
  ...base,
  _id: "n-live",
  label: "Nice point",
  notificationType: "COMMENTED",
  post: { _id: "post-live", url: "/post/qa/live/post-live", deleted: false },
};

const commentOnDeletedPost: Notification = {
  ...base,
  _id: "n-deleted",
  label: "Commenting before it goes away",
  notificationType: "COMMENTED",
  post: { _id: "post-gone", url: "/post/qa/gone/post-gone", deleted: true },
};

const follow: Notification = {
  ...base,
  _id: "n-follow",
  label: "",
  notificationType: "FOLLOW",
};

describe("NotificationLists (#532)", () => {
  beforeEach(() => jest.clearAllMocks());

  it("marks a notification whose post was deleted", () => {
    render(<NotificationLists notifications={[commentOnLivePost, commentOnDeletedPost]} pageView />);
    expect(screen.getAllByText("This post has been deleted")).toHaveLength(1);
  });

  it("opens a deleted post with the deleted flag so the page can explain it", async () => {
    const onNavigate = jest.fn();
    render(
      <NotificationLists notifications={[commentOnDeletedPost]} pageView onNavigate={onNavigate} />
    );

    await userEvent.setup().click(screen.getByText(/commented on your post/));
    expect(mockPush).toHaveBeenCalledWith("/post/qa/gone/post-gone?deleted=1");
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("opens a live post as before and reports the navigation", async () => {
    const onNavigate = jest.fn();
    render(
      <NotificationLists notifications={[commentOnLivePost]} pageView onNavigate={onNavigate} />
    );

    await userEvent.setup().click(screen.getByText(/commented on your post/));
    expect(mockPush).toHaveBeenCalledWith("/post/qa/live/post-live");
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("opens the follower's profile for a follow, from the keyboard too", async () => {
    const onNavigate = jest.fn();
    render(<NotificationLists notifications={[follow]} pageView onNavigate={onNavigate} />);

    screen.getByRole("button", { name: /started following you/ }).focus();
    await userEvent.setup().keyboard("{Enter}");
    expect(mockPush).toHaveBeenCalledWith("/profile/bob");
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("doesn't nest a second scroll area in the panel", () => {
    const many = Array.from({ length: 6 }, (_, i) => ({ ...commentOnLivePost, _id: `n-${i}` }));
    const { container } = render(<NotificationLists notifications={many} pageView />);
    expect(container.querySelector(".max-h-\\[75vh\\]")).toBeNull();
  });
});
