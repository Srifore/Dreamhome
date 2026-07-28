import { Test } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { B2BAccountsService } from "./b2b-accounts.service";
import { createPrismaMock, type PrismaMock } from "../../test-utils/prisma-mock";
import type { CreateB2BContactDto } from "./dto/create-b2b-contact.dto";

describe("B2BAccountsService", () => {
  let service: B2BAccountsService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const moduleRef = await Test.createTestingModule({
      providers: [B2BAccountsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(B2BAccountsService);
  });

  it("throws NotFoundException for a missing account", async () => {
    prisma.b2BAccount.findUnique.mockResolvedValue(null);
    await expect(service.findOne("missing")).rejects.toThrow(NotFoundException);
  });

  it("rejects adding a contact to a nonexistent account", async () => {
    prisma.b2BAccount.findUnique.mockResolvedValue(null);
    await expect(
      service.addContact("missing", { name: "Contact" } as CreateB2BContactDto),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.b2BContact.create).not.toHaveBeenCalled();
  });

  it("adds a contact under the correct account id", async () => {
    prisma.b2BAccount.findUnique.mockResolvedValue({ id: "acc-1" });
    prisma.b2BContact.create.mockResolvedValue({ id: "contact-1" });

    await service.addContact("acc-1", { name: "Contact", phone: "123" } as CreateB2BContactDto);

    expect(prisma.b2BContact.create).toHaveBeenCalledWith({
      data: { name: "Contact", phone: "123", b2bAccountId: "acc-1" },
    });
  });

  it("rejects updating a nonexistent account", async () => {
    prisma.b2BAccount.findUnique.mockResolvedValue(null);
    await expect(service.update("missing", { name: "New" })).rejects.toThrow(NotFoundException);
  });
});
