import { Injectable, Logger } from "@nestjs/common";
import { readFile } from "fs/promises";
import { join } from "path";
import sharp from "sharp";
import { IntegrationProvider } from "@prisma/client";
import { SettingsService } from "../settings/settings.service";
import type { AiConfig } from "../settings/integration-config.types";
import { AiImageService } from "./ai-image.service";

const CANVAS_SIZE = 1080;
const UPLOADS_ROOT = join(process.cwd(), "uploads");

const PALETTES = [
  { bg1: "#1c1c1e", bg2: "#3a3a3c", accent: "#d4af37" }, // charcoal + gold
  { bg1: "#0f2027", bg2: "#203a43", accent: "#4fd1c5" }, // deep teal
  { bg1: "#1a1a2e", bg2: "#16213e", accent: "#e94560" }, // navy + coral
  { bg1: "#2c1810", bg2: "#4a2c1a", accent: "#d4a373" }, // warm brown / tan
  { bg1: "#1b1b1b", bg2: "#2d2d2d", accent: "#c0a062" }, // black + brass
];

function pickPalette(seed: number) {
  return PALETTES[((seed % PALETTES.length) + PALETTES.length) % PALETTES.length];
}

function pickIndex(seed: number, length: number) {
  return ((seed % length) + length) % length;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxCharsPerLine && current) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export interface ProductImageInput {
  brandName: string;
  categoryName: string;
  productName: string;
  modelNumber?: string | null;
  /** Real uploaded product photo URLs, if any — see compose() for how these are preferred. */
  photoUrls?: string[];
}

@Injectable()
export class ImageComposerService {
  private readonly logger = new Logger(ImageComposerService.name);

  constructor(
    private settingsService: SettingsService,
    private aiImageService: AiImageService,
  ) {}

  /**
   * Builds a 1080x1080 promotional graphic for the product. When real photos have been uploaded
   * (see the CRM's "Add Product Content" page), the photo is used as the base — AI-restaged into
   * a new scene when the AI_IMAGE integration is configured (see tryAiGenerate), otherwise used
   * as-is — with our own branded overlay on top either way. Only falls back to the fully-generated
   * color card when no photo exists yet at all.
   *
   * `variantSeed` picks which photo to feature when a product has several, and which palette to
   * use for the generated-card fallback. The caller (SocialPostsService.generate) passes how many
   * times this product has been generated before, so successive regenerates step through photos
   * in sequence rather than randomly re-picking — with only 2-3 photos, a time-based coin flip
   * can (and did) land on the same one twice in a row.
   */
  async compose(input: ProductImageInput, variantSeed: number = Date.now()): Promise<Buffer> {
    if (input.photoUrls && input.photoUrls.length > 0) {
      const photoUrl = input.photoUrls[pickIndex(variantSeed, input.photoUrls.length)];
      const photo = await this.loadLocalUpload(photoUrl);
      if (photo) {
        const staged = await this.tryAiGenerate(input, photo);
        return this.composeFromPhoto(input, staged ?? photo);
      }
      this.logger.warn(`Could not load product photo for social post (${photoUrl}) — falling back to a generated card`);
    }
    return this.composeGeneratedCard(input, variantSeed);
  }

  /**
   * Re-stages the real product photo into a new AI-generated scene via OpenAI's gpt-image-1.
   * Returns null (never throws) whenever AI generation isn't usable for any reason — not
   * configured, a bad/expired key, network failure, quota exceeded — so the Marketing page always
   * still works with the real photo even if AI is unset or briefly unavailable.
   */
  private async tryAiGenerate(input: ProductImageInput, referencePhoto: Buffer): Promise<Buffer | null> {
    try {
      const config = await this.settingsService.getDecryptedConfig<AiConfig>(IntegrationProvider.AI_IMAGE);
      const prompt = [
        `Professional advertising photograph of the exact ${input.brandName} ${input.categoryName}`,
        `shown in the reference image, re-staged in a bright, modern, luxury Indian kitchen.`,
        `Photorealistic, high-end interior design magazine style, soft natural lighting.`,
        `Preserve the real appliance's design, color, and branding exactly as shown in the reference —`,
        `only change the surrounding scene, not the appliance itself.`,
      ].join(" ");
      return await this.aiImageService.generate(referencePhoto, prompt, config.apiKey);
    } catch (err) {
      this.logger.warn(
        `AI image generation unavailable — using the real product photo as-is: ${err instanceof Error ? err.message : err}`,
      );
      return null;
    }
  }

