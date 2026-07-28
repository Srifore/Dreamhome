import { Type } from "class-transformer";
import { IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";

export class QuoteItemInputDto {
  @IsString()
  productId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  discount?: number;
}
