import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { VirtualList } from "./VirtualList";

describe("VirtualList", () => {
  it("renders items through the render prop", () => {
    render(
      <VirtualList
        items={[{ id: "a", label: "Alpha" }, { id: "b", label: "Beta" }]}
        estimateSize={() => 40}
        renderItem={(item) => <div key={item.id}>{item.label}</div>}
      />
    );
    expect(screen.getByText("Alpha")).toBeInTheDocument();
  });

  it("renders nothing for an empty list without crashing", () => {
    const { container } = render(
      <VirtualList items={[]} estimateSize={() => 40} renderItem={() => <div />} />
    );
    expect(container).toBeTruthy();
  });
});
