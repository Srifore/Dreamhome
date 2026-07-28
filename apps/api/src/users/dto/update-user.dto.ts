import { PartialType, OmitType } from "@nestjs/mapped-types";
import { IsBoolean, IsOptional, IsString, ValidateIf } from "class-validator";
import { CreateUserDto } from "./create-user.dto";

export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ["password", "branchId", "phone"] as const),
) {
  // Reactivates a deactivated account. Deactivation itself still goes through the dedicated
  // DELETE :id route (which also blocks removing the last active Admin), not this field.
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // Redeclared (rather than inherited via PartialType) to accept an explicit `null`, which is
  // how the frontend signals "clear this field" — an omitted/undefined key means "leave as is"
  // under normal PATCH semantics, so there needs to be a distinct way to say "unset it".
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  branchId?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  phone?: string | null;
}
