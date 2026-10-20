/**
 * Post and Discussion side by side with a draggable divider (#516).
 */
import { createEvent, fireEvent, render, screen } from "@/__tests__/utils/test-utils";
import DiscussionSplitPane from "@/components/Post/DiscussionSplitPane";
import { DESKTOP_SPLIT_RATIO_STORAGE_KEY } from "@/types/discussionSplit";
import { installMemoryStorage, restoreStorage } from "@/__tests__/utils/memoryStorage";

function pointer(
  element: Element,
  type: "pointerDown" | "pointerMove" | "pointerUp",
  clientX: number
) {
  const event = createEvent[type](element, { bubbles: true, pointerId: 1 });
  Object.assign(event, { clientX, pointerId: 1, pointerType: "mouse", button: 0 });
  fireEvent(element, event);
}

const renderSplit = (width = 1000) => {
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get: () => width,
  });
  render(
    <DiscussionSplitPane contentPane={<div>Post body</div>}>
      <div>Discussion body</div>
    </DiscussionSplitPane>
  );
  return {
    divider: screen.getByRole("separator", { name: "Resize post and discussion" }),
    content: document.querySelector('[data-post-detail-pane="content"]') as HTMLElement,
  };
};

describe("DiscussionSplitPane", () => {
  beforeEach(() => {
    installMemoryStorage();
  });

  afterEach(() => {
    restoreStorage();
  });

  it("shows the post and the discussion side by side at half and half", () => {
    const { divider, content } = renderSplit();
    expect(screen.getByText("Post body")).toBeInTheDocument();
    expect(screen.getByText("Discussion body")).toBeInTheDocument();
    expect(content).toHaveStyle({ width: "50%" });
    expect(divider).toHaveAttribute("aria-orientation", "vertical");
    expect(divider).toHaveAttribute("aria-valuenow", "50");
    expect(divider).toHaveAttribute("aria-valuetext", "Post 50%, discussion 50%");
    expect(divider).toHaveAttribute("aria-controls", content.id);
    expect(divider).toHaveAttribute("tabindex", "0");
  });

  it("resizes both panes when the divider is dragged, and remembers it", () => {
    const { divider, content } = renderSplit(1000);
    pointer(divider, "pointerDown", 500);
    pointer(divider, "pointerMove", 650);
    expect(content).toHaveStyle({ width: "65%" });
    pointer(divider, "pointerUp", 650);
    expect(window.localStorage.getItem(DESKTOP_SPLIT_RATIO_STORAGE_KEY)).toBe("0.65");
  });

  it("keeps both panes at least 320px wide", () => {
    const { divider, content } = renderSplit(1000);
    expect(divider).toHaveAttribute("aria-valuemin", "32");
    expect(divider).toHaveAttribute("aria-valuemax", "68");
    pointer(divider, "pointerDown", 500);
    pointer(divider, "pointerMove", 990);
    expect(content).toHaveStyle({ width: "68%" });
    pointer(divider, "pointerMove", 10);
    expect(content).toHaveStyle({ width: "32%" });
  });

  it("stays at half and half when the screen is too narrow for two usable panes", () => {
    const { divider } = renderSplit(600);
    expect(divider).toHaveAttribute("aria-valuemin", "50");
    expect(divider).toHaveAttribute("aria-valuemax", "50");
    fireEvent.keyDown(divider, { key: "ArrowRight" });
    expect(divider).toHaveAttribute("aria-valuenow", "50");
  });

  it("resizes from the keyboard: arrows, Shift for bigger steps, Home, End and Enter", () => {
    const { divider } = renderSplit(1000);
    fireEvent.keyDown(divider, { key: "ArrowRight" });
    expect(divider).toHaveAttribute("aria-valuenow", "55");
    fireEvent.keyDown(divider, { key: "ArrowLeft", shiftKey: true });
    expect(divider).toHaveAttribute("aria-valuenow", "45");
    fireEvent.keyDown(divider, { key: "End" });
    expect(divider).toHaveAttribute("aria-valuenow", "68");
    fireEvent.keyDown(divider, { key: "Home" });
    expect(divider).toHaveAttribute("aria-valuenow", "32");
    fireEvent.keyDown(divider, { key: "Enter" });
    expect(divider).toHaveAttribute("aria-valuenow", "50");
  });

  it("switches between preset sizes on a click, for anyone who can't drag", () => {
    const { divider } = renderSplit(1000);
    pointer(divider, "pointerDown", 500);
    pointer(divider, "pointerUp", 501);
    expect(divider).toHaveAttribute("aria-valuenow", "65");
    pointer(divider, "pointerDown", 650);
    pointer(divider, "pointerUp", 650);
    expect(divider).toHaveAttribute("aria-valuenow", "35");
    pointer(divider, "pointerDown", 350);
    pointer(divider, "pointerUp", 350);
    expect(divider).toHaveAttribute("aria-valuenow", "50");
  });

  it("starts from the last saved size", () => {
    window.localStorage.setItem(DESKTOP_SPLIT_RATIO_STORAGE_KEY, "0.6");
    const { content } = renderSplit(1000);
    expect(content).toHaveStyle({ width: "60%" });
  });
});
