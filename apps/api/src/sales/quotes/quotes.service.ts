import { BadGatewayException, BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { QuoteStatus } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { CompanySettingsService } from "../../company-settings/company-settings.service";
import { WhatsAppService } from "../../whatsapp/whatsapp.service";
import { CreateQuoteDto } from "./dto/create-quote.dto";
import { UpdateQuoteStatusDto } from "./dto/update-quote-status.dto";

const EDITABLE_STATUSES: QuoteStatus[] = [QuoteStatus.DRAFT, QuoteStatus.SENT];

function assertValidItems(items: CreateQuoteDto["items"]) {
  const uniqueProductIds = new Set(items.map((item) => item.productId));
  if (uniqueProductIds.size !== items.length) {
    throw new BadRequestException(
      "Each product can only appear once per quote — increase the quantity on that line instead of adding it twice",
    );
  }
}

interface ProductTaxInfo {
  hsnCode: string | null;
  gstRate: number | null;
}

interface TaxedItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  hsnCode: string | null;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
}

/**
 * CGST+SGST when the place of supply matches the business's own state (the item's GST rate
 * split in half each); IGST — the full rate — when it doesn't. Either state being unknown
 * defaults to intra-state (CGST+SGST), the common case for a single-location retailer, rather
 * than silently guessing an interstate charge.
 */
function computeQuoteTotals(
  items: CreateQuoteDto["items"],
  productTaxById: Map<string, ProductTaxInfo>,
  placeOfSupplyState: string | null,
  companyState: string | null,
) {
  const isIntraState =
    !placeOfSupplyState ||
    !companyState ||
    placeOfSupplyState.trim().toLowerCase() === companyState.trim().toLowerCase();

  let subtotal = 0;
  let discount = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;

  const taxedItems: TaxedItem[] = items.map((item) => {
    const productTax = productTaxById.get(item.productId);
    const gstRate = productTax?.gstRate ?? 0;
    const lineAmount = item.quantity * item.unitPrice;
    const lineDiscount = item.discount ?? 0;
    const taxable = lineAmount - lineDiscount;

    const cgstAmount = isIntraState ? (taxable * gstRate) / 2 / 100 : 0;
    const sgstAmount = isIntraState ? (taxable * gstRate) / 2 / 100 : 0;
    const igstAmount = isIntraState ? 0 : (taxable * gstRate) / 100;

    subtotal += lineAmount;
    discount += lineDiscount;
    cgstTotal += cgstAmount;
    sgstTotal += sgstAmount;
    igstTotal += igstAmount;

    return {
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: lineDiscount,
      hsnCode: productTax?.hsnCode ?? null,
      gstRate,
      cgstAmount,
      sgstAmount,
      igstAmount,
    };
  });

  const rawTotal = subtotal - discount + cgstTotal + sgstTotal + igstTotal;
  const total = Math.round(rawTotal);
  const roundingAdjustment = total - rawTotal;

  return { subtotal, discount, cgstTotal, sgstTotal, igstTotal, roundingAdjustment, total, items: taxedItems };
}

@Injectable()
export class QuotesService {
  constructor(
    private prisma: PrismaService,
    private companySettingsService: CompanySettingsService,
    private whatsAppService: WhatsAppService,
  ) {}

