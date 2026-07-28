import { Module } from "@nestjs/common";
import { CustomersController } from "./customers/customers.controller";
import { CustomersService } from "./customers/customers.service";
import { LeadsController } from "./leads/leads.controller";
import { LeadsService } from "./leads/leads.service";
import { B2BAccountsController } from "./b2b-accounts/b2b-accounts.controller";
import { B2BAccountsService } from "./b2b-accounts/b2b-accounts.service";
import { OpportunitiesController } from "./opportunities/opportunities.controller";
import { OpportunitiesService } from "./opportunities/opportunities.service";
import { InteractionsController } from "./interactions/interactions.controller";
import { InteractionsService } from "./interactions/interactions.service";
import { ServiceTicketsController } from "./service-tickets/service-tickets.controller";
import { ServiceTicketsService } from "./service-tickets/service-tickets.service";
import { ReviewsController } from "./reviews/reviews.controller";
import { ReviewsService } from "./reviews/reviews.service";

@Module({
  controllers: [
    CustomersController,
    LeadsController,
    B2BAccountsController,
    OpportunitiesController,
    InteractionsController,
    ServiceTicketsController,
    ReviewsController,
  ],
  providers: [
    CustomersService,
    LeadsService,
    B2BAccountsService,
    OpportunitiesService,
    InteractionsService,
    ServiceTicketsService,
    ReviewsService,
  ],
  exports: [CustomersService],
})
export class CrmModule {}
