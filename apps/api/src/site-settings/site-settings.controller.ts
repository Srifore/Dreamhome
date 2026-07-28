import { Body, Controller, Get, Put } from "@nestjs/common";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { UpdateSiteSettingsDto } from "./dto/update-site-settings.dto";
import { SiteSettingsService } from "./site-settings.service";

@Controller("settings/site")
@RequirePermissions("settings:manage")
export class SiteSettingsController {
  constructor(private siteSettingsService: SiteSettingsService) {}

  @Get()
  get() {
    return this.siteSettingsService.get();
  }

  @Put()
  update(@Body() dto: UpdateSiteSettingsDto) {
    return this.siteSettingsService.update(dto.mapsUrl?.trim() || null);
  }
}
