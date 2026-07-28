import { IsOptional, IsString } from "class-validator";

export class UpdateSiteSettingsDto {
  // An empty string clears it back to the website's hardcoded fallback (see SiteSettingsService.update).
  @IsOptional()
  @IsString()
  mapsUrl?: string;
}
