import { Injectable, Logger } from "@nestjs/common";
import {
  IntegrationProvider,
  LeadStage,
  ProductStatus,
  ReviewRequestStatus,
  type Brand,
  type Category,
  type Customer,
  type Product,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SettingsService } from "../settings/settings.service";
import type { AiConfig } from "../settings/integration-config.types";
import { phoneMatchKey } from "../common/utils/phone";
import { productLabel } from "../common/utils/product-label";
import { AiChatService, type ChatMessage } from "./ai-chat.service";

const CHAT_HISTORY_TURNS = 5;

const MENU_TEXT = [
  "👋 Welcome to DreamHome — Premium Kitchen & Home Appliances!",
  "",
  "How can we help you today?",
  "1️⃣ Browse Products",
  "2️⃣ Track my Order / Service Request",
  "3️⃣ Book a Service",
  "4️⃣ Talk to our team",
  "",
  "Reply with a number, or just type your question.",
].join("\n");

const GREETING_KEYWORDS = ["hi", "hello", "hey", "menu", "start", "hii", "helo"];

// Generic — no appliance/brand names here. Those are recognized dynamically from the live
// product catalog (see findMatchingProducts), so a newly added product or brand is understood
// immediately without ever touching this file.
const PRODUCT_INTENT_KEYWORDS = [
  "product",
  "products",
  "catalog",
  "catalogue",
  "browse",
  "price",
  "quote",
  "cost",
  "brand",
  "brands",
];
const ORDER_KEYWORDS = ["order", "track", "status", "delivery"];
const SERVICE_KEYWORDS = ["service", "repair", "complaint", "amc", "warranty", "issue", "problem"];
const AGENT_KEYWORDS = ["agent", "human", "talk", "representative", "call me"];

export interface AutoReplyResult {
  replyText: string;
  customerId?: string;
  leadId?: string;
}

type ProductWithRelations = Product & { brand: Brand; category: Category };

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const HIGHLIGHT_MAX_LENGTH = 90;

// Some features were entered as long copy-pasted spec sheets rather than a short bullet — cap
// the length so one verbose feature doesn't turn a short WhatsApp reply into a wall of text.
function shortHighlight(feature: string): string {
  const trimmed = feature.trim();
  return trimmed.length > HIGHLIGHT_MAX_LENGTH ? `${trimmed.slice(0, HIGHLIGHT_MAX_LENGTH).trimEnd()}…` : trimmed;
}

function hasWholeWord(haystack: string, word: string): boolean {
  const cleaned = word.replace(/[^a-z0-9]/gi, "");
  if (!cleaned) return false;
  return new RegExp(`\\b${escapeRegExp(cleaned.toLowerCase())}\\b`).test(haystack);
}

