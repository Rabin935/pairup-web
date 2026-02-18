"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo } from "react";
import { useAuth } from "@/context/AuthContext";

interface HeaderProps {
  onMenuToggle?: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const { isAuthenticated, user, logout } = useAuth();

  const initials = useMemo(() => {
    if (!user?.name && !user?.email) return "";
    const source = user?.name || user?.email || "";
    return source
      .split(" ")
      .map((part) => part.charAt(0).toUpperCase())
      .slice(0, 2)
      .join("");
  }, [user]);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/30 bg-white/80 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-lg font-semibold uppercase tracking-[0.2em] text-rose-500"
        >
          PairUp
        </Link>

        {!isAuthenticated ? (
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-500 transition hover:border-rose-400 hover:text-rose-600"
            >
              Login
            </Link>
            <Link
              href="/auth/register"
              className="rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-rose-200 transition hover:opacity-95"
            >
              Sign up
            </Link>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Toggle menu"
              onClick={onMenuToggle}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-xl text-slate-600 shadow-sm transition hover:border-rose-200 hover:text-rose-500"
            >
              ☰
            </button>
            {user?.profileImage ? (
              <Image
                src={user.profileImage as string}
                alt={user?.name ?? "Profile"}
                width={40}
                height={40}
                className="h-10 w-10 rounded-full object-cover shadow-xs"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-fuchsia-500 text-sm font-semibold text-white shadow-sm">
                {initials || "ME"}
              </div>
            )}
            <button
              type="button"
              onClick={logout}
              className="text-xs font-medium text-slate-400 underline-offset-2 hover:text-slate-600"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
