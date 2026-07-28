import { IsOptional, IsString } from "class-validator";

export class SimulateMessageDto {
  @IsString()
  phone: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  name?: string;
}
