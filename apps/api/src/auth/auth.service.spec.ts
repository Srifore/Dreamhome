import { Test } from "@nestjs/testing";
import { BadRequestException, ConflictException, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../prisma/prisma.service";
import { AuthService } from "./auth.service";
import { createPrismaMock, type PrismaMock } from "../test-utils/prisma-mock";

jest.mock("bcrypt", () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe("AuthService", () => {
  let service: AuthService;
  let prisma: PrismaMock;
  let jwtService: { signAsync: jest.Mock; verifyAsync: jest.Mock };
  let config: { getOrThrow: jest.Mock; get: jest.Mock };

  const activeUser = {
    id: "user-1",
    email: "admin@dreamhome.local",
    passwordHash: "hashed",
    roleId: "role-1",
    isActive: true,
  };

  beforeEach(async () => {
    prisma = createPrismaMock();
    jwtService = {
      signAsync: jest.fn().mockResolvedValue("signed-token"),
      verifyAsync: jest.fn(),
    };
    config = {
      getOrThrow: jest.fn((key: string) => `secret-${key}`),
      get: jest.fn((_key: string, fallback: string) => fallback),
    };
    (bcrypt.compare as jest.Mock).mockReset();
    (bcrypt.hash as jest.Mock).mockReset();

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: config },
      ],
    }).compile();
    service = moduleRef.get(AuthService);
  });

  describe("login", () => {
    it("rejects an unknown email", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.login("nobody@x.com", "pw")).rejects.toThrow(UnauthorizedException);
    });

    it("rejects a deactivated user even with the correct password", async () => {
      prisma.user.findUnique.mockResolvedValue({ ...activeUser, isActive: false });
      await expect(service.login(activeUser.email, "pw")).rejects.toThrow(UnauthorizedException);
    });

    it("rejects an incorrect password", async () => {
      prisma.user.findUnique.mockResolvedValue(activeUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.login(activeUser.email, "wrong")).rejects.toThrow(UnauthorizedException);
    });

    it("issues an access+refresh token pair for valid credentials", async () => {
      prisma.user.findUnique.mockResolvedValue(activeUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(activeUser.email, "correct");

      expect(result).toEqual({ accessToken: "signed-token", refreshToken: "signed-token" });
      expect(jwtService.signAsync).toHaveBeenCalledTimes(2);
    });
  });

  describe("refresh", () => {
    it("rejects a malformed/expired refresh token", async () => {
      jwtService.verifyAsync.mockRejectedValue(new Error("expired"));
      await expect(service.refresh("bad-token")).rejects.toThrow(UnauthorizedException);
    });

    it("rejects a refresh token for a user that's since been deactivated", async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: "user-1" });
      prisma.user.findUnique.mockResolvedValue({ ...activeUser, isActive: false });
      await expect(service.refresh("token")).rejects.toThrow(UnauthorizedException);
    });

    it("issues a fresh token pair for a valid refresh token", async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: "user-1" });
      prisma.user.findUnique.mockResolvedValue(activeUser);

      const result = await service.refresh("valid-token");

      expect(result).toEqual({ accessToken: "signed-token", refreshToken: "signed-token" });
    });
  });

  describe("changeEmail", () => {
    it("rejects when the current password is wrong", async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue(activeUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.changeEmail("user-1", "wrong", "new@x.com")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("is a no-op when the new email matches the current one", async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue(activeUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.changeEmail("user-1", "correct", activeUser.email);

      expect(result).toEqual({ email: activeUser.email });
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("rejects when another user already has the requested email", async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue(activeUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.user.findUnique.mockResolvedValue({ id: "someone-else" });

      await expect(service.changeEmail("user-1", "correct", "taken@x.com")).rejects.toThrow(
        ConflictException,
      );
    });

    it("updates the email when the password is correct and the email is free", async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue(activeUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.update.mockResolvedValue({ email: "new@x.com" });

      const result = await service.changeEmail("user-1", "correct", "new@x.com");

      expect(result).toEqual({ email: "new@x.com" });
    });
  });

  describe("changePassword", () => {
    it("rejects when the current password is wrong", async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue(activeUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.changePassword("user-1", "wrong", "newpass")).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("rejects reusing the same password", async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue(activeUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.changePassword("user-1", "samepass", "samepass")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("hashes and saves a genuinely new password", async () => {
      prisma.user.findUniqueOrThrow.mockResolvedValue(activeUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue("new-hash");

      const result = await service.changePassword("user-1", "oldpass", "newpass");

      expect(bcrypt.hash).toHaveBeenCalledWith("newpass", 10);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: { passwordHash: "new-hash" },
      });
      expect(result).toEqual({ success: true });
    });
  });
});
