"use client";

import ProtectedRoute from "@/components/ProtectedRoute";

const mockChats = [
    { name: "Maya", preview: "Had the best ramen spot to share!" },
    { name: "Liam", preview: "Let’s lock in that hiking date." },
    { name: "Zara", preview: "Playlist swap later tonight?" },
];

export default function ChatsPage() {
    return (
        <ProtectedRoute requiredRole="user">
            <div className="min-h-screen bg-slate-50 px-6 py-10">
                <div className="mx-auto max-w-4xl">
                    <div className="mb-8">
                        <p className="text-xs uppercase tracking-[0.4em] text-rose-400">Chats</p>
                        <h1 className="mt-2 text-4xl font-semibold text-slate-900">Pick up the conversation</h1>
                        <p className="mt-3 text-slate-500">Stay in flow with people you vibe with. Messages are end-to-end private.</p>
                    </div>

                    <div className="rounded-3xl bg-white p-4 shadow-xl shadow-rose-100/60">
                        {mockChats.map((chat) => (
                            <button
                                key={chat.name}
                                className="flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left hover:bg-slate-50"
                            >
                                <div>
                                    <p className="text-base font-semibold text-slate-900">{chat.name}</p>
                                    <p className="text-sm text-slate-500">{chat.preview}</p>
                                </div>
                                <span className="text-xs text-rose-500">Open</span>
                            </button>
                        ))}
                        <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                            Real-time chat UI coming soon.
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
