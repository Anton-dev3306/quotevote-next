/**
 * DashboardSidebars (#532): Profile and Settings no longer repeat Notifications in a
 * left sidebar now that they live in the main navigation.
 */

import { render, screen, resetStore } from "./../utils/test-utils";
import { DashboardSidebars } from "@/components/DashboardSidebars";
import { useAppStore } from "@/store";

jest.mock("@/components/Chat/ChatContent", () => ({
  __esModule: true,
  default: () => <div data-testid="chat-content" />,
}));

describe("DashboardSidebars (#532)", () => {
  beforeEach(() => resetStore());

  it("keeps the messages sidebar and drops the notifications sidebar", () => {
    useAppStore.setState((s) => ({ user: { ...s.user, data: { _id: "alice-id" } } }));
    const { container } = render(<DashboardSidebars />);

    expect(container.querySelector('[data-dashboard-aside="right"]')).toBeInTheDocument();
    expect(container.querySelector('[data-dashboard-aside="left"]')).toBeNull();
    expect(screen.getByTestId("chat-content")).toBeInTheDocument();
    expect(screen.queryByText("Notifications")).not.toBeInTheDocument();
  });

  it("renders nothing when signed out", () => {
    const { container } = render(<DashboardSidebars />);
    expect(container).toBeEmptyDOMElement();
  });
});
