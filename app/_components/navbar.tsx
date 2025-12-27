"use client";

import Link from "next/link";

export default function Navbar() {
    return (
        <header className="sticky top-0 z-50 w-full bg-[#2D3142] text-white px-6 py-4 flex items-center justify-between shadow-md">
            <div>
                <div className="flex items-center gap-2 cursor-pointer">
                    <div className="text-[#8B5CF6]">
                        {/* Simple SVG icon representing the heart/people logo */}
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                        </svg>
                    </div>
                    <span className="text-2xl font-bold tracking-tight">PairUp</span>
                </div>
            </div>
            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-10">
                <Link href="/" className="text-sm font-medium hover:text-gray-600 transition-colors ">
                    Home
                </Link>

                <Link href="/" className="text-sm font-medium hover:text-gray-600 transition-colors">
                    Find a partner
                </Link>

                <Link href="/" className="text-sm font-medium hover:text-gray-600 transition-colorsk">
                    PairUp guides
                </Link>

                <Link href="/" className="text-sm font-medium hover:text-gray-600 transition-colors">
                    FAQ
                </Link>
            </nav>

            {/* buttons */}
            <div className="flex items-center gap-6">
                <Link href="/login" className="px-5 py-1.5 border border-white rounded-md text-sm font-bold hover:bg-white hover:text-[#2D3142] hover:scale-110 transition-all duration-200">
                Login
                </Link>
                <Link href="" className="px-5 py-1.5 border border-white rounded-md text-sm font-bold hover:bg-white hover:text-[#2D3142] hover:scale-110 transition-all duration-200">
                Sign up
                </Link>
            </div>


        </header>
    );
}