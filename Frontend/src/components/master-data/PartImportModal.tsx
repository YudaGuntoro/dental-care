"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import PartService from "@/services/PartService";
import { useToast } from "@/context/ToastContext";

export default function PartImportModal({ isOpen, onClose, onSuccess }: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const toast = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const close = () => {
    if (isSubmitting) return;
    setFile(null);

    onClose();
  };

  const downloadTemplate = async () => {
    setIsDownloading(true);

    try {
      await PartService.downloadTemplate();
    } catch (error) {
      toast.error({ message: error instanceof Error ? error.message : "Failed to download template." });
    } finally {
      setIsDownloading(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file || isSubmitting) return;
    if (!/\.(xlsx|csv)$/i.test(file.name) || file.size === 0 || file.size > 5 * 1024 * 1024) {
      toast.error({ message: "Select a non-empty .xlsx or .csv file up to 5 MB." });
      return;
    }
    setIsSubmitting(true);

    try {
      const result = await PartService.importParts(file);
      toast.success({ title: "Import complete", message: result.message });
      onSuccess();
      setFile(null);
      onClose();
    } catch (error) {
      toast.error({ message: error instanceof Error ? error.message : "Failed to import parts. Please check your file." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={close} className="max-w-[560px] p-6">
      <h3 className="mb-4 text-xl font-semibold text-gray-800 dark:text-white/90">Import Parts</h3>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Upload Excel (.xlsx, first worksheet) or CSV, up to 5 MB and 5,000 parts.
          Use Part Number in the first column and Part Name in the second column.
          Location is assigned during stock in.
        </p>
        <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 dark:border-blue-900 dark:bg-blue-950/30">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-[#184F8F] shadow-sm dark:bg-slate-900">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h8M12 11v8" /></svg>
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Part Master Template</p>
              <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">Excel workbook with a ready-to-fill table, instructions, and a separate example sheet.</p>
            </div>
          </div>
          <button type="button" onClick={() => void downloadTemplate()} disabled={isDownloading}
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-[#184F8F] px-4 py-2 text-sm font-medium text-white hover:bg-[#123f73] disabled:opacity-50">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M12 3v12m-4-4 4 4 4-4M5 16v4h14v-4" /></svg>
            {isDownloading ? "Downloading..." : "Download Excel Template"}
          </button>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">Fill in the first sheet starting at row 2. Examples are on a separate sheet and will not be imported. Duplicate or invalid rows must be corrected before any parts are imported.</p>
        <label htmlFor="parts-import-file" className="text-sm font-medium text-gray-700 dark:text-gray-300">Import file</label>
        <input key={isOpen ? "open" : "closed"} id="parts-import-file" type="file" accept=".xlsx,.csv" required disabled={isSubmitting}
          onChange={(event) => { setFile(event.target.files?.[0] ?? null); }}
          className="w-full rounded-lg border border-gray-300 p-3 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300" />
        <div className="mt-4 flex justify-end gap-3">
          <button type="button" onClick={close} disabled={isSubmitting} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300">Cancel</button>
          <button type="submit" disabled={!file || isSubmitting} className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50">{isSubmitting ? "Importing..." : "Import"}</button>
        </div>
      </form>
    </Modal>
  );
}
