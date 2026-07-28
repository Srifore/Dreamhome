import { Type } from "class-transformer";
import { IsEnum, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { PaymentMethod } from "@prisma/client";

export class CreatePaymentDto {
  @IsString()
  invoiceId: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsOptional()
  @IsString()
  reference?: string;
}
