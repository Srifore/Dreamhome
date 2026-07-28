import { Test } from "@nestjs/testing";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import * as fsPromises from "fs/promises";
import { PrismaService } from "../../prisma/prisma.service";
import { DomainEvents } from "../../common/events/domain-events";
import { ProductsService } from "./products.service";
import { createPrismaMock, type PrismaMock } from "../../test-utils/prisma-mock";
import type { CreateProductDto } from "./dto/create-product.dto";

jest.mock("fs/promises", () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

describe("ProductsService", () => {
  let service: ProductsService;
  let prisma: PrismaMock;
  let events: { emit: jest.Mock };
  let config: { get: jest.Mock };

  beforeEach(async () => {
    prisma = createPrismaMock();
    events = { emit: jest.fn() };
    config = { get: jest.fn().mockReturnValue("http://localhost:3001") };
    prisma.$transaction.mockImplementation((ops: any) => Promise.all(ops));
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EventEmitter2, useValue: events },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = moduleRef.get(ProductsService);
  });

  describe("create", () => {
    it("rejects a duplicate SKU", async () => {
      prisma.product.findUnique.mockResolvedValue({ id: "existing" });
      await expect(service.create({ sku: "ABC" } as CreateProductDto)).rejects.toThrow(ConflictException);
    });

    it("creates a product and emits PRODUCT_CREATED", async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      prisma.product.create.mockResolvedValue({ id: "prod-1" });

      await service.create({ sku: "ABC" } as CreateProductDto);

      expect(events.emit).toHaveBeenCalledWith(DomainEvents.PRODUCT_CREATED, { productId: "prod-1" });
    });
  });

  describe("update", () => {
    it("throws NotFoundException for a missing product", async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(service.update("missing", { name: "X" })).rejects.toThrow(NotFoundException);
    });

    it("emits PRODUCT_UPDATED on success", async () => {
      prisma.product.findUnique.mockResolvedValue({ id: "prod-1" });
      prisma.product.update.mockResolvedValue({ id: "prod-1" });

      await service.update("prod-1", { name: "New Name" });

      expect(events.emit).toHaveBeenCalledWith(DomainEvents.PRODUCT_UPDATED, { productId: "prod-1" });
    });
  });

  describe("addImages", () => {
    it("rejects uploads that would exceed the 8-photo limit", async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: "prod-1",
        images: new Array(7).fill("url"),
      });

      const files = [{ originalname: "a.jpg", buffer: Buffer.from("x") }, { originalname: "b.jpg", buffer: Buffer.from("y") }] as any;

      await expect(service.addImages("prod-1", files)).rejects.toThrow(/only 1 more can be added/);
    });

    it("writes each file and appends its URL to the product's image list", async () => {
      prisma.product.findUnique.mockResolvedValue({ id: "prod-1", images: ["existing-url"] });
      prisma.product.update.mockImplementation(({ data }: any) => data);

      const files = [{ originalname: "photo.jpg", buffer: Buffer.from("data") }] as any;
      const result = await service.addImages("prod-1", files);

      expect(fsPromises.writeFile).toHaveBeenCalledTimes(1);
      expect(result.images).toHaveLength(2);
      expect(result.images[0]).toBe("existing-url");
      expect(result.images[1]).toMatch(/^http:\/\/localhost:3001\/uploads\/products\/prod-1\//);
    });
  });

  describe("removeImage", () => {
    it("deletes the file on disk and removes the URL from the product's image list", async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: "prod-1",
        images: ["http://x/uploads/products/prod-1/a.jpg", "http://x/uploads/products/prod-1/b.jpg"],
      });
      prisma.product.update.mockImplementation(({ data }: any) => data);

      const result = await service.removeImage("prod-1", "http://x/uploads/products/prod-1/a.jpg");

      expect(fsPromises.unlink).toHaveBeenCalled();
      expect(result.images).toEqual(["http://x/uploads/products/prod-1/b.jpg"]);
    });
  });

  describe("remove", () => {
    it("blocks deleting a product that's been quoted", async () => {
      prisma.product.findUnique.mockResolvedValue({ id: "prod-1", images: [], manualUrl: null });
      prisma.quoteItem.count.mockResolvedValue(1);
      prisma.salesOrderItem.count.mockResolvedValue(0);
      prisma.productUnit.count.mockResolvedValue(0);

      await expect(service.remove("prod-1")).rejects.toThrow(BadRequestException);
      expect(prisma.product.delete).not.toHaveBeenCalled();
    });

    it("blocks deleting a product that's been sold", async () => {
      prisma.product.findUnique.mockResolvedValue({ id: "prod-1", images: [], manualUrl: null });
      prisma.quoteItem.count.mockResolvedValue(0);
      prisma.salesOrderItem.count.mockResolvedValue(1);
      prisma.productUnit.count.mockResolvedValue(0);

      await expect(service.remove("prod-1")).rejects.toThrow(
        "Cannot delete a product that has been quoted, sold, or has serialized units on record — mark it Discontinued instead.",
      );
    });

    it("blocks deleting a product with serialized units on record", async () => {
      prisma.product.findUnique.mockResolvedValue({ id: "prod-1", images: [], manualUrl: null });
      prisma.quoteItem.count.mockResolvedValue(0);
      prisma.salesOrderItem.count.mockResolvedValue(0);
      prisma.productUnit.count.mockResolvedValue(1);

      await expect(service.remove("prod-1")).rejects.toThrow(BadRequestException);
    });

    it("deletes a product with no transaction history, including its images and manual", async () => {
      prisma.product.findUnique.mockResolvedValue({
        id: "prod-1",
        images: ["http://x/uploads/products/prod-1/a.jpg"],
        manualUrl: "http://x/uploads/products/prod-1/manual.pdf",
      });
      prisma.quoteItem.count.mockResolvedValue(0);
      prisma.salesOrderItem.count.mockResolvedValue(0);
      prisma.productUnit.count.mockResolvedValue(0);

      await service.remove("prod-1");

      expect(fsPromises.unlink).toHaveBeenCalledTimes(2);
      expect(prisma.stockLevel.deleteMany).toHaveBeenCalledWith({ where: { productId: "prod-1" } });
      expect(prisma.productReview.deleteMany).toHaveBeenCalledWith({ where: { productId: "prod-1" } });
      expect(prisma.socialPost.deleteMany).toHaveBeenCalledWith({ where: { productId: "prod-1" } });
      expect(prisma.product.delete).toHaveBeenCalledWith({ where: { id: "prod-1" } });
    });
  });
});
