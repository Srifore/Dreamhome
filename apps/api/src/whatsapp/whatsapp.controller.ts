import { Body, Controller, Post } from "@nestjs/common";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { SimulateMessageDto } from "./dto/simulate-message.dto";
import { WhatsAppService } from "./whatsapp.service";

@Controller("whatsapp")
export class WhatsAppController {
  constructor(private whatsappService: WhatsAppService) {}

  /** Lets staff test the auto-reply bot without needing a live Meta webhook. */
  @Post("simulate")
  @RequirePermissions("crm:write")
  simulate(@Body() dto: SimulateMessageDto) {
    return this.whatsappService.processMessage(dto.phone, dto.message, dto.name);
  }
}
