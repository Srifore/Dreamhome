import { Body, Controller, Get, Param, Patch, Post, Delete } from "@nestjs/common";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import type { AuthenticatedUser } from "../common/types/authenticated-user";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UsersService } from "./users.service";

@Controller("users")
@RequirePermissions("users:manage")
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(":id")
  deactivate(@Param("id") id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.deactivate(id, user.id);
  }

  @Delete(":id/permanent")
  remove(@Param("id") id: string) {
    return this.usersService.remove(id);
  }
}
