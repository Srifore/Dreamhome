import { Module } from "@nestjs/common";
import { InventoryModule } from "../inventory/inventory.module";
import { CompanySettingsModule } from "../company-settings/company-settings.module";
import { WhatsAppModule } from "../whatsapp/whatsapp.module";
import { QuotesController } from "./quotes/quotes.controller";
import { QuotesService } from "./quotes/quotes.service";
import { SalesOrdersController } from "./sales-orders/sales-orders.controller";
import { SalesOrdersService } from "./sales-orders/sales-orders.service";
import { InvoicesController } from "./invoices/invoices.controller";
import { InvoicesService } from "./invoices/invoices.service";
import { PaymentsController } from "./payments/payments.controller";
import { PaymentsService } from "./payments/payments.service";

@Module({
  imports: [InventoryModule, CompanySettingsModule, WhatsAppModule],
  controllers: [QuotesController, SalesOrdersController, InvoicesController, PaymentsController],
  providers: [QuotesService, SalesOrdersService, InvoicesService, PaymentsService],
})
export class SalesModule {}
