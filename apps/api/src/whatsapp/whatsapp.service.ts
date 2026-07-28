import { ForbiddenException, Injectable, Logger } from "@nestjs/common";
import { InteractionType, IntegrationProvider } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SettingsService } from "../settings/settings.service";
import type { WhatsAppConfig } from "../settings/integration-config.types";
import { AutoReplyService, type AutoReplyResult } from "./auto-reply.service";

const BOT_USER_EMAIL = "whatsapp-bot@dreamhome.local";
const GRAPH_API_VERSION = "v21.0";

export interface WhatsAppWebhookPayload {
  entry?: Array<{
    changes?: Array<{
      value?: {
        contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          type: string;
          text?: { body: string };
        }>;
      };
    }>;
  }>;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private prisma: PrismaService,
    private settingsService: SettingsService,
    private autoReply: AutoReplyService,
  ) {}

  async verifyWebhook(mode: string, token: string, challenge: string): Promise<string> {
    const config = await this.settingsService
      .getDecryptedConfig<WhatsAppConfig>(IntegrationProvider.WHATSAPP)
      .catch(() => null);

    if (mode !== "subscribe" || !config || token !== config.verifyToken) {
      throw new ForbiddenException("Webhook verification failed");
    }
    return challenge;
  }

  async handleIncomingMessage(payload: WhatsAppWebhookPayload): Promise<void> {
    // Meta can batch multiple entries (e.g. multiple phone numbers under one subscription) and
    // multiple changes per entry into a single webhook delivery — process all of them, not just
    // the first, or messages under any entry/change beyond index 0 are silently dropped.
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        const contactName = value?.contacts?.[0]?.profile?.name;

        for (const message of value?.messages ?? []) {
          if (message.type !== "text" || !message.text) continue;
          try {
            await this.processMessage(message.from, message.text.body, contactName);
          } catch (err) {
            this.logger.error(
              `Failed to process WhatsApp message ${message.id} from ${message.from}: ${err instanceof Error ? err.message : err}`,
            );
          }
        }
      }
    }
  }

  async processMessage(phone: string, text: string, contactName?: string): Promise<AutoReplyResult> {
    const botUserId = await this.getBotUserId();

    const result = await this.autoReply.generateReply(phone, text, contactName);

    await this.prisma.interaction.create({
      data: {
        type: InteractionType.WHATSAPP,
        subject: "Incoming WhatsApp message",
        body: text,
        createdById: botUserId,
        customerId: result.customerId,
        leadId: result.leadId,
      },
    });

    await this.prisma.interaction.create({
      data: {
        type: InteractionType.WHATSAPP,
        subject: "Auto-reply",
        body: result.replyText,
        createdById: botUserId,
        customerId: result.customerId,
        leadId: result.leadId,
      },
    });

    try {
      await this.sendMessage(phone, result.replyText);
    } catch (err) {
      this.logger.warn(
        `Could not deliver WhatsApp reply to ${phone} (expected until real Meta credentials are configured): ${err instanceof Error ? err.message : err}`,
      );
    }

    return result;
  }

  /** Sends an arbitrary outbound WhatsApp text message via the configured Business API — used both
   *  for the auto-reply bot and for one-off business sends (e.g. emailing/texting a quote). */
  async sendMessage(to: string, body: string): Promise<void> {
    const config = await this.settingsService.getDecryptedConfig<WhatsAppConfig>(
      IntegrationProvider.WHATSAPP,
    );

    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${config.phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body },
        }),
      },
    );

    if (!res.ok) {
      const errorBody = await res.text().catch(() => "");
      throw new Error(`WhatsApp send failed (${res.status}): ${errorBody}`);
    }
  }

  private async getBotUserId(): Promise<string> {
    const user = await this.prisma.user.findUnique({ where: { email: BOT_USER_EMAIL } });
    if (!user) {
      throw new Error(
        `System bot user (${BOT_USER_EMAIL}) not found — run the seed script to create it.`,
      );
    }
    return user.id;
  }
}
