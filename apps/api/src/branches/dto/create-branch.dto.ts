import { IsOptional, IsString } from "class-validator";

export class CreateBranchDto {
  @IsString()
  name: string;

  @IsString()
  address: string;

  @IsString()
  city: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
