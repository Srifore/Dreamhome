import { IsOptional, IsString } from "class-validator";

/** Quick-add a customer while creating a quote, instead of requiring one to already exist. */
export class NewCustomerInputDto {
  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  gstin?: string;

  @IsOptional()
  @IsString()
  state?: string;
}
