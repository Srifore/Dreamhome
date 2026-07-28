import { Injectable } from "@nestjs/common";

const OPENAI_IMAGES_EDIT_URL = "https://api.openai.com/v1/images/edits";
const MODEL = "gpt-image-1";
const SIZE = "1024x1024";

@Injectable()
export class AiImageService {
  /**
   * Sends a product's real photo to OpenAI's image-edit endpoint as a reference, along with a
   * prompt describing how to re-stage it, and returns the generated image bytes. Throws on any
   * non-success response or network failure — the caller (ImageComposerService) is expected to
   * catch this and fall back to using the real photo directly, since AI generation is optional
   * and must never be the reason the Marketing page breaks.
   */
  async generate(referencePhoto: Buffer, prompt: string, apiKey: string): Promise<Buffer> {
    const form = new FormData();
    // TS's DOM lib types Buffer's underlying ArrayBufferLike as incompatible with BlobPart (it
    // permits SharedArrayBuffer, which Blob's constructor type doesn't) — a real Buffer works
    // fine here at runtime, this is purely a lib-typing mismatch.
    form.append("image", new Blob([referencePhoto as unknown as BlobPart]), "reference.jpg");
    form.append("prompt", prompt);
    form.append("model", MODEL);
    form.append("size", SIZE);
    form.append("n", "1");

    const res = await fetch(OPENAI_IMAGES_EDIT_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`OpenAI image generation failed (${res.status}): ${body.slice(0, 300)}`);
    }

    const json = (await res.json()) as { data?: Array<{ b64_json?: string }> };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error("OpenAI response did not include a generated image");
    }
    return Buffer.from(b64, "base64");
  }
}
