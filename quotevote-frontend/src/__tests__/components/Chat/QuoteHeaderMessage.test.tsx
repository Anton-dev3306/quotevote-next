import { render, screen, fireEvent } from "@/__tests__/utils/test-utils";
import QuoteHeaderMessage from "@/components/Chat/QuoteHeaderMessage";
import { useAppStore } from "@/store";

jest.mock("@/store", () => ({
  useAppStore: jest.fn(),
}));

jest.mock("@/components/Avatar", () => ({
  __esModule: true,
  default: ({ alt }: { alt: string }) => <span data-testid="avatar">{alt}</span>,
}));

const mockUseAppStore = useAppStore as jest.MockedFunction<typeof useAppStore>;

describe("QuoteHeaderMessage", () => {
  const setChatOpen = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseAppStore.mockImplementation((selector: any) => selector({ setChatOpen }));
  });

  const postDetails = {
    _id: "post1",
    title: "On reading slowly",
    text: "Read slowly before you vote.",
    url: "/post/qa/on-reading-slowly/post1",
  };

  it("shows the post and links back to it", () => {
    render(
      <QuoteHeaderMessage
        postDetails={postDetails}
        postCreator={{ id: "u1", username: "alice", name: "Alice Local" }}
      />
    );

    expect(screen.getByText("On reading slowly")).toBeInTheDocument();
    expect(screen.getByText("Alice Local", { selector: "div" })).toBeInTheDocument();

    const link = screen.getByTestId("quote-header-view-post");
    expect(link).toHaveAttribute("href", "/post/qa/on-reading-slowly/post1");

    fireEvent.click(link);
    expect(setChatOpen).toHaveBeenCalledWith(false);
  });

  it("doesn't show a placeholder author when the creator is unknown", () => {
    render(<QuoteHeaderMessage postDetails={postDetails} postCreator={null} />);

    expect(screen.queryByText("Unknown User")).not.toBeInTheDocument();
    expect(screen.queryByTestId("avatar")).not.toBeInTheDocument();
    expect(screen.getByText("Original Quote")).toBeInTheDocument();
  });

  it("has no link when the post has no in-app path", () => {
    const { rerender } = render(
      <QuoteHeaderMessage postDetails={{ ...postDetails, url: null }} postCreator={null} />
    );
    expect(screen.queryByTestId("quote-header-view-post")).not.toBeInTheDocument();

    rerender(
      <QuoteHeaderMessage
        postDetails={{ ...postDetails, url: "https://example.com/post/a/b/c" }}
        postCreator={null}
      />
    );
    expect(screen.queryByTestId("quote-header-view-post")).not.toBeInTheDocument();
  });

  it("renders nothing without post details", () => {
    const { container } = render(<QuoteHeaderMessage postDetails={null} postCreator={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
