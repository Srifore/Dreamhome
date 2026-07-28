import { IsEnum, IsOptional, IsString } from "class-validator";
import { B2BAccountType } from "@prisma/client";

export class CreateB2BAccountDto {
  @IsString()
  name: string;

  @IsEnum(B2BAccountType)
  type: B2BAccountType;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  gstin?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  shippingAddress?: string;

  @IsString()
  ownerId: string;
}
