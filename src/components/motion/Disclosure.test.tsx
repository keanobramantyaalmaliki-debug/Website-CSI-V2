import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Disclosure from "./Disclosure";

describe("Disclosure", () => {
  it("is collapsed by default: aria-expanded=false, content not rendered", () => {
    render(
      <Disclosure trigger="More">
        <p>Hidden detail</p>
      </Disclosure>,
    );
    const button = screen.getByRole("button", { name: "More" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Hidden detail")).not.toBeInTheDocument();
  });

  it("wires aria-controls to the region id when opened", async () => {
    const user = userEvent.setup();
    render(
      <Disclosure trigger="More">
        <p>Hidden detail</p>
      </Disclosure>,
    );
    const button = screen.getByRole("button");
    await user.click(button);

    const region = screen.getByRole("region");
    expect(button).toHaveAttribute("aria-expanded", "true");
    expect(button.getAttribute("aria-controls")).toBe(region.getAttribute("id"));
    expect(screen.getByText("Hidden detail")).toBeInTheDocument();
  });

  it("toggles open then closed on repeated clicks", async () => {
    const user = userEvent.setup();
    render(
      <Disclosure trigger="More">
        <p>Hidden detail</p>
      </Disclosure>,
    );
    const button = screen.getByRole("button");

    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");

    await user.click(button);
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("is operable by keyboard (Enter and Space)", async () => {
    const user = userEvent.setup();
    render(
      <Disclosure trigger="More">
        <p>Hidden detail</p>
      </Disclosure>,
    );
    const button = screen.getByRole("button");
    button.focus();

    await user.keyboard("{Enter}");
    expect(button).toHaveAttribute("aria-expanded", "true");

    await user.keyboard(" ");
    expect(button).toHaveAttribute("aria-expanded", "false");
  });

  it("respects defaultOpen", () => {
    render(
      <Disclosure trigger="More" defaultOpen>
        <p>Hidden detail</p>
      </Disclosure>,
    );
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Hidden detail")).toBeInTheDocument();
  });

  it("supports a render-prop trigger receiving open state", async () => {
    const user = userEvent.setup();
    render(
      <Disclosure trigger={(open) => (open ? "Close" : "Open")}>
        <p>Hidden detail</p>
      </Disclosure>,
    );
    expect(screen.getByRole("button", { name: "Open" })).toBeInTheDocument();
    await user.click(screen.getByRole("button"));
    expect(screen.getByRole("button", { name: "Close" })).toBeInTheDocument();
  });
});