  findAll() {
    return this.prisma.quote.findMany({
      include: { customer: true, b2bAccount: true, items: true, salesOrder: { select: { id: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  async findOne(id: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        customer: true,
        b2bAccount: { include: { contacts: true } },
        opportunity: true,
        items: { include: { product: true } },
        salesOrder: true,
      },
    });
    if (!quote) {
      throw new NotFoundException("Quote not found");
    }
    return quote;
  }

  async create(rawDto: CreateQuoteDto, createdById: string) {
    if (!rawDto.customerId && !rawDto.b2bAccountId && !rawDto.newCustomer) {
      throw new BadRequestException("A quote must be linked to a customer or a B2B account");
    }
    assertValidItems(rawDto.items);

    const customerId = rawDto.customerId ?? (await this.resolveOrCreateCustomer(rawDto.newCustomer));
    const dto = { ...rawDto, customerId };
    await this.applyGstinOverrides(rawDto);

    const [productTaxById, placeOfSupplyState, shippingAddress, companyState] = await Promise.all([
      this.getProductTaxInfo(dto.items),
      this.resolvePlaceOfSupplyState(dto),
      this.resolveShippingAddress(dto),
      this.companySettingsService.getState(),
    ]);
    const totals = computeQuoteTotals(dto.items, productTaxById, placeOfSupplyState, companyState);
    const quoteNumber = await this.nextQuoteNumber();

    return this.prisma.quote.create({
      data: {
        quoteNumber,
        customerId: dto.customerId,
        b2bAccountId: dto.b2bAccountId,
        opportunityId: dto.opportunityId,
        leadId: dto.leadId,
        quoteDate: dto.quoteDate ? new Date(dto.quoteDate) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        placeOfSupplyState,
        shippingAddress,
        notes: dto.notes,
        termsAndConditions: dto.termsAndConditions,
        templateId: dto.templateId || "standard",
        subtotal: totals.subtotal,
        discount: totals.discount,
        cgstTotal: totals.cgstTotal,
        sgstTotal: totals.sgstTotal,
        igstTotal: totals.igstTotal,
        roundingAdjustment: totals.roundingAdjustment,
        total: totals.total,
        createdById,
        items: { create: totals.items },
      },
      include: { items: true },
    });
  }

  /**
   * Editable only up to the point the customer has actually responded — a quote that's already
   * Accepted has a Sales Order built from its exact numbers, and Rejected/Expired ones are
   * closed out, so rewriting either after the fact would silently disagree with what was acted
   * on. Replaces the whole item set rather than diffing individual lines, since the frontend
   * always submits the complete current table.
   */
  async update(id: string, dto: CreateQuoteDto) {
    const quote = await this.findOne(id);
    if (!EDITABLE_STATUSES.includes(quote.status)) {
      throw new BadRequestException(`Cannot edit a quote that is ${quote.status.toLowerCase()}`);
    }
    if (!dto.customerId && !dto.b2bAccountId) {
      throw new BadRequestException("A quote must be linked to a customer or a B2B account");
    }
    assertValidItems(dto.items);
    await this.applyGstinOverrides(dto);

    const [productTaxById, placeOfSupplyState, shippingAddress, companyState] = await Promise.all([
      this.getProductTaxInfo(dto.items),
      this.resolvePlaceOfSupplyState(dto),
      this.resolveShippingAddress(dto),
      this.companySettingsService.getState(),
    ]);
    const totals = computeQuoteTotals(dto.items, productTaxById, placeOfSupplyState, companyState);

    return this.prisma.quote.update({
      where: { id },
      data: {
        customerId: dto.customerId ?? null,
        b2bAccountId: dto.b2bAccountId ?? null,
        quoteDate: dto.quoteDate ? new Date(dto.quoteDate) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
        placeOfSupplyState,
        shippingAddress,
        notes: dto.notes,
        termsAndConditions: dto.termsAndConditions,
        templateId: dto.templateId || "standard",
        subtotal: totals.subtotal,
        discount: totals.discount,
        cgstTotal: totals.cgstTotal,
        sgstTotal: totals.sgstTotal,
        igstTotal: totals.igstTotal,
        roundingAdjustment: totals.roundingAdjustment,
        total: totals.total,
        items: {
          deleteMany: {},
          create: totals.items,
        },
      },
      include: { items: true },
    });
  }

  async updateStatus(id: string, dto: UpdateQuoteStatusDto) {
    await this.findOne(id);
    return this.prisma.quote.update({ where: { id }, data: { status: dto.status } });
  }

  /** A quote that's already been confirmed into a Sales Order is the record of a real sale — deleting it would orphan that order's paper trail, so it's blocked. */
  async remove(id: string) {
    const quote = await this.findOne(id);
    if (quote.salesOrder) {
      throw new BadRequestException("Cannot delete a quote that has already been confirmed as a sales order");
    }
    await this.prisma.quote.delete({ where: { id } });
  }

  /** Sends a text summary of the quote to the customer's (or B2B account's first contact's) phone via WhatsApp. */
  async sendViaWhatsApp(id: string) {
    const quote = await this.findOne(id);
    const phone = quote.customer?.phone ?? quote.b2bAccount?.contacts.find((c) => c.phone)?.phone;
    if (!phone) {
      throw new BadRequestException("No phone number on file for this quote's customer or account");
    }

    const company = await this.companySettingsService.get();
    const message = this.buildWhatsAppMessage(quote, company);
    try {
      await this.whatsAppService.sendMessage(phone, message);
    } catch (err) {
      throw new BadGatewayException(
        `Could not deliver the WhatsApp message — check the WhatsApp Business API configuration in Settings (${err instanceof Error ? err.message : "unknown error"})`,
      );
    }
    return { sent: true };
  }

  private buildWhatsAppMessage(
    quote: Awaited<ReturnType<QuotesService["findOne"]>>,
    company: Awaited<ReturnType<CompanySettingsService["get"]>>,
  ): string {
    const party = quote.customer?.name ?? quote.b2bAccount?.name ?? "there";
    const companyName = company.legalName || "us";
    const lines = quote.items.map(
      (item) => `- ${item.quantity} x ${item.product?.name ?? "Item"}: ₹${Number(item.unitPrice) * item.quantity}`,
    );
    const validUntil = quote.validUntil
      ? `\nValid until: ${quote.validUntil.toLocaleDateString("en-IN")}`
      : "";
    const contact = company.phone ? `\n\nFor any questions, reach us at ${company.phone}.` : "";

    return (
      `Hi ${party},\n\nThank you for your interest in ${companyName}. Here is your quote ${quote.quoteNumber}:\n\n` +
      `${lines.join("\n")}\n\nTotal: ₹${Number(quote.total).toLocaleString("en-IN")}${validUntil}${contact}\n\nThank you,\n${companyName}`
    );
  }

  /**
   * Derived from the highest quote number ever issued, not `count()` — quotes can now be deleted
   * (see `remove`), so a row count would collide with an existing number once any quote has been
   * removed and leaves a gap.
   */
  private async nextQuoteNumber(): Promise<string> {
    const last = await this.prisma.quote.findFirst({
      orderBy: { quoteNumber: "desc" },
      select: { quoteNumber: true },
    });
    const lastNumber = last ? parseInt(last.quoteNumber.replace("Q-", ""), 10) : 0;
    return `Q-${String(lastNumber + 1).padStart(6, "0")}`;
  }

  /**
   * Quick-add path: creates the customer as part of saving the quote instead of requiring one to
   * already exist. Reuses an existing customer by phone (the unique key) rather than erroring, in
   * case the same walk-in customer is quoted again without anyone looking them up first.
   */
  private async resolveOrCreateCustomer(newCustomer: CreateQuoteDto["newCustomer"]): Promise<string | undefined> {
    if (!newCustomer) return undefined;
    const existing = await this.prisma.customer.findUnique({ where: { phone: newCustomer.phone } });
    if (existing) return existing.id;

    const created = await this.prisma.customer.create({
      data: {
        name: newCustomer.name,
        phone: newCustomer.phone,
        email: newCustomer.email,
        address: newCustomer.address,
        gstin: newCustomer.gstin,
        state: newCustomer.state,
      },
    });
    return created.id;
  }

  /**
   * Lets whoever is creating/editing the quote fill in or correct the selected customer's/B2B
   * account's GSTIN right there, without needing separate CRM-edit permission — same reasoning as
   * the quick-add-customer path above.
   */
  private async applyGstinOverrides(dto: CreateQuoteDto): Promise<void> {
    if (dto.customerId && dto.customerGstin !== undefined) {
      await this.prisma.customer.update({
        where: { id: dto.customerId },
        data: { gstin: dto.customerGstin.trim() || null },
      });
    }
    if (dto.b2bAccountId && dto.b2bAccountGstin !== undefined) {
      await this.prisma.b2BAccount.update({
        where: { id: dto.b2bAccountId },
        data: { gstin: dto.b2bAccountGstin.trim() || null },
      });
    }
  }

  private async getProductTaxInfo(items: CreateQuoteDto["items"]): Promise<Map<string, ProductTaxInfo>> {
    const products = await this.prisma.product.findMany({
      where: { id: { in: items.map((item) => item.productId) } },
      select: { id: true, hsnCode: true, gstRate: true },
    });
    return new Map(
      products.map((p) => [p.id, { hsnCode: p.hsnCode, gstRate: p.gstRate ? Number(p.gstRate) : null }]),
    );
  }

  /** Explicit override wins; otherwise defaults to the selected customer's/B2B account's state. */
  private async resolvePlaceOfSupplyState(dto: CreateQuoteDto): Promise<string | null> {
    if (dto.placeOfSupplyState?.trim()) return dto.placeOfSupplyState.trim();
    if (dto.customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: dto.customerId },
        select: { state: true },
      });
      return customer?.state ?? null;
    }
    if (dto.b2bAccountId) {
      const account = await this.prisma.b2BAccount.findUnique({
        where: { id: dto.b2bAccountId },
        select: { state: true },
      });
      return account?.state ?? null;
    }
    return null;
  }

  /**
   * Explicit override wins; otherwise defaults to the selected customer's/B2B account's
   * shippingAddress, falling back to their billing address if no separate shipping address is on
   * file (mirrors the Ship To fallback shown on the printed quote/invoice).
   */
  private async resolveShippingAddress(dto: CreateQuoteDto): Promise<string | null> {
    if (dto.shippingAddress?.trim()) return dto.shippingAddress.trim();
    if (dto.customerId) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: dto.customerId },
        select: { shippingAddress: true, address: true },
      });
      return customer?.shippingAddress || customer?.address || null;
    }
    if (dto.b2bAccountId) {
      const account = await this.prisma.b2BAccount.findUnique({
        where: { id: dto.b2bAccountId },
        select: { shippingAddress: true, address: true },
      });
      return account?.shippingAddress || account?.address || null;
    }
    return null;
  }
}
