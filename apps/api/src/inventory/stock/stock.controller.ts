import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import { SetStockDto } from "./dto/set-stock.dto";
import { StockService } from "./stock.service";

@Controller("inventory/stock")
export class StockController {
  constructor(private stockService: StockService) {}

  @Get()
  findByProduct(@Query("productId") productId: string) {
    return this.stockService.findByProduct(productId);
  }

  @Post("set")
  @RequirePermissions("inventory:write")
  setLevel(@Body() dto: SetStockDto) {
    return this.stockService.setLevel(dto);
  }
}
