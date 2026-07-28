import { Test } from "@nestjs/testing";
import { BadRequestException } from "@nestjs/common";
import { IntegrationProvider } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { EncryptionService } from "../common/crypto/encryption.service";
import { SettingsService } from "./settings.service";
import { createPrismaMock, type PrismaMock } from "../test-utils/prisma-mock";

describe("SettingsService", () => {
  let service: SettingsService;
  let prisma: PrismaMock;
  let encryption: { encrypt: jest.Mock; decrypt: jest.Mock };

  beforeEach(async () => {
    prisma = createPrismaMock();
    encryption = { encrypt: jest.fn(), decrypt: jest.fn() };

    const moduleRef = await Test.createTestingModule({
      providers: [
        SettingsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EncryptionService, useValue: encryption },
      ],
    }).compile();
    service = moduleRef.get(SettingsService);
  });

  describe("listIntegrations", () => {
    it("reports an unconfigured provider as not configured, without attempting to decrypt", async () => {
      prisma.integrationSetting.findMany.mockResolvedValue([]);

      const result = await service.listIntegrations();

      const whatsapp = result.find((r) => r.provider === IntegrationProvider.WHATSAPP);
      expect(whatsapp).toEqual({ provider: IntegrationProvider.WHATSAPP, isActive: false, configured: false, fields: null });
      expect(encryption.decrypt).not.toHaveBeenCalled();
    });

    it("masks secret fields but passes non-secret fields through as-is", async () => {
      prisma.integrationSetting.findMany.mockResolvedValue([
        { provider: IntegrationProvider.WHATSAPP, isActive: true, configEncrypted: "enc" },
      ]);
      encryption.decrypt.mockReturnValue(
        JSON.stringify({ phoneNumberId: "12345", accessToken: "EAAGsupersecrettoken1234" }),
      );

      const result = await service.listIntegrations();
      const whatsapp = result.find((r) => r.provider === IntegrationProvider.WHATSAPP)!;

      expect(whatsapp.fields!.phoneNumberId).toBe("12345");
      expect(whatsapp.fields!.accessToken).not.toContain("supersecret");
      expect(whatsapp.fields!.accessToken).toMatch(/^••••/);
    });

    it("isolates a decrypt failure to just that provider instead of throwing for the whole list", async () => {
      prisma.integrationSetting.findMany.mockResolvedValue([
        { provider: IntegrationProvider.WHATSAPP, isActive: true, configEncrypted: "corrupted" },
      ]);
      encryption.decrypt.mockImplementation(() => {
        throw new Error("bad auth tag");
      });

      const result = await service.listIntegrations();
      const whatsapp = result.find((r) => r.provider === IntegrationProvider.WHATSAPP)!;

      expect(whatsapp.configured).toBe(false);
      expect(whatsapp.error).toBeDefined();
    });
  });

  describe("upsertWhatsApp (via upsert)", () => {
    it("rejects when a required secret field is missing on first-time setup", async () => {
      prisma.integrationSetting.findUnique.mockResolvedValue(null);

      await expect(
        service.upsertWhatsApp({ phoneNumberId: "123", businessAccountId: "456" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("saves a first-time config with all required fields present", async () => {
      prisma.integrationSetting.findUnique.mockResolvedValue(null);
      encryption.encrypt.mockReturnValue("encrypted-blob");

      const result = await service.upsertWhatsApp({
        phoneNumberId: "123",
        businessAccountId: "456",
        accessToken: "token",
        verifyToken: "verify",
      });

      expect(result).toEqual({ provider: IntegrationProvider.WHATSAPP, saved: true });
      expect(prisma.integrationSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { provider: IntegrationProvider.WHATSAPP },
          create: expect.objectContaining({ configEncrypted: "encrypted-blob", isActive: true }),
        }),
      );
    });

    it("preserves the existing secret when the update submits it blank", async () => {
      prisma.integrationSetting.findUnique.mockResolvedValue({ configEncrypted: "old-enc" });
      encryption.decrypt.mockReturnValue(
        JSON.stringify({
          phoneNumberId: "123",
          businessAccountId: "456",
          accessToken: "existing-real-token",
          verifyToken: "existing-verify",
        }),
      );
      encryption.encrypt.mockImplementation((json: string) => json); // pass-through so we can assert its content

      await service.upsertWhatsApp({ phoneNumberId: "999", accessToken: "" });

      const savedJson = JSON.parse(encryption.encrypt.mock.results[0].value);
      expect(savedJson.accessToken).toBe("existing-real-token"); // untouched, blank was ignored
      expect(savedJson.phoneNumberId).toBe("999"); // non-secret field updates normally
    });

    it("overwrites a secret when a genuinely new value is submitted", async () => {
      prisma.integrationSetting.findUnique.mockResolvedValue({ configEncrypted: "old-enc" });
      encryption.decrypt.mockReturnValue(
        JSON.stringify({
          phoneNumberId: "123",
          businessAccountId: "456",
          accessToken: "old-token",
          verifyToken: "old-verify",
        }),
      );
      encryption.encrypt.mockImplementation((json: string) => json);

      await service.upsertWhatsApp({ accessToken: "brand-new-token" });

      const savedJson = JSON.parse(encryption.encrypt.mock.results[0].value);
      expect(savedJson.accessToken).toBe("brand-new-token");
    });
  });

  describe("getDecryptedConfig", () => {
    it("throws NotFoundException when the integration has never been configured", async () => {
      prisma.integrationSetting.findUnique.mockResolvedValue(null);
      await expect(service.getDecryptedConfig(IntegrationProvider.WHATSAPP)).rejects.toThrow(
        "WHATSAPP integration is not configured",
      );
    });

    it("throws NotFoundException when the integration is configured but deactivated", async () => {
      prisma.integrationSetting.findUnique.mockResolvedValue({ isActive: false, configEncrypted: "enc" });
      await expect(service.getDecryptedConfig(IntegrationProvider.WHATSAPP)).rejects.toThrow(
        "WHATSAPP integration is not configured",
      );
    });

    it("returns the decrypted config when active", async () => {
      prisma.integrationSetting.findUnique.mockResolvedValue({ isActive: true, configEncrypted: "enc" });
      encryption.decrypt.mockReturnValue(JSON.stringify({ apiKey: "sk-real" }));

      const result = await service.getDecryptedConfig(IntegrationProvider.AI_IMAGE);

      expect(result).toEqual({ apiKey: "sk-real" });
    });
  });
});
