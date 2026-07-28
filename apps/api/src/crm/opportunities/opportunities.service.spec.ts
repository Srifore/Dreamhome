import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { OpportunitiesService } from "./opportunities.service";
import { createPrismaMock, type PrismaMock } from "../../test-utils/prisma-mock";

describe("OpportunitiesService", () => {
  let service: OpportunitiesService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const moduleRef = await Test.createTestingModule({
      providers: [OpportunitiesService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(OpportunitiesService);
  });

  it("throws NotFoundException for a missing opportunity", async () => {
    prisma.opportunity.findUnique.mockResolvedValue(null);
    await expect(service.findOne("missing")).rejects.toThrow(NotFoundException);
  });

  it("rejects updating a nonexistent opportunity", async () => {
    prisma.opportunity.findUnique.mockResolvedValue(null);
    await expect(service.update("missing", { stage: "LOST" } as any)).rejects.toThrow(NotFoundException);
  });

  it("updates an existing opportunity", async () => {
    prisma.opportunity.findUnique.mockResolvedValue({ id: "opp-1" });
    prisma.opportunity.update.mockResolvedValue({ id: "opp-1", stage: "LOST" });

    const result = await service.update("opp-1", { stage: "LOST" } as any);

    expect(result).toEqual({ id: "opp-1", stage: "LOST" });
  });
});
