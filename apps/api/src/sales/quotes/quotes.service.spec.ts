import { Test } from "@nestjs/testing";
import { BadGatewayException, BadRequestException, NotFoundException } from "@nestjs/common";
import { QuoteStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CompanySettingsService } from "../../company-settings/company-settings.service";
import { WhatsAppService } from "../../whatsapp/whatsapp.service";
import { QuotesService } from "./quotes.service";
import { createPrismaMock, type PrismaMock } from "../../test-utils/prisma-mock";
import type { CreateQuoteDto } from "./dto/create-quote.dto";

describe("QuotesService", () => {
  let service: QuotesService;
  let prisma: PrismaMock;
  let companySettingsService: { get: jest.Mock; getState: jest.Mock };
  let whatsAppService: { sendMessage: jest.Mock };

  const baseItem = { productId: "prod-1", quantity: 1, unitPrice: 45000, discount: 0 };

  beforeEach(async () => {
    prisma = createPrismaMock();
    companySettingsService = { get: jest.fn(), getState: jest.fn() };
    whatsAppService = { sendMessage: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        QuotesService,
        { provide: PrismaService, useValue: prisma },
        { provide: CompanySettingsService, useValue: companySettingsService },
        { provide: WhatsAppService, useValue: whatsAppService },
      ],
    }).compile();

    service = moduleRef.get(QuotesService);

    prisma.product.findMany.mockResolvedValue([{ id: "prod-1", hsnCode: "841510", gstRate: 28 }]);
    prisma.quote.findFirst.mockResolvedValue(null);
    companySettingsService.getState.mockResolvedValue(null);
  });

  describe("create", () => {
    it("rejects a quote with no customer, b2b account, or new-customer payload", async () => {
      await expect(
        service.create({ items: [baseItem] } as CreateQuoteDto, "user-1"),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects duplicate product lines", async () => {
      await expect(
        service.create(
          { customerId: "cust-1", items: [baseItem, baseItem] } as CreateQuoteDto,
          "user-1",
        ),
      ).rejects.toThrow("Each product can only appear once per quote");
    });

    it("computes intra-state CGST+SGST when place of supply matches the company's state", async () => {
      prisma.customer.findUnique.mockResolvedValue({ state: "Karnataka", shippingAddress: null, address: null });
      companySettingsService.getState.mockResolvedValue("Karnataka");
      prisma.quote.create.mockImplementation(({ data }: any) => ({ ...data, items: data.items.create }));

      const result = await service.create(
        { customerId: "cust-1", items: [{ ...baseItem, quantity: 1, unitPrice: 45000 }] } as CreateQuoteDto,
        "user-1",
      );

      // 45000 @ 28% -> 12600 total tax, split 6300/6300
      expect(result.cgstTotal).toBe(6300);
      expect(result.sgstTotal).toBe(6300);
      expect(result.igstTotal).toBe(0);
      expect(result.total).toBe(57600);
    });

    it("computes inter-state IGST when place of supply differs from the company's state", async () => {
      prisma.customer.findUnique.mockResolvedValue({ state: "Maharashtra", shippingAddress: null, address: null });
      companySettingsService.getState.mockResolvedValue("Karnataka");
      prisma.quote.create.mockImplementation(({ data }: any) => ({ ...data, items: data.items.create }));

      const result = await service.create(
        { customerId: "cust-1", items: [{ ...baseItem, quantity: 1, unitPrice: 45000 }] } as CreateQuoteDto,
        "user-1",
      );

      expect(result.cgstTotal).toBe(0);
      expect(result.sgstTotal).toBe(0);
      expect(result.igstTotal).toBe(12600);
      expect(result.total).toBe(57600);
    });

    it("defaults to intra-state when the company's own state is not configured", async () => {
      prisma.customer.findUnique.mockResolvedValue({ state: "Maharashtra", shippingAddress: null, address: null });
      companySettingsService.getState.mockResolvedValue(null);
      prisma.quote.create.mockImplementation(({ data }: any) => ({ ...data, items: data.items.create }));

      const result = await service.create(
        { customerId: "cust-1", items: [{ ...baseItem, quantity: 1, unitPrice: 45000 }] } as CreateQuoteDto,
        "user-1",
      );

      expect(result.igstTotal).toBe(0);
      expect(result.cgstTotal).toBeGreaterThan(0);
    });

    it("rounds the total to the nearest rupee and records the rounding delta", async () => {
      prisma.customer.findUnique.mockResolvedValue({ state: null, shippingAddress: null, address: null });
      companySettingsService.getState.mockResolvedValue(null);
      prisma.product.findMany.mockResolvedValue([{ id: "prod-1", hsnCode: "853400", gstRate: 9 }]);
      prisma.quote.create.mockImplementation(({ data }: any) => ({ ...data, items: data.items.create }));

      // 1920 @ 9% intra-state -> cgst 86.4, sgst 86.4 -> raw total 2092.8
      const result = await service.create(
        { customerId: "cust-1", items: [{ ...baseItem, quantity: 1, unitPrice: 1920 }] } as CreateQuoteDto,
        "user-1",
      );

      expect(result.total).toBe(2093);
      expect(result.roundingAdjustment).toBeCloseTo(0.2, 5);
    });

    it("derives the next quote number from the highest existing number, not a row count", async () => {
      prisma.customer.findUnique.mockResolvedValue({ state: null, shippingAddress: null, address: null });
      prisma.quote.findFirst.mockResolvedValue({ quoteNumber: "Q-000007" });
      prisma.quote.create.mockImplementation(({ data }: any) => ({ ...data, items: data.items.create }));

      const result = await service.create(
        { customerId: "cust-1", items: [baseItem] } as CreateQuoteDto,
        "user-1",
      );

      expect(result.quoteNumber).toBe("Q-000008");
    });

    it("starts numbering at Q-000001 when no quotes exist yet", async () => {
      prisma.customer.findUnique.mockResolvedValue({ state: null, shippingAddress: null, address: null });
      prisma.quote.findFirst.mockResolvedValue(null);
      prisma.quote.create.mockImplementation(({ data }: any) => ({ ...data, items: data.items.create }));

      const result = await service.create(
        { customerId: "cust-1", items: [baseItem] } as CreateQuoteDto,
        "user-1",
      );

      expect(result.quoteNumber).toBe("Q-000001");
    });

    it("reuses an existing customer by phone instead of creating a duplicate", async () => {
      prisma.customer.findUnique.mockImplementation(({ where }: any) =>
        where.phone ? { id: "existing-cust", state: null, shippingAddress: null, address: null } : null,
      );
      prisma.quote.create.mockImplementation(({ data }: any) => ({ ...data, items: data.items.create }));

      const result = await service.create(
        {
          newCustomer: { name: "Walk-in", phone: "+91 9900000000" },
          items: [baseItem],
        } as CreateQuoteDto,
        "user-1",
      );

      expect(prisma.customer.create).not.toHaveBeenCalled();
      expect(result.customerId).toBe("existing-cust");
    });

    it("creates a brand-new customer with GSTIN/state when no existing phone match is found", async () => {
      prisma.customer.findUnique.mockImplementation(({ where }: any) => {
        if (where.phone) return null; // no existing customer by phone
        return { state: "Karnataka", shippingAddress: null, address: null }; // resolvePlaceOfSupplyState lookup
      });
      prisma.customer.create.mockResolvedValue({ id: "new-cust-1" });
      prisma.quote.create.mockImplementation(({ data }: any) => ({ ...data, items: data.items.create }));

      const result = await service.create(
        {
          newCustomer: {
            name: "New Walk-in",
            phone: "+91 9900011122",
            gstin: "29ABCDE1234F1Z5",
            state: "Karnataka",
          },
          items: [baseItem],
        } as CreateQuoteDto,
        "user-1",
      );

      expect(prisma.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: "New Walk-in",
          phone: "+91 9900011122",
          gstin: "29ABCDE1234F1Z5",
          state: "Karnataka",
        }),
      });
      expect(result.customerId).toBe("new-cust-1");
    });

    it("applies a GSTIN override to an existing customer as a side effect of creating the quote", async () => {
      prisma.customer.findUnique.mockResolvedValue({ state: null, shippingAddress: null, address: null });
      prisma.quote.create.mockImplementation(({ data }: any) => ({ ...data, items: data.items.create }));

      await service.create(
        { customerId: "cust-1", customerGstin: "29TESTGSTIN1Z5", items: [baseItem] } as CreateQuoteDto,
        "user-1",
      );

      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { id: "cust-1" },
        data: { gstin: "29TESTGSTIN1Z5" },
      });
    });

    it("clears a customer's GSTIN when an empty override is explicitly sent", async () => {
      prisma.customer.findUnique.mockResolvedValue({ state: null, shippingAddress: null, address: null });
      prisma.quote.create.mockImplementation(({ data }: any) => ({ ...data, items: data.items.create }));

      await service.create(
        { customerId: "cust-1", customerGstin: "   ", items: [baseItem] } as CreateQuoteDto,
        "user-1",
      );

      expect(prisma.customer.update).toHaveBeenCalledWith({
        where: { id: "cust-1" },
        data: { gstin: null },
      });
    });

    it("falls back to the customer's billing address when no shipping address is on file", async () => {
      prisma.customer.findUnique.mockResolvedValue({
        state: null,
        shippingAddress: null,
        address: "123 Billing St",
      });
      prisma.quote.create.mockImplementation(({ data }: any) => ({ ...data, items: data.items.create }));

      const result = await service.create(
        { customerId: "cust-1", items: [baseItem] } as CreateQuoteDto,
        "user-1",
      );

      expect(result.shippingAddress).toBe("123 Billing St");
    });

    it("defaults templateId to 'standard' when none is provided", async () => {
      prisma.customer.findUnique.mockResolvedValue({ state: null, shippingAddress: null, address: null });
      prisma.quote.create.mockImplementation(({ data }: any) => ({ ...data, items: data.items.create }));

      const result = await service.create(
        { customerId: "cust-1", items: [baseItem] } as CreateQuoteDto,
        "user-1",
      );

      expect(result.templateId).toBe("standard");
    });
  });

  describe("update", () => {
    it("throws if the quote is not in an editable status", async () => {
      prisma.quote.findUnique.mockResolvedValue({ id: "q1", status: QuoteStatus.ACCEPTED });

      await expect(
        service.update("q1", { customerId: "cust-1", items: [baseItem] } as CreateQuoteDto),
      ).rejects.toThrow(BadRequestException);
    });

    it("allows editing a DRAFT quote and recomputes totals", async () => {
      prisma.quote.findUnique.mockResolvedValue({ id: "q1", status: QuoteStatus.DRAFT });
      prisma.customer.findUnique.mockResolvedValue({ state: null, shippingAddress: null, address: null });
      prisma.quote.update.mockImplementation(({ data }: any) => ({ ...data, items: data.items.create }));

      const result = await service.update("q1", {
        customerId: "cust-1",
        items: [{ ...baseItem, quantity: 2 }],
      } as CreateQuoteDto);

      expect(prisma.quote.update).toHaveBeenCalled();
      expect(result.subtotal).toBe(90000);
    });
  });

  describe("remove", () => {
    it("blocks deleting a quote that's already been confirmed into a sales order", async () => {
      prisma.quote.findUnique.mockResolvedValue({ id: "q1", salesOrder: { id: "so-1" } });

      await expect(service.remove("q1")).rejects.toThrow(
        "Cannot delete a quote that has already been confirmed as a sales order",
      );
      expect(prisma.quote.delete).not.toHaveBeenCalled();
    });

    it("deletes a quote with no linked sales order", async () => {
      prisma.quote.findUnique.mockResolvedValue({ id: "q1", salesOrder: null });

      await service.remove("q1");

      expect(prisma.quote.delete).toHaveBeenCalledWith({ where: { id: "q1" } });
    });

    it("throws NotFoundException for a quote id that doesn't exist", async () => {
      prisma.quote.findUnique.mockResolvedValue(null);

      await expect(service.remove("missing")).rejects.toThrow(NotFoundException);
    });
  });

  describe("sendViaWhatsApp", () => {
    it("throws when neither the customer nor any B2B contact has a phone number on file", async () => {
      prisma.quote.findUnique.mockResolvedValue({
        id: "q1",
        customer: { phone: null },
        b2bAccount: null,
        items: [],
      });

      await expect(service.sendViaWhatsApp("q1")).rejects.toThrow(
        "No phone number on file for this quote's customer or account",
      );
    });

    it("falls back to the B2B account's first contact with a phone number", async () => {
      prisma.quote.findUnique.mockResolvedValue({
        id: "q1",
        quoteNumber: "Q-000001",
        customer: null,
        b2bAccount: {
          name: "Acme Corp",
          contacts: [{ phone: null }, { phone: "+91 9900000000" }],
        },
        items: [],
        total: 1000,
        validUntil: null,
      });
      companySettingsService.get.mockResolvedValue({ legalName: "DreamHome", phone: null });

      const result = await service.sendViaWhatsApp("q1");

      expect(whatsAppService.sendMessage).toHaveBeenCalledWith("+91 9900000000", expect.any(String));
      expect(result).toEqual({ sent: true });
    });

    it("wraps a WhatsApp delivery failure in a BadGatewayException with a clear message", async () => {
      prisma.quote.findUnique.mockResolvedValue({
        id: "q1",
        quoteNumber: "Q-000001",
        customer: { name: "Ananya", phone: "+91 9900011122" },
        b2bAccount: null,
        items: [],
        total: 1000,
        validUntil: null,
      });
      companySettingsService.get.mockResolvedValue({ legalName: "DreamHome", phone: null });
      whatsAppService.sendMessage.mockRejectedValue(new Error("Malformed access token"));

      await expect(service.sendViaWhatsApp("q1")).rejects.toThrow(BadGatewayException);
      await expect(service.sendViaWhatsApp("q1")).rejects.toThrow(/Malformed access token/);
    });
  });
});
