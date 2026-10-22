import { useEffect, useRef } from 'react';
import flatpickr from 'flatpickr';
import { Indonesian } from 'flatpickr/dist/l10n/id.js';
import 'flatpickr/dist/flatpickr.css';
import { twMerge } from 'tailwind-merge';
import Label from './Label';
import { CalenderIcon } from '../../icons';
import Hook = flatpickr.Options.Hook;
import DateOption = flatpickr.Options.DateOption;

type PropsType = {
  id: string;
  mode?: "single" | "multiple" | "range" | "time";
  onChange?: Hook | Hook[];
  defaultDate?: DateOption;
  label?: string;
  placeholder?: string;
  enableTime?: boolean;
  dateFormat?: string;
  className?: string;
  iconClassName?: string;
  name?: string;
  required?: boolean;
  altInput?: boolean;
  altFormat?: string;
  value?: string;
  onValueChange?: (value: string) => void;
};

export default function DatePicker({
  id,
  mode,
  onChange,
  label,
  defaultDate,
  placeholder,
  enableTime = false,
  dateFormat,
  className,
  iconClassName,
  name,
  required,
  altInput,
  altFormat,
  value,
  onValueChange,
}: PropsType) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const pickerRef = useRef<flatpickr.Instance | null>(null);
  const onChangeRef = useRef(onChange);
  const onValueChangeRef = useRef(onValueChange);
  const resolvedDateFormat = dateFormat || (enableTime ? "Y-m-d H:i" : "Y-m-d");

  onChangeRef.current = onChange;
  onValueChangeRef.current = onValueChange;

  useEffect(() => {
    if (!inputRef.current) {
      return;
    }

    const flatPickr = flatpickr(inputRef.current, {
      mode: mode || "single",
      static: false,
      monthSelectorType: "static",
      dateFormat: resolvedDateFormat,
      defaultDate: value ?? defaultDate,
      locale: Indonesian,
      onReady: (_selectedDates, _dateStr, instance) => {
        if (instance.altInput) {
          instance.altInput.id = `${id}-display`;
          instance.altInput.setAttribute("aria-label", label || placeholder || "Pilih tanggal");
        }
      },
      onChange: (selectedDates, dateStr, instance) => {
        const changeHandler = onChangeRef.current;
        if (Array.isArray(changeHandler)) changeHandler.forEach((handler) => handler(selectedDates, dateStr, instance));
        else changeHandler?.(selectedDates, dateStr, instance);
        onValueChangeRef.current?.(dateStr);
      },
      enableTime,
      time_24hr: true,
      allowInput: true,
      altInput,
      altFormat,
      altInputClass: twMerge(
        "h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 bg-transparent text-gray-800 border-gray-300 focus:border-[#184F8F] focus:ring-[#184F8F]/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-blue-500",
        className
      ),
    });

    pickerRef.current = flatPickr;
    return () => {
      pickerRef.current = null;
      flatPickr.destroy();
    };
  }, [mode, id, defaultDate, resolvedDateFormat, enableTime, altInput, altFormat, className]);

  useEffect(() => {
    const picker = pickerRef.current;
    if (!picker || value === undefined) return;
    if (value) picker.setDate(value, false, resolvedDateFormat);
    else picker.clear(false);
  }, [value, resolvedDateFormat]);

  return (
    <div>
      {label && <Label htmlFor={altInput ? `${id}-display` : id}>{label}</Label>}

      <div className="relative">
        <input
          id={id}
          name={name}
          ref={inputRef}
          placeholder={placeholder}
          required={required}
          className={twMerge(
            "h-11 w-full rounded-lg border appearance-none px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 bg-transparent text-gray-800 border-gray-300 focus:border-[#184F8F] focus:ring-[#184F8F]/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-blue-500",
            className,
            altInput && "hidden"
          )}
        />

        <span className="pointer-events-none absolute right-3.5 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center text-[#184F8F] leading-none dark:text-blue-400">
          <CalenderIcon
            className={twMerge("block size-[18px] overflow-visible", iconClassName)}
          />
        </span>
      </div>
    </div>
  );
}
