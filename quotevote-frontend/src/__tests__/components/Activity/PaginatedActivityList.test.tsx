/**
 * PaginatedActivityList states (#536): profile activity empty, filtered-empty,
 * error with a working Try again, and loading.
 */

import { fireEvent, render, screen } from "../../utils/test-utils";
import { PaginatedActivityList } from "@/components/Activity/PaginatedActivityList";

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
