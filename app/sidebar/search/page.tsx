"use client";

import { useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function SearchPage() {
    const [query, setQuery] = useState("");

    return (
        <ProtectedRoute requiredRole="user">
            <div className="min-h-screen bg-slate-50 px-6 py-10">
                <div className="mx-auto max-w-4xl">
                    <div className="mb-8">
                        <p className="text-xs uppercase tracking-[0.4em] text-rose-400">Search</p>
                        <h1 className="mt-2 text-4xl font-semibold text-slate-900">Find someone specific</h1>
                        <p className="mt-3 text-slate-500">Filter by interests, age, or location. The more detail you provide, the closer the match.</p>
                    </div>

                    <div className="rounded-3xl bg-white p-8 shadow-xl shadow-rose-100/60">
                        <label className="block text-sm font-semibold text-slate-700">Search by keyword</label>
                        <input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder="Music festivals, vegan foodies, startup founders..."
                            className="mt-3 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
                        />
                        <div className="mt-6 grid gap-4 md:grid-cols-3">
                            {["Interests", "Age range", "Location"].map((filter) => (
                                <div key={filter} className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-sm text-slate-500">
                                    {filter} filter coming soon
                                </div>
                            ))}
                        </div>
                        <button className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-500 px-6 py-3 text-white font-semibold shadow-lg shadow-rose-200">
                            Search now
                        </button>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
