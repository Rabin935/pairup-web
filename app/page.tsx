"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAuthData } from "@/lib/auth-utils";

export default function Page() {
  const router = useRouter();

  useEffect(() => {
    if (getAuthData()) {
      router.replace("/sidebar/home");
      return;
    }

    router.replace("/dashboard");
  }, [router]);

  return null;
}
