"use client";

import { useToast } from "@/context/ToastContext";

import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRightIcon } from "@/icons";
import StockMovementService, { StockMovement } from "@/services/StockMovementService";
import { formatDateTime, ProductionDatePicker, todayParam } from "./ui";

const ReactApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

function MetricCard({ accent, label, value, note }: { accent: string; label: string; value: string | number; note: string }) {
  return (
    <div className="relative min-h-[132px] overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <span className={`absolute inset-x-0 top-0 h-1 ${accent}`} />
      <p className="text-xs font-semibold leading-snug text-slate-500 dark:text-slate-400 sm:text-sm">{label}</p>
      <p className="mt-3 text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl">{value}</p>
      <p className="mt-2 text-[11px] leading-snug text-slate-400 dark:text-slate-500 sm:text-xs">{note}</p>
    </div>
  );
}

function sumQty(items: StockMovement[]) {
  return items.reduce((total, item) => total + item.quantity, 0);
}

function topBy(items: StockMovement[], key: "location" | "part_name", limit = 5) {
  const totals = new Map<string, number>();
  items.forEach((item) => {
    const label = item[key] || "-";
    totals.set(label, (totals.get(label) ?? 0) + item.quantity);
  });

  return Array.from(totals, ([label, value]) => ({ label, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, limit);
}

function ChartCard({
  children,
  subtitle,
  title,
}: {
  children: React.ReactNode;
  subtitle: string;
  title: string;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4">
        <h2 className="font-bold text-slate-900 dark:text-white">{title}</h2>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function MovementChart({ stockIn, stockOut }: { stockIn: StockMovement[]; stockOut: StockMovement[] }) {
  const series = [
    {
      data: [sumQty(stockIn), sumQty(stockOut)],
      name: "Quantity",
    },
  ];
  const options: ApexOptions = {
    chart: { fontFamily: "Outfit, sans-serif", toolbar: { show: false }, type: "bar" },
    colors: ["#184F8F"],
    dataLabels: { enabled: false },
    grid: { borderColor: "#E5E7EB", strokeDashArray: 4 },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "42%" } },
    xaxis: { categories: ["Stock In", "Stock Out"], labels: { style: { colors: "#64748B" } } },
    yaxis: { labels: { style: { colors: "#64748B" } } },
  };

  return <ReactApexChart height={230} options={options} series={series} type="bar" />;
}

function LocationChart({ stockIn, stockOut }: { stockIn: StockMovement[]; stockOut: StockMovement[] }) {
  const rows = topBy([...stockIn, ...stockOut], "location");
  const options: ApexOptions = {
    chart: { fontFamily: "Outfit, sans-serif", toolbar: { show: false }, type: "bar" },
    colors: ["#0EA5E9"],
    dataLabels: { enabled: false },
    grid: { borderColor: "#E5E7EB", strokeDashArray: 4 },
    plotOptions: { bar: { borderRadius: 4, horizontal: true, barHeight: "48%" } },
    xaxis: { categories: rows.map((item) => item.label), labels: { style: { colors: "#64748B" } } },
    yaxis: { labels: { style: { colors: "#64748B" } } },
  };

  return <ReactApexChart height={230} options={options} series={[{ data: rows.map((item) => item.value), name: "Qty" }]} type="bar" />;
}

function TopPartsList({ stockIn, stockOut }: { stockIn: StockMovement[]; stockOut: StockMovement[] }) {
  const rows = topBy([...stockIn, ...stockOut], "part_name", 5);

  return (
    <div className="space-y-3">
      {rows.length ? rows.map((item, index) => (
        <div className="flex items-center justify-between rounded-md bg-slate-50 px-4 py-3 dark:bg-slate-800" key={item.label}>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-800 dark:text-white">{item.label}</p>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Rank #{index + 1}</p>
          </div>
          <span className="ml-3 text-sm font-black text-[#184F8F] dark:text-blue-300">{item.value.toLocaleString("en-US")}</span>
        </div>
      )) : <p className="py-16 text-center text-sm text-slate-400 dark:text-slate-500">No movement data available.</p>}
    </div>
  );
}

function LastStockTable({
  emptyMessage,
  href,
  items,
  loading,
  title,
  type,
}: {
  emptyMessage: string;
  href: string;
  items: StockMovement[];
  loading: boolean;
  title: string;
  type: "IN" | "OUT";
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
        <div><h2 className="font-bold text-slate-900 dark:text-white">{title}</h2><p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Latest 10 warehouse items</p></div>
        <Link
          aria-label={type === "IN" ? "Open Stock In" : "Open Stock Out"}
          className="flex size-9 shrink-0 items-center justify-center rounded-md border border-[#184F8F]/20 text-[#184F8F] transition hover:bg-[#184F8F]/5 hover:text-[#123D70] dark:border-blue-300/20 dark:text-blue-300"
          href={href}
          title={type === "IN" ? "Stock In" : "Stock Out"}
        >
          <ArrowRightIcon className="size-4" />
        </Link>
      </div>
      <div>
        <div className="space-y-2 p-3 md:hidden">{items.map((item) => <article key={item.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900 dark:text-white">{item.part_number}</p><p className="truncate text-xs text-slate-500 dark:text-slate-400">{item.part_name}</p></div><span className="shrink-0 text-sm font-black text-[#184F8F] dark:text-blue-300">{item.quantity.toLocaleString("en-US")}</span></div><div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2 text-xs dark:border-slate-800"><span className="min-w-0 truncate font-medium text-slate-600 dark:text-slate-300">{item.location}{type === "OUT" && item.customer_name ? ` · ${item.customer_name}` : ""}</span><span className="shrink-0 text-slate-500 dark:text-slate-400">{formatDateTime(item.timestamp)}</span></div></article>)}{!loading && !items.length ? <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">{emptyMessage}</p> : null}</div>
        <div className="hidden overflow-x-auto md:block"><table className="w-full table-fixed text-left">
          <colgroup>
            <col className="w-[42%]" />
            <col className="w-[24%]" />
            <col className="w-[10%]" />
            <col className="w-[24%]" />
          </colgroup>
          <thead className="bg-[#184F8F] text-[10px] uppercase tracking-wider text-white dark:bg-[#184F8F]">
            <tr>
              <th className="rounded-tl-md px-4 py-3">Part / Item</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="rounded-tr-md px-4 py-3">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((item) => (
              <tr className="text-xs xl:text-sm" key={item.id}>
                <td className="px-4 py-4 align-top">
                  <p className="truncate font-bold text-slate-800 dark:text-white">{item.part_number}</p>
                  <p className="mt-1 truncate text-xs text-slate-400 dark:text-slate-500">{item.part_name}</p>
                </td>
                <td className="px-4 py-4 align-top">
                  <p className="truncate font-semibold text-slate-700 dark:text-slate-200">{item.location}</p>
                  {type === "OUT" ? <p className="mt-1 truncate text-xs text-slate-400 dark:text-slate-500">{item.customer_name || "-"}</p> : null}
                </td>
                <td className="px-4 py-4 text-right align-top"><p className="font-black text-slate-900 dark:text-white">{item.quantity.toLocaleString("en-US")}</p></td>
                <td className="px-4 py-4 align-top text-xs font-semibold text-slate-500 dark:text-slate-400">{formatDateTime(item.timestamp)}</td>
              </tr>
            ))}
          </tbody>
        </table></div>
        {!loading && !items.length ? <p className="px-5 py-12 text-center text-sm text-slate-400 dark:text-slate-500">{emptyMessage}</p> : null}
      </div>
    </section>
  );
}

export default function ProductionDashboard() {
  const toast = useToast();
  const [date, setDate] = useState(todayParam());
  const [lastStockIn, setLastStockIn] = useState<StockMovement[]>([]);
  const [lastStockOut, setLastStockOut] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const [stockIn, stockOut] = await Promise.all([
        StockMovementService.getMovements({ date, type: "IN", page: 1, limit: 100 }),
        StockMovementService.getMovements({ date, type: "OUT", page: 1, limit: 100 }),
      ]);

      setLastStockIn(stockIn.data);
      setLastStockOut(stockOut.data);
    } catch (err) {
      toast.error({ message: err instanceof Error ? err.message : "Failed to load the warehouse dashboard." });
    } finally {
      setLoading(false);
    }
  }, [date, toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const stockInQty = sumQty(lastStockIn);
  const stockOutQty = sumQty(lastStockOut);
  const remainingQty = stockInQty - stockOutQty;
  const locationsUsed = new Set([...lastStockIn, ...lastStockOut].map((item) => item.location)).size;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-sky-200 bg-[#eaf8fd] px-6 py-5 text-slate-900 shadow-sm dark:border-sky-900/60 dark:bg-slate-900 dark:text-white sm:px-7">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#123D70] dark:text-blue-300">Dental Care</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white sm:text-[28px]">Warehouse Management System</h1>
          </div>
          <ProductionDatePicker className="max-w-[220px]" label="Operation Date" onChange={setDate} value={date} />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <MetricCard accent="bg-sky-500" label="Daily Stock In" note="Total stock in quantity for selected date" value={loading ? "..." : stockInQty.toLocaleString("en-US")} />
        <MetricCard accent="bg-blue-500" label="Daily Stock Out" note="Total stock out quantity for selected date" value={loading ? "..." : stockOutQty.toLocaleString("en-US")} />
        <MetricCard accent="bg-amber-400" label="Daily Balance" note="Daily Stock In minus Stock Out" value={loading ? "..." : remainingQty.toLocaleString("en-US")} />
        <MetricCard accent="bg-emerald-500" label="Locations Used" note="Distinct locations with movement today" value={loading ? "..." : locationsUsed.toLocaleString("en-US")} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <ChartCard subtitle="Total quantity for selected date" title="Daily Stock Movement">
          <MovementChart stockIn={lastStockIn} stockOut={lastStockOut} />
        </ChartCard>
        <ChartCard subtitle="Highest activity by location for selected date" title="Daily Top Locations">
          <LocationChart stockIn={lastStockIn} stockOut={lastStockOut} />
        </ChartCard>
        <ChartCard subtitle="Most active items for selected date" title="Daily Top Moving Parts">
          <TopPartsList stockIn={lastStockIn} stockOut={lastStockOut} />
        </ChartCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <LastStockTable emptyMessage="No stock in records found." href="/stock-in" items={lastStockIn.slice(0, 10)} loading={loading} title="10 Last Stock In by Date" type="IN" />
        <LastStockTable emptyMessage="No stock out records found." href="/stock-out" items={lastStockOut.slice(0, 10)} loading={loading} title="10 Last Stock Out by Date" type="OUT" />
      </div>
    </div>
  );
}
