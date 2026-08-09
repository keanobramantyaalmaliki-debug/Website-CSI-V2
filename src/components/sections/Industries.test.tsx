import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Industries from "./Industries";

// jsdom lacks IntersectionObserver; motion's whileInView needs it.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

const SECTORS = [
  { name: "Government & Public Sector", desc: "National platforms and citizen services, built to scale and stay accountable." },
  { name: "Smart Cities", desc: "Connected infrastructure that turns urban data into livable outcomes." },
  { name: "Digital Villages", desc: "Bringing modern services to rural communities, one connected village at a time." },
  { name: "Healthcare", desc: "Systems that keep patient care coordinated, secure, and on time." },
  { name: "Education", desc: "Platforms that put learning and administration on the same page." },
  { name: "Finance", desc: "Secure, compliant systems for money that has to move and be trusted." },
  { name: "Hospitality", desc: "Guest experiences that feel effortless from booking to checkout." },
  { name: "Retail & E-Commerce", desc: "Storefronts and operations that keep pace with demand." },
  { name: "Manufacturing", desc: "Floor-to-cloud visibility that keeps production moving." },
  { name: "Logistics", desc: "Tracking and routing that make every shipment predictable." },
  { name: "Property & Real Estate", desc: "Tools that manage spaces, tenants, and portfolios in one place." },
  { name: "Professional Services", desc: "Workflows that let expert teams bill, deliver, and scale." },
  { name: "Startups & Enterprises", desc: "From first MVP to enterprise rollout, built to grow with you." },
];

describe("Industries", () => {
  it("renders without crashing and shows the heading", () => {
    render(<Industries />);
    expect(
      screen.getByRole("heading", { name: /built across sectors/i }),
    ).toBeInTheDocument();
  });

  it("renders one heading per sector, in order", () => {
    render(<Industries />);
    const headings = screen.getAllByRole("heading", { level: 3 });
    expect(headings).toHaveLength(SECTORS.length);
    expect(headings.map((h) => h.textContent)).toEqual(SECTORS.map((s) => s.name));
  });

  it("renders every sector's description", () => {
    render(<Industries />);
    for (const sector of SECTORS) {
      expect(screen.getByText(sector.desc)).toBeInTheDocument();
    }
  });

  it("renders the Core Focus and Also Serving group labels", () => {
    render(<Industries />);
    expect(screen.getByText("Core Focus")).toBeInTheDocument();
    expect(screen.getByText("Also Serving")).toBeInTheDocument();
  });

  it("shows the sector/core count stat", () => {
    render(<Industries />);
    expect(screen.getByText("13 SECTORS · 3 core")).toBeInTheDocument();
  });
});
