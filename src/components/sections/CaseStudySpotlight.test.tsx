import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CaseStudySpotlight from "./CaseStudySpotlight";

// jsdom lacks IntersectionObserver; motion's whileInView/useInView need it.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("IntersectionObserver", IntersectionObserverStub);

describe("CaseStudySpotlight", () => {
  it("renders without crashing and shows the section heading", () => {
    render(<CaseStudySpotlight />);
    expect(screen.getByText("Case Studies")).toBeInTheDocument();
  });

  it("shows a compact meta line, title and outcome directly on the image by default", () => {
    render(<CaseStudySpotlight />);
    expect(
      screen.getByText("Regional Government · Public Sector · 2024"),
    ).toBeInTheDocument();
    expect(screen.getByText("Citizen Service Portal")).toBeInTheDocument();
    expect(screen.getByText("67% faster turnaround")).toBeInTheDocument();
  });

  it("keeps the pull-quote, full detail paragraphs, and Client/Year/Industry/Scope breakdown hidden until expanded", () => {
    render(<CaseStudySpotlight />);
    expect(
      screen.queryByText(/Thousands of requests a month/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Cogniti designed a unified portal/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Cogniti built a real-time monitoring/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Client")).not.toBeInTheDocument();
    expect(screen.queryByText("Scope")).not.toBeInTheDocument();
    expect(screen.queryByText("SIPD Integration")).not.toBeInTheDocument();
  });

  it("clicking the image reveals the pull-quote, full story, and Client/Year/Industry/Scope breakdown", async () => {
    const user = userEvent.setup();
    render(<CaseStudySpotlight />);

    const triggers = screen.getAllByRole("button", { name: /read the full story/i });
    await user.click(triggers[0]);

    const region = screen.getAllByRole("region")[0];
    expect(region).toBeInTheDocument();
    expect(
      screen.getByText(/Thousands of requests a month/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Cogniti designed a unified portal/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Client")).toBeInTheDocument();
    expect(screen.getByText("Scope")).toBeInTheDocument();
    expect(screen.getByText("SIPD Integration")).toBeInTheDocument();
  });

  it("shows the outcome only once", () => {
    render(<CaseStudySpotlight />);
    const matches = screen.getAllByText("67% faster turnaround");
    expect(matches.length).toBe(1);
  });
});
