import { Test } from "@nestjs/testing";
import { LeadStage, ReviewRequestStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SettingsService } from "../settings/settings.service";
import { AutoReplyService } from "./auto-reply.service";
import { AiChatService } from "./ai-chat.service";
import { createPrismaMock, type PrismaMock } from "../test-utils/prisma-mock";

describe("AutoReplyService", () => {
  let service: AutoReplyService;
  let prisma: PrismaMock;
  let settingsService: { getDecryptedConfig: jest.Mock };
  let aiChatService: { reply: jest.Mock };

  beforeEach(async () => {
    prisma = createPrismaMock();
    settingsService = { getDecryptedConfig: jest.fn().mockRejectedValue(new Error("AI not configured")) };
    aiChatService = { reply: jest.fn() };

    // No known customer and no prior lead by default — most tests override selectively.
    prisma.customer.findMany.mockResolvedValue([]);
    prisma.lead.findMany.mockResolvedValue([]);
    prisma.user.findFirst.mockResolvedValue({ id: "owner-1" });
    prisma.lead.create.mockResolvedValue({ id: "lead-1" });
    prisma.product.findMany.mockResolvedValue([]);
    prisma.brand.findMany.mockResolvedValue([]);

    const moduleRef = await Test.createTestingModule({
      providers: [
        AutoReplyService,
        { provide: PrismaService, useValue: prisma },
        { provide: SettingsService, useValue: settingsService },
        { provide: AiChatService, useValue: aiChatService },
      ],
    }).compile();
    service = moduleRef.get(AutoReplyService);
  });

  describe("greeting and menu shortcuts", () => {
    it("replies with the menu for a greeting", async () => {
      const result = await service.generateReply("+919900000001", "hi");
      expect(result.replyText).toContain("Welcome to DreamHome");
    });

    it("routes '4' straight to the human-agent escalation, updating the lead's stage", async () => {
      const result = await service.generateReply("+919900000001", "4");
      expect(result.replyText).toContain("team members will reach out");
      expect(prisma.lead.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ stage: LeadStage.CONTACTED }) }),
      );
    });
  });

  describe("new-lead creation", () => {
    it("creates a lead assigned to the earliest active user on first contact", async () => {
      await service.generateReply("+919900000002", "hi", "New Contact");

      expect(prisma.lead.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ name: "New Contact", phone: "+919900000002", source: "WhatsApp", assignedToId: "owner-1" }),
      });
    });

    it("reuses the existing lead instead of creating a duplicate for a returning phone number", async () => {
      prisma.lead.findMany.mockResolvedValue([{ id: "existing-lead", phone: "+919900000003" }]);

      await service.generateReply("+919900000003", "hi");

      expect(prisma.lead.create).not.toHaveBeenCalled();
    });

    it("throws a clear error when there's no active staff account to assign a brand-new lead to", async () => {
      prisma.user.findFirst.mockResolvedValue(null);
      await expect(service.generateReply("+919900000004", "hi")).rejects.toThrow(/no active staff account/);
    });
  });

  describe("post-purchase review check-in", () => {
    const customer = { id: "cust-1", name: "Ananya", phone: "+919900000005" };
    const purchasedUnit = {
      id: "unit-1",
      productId: "prod-1",
      product: { name: "Designer Chimney", brand: { name: "Faber" } },
      customer,
    };

    beforeEach(() => {
      prisma.customer.findMany.mockResolvedValue([customer]);
      prisma.productUnit.findFirst.mockResolvedValue(purchasedUnit);
    });

    it("asks for feedback and creates a REQUESTED review on the first message after a purchase", async () => {
      prisma.productReview.findUnique.mockResolvedValue(null);

      const result = await service.generateReply(customer.phone, "hello there");

      expect(prisma.productReview.create).toHaveBeenCalledWith({
        data: { customerId: "cust-1", productId: "prod-1", productUnitId: "unit-1" },
      });
      expect(result.replyText).toContain("Faber Designer Chimney");
    });

    it("captures the next free-text reply as feedback, including a 1-5 star rating", async () => {
      prisma.productReview.findUnique.mockResolvedValue({ id: "rev-1", status: ReviewRequestStatus.REQUESTED });

      const result = await service.generateReply(customer.phone, "5");

      expect(prisma.productReview.update).toHaveBeenCalledWith({
        where: { id: "rev-1" },
        data: expect.objectContaining({ status: ReviewRequestStatus.RECEIVED, rating: 5, comment: "5" }),
      });
      expect(result.replyText).toContain("Thank you");
    });

    it("does not swallow a clear routing command (e.g. 'menu') as review feedback", async () => {
      prisma.productReview.findUnique.mockResolvedValue({ id: "rev-1", status: ReviewRequestStatus.REQUESTED });

      const result = await service.generateReply(customer.phone, "menu");

      expect(prisma.productReview.update).not.toHaveBeenCalled();
      expect(result.replyText).toContain("Welcome to DreamHome");
    });

    it("proceeds to normal routing once a review has already been RECEIVED", async () => {
      prisma.productReview.findUnique.mockResolvedValue({ id: "rev-1", status: ReviewRequestStatus.RECEIVED });

      const result = await service.generateReply(customer.phone, "hi");

      expect(prisma.productReview.update).not.toHaveBeenCalled();
      expect(result.replyText).toContain("Welcome to DreamHome");
    });
  });

  describe("order status lookup", () => {
    it("asks for identifying details when the phone number isn't linked to any customer", async () => {
      const result = await service.generateReply("+919900000006", "2");
      expect(result.replyText).toContain("couldn't find any orders");
    });

    it("summarizes the latest order and invoice status for a known customer", async () => {
      prisma.customer.findMany.mockResolvedValue([{ id: "cust-1", phone: "+919900000007" }]);
      prisma.salesOrder.findFirst.mockResolvedValue({
        orderNumber: "SO-000001",
        status: "CONFIRMED",
        invoice: { invoiceNumber: "INV-000001", status: "UNPAID" },
      });
      prisma.serviceTicket.findFirst.mockResolvedValue(null);

      const result = await service.generateReply("+919900000007", "2");

      expect(result.replyText).toContain("SO-000001: CONFIRMED");
      expect(result.replyText).toContain("INV-000001: UNPAID");
    });
  });

  describe("service request via serial number", () => {
    it("logs a service ticket when the message contains a recognizable serial number", async () => {
      prisma.productUnit.findUnique.mockResolvedValue({ id: "unit-1", customerId: "cust-1" });

      const result = await service.generateReply("+919900000008", "My unit FAB-SN0001 has an issue");

      expect(prisma.serviceTicket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ productUnitId: "unit-1", customerId: "cust-1" }),
        }),
      );
      expect(result.replyText).toContain("logged a service request");
    });

    it("asks for the serial number when the message mentions service but none can be found", async () => {
      const result = await service.generateReply("+919900000009", "need repair for my chimney");
      expect(result.replyText).toContain("serial number");
      expect(prisma.serviceTicket.create).not.toHaveBeenCalled();
    });
  });

  describe("AI chat fallback", () => {
    it("falls back to rule-based product matching when AI chat is unavailable", async () => {
      settingsService.getDecryptedConfig.mockRejectedValue(new Error("not configured"));
      prisma.product.findMany.mockResolvedValue([]);
      prisma.brand.findMany.mockResolvedValue([{ name: "Faber" }, { name: "Bosch" }]);

      const result = await service.generateReply("+919900000010", "what's in your product catalog");

      expect(result.replyText).toContain("Faber, Bosch");
    });

    it("uses the AI reply when the integration is configured and responds successfully", async () => {
      settingsService.getDecryptedConfig.mockResolvedValue({ apiKey: "sk-key" });
      prisma.interaction.findMany.mockResolvedValue([]);
      aiChatService.reply.mockResolvedValue("Sure, here's a great option for your kitchen!");

      const result = await service.generateReply("+919900000011", "what's a good chimney for a small kitchen");

      expect(result.replyText).toBe("Sure, here's a great option for your kitchen!");
    });
  });
});
