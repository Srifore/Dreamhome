import { Test } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { InvoicesService } from "../invoices/invoices.service";
import { PaymentsService } from "./payments.service";
import { createPrismaMock, type PrismaMock } from "../../test-utils/prisma-mock";
import type { CreatePaymentDto } from "./dto/create-payment.dto";

describe("PaymentsService", () => {
  let service: PaymentsService;
  let prisma: PrismaMock;
  let invoicesService: { recomputeStatus: jest.Mock };

  beforeEach(async () => {
    prisma = createPrismaMock();
    invoicesService = { recomputeStatus: jest.fn().mockResolvedValue(undefined) };
    prisma.$transaction.mockImplementation((cb: any) => cb(prisma));

    const moduleRef = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: InvoicesService, useValue: invoicesService },
      ],
    }).compile();
    service = moduleRef.get(PaymentsService);
  });

  it("throws NotFoundException for a payment against a nonexistent invoice", async () => {
    prisma.invoice.findUnique.mockResolvedValue(null);

    await expect(
      service.create({ invoiceId: "missing", amount: 100, method: "CASH" } as CreatePaymentDto, "user-1"),
    ).rejects.toThrow(NotFoundException);
  });

  it("rejects a payment that would exceed the outstanding balance", async () => {
    prisma.invoice.findUnique.mockResolvedValue({ amount: 1000, payments: [{ amount: 600 }] });

    await expect(
      service.create({ invoiceId: "inv-1", amount: 500, method: "CASH" } as CreatePaymentDto, "user-1"),
    ).rejects.toThrow(BadRequestException);
  });

  it("accepts a payment that exactly matches the outstanding balance", async () => {
    prisma.invoice.findUnique.mockResolvedValue({ amount: 1000, payments: [{ amount: 600 }] });
    prisma.payment.create.mockResolvedValue({ id: "pay-1", amount: 400 });

    const result = await service.create(
      { invoiceId: "inv-1", amount: 400, method: "CASH" } as CreatePaymentDto,
      "user-1",
    );

    expect(result).toEqual({ id: "pay-1", amount: 400 });
  });

  it("records the payment and recomputes the invoice status atomically", async () => {
    prisma.invoice.findUnique.mockResolvedValue({ amount: 1000, payments: [] });
    prisma.payment.create.mockResolvedValue({ id: "pay-1", amount: 1000 });

    await service.create({ invoiceId: "inv-1", amount: 1000, method: "UPI" } as CreatePaymentDto, "user-1");

    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ invoiceId: "inv-1", amount: 1000, method: "UPI", recordedById: "user-1" }),
    });
    expect(invoicesService.recomputeStatus).toHaveBeenCalledWith("inv-1", prisma);
  });
});
