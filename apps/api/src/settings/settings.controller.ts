import { Body, Controller, Get, Put } from "@nestjs/common";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { UpdateWhatsAppSettingsDto } from "./dto/update-whatsapp-settings.dto";
import { UpdateInstagramSettingsDto } from "./dto/update-instagram-settings.dto";
import { UpdateFacebookSettingsDto } from "./dto/update-facebook-settings.dto";
import { UpdateAiImageSettingsDto } from "./dto/update-ai-image-settings.dto";
import { SettingsService } from "./settings.service";

@Controller("settings/integrations")
@RequirePermissions("settings:manage")
export class SettingsController {
  constructor(private settingsService: SettingsService) {}

  @Get()
  list() {
    return this.settingsService.listIntegrations();
  }

  @Put("whatsapp")
  updateWhatsApp(@Body() dto: UpdateWhatsAppSettingsDto) {
    return this.settingsService.upsertWhatsApp(dto);
  }

  @Put("instagram")
  updateInstagram(@Body() dto: UpdateInstagramSettingsDto) {
    return this.settingsService.upsertInstagram(dto);
  }

  @Put("facebook")
  updateFacebook(@Body() dto: UpdateFacebookSettingsDto) {
    return this.settingsService.upsertFacebook(dto);
  }

  @Put("ai-image")
  updateAiImage(@Body() dto: UpdateAiImageSettingsDto) {
    return this.settingsService.upsertAiImage(dto);
  }
}
