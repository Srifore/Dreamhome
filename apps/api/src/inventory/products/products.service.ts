import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { EventEmitter2 } from "@nestjs/event-emitter";
import type { Prisma } from "@prisma/client";
import { mkdir, unlink, writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import {
  DomainEvents,
  type ProductCreatedEvent,
  type ProductUpdatedEvent,
} from "../../common/events/domain-events";
import { CreateProductDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";

const UPLOADS_ROOT = join(process.cwd(), "uploads", "products");
const MAX_PRODUCT_IMAGES = 8;

@Injectable()
export class ProductsService {
  constructor(
    private prisma: PrismaService,
    private events: EventEmitter2,
    private config: ConfigService,
  ) {}

  findAll() {
    return this.prisma.product.findMany({
      include: { brand: true, category: true, stockLevels: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { brand: true, category: true, stockLevels: { include: { branch: true } } },
    });
    if (!product) {
      throw new NotFoundException("Product not found");
    }
    return product;
  }

  async create(dto: CreateProductDto) {
    const existing = await this.prisma.product.findUnique({ where: { sku: dto.sku } });
    if (existing) {
      throw new ConflictException("A product with this SKU already exists");
    }

    const product = await this.prisma.product.create({
      data: dto as unknown as Prisma.ProductUncheckedCreateInput,
    });
    this.events.emit(DomainEvents.PRODUCT_CREATED, { productId: product.id } satisfies ProductCreatedEvent);
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findOne(id);
    const product = await this.prisma.product.update({
      where: { id },
      data: dto as unknown as Prisma.ProductUncheckedUpdateInput,
    });
    this.events.emit(DomainEvents.PRODUCT_UPDATED, { productId: product.id } satisfies ProductUpdatedEvent);
    return product;
  }

  /** Adds uploaded images to the product's gallery — shown on the public website's product pages. */
  async addImages(id: string, files: Express.Multer.File[]) {
    const product = await this.findOne(id);
    if (product.images.length + files.length > MAX_PRODUCT_IMAGES) {
      const remaining = Math.max(0, MAX_PRODUCT_IMAGES - product.images.length);
      throw new BadRequestException(
        `This product already has ${product.images.length} photo(s) — only ${remaining} more can be added (max ${MAX_PRODUCT_IMAGES}).`,
      );
    }
    const dir = join(UPLOADS_ROOT, id);
    await mkdir(dir, { recursive: true });

    const baseUrl = this.config.get<string>("PUBLIC_API_URL", "http://localhost:3001");
    const newUrls: string[] = [];
    for (const file of files) {
      const filename = `${randomUUID()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      await writeFile(join(dir, filename), file.buffer);
      newUrls.push(`${baseUrl}/uploads/products/${id}/${filename}`);
    }

    return this.prisma.product.update({
      where: { id },
      data: { images: [...product.images, ...newUrls] },
    });
  }

  async removeImage(id: string, imageUrl: string) {
    const product = await this.findOne(id);
    await this.deleteUploadedFile(imageUrl);
    return this.prisma.product.update({
      where: { id },
      data: { images: product.images.filter((url) => url !== imageUrl) },
    });
  }

  /** Replaces the product's manual/spec-sheet PDF — linked from the public product page. */
  async setManual(id: string, file: Express.Multer.File) {
    const product = await this.findOne(id);
    if (product.manualUrl) {
      await this.deleteUploadedFile(product.manualUrl);
    }

    const dir = join(UPLOADS_ROOT, id);
    await mkdir(dir, { recursive: true });
    const filename = `manual-${randomUUID()}.pdf`;
    await writeFile(join(dir, filename), file.buffer);

    const baseUrl = this.config.get<string>("PUBLIC_API_URL", "http://localhost:3001");
    return this.prisma.product.update({
      where: { id },
      data: { manualUrl: `${baseUrl}/uploads/products/${id}/${filename}` },
    });
  }

  async removeManual(id: string) {
    const product = await this.findOne(id);
    if (product.manualUrl) {
      await this.deleteUploadedFile(product.manualUrl);
    }
    return this.prisma.product.update({ where: { id }, data: { manualUrl: null } });
  }

  /**
   * A product that's ever been quoted, sold, or has serialized units on record is part of real
   * transaction/warranty history — deleting it would orphan those records, so it's blocked in
   * favor of marking it Discontinued instead. Otherwise removes its incidental records (stock
   * counts, reviews, draft marketing posts) and uploaded files along with it.
   */
  async remove(id: string) {
    const product = await this.findOne(id);
    const [quoteItemCount, salesOrderItemCount, productUnitCount] = await Promise.all([
      this.prisma.quoteItem.count({ where: { productId: id } }),
      this.prisma.salesOrderItem.count({ where: { productId: id } }),
      this.prisma.productUnit.count({ where: { productId: id } }),
    ]);
    if (quoteItemCount || salesOrderItemCount || productUnitCount) {
      throw new BadRequestException(
        "Cannot delete a product that has been quoted, sold, or has serialized units on record — mark it Discontinued instead.",
      );
    }

    for (const url of product.images) {
      await this.deleteUploadedFile(url);
    }
    if (product.manualUrl) {
      await this.deleteUploadedFile(product.manualUrl);
    }

    await this.prisma.$transaction([
      this.prisma.stockLevel.deleteMany({ where: { productId: id } }),
      this.prisma.productReview.deleteMany({ where: { productId: id } }),
      this.prisma.socialPost.deleteMany({ where: { productId: id } }),
      this.prisma.product.delete({ where: { id } }),
    ]);
  }

  private async deleteUploadedFile(fileUrl: string) {
    const marker = "/uploads/";
    const index = fileUrl.indexOf(marker);
    if (index === -1) return;
    const relativePath = fileUrl.slice(index + marker.length);
    await unlink(join(process.cwd(), "uploads", relativePath)).catch(() => undefined);
  }
}
