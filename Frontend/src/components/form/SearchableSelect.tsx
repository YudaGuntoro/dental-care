"use client";

import { KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";

export type SearchableOption = { value: string | number; label: string; description?: string };

type SearchableSelectProps = {
  name: string;
  options: SearchableOption[];
  placeholder: string;
  required?: boolean;
  className?: string;
  emptyMessage?: string;
};

export default function SearchableSelect({ name, options, placeholder, required = false, className = "", emptyMessage = "Tidak ada pilihan yang cocok." }: SearchableSelectProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<SearchableOption | null>(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const selectedSearch = selected?.label === search;
  const filtered = useMemo(() => {
    const query = (selectedSearch ? "" : search).trim().toLocaleLowerCase("id-ID");
    return query ? options.filter((option) => `${option.label} ${option.description ?? ""}`.toLocaleLowerCase("id-ID").includes(query)) : options;
  }, [options, search, selectedSearch]);

  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const reset = () => { setSelected(null); setSearch(""); setOpen(false); setActiveIndex(0); };
    form.addEventListener("reset", reset);
    return () => form.removeEventListener("reset", reset);
  }, []);

  function choose(option: SearchableOption) {
    setSelected(option); setSearch(option.label); setOpen(false); setActiveIndex(0);
    inputRef.current?.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActiveIndex((index) => Math.min(index + 1, filtered.length - 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setOpen(true); setActiveIndex((index) => Math.max(index - 1, 0)); }
    else if (event.key === "Enter" && open && filtered.length) { event.preventDefault(); choose(filtered[activeIndex] ?? filtered[0]); }
    else if (event.key === "Escape") setOpen(false);
  }

  return <div className="relative">
    <input type="hidden" name={name} value={selected?.value ?? ""} />
    <input
      ref={inputRef}
      type="text"
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={open}
      aria-controls={`${id}-options`}
      aria-activedescendant={open && filtered[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
      autoComplete="off"
      required={required}
      value={search}
      placeholder={placeholder}
      className={`${className} pr-10`}
      onFocus={(event) => { setOpen(true); event.currentTarget.select(); }}
      onBlur={() => window.setTimeout(() => setOpen(false), 120)}
      onChange={(event) => { setSearch(event.target.value); setSelected(null); setOpen(true); setActiveIndex(0); }}
      onKeyDown={onKeyDown}
    />
    <svg aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" viewBox="0 0 20 20" fill="none"><path d="m5 7.5 5 5 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
    {open && <ul id={`${id}-options`} role="listbox" className="absolute z-30 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
      {filtered.length ? filtered.map((option, index) => <li key={option.value} id={`${id}-option-${index}`} role="option" aria-selected={selected?.value === option.value}>
        <button type="button" tabIndex={-1} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(option)} className={`w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-teal-50 dark:text-slate-200 dark:hover:bg-slate-800 ${activeIndex === index ? "bg-teal-50 dark:bg-slate-800" : ""}`}>
          <span className="block font-semibold leading-5">{option.label}</span>
          {option.description && <span className="mt-0.5 block text-xs leading-4 text-slate-500 dark:text-slate-400">{option.description}</span>}
        </button>
      </li>) : <li className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">{emptyMessage}</li>}
    </ul>}
  </div>;
}
