import { IsString } from "class-validator";

export class RemoveImageDto {
  @IsString()
  url: string;
}
