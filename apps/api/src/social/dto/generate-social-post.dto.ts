import { IsOptional, IsString } from "class-validator";

export class GenerateSocialPostDto {
  @IsOptional()
  @IsString()
  productId?: string;
}
