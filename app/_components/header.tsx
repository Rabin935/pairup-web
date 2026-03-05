"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";

interface HeaderProps {
    onMenuToggle?: () => void;
}

export default function Header({ onMenuToggle }: HeaderProps) {
    const { isAuthenticated, user, logout } = useAuth();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const initials = useMemo(() => {
        if (!user?.name && !user?.email) return "";
        const source = user?.name || user?.email || "";
        return source
            .split(" ")
            .map((part) => part.charAt(0).toUpperCase())
            .slice(0, 2)
            .join("");
    }, [user]);

    const handleSidebarOpen = () => {
        setIsSidebarOpen(true);
        onMenuToggle?.();
    };

    const handleSidebarClose = () => {
        setIsSidebarOpen(false);
    };

    
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

    return (
        <>
            <nav
        className={`sticky top-0 z-40 w-full border-b border-slate-200/70 bg-white/80 px-4 py-3 backdrop-blur-md transition-colors dark:border-slate-800/70 dark:bg-slate-950/70 ${
          scrolled
            ? "bg-white/90 backdrop-blur-xl shadow-sm border-slate-200 dark:bg-slate-950/90 dark:border-slate-800"
            : "bg-transparent dark:bg-transparent"
        }`}
      >



                <div className="mx-auto flex max-w-8xl items-center justify-between">

                    {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-md shadow-violet-300/40">
              <svg viewBox="0 0 24 24" className="fill-white w-5 h-5">
                <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z"/>
              </svg>
            </div>
            <span className="font-display font-bold text-xl text-gray-900 dark:text-white">PairUp</span>
          </div>
                

                 {/* Nav links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-500 dark:text-slate-300">
            <a href="#features" className="hover:text-violet-600 transition-colors dark:hover:text-violet-300">Features</a>
            <a href="#how" className="hover:text-violet-600 transition-colors dark:hover:text-violet-300">How it works</a>
            <a href="#stats" className="hover:text-violet-600 transition-colors dark:hover:text-violet-300">About</a>
          </div>

                

                {!isAuthenticated ? (
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            aria-label="Open menu"
                            onClick={handleSidebarOpen}
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-xl text-slate-600 shadow-sm transition-colors hover:border-rose-200 hover:text-rose-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-rose-400 md:hidden"
                        >
                            ☰
                        </button>
                        <Link
                            href="/login"
                            className="rounded-xl border border-violet-200 bg-violet-50 px-5 py-2.5 text-sm font-semibold text-violet-700 transition-all duration-300 hover:border-violet-600 hover:bg-violet-600 hover:text-white hover:shadow-lg hover:shadow-violet-200 dark:border-violet-700 dark:bg-violet-900/30 dark:text-violet-200 dark:hover:bg-violet-600 dark:hover:text-white"
                        >
                            Sign in
                        </Link>

                    </div>
                ) : (
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            aria-label="Toggle menu"
                            onClick={handleSidebarOpen}
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-xl text-slate-600 shadow-sm transition-colors hover:border-rose-200 hover:text-rose-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-rose-400"
                        >
                            ☰
                        </button>
                        {user?.profileImage ? (
                            <Image
                                src={user.profileImage as string}
                                alt={user?.name ?? "Profile"}
                                width={40}
                                height={40}
                                className="h-10 w-10 rounded-full object-cover shadow-sm"
                            />
                        ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-fuchsia-500 text-sm font-semibold text-white shadow-sm">
                                {initials || "ME"}
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={logout}
                            className="text-xs font-medium text-slate-400 underline-offset-2 hover:text-slate-600 dark:text-slate-300 dark:hover:text-slate-100"
                        >
                            Logout
                        </button>
                    </div>
                )}
                </div>
            </nav>
            <Sidebar isOpen={isSidebarOpen} onClose={handleSidebarClose} />
        </>
    );
}   
