"use client";

import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
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
        <header className="sticky top-0 z-40 w-full border-b border-white/40 bg-[#2D3142] px-4 py-3 backdrop-blur-md">
            <div className="mx-auto flex max-w-6xl items-center justify-between">
                <Link href="/" className="flex items-center gap-3">
                    <div className="rounded-2xl bg-rose-100/80 p-2 text-rose-500">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-[0.4em] text-slate-500">PairUp</p>
                        <p className="text-lg font-semibold text-slate-900">Connections</p>
                    </div>
                </Link>

                <nav className="hidden items-center gap-6 text-sm font-medium text-slate-500 md:flex">
                    <Link href="/discover" className="transition hover:text-rose-500">
                        Discover
                    </Link>
                    <Link href="/search" className="transition hover:text-rose-500">
                        Search
                    </Link>
                    <Link href="/chats" className="transition hover:text-rose-500">
                        Chats
                    </Link>
                    <Link href="/about" className="transition hover:text-rose-500">
                        About
                    </Link>
                </nav>

                {!isAuthenticated ? (
                    <div className="flex items-center gap-3">
                        <Link
                            href="/login"
                            className="px-5 py-1.5 border border-white rounded-md text-sm font-bold hover:bg-white hover:text-[#2D3142] hover:scale-110 transition-all duration-200"
                        >
                            Login
                        </Link>
                        <Link
                            href="/register"
                            className="px-5 py-1.5 border border-white rounded-md text-sm font-bold hover:bg-white hover:text-[#2D3142] hover:scale-110 transition-all duration-200"
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