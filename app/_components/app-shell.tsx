"use client";

import { usePathname, useRouter } from "next/navigation";
import Header from "./header";
import Navbar from "./sidebar";
import { useAuth } from "@/context/AuthContext";
import { clearAuthData } from "@/lib/auth-utils";
import { LogOut } from "lucide-react";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, logout } = useAuth();

  const isAuthPage =
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password");

  const isSidebarPage =
    pathname.startsWith("/sidebar") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/user") ||
    pathname.startsWith("/settings");

  const showSidebar = Boolean(isAuthenticated) && isSidebarPage;
  const showHeader = !isAuthenticated && !isAuthPage;
  const showLogoutButton = showSidebar && pathname.startsWith("/profile");

  const handleLogout = () => {
    clearAuthData();
    logout();
    router.replace("/login");
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 transition-colors duration-300 dark:bg-slate-950 dark:text-slate-100">
      {showHeader && <Header />}
      <div className="flex flex-1">
        {showSidebar && <Navbar />}
        <main className="relative flex-1">
          {showLogoutButton && (
            <button
              type="button"
              onClick={handleLogout}
              className="fixed right-4 top-4 z-50 inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 shadow-sm transition-colors hover:bg-red-50 dark:border-red-900/40 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-slate-800"
            >
              <LogOut size={16} />
              Logout
            </button>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
