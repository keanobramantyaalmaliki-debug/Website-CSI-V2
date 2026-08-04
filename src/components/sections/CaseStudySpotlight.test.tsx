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

  it("shows a short pull-quote for each spotlight instead of the full body", () => {
    render(<CaseStudySpotlight />);
    expect(
      screen.getByText(/Thousands of requests a month/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Field teams across hundreds of sites, coordinating by phone/i),
    ).toBeInTheDocument();
  });

  it("keeps the full detail paragraphs hidden until expanded", () => {
    render(<CaseStudySpotlight />);
    expect(
      screen.queryByText(/Cogniti designed a unified portal/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Cogniti built a real-time monitoring/i),
    ).not.toBeInTheDocument();
  });

  it("reveals the full story behind the disclosure when clicked", async () => {
    const user = userEvent.setup();
    render(<CaseStudySpotlight />);

    const triggers = screen.getAllByRole("button", { name: /read the full story/i });
    await user.click(triggers[0]);

    const region = screen.getAllByRole("region")[0];
    expect(region).toBeInTheDocument();
    expect(
      screen.getByText(/Cogniti designed a unified portal/i),
    ).toBeInTheDocument();
  });

  it("shows the outcome prominently in the main content, not only in the sidebar", () => {
    render(<CaseStudySpotlight />);
    // Sidebar MetaRow renders "Outcome" label + value; main content renders
    // the value alone as a large standalone element — both instances exist.
    const matches = screen.getAllByText("67% faster turnaround");
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });
});
