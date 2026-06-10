import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MessageReactionBar } from "@/components/projects/message-reaction-bar";

describe("MessageReactionBar", () => {
  it("renders all 4 reaction buttons", () => {
    render(<MessageReactionBar messageId="m1" reactions={{}} onToggle={vi.fn()} />);
    expect(screen.getAllByRole("button")).toHaveLength(4);
  });

  it("shows active state when reaction count > 0", () => {
    render(<MessageReactionBar messageId="m1" reactions={{ "👍": 1 }} onToggle={vi.fn()} />);
    const btn = screen.getByLabelText("React with 👍");
    expect(btn).toHaveAttribute("aria-pressed", "true");
  });

  it("calls onToggle with correct args on click", () => {
    const onToggle = vi.fn();
    render(<MessageReactionBar messageId="m1" reactions={{}} onToggle={onToggle} />);
    fireEvent.click(screen.getByLabelText("React with 👍"));
    expect(onToggle).toHaveBeenCalledWith("m1", "👍");
  });
});
