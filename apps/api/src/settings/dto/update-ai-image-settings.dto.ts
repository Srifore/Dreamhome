import { IsOptional, IsString } from "class-validator";

export class UpdateAiImageSettingsDto {
  // Left blank on an update, this keeps the previously saved key (see settings.service.ts).
  @IsOptional()
  @IsString()
  apiKey?: string;
}
