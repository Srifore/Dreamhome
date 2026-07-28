import { Type } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { ProductStatus } from "@prisma/client";

export class CreateProductDto {
  @IsString()
  sku: string;

  @IsString()
  name: string;

  @IsString()
  brandId: string;

  @IsString()
  categoryId: string;

  @IsOptional()
  @IsString()
  modelNumber?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price: number;

  @IsOptional()
  @IsObject()
  specs?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsString()
  hsnCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  gstRate?: number;
}
