"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Badge, Card, PageHeader, QueryError, Select, SegmentedControl } from "@/components/ui";
import { groupByDay, groupByMonth, groupByWeek } from "@/lib/date-buckets";
import type {
  ConversionsTimeseries,
  Customer,
  LeadsTimeseries,
  Lead,
  Opportunity,
  OrdersTimeseries,
  Product,
  SalesTimeseries,
  ServiceTicket,
  StageBreakdown,
  StatusBreakdown,
} from "@/lib/types";

/** "IN_PROGRESS" -> "In Progress", "DESIGN_SUPPORT" -> "Design Support". */
function formatEnumLabel(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function StatCard({
  label,
  value,
  isError,
}: {
  label: string;
  value: number | string;
  isError?: boolean;
}) {
  return (
    <Card>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${isError ? "text-red-600" : "text-slate-900"}`}>
        {isError ? "—" : value}
      </p>
      {isError && <p className="mt-1 text-xs text-red-500">Couldn&apos;t load</p>}
    </Card>
  );
}

function Chart({ data }: { data: { label: string; count: number }[] }) {
  if (data.every((d) => d.count === 0)) {
    return <p className="py-12 text-center text-sm text-slate-500">No data in this range yet.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e2e8f0" }} />
        <Bar dataKey="count" fill="#0284c7" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** A trend line, distinct from the bar charts above — used for Orders, since a running total
 *  over time reads more naturally as a line than as discrete bars. */
function TrendLineChart({ data }: { data: { label: string; count: number }[] }) {
  if (data.every((d) => d.count === 0)) {
    return <p className="py-12 text-center text-sm text-slate-500">No data in this range yet.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "#64748b" }} axisLine={{ stroke: "#e2e8f0" }} />
        <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e2e8f0" }} />
        <Line type="monotone" dataKey="count" stroke="#0284c7" strokeWidth={2.5} dot={{ r: 3, fill: "#0284c7" }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

const DONUT_COLORS = ["#0284c7", "#38bdf8", "#f59e0b", "#ef4444", "#94a3b8", "#7c3aed"];

/** A donut chart + legend for a status/stage breakdown — visually distinct from the bar/line
 *  trend charts above, since "what share is each category" reads better as a donut than a bar. */
function StatusPieCard({
  title,
  data,
  totalLabel,
}: {
  title: string;
  data: { label: string; count: number }[];
  totalLabel: string;
}) {
  const total = data.reduce((sum, d) => sum + d.count, 0);
  return (
    <Card>
      <h2 className="mb-4 text-sm font-semibold text-slate-900">{title}</h2>
      {total === 0 ? (
        <p className="py-12 text-center text-sm text-slate-500">No data yet.</p>
      ) : (
        <div className="flex items-center gap-4">
          <ResponsiveContainer width="45%" height={180}>
            <PieChart>
              <Pie data={data} dataKey="count" nameKey="label" innerRadius={42} outerRadius={75} paddingAngle={2}>
                {data.map((_, i) => (
                  <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e2e8f0" }} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="flex-1 space-y-1.5 text-sm">
            {data
              .filter((d) => d.count > 0)
              .map((d, i) => (
                <li key={d.label} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }}
                    />
                    {d.label}
                  </span>
                  <span className="font-medium text-slate-900">{d.count}</span>
                </li>
              ))}
          </ul>
        </div>
      )}
      <p className="mt-3 text-xs text-slate-500">
        {total} {totalLabel}
      </p>
    </Card>
  );
}

type LeadsGranularity = "day" | "week" | "month" | "total";

function LeadsChartSection() {
  const [granularity, setGranularity] = useState<LeadsGranularity>("week");
  const query = useQuery({
    queryKey: ["dashboard", "leads-timeseries"],
    queryFn: () => api.get<LeadsTimeseries>("/dashboard/leads-timeseries"),
  });

  const bars = useMemo(() => {
    if (!query.data) return [];
    if (granularity === "day") return groupByDay(query.data.daily);
    if (granularity === "week") return groupByWeek(query.data.daily);
    return groupByMonth(query.data.daily);
  }, [query.data, granularity]);

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Leads Generated</h2>
        <SegmentedControl
          value={granularity}
          onChange={setGranularity}
          options={[
            { value: "day", label: "Day" },
            { value: "week", label: "Week" },
            { value: "month", label: "Month" },
            { value: "total", label: "Total" },
          ]}
        />
      </div>

      {query.isLoading && <p className="py-12 text-center text-sm text-slate-500">Loading…</p>}
      {query.isError && <QueryError error={query.error} onRetry={() => query.refetch()} />}
      {query.data && granularity === "total" && (
        <div className="py-6 text-center">
          <p className="text-4xl font-semibold text-slate-900">{query.data.total}</p>
          <p className="mt-1 text-sm text-slate-500">leads generated all time</p>
        </div>
      )}
      {query.data && granularity !== "total" && <Chart data={bars} />}
    </Card>
  );
}

type SalesGranularity = "week" | "month";

function SalesChartSection() {
  const [brandId, setBrandId] = useState<string>("");
  const [granularity, setGranularity] = useState<SalesGranularity>("week");
  const query = useQuery({
    queryKey: ["dashboard", "sales-timeseries", brandId],
    queryFn: () =>
      api.get<SalesTimeseries>(`/dashboard/sales-timeseries${brandId ? `?brandId=${brandId}` : ""}`),
  });

  const bars = useMemo(() => {
    if (!query.data) return [];
    return granularity === "week" ? groupByWeek(query.data.daily) : groupByMonth(query.data.daily);
  }, [query.data, granularity]);

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Products Sold</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={brandId} onChange={(e) => setBrandId(e.target.value)} className="w-40">
            <option value="">All Brands</option>
            {query.data?.brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          <SegmentedControl
            value={granularity}
            onChange={setGranularity}
            options={[
              { value: "week", label: "Week" },
              { value: "month", label: "Month" },
            ]}
          />
        </div>
      </div>

      {query.isLoading && <p className="py-12 text-center text-sm text-slate-500">Loading…</p>}
      {query.isError && <QueryError error={query.error} onRetry={() => query.refetch()} />}
      {query.data && (
        <>
          <p className="mb-2 text-xs text-slate-500">
            {query.data.total} sold {brandId ? "for this brand" : "across all brands"} (all time)
          </p>
          <Chart data={bars} />
        </>
      )}
    </Card>
  );
}

type ConversionGranularity = "week" | "month" | "total";

function ConversionChartSection() {
  const [granularity, setGranularity] = useState<ConversionGranularity>("week");
  const query = useQuery({
    queryKey: ["dashboard", "conversions-timeseries"],
    queryFn: () => api.get<ConversionsTimeseries>("/dashboard/conversions-timeseries"),
  });

  const bars = useMemo(() => {
    if (!query.data) return [];
    return granularity === "week" ? groupByWeek(query.data.daily) : groupByMonth(query.data.daily);
  }, [query.data, granularity]);

  const rate = query.data && query.data.totalLeads > 0 ? (query.data.total / query.data.totalLeads) * 100 : 0;

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Lead Conversion</h2>
        <SegmentedControl
          value={granularity}
          onChange={setGranularity}
          options={[
            { value: "week", label: "Week" },
            { value: "month", label: "Month" },
            { value: "total", label: "Total" },
          ]}
        />
      </div>

      {query.isLoading && <p className="py-12 text-center text-sm text-slate-500">Loading…</p>}
      {query.isError && <QueryError error={query.error} onRetry={() => query.refetch()} />}
      {query.data && granularity === "total" && (
        <div className="grid grid-cols-2 gap-4 py-4 text-center">
          <div>
            <p className="text-4xl font-semibold text-slate-900">{query.data.total}</p>
            <p className="mt-1 text-sm text-slate-500">leads converted to customers</p>
          </div>
          <div>
            <p className="text-4xl font-semibold text-slate-900">{rate.toFixed(1)}%</p>
            <p className="mt-1 text-sm text-slate-500">conversion rate ({query.data.totalLeads} leads total)</p>
          </div>
        </div>
      )}
      {query.data && granularity !== "total" && <Chart data={bars} />}
    </Card>
  );
}

type OrdersGranularity = "day" | "week" | "month" | "total";

function OrdersChartSection() {
  const [granularity, setGranularity] = useState<OrdersGranularity>("week");
  const query = useQuery({
    queryKey: ["dashboard", "orders-timeseries"],
    queryFn: () => api.get<OrdersTimeseries>("/dashboard/orders-timeseries"),
  });

  const points = useMemo(() => {
    if (!query.data) return [];
    if (granularity === "day") return groupByDay(query.data.daily);
    if (granularity === "week") return groupByWeek(query.data.daily);
    return groupByMonth(query.data.daily);
  }, [query.data, granularity]);

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900">Orders</h2>
        <SegmentedControl
          value={granularity}
          onChange={setGranularity}
          options={[
            { value: "day", label: "Day" },
            { value: "week", label: "Week" },
            { value: "month", label: "Month" },
            { value: "total", label: "Total" },
          ]}
        />
      </div>

      {query.isLoading && <p className="py-12 text-center text-sm text-slate-500">Loading…</p>}
      {query.isError && <QueryError error={query.error} onRetry={() => query.refetch()} />}
      {query.data && granularity === "total" && (
        <div className="grid grid-cols-2 gap-4 py-4 text-center">
          <div>
            <p className="text-4xl font-semibold text-slate-900">{query.data.total}</p>
            <p className="mt-1 text-sm text-slate-500">orders all time</p>
          </div>
          <div>
            <p className="text-4xl font-semibold text-slate-900">
              ₹{query.data.totalRevenue.toLocaleString("en-IN")}
            </p>
            <p className="mt-1 text-sm text-slate-500">total revenue</p>
          </div>
        </div>
      )}
      {query.data && granularity !== "total" && <TrendLineChart data={points} />}
    </Card>
  );
}

function OrdersStatusSection() {
  // Same query key as OrdersChartSection — React Query dedupes this into a single request.
  const query = useQuery({
    queryKey: ["dashboard", "orders-timeseries"],
    queryFn: () => api.get<OrdersTimeseries>("/dashboard/orders-timeseries"),
  });
  const data = query.data?.byStatus.map((s) => ({ label: formatEnumLabel(s.status), count: s.count })) ?? [];
  return <StatusPieCard title="Orders by Status" data={data} totalLabel="orders" />;
}

function OpportunitiesBreakdownSection() {
  const query = useQuery({
    queryKey: ["dashboard", "opportunities-breakdown"],
    queryFn: () => api.get<StageBreakdown>("/dashboard/opportunities-breakdown"),
  });
  const data = query.data?.byStage.map((s) => ({ label: formatEnumLabel(s.stage), count: s.count })) ?? [];
  return <StatusPieCard title="Opportunities by Stage" data={data} totalLabel="opportunities" />;
}

function ServiceTicketsBreakdownSection() {
  const query = useQuery({
    queryKey: ["dashboard", "service-tickets-breakdown"],
    queryFn: () => api.get<StatusBreakdown>("/dashboard/service-tickets-breakdown"),
  });
  const data = query.data?.byStatus.map((s) => ({ label: formatEnumLabel(s.status), count: s.count })) ?? [];
  return <StatusPieCard title="Service Tickets by Status" data={data} totalLabel="tickets" />;
}

function QuotesBreakdownSection() {
  const query = useQuery({
    queryKey: ["dashboard", "quotes-breakdown"],
    queryFn: () => api.get<StatusBreakdown>("/dashboard/quotes-breakdown"),
  });
  const data = query.data?.byStatus.map((s) => ({ label: formatEnumLabel(s.status), count: s.count })) ?? [];
  return <StatusPieCard title="Quotes by Status" data={data} totalLabel="quotes" />;
}

const STAGE_LABELS: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  QUALIFIED: "Qualified",
  QUOTED: "Quoted",
};

/** Leads due for a follow-up call today — shown to every role (Admin and Supervisor alike),
 *  since it's the day's work list, not business-wide reporting. */
function TodayFollowUpsSection() {
  const query = useQuery({
    queryKey: ["dashboard", "today-followups"],
    queryFn: () => api.get<Lead[]>("/dashboard/today-followups"),
  });

  return (
    <Card className="mb-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Today&apos;s Follow-ups</h2>
        <Link href="/follow-ups" className="text-xs font-medium text-sky-600 hover:underline">
          Go to Follow-ups →
        </Link>
      </div>
      {query.isLoading && <p className="py-6 text-center text-sm text-slate-500">Loading…</p>}
      {query.isError && <QueryError error={query.error} onRetry={() => query.refetch()} />}
      {query.data && query.data.length === 0 && (
        <p className="py-6 text-center text-sm text-slate-500">No follow-ups due today.</p>
      )}
      {query.data && query.data.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {query.data.map((lead) => (
            <li key={lead.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <div>
                <p className="font-medium text-slate-900">{lead.name}</p>
                <p className="text-xs text-slate-500">{lead.phone}</p>
              </div>
              <Badge tone="amber">{STAGE_LABELS[lead.stage] ?? lead.stage}</Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function DashboardPage() {
  // Business-wide analytics (leads/sales/conversion/orders trends and the status breakdowns)
  // are Admin-only — Supervisor accounts only hold the specific write permissions an Admin
  // granted them and have no business reason to see company-wide reporting.
  const { hasPermission } = useAuth();
  const isAdmin = hasPermission("*");

  const products = useQuery({ queryKey: ["products"], queryFn: () => api.get<Product[]>("/inventory/products") });
  const leads = useQuery({ queryKey: ["leads"], queryFn: () => api.get<Lead[]>("/crm/leads") });
  const opportunities = useQuery({
    queryKey: ["opportunities"],
    queryFn: () => api.get<Opportunity[]>("/crm/opportunities"),
  });
  const customers = useQuery({ queryKey: ["customers"], queryFn: () => api.get<Customer[]>("/crm/customers") });
  const tickets = useQuery({
    queryKey: ["service-tickets"],
    queryFn: () => api.get<ServiceTicket[]>("/crm/service-tickets"),
  });

  const openLeads = leads.data?.filter((l) => l.stage !== "WON" && l.stage !== "LOST").length ?? 0;
  const openOpportunities = opportunities.data?.filter((o) => o.stage !== "LOST").length ?? 0;
  const openTickets = tickets.data?.filter((t) => t.status !== "CLOSED" && t.status !== "RESOLVED").length ?? 0;

  return (
    <div>
      <PageHeader title="Dashboard" />
      <div className="mb-6 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Products" value={products.data?.length ?? "…"} isError={products.isError} />
        <StatCard label="Customers" value={customers.data?.length ?? "…"} isError={customers.isError} />
        <StatCard label="Open Leads" value={leads.isLoading ? "…" : openLeads} isError={leads.isError} />
        <StatCard
          label="Open Opportunities"
          value={opportunities.isLoading ? "…" : openOpportunities}
          isError={opportunities.isError}
        />
        <StatCard
          label="Open Service Tickets"
          value={tickets.isLoading ? "…" : openTickets}
          isError={tickets.isError}
        />
      </div>

      <TodayFollowUpsSection />

      {isAdmin && (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <LeadsChartSection />
            <SalesChartSection />
            <div className="lg:col-span-2">
              <ConversionChartSection />
            </div>
            <div className="lg:col-span-2">
              <OrdersChartSection />
            </div>
          </div>

          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <OrdersStatusSection />
            <OpportunitiesBreakdownSection />
            <ServiceTicketsBreakdownSection />
            <QuotesBreakdownSection />
          </div>
        </>
      )}
    </div>
  );
}
