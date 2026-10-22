"use client";

import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/context/ToastContext";
import LocationService, { Location, LocationPayload } from "@/services/LocationService";

type LocationModalProps = {
  isOpen: boolean;
  location: Location | null;
  onClose: () => void;
  onSuccess: () => void;
};

const emptyFormData = (): LocationPayload => ({
  description: "",
  is_active: true,
  location_code: "",
  location_name: "",
});

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export default function LocationModal({
  isOpen,
  location,
  onClose,
  onSuccess,
}: LocationModalProps) {
  const toast = useToast();
  const [formData, setFormData] = useState<LocationPayload>(() => emptyFormData());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (location) {
      setFormData({
        description: location.description ?? "",
        is_active: location.is_active,
        location_code: location.location_code,
        location_name: location.location_name,
      });
      return;
    }

    setFormData(emptyFormData());
  }, [isOpen, location]);

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, type, value } = event.target;
    const checked = type === "checkbox" ? (event.target as HTMLInputElement).checked : undefined;

    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      if (location) {
        await LocationService.updateLocation(location.id, formData);
        toast.success({ title: "Success", message: "Location updated successfully" });
      } else {
        await LocationService.createLocation(formData);
        toast.success({ title: "Success", message: "Location created successfully" });
      }

      onSuccess();
      onClose();
    } catch (error: unknown) {
      toast.error({
        title: "Error",
        message: getErrorMessage(error, `Failed to ${location ? "update" : "create"} location`),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[520px] p-6">
      <h3 className="mb-4 text-xl font-semibold text-gray-800 dark:text-white/90">
        {location ? "Update Location" : "Create Location"}
      </h3>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Location Code
          </label>
          <input
            className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            name="location_code"
            onChange={handleChange}
            placeholder="Example: A-01-01"
            required
            type="text"
            value={formData.location_code}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Location Name
          </label>
          <input
            className="h-10 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            name="location_name"
            onChange={handleChange}
            placeholder="Example: Rack A Level 1"
            required
            type="text"
            value={formData.location_name}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Description
          </label>
          <textarea
            className="min-h-24 w-full rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 outline-none placeholder:text-gray-400 focus:border-brand-300 focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            name="description"
            onChange={handleChange}
            placeholder="Optional location notes"
            value={formData.description ?? ""}
          />
        </div>

        <label className="flex items-center gap-3 text-sm font-medium text-gray-700 dark:text-gray-300">
          <input
            checked={formData.is_active}
            className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            name="is_active"
            onChange={handleChange}
            type="checkbox"
          />
          Active location
        </label>

        <div className="mt-4 flex justify-end gap-3">
          <button
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            onClick={onClose}
            type="button"
          >
            Cancel
          </button>
          <button
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:opacity-50"
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Saving..." : "Save"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
