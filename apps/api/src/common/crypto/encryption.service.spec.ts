import { Test } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { EncryptionService } from "./encryption.service";

describe("EncryptionService", () => {
  let service: EncryptionService;

  beforeEach(async () => {
    const config = { getOrThrow: jest.fn().mockReturnValue("0".repeat(64)) }; // 32-byte key as hex
    const moduleRef = await Test.createTestingModule({
      providers: [EncryptionService, { provide: ConfigService, useValue: config }],
    }).compile();
    service = moduleRef.get(EncryptionService);
  });

  it("decrypts back to the exact original plaintext", () => {
    const plaintext = "EAAG_super_secret_access_token_123";
    const encrypted = service.encrypt(plaintext);
    expect(service.decrypt(encrypted)).toBe(plaintext);
  });

  it("produces a different ciphertext each time (random IV) even for the same plaintext", () => {
    const a = service.encrypt("same-secret");
    const b = service.encrypt("same-secret");
    expect(a).not.toBe(b);
  });

  it("stores the payload as iv:authTag:ciphertext hex triplet", () => {
    const encrypted = service.encrypt("hello");
    const parts = encrypted.split(":");
    expect(parts).toHaveLength(3);
    expect(parts.every((p) => /^[0-9a-f]+$/.test(p))).toBe(true);
  });

  it("rejects a tampered ciphertext (auth tag mismatch)", () => {
    const encrypted = service.encrypt("hello world");
    const [iv, authTag, data] = encrypted.split(":");
    const tampered = [iv, authTag, data.slice(0, -2) + "ff"].join(":");
    expect(() => service.decrypt(tampered)).toThrow();
  });

  it("round-trips an empty string", () => {
    const encrypted = service.encrypt("");
    expect(service.decrypt(encrypted)).toBe("");
  });
});
