import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { CompanySettings, Customer, Product } from "@/lib/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn(), refresh: vi.fn() }),
}));

const { apiGetMock } = vi.hoisted(() => ({ apiGetMock: vi.fn() }));
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return {
    ...actual,
    api: { ...actual.api, get: apiGetMock },
  };
});

// Imported after the mocks above so quote-form.tsx picks up the mocked "@/lib/api" module.
import { QuoteForm } from "./quote-form";

const CUSTOMERS: Customer[] = [
  {
    id: "c1",
    name: "Alice Sharma",
    phone: "9999999999",
    email: null,
    address: "123 MG Road",
    loyaltyPoints: 0,
    source: null,
    gstin: null,
    state: "Karnataka",
    shippingAddress: null,
  },
];

const PRODUCTS: Product[] = [
  {
    id: "p1",
    sku: "SKU-1",
    name: "Chimney X",
    brandId: "b1",
    categoryId: "cat1",
    modelNumber: null,
    description: null,
    price: "1000.00",
    images: [],
    features: [],
    manualUrl: null,
    status: "ACTIVE",
    hsnCode: "8414",
    gstRate: "18",
  },
];

const COMPANY_SETTINGS: CompanySettings = {
  legalName: "DreamHome",
  gstin: null,
  address: null,
  city: null,
  state: "Karnataka",
  pincode: null,
  phone: null,
  email: null,
  website: null,
  logoUrl: null,
  bankAccountName: null,
  bankAccountNumber: null,
  bankIfsc: null,
  bankName: null,
  bankBranch: null,
  defaultTermsAndConditions: null,
  defaultNotes: null,
};

function renderQuoteForm() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <QuoteForm />
    </QueryClientProvider>,
  );
}

/** Finds the per-line-item product <select> (as opposed to the customer/B2B/place-of-supply
 *  selects elsewhere on the form) by the fact that only it lists the fixture product as an option. */
function getProductSelect(): HTMLSelectElement {
  const selects = screen.getAllByRole("combobox");
  const found = selects.find((el) => within(el).queryByText("Chimney X"));
  if (!found) throw new Error("Could not find the item product <select>");
  return found as HTMLSelectElement;
}

function getPlaceOfSupplySelect(): HTMLSelectElement {
  return screen.getByText("Select state").closest("select") as HTMLSelectElement;
}

beforeEach(() => {
  apiGetMock.mockReset();
  apiGetMock.mockImplementation((path: string) => {
    switch (path) {
      case "/crm/customers":
        return Promise.resolve(CUSTOMERS);
      case "/crm/b2b-accounts":
        return Promise.resolve([]);
      case "/inventory/products":
        return Promise.resolve(PRODUCTS);
      case "/settings/company":
        return Promise.resolve(COMPANY_SETTINGS);
      default:
        return Promise.reject(new Error(`Unexpected api.get call: ${path}`));
    }
  });
});

describe("QuoteForm", () => {
  it("renders the core sections once data has loaded (smoke test)", async () => {
    renderQuoteForm();
    expect(await screen.findByText("Chimney X")).toBeInTheDocument();
    expect(screen.getByText("Alice Sharma (9999999999)")).toBeInTheDocument();
    expect(screen.getByText("Sub Total")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save Quote" })).toBeInTheDocument();
  });

  it("selecting a product fills in the HSN code and unit rate for that line", async () => {
    renderQuoteForm();
    await screen.findByText("Chimney X");

    const productSelect = getProductSelect();
    fireEvent.change(productSelect, { target: { value: "p1" } });

    const row = productSelect.closest("tr") as HTMLTableRowElement;
    expect(within(row).getByText("8414")).toBeInTheDocument();

    const [, rateInput] = within(row).getAllByRole("spinbutton");
    expect(rateInput).toHaveValue(1000);
  });

  it("changing quantity recalculates the line amount and the grand total", async () => {
    renderQuoteForm();
    await screen.findByText("Chimney X");

    const productSelect = getProductSelect();
    fireEvent.change(productSelect, { target: { value: "p1" } });
    const row = productSelect.closest("tr") as HTMLTableRowElement;

    // qty=1, rate=1000, GST 18% intra-state (9% CGST + 9% SGST) -> taxable 1000, total 1180.
    expect(within(row).getByText("₹1,000.00")).toBeInTheDocument();
    expect(screen.getByText("₹1,180.00")).toBeInTheDocument();

    const [qtyInput] = within(row).getAllByRole("spinbutton");
    fireEvent.change(qtyInput, { target: { value: "3" } });

    // qty=3 -> taxable 3000, CGST+SGST 540 -> total 3540.
    expect(within(row).getByText("₹3,000.00")).toBeInTheDocument();
    expect(screen.getByText("₹3,540.00")).toBeInTheDocument();
  });

  it("shows CGST+SGST columns for intra-state and switches to a single IGST column inter-state", async () => {
    renderQuoteForm();
    await screen.findByText("Chimney X");

    // No place of supply selected yet -> defaults to intra-state (same rule as the backend).
    // "CGST"/"SGST" each appear twice: once as a table column header, once as a totals-summary label.
    expect(screen.getAllByText("CGST").length).toBeGreaterThan(0);
    expect(screen.getAllByText("SGST").length).toBeGreaterThan(0);
    expect(screen.queryByText("IGST")).not.toBeInTheDocument();

    const placeSelect = getPlaceOfSupplySelect();
    fireEvent.change(placeSelect, { target: { value: "Delhi" } });

    expect(screen.queryByText("CGST")).not.toBeInTheDocument();
    expect(screen.queryByText("SGST")).not.toBeInTheDocument();
    expect(screen.getAllByText("IGST").length).toBeGreaterThan(0);
  });

  it("switches back to CGST+SGST when the place of supply matches the company's state", async () => {
    renderQuoteForm();
    await screen.findByText("Chimney X");

    const placeSelect = getPlaceOfSupplySelect();
    fireEvent.change(placeSelect, { target: { value: "Delhi" } });
    expect(screen.getAllByText("IGST").length).toBeGreaterThan(0);

    fireEvent.change(placeSelect, { target: { value: "Karnataka" } });
    expect(screen.queryByText("IGST")).not.toBeInTheDocument();
    expect(screen.getAllByText("CGST").length).toBeGreaterThan(0);
    expect(screen.getAllByText("SGST").length).toBeGreaterThan(0);
  });
});
