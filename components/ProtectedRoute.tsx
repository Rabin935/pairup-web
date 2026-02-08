"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthData } from "@/lib/auth-utils";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'user';
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const authData = getAuthData();

    if (!authData) {
      // Not authenticated, redirect to login
      router.push('/login');
      return;
    }

    if (requiredRole && authData.userInfo.role !== requiredRole) {
      // Not authorized for this role
      if (authData.userInfo.role === 'admin') {
        router.push('/admin/users');
      } else {
        router.push('/dashboard');
      }
      return;
    }

    setIsAuthorized(true);
    setIsLoading(false);
  }, [router, requiredRole]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}
