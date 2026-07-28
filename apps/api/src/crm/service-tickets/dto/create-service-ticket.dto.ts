import { IsDateString, IsOptional, IsString } from "class-validator";

export class CreateServiceTicketDto {
  @IsString()
  productUnitId: string;

  @IsString()
  customerId: string;

  @IsString()
  issueDescription: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
