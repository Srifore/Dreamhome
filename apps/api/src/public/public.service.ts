import { Injectable, NotFoundException } from "@nestjs/common";
import { InteractionType, ProductStatus } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { phoneMatchKey } from "../common/utils/phone";
import { CreateEnquiryDto } from "./dto/create-enquiry.dto";

/**
 * Prices are deliberately withheld from all public-facing product data — DreamHome's sales
 * model is enquiry-driven, so price only appears once a staff member issues a formal quote.
 */
const PUBLIC_PRODUCT_SELECT = {
  id: true,
  name: true,
  modelNumber: true,
  description: true,
  images: true,
  features: true,
  manualUrl: true,
  brand: { select: { id: true, name: true, logoUrl: true } },
  category: { select: { id: true, name: true, slug: true } },
} as const;

/**
 * A product only becomes visible to customers once its website content is complete — a bare
 * inventory row (no description, no features) showing up to shoppers the moment it's created
 * would look broken. "Complete" mirrors the CRM's "Add Product Content" checklist: a non-empty
 * description, at least one feature, and a manual PDF. A photo is deliberately NOT required —
 * the product cards/detail page already fall back to a polished brand-monogram tile when there's
 * no image yet (see BrandMark on the website), so gating on a photo would just hide otherwise-
 * complete products for no visible benefit.
 */
const PUBLISHED_WHERE = {
  status: ProductStatus.ACTIVE,
  description: { not: null },
  manualUrl: { not: null },
  features: { isEmpty: false },
  NOT: { description: "" },
} as const;

@Injectable()
export class PublicService {
  constructor(private prisma: PrismaService) {}

  listBrands() {
    return this.prisma.brand.findMany({ orderBy: { name: "asc" } });
  }

  listCategories() {
    return this.prisma.category.findMany({
      where: { parentId: null },
      include: { children: true },
      orderBy: { name: "asc" },
    });
  }

  listProducts(filters: { categorySlug?: string; brandId?: string; search?: string }) {
    return this.prisma.product.findMany({
      where: {
        ...PUBLISHED_WHERE,
        brandId: filters.brandId,
        category: filters.categorySlug ? { slug: filters.categorySlug } : undefined,
        name: filters.search ? { contains: filters.search, mode: "insensitive" } : undefined,
      },
      select: PUBLIC_PRODUCT_SELECT,
      orderBy: { name: "asc" },
    });
  }

  async getProduct(id: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, ...PUBLISHED_WHERE },
      select: PUBLIC_PRODUCT_SELECT,
    });
    if (!product) {
      throw new NotFoundException("Product not found");
    }
    return product;
  }

  /**
   * Website enquiries land as a retail Lead, defaulted to the earliest active staff account
   * until reassigned. Matches the WhatsApp bot's dedup-by-phone convention: a repeat enquiry
   * from the same number is logged as an Interaction against the existing lead (preserving the
   * timeline and any notes staff already typed in the CRM) rather than overwriting `notes` or
   * spawning a disconnected duplicate lead per enquiry.
   */
  async createEnquiry(dto: CreateEnquiryDto) {
    const product = dto.productId
      ? await this.prisma.product.findUnique({ where: { id: dto.productId } })
      : null;

    const notesParts: string[] = [];
    if (product) notesParts.push(`Interested in: ${product.name}`);
    if (dto.message) notesParts.push(dto.message);
    const notes = notesParts.join(" — ") || undefined;

    // Matches on the last 10 digits (see phoneMatchKey) rather than the raw string — the same
    // person may have been recorded as "+91 99000 11122" by one channel and "919900011122" by
    // another (e.g. WhatsApp's `from` field), and those must resolve to the same lead.
    const key = phoneMatchKey(dto.phone);
    const candidates = await this.prisma.lead.findMany({
      where: { phone: { contains: key } },
      orderBy: { createdAt: "desc" },
    });
    const existingLead = candidates.find((l) => phoneMatchKey(l.phone) === key);
    if (existingLead) {
      if (notes) {
        await this.prisma.interaction.create({
          data: {
            type: InteractionType.OTHER,
            subject: "Website enquiry",
            body: notes,
            createdById: existingLead.assignedToId,
            leadId: existingLead.id,
          },
        });
      }
      return this.prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          name: dto.name || undefined,
          email: dto.email || undefined,
        },
      });
    }

    const owner = await this.prisma.user.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });
    if (!owner) {
      throw new NotFoundException("No staff account available to assign this enquiry to");
    }

    return this.prisma.lead.create({
      data: {
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        source: "Website",
        notes,
        assignedToId: owner.id,
      },
    });
  }
}
