"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

type SidebarProps = {
    isOpen: boolean;
    onClose: () => void;
};

const MENU_ITEMS: Array<{ label: string; href: string }> = [
    { label: "Profile", href: "/profile" },
    { label: "Discover", href: "/discover" },
    { label: "Matches", href: "/matches" },
    { label: "Messages", href: "/messages" },
    { label: "Settings", href: "/settings" },
];

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();
    const { logout } = useAuth();

    useEffect(() => {
        if (!isOpen) return;

        const handleKeydown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeydown);
        return () => window.removeEventListener("keydown", handleKeydown);
    }, [isOpen, onClose]);

    const handleLogout = () => {
        logout();
        onClose();
    };

    return (
        <div className={`fixed inset-0 z-50 transition ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}>
            <div
                className={`absolute inset-0 bg-slate-950/60 transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0"}`}
                aria-hidden="true"
                onClick={onClose}
            />

            <aside
                className={`absolute left-0 top-0 flex h-full w-72 flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
                    isOpen ? "translate-x-0" : "-translate-x-full"
                }`}
                role="dialog"
                aria-modal="true"
                aria-label="Navigation Menu"
            >
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                    <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">PairUp</p>
                        <p className="text-lg font-semibold text-slate-900">Menu</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close sidebar"
                        className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                    >
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            className="block"
                        >
                            <path d="M3.5 3.5L12.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                            <path d="M12.5 3.5L3.5 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                    </button>
                </div>

                <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
                    {MENU_ITEMS.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={onClose}
                                className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                                    isActive
                                        ? "bg-slate-900 text-white shadow-lg shadow-slate-400/30"
                                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                }`}
                            >
                                <span>{item.label}</span>
                                {isActive && <span className="text-xs uppercase tracking-wide text-white/70">Active</span>}
                            </Link>
                        );
                    })}
                </nav>

                <div className="border-t border-slate-100 px-6 py-5">
                    <button
                        type="button"
                        onClick={handleLogout}
                        className="flex w-full items-center justify-between rounded-full bg-rose-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-rose-200 transition hover:bg-rose-600"
                    >
                        <span>Logout</span>
                        <span className="text-xs uppercase tracking-wide text-white/70">Exit</span>
                    </button>
                </div>
            </aside>
        </div>
    );
}
