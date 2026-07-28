import { IsDateString, IsEnum, IsOptional, IsString, ValidateIf } from "class-validator";
import { LeadStage } from "@prisma/client";

export class CreateLeadDto {
  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  @IsEnum(LeadStage)
  stage?: LeadStage;

  @IsOptional()
  @IsString()
  notes?: string;

  // null explicitly clears a scheduled follow-up; omitted (undefined) leaves it untouched.
  @ValidateIf((o) => o.nextFollowUpAt !== null)
  @IsOptional()
  @IsDateString()
  nextFollowUpAt?: string | null;

  @IsString()
  assignedToId: string;
}
