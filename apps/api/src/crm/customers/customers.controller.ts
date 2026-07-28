import { Body, Controller, Get, Param, Patch, Post } from "@nestjs/common";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { CreateCustomerDto } from "./dto/create-customer.dto";
import { UpdateCustomerDto } from "./dto/update-customer.dto";
import { CustomersService } from "./customers.service";

@Controller("crm/customers")
export class CustomersController {
  constructor(private customersService: CustomersService) {}

  @Get()
  findAll() {
    return this.customersService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.customersService.findOne(id);
  }

  @Post()
  @RequirePermissions("crm:write")
  create(@Body() dto: CreateCustomerDto) {
    return this.customersService.create(dto);
  }

  @Patch(":id")
  @RequirePermissions("crm:write")
  update(@Param("id") id: string, @Body() dto: UpdateCustomerDto) {
    return this.customersService.update(id, dto);
  }
}
