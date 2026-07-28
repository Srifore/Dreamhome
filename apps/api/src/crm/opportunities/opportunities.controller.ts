import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { CreateOpportunityDto } from "./dto/create-opportunity.dto";
import { UpdateOpportunityDto } from "./dto/update-opportunity.dto";
import { OpportunitiesService } from "./opportunities.service";

@Controller("crm/opportunities")
export class OpportunitiesController {
  constructor(private opportunitiesService: OpportunitiesService) {}

  @Get()
  findAll() {
    return this.opportunitiesService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.opportunitiesService.findOne(id);
  }

  @Post()
  @RequirePermissions("crm:write")
  create(@Body() dto: CreateOpportunityDto) {
    return this.opportunitiesService.create(dto);
  }

  @Patch(":id")
  @RequirePermissions("crm:write")
  update(@Param("id") id: string, @Body() dto: UpdateOpportunityDto) {
    return this.opportunitiesService.update(id, dto);
  }
}
