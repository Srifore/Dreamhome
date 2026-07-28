import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import type { AuthenticatedUser } from "../../common/types/authenticated-user";
import { CreateSalesOrderDto } from "./dto/create-sales-order.dto";
import { SalesOrdersService } from "./sales-orders.service";

@Controller("sales/orders")
export class SalesOrdersController {
  constructor(private salesOrdersService: SalesOrdersService) {}

  @Get()
  findAll() {
    return this.salesOrdersService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.salesOrdersService.findOne(id);
  }

  @Post()
  @RequirePermissions("sales:write")
  create(@Body() dto: CreateSalesOrderDto, @CurrentUser() user: AuthenticatedUser) {
    return this.salesOrdersService.create(dto, user.id);
  }
}
