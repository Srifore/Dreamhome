import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrandMark } from "./brand-mark";

describe("BrandMark", () => {
  it("renders the brand's real logo image when logoUrl is provided", () => {
    render(<BrandMark name="Faber" logoUrl="/brand-logos/faber.png" />);

    const img = screen.getByRole("img", { name: "Faber logo" });
    expect(img).toHaveAttribute("src", "/brand-logos/faber.png");
  });

  it("falls back to a monogram of the first letter when logoUrl is absent", () => {
    render(<BrandMark name="Bosch" />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
  });

  it("falls back to a monogram when logoUrl is null", () => {
    render(<BrandMark name="Siemens" logoUrl={null} />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("S")).toBeInTheDocument();
  });

  it("uppercases the monogram initial regardless of input casing", () => {
    render(<BrandMark name="zerob" />);

    expect(screen.getByText("Z")).toBeInTheDocument();
  });

  it("falls back to a monogram when logoUrl is an empty string", () => {
    render(<BrandMark name="Daikin" logoUrl="" />);

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("D")).toBeInTheDocument();
  });
});
