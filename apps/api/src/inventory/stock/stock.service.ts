import { BadRequestException, Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { SetStockDto } from "./dto/set-stock.dto";

type Db = PrismaService | Prisma.TransactionClient;

@Injectable()
export class StockService {
  constructor(private prisma: PrismaService) {}

  findByProduct(productId: string) {
    return this.prisma.stockLevel.findMany({
      where: { productId },
      include: { branch: true },
    });
  }

  setLevel(dto: SetStockDto) {
    return this.prisma.stockLevel.upsert({
      where: { productId_branchId: { productId: dto.productId, branchId: dto.branchId } },
      update: { quantity: dto.quantity },
      create: { productId: dto.productId, branchId: dto.branchId, quantity: dto.quantity },
    });
  }

  /**
   * Applies a delta (positive or negative) to stock, used internally by the sales flow.
   * Accepts an optional transaction client so callers can bundle this with other writes atomically.
   *
   * Decrements use a single conditional `updateMany` (WHERE quantity >= amount needed) rather
   * than a read-then-write — Postgres holds the row lock across the WHERE-and-SET of one UPDATE
   * statement, so two concurrent decrements against the same row serialize correctly instead of
   * both reading the same starting quantity and one silently clobbering the other's result.
   */
  async adjust(productId: string, branchId: string, delta: number, db: Db = this.prisma) {
    await db.stockLevel.upsert({
      where: { productId_branchId: { productId, branchId } },
      update: {},
      create: { productId, branchId, quantity: 0 },
    });

    if (delta < 0) {
      const result = await db.stockLevel.updateMany({
        where: { productId, branchId, quantity: { gte: -delta } },
        data: { quantity: { increment: delta } },
      });
      if (result.count === 0) {
        throw new BadRequestException("Insufficient stock for this operation");
      }
    } else if (delta > 0) {
      await db.stockLevel.update({
        where: { productId_branchId: { productId, branchId } },
        data: { quantity: { increment: delta } },
      });
    }

    return db.stockLevel.findUniqueOrThrow({
      where: { productId_branchId: { productId, branchId } },
    });
  }
}
