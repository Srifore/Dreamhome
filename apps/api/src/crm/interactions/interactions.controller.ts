import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { RequirePermissions } from "../../common/decorators/permissions.decorator";
import type { AuthenticatedUser } from "../../common/types/authenticated-user";
import { CreateInteractionDto } from "./dto/create-interaction.dto";
import { InteractionsService } from "./interactions.service";

@Controller("crm/interactions")
export class InteractionsController {
  constructor(private interactionsService: InteractionsService) {}

  @Get()
  findByTarget(
    @Query("customerId") customerId?: string,
    @Query("leadId") leadId?: string,
    @Query("b2bAccountId") b2bAccountId?: string,
    @Query("opportunityId") opportunityId?: string,
  ) {
    return this.interactionsService.findByTarget({
      customerId,
      leadId,
      b2bAccountId,
      opportunityId,
    });
  }

  @Post()
  @RequirePermissions("crm:write")
  create(@Body() dto: CreateInteractionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.interactionsService.create(dto, user.id);
  }
}
