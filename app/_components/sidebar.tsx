"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getAuthData } from "@/lib/auth-utils";

const NAV_LINKS = [
    { label: "Home", href: "/" },
    { label: "Discover", href: "/sidebar/discover" },
    { label: "Search", href: "/sidebar/search" },
    { label: "Create", href: "/sidebar/create" },
    { label: "Chats", href: "/sidebar/chats" },
    { label: "Profile", href: "/profile" },
];

export default function Navbar() {
    const pathname = usePathname();
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        setIsAuthenticated(Boolean(getAuthData()));

        const handleStorage = () => {
            setIsAuthenticated(Boolean(getAuthData()));
        };

        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, []);

    return (
        <aside className="hidden md:flex sticky top-0 h-screen w-64 flex-col bg-[#2D3142] text-white shadow-2xl">
            {/* <div className="px-6 py-8 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-white/10 p-3 text-[#f472b6]">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-[0.4em] text-white/60">PairUp</p>
                        <p className="text-xl font-semibold">Navigate</p>
                    </div> 
                </div>
            </div> */}

            <nav className="flex-1 overflow-y-auto px-4 py-6 space-y-2">
                {NAV_LINKS.map((link) => {
                    const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`flex items-center gap-3 rounded-2xl px-5 py-3 text-sm font-semibold transition-colors ${
                                isActive
                                    ? "bg-white text-rose-600 shadow-lg shadow-rose-200"
                                    : "text-white/80 hover:bg-white/10 hover:text-white"
                            }`}
                        >
                            <span className="h-2 w-2 rounded-full bg-current"></span>
                            {link.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="px-6 py-6 border-t border-white/10">
                {!isAuthenticated ? (
                    <div className="space-y-3">
                        <Link
                            href="/login"
                            className="block rounded-2xl border border-white/20 px-4 py-2 text-center text-sm font-semibold hover:bg-white hover:text-[#2D3142]"
                        >
                            Login
                        </Link>
                        <Link
                            href="/register"
                            className="block rounded-2xl bg-white px-4 py-2 text-center text-sm font-semibold text-[#2D3142]"
                        >
                            Sign up
                        </Link>
                    </div>
                ) : (
                    <div className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-white/80">
                        <p className="font-semibold text-white">Logged in</p>
                        <p className="text-xs text-white/60">Use this rail to manage your profile.</p>
                        <Link
                            href="/profile"
                            className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold text-white"
                        >
                            Open profile
                        </Link>
                    </div>
                )}
            </div>
        </aside>
    );
}