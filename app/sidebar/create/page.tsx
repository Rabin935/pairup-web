"use client";

import ProtectedRoute from "@/components/ProtectedRoute";

export default function CreatePage() {
    return (
        <ProtectedRoute requiredRole="user">
            <div className="min-h-screen bg-slate-50 px-6 py-10">
                <div className="mx-auto max-w-3xl">
                    <div className="mb-8">
                        <p className="text-xs uppercase tracking-[0.4em] text-rose-400">Create</p>
                        <h1 className="mt-2 text-4xl font-semibold text-slate-900">Launch a mini experience</h1>
                        <p className="mt-3 text-slate-500">Host an event, start a prompt, or set up a curated date idea. Share it with the community.</p>
                    </div>

                    <form className="space-y-6 rounded-3xl bg-white p-8 shadow-xl shadow-rose-100/60">
                        <div>
                            <label className="text-sm font-semibold text-slate-700">Title</label>
                            <input
                                placeholder="E.g. Sunrise yoga meetup"
                                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-semibold text-slate-700">Description</label>
                            <textarea
                                rows={4}
                                placeholder="Tell people what to expect and who it's perfect for."
                                className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
                            />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div>
                                <label className="text-sm font-semibold text-slate-700">Location</label>
                                <input
                                    placeholder="City or virtual"
                                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-slate-700">Date</label>
                                <input
                                    type="date"
                                    className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-900 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
                                />
                            </div>
                        </div>
                        <button className="w-full rounded-full bg-gradient-to-r from-rose-500 to-fuchsia-500 px-6 py-3 text-white font-semibold shadow-lg shadow-rose-200">
                            Publish idea
                        </button>
                    </form>
                </div>
            </div>
        </ProtectedRoute>
    );
}
