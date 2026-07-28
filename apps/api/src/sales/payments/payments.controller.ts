import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import type { AuthenticatedUser } from "../../common/types/authenticated-user";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { PaymentsService } from "./payments.service";

@Controller("sales/payments")
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Get()
  findByInvoice(@Query("invoiceId") invoiceId: string) {
    return this.paymentsService.findByInvoice(invoiceId);
  }

  @Post()
  @RequirePermissions("sales:write")
  create(@Body() dto: CreatePaymentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.paymentsService.create(dto, user.id);
  }
}
