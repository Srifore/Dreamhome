import { Test } from "@nestjs/testing";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CustomersService } from "./customers.service";
import { createPrismaMock, type PrismaMock } from "../../test-utils/prisma-mock";
import type { CreateCustomerDto } from "./dto/create-customer.dto";

describe("CustomersService", () => {
  let service: CustomersService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const moduleRef = await Test.createTestingModule({
      providers: [CustomersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(CustomersService);
  });

  describe("create", () => {
    it("rejects a duplicate phone number", async () => {
      prisma.customer.findUnique.mockResolvedValue({ id: "existing" });
      await expect(
        service.create({ name: "A", phone: "+91 9900000000" } as CreateCustomerDto),
      ).rejects.toThrow(ConflictException);
    });

    it("creates a customer with a unique phone number", async () => {
      prisma.customer.findUnique.mockResolvedValue(null);
      prisma.customer.create.mockResolvedValue({ id: "new-1" });
      const result = await service.create({ name: "A", phone: "+91 9900000000" } as CreateCustomerDto);
      expect(result).toEqual({ id: "new-1" });
    });
  });

  describe("update", () => {
    it("throws NotFoundException for a missing customer", async () => {
      prisma.customer.findUnique.mockResolvedValueOnce(null);
      await expect(service.update("missing", { name: "X" })).rejects.toThrow(NotFoundException);
    });

    it("allows updating a customer's own phone number to the same value", async () => {
      prisma.customer.findUnique
        .mockResolvedValueOnce({ id: "cust-1" }) // findOne guard
        .mockResolvedValueOnce({ id: "cust-1", phone: "+91 9900000000" }); // phone-collision check
      prisma.customer.update.mockResolvedValue({ id: "cust-1" });

      await expect(service.update("cust-1", { phone: "+91 9900000000" })).resolves.toBeDefined();
    });

    it("rejects changing phone to one already used by a different customer", async () => {
      prisma.customer.findUnique
        .mockResolvedValueOnce({ id: "cust-1" }) // findOne guard
        .mockResolvedValueOnce({ id: "cust-2", phone: "+91 9911111111" }); // belongs to someone else

      await expect(service.update("cust-1", { phone: "+91 9911111111" })).rejects.toThrow(
        ConflictException,
      );
    });

    it("updates fine when no phone change is requested", async () => {
      prisma.customer.findUnique.mockResolvedValueOnce({ id: "cust-1" });
      prisma.customer.update.mockResolvedValue({ id: "cust-1", name: "New Name" });

      const result = await service.update("cust-1", { name: "New Name" });
      expect(result).toEqual({ id: "cust-1", name: "New Name" });
    });
  });

  describe("findOne", () => {
    it("throws NotFoundException when the customer doesn't exist", async () => {
      prisma.customer.findUnique.mockResolvedValue(null);
      await expect(service.findOne("missing")).rejects.toThrow(NotFoundException);
    });
  });
});
