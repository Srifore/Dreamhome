import { Type } from "class-transformer";
import { IsArray, IsInt, IsOptional, IsString, Min, ValidateNested } from "class-validator";
import { ItemSerialsDto } from "./item-serials.dto";

export class CreateSalesOrderDto {
  @IsString()
  quoteId: string;

  @IsString()
  branchId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ItemSerialsDto)
  itemSerials: ItemSerialsDto[];

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  warrantyMonths?: number;
}
