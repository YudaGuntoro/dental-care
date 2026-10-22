"use client";

import React, { useEffect, useState } from "react";
import DatePicker from "@/components/form/date-picker";
import { Modal } from "@/components/ui/modal";
import PartService, { Part, PartPayload } from "@/services/PartService";
import { useToast } from "@/context/ToastContext";

interface PartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  part: Part | null;
}

const currentLocalDateTime = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const emptyFormData = (): PartPayload => ({
  part_number: "",
  part_name: "",
  timestamp: currentLocalDateTime(),
});

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export default function PartModal({
  isOpen,
  onClose,
  onSuccess,
  part,
}: PartModalProps) {
  const toast = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<PartPayload>(() => emptyFormData());

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (part) {
      setFormData({
        part_number: part.part_number || "",
        part_name: part.part_name || "",
        timestamp: part.timestamp ? part.timestamp.slice(0, 16) : currentLocalDateTime(),
      });
      return;
    }

    setFormData(emptyFormData());
  }, [isOpen, part]);

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      if (part) {
        await PartService.updatePart(part.id, formData);
        toast.success({
          title: "Success",
          message: "Part updated successfully",
        });
      } else {
        await PartService.createPart(formData);
        toast.success({
          title: "Success",
          message: "Part created successfully",
        });
      }

      onSuccess();
      onClose();
    } catch (error: unknown) {
      toast.error({
        title: "Error",
        message: getErrorMessage(
          error,
          `Failed to ${part ? "update" : "create"} part`
        ),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[500px] p-6">
      <h3 className="mb-4 text-xl font-semibold text-gray-800 dark:text-white/90">
        {part ? "Update Part" : "Create Part"}
      </h3>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Part Number
          </label>
          <input
            type="text"
            name="part_number"
            value={formData.part_number}
            onChange={handleChange}
            required
            className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            placeholder="Enter part number"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Part Name
          </label>
          <input
            type="text"
            name="part_name"
            value={formData.part_name}
            onChange={handleChange}
            required
            className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            placeholder="Enter part name"
          />
        </div>

        <DatePicker
          key={formData.timestamp}
          altFormat="d / m / Y, H : i"
          altInput
          dateFormat="Y-m-d H:i"
          defaultDate={formData.timestamp}
          enableTime
          id="part-timestamp"
          label="TimeStamp"
          name="timestamp"
          onChange={([date]) => {
            if (date) {
              const localDate = new Date(date);
              localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
              setFormData((current) => ({
                ...current,
                timestamp: localDate.toISOString().slice(0, 16),
              }));
            }
          }}
          placeholder="Select timestamp"
          required
        />

        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:opacity-50"
          >
            {isSubmitting ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
