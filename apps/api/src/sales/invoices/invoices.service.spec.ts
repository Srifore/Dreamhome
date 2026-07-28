import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { InvoiceStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { InvoicesService } from "./invoices.service";
import { createPrismaMock, type PrismaMock } from "../../test-utils/prisma-mock";

describe("InvoicesService", () => {
  let service: InvoicesService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const moduleRef = await Test.createTestingModule({
      providers: [InvoicesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(InvoicesService);
  });

  describe("findOne", () => {
    it("throws NotFoundException when the invoice doesn't exist", async () => {
      prisma.invoice.findUnique.mockResolvedValue(null);
      await expect(service.findOne("missing")).rejects.toThrow(NotFoundException);
    });
  });

  describe("recomputeStatus", () => {
    it("marks PAID when payments cover the full amount", async () => {
      prisma.invoice.findUniqueOrThrow.mockResolvedValue({
        amount: 1000,
        dueDate: new Date(Date.now() + 86400000),
        payments: [{ amount: 600 }, { amount: 400 }],
      });

      await service.recomputeStatus("inv-1");

      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: "inv-1" },
        data: { status: InvoiceStatus.PAID },
      });
    });

    it("marks PARTIALLY_PAID when some but not all has been paid", async () => {
      prisma.invoice.findUniqueOrThrow.mockResolvedValue({
        amount: 1000,
        dueDate: new Date(Date.now() + 86400000),
        payments: [{ amount: 400 }],
      });

      await service.recomputeStatus("inv-1");

      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: "inv-1" },
        data: { status: InvoiceStatus.PARTIALLY_PAID },
      });
    });

    it("marks OVERDUE when nothing has been paid and the due date has passed", async () => {
      prisma.invoice.findUniqueOrThrow.mockResolvedValue({
        amount: 1000,
        dueDate: new Date(Date.now() - 86400000),
        payments: [],
      });

      await service.recomputeStatus("inv-1");

      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: "inv-1" },
        data: { status: InvoiceStatus.OVERDUE },
      });
    });

    it("marks UNPAID when nothing has been paid and the due date hasn't passed", async () => {
      prisma.invoice.findUniqueOrThrow.mockResolvedValue({
        amount: 1000,
        dueDate: new Date(Date.now() + 86400000),
        payments: [],
      });

      await service.recomputeStatus("inv-1");

      expect(prisma.invoice.update).toHaveBeenCalledWith({
        where: { id: "inv-1" },
        data: { status: InvoiceStatus.UNPAID },
      });
    });

    it("uses the supplied transaction client instead of the default prisma instance when given", async () => {
      const tx = createPrismaMock();
      tx.invoice.findUniqueOrThrow.mockResolvedValue({
        amount: 1000,
        dueDate: new Date(Date.now() + 86400000),
        payments: [],
      });

      await service.recomputeStatus("inv-1", tx as any);

      expect(tx.invoice.update).toHaveBeenCalled();
      expect(prisma.invoice.update).not.toHaveBeenCalled();
    });
  });
});
