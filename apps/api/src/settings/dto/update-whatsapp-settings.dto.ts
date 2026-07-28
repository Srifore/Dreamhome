import { IsOptional, IsString } from "class-validator";

export class UpdateWhatsAppSettingsDto {
  @IsString()
  phoneNumberId: string;

  @IsString()
  businessAccountId: string;

  // Left blank on an update, this keeps the previously saved secret rather than clearing it —
  // the frontend only ever shows a masked placeholder, never the real value, so it can't be
  // retyped unchanged.
  @IsOptional()
  @IsString()
  accessToken?: string;

  @IsOptional()
  @IsString()
  verifyToken?: string;

  @IsOptional()
  @IsString()
  appSecret?: string;

  @IsOptional()
  @IsString()
  displayPhoneNumber?: string;
}
