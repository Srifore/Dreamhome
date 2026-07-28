import { Test } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { InteractionType } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SettingsService } from "../settings/settings.service";
import { AutoReplyService } from "./auto-reply.service";
import { WhatsAppService, type WhatsAppWebhookPayload } from "./whatsapp.service";
import { createPrismaMock, type PrismaMock } from "../test-utils/prisma-mock";

describe("WhatsAppService", () => {
  let service: WhatsAppService;
  let prisma: PrismaMock;
  let settingsService: { getDecryptedConfig: jest.Mock };
  let autoReply: { generateReply: jest.Mock };
  const originalFetch = global.fetch;

  beforeEach(async () => {
    prisma = createPrismaMock();
    settingsService = { getDecryptedConfig: jest.fn() };
    autoReply = { generateReply: jest.fn() };
    prisma.user.findUnique.mockResolvedValue({ id: "bot-user-1" });

    const moduleRef = await Test.createTestingModule({
      providers: [
        WhatsAppService,
        { provide: PrismaService, useValue: prisma },
        { provide: SettingsService, useValue: settingsService },
        { provide: AutoReplyService, useValue: autoReply },
      ],
    }).compile();
    service = moduleRef.get(WhatsAppService);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("verifyWebhook", () => {
    it("returns the challenge when the mode and token both check out", async () => {
      settingsService.getDecryptedConfig.mockResolvedValue({ verifyToken: "secret-token" });
      await expect(service.verifyWebhook("subscribe", "secret-token", "challenge-123")).resolves.toBe(
        "challenge-123",
      );
    });

    it("rejects a wrong verify token", async () => {
      settingsService.getDecryptedConfig.mockResolvedValue({ verifyToken: "secret-token" });
      await expect(service.verifyWebhook("subscribe", "wrong-token", "challenge-123")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("rejects a mode other than 'subscribe'", async () => {
      settingsService.getDecryptedConfig.mockResolvedValue({ verifyToken: "secret-token" });
      await expect(service.verifyWebhook("unsubscribe", "secret-token", "challenge-123")).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("rejects when WhatsApp isn't configured at all", async () => {
      settingsService.getDecryptedConfig.mockRejectedValue(new Error("not configured"));
      await expect(service.verifyWebhook("subscribe", "anything", "challenge-123")).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("sendMessage", () => {
    it("posts to the Graph API with the configured phone number id and access token", async () => {
      settingsService.getDecryptedConfig.mockResolvedValue({
        phoneNumberId: "12345",
        accessToken: "token-abc",
      });
      const fetchMock = jest.fn().mockResolvedValue({ ok: true });
      global.fetch = fetchMock as any;

      await service.sendMessage("+919900011122", "Hello!");

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining("/12345/messages"),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ Authorization: "Bearer token-abc" }),
        }),
      );
    });

    it("throws with the response status when the Graph API call fails", async () => {
      settingsService.getDecryptedConfig.mockResolvedValue({ phoneNumberId: "12345", accessToken: "bad" });
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => "Malformed access token",
      }) as any;

      await expect(service.sendMessage("+919900011122", "Hi")).rejects.toThrow(/401/);
    });
  });

  describe("processMessage", () => {
    it("logs both the incoming message and the auto-reply as interactions", async () => {
      autoReply.generateReply.mockResolvedValue({
        replyText: "Here's our menu",
        customerId: "cust-1",
        leadId: "lead-1",
      });
      global.fetch = jest.fn().mockResolvedValue({ ok: true }) as any;

      await service.processMessage("+919900011122", "hi", "Ananya");

      expect(prisma.interaction.create).toHaveBeenCalledTimes(2);
      expect(prisma.interaction.create).toHaveBeenNthCalledWith(1, {
        data: expect.objectContaining({
          type: InteractionType.WHATSAPP,
          subject: "Incoming WhatsApp message",
          body: "hi",
        }),
      });
      expect(prisma.interaction.create).toHaveBeenNthCalledWith(2, {
        data: expect.objectContaining({ subject: "Auto-reply", body: "Here's our menu" }),
      });
    });

    it("still returns the reply even when the outbound WhatsApp send itself fails", async () => {
      autoReply.generateReply.mockResolvedValue({ replyText: "reply text" });
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500, text: async () => "" }) as any;

      const result = await service.processMessage("+919900011122", "hi");

      expect(result.replyText).toBe("reply text");
    });

    it("throws when there's no active staff account to attribute the bot's messages to", async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.processMessage("+919900011122", "hi")).rejects.toThrow(
        /System bot user/,
      );
    });
  });

  describe("handleIncomingMessage", () => {
    it("processes every text message across all entries/changes in one webhook delivery", async () => {
      autoReply.generateReply.mockResolvedValue({ replyText: "ok" });
      global.fetch = jest.fn().mockResolvedValue({ ok: true }) as any;

      const payload: WhatsAppWebhookPayload = {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    { from: "111", id: "m1", timestamp: "1", type: "text", text: { body: "hi" } },
                    { from: "222", id: "m2", timestamp: "2", type: "text", text: { body: "hello" } },
                  ],
                },
              },
            ],
          },
        ],
      };

      await service.handleIncomingMessage(payload);

      expect(autoReply.generateReply).toHaveBeenCalledTimes(2);
    });

    it("ignores non-text message types", async () => {
      const payload: WhatsAppWebhookPayload = {
        entry: [
          { changes: [{ value: { messages: [{ from: "111", id: "m1", timestamp: "1", type: "image" }] } }] },
        ],
      };

      await service.handleIncomingMessage(payload);

      expect(autoReply.generateReply).not.toHaveBeenCalled();
    });

    it("doesn't let one message's processing failure stop the rest from being handled", async () => {
      autoReply.generateReply
        .mockRejectedValueOnce(new Error("boom"))
        .mockResolvedValueOnce({ replyText: "ok" });
      global.fetch = jest.fn().mockResolvedValue({ ok: true }) as any;

      const payload: WhatsAppWebhookPayload = {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    { from: "111", id: "m1", timestamp: "1", type: "text", text: { body: "bad" } },
                    { from: "222", id: "m2", timestamp: "2", type: "text", text: { body: "good" } },
                  ],
                },
              },
            ],
          },
        ],
      };

      await service.handleIncomingMessage(payload);

      expect(autoReply.generateReply).toHaveBeenCalledTimes(2);
    });
  });
});
