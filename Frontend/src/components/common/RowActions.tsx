"use client";

import { PencilIcon, TrashBinIcon } from "@/icons";

type RowActionsProps = {
  onEdit?: () => void;
  onDelete?: () => void;
  deleteDisabled?: boolean;
};

const buttonClassName =
  "inline-flex size-10 shrink-0 items-center justify-center rounded-md border-0 bg-transparent p-0 leading-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current disabled:cursor-not-allowed disabled:opacity-50 md:size-8";
const iconClassName = "block size-5 shrink-0";

export default function RowActions({
  onEdit,
  onDelete,
  deleteDisabled = false,
}: RowActionsProps) {
  return (
    <div className="flex flex-nowrap items-center justify-center gap-1">
      {onEdit && (
        <button
          aria-label="Update"
          className={`${buttonClassName} text-orange-500 hover:bg-orange-50 hover:text-orange-600 dark:text-orange-400 dark:hover:bg-orange-500/10`}
          onClick={onEdit}
          title="Update"
          type="button"
        >
          <PencilIcon aria-hidden="true" className={iconClassName} focusable="false" />
        </button>
      )}
      {onDelete && (
        <button
          aria-label="Delete"
          className={`${buttonClassName} text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:text-rose-400 dark:hover:bg-rose-500/10`}
          disabled={deleteDisabled}
          onClick={onDelete}
          title="Delete"
          type="button"
        >
          <TrashBinIcon aria-hidden="true" className={iconClassName} focusable="false" />
        </button>
      )}
    </div>
  );
}
