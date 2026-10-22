"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { hasValidAuthSession } from "./auth";

export function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const nextPath = pathname || "/";

    const timer = window.setTimeout(() => {
      if (!hasValidAuthSession()) {
        setIsAuthorized(false);
        router.replace(`/signin?next=${encodeURIComponent(nextPath)}`);
        return;
      }

      setIsAuthorized(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [pathname, router]);

  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm font-medium text-gray-500 dark:bg-gray-900 dark:text-gray-400">
        Checking session...
      </div>
    );
  }

  return children;
}
