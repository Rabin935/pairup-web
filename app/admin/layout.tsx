"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  ShieldAlert,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { clearAuthData } from "@/lib/auth-utils";
import { getAdminSession } from "./_lib/admin-api";

type AdminLayoutProps = {
  children: ReactNode;
};

const NAV_ITEMS = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: Users,
  },
  {
    label: "Reports",
    href: "/admin/reports",
    icon: Flag,
  },
  {
    label: "Messages",
    href: "/admin/messages",
    icon: MessageSquare,
  },
  {
    label: "Flagged Content",
    href: "/admin/flagged",
    icon: ShieldAlert,
  },
] as const;

type AccessSnapshot = "pending" | "allowed" | "denied";

const ACCESS_FALLBACK: AccessSnapshot = "pending";

const subscribeToAccess = () => () => {};

const getAccessSnapshot = (): AccessSnapshot => {
  if (typeof window === "undefined") {
    return ACCESS_FALLBACK;
  }

  const { token, role } = getAdminSession();
  return Boolean(token) && role === "admin" ? "allowed" : "denied";
};

export default function AdminLayout({ children }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const access = useSyncExternalStore(
    subscribeToAccess,
    getAccessSnapshot,
    () => ACCESS_FALLBACK
  );

  useEffect(() => {
    if (access === "denied") {
      router.replace("/");
    }
  }, [access, router]);

  const pageTitle = useMemo(() => {
    if (pathname === "/admin/users") return "Users";
    if (pathname === "/admin/reports") return "Reports";
    if (pathname === "/admin/messages") return "Messages";
    if (pathname === "/admin/flagged") return "Flagged Content";
    return "Overview";
  }, [pathname]);

  const handleLogout = () => {
    clearAuthData();
    logout();
    router.replace("/login");
  };

  if (access === "pending") {
    return (
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-4 text-sm font-medium text-slate-600 shadow-sm">
          Checking admin access...
        </div>
      </div>
    );
  }

  if (access !== "allowed") {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto flex w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <aside
          className={`hidden shrink-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all duration-300 md:block ${
            isSidebarCollapsed ? "w-20" : "w-64"
          }`}
        >
          <div className="mb-6 border-b border-slate-200 pb-4">
            {isSidebarCollapsed ? (
              <p className="text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                Admin
              </p>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  PairUp Admin
                </p>
                <h1 className="mt-1 text-xl font-bold text-slate-900">Control Panel</h1>
              </>
            )}
          </div>

          <nav className="space-y-2">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isSidebarCollapsed ? item.label : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-rose-50 text-rose-700"
                      : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  } ${isSidebarCollapsed ? "justify-center" : ""}`}
                >
                  <Icon size={18} />
                  {!isSidebarCollapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="mt-6 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((current) => !current)}
              className={`flex w-full items-center rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 ${
                isSidebarCollapsed ? "justify-center" : "justify-between"
              }`}
            >
              {isSidebarCollapsed ? (
                <ChevronRight size={18} />
              ) : (
                <>
                  <span>Collapse</span>
                  <ChevronLeft size={18} />
                </>
              )}
            </button>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <div className="mb-3 flex gap-2 overflow-x-auto md:hidden">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-rose-600 text-white"
                      : "bg-white text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="mb-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Admin Dashboard</p>
                <h2 className="text-xl font-semibold text-slate-900">{pageTitle}</h2>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
          {children}
        </section>
      </div>
    </div>
  );
}
