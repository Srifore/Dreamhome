import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Quote } from "@/lib/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    user: { id: "u1", email: "owner@dreamhome.test", name: "Owner", roleId: "r1", roleName: "Admin", permissions: ["*"], branchId: null },
    loading: false,
    hasPermission: () => true,
    login: vi.fn(),
    logout: vi.fn(),
    refreshUser: vi.fn(),
  }),
}));

const { apiGetMock } = vi.hoisted(() => ({ apiGetMock: vi.fn() }));
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    api: { ...actual.api, get: apiGetMock },
  };
});

import QuotesPage from "./page";

const QUOTES: Quote[] = [
  {
    id: "q1",
    quoteNumber: "Q-0001",
    status: "SENT",
    customerId: "c1",
    b2bAccountId: null,
    quoteDate: "2026-07-01T00:00:00.000Z",
    validUntil: null,
    placeOfSupplyState: null,
    shippingAddress: null,
    notes: null,
    termsAndConditions: null,
    templateId: "standard",
    subtotal: "1000",
    discount: "0",
    cgstTotal: "90",
    sgstTotal: "90",
    igstTotal: "0",
    roundingAdjustment: "0",
    total: "1180",
    items: [],
    customer: {
      id: "c1",
      name: "Alice Sharma",
      phone: "9999999999",
      email: null,
      address: null,
      loyaltyPoints: 0,
      source: null,
      gstin: null,
      state: null,
      shippingAddress: null,
    },
    salesOrder: null,
  },
];

function renderQuotesPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <QuotesPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  apiGetMock.mockReset();
  apiGetMock.mockImplementation((path: string) => {
    if (path === "/sales/quotes") return Promise.resolve(QUOTES);
    return Promise.reject(new Error(`Unexpected api.get call: ${path}`));
  });
});

describe("QuotesPage (smoke test)", () => {
  it("lists fetched quotes with their number, customer, status, and total", async () => {
    renderQuotesPage();

    expect(await screen.findByText("Q-0001")).toBeInTheDocument();
    expect(screen.getByText("Alice Sharma")).toBeInTheDocument();
    expect(screen.getByText("SENT")).toBeInTheDocument();
    expect(screen.getByText("₹1,180")).toBeInTheDocument();
  });

  it("filters the list by the search box, matching quote number or customer name", async () => {
    renderQuotesPage();
    await screen.findByText("Q-0001");

    const search = screen.getByPlaceholderText("Search by quote # or customer…");
    fireEvent.change(search, { target: { value: "nonexistent" } });

    expect(screen.queryByText("Q-0001")).not.toBeInTheDocument();
    expect(screen.getByText("No quotes match your search.")).toBeInTheDocument();

    fireEvent.change(search, { target: { value: "alice" } });
    expect(screen.getByText("Q-0001")).toBeInTheDocument();
  });
});
