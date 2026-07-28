import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { ProductUnitStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { ProductUnitsService } from "./product-units.service";
import { createPrismaMock, type PrismaMock } from "../../test-utils/prisma-mock";

describe("ProductUnitsService", () => {
  let service: ProductUnitsService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const moduleRef = await Test.createTestingModule({
      providers: [ProductUnitsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(ProductUnitsService);
  });

  describe("findBySerialNumber", () => {
    it("throws NotFoundException for an unknown serial number", async () => {
      prisma.productUnit.findUnique.mockResolvedValue(null);
      await expect(service.findBySerialNumber("SN-MISSING")).rejects.toThrow(NotFoundException);
    });
  });

  describe("createForSale", () => {
    it("marks the unit SOLD and computes a warranty expiry from the given month count", async () => {
      prisma.productUnit.create.mockImplementation(({ data }: any) => data);

      const result = await service.createForSale({
        serialNumber: "SN-0001",
        productId: "prod-1",
        branchId: "branch-1",
        salesOrderId: "so-1",
        warrantyMonths: 24,
      });

      expect(result.status).toBe(ProductUnitStatus.SOLD);
      const monthsApart =
        (result.warrantyExpiresAt.getFullYear() - result.soldAt.getFullYear()) * 12 +
        (result.warrantyExpiresAt.getMonth() - result.soldAt.getMonth());
      expect(monthsApart).toBe(24);
    });

    it("defaults to a 12-month warranty when none is specified", async () => {
      prisma.productUnit.create.mockImplementation(({ data }: any) => data);

      const result = await service.createForSale({
        serialNumber: "SN-0002",
        productId: "prod-1",
        branchId: "branch-1",
        salesOrderId: "so-1",
      });

      const monthsApart =
        (result.warrantyExpiresAt.getFullYear() - result.soldAt.getFullYear()) * 12 +
        (result.warrantyExpiresAt.getMonth() - result.soldAt.getMonth());
      expect(monthsApart).toBe(12);
    });

    it("writes to the given transaction client when one is supplied", async () => {
      const tx = createPrismaMock();
      tx.productUnit.create.mockResolvedValue({ id: "unit-1" });

      await service.createForSale(
        { serialNumber: "SN-0003", productId: "prod-1", branchId: "branch-1", salesOrderId: "so-1" },
        tx as any,
      );

      expect(tx.productUnit.create).toHaveBeenCalled();
      expect(prisma.productUnit.create).not.toHaveBeenCalled();
    });
  });
});
