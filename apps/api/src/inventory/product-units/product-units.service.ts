import { Injectable, NotFoundException } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { ProductUnitStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";

type Db = PrismaService | Prisma.TransactionClient;

@Injectable()
export class ProductUnitsService {
  constructor(private prisma: PrismaService) {}

  findByCustomer(customerId: string) {
    return this.prisma.productUnit.findMany({
      where: { customerId },
      include: { product: { include: { brand: true } } },
      orderBy: { soldAt: "desc" },
    });
  }

  async findBySerialNumber(serialNumber: string) {
    const unit = await this.prisma.productUnit.findUnique({
      where: { serialNumber },
      include: { product: { include: { brand: true } }, customer: true, serviceTickets: true },
    });
    if (!unit) {
      throw new NotFoundException("Product unit not found");
    }
    return unit;
  }

  /** Used internally by the sales flow when a SalesOrder is confirmed. */
  createForSale(
    params: {
      serialNumber: string;
      productId: string;
      branchId: string;
      customerId?: string;
      salesOrderId: string;
      warrantyMonths?: number;
    },
    db: Db = this.prisma,
  ) {
    const soldAt = new Date();
    const warrantyExpiresAt = new Date(soldAt);
    warrantyExpiresAt.setMonth(warrantyExpiresAt.getMonth() + (params.warrantyMonths ?? 12));

    return db.productUnit.create({
      data: {
        serialNumber: params.serialNumber,
        productId: params.productId,
        branchId: params.branchId,
        customerId: params.customerId,
        salesOrderId: params.salesOrderId,
        status: ProductUnitStatus.SOLD,
        soldAt,
        warrantyExpiresAt,
      },
    });
  }
}
