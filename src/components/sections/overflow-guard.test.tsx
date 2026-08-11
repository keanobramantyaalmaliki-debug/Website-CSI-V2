import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import Industries from "./Industries";
import LivingArchitecture from "./LivingArchitecture";
import Deployments from "./Deployments";
import Process from "./Process";
import Contact from "./Contact";

// jsdom lacks IntersectionObserver; motion's whileInView and useScrollStepper need it.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

vi.mock("@/lib/smoothScroll", () => ({
  scrollToSection: vi.fn(),
}));

/**
 * Regression guard for the mobile horizontal-overflow fix: these five
 * sections host elements wide enough to overflow a 360px viewport (sticky
 * columns, the physics heading). Each section root must clip the x-axis
 * locally so any residual overflow never escapes to the document —
 * `overflow-x-clip`, not `overflow-hidden`, because Industries contains a
 * `lg:sticky` child that `overflow: hidden` would break.
 */
const SECTIONS: { name: string; id: string; Component: () => React.JSX.Element }[] = [
  { name: "Industries", id: "industries", Component: Industries },
  { name: "LivingArchitecture", id: "living-architecture", Component: LivingArchitecture },
  { name: "Deployments", id: "deployments", Component: Deployments },
  { name: "Process", id: "process", Component: Process },
  { name: "Contact", id: "contact", Component: Contact },
];

describe("mobile overflow guard", () => {
  for (const { name, id, Component } of SECTIONS) {
    it(`${name} section root carries overflow-x-clip`, () => {
      const { container } = render(<Component />);
      const section = container.querySelector(`#${id}`);
      expect(section).not.toBeNull();
      expect(section?.className).toContain("overflow-x-clip");
    });
  }
});
