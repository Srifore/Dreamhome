import { Type } from "class-transformer";
import { IsInt, IsString, Min } from "class-validator";

export class SetStockDto {
  @IsString()
  productId: string;

  @IsString()
  branchId: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  quantity: number;
}
