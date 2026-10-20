import { fireEvent, render, screen } from "@/__tests__/utils/test-utils";
import AddBuddyPanel from "@/components/Chat/AddBuddyPanel";

jest.mock("@/components/Chat/UserSearchResults", () => ({
  __esModule: true,
  default: ({ searchQuery }: { searchQuery: string }) => (
    <div data-testid="user-search-results" data-query={searchQuery} />
  ),
}));

describe("AddBuddyPanel (#531)", () => {
  it("has its own labelled field, focused on open", () => {
    render(<AddBuddyPanel onBack={jest.fn()} />);
    const field = screen.getByLabelText("Find people");
    expect(field).toHaveFocus();
    expect(field).toHaveAccessibleDescription(
      "They get a buddy request, and join your Buddies list once they accept."
    );
    expect(screen.getByRole("region", { name: "Add a buddy" })).toBeInTheDocument();
  });

  it("searches people with what is typed, trimmed", () => {
    render(<AddBuddyPanel onBack={jest.fn()} />);
    fireEvent.change(screen.getByLabelText("Find people"), { target: { value: " alice " } });
    expect(screen.getByTestId("user-search-results")).toHaveAttribute("data-query", "alice");
  });

  it("clears the field and goes back", () => {
    const onBack = jest.fn();
    render(<AddBuddyPanel onBack={onBack} />);
    const field = screen.getByLabelText("Find people");
    fireEvent.change(field, { target: { value: "bo" } });
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(field).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: "Back to buddies" }));
    expect(onBack).toHaveBeenCalled();
  });
});
