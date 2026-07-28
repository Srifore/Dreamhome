import { ArrayMinSize, IsArray, IsString } from "class-validator";

export class ItemSerialsDto {
  @IsString()
  productId: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  serialNumbers: string[];
}
