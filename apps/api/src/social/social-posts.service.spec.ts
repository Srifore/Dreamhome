import { Test } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SocialPostStatus } from "@prisma/client";
import * as fsPromises from "fs/promises";
import { PrismaService } from "../prisma/prisma.service";
import { SettingsService } from "../settings/settings.service";
import { ImageComposerService } from "./image-composer.service";
import { CaptionComposerService } from "./caption-composer.service";
import { SocialPostsService } from "./social-posts.service";
import { createPrismaMock, type PrismaMock } from "../test-utils/prisma-mock";

jest.mock("fs/promises", () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue(Buffer.from("image")),
}));

describe("SocialPostsService", () => {
  let service: SocialPostsService;
  let prisma: PrismaMock;
  let settingsService: { getDecryptedConfig: jest.Mock };
  let imageComposer: { compose: jest.Mock };
  let captionComposer: { compose: jest.Mock };
  const originalFetch = global.fetch;

  const product = {
    id: "prod-1",
    name: "Designer Chimney",
    modelNumber: "DC-90",
    images: [],
    brand: { name: "Faber" },
    category: { name: "Designer Chimneys" },
  };

  beforeEach(async () => {
    prisma = createPrismaMock();
    settingsService = { getDecryptedConfig: jest.fn().mockRejectedValue(new Error("not configured")) };
    imageComposer = { compose: jest.fn().mockResolvedValue(Buffer.from("jpg-bytes")) };
    captionComposer = { compose: jest.fn().mockReturnValue("A great caption") };
    jest.clearAllMocks();
    (fsPromises.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fsPromises.writeFile as jest.Mock).mockResolvedValue(undefined);

    prisma.socialPost.count.mockResolvedValue(0);
    prisma.socialPost.create.mockResolvedValue({ id: "post-1" });
    prisma.socialPost.update.mockResolvedValue({ id: "post-1" });

    const moduleRef = await Test.createTestingModule({
      providers: [
        SocialPostsService,
        { provide: PrismaService, useValue: prisma },
        { provide: SettingsService, useValue: settingsService },
        { provide: ImageComposerService, useValue: imageComposer },
        { provide: CaptionComposerService, useValue: captionComposer },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue("http://localhost:3001") } },
      ],
    }).compile();
    service = moduleRef.get(SocialPostsService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("generate", () => {
    it("throws when there's no active product to feature", async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(service.generate()).rejects.toThrow(BadRequestException);
    });

    it("discards any prior PENDING_REVIEW post before creating the new candidate", async () => {
      prisma.product.findUnique.mockResolvedValue(product);

      await service.generate("prod-1");

      expect(prisma.socialPost.updateMany).toHaveBeenCalledWith({
        where: { status: SocialPostStatus.PENDING_REVIEW },
        data: { status: SocialPostStatus.DISCARDED },
      });
    });

    it("rolls back the created row if writing the image file fails", async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.socialPost.delete.mockResolvedValue({});
      (fsPromises.writeFile as jest.Mock).mockRejectedValue(new Error("disk full"));

      await expect(service.generate("prod-1")).rejects.toThrow("disk full");

      expect(prisma.socialPost.delete).toHaveBeenCalledWith({ where: { id: "post-1" } });
    });

    it("passes the prior-generation count as the variation seed so repeats don't reuse the same photo", async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.socialPost.count.mockResolvedValue(3);

      await service.generate("prod-1");

      expect(imageComposer.compose).toHaveBeenCalledWith(expect.any(Object), 3);
    });
  });

  describe("regenerate", () => {
    it("throws NotFoundException for a missing post", async () => {
      prisma.socialPost.findUnique.mockResolvedValue(null);
      await expect(service.regenerate("missing")).rejects.toThrow(NotFoundException);
    });

    it("refuses to regenerate a post that isn't still pending review", async () => {
      prisma.socialPost.findUnique.mockResolvedValue({ id: "post-1", status: SocialPostStatus.POSTED });
      await expect(service.regenerate("post-1")).rejects.toThrow("Only a pending post can be regenerated");
    });

    it("regenerates for the same product as the pending post being replaced", async () => {
      prisma.socialPost.findUnique.mockResolvedValue({
        id: "post-1",
        status: SocialPostStatus.PENDING_REVIEW,
        productId: "prod-1",
      });
      prisma.product.findUnique.mockResolvedValue(product);

      await service.regenerate("post-1");

      expect(prisma.product.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "prod-1" } }),
      );
    });
  });

  describe("proceed", () => {
    it("throws NotFoundException when the post doesn't exist at all", async () => {
      prisma.socialPost.updateMany.mockResolvedValue({ count: 0 });
      prisma.socialPost.findUnique.mockResolvedValue(null);

      await expect(service.proceed("missing")).rejects.toThrow(NotFoundException);
    });

    it("rejects acting on a post that's already been actioned (lost the atomic claim race)", async () => {
      prisma.socialPost.updateMany.mockResolvedValue({ count: 0 });
      prisma.socialPost.findUnique.mockResolvedValue({ id: "post-1", status: SocialPostStatus.POSTED });

      await expect(service.proceed("post-1")).rejects.toThrow("already been actioned");
    });

    it("records independent success/failure for Instagram and Facebook", async () => {
      prisma.socialPost.updateMany.mockResolvedValue({ count: 1 });
      prisma.socialPost.findUniqueOrThrow.mockResolvedValue({ id: "post-1", caption: "caption" });
      settingsService.getDecryptedConfig.mockImplementation((provider: string) => {
        if (provider === "INSTAGRAM") return Promise.resolve({ businessAccountId: "ig-1", accessToken: "tok" });
        return Promise.reject(new Error("Facebook not configured"));
      });
      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "media-1" }) }) // IG create
        .mockResolvedValueOnce({ ok: true, json: async () => ({}) }) as any; // IG publish

      await service.proceed("post-1");

      expect(prisma.socialPost.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            postedToInstagramAt: expect.any(Date),
            instagramError: null,
            postedToFacebookAt: null,
            facebookError: expect.stringContaining("Facebook not configured"),
          }),
        }),
      );
    });
  });
});
