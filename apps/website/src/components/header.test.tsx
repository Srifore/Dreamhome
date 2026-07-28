import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Header } from "./header";
import { apiGet } from "@/lib/api";
import { COMPANY } from "@/lib/content";

vi.mock("@/lib/api", () => ({
  apiGet: vi.fn(),
}));

const mockedApiGet = vi.mocked(apiGet);

afterEach(() => {
  mockedApiGet.mockReset();
});

/** Header is an async server component — render its resolved JSX like RSC test harnesses do. */
async function renderHeader() {
  const ui = await Header();
  return render(ui);
}

describe("Header", () => {
  it("uses the site-settings maps URL when the API call succeeds", async () => {
    mockedApiGet.mockResolvedValue({ mapsUrl: "https://maps.app.goo.gl/custom-override" });

    await renderHeader();

    expect(screen.getByRole("link", { name: "Find us on Google Maps" })).toHaveAttribute(
      "href",
      "https://maps.app.goo.gl/custom-override",
    );
  });

  it("falls back to the hardcoded COMPANY maps URL when site-settings has no override", async () => {
    mockedApiGet.mockResolvedValue({ mapsUrl: null });

    await renderHeader();

    expect(screen.getByRole("link", { name: "Find us on Google Maps" })).toHaveAttribute(
      "href",
      COMPANY.mapsUrl,
    );
  });

  it("falls back to the hardcoded COMPANY maps URL when the API call rejects (API unreachable)", async () => {
    mockedApiGet.mockRejectedValue(new Error("network error"));

    await renderHeader();

    expect(screen.getByRole("link", { name: "Find us on Google Maps" })).toHaveAttribute(
      "href",
      COMPANY.mapsUrl,
    );
  });

  it("renders nav links to the site's main sections", async () => {
    mockedApiGet.mockResolvedValue({ mapsUrl: null });

    await renderHeader();

    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("href", "/");
    expect(screen.getByRole("link", { name: "Products" })).toHaveAttribute("href", "/products");
    expect(screen.getByRole("link", { name: "Contact" })).toHaveAttribute("href", "/contact");
  });

  it("renders a tel: link built from the company phone number with whitespace stripped", async () => {
    mockedApiGet.mockResolvedValue({ mapsUrl: null });

    await renderHeader();

    const expectedTel = `tel:${COMPANY.phone.replace(/\s+/g, "")}`;
    expect(screen.getByRole("link", { name: COMPANY.phone })).toHaveAttribute("href", expectedTel);
  });
});
