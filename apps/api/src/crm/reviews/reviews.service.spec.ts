import { Test } from "@nestjs/testing";
import { PrismaService } from "../../prisma/prisma.service";
import { ReviewsService } from "./reviews.service";
import { createPrismaMock, type PrismaMock } from "../../test-utils/prisma-mock";

describe("ReviewsService", () => {
  let service: ReviewsService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const moduleRef = await Test.createTestingModule({
      providers: [ReviewsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(ReviewsService);
  });

  it("orders reviews by most recently requested first", async () => {
    prisma.productReview.findMany.mockResolvedValue([]);

    await service.findAll();

    expect(prisma.productReview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { requestedAt: "desc" } }),
    );
  });
});
