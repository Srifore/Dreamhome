import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { CreateLeadDto } from "./dto/create-lead.dto";
import { UpdateLeadDto } from "./dto/update-lead.dto";
import { LeadsService } from "./leads.service";

@Controller("crm/leads")
export class LeadsController {
  constructor(private leadsService: LeadsService) {}

  @Get()
  findAll() {
    return this.leadsService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.leadsService.findOne(id);
  }

  @Post()
  @RequirePermissions("crm:write")
  create(@Body() dto: CreateLeadDto) {
    return this.leadsService.create(dto);
  }

  @Patch(":id")
  @RequirePermissions("crm:write")
  update(@Param("id") id: string, @Body() dto: UpdateLeadDto) {
    return this.leadsService.update(id, dto);
  }

  @Post(":id/convert-to-customer")
  @RequirePermissions("crm:write")
  convertToCustomer(@Param("id") id: string) {
    return this.leadsService.convertToCustomer(id);
  }
}
