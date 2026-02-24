"use client";

import { useCallback, useEffect, useState } from "react";

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
  if (error instanceof Error && error.message.trim().length) {
    return error.message;
  }
  return fallback;
};

const formatReceivedAt = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString();
};

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

  const handleLikeAction = useCallback(async (senderId: string, action: LikeAction) => {
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
  }, []);

  return (
    <ProtectedRoute requiredRole="user">
      <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-slate-900">Pending Likes</h1>
              <p className="mt-1 text-sm text-slate-500">Review people who liked you and respond.</p>
            </div>
            <button
              type="button"
              onClick={() => void fetchPendingLikes()}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Refresh
            </button>
          </div>

          {notice ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {notice}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="grid gap-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white"
                />
              ))}
            </div>
          ) : likes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-slate-500">
              No pending likes right now.
            </div>
          ) : (
            <div className="grid gap-4">
              {likes.map((like) => {
                const busyAction = actionState[like.senderId];
                const disableActions = Boolean(busyAction);

                return (
                  <div
                    key={like.likeId}
                    className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {like.image ? (
                        <img
                          src={like.image}
                          alt={like.name}
                          className="h-14 w-14 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-200 text-lg font-semibold text-slate-700">
                          {like.name.charAt(0).toUpperCase() || "U"}
                        </div>
                      )}

                      <div>
                        <p className="text-sm font-semibold text-slate-900">{like.name}</p>
                        {like.createdAt ? (
                          <p className="text-xs text-slate-500">
                            Liked you on {formatReceivedAt(like.createdAt)}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex gap-2 sm:justify-end">
                      <button
                        type="button"
                        onClick={() => void handleLikeAction(like.senderId, "decline")}
                        disabled={disableActions}
                        className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
                          disableActions
                            ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        {busyAction === "decline" ? "Declining..." : "Decline"}
                      </button>

                      <button
                        type="button"
                        onClick={() => void handleLikeAction(like.senderId, "accept")}
                        disabled={disableActions}
                        className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition ${
                          disableActions
                            ? "cursor-not-allowed bg-emerald-300"
                            : "bg-emerald-600 hover:bg-emerald-700"
                        }`}
                      >
                        {busyAction === "accept" ? "Accepting..." : "Accept"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
