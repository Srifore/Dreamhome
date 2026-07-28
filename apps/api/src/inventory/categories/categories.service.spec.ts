import { Test } from "@nestjs/testing";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CategoriesService } from "./categories.service";
import { createPrismaMock, type PrismaMock } from "../../test-utils/prisma-mock";

describe("CategoriesService", () => {
  let service: CategoriesService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const moduleRef = await Test.createTestingModule({
      providers: [CategoriesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(CategoriesService);
  });

  it("rejects creating a category with a slug that already exists", async () => {
    prisma.category.findUnique.mockResolvedValue({ id: "existing" });
    await expect(service.create({ slug: "air-conditioners" } as any)).rejects.toThrow(ConflictException);
  });

  it("rejects changing a slug to one already used by a different category", async () => {
    prisma.category.findUnique
      .mockResolvedValueOnce({ id: "cat-1" })
      .mockResolvedValueOnce({ id: "cat-2" });

    await expect(service.update("cat-1", { slug: "taken-slug" })).rejects.toThrow(ConflictException);
  });

  it("throws NotFoundException for a missing category", async () => {
    prisma.category.findUnique.mockResolvedValue(null);
    await expect(service.findOne("missing")).rejects.toThrow(NotFoundException);
  });
});
