"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getAuthData } from "@/lib/auth-utils";
import { Heart, Home, Compass, Search, Plus, MessageCircle, User, ChevronLeft, ChevronRight, Settings, LogOut } from "lucide-react";

const NAV_LINKS = [
    { label: "Home", href: "/sidebar/home", icon: Home },
    { label: "Discover", href: "/sidebar/discover", icon: Compass },
    { label: "Search", href: "/sidebar/search", icon: Search },
    { label: "Create", href: "/sidebar/create", icon: Plus },
    { label: "Message", href: "/sidebar/message", icon: MessageCircle },
    { label: "Profile", href: "/profile", icon: User },
];

export default function Navbar() {
    const pathname = usePathname();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    useEffect(() => {
        setIsAuthenticated(Boolean(getAuthData()));

        const handleStorage = () => {
            setIsAuthenticated(Boolean(getAuthData()));
        };

        window.addEventListener("storage", handleStorage);
        return () => window.removeEventListener("storage", handleStorage);
    }, []);

    return (
        <>
            {/* Mobile Toggle Button */}
            <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-violet-500 text-white hover:bg-violet-600 transition-colors"
            >
                {isSidebarOpen ? <ChevronLeft size={24} /> : <ChevronRight size={24} />}
            </button>

            {/* Overlay for mobile */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm md:hidden z-30"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <aside
                className={`fixed md:sticky top-0 h-screen flex flex-col bg-gradient-to-b from-violet-600 via-violet-500 to-violet-700 text-white shadow-2xl transition-all duration-300 ease-out z-40 ${
                    isSidebarOpen ? "w-72 md:w-64" : "w-0 md:w-20"
                } overflow-hidden`}
            >
                {/* Logo Section */}
                <div className="px-6 py-8 border-b border-violet-400/30 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-white/20 backdrop-blur-md p-2.5 hover:bg-white/30 transition-all duration-200 transform hover:scale-110 flex-shrink-0">
                            <Heart className="w-5 h-5 text-white fill-white" />
                        </div>
                        {isSidebarOpen && (
                            <div className="flex flex-col">
                                <p className="text-xs uppercase tracking-[0.3em] text-violet-100 font-light">PairUp</p>
                                <p className="text-lg font-bold bg-gradient-to-r from-white to-violet-100 bg-clip-text text-transparent">
                                    Connect
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Navigation Menu */}
                <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-2">
                    {NAV_LINKS.map((link) => {
                        const Icon = link.icon;
                        const isActive =
                            pathname === link.href ||
                            pathname.startsWith(`${link.href}/`);

                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                title={isSidebarOpen ? "" : link.label}
                                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 group relative overflow-hidden ${
                                    isActive
                                        ? "bg-white text-violet-600 shadow-lg shadow-white/20 scale-105"
                                        : "text-white/80 hover:bg-white/10 hover:text-white hover:translate-x-1"
                                }`}
                            >
                                {/* Animated background for active state */}
                                {isActive && (
                                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 animate-pulse" />
                                )}

                                <Icon className={`w-5 h-5 transition-all duration-200 flex-shrink-0 relative z-10 ${
                                    isActive ? "scale-110" : "group-hover:scale-110"
                                }`} />

                                {isSidebarOpen && (
                                    <span className="relative z-10">{link.label}</span>
                                )}

                                {/* Hover indicator line */}
                                {!isActive && isSidebarOpen && (
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/20 rounded-l-full opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom Section */}
                <div className="px-3 py-4 border-t border-violet-400/30 flex flex-col gap-2 flex-shrink-0">
                    {isSidebarOpen && (
                        <button className="w-full flex items-center gap-3 rounded-xl px-4 py-3 text-white/80 hover:bg-white/10 hover:text-white transition-all duration-200 group text-sm font-semibold">
                            <Settings className="w-4 h-4 group-hover:scale-110 transition-transform" />
                            <span>Settings</span>
                        </button>
                    )}

                    {!isAuthenticated ? (
                        isSidebarOpen && (
                            <div className="space-y-2 pt-2">
                                <Link
                                    href="/login"
                                    className="block rounded-xl border border-white/30 px-4 py-2.5 text-center text-sm font-semibold hover:bg-white/20 hover:border-white/50 transition-all duration-200"
                                >
                                    Login
                                </Link>
                                <Link
                                    href="/register"
                                    className="block rounded-xl bg-white px-4 py-2.5 text-center text-sm font-semibold text-violet-600 hover:bg-white/90 transition-all duration-200 shadow-lg hover:shadow-xl"
                                >
                                    Sign up
                                </Link>
                            </div>
                        )
                    ) : isSidebarOpen ? (
                        <div className="rounded-xl bg-white/10 backdrop-blur-md px-4 py-3.5 text-sm text-white/90 border border-white/20 space-y-2.5">
                            <div>
                                <p className="font-semibold text-white flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-green-400" />
                                    Logged in
                                </p>
                                <p className="text-xs text-white/70 mt-1">Manage your profile</p>
                            </div>
                            <Link
                                href="/profile"
                                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-white/20 hover:bg-white/30 px-3 py-1.5 text-xs font-semibold text-white transition-all duration-200"
                            >
                                <User className="w-3 h-3" />
                                Open profile
                            </Link>
                        </div>
                    ) : (
                        <button
                            title="Logged in"
                            className="w-full flex items-center justify-center p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-200"
                        >
                            <div className="w-2 h-2 rounded-full bg-green-400" />
                        </button>
                    )}

                    {/* Collapse Toggle for Desktop */}
                    <button
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="hidden md:flex items-center justify-center w-full py-2.5 px-3 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-200 text-white text-xs font-medium gap-2 mt-2 border border-white/20"
                    >
                        {isSidebarOpen ? (
                            <>
                                <ChevronLeft size={16} />
                                <span>Collapse</span>
                            </>
                        ) : (
                            <ChevronRight size={16} />
                        )}
                    </button>
                </div>
            </aside>
        </>
    );
}