import { IsDateString, IsEnum, IsOptional, IsString } from "class-validator";
import { ServiceTicketStatus } from "@prisma/client";

export class UpdateServiceTicketDto {
  @IsOptional()
  @IsEnum(ServiceTicketStatus)
  status?: ServiceTicketStatus;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  resolutionNotes?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
