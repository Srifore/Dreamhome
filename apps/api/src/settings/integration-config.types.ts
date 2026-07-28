export interface WhatsAppConfig {
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string;
  verifyToken: string;
  appSecret?: string;
  displayPhoneNumber?: string;
}

export interface InstagramConfig {
  accessToken: string;
  businessAccountId: string;
}

export interface FacebookConfig {
  accessToken: string;
  pageId: string;
}

/** Shared OpenAI key — used by ImageComposerService (AI-staged marketing photos) and
 *  AutoReplyService (AI product conversation over WhatsApp). One key, two features. */
export interface AiConfig {
  apiKey: string;
}

export type IntegrationConfig = WhatsAppConfig | InstagramConfig | FacebookConfig | AiConfig;

/** Field names that hold secrets — masked in any response leaving the server, and preserved
 *  (not overwritten) on update when submitted blank, since the frontend never shows the real
 *  value to retype. */
export const SECRET_FIELDS: Record<string, string[]> = {
  WHATSAPP: ["accessToken", "verifyToken", "appSecret"],
  INSTAGRAM: ["accessToken"],
  FACEBOOK: ["accessToken"],
  AI_IMAGE: ["apiKey"],
};

/** Subset of SECRET_FIELDS that must actually have a value before the integration is usable —
 *  e.g. appSecret is optional for WhatsApp, so it's masked/preserved like a secret but never
 *  enforced as required. */
export const REQUIRED_SECRET_FIELDS: Record<string, string[]> = {
  WHATSAPP: ["accessToken", "verifyToken"],
  INSTAGRAM: ["accessToken"],
  FACEBOOK: ["accessToken"],
  AI_IMAGE: ["apiKey"],
};
