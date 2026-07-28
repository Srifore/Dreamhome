import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import HomePage from "./page";
import { BRAND_PORTFOLIO, COMPANY, PILLARS, WHO_WE_SERVE } from "@/lib/content";

describe("HomePage", () => {
  it("renders without crashing", () => {
    expect(() => render(<HomePage />)).not.toThrow();
  });

  it("shows the hero heading and strapline", () => {
    render(<HomePage />);

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Dreamhome");
    expect(heading).toHaveTextContent("Kitchen Appliances");
    expect(screen.getByText(COMPANY.strapline)).toBeInTheDocument();
  });

  it("renders all 4 pillar cards from PILLARS, each with its title and items", () => {
    render(<HomePage />);

    expect(PILLARS).toHaveLength(4);
    for (const pillar of PILLARS) {
      expect(screen.getByRole("heading", { name: pillar.title })).toBeInTheDocument();
      for (const item of pillar.items) {
        expect(screen.getByText(item)).toBeInTheDocument();
      }
    }
  });

  it("renders a brand card for every entry in BRAND_PORTFOLIO", () => {
    render(<HomePage />);

    for (const brand of BRAND_PORTFOLIO) {
      expect(screen.getByText(brand.name)).toBeInTheDocument();
      expect(screen.getByText(brand.description)).toBeInTheDocument();
    }
  });

  it("renders a card for every WHO_WE_SERVE audience", () => {
    render(<HomePage />);

    for (const item of WHO_WE_SERVE) {
      expect(screen.getByRole("heading", { name: item.title })).toBeInTheDocument();
    }
  });

  it("links to /products and /contact from the hero CTAs", () => {
    render(<HomePage />);

    expect(screen.getByRole("link", { name: "Explore Products" })).toHaveAttribute("href", "/products");
    expect(screen.getByRole("link", { name: "Talk to Us" })).toHaveAttribute("href", "/contact");
  });
});
