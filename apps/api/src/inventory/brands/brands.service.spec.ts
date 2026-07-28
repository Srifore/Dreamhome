import { Test } from "@nestjs/testing";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { BrandsService } from "./brands.service";
import { createPrismaMock, type PrismaMock } from "../../test-utils/prisma-mock";

describe("BrandsService", () => {
  let service: BrandsService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const moduleRef = await Test.createTestingModule({
      providers: [BrandsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(BrandsService);
  });

  it("rejects creating a brand with a name that already exists", async () => {
    prisma.brand.findUnique.mockResolvedValue({ id: "existing" });
    await expect(service.create({ name: "Bosch" } as any)).rejects.toThrow(ConflictException);
  });

  it("rejects renaming a brand to a name already used by a different brand", async () => {
    prisma.brand.findUnique
      .mockResolvedValueOnce({ id: "brand-1" }) // findOne guard
      .mockResolvedValueOnce({ id: "brand-2" }); // name collision, different id

    await expect(service.update("brand-1", { name: "Siemens" })).rejects.toThrow(ConflictException);
  });

  it("allows renaming a brand to its own current name", async () => {
    prisma.brand.findUnique
      .mockResolvedValueOnce({ id: "brand-1" })
      .mockResolvedValueOnce({ id: "brand-1" }); // collision is itself
    prisma.brand.update.mockResolvedValue({ id: "brand-1", name: "Siemens" });

    await expect(service.update("brand-1", { name: "Siemens" })).resolves.toEqual({
      id: "brand-1",
      name: "Siemens",
    });
  });

  it("throws NotFoundException updating a brand that doesn't exist", async () => {
    prisma.brand.findUnique.mockResolvedValue(null);
    await expect(service.update("missing", { name: "X" })).rejects.toThrow(NotFoundException);
  });
});
