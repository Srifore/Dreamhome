import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import type { AuthenticatedUser } from "../../common/types/authenticated-user";
import { CreateQuoteDto } from "./dto/create-quote.dto";
import { UpdateQuoteStatusDto } from "./dto/update-quote-status.dto";
import { QuotesService } from "./quotes.service";

@Controller("sales/quotes")
export class QuotesController {
  constructor(private quotesService: QuotesService) {}

  @Get()
  findAll() {
    return this.quotesService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.quotesService.findOne(id);
  }

  @Post()
  @RequirePermissions("sales:write")
  create(@Body() dto: CreateQuoteDto, @CurrentUser() user: AuthenticatedUser) {
    return this.quotesService.create(dto, user.id);
  }

  @Patch(":id")
  @RequirePermissions("sales:write")
  update(@Param("id") id: string, @Body() dto: CreateQuoteDto) {
    return this.quotesService.update(id, dto);
  }

  @Patch(":id/status")
  @RequirePermissions("sales:write")
  updateStatus(@Param("id") id: string, @Body() dto: UpdateQuoteStatusDto) {
    return this.quotesService.updateStatus(id, dto);
  }

  @Delete(":id")
  @HttpCode(204)
  @RequirePermissions("sales:write")
  remove(@Param("id") id: string) {
    return this.quotesService.remove(id);
  }

  @Post(":id/send-whatsapp")
  @RequirePermissions("sales:write")
  sendWhatsApp(@Param("id") id: string) {
    return this.quotesService.sendViaWhatsApp(id);
  }
}
