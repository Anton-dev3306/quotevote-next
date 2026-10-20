import { useState } from "react";
import { fireEvent, render, screen } from "@/__tests__/utils/test-utils";
import ChatSearchInput from "@/components/Chat/ChatSearchInput";

function Controlled({ onChange }: { onChange?: (value: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <ChatSearchInput
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

describe("ChatSearchInput (#531)", () => {
  it("is a labelled search field that explains @ and #", () => {
    render(<Controlled />);
    const input = screen.getByRole("searchbox", { name: "Search conversations" });
    expect(input).toHaveAttribute("placeholder", "Search messages, @people or #tags");
    expect(input).toHaveAccessibleDescription(
      "Matches message text. Start with @ for a person or # for a tag."
    );
    expect(screen.getByRole("search")).toBeInTheDocument();
  });

  it("has no Add Buddy control", () => {
    render(<Controlled />);
    expect(screen.queryByRole("button", { name: /add buddy/i })).not.toBeInTheDocument();
  });

  it("reports what is typed", () => {
    const onChange = jest.fn();
    render(<Controlled onChange={onChange} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "@alice" } });
    expect(onChange).toHaveBeenLastCalledWith("@alice");
    expect(screen.getByRole("searchbox")).toHaveValue("@alice");
  });

  it("clears with the clear button and returns focus to the field", () => {
    render(<Controlled />);
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "#climate" } });
    fireEvent.click(screen.getByRole("button", { name: "Clear search" }));
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
    expect(screen.queryByRole("button", { name: "Clear search" })).not.toBeInTheDocument();
  });

  it("clears with Escape", () => {
    render(<Controlled />);
    const input = screen.getByRole("searchbox");
    fireEvent.change(input, { target: { value: "town hall" } });
    input.focus();
    const reachedDocument = jest.fn();
    document.addEventListener("keydown", reachedDocument, true);
    fireEvent.keyDown(input, { key: "Escape" });
    document.removeEventListener("keydown", reachedDocument, true);
    expect(input).toHaveValue("");
    // The drawer around the panel never sees this Escape, so it stays open.
    expect(reachedDocument).not.toHaveBeenCalled();
  });

  it("lets Escape through when the field is empty, so the drawer can close", () => {
    render(<Controlled />);
    const input = screen.getByRole("searchbox");
    input.focus();
    const reachedDocument = jest.fn();
    document.addEventListener("keydown", reachedDocument, true);
    fireEvent.keyDown(input, { key: "Escape" });
    document.removeEventListener("keydown", reachedDocument, true);
    expect(reachedDocument).toHaveBeenCalled();
  });

  it("shows a value set from outside, such as a clicked #tag", () => {
    render(<ChatSearchInput value="#Climate" onChange={jest.fn()} />);
    expect(screen.getByRole("searchbox")).toHaveValue("#Climate");
  });
});
