import { IsOptional, IsString } from "class-validator";

export class CreateBrandDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;
}
