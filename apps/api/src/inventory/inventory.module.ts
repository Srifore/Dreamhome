import { Module } from "@nestjs/common";
import { BrandsController } from "./brands/brands.controller";
import { BrandsService } from "./brands/brands.service";
import { CategoriesController } from "./categories/categories.controller";
import { CategoriesService } from "./categories/categories.service";
import { ProductsController } from "./products/products.controller";
import { ProductsService } from "./products/products.service";
import { StockController } from "./stock/stock.controller";
import { StockService } from "./stock/stock.service";
import { ProductUnitsController } from "./product-units/product-units.controller";
import { ProductUnitsService } from "./product-units/product-units.service";

@Module({
  controllers: [
    BrandsController,
    CategoriesController,
    ProductsController,
    StockController,
    ProductUnitsController,
  ],
  providers: [
    BrandsService,
    CategoriesService,
    ProductsService,
    StockService,
    ProductUnitsService,
  ],
  exports: [StockService, ProductUnitsService],
})
export class InventoryModule {}
