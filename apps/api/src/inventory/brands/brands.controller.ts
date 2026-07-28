import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { BrandsService } from "./brands.service";
import { CreateBrandDto } from "./dto/create-brand.dto";
import { UpdateBrandDto } from "./dto/update-brand.dto";

@Controller("inventory/brands")
export class BrandsController {
  constructor(private brandsService: BrandsService) {}

  @Get()
  findAll() {
    return this.brandsService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.brandsService.findOne(id);
  }

  @Post()
  @RequirePermissions("inventory:write")
  create(@Body() dto: CreateBrandDto) {
    return this.brandsService.create(dto);
  }

  @Patch(":id")
  @RequirePermissions("inventory:write")
  update(@Param("id") id: string, @Body() dto: UpdateBrandDto) {
    return this.brandsService.update(id, dto);
  }
}
