import { IsOptional, IsString } from "class-validator";

export class CreateB2BContactDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;
}
