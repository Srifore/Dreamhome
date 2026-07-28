import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { IntegrationProvider, ProductStatus, SocialPostStatus } from "@prisma/client";
import { mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { PrismaService } from "../prisma/prisma.service";
import { SettingsService } from "../settings/settings.service";
import type { FacebookConfig, InstagramConfig } from "../settings/integration-config.types";
import { ImageComposerService } from "./image-composer.service";
import { CaptionComposerService } from "./caption-composer.service";

const UPLOADS_DIR = join(process.cwd(), "uploads", "social-posts");
const GRAPH_API_VERSION = "v21.0";

const PRODUCT_INCLUDE = { brand: true, category: true } as const;

@Injectable()
export class SocialPostsService {
  private readonly logger = new Logger(SocialPostsService.name);

  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
    private imageComposer: ImageComposerService,
    private captionComposer: CaptionComposerService,
    private config: ConfigService,
  ) {}

  /** Runs once a day; a manual "Generate Now" trigger is also available via the controller. */
  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async dailyGenerate() {
    try {
      const post = await this.generate();
      this.logger.log(`Daily social post generated for product ${post.productId} (post ${post.id})`);
    } catch (err) {
      this.logger.warn(`Daily social post generation failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  findAll() {
    return this.prisma.socialPost.findMany({
      include: { product: { include: PRODUCT_INCLUDE } },
      orderBy: { generatedAt: "desc" },
    });
  }

  findLatestPending() {
    return this.prisma.socialPost.findFirst({
      where: { status: SocialPostStatus.PENDING_REVIEW },
      include: { product: { include: PRODUCT_INCLUDE } },
      orderBy: { generatedAt: "desc" },
    });
  }

  async getImageBuffer(id: string): Promise<Buffer> {
    const post = await this.prisma.socialPost.findUnique({ where: { id } });
    if (!post) {
      throw new NotFoundException("Social post not found");
    }
    return readFile(post.imagePath);
  }

  async generate(productId?: string) {
    const product = productId
      ? await this.prisma.product.findUnique({ where: { id: productId }, include: PRODUCT_INCLUDE })
      : await this.pickNextProduct();

    if (!product) {
      throw new BadRequestException("No active product available to feature");
    }

    const caption = this.captionComposer.compose({
      productName: product.name,
      brandName: product.brand.name,
      categoryName: product.category.name,
    });

    // How many times this product has been generated before — used (instead of the current
    // time) to pick the photo/palette, so each successive generate/regenerate steps to the next
    // one in sequence. A time-based seed with e.g. only 2 photos is a coin flip and can easily
    // repeat the same photo back-to-back, which is exactly what "always different" needs to avoid.
    const priorGenerationCount = await this.prisma.socialPost.count({ where: { productId: product.id } });

    const imageBuffer = await this.imageComposer.compose(
      {
        productName: product.name,
        brandName: product.brand.name,
        categoryName: product.category.name,
        modelNumber: product.modelNumber,
        photoUrls: product.images,
      },
      priorGenerationCount,
    );

    // Supersede any post still awaiting review before creating the new candidate.
    await this.prisma.socialPost.updateMany({
      where: { status: SocialPostStatus.PENDING_REVIEW },
      data: { status: SocialPostStatus.DISCARDED },
    });

    const post = await this.prisma.socialPost.create({
      data: { productId: product.id, caption, imagePath: "" },
    });

    const imagePath = join(UPLOADS_DIR, `${post.id}.jpg`);
    try {
      await mkdir(UPLOADS_DIR, { recursive: true });
      await writeFile(imagePath, imageBuffer);
    } catch (err) {
      // Don't leave a PENDING_REVIEW row behind whose image can never be read.
      await this.prisma.socialPost.delete({ where: { id: post.id } }).catch(() => undefined);
      throw err;
    }

    return this.prisma.socialPost.update({
      where: { id: post.id },
      data: { imagePath },
      include: { product: { include: PRODUCT_INCLUDE } },
    });
  }

  async regenerate(id: string) {
    const existing = await this.prisma.socialPost.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException("Social post not found");
    }
    if (existing.status !== SocialPostStatus.PENDING_REVIEW) {
      throw new BadRequestException("Only a pending post can be regenerated");
    }
    return this.generate(existing.productId);
  }

  async proceed(id: string) {
    // Atomically claim the post (flip PENDING_REVIEW -> POSTED) before doing any network calls.
    // A plain read-then-check here would let two rapid clicks (or a client retry) both see
    // PENDING_REVIEW and both post live to Instagram/Facebook — this update's WHERE clause
    // makes only one caller's claim succeed.
    const claim = await this.prisma.socialPost.updateMany({
      where: { id, status: SocialPostStatus.PENDING_REVIEW },
      data: { status: SocialPostStatus.POSTED },
    });
    if (claim.count === 0) {
      const existing = await this.prisma.socialPost.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundException("Social post not found");
      }
      throw new BadRequestException("This post has already been actioned");
    }

    const post = await this.prisma.socialPost.findUniqueOrThrow({ where: { id } });
    const publicApiUrl = this.config.get<string>("PUBLIC_API_URL", "http://localhost:3001");
    const imageUrl = `${publicApiUrl}/social-posts/${post.id}/image`;

    const [instagramResult, facebookResult] = await Promise.all([
      this.postToInstagram(imageUrl, post.caption),
      this.postToFacebook(imageUrl, post.caption),
    ]);

    return this.prisma.socialPost.update({
      where: { id },
      data: {
        status: SocialPostStatus.POSTED,
        postedToInstagramAt: instagramResult.ok ? new Date() : null,
        instagramError: instagramResult.ok ? null : instagramResult.error,
        postedToFacebookAt: facebookResult.ok ? new Date() : null,
        facebookError: facebookResult.ok ? null : facebookResult.error,
      },
      include: { product: { include: PRODUCT_INCLUDE } },
    });
  }

  private async pickNextProduct() {
    return this.prisma.product.findFirst({
      where: { status: ProductStatus.ACTIVE },
      include: PRODUCT_INCLUDE,
      orderBy: [{ socialPosts: { _count: "asc" } }, { createdAt: "asc" }],
    });
  }

  private async postToInstagram(imageUrl: string, caption: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const config = await this.settingsService.getDecryptedConfig<InstagramConfig>(
        IntegrationProvider.INSTAGRAM,
      );

      const createRes = await fetch(
        `https://graph.facebook.com/${GRAPH_API_VERSION}/${config.businessAccountId}/media`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image_url: imageUrl,
            caption,
            access_token: config.accessToken,
          }),
        },
      );
      const createBody = await createRes.json();
      if (!createRes.ok) throw new Error(createBody?.error?.message ?? `HTTP ${createRes.status}`);

      const publishRes = await fetch(
        `https://graph.facebook.com/${GRAPH_API_VERSION}/${config.businessAccountId}/media_publish`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ creation_id: createBody.id, access_token: config.accessToken }),
        },
      );
      const publishBody = await publishRes.json();
      if (!publishRes.ok) throw new Error(publishBody?.error?.message ?? `HTTP ${publishRes.status}`);

      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Instagram post failed (expected until real Meta credentials/public URL exist): ${message}`);
      return { ok: false, error: message };
    }
  }

  private async postToFacebook(imageUrl: string, caption: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const config = await this.settingsService.getDecryptedConfig<FacebookConfig>(
        IntegrationProvider.FACEBOOK,
      );

      const res = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${config.pageId}/photos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: imageUrl, caption, access_token: config.accessToken }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error?.message ?? `HTTP ${res.status}`);

      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Facebook post failed (expected until real Meta credentials/public URL exist): ${message}`);
      return { ok: false, error: message };
    }
  }
}
