"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type ToastType = "success" | "error" | "warning" | "info";

type ToastInput = {
  title?: string;
  message: string;
  duration?: number;
};

type Toast = ToastInput & {
  id: number;
  type: ToastType;
};

type ToastContextType = {
  error: (toast: ToastInput) => void;
  info: (toast: ToastInput) => void;
  removeToast: (id: number) => void;
  success: (toast: ToastInput) => void;
  warning: (toast: ToastInput) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const toastStyles: Record<ToastType, string> = {
  error:
    "border-error-200 bg-error-50 text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400",
  info: "border-blue-light-200 bg-blue-light-50 text-blue-light-700 dark:border-blue-light-500/30 dark:bg-blue-light-500/15 dark:text-blue-light-400",
  success:
    "border-success-200 bg-success-50 text-success-700 dark:border-success-500/30 dark:bg-success-500/15 dark:text-success-400",
  warning:
    "border-warning-200 bg-warning-50 text-warning-700 dark:border-warning-500/30 dark:bg-warning-500/15 dark:text-orange-400",
};

const defaultTitles: Record<ToastType, string> = {
  error: "Error",
  info: "Info",
  success: "Success",
  warning: "Warning",
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);
  const activeKeys = useRef(new Map<string, number>());
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const activeTimers = timers.current;
    return () => {
      activeTimers.forEach(clearTimeout);
      activeTimers.clear();
    };
  }, []);

  const removeToast = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    activeKeys.current.forEach((activeId, key) => {
      if (activeId === id) activeKeys.current.delete(key);
    });
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, toast: ToastInput) => {
      const message = toast.message.trim() || "Something went wrong. Please try again.";
      const key = JSON.stringify([type, toast.title ?? defaultTitles[type], message]);
      // Concurrent requests and Strict Mode may report the same failure twice.
      if (activeKeys.current.has(key)) return;
      const id = nextId.current;
      nextId.current += 1;
      activeKeys.current.set(key, id);
      const duration = toast.duration ?? (type === "error" ? 6000 : 4000);

      setToasts((current) => [
        ...current,
        {
          ...toast,
          message,
          duration,
          id,
          type,
        },
      ]);

      if (duration !== 0) {
        timers.current.set(id, globalThis.setTimeout(() => removeToast(id), duration));
      }
    },
    [removeToast]
  );

  const value = useMemo<ToastContextType>(
    () => ({
      error: (toast) => addToast("error", toast),
      info: (toast) => addToast("info", toast),
      removeToast,
      success: (toast) => addToast("success", toast),
      warning: (toast) => addToast("warning", toast),
    }),
    [addToast, removeToast]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 bottom-4 z-999999 flex w-[calc(100%_-_2rem)] max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-lg border p-4 shadow-theme-lg ${toastStyles[toast.type]}`}
            role={toast.type === "error" ? "alert" : "status"}
            aria-atomic="true"
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">
                  {toast.title ?? defaultTitles[toast.type]}
                </p>
                <p className="mt-1 max-h-48 overflow-y-auto break-words text-sm opacity-90">{toast.message}</p>
              </div>
              <button
                aria-label="Close toast"
                className="rounded-md px-2 text-lg leading-none opacity-70 hover:opacity-100"
                onClick={() => removeToast(toast.id)}
                type="button"
              >
                x
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }

  return context;
};
