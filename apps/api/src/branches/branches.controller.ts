import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { RequirePermissions } from "../common/decorators/permissions.decorator";
import { BranchesService } from "./branches.service";
import { CreateBranchDto } from "./dto/create-branch.dto";
import { UpdateBranchDto } from "./dto/update-branch.dto";

@Controller("branches")
export class BranchesController {
  constructor(private branchesService: BranchesService) {}

  @Get()
  findAll() {
    return this.branchesService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.branchesService.findOne(id);
  }

  @Post()
  @RequirePermissions("branches:manage")
  create(@Body() dto: CreateBranchDto) {
    return this.branchesService.create(dto);
  }

  @Patch(":id")
  @RequirePermissions("branches:manage")
  update(@Param("id") id: string, @Body() dto: UpdateBranchDto) {
    return this.branchesService.update(id, dto);
  }
}
