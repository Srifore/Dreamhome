import { IsArray, IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  roleId: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  /** Feature permissions for Supervisor accounts — ignored for Admin, who always get full access. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}
