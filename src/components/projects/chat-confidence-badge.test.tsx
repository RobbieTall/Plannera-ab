import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ChatConfidenceBadge } from "@/components/projects/chat-confidence-badge";

describe("ChatConfidenceBadge", () => {
  it("renders a green high confidence badge for high scores", () => {
    render(<ChatConfidenceBadge score={0.7} />);

    const badge = screen.getByText("High confidence · 70%");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-emerald-100", "text-emerald-700");
    expect(badge).toHaveAttribute("title", "0.7");
  });

  it("renders an amber moderate confidence badge for medium scores", () => {
    render(<ChatConfidenceBadge score={0.4} />);

    const badge = screen.getByText("Moderate confidence · 40%");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-amber-100", "text-amber-700");
    expect(badge).toHaveAttribute("title", "0.4");
  });

  it("renders a red low confidence badge for low scores", () => {
    render(<ChatConfidenceBadge score={0.39} />);

    const badge = screen.getByText("Low confidence · 39%");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass("bg-red-100", "text-red-700");
    expect(badge).toHaveAttribute("title", "0.39");
  });

  it("renders nothing for null scores", () => {
    const { container } = render(<ChatConfidenceBadge score={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for undefined scores", () => {
    const { container } = render(<ChatConfidenceBadge score={undefined} />);

    expect(container).toBeEmptyDOMElement();
  });
});
