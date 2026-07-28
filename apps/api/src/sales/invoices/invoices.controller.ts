import { Controller, Get, Param } from "@nestjs/common";
import { InvoicesService } from "./invoices.service";

@Controller("sales/invoices")
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Get()
  findAll() {
    return this.invoicesService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.invoicesService.findOne(id);
  }
}
