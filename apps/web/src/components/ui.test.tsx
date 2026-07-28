import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Badge, Button, Modal } from "./ui";

describe("Badge", () => {
  it("defaults to the neutral tone classes", () => {
    render(<Badge>Draft</Badge>);
    const badge = screen.getByText("Draft");
    expect(badge.className).toContain("bg-slate-100");
    expect(badge.className).toContain("text-slate-700");
  });

  it("applies distinct classes per tone", () => {
    const { rerender } = render(<Badge tone="green">Accepted</Badge>);
    expect(screen.getByText("Accepted").className).toContain("bg-green-100");

    rerender(<Badge tone="red">Rejected</Badge>);
    expect(screen.getByText("Rejected").className).toContain("bg-red-100");

    rerender(<Badge tone="amber">Pending</Badge>);
    expect(screen.getByText("Pending").className).toContain("bg-amber-100");

    rerender(<Badge tone="blue">Sent</Badge>);
    expect(screen.getByText("Sent").className).toContain("bg-sky-100");
  });
});

describe("Button", () => {
  it("defaults to the primary variant styling", () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole("button", { name: "Save" }).className).toContain("bg-sky-600");
  });

  it("applies secondary variant styling instead of primary", () => {
    render(<Button variant="secondary">Cancel</Button>);
    const button = screen.getByRole("button", { name: "Cancel" });
    expect(button.className).toContain("bg-white");
    expect(button.className).not.toContain("bg-sky-600");
  });

  it("applies danger variant styling", () => {
    render(<Button variant="danger">Delete</Button>);
    const button = screen.getByRole("button", { name: "Delete" });
    expect(button.className).toContain("bg-red-600");
  });

  it("fires onClick and respects the disabled prop", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <Button onClick={onClick} disabled>
        Submit
      </Button>,
    );
    const button = screen.getByRole("button", { name: "Submit" });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("merges a caller-provided className with the variant classes", () => {
    render(<Button className="custom-class">Go</Button>);
    expect(screen.getByRole("button", { name: "Go" }).className).toContain("custom-class");
  });
});

describe("Modal", () => {
  it("renders nothing when closed", () => {
    const { container } = render(
      <Modal open={false} onClose={() => {}} title="Hidden">
        <p>Body content</p>
      </Modal>,
    );
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
  });

  it("renders the title and children when open", () => {
    render(
      <Modal open onClose={() => {}} title="Choose a Template">
        <p>Pick one below</p>
      </Modal>,
    );
    expect(screen.getByText("Choose a Template")).toBeInTheDocument();
    expect(screen.getByText("Pick one below")).toBeInTheDocument();
  });

  it("calls onClose when the close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Confirm">
        <p>Are you sure?</p>
      </Modal>,
    );
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
