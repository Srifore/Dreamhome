import { Test } from "@nestjs/testing";
import { BadRequestException, ConflictException, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "./users.service";
import { createPrismaMock, type PrismaMock } from "../test-utils/prisma-mock";
import type { CreateUserDto } from "./dto/create-user.dto";

jest.mock("bcrypt", () => ({ hash: jest.fn().mockResolvedValue("hashed-pw") }));

describe("UsersService", () => {
  let service: UsersService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const moduleRef = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(UsersService);
  });

  describe("create", () => {
    it("rejects a duplicate email", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "existing" });
      await expect(
        service.create({ email: "a@x.com", password: "pw", permissions: [] } as CreateUserDto),
      ).rejects.toThrow(ConflictException);
    });

    it("strips Admin-only permissions (users:manage, settings:manage) even if explicitly requested", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(({ data }: any) => data);

      const result = await service.create({
        email: "supervisor@x.com",
        password: "pw",
        permissions: ["sales:write", "users:manage", "settings:manage", "crm:write"],
      } as CreateUserDto);

      expect(result.permissions).toEqual(["sales:write", "crm:write"]);
    });

    it("hashes the password before storing it", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockImplementation(({ data }: any) => data);

      await service.create({ email: "a@x.com", password: "plaintext", permissions: [] } as CreateUserDto);

      expect(bcrypt.hash).toHaveBeenCalledWith("plaintext", 10);
      expect(prisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ passwordHash: "hashed-pw" }) }),
      );
    });
  });

  describe("update", () => {
    it("strips Admin-only permissions from an update too", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "u1", role: { name: "Supervisor" } });
      prisma.user.update.mockImplementation(({ data }: any) => data);

      const result = await service.update("u1", { permissions: ["users:manage", "inventory:write"] } as any);

      expect(result.permissions).toEqual(["inventory:write"]);
    });

    it("leaves permissions untouched (undefined) when the update doesn't mention them", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "u1", role: { name: "Supervisor" } });
      prisma.user.update.mockImplementation(({ data }: any) => data);

      const result = await service.update("u1", { name: "New Name" } as any);

      expect(result.permissions).toBeUndefined();
    });

    it("blocks demoting the last active Admin to a non-Admin role", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "u1", role: { name: "Admin" }, isActive: true });
      prisma.role.findUnique.mockResolvedValue({ id: "role-2", name: "Supervisor" });
      prisma.user.count.mockResolvedValue(1);

      await expect(service.update("u1", { roleId: "role-2" } as any)).rejects.toThrow(BadRequestException);
    });

    it("allows demoting an Admin when another active Admin still exists", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "u1", role: { name: "Admin" }, isActive: true });
      prisma.role.findUnique.mockResolvedValue({ id: "role-2", name: "Supervisor" });
      prisma.user.count.mockResolvedValue(2);
      prisma.user.update.mockResolvedValue({ id: "u1" });

      await expect(service.update("u1", { roleId: "role-2" } as any)).resolves.toBeDefined();
    });

    it("does not run the last-Admin check when the role doesn't actually change", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "u1", role: { name: "Admin" }, isActive: true, roleId: "role-1" });
      prisma.user.update.mockResolvedValue({ id: "u1" });

      await service.update("u1", { roleId: "role-1", name: "Renamed" } as any);

      expect(prisma.user.count).not.toHaveBeenCalled();
    });
  });

  describe("deactivate", () => {
    it("prevents a user from deactivating their own account", async () => {
      await expect(service.deactivate("u1", "u1")).rejects.toThrow(
        "You cannot deactivate your own account",
      );
    });

    it("blocks deactivating the last active Admin", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "u2", role: { name: "Admin" }, isActive: true });
      prisma.user.count.mockResolvedValue(1);

      await expect(service.deactivate("u2", "u1")).rejects.toThrow(BadRequestException);
    });

    it("deactivates a non-Admin without any last-Admin check", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "u2", role: { name: "Supervisor" }, isActive: true });
      prisma.user.update.mockResolvedValue({ id: "u2", isActive: false });

      const result = await service.deactivate("u2", "u1");

      expect(prisma.user.count).not.toHaveBeenCalled();
      expect(result).toEqual({ id: "u2", isActive: false });
    });
  });

  describe("remove", () => {
    it("refuses to permanently delete a still-active account", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "u1", isActive: true });
      await expect(service.remove("u1")).rejects.toThrow(
        "Deactivate this account before deleting it permanently",
      );
    });

    it("translates a foreign-key violation into a friendly message instead of a raw DB error", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "u1", isActive: false });
      prisma.user.delete.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("FK violation", {
          code: "P2003",
          clientVersion: "6.19.3",
        }),
      );

      await expect(service.remove("u1")).rejects.toThrow(ConflictException);
    });

    it("re-throws an unrelated database error unchanged", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "u1", isActive: false });
      const unrelated = new Error("connection lost");
      prisma.user.delete.mockRejectedValue(unrelated);

      await expect(service.remove("u1")).rejects.toThrow("connection lost");
    });

    it("permanently deletes a deactivated account with no blocking history", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: "u1", isActive: false });
      prisma.user.delete.mockResolvedValue({});

      await expect(service.remove("u1")).resolves.toEqual({ deleted: true });
    });
  });

  describe("findOne", () => {
    it("throws NotFoundException for a missing user", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.findOne("missing")).rejects.toThrow(NotFoundException);
    });
  });
});
