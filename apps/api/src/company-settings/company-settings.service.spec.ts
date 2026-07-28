import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import * as fsPromises from "fs/promises";
import { PrismaService } from "../prisma/prisma.service";
import { CompanySettingsService } from "./company-settings.service";
import { createPrismaMock, type PrismaMock } from "../test-utils/prisma-mock";

jest.mock("fs/promises", () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
}));

describe("CompanySettingsService", () => {
  let service: CompanySettingsService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        CompanySettingsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue("http://localhost:3001") } },
      ],
    }).compile();
    service = moduleRef.get(CompanySettingsService);
  });

  describe("get", () => {
    it("returns a blank singleton shape when no row has ever been saved", async () => {
      prisma.companySettings.findUnique.mockResolvedValue(null);
      const result = await service.get();
      expect(result.legalName).toBeNull();
      expect(result.id).toBe("default");
    });
  });

  describe("update", () => {
    it("trims whitespace-only fields down to null instead of storing blank strings", async () => {
      prisma.companySettings.upsert.mockImplementation(({ update }: any) => update);

      const result = await service.update({ legalName: "   ", gstin: " 29ABCDE1234F1Z5 " } as any);

      expect(result.legalName).toBeNull();
      expect(result.gstin).toBe("29ABCDE1234F1Z5");
    });
  });

  describe("getState", () => {
    it("returns null when no company settings row exists yet", async () => {
      prisma.companySettings.findUnique.mockResolvedValue(null);
      await expect(service.getState()).resolves.toBeNull();
    });

    it("returns the stored state", async () => {
      prisma.companySettings.findUnique.mockResolvedValue({ state: "Karnataka" });
      await expect(service.getState()).resolves.toBe("Karnataka");
    });
  });

  describe("setLogo", () => {
    it("deletes the previous logo file before saving the new one", async () => {
      prisma.companySettings.findUnique.mockResolvedValue({ logoUrl: "http://x/uploads/company/old.png" });
      prisma.companySettings.upsert.mockResolvedValue({ logoUrl: "new-url" });

      await service.setLogo({ originalname: "new.png", buffer: Buffer.from("x") } as any);

      expect(fsPromises.unlink).toHaveBeenCalled();
      expect(fsPromises.writeFile).toHaveBeenCalled();
    });

    it("skips the delete step when no logo was previously set", async () => {
      prisma.companySettings.findUnique.mockResolvedValue(null);
      prisma.companySettings.upsert.mockResolvedValue({ logoUrl: "new-url" });

      await service.setLogo({ originalname: "new.png", buffer: Buffer.from("x") } as any);

      expect(fsPromises.unlink).not.toHaveBeenCalled();
    });
  });

  describe("removeLogo", () => {
    it("clears the logoUrl and deletes the file", async () => {
      prisma.companySettings.findUnique.mockResolvedValue({ logoUrl: "http://x/uploads/company/old.png" });
      prisma.companySettings.upsert.mockImplementation(({ update }: any) => update);

      const result = await service.removeLogo();

      expect(fsPromises.unlink).toHaveBeenCalled();
      expect(result.logoUrl).toBeNull();
    });
  });
});
