import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { IntegrationProvider } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { EncryptionService } from "../common/crypto/encryption.service";
import {
  REQUIRED_SECRET_FIELDS,
  SECRET_FIELDS,
  type AiConfig,
  type FacebookConfig,
  type InstagramConfig,
  type WhatsAppConfig,
} from "./integration-config.types";

function maskValue(value: string): string {
  if (!value) return "";
  // Never reveal more than a small, fixed slice — for short secrets (e.g. a 5-char verify
  // token) showing a fixed last-4 would expose most of the value.
  const visibleCount = value.length > 8 ? 4 : Math.max(0, Math.floor(value.length / 2) - 1);
  return visibleCount === 0 ? "••••" : `•••• ${value.slice(-visibleCount)}`;
}

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    private prisma: PrismaService,
    private encryption: EncryptionService,
  ) {}

  /** Masked view for the frontend — secrets never leave the server in plaintext. */
  async listIntegrations() {
    const providers = Object.values(IntegrationProvider);
    const rows = await this.prisma.integrationSetting.findMany();
    const byProvider = new Map(rows.map((r) => [r.provider, r]));

    return providers.map((provider) => {
      const row = byProvider.get(provider);
      if (!row) {
        return { provider, isActive: false, configured: false, fields: null };
      }

      // Isolate a bad row (e.g. the encryption key was rotated without re-encrypting) so it
      // can't take down the other two providers' settings along with it.
      try {
        const config = JSON.parse(this.encryption.decrypt(row.configEncrypted));
        const secretFields = SECRET_FIELDS[provider] ?? [];
        const fields: Record<string, string> = {};
        for (const [key, value] of Object.entries(config)) {
          fields[key] = secretFields.includes(key) ? maskValue(String(value)) : String(value);
        }
        return { provider, isActive: row.isActive, configured: true, fields };
      } catch (err) {
        this.logger.error(`Failed to decrypt stored ${provider} config: ${err instanceof Error ? err.message : err}`);
        return { provider, isActive: false, configured: false, fields: null, error: "Stored configuration could not be read — please re-enter it" };
      }
    });
  }

  async upsertWhatsApp(dto: Partial<WhatsAppConfig>) {
    return this.upsert(IntegrationProvider.WHATSAPP, dto);
  }

  async upsertInstagram(dto: Partial<InstagramConfig>) {
    return this.upsert(IntegrationProvider.INSTAGRAM, dto);
  }

  async upsertFacebook(dto: Partial<FacebookConfig>) {
    return this.upsert(IntegrationProvider.FACEBOOK, dto);
  }

  async upsertAiImage(dto: Partial<AiConfig>) {
    return this.upsert(IntegrationProvider.AI_IMAGE, dto);
  }

  /**
   * The frontend never shows a secret field's real value (only a masked placeholder), so it
   * can't ever "retype" one back unchanged — submitting a form with a secret field left blank
   * means "keep what's already saved," not "clear it." Non-secret fields always take whatever
   * the form sent, blank or not.
   */
  private async upsert(provider: IntegrationProvider, incoming: object) {
    const secretFields = SECRET_FIELDS[provider] ?? [];
    const existingRow = await this.prisma.integrationSetting.findUnique({ where: { provider } });
    const existingConfig = existingRow
      ? (JSON.parse(this.encryption.decrypt(existingRow.configEncrypted)) as Record<string, unknown>)
      : {};

    const merged: Record<string, unknown> = { ...existingConfig };
    for (const [key, value] of Object.entries(incoming as Record<string, unknown>)) {
      if (secretFields.includes(key) && !value) continue;
      merged[key] = value;
    }

    for (const field of REQUIRED_SECRET_FIELDS[provider] ?? []) {
      if (!merged[field]) {
        throw new BadRequestException(`${field} is required`);
      }
    }

    const configEncrypted = this.encryption.encrypt(JSON.stringify(merged));
    await this.prisma.integrationSetting.upsert({
      where: { provider },
      update: { configEncrypted, isActive: true },
      create: { provider, configEncrypted, isActive: true },
    });
    return { provider, saved: true };
  }

  /** Internal use only (e.g. by the WhatsApp service) — returns the real, decrypted config. */
  async getDecryptedConfig<T>(provider: IntegrationProvider): Promise<T> {
    const row = await this.prisma.integrationSetting.findUnique({ where: { provider } });
    if (!row || !row.isActive) {
      throw new NotFoundException(`${provider} integration is not configured`);
    }
    return JSON.parse(this.encryption.decrypt(row.configEncrypted));
  }
}
