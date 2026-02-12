'use client';

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export function AuthHashRedirect() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash || (!hash.includes("access_token=") && !hash.includes("refresh_token="))) {
      return;
    }

    if (pathname === "/auth/callback") {
      return;
    }

    router.replace(`/auth/callback${hash}`);
  }, [pathname, router]);

  return null;
}
