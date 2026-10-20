import { renderHook } from "@testing-library/react";
import { useAutoResizeTextarea } from "@/hooks/useAutoResizeTextarea";

const textareaWithScrollHeight = (scrollHeight: number): HTMLTextAreaElement => {
  const el = document.createElement("textarea");
  Object.defineProperty(el, "scrollHeight", { configurable: true, get: () => scrollHeight });
  return el;
};

describe("useAutoResizeTextarea", () => {
  it("sets the textarea height to its content height", () => {
    const el = textareaWithScrollHeight(240);
    const { result, rerender } = renderHook(({ value }) => useAutoResizeTextarea(value), {
      initialProps: { value: "" },
    });

    result.current.ref.current = el;
    rerender({ value: "some text" });

    expect(el.style.height).toBe("240px");
  });

  it("grows again when the content gets longer", () => {
    let height = 120;
    const el = document.createElement("textarea");
    Object.defineProperty(el, "scrollHeight", { configurable: true, get: () => height });
    const { result, rerender } = renderHook(({ value }) => useAutoResizeTextarea(value), {
      initialProps: { value: "one line" },
    });

    result.current.ref.current = el;
    rerender({ value: "one line\ntwo" });
    expect(el.style.height).toBe("120px");

    height = 480;
    rerender({ value: "one line\ntwo\nthree\nfour\nfive" });
    expect(el.style.height).toBe("480px");
  });

  it("can be resized on demand", () => {
    const el = textareaWithScrollHeight(300);
    const { result } = renderHook(() => useAutoResizeTextarea("draft"));

    result.current.ref.current = el;
    result.current.resize();

    expect(el.style.height).toBe("300px");
  });

  it("does nothing before a textarea is attached", () => {
    const { result } = renderHook(() => useAutoResizeTextarea("text"));
    expect(() => result.current.resize()).not.toThrow();
  });
});
