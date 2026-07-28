import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { QuoteStatus, SalesOrderStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { StockService } from "../../inventory/stock/stock.service";
import { ProductUnitsService } from "../../inventory/product-units/product-units.service";
import { DomainEvents, type OrderCreatedEvent } from "../../common/events/domain-events";
import { CreateSalesOrderDto } from "./dto/create-sales-order.dto";

@Injectable()
export class SalesOrdersService {
  constructor(
    private prisma: PrismaService,
    private stockService: StockService,
    private productUnitsService: ProductUnitsService,
    private events: EventEmitter2,
  ) {}

  findAll() {
    return this.prisma.salesOrder.findMany({
      include: { customer: true, b2bAccount: true, items: true, invoice: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        b2bAccount: true,
        branch: true,
        items: { include: { product: true } },
        productUnits: true,
        invoice: { include: { payments: true } },
      },
    });
    if (!order) {
      throw new NotFoundException("Sales order not found");
    }
    return order;
  }

  /** Confirms a Quote into a SalesOrder: decrements stock and mints serialized ProductUnits atomically. */
  async create(dto: CreateSalesOrderDto, createdById: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id: dto.quoteId },
      include: { items: true, salesOrder: true },
    });
    if (!quote) {
      throw new NotFoundException("Quote not found");
    }
    if (quote.salesOrder) {
      throw new ConflictException("This quote has already been converted to a sales order");
    }
    if (quote.status === QuoteStatus.REJECTED || quote.status === QuoteStatus.EXPIRED) {
      throw new BadRequestException(`Cannot confirm a quote that is ${quote.status.toLowerCase()}`);
    }
    if (!quote.customerId && !quote.b2bAccountId) {
      throw new BadRequestException("Quote must be linked to a customer or B2B account");
    }

    for (const item of quote.items) {
      const serials = dto.itemSerials.find((entry) => entry.productId === item.productId);
      if (!serials || serials.serialNumbers.length !== item.quantity) {
        throw new BadRequestException(
          `Expected ${item.quantity} serial number(s) for product ${item.productId}`,
        );
      }
    }

    const orderCount = await this.prisma.salesOrder.count();
    const orderNumber = `SO-${String(orderCount + 1).padStart(6, "0")}`;

    const order = await this.prisma.$transaction(async (tx) => {
      for (const item of quote.items) {
        await this.stockService.adjust(item.productId, dto.branchId, -item.quantity, tx);
      }

      const created = await tx.salesOrder.create({
        data: {
          orderNumber,
          quoteId: quote.id,
          customerId: quote.customerId,
          b2bAccountId: quote.b2bAccountId,
          branchId: dto.branchId,
          status: SalesOrderStatus.CONFIRMED,
          subtotal: quote.subtotal,
          discount: quote.discount,
          total: quote.total,
          placeOfSupplyState: quote.placeOfSupplyState,
          shippingAddress: quote.shippingAddress,
          notes: quote.notes,
          termsAndConditions: quote.termsAndConditions,
          cgstTotal: quote.cgstTotal,
          sgstTotal: quote.sgstTotal,
          igstTotal: quote.igstTotal,
          roundingAdjustment: quote.roundingAdjustment,
          createdById,
          items: {
            create: quote.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              hsnCode: item.hsnCode,
              gstRate: item.gstRate,
              cgstAmount: item.cgstAmount,
              sgstAmount: item.sgstAmount,
              igstAmount: item.igstAmount,
            })),
          },
        },
      });

      for (const item of quote.items) {
        const serials = dto.itemSerials.find((entry) => entry.productId === item.productId)!;
        for (const serialNumber of serials.serialNumbers) {
          await this.productUnitsService.createForSale(
            {
              serialNumber,
              productId: item.productId,
              branchId: dto.branchId,
              customerId: quote.customerId ?? undefined,
              salesOrderId: created.id,
              warrantyMonths: dto.warrantyMonths,
            },
            tx,
          );
        }
      }

      await tx.quote.update({ where: { id: quote.id }, data: { status: QuoteStatus.ACCEPTED } });

      const invoiceCount = await tx.invoice.count();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);
      await tx.invoice.create({
        data: {
          invoiceNumber: `INV-${String(invoiceCount + 1).padStart(6, "0")}`,
          salesOrderId: created.id,
          amount: created.total,
          dueDate,
        },
      });

      return created;
    });

    this.events.emit(DomainEvents.ORDER_CREATED, { salesOrderId: order.id } satisfies OrderCreatedEvent);

    return this.findOne(order.id);
  }
}
