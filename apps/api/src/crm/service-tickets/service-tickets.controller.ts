import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { CreateServiceTicketDto } from "./dto/create-service-ticket.dto";
import { UpdateServiceTicketDto } from "./dto/update-service-ticket.dto";
import { ServiceTicketsService } from "./service-tickets.service";

@Controller("crm/service-tickets")
export class ServiceTicketsController {
  constructor(private serviceTicketsService: ServiceTicketsService) {}

  @Get()
  findAll() {
    return this.serviceTicketsService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.serviceTicketsService.findOne(id);
  }

  @Post()
  @RequirePermissions("service:write")
  create(@Body() dto: CreateServiceTicketDto) {
    return this.serviceTicketsService.create(dto);
  }

  @Patch(":id")
  @RequirePermissions("service:write")
  update(@Param("id") id: string, @Body() dto: UpdateServiceTicketDto) {
    return this.serviceTicketsService.update(id, dto);
  }
}
