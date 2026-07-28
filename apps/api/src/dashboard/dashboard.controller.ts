import { Controller, Get, Query } from "@nestjs/common";
import { DashboardService } from "./dashboard.service";

@Controller("dashboard")
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get("leads-timeseries")
  leadsTimeseries() {
    return this.dashboardService.getLeadsTimeseries();
  }

  @Get("sales-timeseries")
  salesTimeseries(@Query("brandId") brandId?: string) {
    return this.dashboardService.getSalesTimeseries(brandId);
  }

  @Get("conversions-timeseries")
  conversionsTimeseries() {
    return this.dashboardService.getConversionsTimeseries();
  }

  @Get("orders-timeseries")
  ordersTimeseries() {
    return this.dashboardService.getOrdersTimeseries();
  }

  @Get("opportunities-breakdown")
  opportunitiesBreakdown() {
    return this.dashboardService.getOpportunitiesBreakdown();
  }

  @Get("service-tickets-breakdown")
  serviceTicketsBreakdown() {
    return this.dashboardService.getServiceTicketsBreakdown();
  }

  @Get("quotes-breakdown")
  quotesBreakdown() {
    return this.dashboardService.getQuotesBreakdown();
  }

  @Get("today-followups")
  todayFollowUps() {
    return this.dashboardService.getTodayFollowUps();
  }
}
