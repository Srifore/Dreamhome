import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";
import { InteractionType } from "@prisma/client";

export class CreateInteractionDto {
  @IsEnum(InteractionType)
  type: InteractionType;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  b2bAccountId?: string;

  @IsOptional()
  @IsString()
  opportunityId?: string;
}
