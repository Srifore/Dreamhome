import { IsEmail, IsOptional, IsString } from "class-validator";

export class CreateEnquiryDto {
  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  productId?: string;
}
