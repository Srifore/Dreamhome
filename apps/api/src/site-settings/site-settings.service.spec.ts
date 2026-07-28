import { Test } from "@nestjs/testing";
import { PrismaService } from "../prisma/prisma.service";
import { SiteSettingsService } from "./site-settings.service";
import { createPrismaMock, type PrismaMock } from "../test-utils/prisma-mock";

describe("SiteSettingsService", () => {
  let service: SiteSettingsService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const moduleRef = await Test.createTestingModule({
      providers: [SiteSettingsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(SiteSettingsService);
  });

  it("returns a null mapsUrl when nothing has been saved yet", async () => {
    prisma.siteSettings.findUnique.mockResolvedValue(null);
    await expect(service.get()).resolves.toEqual({ mapsUrl: null });
  });

  it("saves and returns the updated mapsUrl", async () => {
    prisma.siteSettings.upsert.mockResolvedValue({ mapsUrl: "https://maps.app.goo.gl/abc" });
    await expect(service.update("https://maps.app.goo.gl/abc")).resolves.toEqual({
      mapsUrl: "https://maps.app.goo.gl/abc",
    });
  });
});
