import { Injectable } from "@nestjs/common";
import {
  LeadStage,
  OpportunityStage,
  ProductUnitStatus,
  QuoteStatus,
  SalesOrderStatus,
  ServiceTicketStatus,
} from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const WINDOW_DAYS = 365;

export interface DailyCount {
  date: string; // "YYYY-MM-DD"
  count: number;
}

function windowStart(): Date {
  const d = new Date();
  d.setDate(d.getDate() - WINDOW_DAYS);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Buckets a list of timestamps into daily counts covering exactly the last WINDOW_DAYS days
 *  (including days with zero events), so the frontend can chart a continuous timeline. */
function bucketDaily(timestamps: Date[]): DailyCount[] {
  const counts = new Map<string, number>();
  for (const ts of timestamps) {
    const key = toDateKey(ts);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const days: DailyCount[] = [];
  const cursor = windowStart();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  while (cursor <= today) {
    const key = toDateKey(cursor);
    days.push({ date: key, count: counts.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getLeadsTimeseries() {
    const [windowLeads, total] = await Promise.all([
      this.prisma.lead.findMany({
        where: { createdAt: { gte: windowStart() } },
        select: { createdAt: true },
      }),
      this.prisma.lead.count(),
    ]);

    return { daily: bucketDaily(windowLeads.map((l) => l.createdAt)), total };
  }

  async getSalesTimeseries(brandId?: string) {
    const brandFilter = brandId ? { product: { brandId } } : {};

    const [windowUnits, total, brands] = await Promise.all([
      this.prisma.productUnit.findMany({
        where: { status: ProductUnitStatus.SOLD, soldAt: { gte: windowStart() }, ...brandFilter },
        select: { soldAt: true },
      }),
      this.prisma.productUnit.count({
        where: { status: ProductUnitStatus.SOLD, ...brandFilter },
      }),
      this.prisma.brand.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ]);

    return {
      daily: bucketDaily(windowUnits.map((u) => u.soldAt as Date)),
      total,
      brands,
    };
  }

  async getConversionsTimeseries() {
    const [windowConversions, totalConverted, totalLeads] = await Promise.all([
      this.prisma.lead.findMany({
        where: { customerId: { not: null }, updatedAt: { gte: windowStart() } },
        select: { updatedAt: true },
      }),
      this.prisma.lead.count({ where: { customerId: { not: null } } }),
      this.prisma.lead.count(),
    ]);

    return {
      daily: bucketDaily(windowConversions.map((l) => l.updatedAt)),
      total: totalConverted,
      totalLeads,
    };
  }

  async getOrdersTimeseries() {
    const [windowOrders, total, statusGroups, revenueAgg] = await Promise.all([
      this.prisma.salesOrder.findMany({
        where: { createdAt: { gte: windowStart() } },
        select: { createdAt: true },
      }),
      this.prisma.salesOrder.count(),
      this.prisma.salesOrder.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.salesOrder.aggregate({ _sum: { total: true } }),
    ]);

    const statusCounts = new Map(statusGroups.map((g) => [g.status, g._count._all]));
    const byStatus = Object.values(SalesOrderStatus).map((status) => ({
      status,
      count: statusCounts.get(status) ?? 0,
    }));

    return {
      daily: bucketDaily(windowOrders.map((o) => o.createdAt)),
      total,
      totalRevenue: Number(revenueAgg._sum.total ?? 0),
      byStatus,
    };
  }

  async getOpportunitiesBreakdown() {
    const [groups, total] = await Promise.all([
      this.prisma.opportunity.groupBy({ by: ["stage"], _count: { _all: true } }),
      this.prisma.opportunity.count(),
    ]);
    const counts = new Map(groups.map((g) => [g.stage, g._count._all]));
    const byStage = Object.values(OpportunityStage).map((stage) => ({ stage, count: counts.get(stage) ?? 0 }));
    return { byStage, total };
  }

  async getServiceTicketsBreakdown() {
    const [groups, total] = await Promise.all([
      this.prisma.serviceTicket.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.serviceTicket.count(),
    ]);
    const counts = new Map(groups.map((g) => [g.status, g._count._all]));
    const byStatus = Object.values(ServiceTicketStatus).map((status) => ({
      status,
      count: counts.get(status) ?? 0,
    }));
    return { byStatus, total };
  }

  async getQuotesBreakdown() {
    const [groups, total] = await Promise.all([
      this.prisma.quote.groupBy({ by: ["status"], _count: { _all: true } }),
      this.prisma.quote.count(),
    ]);
    const counts = new Map(groups.map((g) => [g.status, g._count._all]));
    const byStatus = Object.values(QuoteStatus).map((status) => ({ status, count: counts.get(status) ?? 0 }));
    return { byStatus, total };
  }

  /** Leads whose next scheduled follow-up call falls on today's date — the list a
   *  Supervisor sees on login so they know who to call today. */
  getTodayFollowUps() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    return this.prisma.lead.findMany({
      where: {
        nextFollowUpAt: { gte: startOfToday, lt: startOfTomorrow },
        stage: { notIn: [LeadStage.WON, LeadStage.LOST] },
      },
      include: { assignedTo: { select: { id: true, name: true } } },
      orderBy: { nextFollowUpAt: "asc" },
    });
  }
}
