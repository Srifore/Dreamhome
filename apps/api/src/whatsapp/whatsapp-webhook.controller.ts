import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from "@nestjs/common";
import { Public } from "../common/decorators/public.decorator";
import { WhatsAppService, type WhatsAppWebhookPayload } from "./whatsapp.service";

@Public()
@Controller()
export class WhatsAppWebhookController {
  constructor(private whatsappService: WhatsAppService) {}

  /** Meta's one-time webhook verification handshake, run when you register the callback URL. */
  @Get("webhooks/whatsapp")
  verify(
    @Query("hub.mode") mode: string,
    @Query("hub.verify_token") token: string,
    @Query("hub.challenge") challenge: string,
  ) {
    return this.whatsappService.verifyWebhook(mode, token, challenge);
  }

  /** Meta posts every inbound message / status update here. */
  @HttpCode(HttpStatus.OK)
  @Post("webhooks/whatsapp")
  async receive(@Body() body: WhatsAppWebhookPayload) {
    await this.whatsappService.handleIncomingMessage(body);
    return { received: true };
  }
}
