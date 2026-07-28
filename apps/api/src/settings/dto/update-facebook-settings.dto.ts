import { IsOptional, IsString } from "class-validator";

export class UpdateFacebookSettingsDto {
  // Left blank on an update, this keeps the previously saved secret (see settings.service.ts).
  @IsOptional()
  @IsString()
  accessToken?: string;

  @IsString()
  pageId: string;
}
