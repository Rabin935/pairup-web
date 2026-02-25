"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";

type PendingLike = {
  likeId: string;
  senderId: string;
  name: string;
  image: string;
  createdAt?: string;
};

type LikeAction = "accept" | "decline";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "http://localhost:5000";

const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return (
    window.localStorage.getItem("pairup_token") ||
    window.localStorage.getItem("authToken")
  );
};

const toErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message.trim().length) return error.message;
  return fallback;
};

const formatReceivedAt = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
};

// UI helper: deterministic gradient per senderId (no logic impact)
function avatarGradient(senderId: string) {
  let hash = 0;
  for (let i = 0; i < senderId.length; i++) hash = (hash * 31 + senderId.charCodeAt(i)) >>> 0;
  const h1 = hash % 360;
  const h2 = (h1 + 35) % 360;
  return `linear-gradient(135deg, hsl(${h1} 90% 65%), hsl(${h2} 90% 45%))`;
}

export default function PendingLikesPage() {
  const [likes, setLikes] = useState<PendingLike[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [actionState, setActionState] = useState<Record<string, LikeAction | null>>({});

  const fetchPendingLikes = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setLikes([]);
      setError("Missing auth token. Please log in again.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/likes/pending`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const payload = (await response.json().catch(() => ({}))) as {
        message?: string;
        likes?: PendingLike[];
      };

      if (!response.ok) {
        throw new Error(payload.message || "Failed to load pending likes.");
      }

      setLikes(Array.isArray(payload.likes) ? payload.likes : []);
    } catch (fetchError) {
      setError(toErrorMessage(fetchError, "Failed to load pending likes."));
      setLikes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPendingLikes();
  }, [fetchPendingLikes]);

  const handleLikeAction = useCallback(
    async (senderId: string, action: LikeAction) => {
      const token = getAuthToken();
      if (!token) {
        setError("Missing auth token. Please log in again.");
        return;
      }

      setActionState((prev) => ({ ...prev, [senderId]: action }));
      setError(null);
      setNotice(null);

      try {
        const response = await fetch(`${API_BASE_URL}/api/likes/${senderId}/${action}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const payload = (await response.json().catch(() => ({}))) as { message?: string };

        if (!response.ok) {
          throw new Error(payload.message || `Failed to ${action} like.`);
        }

        setLikes((prev) => prev.filter((like) => like.senderId !== senderId));
        setNotice(action === "accept" ? "Like accepted successfully." : "Like declined successfully.");
      } catch (actionError) {
        setError(toErrorMessage(actionError, `Failed to ${action} like.`));
      } finally {
        setActionState((prev) => ({ ...prev, [senderId]: null }));
      }
    },
    []
  );

  const countLabel = useMemo(() => {
    if (loading) return "Loading…";
    const n = likes.length;
    return `${n} pending ${n === 1 ? "like" : "likes"}`;
  }, [likes.length, loading]);

  return (
    <ProtectedRoute requiredRole="user">
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Outfit:wght@300;400;500;600&display=swap');
          * { font-family: 'Outfit', sans-serif; }
          .font-display { font-family: 'Playfair Display', serif; }

          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes cardEnter {
            from { opacity: 0; transform: translateY(20px) scale(0.97); }
            to   { opacity: 1; transform: translateY(0) scale(1); }
          }

          .fade-up    { animation: fadeUp 0.4s ease both; }
          .slide-down { animation: slideDown 0.3s ease both; }
          .card-enter { animation: cardEnter 0.4s ease both; }
        `}</style>

        <div className="min-h-screen bg-gradient-to-br from-white via-violet-50/30 to-white">
          {/* Sticky header (SearchPage-like) */}
          <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-violet-100 shadow-sm shadow-violet-50/60">
            <div className="max-w-4xl mx-auto px-5 pt-5 pb-4">
              <div className="flex items-center justify-between gap-3 fade-up">
                {/* Logo + title */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-md shadow-violet-300/40">
                    <svg viewBox="0 0 24 24" className="fill-white w-5 h-5">
                      <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
                    </svg>
                  </div>

                  <div>
                    <h1 className="font-display font-bold text-xl text-gray-900 leading-none">
                      Pending Likes
                    </h1>
                    <p className="text-sm text-gray-400 mt-1">{countLabel}</p>
                  </div>
                </div>

                {/* Refresh button */}
                <button
                  type="button"
                  onClick={() => void fetchPendingLikes()}
                  className={`relative flex-shrink-0 w-11 h-11 rounded-2xl border flex items-center justify-center transition-all duration-200
                    ${loading
                      ? "bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed"
                      : "bg-white border-violet-200 hover:border-violet-400 hover:bg-violet-50"
                    }`}
                  disabled={loading}
                  aria-label="Refresh"
                  title="Refresh"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={loading ? "#9ca3af" : "#8B5CF6"}
                    strokeWidth="2"
                    className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-2.64-6.36" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 3v6h-6" />
                  </svg>
                </button>
              </div>

              {/* Notices */}
              <div className="mt-4 space-y-2">
                {notice ? (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 slide-down">
                    {notice}
                  </div>
                ) : null}

                {error ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 slide-down">
                    {error}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="max-w-4xl mx-auto px-5 py-6">
            {loading ? (
              <div className="grid gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-[104px] rounded-2xl border border-violet-100 bg-white shadow-sm overflow-hidden"
                  >
                    <div className="h-full w-full animate-pulse bg-gradient-to-r from-violet-50 via-white to-violet-50" />
                  </div>
                ))}
              </div>
            ) : likes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 gap-4 text-center fade-up">
                <div className="w-20 h-20 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center text-4xl">
                  💜
                </div>
                <div>
                  <h3 className="font-display font-bold text-gray-900 text-xl mb-2">
                    No pending likes
                  </h3>
                  <p className="text-gray-500 text-sm max-w-sm leading-relaxed">
                    When someone likes you, they’ll show up here so you can accept or decline.
                  </p>
                </div>
                <button
                  onClick={() => void fetchPendingLikes()}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-violet-700 text-white text-sm font-semibold shadow-lg shadow-violet-200/60 hover:scale-105 transition-transform duration-200"
                >
                  Check again
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {likes.map((like, idx) => {
                  const busyAction = actionState[like.senderId];
                  const disableActions = Boolean(busyAction);
                  const letter = (like.name?.trim()?.charAt(0) || "U").toUpperCase();

                  return (
                    <div
                      key={like.likeId}
                      className="group bg-white rounded-2xl border border-violet-100 shadow-sm hover:shadow-xl hover:shadow-violet-100/60 hover:border-violet-200 hover:-translate-y-0.5 transition-all duration-300 overflow-hidden card-enter"
                      style={{ animationDelay: `${(idx % 8) * 0.05}s` }}
                    >
                      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        {/* Left: avatar + info */}
                        <div className="flex items-center gap-3">
                          {like.image ? (
                            <div className="relative">
                              <img
                                src={like.image}
                                alt={like.name}
                                className="h-14 w-14 rounded-2xl object-cover border border-violet-100 shadow-sm"
                              />
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white border border-violet-100 flex items-center justify-center shadow-sm">
                                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-violet-600">
                                  <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
                                </svg>
                              </div>
                            </div>
                          ) : (
                            <div
                              className="h-14 w-14 rounded-2xl flex items-center justify-center text-white font-display font-black shadow-sm border border-white/60"
                              style={{ backgroundImage: avatarGradient(like.senderId) }}
                            >
                              <span className="text-2xl">{letter}</span>
                            </div>
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-display font-bold text-gray-900 text-lg leading-none truncate">
                                {like.name}
                              </p>
                              <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 border border-violet-100 px-2 py-1 text-[10px] font-semibold text-violet-700">
                                <svg viewBox="0 0 24 24" className="w-3 h-3 fill-violet-600">
                                  <path d="M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z" />
                                </svg>
                                Liked you
                              </span>
                            </div>

                            {like.createdAt ? (
                              <p className="text-xs text-gray-400 mt-1 truncate">
                                Received:{" "}
                                <span className="text-violet-700 font-medium">
                                  {formatReceivedAt(like.createdAt)}
                                </span>
                              </p>
                            ) : (
                              <p className="text-xs text-gray-400 mt-1">Received recently</p>
                            )}
                          </div>
                        </div>

                        {/* Right: actions */}
                        <div className="flex gap-2 sm:justify-end">
                          <button
                            type="button"
                            onClick={() => void handleLikeAction(like.senderId, "decline")}
                            disabled={disableActions}
                            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition-all duration-200
                              ${
                                disableActions
                                  ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                              }`}
                          >
                            {busyAction === "decline" ? "Declining…" : "Decline"}
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleLikeAction(like.senderId, "accept")}
                            disabled={disableActions}
                            className={`rounded-xl px-4 py-2 text-sm font-semibold text-white transition-all duration-200
                              ${
                                disableActions
                                  ? "cursor-not-allowed bg-emerald-300"
                                  : "bg-gradient-to-r from-emerald-500 to-emerald-700 hover:scale-[1.02] shadow-md shadow-emerald-200/60"
                              }`}
                          >
                            {busyAction === "accept" ? "Accepting…" : "Accept"}
                          </button>
                        </div>
                      </div>

                      {/* Subtle bottom shimmer */}
                      <div className="h-1 w-full bg-gradient-to-r from-violet-200/0 via-violet-200/50 to-violet-200/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  );
                })}
              </div>
            )}

            <div className="h-10" />
          </div>
        </div>
      </>
    </ProtectedRoute>
  );
}