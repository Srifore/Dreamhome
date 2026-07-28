import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductGallery } from "./product-gallery";

const IMAGES = ["/img/1.jpg", "/img/2.jpg", "/img/3.jpg"];

describe("ProductGallery", () => {
  it("shows a brand fallback panel (no <img>) when there are no images", () => {
    render(
      <ProductGallery images={[]} brandName="Faber" brandLogoUrl={null} productName="Designer Chimney" />,
    );

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("Faber")).toBeInTheDocument();
    expect(screen.getByText("Designer Chimney")).toBeInTheDocument();
  });

  it("renders the first image and hides prev/next controls when there is only one image", () => {
    render(
      <ProductGallery images={["/img/only.jpg"]} brandName="Bosch" productName="Oven" />,
    );

    const mainImage = screen.getByAltText("Bosch Oven — photo 1 of 1");
    expect(mainImage).toHaveAttribute("src", "/img/only.jpg");
    expect(screen.queryByRole("button", { name: "Next photo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Previous photo" })).not.toBeInTheDocument();
  });

  it("shows prev/next controls and thumbnails when there are multiple images, starting at photo 1", () => {
    render(<ProductGallery images={IMAGES} brandName="Siemens" productName="Hob" />);

    expect(screen.getByAltText("Siemens Hob — photo 1 of 3")).toHaveAttribute("src", IMAGES[0]);
    expect(screen.getByRole("button", { name: "Next photo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous photo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View photo 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View photo 3" })).toBeInTheDocument();
  });

  it("advances to the next photo on 'Next photo' click", async () => {
    const user = userEvent.setup();
    render(<ProductGallery images={IMAGES} brandName="Siemens" productName="Hob" />);

    await user.click(screen.getByRole("button", { name: "Next photo" }));

    expect(screen.getByAltText("Siemens Hob — photo 2 of 3")).toHaveAttribute("src", IMAGES[1]);
  });

  it("wraps around to the last photo when clicking 'Previous photo' from the first photo", async () => {
    const user = userEvent.setup();
    render(<ProductGallery images={IMAGES} brandName="Siemens" productName="Hob" />);

    await user.click(screen.getByRole("button", { name: "Previous photo" }));

    expect(screen.getByAltText("Siemens Hob — photo 3 of 3")).toHaveAttribute("src", IMAGES[2]);
  });

  it("wraps around to the first photo when clicking 'Next photo' from the last photo", async () => {
    const user = userEvent.setup();
    render(<ProductGallery images={IMAGES} brandName="Siemens" productName="Hob" />);

    await user.click(screen.getByRole("button", { name: "Next photo" }));
    await user.click(screen.getByRole("button", { name: "Next photo" }));
    await user.click(screen.getByRole("button", { name: "Next photo" }));

    expect(screen.getByAltText("Siemens Hob — photo 1 of 3")).toHaveAttribute("src", IMAGES[0]);
  });

  it("jumps directly to a photo when its thumbnail is clicked", async () => {
    const user = userEvent.setup();
    render(<ProductGallery images={IMAGES} brandName="Siemens" productName="Hob" />);

    await user.click(screen.getByRole("button", { name: "View photo 3" }));

    expect(screen.getByAltText("Siemens Hob — photo 3 of 3")).toHaveAttribute("src", IMAGES[2]);
  });

  it("navigates to the previous photo on a rightward swipe past the threshold", () => {
    render(<ProductGallery images={IMAGES} brandName="Siemens" productName="Hob" />);

    const stage = screen.getByAltText("Siemens Hob — photo 1 of 3").parentElement!;
    fireTouch(stage, 100, 200); // delta = +100, > 40px threshold => previous (wraps to last)

    expect(screen.getByAltText("Siemens Hob — photo 3 of 3")).toBeInTheDocument();
  });

  it("navigates to the next photo on a leftward swipe past the threshold", () => {
    render(<ProductGallery images={IMAGES} brandName="Siemens" productName="Hob" />);

    const stage = screen.getByAltText("Siemens Hob — photo 1 of 3").parentElement!;
    fireTouch(stage, 200, 100); // delta = -100, < -40px threshold => next

    expect(screen.getByAltText("Siemens Hob — photo 2 of 3")).toBeInTheDocument();
  });

  it("does not navigate on a small swipe below the threshold", () => {
    render(<ProductGallery images={IMAGES} brandName="Siemens" productName="Hob" />);

    const stage = screen.getByAltText("Siemens Hob — photo 1 of 3").parentElement!;
    fireTouch(stage, 200, 210); // delta = +10, below the 40px threshold

    expect(screen.getByAltText("Siemens Hob — photo 1 of 3")).toBeInTheDocument();
  });
});

/** Fires a touchstart at `startX` followed by a touchend at `endX` on the given element. */
function fireTouch(element: Element, startX: number, endX: number) {
  fireEvent.touchStart(element, { touches: [{ clientX: startX }] });
  fireEvent.touchEnd(element, { changedTouches: [{ clientX: endX }] });
}
