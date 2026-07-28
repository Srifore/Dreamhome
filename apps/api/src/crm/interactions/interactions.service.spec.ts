import { Test } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { InteractionsService } from "./interactions.service";
import { createPrismaMock, type PrismaMock } from "../../test-utils/prisma-mock";
import type { CreateInteractionDto } from "./dto/create-interaction.dto";

describe("InteractionsService", () => {
  let service: InteractionsService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const moduleRef = await Test.createTestingModule({
      providers: [InteractionsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(InteractionsService);
  });

  describe("findByTarget", () => {
    it("rejects a query with no target specified at all", () => {
      expect(() => service.findByTarget({})).toThrow(BadRequestException);
    });

    it("allows a query scoped to just a customerId", () => {
      expect(() => service.findByTarget({ customerId: "cust-1" })).not.toThrow();
    });
  });

  describe("create", () => {
    it("rejects an interaction linked to nothing", () => {
      expect(() => service.create({} as CreateInteractionDto, "user-1")).toThrow(BadRequestException);
    });

    it("creates an interaction linked to a lead, stamping the creator", () => {
      prisma.interaction.create.mockReturnValue({ id: "int-1" });
      service.create({ leadId: "lead-1", type: "CALL" } as CreateInteractionDto, "user-1");

      expect(prisma.interaction.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ leadId: "lead-1", type: "CALL", createdById: "user-1" }),
      });
    });
  });
});
