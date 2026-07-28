import { Test } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { StockService } from "./stock.service";
import { createPrismaMock, type PrismaMock } from "../../test-utils/prisma-mock";

describe("StockService", () => {
  let service: StockService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const moduleRef = await Test.createTestingModule({
      providers: [StockService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(StockService);
  });

  describe("adjust", () => {
    it("throws when decrementing more than the available quantity", async () => {
      prisma.stockLevel.upsert.mockResolvedValue({});
      prisma.stockLevel.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.adjust("prod-1", "branch-1", -5)).rejects.toThrow(BadRequestException);
    });

    it("succeeds when there's enough stock to decrement", async () => {
      prisma.stockLevel.upsert.mockResolvedValue({});
      prisma.stockLevel.updateMany.mockResolvedValue({ count: 1 });
      prisma.stockLevel.findUniqueOrThrow.mockResolvedValue({ quantity: 5 });

      const result = await service.adjust("prod-1", "branch-1", -5);

      expect(result).toEqual({ quantity: 5 });
    });

    it("increments stock via a direct update, not the conditional decrement path", async () => {
      prisma.stockLevel.upsert.mockResolvedValue({});
      prisma.stockLevel.findUniqueOrThrow.mockResolvedValue({ quantity: 10 });

      await service.adjust("prod-1", "branch-1", 5);

      expect(prisma.stockLevel.update).toHaveBeenCalledWith({
        where: { productId_branchId: { productId: "prod-1", branchId: "branch-1" } },
        data: { quantity: { increment: 5 } },
      });
      expect(prisma.stockLevel.updateMany).not.toHaveBeenCalled();
    });

    it("makes no quantity change for a zero delta beyond ensuring the row exists", async () => {
      prisma.stockLevel.upsert.mockResolvedValue({});
      prisma.stockLevel.findUniqueOrThrow.mockResolvedValue({ quantity: 3 });

      await service.adjust("prod-1", "branch-1", 0);

      expect(prisma.stockLevel.update).not.toHaveBeenCalled();
      expect(prisma.stockLevel.updateMany).not.toHaveBeenCalled();
    });

    it("uses the supplied transaction client instead of the default prisma instance", async () => {
      const tx = createPrismaMock();
      tx.stockLevel.upsert.mockResolvedValue({});
      tx.stockLevel.findUniqueOrThrow.mockResolvedValue({ quantity: 1 });

      await service.adjust("prod-1", "branch-1", 1, tx as any);

      expect(tx.stockLevel.update).toHaveBeenCalled();
      expect(prisma.stockLevel.update).not.toHaveBeenCalled();
    });
  });
});
