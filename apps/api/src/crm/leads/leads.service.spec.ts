import { Test } from "@nestjs/testing";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { LeadStage } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { LeadsService } from "./leads.service";
import { createPrismaMock, type PrismaMock } from "../../test-utils/prisma-mock";
import type { CreateLeadDto } from "./dto/create-lead.dto";

describe("LeadsService", () => {
  let service: LeadsService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const moduleRef = await Test.createTestingModule({
      providers: [LeadsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(LeadsService);
  });

  describe("create", () => {
    it("rejects assigning a lead to an inactive user", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "u1", isActive: false });
      await expect(
        service.create({ name: "Lead", phone: "123", assignedToId: "u1" } as CreateLeadDto),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects assigning a lead to a nonexistent user", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(
        service.create({ name: "Lead", phone: "123", assignedToId: "missing" } as CreateLeadDto),
      ).rejects.toThrow(BadRequestException);
    });

    it("creates a lead for an active assignee", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "u1", isActive: true });
      prisma.lead.create.mockResolvedValue({ id: "lead-1" });
      const result = await service.create({ name: "Lead", phone: "123", assignedToId: "u1" } as CreateLeadDto);
      expect(result).toEqual({ id: "lead-1" });
    });
  });

  describe("update", () => {
    it("clears nextFollowUpAt when the stage is closed out as WON", async () => {
      prisma.lead.findUnique.mockResolvedValue({ id: "lead-1" });
      prisma.lead.update.mockImplementation(({ data }: any) => data);

      const result = await service.update("lead-1", { stage: LeadStage.WON, nextFollowUpAt: "2026-08-01" });

      expect(result.nextFollowUpAt).toBeNull();
    });

    it("clears nextFollowUpAt when the stage is closed out as LOST", async () => {
      prisma.lead.findUnique.mockResolvedValue({ id: "lead-1" });
      prisma.lead.update.mockImplementation(({ data }: any) => data);

      const result = await service.update("lead-1", { stage: LeadStage.LOST, nextFollowUpAt: "2026-08-01" });

      expect(result.nextFollowUpAt).toBeNull();
    });

    it("converts a provided follow-up date to a real Date for a still-open stage", async () => {
      prisma.lead.findUnique.mockResolvedValue({ id: "lead-1" });
      prisma.lead.update.mockImplementation(({ data }: any) => data);

      const result = await service.update("lead-1", {
        stage: LeadStage.CONTACTED,
        nextFollowUpAt: "2026-08-01",
      });

      expect(result.nextFollowUpAt).toBeInstanceOf(Date);
    });

    it("leaves nextFollowUpAt untouched when not provided for an open stage", async () => {
      prisma.lead.findUnique.mockResolvedValue({ id: "lead-1" });
      prisma.lead.update.mockImplementation(({ data }: any) => data);

      const result = await service.update("lead-1", { stage: LeadStage.CONTACTED });

      expect(result.nextFollowUpAt).toBeUndefined();
    });

    it("throws NotFoundException for a missing lead", async () => {
      prisma.lead.findUnique.mockResolvedValue(null);
      await expect(service.update("missing", {})).rejects.toThrow(NotFoundException);
    });
  });

  describe("convertToCustomer", () => {
    it("rejects converting a lead that's already linked to a customer", async () => {
      prisma.lead.findUnique.mockResolvedValue({ id: "lead-1", customerId: "cust-1" });
      await expect(service.convertToCustomer("lead-1")).rejects.toThrow(ConflictException);
    });

    it("links to an existing customer with the same phone rather than creating a duplicate", async () => {
      prisma.lead.findUnique.mockResolvedValue({
        id: "lead-1",
        customerId: null,
        phone: "+91 9900000000",
        name: "Lead Name",
        email: null,
        source: "Website",
      });
      prisma.customer.findUnique.mockResolvedValue({ id: "existing-cust" });
      prisma.lead.update.mockImplementation(({ data }: any) => ({ ...data }));

      const result = await service.convertToCustomer("lead-1");

      expect(prisma.customer.create).not.toHaveBeenCalled();
      expect(result.customerId).toBe("existing-cust");
      expect(result.stage).toBe(LeadStage.WON);
      expect(result.nextFollowUpAt).toBeNull();
    });

    it("creates a new customer when no phone match exists", async () => {
      prisma.lead.findUnique.mockResolvedValue({
        id: "lead-1",
        customerId: null,
        phone: "+91 9911122233",
        name: "Fresh Lead",
        email: "fresh@x.com",
        source: "Referral",
      });
      prisma.customer.findUnique.mockResolvedValue(null);
      prisma.customer.create.mockResolvedValue({ id: "new-cust" });
      prisma.lead.update.mockImplementation(({ data }: any) => ({ ...data }));

      const result = await service.convertToCustomer("lead-1");

      expect(prisma.customer.create).toHaveBeenCalledWith({
        data: { name: "Fresh Lead", phone: "+91 9911122233", email: "fresh@x.com", source: "Referral" },
      });
      expect(result.customerId).toBe("new-cust");
    });
  });
});
