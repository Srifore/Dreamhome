import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EnquiryForm } from "./enquiry-form";
import { apiPost } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  apiPost: vi.fn(),
}));

const mockedApiPost = vi.mocked(apiPost);

afterEach(() => {
  mockedApiPost.mockReset();
});

/**
 * The form's <label> elements aren't programmatically associated with their inputs (no
 * htmlFor/id), so they carry no accessible name. Every input and the textarea share the
 * generic "textbox" role, and DOM order is stable: Name, Phone, Email, Message.
 */
function getFields() {
  const [nameInput, phoneInput, emailInput, messageInput] = screen.getAllByRole("textbox");
  return { nameInput, phoneInput, emailInput, messageInput };
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  const { nameInput, phoneInput } = getFields();
  await user.type(nameInput, "Jane Doe");
  await user.type(phoneInput, "9845059388");
}

describe("EnquiryForm", () => {
  it("renders name, phone, email, and message fields", () => {
    render(<EnquiryForm />);

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Phone")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Message")).toBeInTheDocument();
    expect(screen.getAllByRole("textbox")).toHaveLength(4);
  });

  it("marks name and phone as required, but email and message as optional", () => {
    render(<EnquiryForm />);

    const { nameInput, phoneInput, emailInput, messageInput } = getFields();
    expect(nameInput).toBeRequired();
    expect(phoneInput).toBeRequired();
    expect(emailInput).not.toBeRequired();
    expect(messageInput).not.toBeRequired();
  });

  it("uses type=email for the email field", () => {
    render(<EnquiryForm />);
    const { emailInput } = getFields();
    expect(emailInput).toHaveAttribute("type", "email");
  });

  it("shows 'Send Enquiry' as the submit label on the general contact form (no productId)", () => {
    render(<EnquiryForm />);
    expect(screen.getByRole("button", { name: "Send Enquiry" })).toBeInTheDocument();
  });

  it("shows 'Request a Quote' as the submit label when tied to a product", () => {
    render(<EnquiryForm productId="prod-1" productName="Designer Chimney" />);
    expect(screen.getByRole("button", { name: "Request a Quote" })).toBeInTheDocument();
  });

  it("submits the form data and product id, omitting blank optional fields as undefined", async () => {
    mockedApiPost.mockResolvedValue({});
    const user = userEvent.setup();
    render(<EnquiryForm productId="prod-1" productName="Designer Chimney" />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Request a Quote" }));

    await waitFor(() => expect(mockedApiPost).toHaveBeenCalled());
    expect(mockedApiPost).toHaveBeenCalledWith("/public/enquiries", {
      name: "Jane Doe",
      phone: "9845059388",
      email: undefined,
      message: undefined,
      productId: "prod-1",
    });
  });

  it("includes email and message in the payload when filled in", async () => {
    mockedApiPost.mockResolvedValue({});
    const user = userEvent.setup();
    render(<EnquiryForm />);

    const { nameInput, phoneInput, emailInput, messageInput } = getFields();
    await user.type(nameInput, "Jane Doe");
    await user.type(phoneInput, "9845059388");
    await user.type(emailInput, "jane@example.com");
    await user.type(messageInput, "Interested in a chimney");
    await user.click(screen.getByRole("button", { name: "Send Enquiry" }));

    await waitFor(() => expect(mockedApiPost).toHaveBeenCalled());
    expect(mockedApiPost).toHaveBeenCalledWith("/public/enquiries", {
      name: "Jane Doe",
      phone: "9845059388",
      email: "jane@example.com",
      message: "Interested in a chimney",
      productId: undefined,
    });
  });

  it("shows a success message that mentions the product after a successful submission", async () => {
    mockedApiPost.mockResolvedValue({});
    const user = userEvent.setup();
    render(<EnquiryForm productId="prod-1" productName="Designer Chimney" />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Request a Quote" }));

    expect(await screen.findByText(/Thank you!/)).toBeInTheDocument();
    expect(screen.getByText(/about the Designer Chimney/)).toBeInTheDocument();
    // The form should be replaced by the success message.
    expect(screen.queryByRole("button", { name: "Request a Quote" })).not.toBeInTheDocument();
  });

  it("shows a plain thank-you message with no product mention on the general contact form", async () => {
    mockedApiPost.mockResolvedValue({});
    const user = userEvent.setup();
    render(<EnquiryForm />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Send Enquiry" }));

    expect(await screen.findByText(/Thank you!/)).toBeInTheDocument();
    expect(screen.queryByText(/about the/)).not.toBeInTheDocument();
  });

  it("shows the server-provided error message and keeps the form visible on failure", async () => {
    mockedApiPost.mockRejectedValue(new Error("Phone number is required"));
    const user = userEvent.setup();
    render(<EnquiryForm />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Send Enquiry" }));

    expect(await screen.findByText("Phone number is required")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send Enquiry" })).toBeInTheDocument();
  });

  it("shows a generic fallback message when the failure is not an Error instance", async () => {
    mockedApiPost.mockRejectedValue("network down");
    const user = userEvent.setup();
    render(<EnquiryForm />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Send Enquiry" }));

    expect(await screen.findByText("Something went wrong. Please try again.")).toBeInTheDocument();
  });

  it("disables the submit button and shows a sending state while the request is in flight", async () => {
    let resolveSubmit!: (value: unknown) => void;
    mockedApiPost.mockReturnValue(
      new Promise((resolve) => {
        resolveSubmit = resolve;
      }),
    );
    const user = userEvent.setup();
    render(<EnquiryForm />);

    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: "Send Enquiry" }));

    const sendingButton = await screen.findByRole("button", { name: "Sending…" });
    expect(sendingButton).toBeDisabled();

    resolveSubmit({});
    expect(await screen.findByText(/Thank you!/)).toBeInTheDocument();
  });
});