@Injectable()
export class AutoReplyService {
  private readonly logger = new Logger(AutoReplyService.name);

  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
    private aiChatService: AiChatService,
  ) {}

  async generateReply(phone: string, rawMessage: string, contactName?: string): Promise<AutoReplyResult> {
    const message = rawMessage.trim().toLowerCase();
    const customer = await this.findCustomerByPhone(phone);
    // Every distinct phone number that messages in gets a Lead the moment they say anything —
    // mirrors the website's enquiry form, which creates one on first contact regardless of what
    // (if anything) the visitor typed in the message field.
    const leadId = await this.ensureLead(phone, contactName);

    // A known customer's first message back since their most recent purchase takes priority
    // over everything else below — see checkInOnLatestPurchase for why this only fires once.
    if (customer) {
      const checkIn = await this.checkInOnLatestPurchase(customer.id, rawMessage, leadId);
      if (checkIn) return checkIn;
    }

    if (GREETING_KEYWORDS.some((k) => message === k || message.startsWith(k + " "))) {
      return { replyText: MENU_TEXT, customerId: customer?.id, leadId };
    }

    // Exact numbered-menu replies (not substring matches — see the note above the keyword lists).
    if (message === "1") return { ...(await this.productInfoReply([], customer?.id)), leadId };
    if (message === "2") return this.handleOrderStatus(phone, customer?.id, leadId);
    if (message === "3") return this.handleServiceRequest(phone, message, customer?.id, leadId);
    if (message === "4") return this.escalate(leadId, customer?.id);

    // Specific, higher-intent phrases are checked before the generic product/pricing
    // catch-all, since e.g. "my chimney is broken, need repair" should be treated as a
    // service complaint, not a catalog browsing question, even though it names a product.
    if (AGENT_KEYWORDS.some((k) => message.includes(k))) {
      return this.escalate(leadId, customer?.id);
    }

    if (SERVICE_KEYWORDS.some((k) => message.includes(k))) {
      return this.handleServiceRequest(phone, message, customer?.id, leadId);
    }

    if (ORDER_KEYWORDS.some((k) => message.includes(k))) {
      return this.handleOrderStatus(phone, customer?.id, leadId);
    }

    // Genuine AI conversation about our products — only reached once none of the structured
    // intents above matched, and only used when it's actually available (see tryAiChat).
    const aiReply = await this.tryAiChat(leadId, customer, rawMessage);
    if (aiReply) return aiReply;

    const matches = await this.findMatchingProducts(message);
    if (matches.length > 0 || PRODUCT_INTENT_KEYWORDS.some((k) => message.includes(k))) {
      return { ...(await this.productInfoReply(matches, customer?.id)), leadId };
    }

    // Fallback: record the raw message on the lead rather than leaving the customer unanswered.
    await this.recordEnquiryNotes(leadId, rawMessage);
    return {
      replyText:
        "Thanks for reaching out! We've noted your message and our team will get back to you shortly. Meanwhile, reply 'menu' to see what we can help with.",
      customerId: customer?.id,
      leadId,
    };
  }

  /**
   * Recognizes products entirely from live catalog data — a model number match or a distinctive
   * word from the product's own name wins outright; failing that, a matching category name (e.g.
   * "chimney" against category "Designer Chimneys"). A newly created product or category is
   * understood the moment it exists, with no code change here.
   */
  private async findMatchingProducts(message: string): Promise<ProductWithRelations[]> {
    const products = await this.prisma.product.findMany({
      where: { status: ProductStatus.ACTIVE },
      include: { brand: true, category: true },
    });

    const specific = products.filter((p) => {
      if (p.modelNumber && message.includes(p.modelNumber.toLowerCase())) return true;
      const nameWords = p.name.split(/\s+/).filter((w) => w.length >= 5);
      return nameWords.some((w) => hasWholeWord(message, w));
    });
    if (specific.length > 0) return specific.slice(0, 3);

    const byCategory = products.filter((p) => {
      const categoryWords = p.category.name.split(/\s+/).filter((w) => w.length >= 5);
      return categoryWords.some((w) => hasWholeWord(message, w));
    });
    return byCategory.slice(0, 3);
  }

  private async productInfoReply(
    matches: ProductWithRelations[],
    customerId?: string,
  ): Promise<Omit<AutoReplyResult, "leadId">> {
    if (matches.length > 0) {
      const lines = matches.map((p) => {
        const highlight = p.features[0] ? ` — ${shortHighlight(p.features[0])}` : "";
        return `• ${productLabel(p)}${highlight}`;
      });
      return {
        replyText: [
          "Here's what we have:",
          "",
          ...lines,
          "",
          "Enquire for pricing and our team will follow up with full details and current offers.",
        ].join("\n"),
        customerId,
      };
    }

    // No specific product or category recognized — built from the live brand list (not a
    // hardcoded string) so it stays accurate as brands are added or removed.
    const brands = await this.prisma.brand.findMany({
      where: { products: { some: { status: ProductStatus.ACTIVE } } },
      select: { name: true },
      orderBy: { name: "asc" },
    });
    const brandList = brands.map((b) => b.name).join(", ") || "our catalog";
    return {
      replyText: [
        `We carry premium kitchen and home appliances from ${brandList}.`,
        "",
        "Tell us which appliance or brand you're interested in and our team will share the best options and pricing for your home.",
      ].join("\n"),
      customerId,
    };
  }

  /**
   * Fires only the first time a known customer messages back after their most recent purchase —
   * existence of a ProductReview row for that ProductUnit is the flag that it already happened,
   * so it can never re-ask for the same purchase. Their next reply is treated as the review
   * response UNLESS it's clearly a menu/order/service/agent command (see isRoutingCommand) — in
   * that case normal routing handles it instead, and the review stays REQUESTED so genuine
   * feedback can still be captured the next time they say something that isn't a command.
   */
  private async checkInOnLatestPurchase(
    customerId: string,
    rawMessage: string,
    leadId: string,
  ): Promise<AutoReplyResult | null> {
    const latestUnit = await this.prisma.productUnit.findFirst({
      where: { customerId, soldAt: { not: null } },
      orderBy: { soldAt: "desc" },
      include: { product: { include: { brand: true } }, customer: true },
    });
    if (!latestUnit || !latestUnit.customer) return null;

    const existingReview = await this.prisma.productReview.findUnique({
      where: { productUnitId: latestUnit.id },
    });

    if (!existingReview) {
      await this.prisma.productReview.create({
        data: { customerId, productId: latestUnit.productId, productUnitId: latestUnit.id },
      });
      const label = productLabel(latestUnit.product);
      return {
        replyText: [
          `Hi ${latestUnit.customer.name}! Great to hear from you again 👋`,
          "",
          `How's your ${label} working out? We'd love to hear your feedback — just reply here!`,
        ].join("\n"),
        customerId,
        leadId,
      };
    }

    if (existingReview.status === ReviewRequestStatus.REQUESTED) {
      // A clear menu/order/service/agent command must still be routed normally, not swallowed
      // as if it were review feedback — leave the review REQUESTED so real feedback can still
      // land on a later message.
      if (this.isRoutingCommand(rawMessage.trim().toLowerCase())) return null;

      const rating = /^[1-5]$/.test(rawMessage.trim()) ? Number(rawMessage.trim()) : undefined;
      await this.prisma.productReview.update({
        where: { id: existingReview.id },
        data: { status: ReviewRequestStatus.RECEIVED, comment: rawMessage, rating, respondedAt: new Date() },
      });
      return {
        replyText: "Thank you so much for your feedback! We really appreciate you taking the time to share it. 🙏",
        customerId,
        leadId,
      };
    }

    return null; // already RECEIVED — proceed to normal routing
  }

  /** True for messages that clearly mean "take me to the menu/order/service/agent flow" rather
   *  than free-text feedback — the same keyword sets generateReply itself routes on. */
  private isRoutingCommand(message: string): boolean {
    if (["1", "2", "3", "4"].includes(message)) return true;
    if (GREETING_KEYWORDS.some((k) => message === k || message.startsWith(k + " "))) return true;
    return [...AGENT_KEYWORDS, ...SERVICE_KEYWORDS, ...ORDER_KEYWORDS].some((k) => message.includes(k));
  }

  /**
   * Genuine AI conversation about DreamHome's products — grounded in the live catalog and the
   * last few exchanges of this conversation (Interaction rows keyed by leadId, already populated
   * on every exchange via ensureLead). Returns null (never throws) whenever AI isn't usable for
   * any reason — not configured, bad key, network failure, OpenAI error — so the rule-based
   * product matching that runs after this always still works even if AI is unset or down.
   */
  private async tryAiChat(
    leadId: string,
    customer: Customer | undefined,
    rawMessage: string,
  ): Promise<AutoReplyResult | null> {
    try {
      const config = await this.settingsService.getDecryptedConfig<AiConfig>(IntegrationProvider.AI_IMAGE);

      const [products, historyRows] = await Promise.all([
        this.prisma.product.findMany({
          where: { status: ProductStatus.ACTIVE },
          include: { brand: true, category: true },
        }),
        this.prisma.interaction.findMany({
          where: { leadId },
          orderBy: { createdAt: "desc" },
          take: CHAT_HISTORY_TURNS * 2,
        }),
      ]);

      const catalogLines = products.map((p) => {
        const details = [
          p.modelNumber ? `Model: ${p.modelNumber}` : null,
          p.description,
          p.features.length ? `Features: ${p.features.join("; ")}` : null,
        ]
          .filter(Boolean)
          .join(" — ");
        return `- ${productLabel(p)} (${p.category.name})${details ? `: ${details}` : ""}`;
      });

      const systemPrompt = [
        "You are the WhatsApp assistant for DreamHome, a premium kitchen and home appliance retailer in Bengaluru.",
        "Only discuss DreamHome's products, brands, and services. If asked about anything unrelated to our business, politely decline and steer the conversation back to how you can help with appliances.",
        "Never invent products, models, features, or prices that aren't in the catalog below. Pricing is never shared automatically — always invite the customer to enquire so a team member can follow up with a formal quote.",
        "Keep replies short and conversational — a few lines, suitable for WhatsApp, not a long essay.",
        customer ? `You're speaking with an existing customer named ${customer.name}.` : "",
        "",
        "Current product catalog:",
        catalogLines.join("\n") || "(no active products right now)",
      ]
        .filter(Boolean)
        .join("\n");

      const history: ChatMessage[] = historyRows
        .reverse()
        .filter((row) => row.body)
        .map((row) => ({
          role: row.subject === "Auto-reply" ? ("assistant" as const) : ("user" as const),
          content: row.body as string,
        }));

      const replyText = await this.aiChatService.reply(
        systemPrompt,
        [...history, { role: "user", content: rawMessage }],
        config.apiKey,
      );

      return { replyText, customerId: customer?.id, leadId };
    } catch (err) {
      this.logger.warn(
        `AI chat unavailable — falling back to rule-based replies: ${err instanceof Error ? err.message : err}`,
      );
      return null;
    }
  }

  private async escalate(leadId: string, customerId?: string): Promise<AutoReplyResult> {
    await this.prisma.lead.update({
      where: { id: leadId },
      data: { stage: LeadStage.CONTACTED, notes: "Requested to speak with a team member." },
    });
    return {
      replyText:
        "Sure — one of our team members will reach out to you shortly. You can also call us directly at +91 98450 59388.",
      customerId,
      leadId,
    };
  }

  private async handleOrderStatus(
    phone: string,
    customerId: string | undefined,
    leadId: string,
  ): Promise<AutoReplyResult> {
    if (!customerId) {
      return {
        replyText:
          "We couldn't find any orders linked to this number. Could you share your order number or the mobile number used at purchase?",
        leadId,
      };
    }

    const [order, ticket] = await Promise.all([
      this.prisma.salesOrder.findFirst({
        where: { customerId },
        orderBy: { createdAt: "desc" },
        include: { invoice: true },
      }),
      this.prisma.serviceTicket.findFirst({
        where: { customerId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const lines: string[] = [];
    if (order) {
      lines.push(`Order ${order.orderNumber}: ${order.status}`);
      if (order.invoice) lines.push(`Invoice ${order.invoice.invoiceNumber}: ${order.invoice.status}`);
    }
    if (ticket) {
      lines.push(`Service ticket for "${ticket.issueDescription}": ${ticket.status}`);
    }
    if (lines.length === 0) {
      lines.push("We don't see any recent orders or service tickets linked to this number yet.");
    }

    return { replyText: lines.join("\n"), customerId, leadId };
  }

  private async handleServiceRequest(
    phone: string,
    message: string,
    customerId: string | undefined,
    leadId: string,
  ): Promise<AutoReplyResult> {
    const serialMatch = message.match(/[a-z]{2,}-[a-z0-9-]{4,}/i);
    if (serialMatch) {
      const unit = await this.prisma.productUnit.findUnique({
        where: { serialNumber: serialMatch[0].toUpperCase() },
      });
      if (unit && unit.customerId) {
        await this.prisma.serviceTicket.create({
          data: {
            productUnitId: unit.id,
            customerId: unit.customerId,
            issueDescription: `WhatsApp service request: ${message}`,
          },
        });
        return {
          replyText:
            "Thanks — we've logged a service request for your appliance and a technician will be assigned shortly.",
          customerId: unit.customerId,
          leadId,
        };
      }
    }

    return {
      replyText:
        "Please share your product's serial number (found on the appliance nameplate) or your registered mobile number so we can pull up your purchase and log a service request.",
      customerId,
      leadId,
    };
  }

  /** Ensures every phone number that messages in has a Lead — created on first contact with
   *  whatever name WhatsApp reports for that contact, updated on later messages instead of
   *  duplicated. Matches on the last 10 digits (see phoneMatchKey) so "+91 99000 11122" from a
   *  web form and "919900011122" from WhatsApp's `from` field resolve to the same lead. */
  private async ensureLead(phone: string, name?: string): Promise<string> {
    const existingLead = await this.findLeadByPhone(phone);
    if (existingLead) return existingLead.id;

    const owner = await this.prisma.user.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
    });
    if (!owner) {
      throw new Error("Cannot create a lead from WhatsApp — no active staff account exists to assign it to");
    }
    const lead = await this.prisma.lead.create({
      data: {
        name: name || `WhatsApp ${phone}`,
        phone,
        source: "WhatsApp",
        assignedToId: owner.id,
      },
    });
    return lead.id;
  }

  private async recordEnquiryNotes(leadId: string, message: string): Promise<void> {
    await this.prisma.lead.update({ where: { id: leadId }, data: { notes: message } });
  }

  private async findCustomerByPhone(phone: string) {
    const key = phoneMatchKey(phone);
    const candidates = await this.prisma.customer.findMany({ where: { phone: { contains: key } } });
    return candidates.find((c) => phoneMatchKey(c.phone) === key);
  }

  private async findLeadByPhone(phone: string) {
    const key = phoneMatchKey(phone);
    const candidates = await this.prisma.lead.findMany({
      where: { phone: { contains: key } },
      orderBy: { createdAt: "desc" },
    });
    return candidates.find((l) => phoneMatchKey(l.phone) === key);
  }
}
