import { Test } from "@nestjs/testing";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { QuoteStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { StockService } from "../../inventory/stock/stock.service";
import { ProductUnitsService } from "../../inventory/product-units/product-units.service";
import { DomainEvents } from "../../common/events/domain-events";
import { SalesOrdersService } from "./sales-orders.service";
import { createPrismaMock, type PrismaMock } from "../../test-utils/prisma-mock";
import type { CreateSalesOrderDto } from "./dto/create-sales-order.dto";

describe("SalesOrdersService", () => {
  let service: SalesOrdersService;
  let prisma: PrismaMock;
  let stockService: { adjust: jest.Mock };
  let productUnitsService: { createForSale: jest.Mock };
  let events: { emit: jest.Mock };

  const quote = {
    id: "quote-1",
    status: QuoteStatus.SENT,
    customerId: "cust-1",
    b2bAccountId: null,
    subtotal: 45000,
    discount: 0,
    total: 57600,
    placeOfSupplyState: "Karnataka",
    shippingAddress: null,
    notes: null,
    termsAndConditions: null,
    cgstTotal: 6300,
    sgstTotal: 6300,
    igstTotal: 0,
    roundingAdjustment: 0,
    salesOrder: null,
    items: [
      {
        productId: "prod-1",
        quantity: 1,
        unitPrice: 45000,
        discount: 0,
        hsnCode: "841510",
        gstRate: 28,
        cgstAmount: 6300,
        sgstAmount: 6300,
        igstAmount: 0,
      },
    ],
  };

  const dto: CreateSalesOrderDto = {
    quoteId: "quote-1",
    branchId: "branch-1",
    itemSerials: [{ productId: "prod-1", serialNumbers: ["SN-0001"] }],
  };

  beforeEach(async () => {
    prisma = createPrismaMock();
    stockService = { adjust: jest.fn().mockResolvedValue(undefined) };
    productUnitsService = { createForSale: jest.fn().mockResolvedValue(undefined) };
    events = { emit: jest.fn() };

    prisma.$transaction.mockImplementation((cb: any) => cb(prisma));
    prisma.salesOrder.count.mockResolvedValue(0);
    prisma.invoice.count.mockResolvedValue(0);
    prisma.salesOrder.create.mockResolvedValue({ id: "so-1", total: 57600 });
    prisma.salesOrder.findUnique.mockResolvedValue({ id: "so-1", items: [], invoice: {} });

    const moduleRef = await Test.createTestingModule({
      providers: [
        SalesOrdersService,
        { provide: PrismaService, useValue: prisma },
        { provide: StockService, useValue: stockService },
        { provide: ProductUnitsService, useValue: productUnitsService },
        { provide: EventEmitter2, useValue: events },
      ],
    }).compile();

    service = moduleRef.get(SalesOrdersService);
  });

  it("throws NotFoundException when the quote doesn't exist", async () => {
    prisma.quote.findUnique.mockResolvedValue(null);

    await expect(service.create(dto, "user-1")).rejects.toThrow(NotFoundException);
  });

  it("throws ConflictException when the quote has already been converted", async () => {
    prisma.quote.findUnique.mockResolvedValue({ ...quote, salesOrder: { id: "existing-so" } });

    await expect(service.create(dto, "user-1")).rejects.toThrow(ConflictException);
  });

  it("rejects confirming a REJECTED quote", async () => {
    prisma.quote.findUnique.mockResolvedValue({ ...quote, status: QuoteStatus.REJECTED });

    await expect(service.create(dto, "user-1")).rejects.toThrow(BadRequestException);
  });

  it("rejects confirming an EXPIRED quote", async () => {
    prisma.quote.findUnique.mockResolvedValue({ ...quote, status: QuoteStatus.EXPIRED });

    await expect(service.create(dto, "user-1")).rejects.toThrow(BadRequestException);
  });

  it("rejects a quote linked to neither a customer nor a B2B account", async () => {
    prisma.quote.findUnique.mockResolvedValue({ ...quote, customerId: null, b2bAccountId: null });

    await expect(service.create(dto, "user-1")).rejects.toThrow(BadRequestException);
  });

  it("rejects when the serial number count for a line doesn't match its quantity", async () => {
    prisma.quote.findUnique.mockResolvedValue({
      ...quote,
      items: [{ ...quote.items[0], quantity: 2 }],
    });

    await expect(service.create(dto, "user-1")).rejects.toThrow(/Expected 2 serial number/);
  });

  it("decrements stock, mints serialized units, and marks the quote Accepted on success", async () => {
    prisma.quote.findUnique.mockResolvedValue(quote);

    await service.create(dto, "user-1");

    expect(stockService.adjust).toHaveBeenCalledWith("prod-1", "branch-1", -1, prisma);
    expect(productUnitsService.createForSale).toHaveBeenCalledWith(
      expect.objectContaining({ serialNumber: "SN-0001", productId: "prod-1", salesOrderId: "so-1" }),
      prisma,
    );
    expect(prisma.quote.update).toHaveBeenCalledWith({
      where: { id: "quote-1" },
      data: { status: QuoteStatus.ACCEPTED },
    });
  });

  it("carries the quote's GST breakdown over onto the created sales order", async () => {
    prisma.quote.findUnique.mockResolvedValue(quote);

    await service.create(dto, "user-1");

    expect(prisma.salesOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          cgstTotal: 6300,
          sgstTotal: 6300,
          igstTotal: 0,
          placeOfSupplyState: "Karnataka",
          items: {
            create: [
              expect.objectContaining({
                productId: "prod-1",
                hsnCode: "841510",
                gstRate: 28,
                cgstAmount: 6300,
                sgstAmount: 6300,
              }),
            ],
          },
        }),
      }),
    );
  });

  it("creates an invoice due 7 days out, for the order's total", async () => {
    prisma.quote.findUnique.mockResolvedValue(quote);

    await service.create(dto, "user-1");

    expect(prisma.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ invoiceNumber: "INV-000001", salesOrderId: "so-1", amount: 57600 }),
      }),
    );
  });

  it("emits an ORDER_CREATED domain event", async () => {
    prisma.quote.findUnique.mockResolvedValue(quote);

    await service.create(dto, "user-1");

    expect(events.emit).toHaveBeenCalledWith(DomainEvents.ORDER_CREATED, { salesOrderId: "so-1" });
  });

  it("numbers orders SO-000002 after one existing order", async () => {
    prisma.quote.findUnique.mockResolvedValue(quote);
    prisma.salesOrder.count.mockResolvedValue(1);

    await service.create(dto, "user-1");

    expect(prisma.salesOrder.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ orderNumber: "SO-000002" }) }),
    );
  });

  it("findOne throws NotFoundException for a missing order", async () => {
    prisma.salesOrder.findUnique.mockResolvedValue(null);

    await expect(service.findOne("missing")).rejects.toThrow(NotFoundException);
  });
});
