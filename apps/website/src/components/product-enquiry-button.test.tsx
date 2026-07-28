import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProductEnquiryButton } from "./product-enquiry-button";

vi.mock("@/lib/api", () => ({
  apiPost: vi.fn(),
}));

afterEach(() => {
  document.body.style.overflow = "";
});

describe("ProductEnquiryButton", () => {
  it("does not show the modal until the trigger button is clicked", () => {
    render(<ProductEnquiryButton productId="prod-1" productName="Designer Chimney" />);

    expect(screen.queryByText("Enquire About This Product", { selector: "h2" })).not.toBeInTheDocument();
  });

  it("opens the modal, showing the product name, when the trigger is clicked", async () => {
    const user = userEvent.setup();
    render(<ProductEnquiryButton productId="prod-1" productName="Designer Chimney" />);

    await user.click(screen.getByRole("button", { name: "Enquire About This Product" }));

    expect(screen.getByText("Enquire About This Product", { selector: "h2" })).toBeInTheDocument();
    expect(screen.getByText("Designer Chimney")).toBeInTheDocument();
  });

  it("locks page scroll while open and restores it on close", async () => {
    const user = userEvent.setup();
    render(<ProductEnquiryButton productId="prod-1" productName="Designer Chimney" />);

    expect(document.body.style.overflow).toBe("");
    await user.click(screen.getByRole("button", { name: "Enquire About This Product" }));
    expect(document.body.style.overflow).toBe("hidden");

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(document.body.style.overflow).toBe("");
  });

  it("closes the modal when the close (X) button is clicked", async () => {
    const user = userEvent.setup();
    render(<ProductEnquiryButton productId="prod-1" productName="Designer Chimney" />);

    await user.click(screen.getByRole("button", { name: "Enquire About This Product" }));
    await user.click(screen.getByRole("button", { name: "Close" }));

    expect(screen.queryByText("Enquire About This Product", { selector: "h2" })).not.toBeInTheDocument();
  });

  it("closes the modal when the backdrop is clicked", async () => {
    const user = userEvent.setup();
    const { container } = render(<ProductEnquiryButton productId="prod-1" productName="Designer Chimney" />);

    await user.click(screen.getByRole("button", { name: "Enquire About This Product" }));
    const backdrop = container.querySelector(".fixed.inset-0") as HTMLElement;
    await user.click(backdrop);

    expect(screen.queryByText("Enquire About This Product", { selector: "h2" })).not.toBeInTheDocument();
  });

  it("does not close the modal when clicking inside the dialog panel", async () => {
    const user = userEvent.setup();
    render(<ProductEnquiryButton productId="prod-1" productName="Designer Chimney" />);

    await user.click(screen.getByRole("button", { name: "Enquire About This Product" }));
    await user.click(screen.getByText("Designer Chimney"));

    expect(screen.getByText("Enquire About This Product", { selector: "h2" })).toBeInTheDocument();
  });

  it("closes the modal when the Escape key is pressed", async () => {
    const user = userEvent.setup();
    render(<ProductEnquiryButton productId="prod-1" productName="Designer Chimney" />);

    await user.click(screen.getByRole("button", { name: "Enquire About This Product" }));
    expect(screen.getByText("Enquire About This Product", { selector: "h2" })).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByText("Enquire About This Product", { selector: "h2" })).not.toBeInTheDocument();
  });

  it("renders the enquiry form with the given productId inside the modal", async () => {
    const user = userEvent.setup();
    render(<ProductEnquiryButton productId="prod-1" productName="Designer Chimney" />);

    await user.click(screen.getByRole("button", { name: "Enquire About This Product" }));

    expect(screen.getByRole("button", { name: "Request a Quote" })).toBeInTheDocument();
  });
});