  /** Reads an uploaded file straight off disk rather than looping back over HTTP to our own server. */
  private async loadLocalUpload(url: string): Promise<Buffer | null> {
    try {
      const path = new URL(url).pathname; // e.g. "/uploads/products/<id>/<file>"
      if (!path.startsWith("/uploads/")) return null;
      return await readFile(join(UPLOADS_ROOT, path.replace(/^\/uploads\//, "")));
    } catch {
      return null;
    }
  }

  private async composeFromPhoto(input: ProductImageInput, photo: Buffer): Promise<Buffer> {
    const nameLines = wrapText(input.productName.toUpperCase(), 22).slice(0, 3);
    const lineHeight = 62;
    const nameBaseY = CANVAS_SIZE - 160 - (nameLines.length - 1) * lineHeight;
    const nameTspans = nameLines
      .map((line, i) => `<tspan x="60" y="${nameBaseY + i * lineHeight}">${escapeXml(line)}</tspan>`)
      .join("");

    const overlay = `
      <svg width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="top" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#000000" stop-opacity="0.6" />
            <stop offset="100%" stop-color="#000000" stop-opacity="0" />
          </linearGradient>
          <linearGradient id="bottom" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stop-color="#000000" stop-opacity="0.8" />
            <stop offset="100%" stop-color="#000000" stop-opacity="0" />
          </linearGradient>
        </defs>
        <rect width="100%" height="230" fill="url(#top)" />
        <rect y="${CANVAS_SIZE - 380}" width="100%" height="380" fill="url(#bottom)" />

        <text x="60" y="70" font-family="Georgia, serif" font-size="28" letter-spacing="6" fill="#ffffff">DREAMHOME</text>
        <text x="60" y="100" font-family="Arial, sans-serif" font-size="18" fill="#e5e5e5" opacity="0.9">Premium Kitchen &amp; Home Appliances</text>

        <rect x="60" y="${nameBaseY - nameLines.length * lineHeight - 10}" width="${Math.min(70 + input.categoryName.length * 11, 700)}" height="40" rx="20" fill="#ffffff" opacity="0.18" stroke="#ffffff" stroke-width="1.2" />
        <text x="84" y="${nameBaseY - nameLines.length * lineHeight + 18}" font-family="Arial, sans-serif" font-size="19" fill="#ffffff">${escapeXml(input.categoryName)}</text>

        <text font-family="Georgia, serif" font-weight="bold" font-size="50" fill="#ffffff">${nameTspans}</text>

        <text x="60" y="${CANVAS_SIZE - 90}" font-family="Arial, sans-serif" font-size="24" fill="#f0e6c8">${escapeXml(input.brandName)}${input.modelNumber ? " · " + escapeXml(input.modelNumber) : ""}</text>
        <text x="60" y="${CANVAS_SIZE - 40}" font-family="Arial, sans-serif" font-size="24" fill="#ffffff">Enquire Now · +91 98450 59388</text>
      </svg>
    `;

    return sharp(photo)
      .resize(CANVAS_SIZE, CANVAS_SIZE, { fit: "cover", position: "attention" })
      .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }])
      .jpeg({ quality: 90 })
      .toBuffer();
  }

  /** Used only when the product has no uploaded photo yet. */
  private async composeGeneratedCard(input: ProductImageInput, variantSeed: number): Promise<Buffer> {
    const palette = pickPalette(variantSeed);
    const nameLines = wrapText(input.productName.toUpperCase(), 18).slice(0, 4);
    const lineHeight = 76;
    const nameStartY = 560 - ((nameLines.length - 1) * lineHeight) / 2;

    const nameTspans = nameLines
      .map((line, i) => `<tspan x="90" y="${nameStartY + i * lineHeight}">${escapeXml(line)}</tspan>`)
      .join("");

    const svg = `
      <svg width="${CANVAS_SIZE}" height="${CANVAS_SIZE}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="${palette.bg1}" />
            <stop offset="100%" stop-color="${palette.bg2}" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)" />

        <text x="90" y="110" font-family="Georgia, serif" font-size="34" letter-spacing="8" fill="${palette.accent}">DREAMHOME</text>
        <text x="90" y="145" font-family="Arial, sans-serif" font-size="22" fill="#e5e5e5" opacity="0.8">Premium Kitchen &amp; Home Appliances</text>

        <rect x="90" y="200" width="${Math.min(80 + input.categoryName.length * 13, 860)}" height="48" rx="24" fill="${palette.accent}" opacity="0.15" stroke="${palette.accent}" stroke-width="1.5" />
        <text x="120" y="231" font-family="Arial, sans-serif" font-size="22" fill="${palette.accent}">${escapeXml(input.categoryName)}</text>

        <text font-family="Georgia, serif" font-weight="bold" font-size="64" fill="#ffffff">${nameTspans}</text>

        <text x="90" y="${nameStartY + nameLines.length * lineHeight + 50}" font-family="Arial, sans-serif" font-size="30" fill="${palette.accent}">${escapeXml(input.brandName)}${input.modelNumber ? " · " + escapeXml(input.modelNumber) : ""}</text>

        <rect x="0" y="960" width="100%" height="120" fill="#000000" opacity="0.35" />
        <text x="90" y="1025" font-family="Arial, sans-serif" font-size="28" fill="#ffffff">Enquire Now · +91 98450 59388</text>
      </svg>
    `;

    return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer();
  }
}
