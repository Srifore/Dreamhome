import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { CategoriesService } from "./categories.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";

@Controller("inventory/categories")
export class CategoriesController {
  constructor(private categoriesService: CategoriesService) {}

  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @RequirePermissions("inventory:write")
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Patch(":id")
  @RequirePermissions("inventory:write")
  update(@Param("id") id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }
}
