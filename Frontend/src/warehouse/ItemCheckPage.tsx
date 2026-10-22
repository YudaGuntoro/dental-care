"use client";

import { useToast } from "@/context/ToastContext";

import { FormEvent, useState } from "react";
import StockMovementService, { ItemCheckQuery, ItemCheckResult } from "@/services/StockMovementService";

const inputClass =
  "h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-800 placeholder:text-slate-500 outline-none focus:border-[#184F8F] focus:ring-2 focus:ring-[#184F8F]/10 dark:border-slate-600 dark:bg-slate-950 dark:text-slate-50 dark:placeholder:text-slate-300";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  month: "short",
  year: "numeric",
});

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : dateFormatter.format(date);
}

type StockQrPayload = {
  location?: string;
  part_name?: string;
  part_number?: string;
  type?: string;
};

function parseStockQrPayload(value: string): StockQrPayload | null {
  try {
    const parsed = JSON.parse(value.trim()) as StockQrPayload;
    if (
      parsed &&
      typeof parsed === "object" &&
      (parsed.type === "STOCK_IN" || parsed.part_name || parsed.part_number) &&
      (parsed.part_name || parsed.part_number)
    ) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

function buildItemCheckQuery(value: string): { query: ItemCheckQuery; qrPayload: StockQrPayload | null } {
  const qrPayload = parseStockQrPayload(value);
  if (qrPayload) {
    return {
      query: {
        location: qrPayload.location?.trim(),
        partName: qrPayload.part_name?.trim(),
        partNumber: qrPayload.part_number?.trim(),
      },
      qrPayload,
    };
  }

  return { query: { partName: value.trim() }, qrPayload: null };
}

function ExcelIcon({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 48 48">
      <path d="M18 6h22a4 4 0 0 1 4 4v28a4 4 0 0 1-4 4H18V6Z" fill="#185C37" />
      <path d="M18 6h11v12H18V6Z" fill="#21A366" />
      <path d="M29 6h11a4 4 0 0 1 4 4v8H29V6Z" fill="#33C481" />
      <path d="M18 18h11v12H18V18Z" fill="#107C41" />
      <path d="M29 18h15v12H29V18Z" fill="#21A366" />
      <path d="M18 30h11v12H18V30Z" fill="#184E2F" />
      <path d="M29 30h15v8a4 4 0 0 1-4 4H29V30Z" fill="#276B43" />
      <path d="M6 15h19a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V19a4 4 0 0 1 4-4Z" fill="#107C41" />
      <path d="m9.4 21 4.3 7-4.5 7h4.5l2.4-4.2 2.4 4.2h4.7l-4.7-7.1 4.4-6.9h-4.4l-2.2 4-2.2-4H9.4Z" fill="#FFFFFF" />
    </svg>
  );
}

export default function ItemCheckPage() {
  const toast = useToast();
  const [searchValue, setSearchValue] = useState("");
  const [items, setItems] = useState<ItemCheckResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [scannedQr, setScannedQr] = useState<StockQrPayload | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    try {
      const { query, qrPayload } = buildItemCheckQuery(searchValue);
      setScannedQr(qrPayload);
      const result = await StockMovementService.checkItem(query);
      setItems(result.data);
      if (!result.data.length) {
        toast.info({ message: qrPayload ? "No stock found for this scanned QR." : "No stock found for this Part Name." });
      }
    } catch (error) {
      toast.error({ message: error instanceof Error ? error.message : "Failed to check item stock." });
    } finally {
      setLoading(false);
    }
  }

  async function exportExcel() {
    setExporting(true);

    try {
      await StockMovementService.exportStockOpname(scannedQr?.part_name ?? searchValue);
      toast.success({ message: "Stock opname exported successfully." });
    } catch (error) {
      toast.error({ message: error instanceof Error ? error.message : "Failed to export stock opname." });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#184F8F]">Warehouse Operation</p>
          <h1 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">Item Check</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
            Check remaining quantity, location, and Lot by scanning Stock In QR or Part Name.
          </p>
        </div>
      </div>

      <form className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-5 md:grid-cols-[minmax(0,1fr)_auto_auto]" onSubmit={(event) => void submit(event)}>
        <input
          className={inputClass}
          onChange={(event) => {
            setSearchValue(event.target.value);
            setScannedQr(null);
          }}
          placeholder="Scan Stock In QR or search by Part Name"
          required
          value={searchValue}
        />
        <button className="h-11 w-full rounded-md bg-[#184F8F] px-6 text-sm font-bold text-white transition hover:bg-[#123D70] disabled:bg-[#0F335C] disabled:opacity-80 md:w-auto" disabled={loading} type="submit">
          {loading ? "Checking..." : "Check"}
        </button>
        <button
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-[#107C41] bg-[#107C41] px-5 text-sm font-bold text-white shadow-sm transition hover:border-[#0E6F3A] hover:bg-[#0E6F3A] disabled:opacity-60 dark:border-[#21A366] dark:bg-[#107C41] dark:hover:bg-[#0E6F3A] md:w-auto"
          disabled={exporting}
          onClick={() => void exportExcel()}
          type="button"
        >
          <ExcelIcon className="size-5 shrink-0" />
          {exporting ? "Exporting..." : "Export Excel"}
        </button>
      </form>

      {scannedQr ? (
        <div className="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-[#184F8F] dark:border-blue-500/20 dark:bg-blue-500/10 dark:text-blue-200">
          <span className="font-bold">QR detected:</span> {scannedQr.part_number || "-"} / {scannedQr.part_name || "-"} / {scannedQr.location || "-"}
        </div>
      ) : null}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-4 py-4 dark:border-slate-800 sm:px-5">
          <h2 className="font-bold text-slate-900 dark:text-white">Available Lots & Locations</h2>
          <p className="mt-1 text-xs text-slate-400">Stock In minus Stock Out, grouped by Part Name, Lot, and Location.</p>
        </div>
        <div className="space-y-3 p-4 md:hidden">
          {items.map((item) => (
            <article className="rounded-md border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950" key={`${item.part_name}-${item.part_number}-${item.location}`}>
              <p className="break-words text-sm font-black text-slate-900 dark:text-white">{item.part_name}</p>
              <p className="mt-1 break-words text-sm font-semibold text-slate-600 dark:text-slate-300">{item.part_number}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-slate-50 p-2 dark:bg-slate-800">
                  <p className="font-bold uppercase text-slate-400">Location</p>
                  <p className="mt-1 break-words font-semibold text-slate-700 dark:text-slate-200">{item.location}</p>
                </div>
                <div className="rounded-md bg-slate-50 p-2 text-right dark:bg-slate-800">
                  <p className="font-bold uppercase text-slate-400">Qty Sisa</p>
                  <p className="mt-1 font-black text-slate-900 dark:text-white">{item.remaining_qty.toLocaleString("en-US")}</p>
                </div>
                <div className="rounded-md bg-slate-50 p-2 text-right dark:bg-slate-800">
                  <p className="font-bold uppercase text-slate-400">Stock In</p>
                  <p className="mt-1 font-semibold text-slate-700 dark:text-slate-200">{item.stock_in_qty.toLocaleString("en-US")}</p>
                </div>
                <div className="rounded-md bg-slate-50 p-2 text-right dark:bg-slate-800">
                  <p className="font-bold uppercase text-slate-400">Stock Out</p>
                  <p className="mt-1 font-semibold text-slate-700 dark:text-slate-200">{item.stock_out_qty.toLocaleString("en-US")}</p>
                </div>
                <div className="col-span-2 rounded-md bg-slate-50 p-2 dark:bg-slate-800">
                  <p className="font-bold uppercase text-slate-400">Last TimeStamp</p>
                  <p className="mt-1 font-semibold text-slate-700 dark:text-slate-200">{formatDate(item.last_timestamp)}</p>
                </div>
              </div>
            </article>
          ))}
          {!items.length ? <p className="py-8 text-center text-sm text-slate-400">Scan Stock In QR or search Part Name to check available stock.</p> : null}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead className="bg-[#184F8F] text-xs uppercase text-white">
              <tr>
                <th className="rounded-tl-md px-5 py-3">Part Name</th>
                <th className="px-4 py-3">Part Number</th>
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3 text-right">Stock In</th>
                <th className="px-4 py-3 text-right">Stock Out</th>
                <th className="px-4 py-3 text-right">Qty Sisa</th>
                <th className="rounded-tr-md px-5 py-3">Last TimeStamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {items.map((item) => (
                <tr key={`${item.part_name}-${item.part_number}-${item.location}`}>
                  <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">{item.part_name}</td>
                  <td className="px-4 py-4 font-semibold text-slate-700 dark:text-slate-200">{item.part_number}</td>
                  <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{item.location}</td>
                  <td className="px-4 py-4 text-right text-slate-600 dark:text-slate-300">{item.stock_in_qty.toLocaleString("en-US")}</td>
                  <td className="px-4 py-4 text-right text-slate-600 dark:text-slate-300">{item.stock_out_qty.toLocaleString("en-US")}</td>
                  <td className="px-4 py-4 text-right font-black text-slate-900 dark:text-white">{item.remaining_qty.toLocaleString("en-US")}</td>
                  <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{formatDate(item.last_timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!items.length ? <p className="px-5 py-12 text-center text-sm text-slate-400">Scan Stock In QR or search Part Name to check available stock.</p> : null}
        </div>
      </section>
    </div>
  );
}
