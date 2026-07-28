import { Module } from "@nestjs/common";
import { SettingsModule } from "../settings/settings.module";
import { WhatsAppWebhookController } from "./whatsapp-webhook.controller";
import { WhatsAppController } from "./whatsapp.controller";
import { WhatsAppService } from "./whatsapp.service";
import { AutoReplyService } from "./auto-reply.service";
import { AiChatService } from "./ai-chat.service";

@Module({
  imports: [SettingsModule],
  controllers: [WhatsAppWebhookController, WhatsAppController],
  providers: [WhatsAppService, AutoReplyService, AiChatService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
