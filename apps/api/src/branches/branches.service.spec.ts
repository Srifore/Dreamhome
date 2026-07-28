import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { BranchesService } from "./branches.service";
import { createPrismaMock, type PrismaMock } from "../test-utils/prisma-mock";

describe("BranchesService", () => {
  let service: BranchesService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const moduleRef = await Test.createTestingModule({
      providers: [BranchesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(BranchesService);
  });

  it("throws NotFoundException for a missing branch", async () => {
    prisma.branch.findUnique.mockResolvedValue(null);
    await expect(service.findOne("missing")).rejects.toThrow(NotFoundException);
  });

  it("rejects updating a branch that doesn't exist", async () => {
    prisma.branch.findUnique.mockResolvedValue(null);
    await expect(service.update("missing", { name: "X" })).rejects.toThrow(NotFoundException);
  });
});
