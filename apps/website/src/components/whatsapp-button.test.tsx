import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { WhatsAppButton } from "./whatsapp-button";
import { COMPANY } from "@/lib/content";

describe("WhatsAppButton", () => {
  it("links to wa.me with only digits from the company phone number (no +, spaces, or punctuation)", () => {
    render(<WhatsAppButton />);

    const link = screen.getByRole("link", { name: "Chat with us on WhatsApp" });
    const expectedDigits = COMPANY.phone.replace(/\D/g, "");

    expect(link).toHaveAttribute("href", `https://wa.me/${expectedDigits}`);
  });

  it("opens in a new tab safely", () => {
    render(<WhatsAppButton />);

    const link = screen.getByRole("link", { name: "Chat with us on WhatsApp" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
  });
});
