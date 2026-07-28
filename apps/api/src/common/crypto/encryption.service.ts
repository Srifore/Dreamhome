import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";

/**
 * Encrypts integration credentials (WhatsApp/Instagram/Facebook access tokens) at rest.
 * Format: "<iv-hex>:<authTag-hex>:<ciphertext-hex>" so decrypt is self-contained.
 */
@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const keyHex = config.getOrThrow<string>("INTEGRATIONS_ENCRYPTION_KEY");
    const key = Buffer.from(keyHex, "hex");
    if (key.length !== 32) {
      throw new Error(
        `INTEGRATIONS_ENCRYPTION_KEY must decode to exactly 32 bytes (64 hex characters) for AES-256; got ${key.length} bytes`,
      );
    }
    this.key = key;
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
  }

  decrypt(payload: string): string {
    const [ivHex, authTagHex, dataHex] = payload.split(":");
    const decipher = createDecipheriv(ALGORITHM, this.key, Buffer.from(ivHex, "hex"));
    decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, "hex")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  }
}
