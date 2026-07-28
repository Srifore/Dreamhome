import { Controller, Get, Param, Query } from "@nestjs/common";
import { ProductUnitsService } from "./product-units.service";

@Controller("inventory/product-units")
export class ProductUnitsController {
  constructor(private productUnitsService: ProductUnitsService) {}

  @Get()
  findByCustomer(@Query("customerId") customerId: string) {
    return this.productUnitsService.findByCustomer(customerId);
  }

  @Get(":serialNumber")
  findBySerialNumber(@Param("serialNumber") serialNumber: string) {
    return this.productUnitsService.findBySerialNumber(serialNumber);
  }
}
