import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min, ValidateIf } from "class-validator";
import { OpportunityStage } from "@prisma/client";

export class CreateOpportunityDto {
  @IsString()
  title: string;

  @IsString()
  b2bAccountId: string;

  @IsOptional()
  @IsEnum(OpportunityStage)
  stage?: OpportunityStage;

  // null explicitly clears a previously-set estimate; omitted (undefined) leaves it untouched.
  @ValidateIf((o) => o.estimatedValue !== null)
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  estimatedValue?: number | null;

  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string;

  @IsString()
  ownerId: string;
}
