import { IsOptional, IsString } from "class-validator";

export class UpdateCompanySettingsDto {
  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsString()
  gstin?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  pincode?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  logoUrl?: string;

  @IsOptional()
  @IsString()
  bankAccountName?: string;

  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @IsOptional()
  @IsString()
  bankIfsc?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankBranch?: string;

  @IsOptional()
  @IsString()
  defaultTermsAndConditions?: string;

  @IsOptional()
  @IsString()
  defaultNotes?: string;
}
