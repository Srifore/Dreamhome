import { PartialType } from "@nestjs/mapped-types";
import { CreateB2BAccountDto } from "./create-b2b-account.dto";

export class UpdateB2BAccountDto extends PartialType(CreateB2BAccountDto) {}
