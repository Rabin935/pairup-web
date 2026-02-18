"use client";

import ProtectedRoute from "@/components/ProtectedRoute";

export default function DiscoverPage() {
    const suggestions = [
        { title: "Coffee & Conversations", description: "Match with people who love deep talks over latte art." },
        { title: "Sunset Hikes", description: "Find hiking buddies who chase golden hours." },
        { title: "Indie Film Fans", description: "Explore screenings together with cinema enthusiasts." },
    ];

    return (
        <ProtectedRoute requiredRole="user">
            <div className="min-h-screen bg-slate-50 px-6 py-10">
                <div className="mx-auto max-w-4xl">
                    <div className="mb-8">
                        <p className="text-xs uppercase tracking-[0.4em] text-rose-400">Discover</p>
                        <h1 className="mt-2 text-4xl font-semibold text-slate-900">Curated vibes for you</h1>
                        <p className="mt-3 text-slate-500">We handpicked experiences based on your interests. Tap into what feels right.</p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3">
                        {suggestions.map((suggestion) => (
                            <article key={suggestion.title} className="rounded-3xl bg-white p-6 shadow-lg shadow-rose-100/60">
                                <h2 className="text-xl font-semibold text-slate-900">{suggestion.title}</h2>
                                <p className="mt-3 text-sm text-slate-500">{suggestion.description}</p>
                                <button className="mt-6 inline-flex items-center text-sm font-semibold text-rose-500">
                                    Explore matches →
                                </button>
                            </article>
                        ))}
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
