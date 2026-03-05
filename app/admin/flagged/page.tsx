"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminFetch } from "../_lib/admin-api";

type BasicUserInfo = {
  _id?: string;
  uid?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
};

type FlaggedMessage = {
  _id: string;
  text: string;
  flagged: boolean;
  createdAt: string;
  sender?: BasicUserInfo;
  receiver?: BasicUserInfo;
};

type Pagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type FlaggedMessagesResponse = {
  success: boolean;
  data: FlaggedMessage[];
  pagination: Pagination;
};

const PAGE_SIZE = 20;

const formatUser = (user?: BasicUserInfo): string => {
  if (!user) return "Unknown user";

  const fullName = `${user.firstname || ""} ${user.lastname || ""}`.trim();
  if (fullName) return fullName;
  if (user.email) return user.email;
  if (user.uid) return user.uid;
  return "Unknown user";
};

const formatDate = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

export default function AdminFlaggedContentPage() {
  const [messages, setMessages] = useState<FlaggedMessage[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMessages, setTotalMessages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeMessageId, setActiveMessageId] = useState("");
  const [activeBanUserId, setActiveBanUserId] = useState("");

  const fetchFlaggedMessages = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        flagged: "true",
        page: String(page),
        limit: String(PAGE_SIZE),
      });

      const response = await adminFetch<FlaggedMessagesResponse>(
        `/api/admin/messages?${params.toString()}`
      );

      const nextMessages = Array.isArray(response.data) ? response.data : [];
      const pagination = response.pagination || {
        total: nextMessages.length,
        page,
        limit: PAGE_SIZE,
        totalPages: 1,
      };

      setMessages(nextMessages);
      setTotalMessages(pagination.total);
      setTotalPages(Math.max(pagination.totalPages || 1, 1));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load flagged messages";
      setError(message);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchFlaggedMessages();
  }, [fetchFlaggedMessages]);

  const handleDismissFlag = async (messageId: string) => {
    const confirmed = window.confirm("Dismiss this flag?");
    if (!confirmed) return;

    try {
      setActiveMessageId(messageId);
      setError("");

      await adminFetch(`/api/admin/messages/${messageId}/dismiss-flag`, {
        method: "PATCH",
      });

      if (messages.length === 1 && page > 1) {
        setPage((current) => Math.max(current - 1, 1));
      } else {
        await fetchFlaggedMessages();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to dismiss flag";
      setError(message);
    } finally {
      setActiveMessageId("");
    }
  };

  const handleBanUser = async (userId: string | undefined) => {
    if (!userId) {
      setError("Unable to ban user: missing sender id");
      return;
    }

    const confirmed = window.confirm("Ban this user?");
    if (!confirmed) return;

    try {
      setActiveBanUserId(userId);
      setError("");
      await adminFetch(`/api/admin/users/${userId}/ban`, { method: "PATCH" });
      await fetchFlaggedMessages();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to ban user";
      setError(message);
    } finally {
      setActiveBanUserId("");
    }
  };

  const pageLabel = useMemo(
    () =>
      `Page ${page} of ${Math.max(totalPages, 1)} - ${totalMessages.toLocaleString()} flagged messages`,
    [page, totalPages, totalMessages]
  );

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Sender
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Receiver
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Message
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                    Loading flagged messages...
                  </td>
                </tr>
              ) : messages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                    No flagged messages found.
                  </td>
                </tr>
              ) : (
                messages.map((message) => {
                  const senderId = message.sender?._id;
                  const isDismissing = activeMessageId === message._id;
                  const isBanning = Boolean(senderId) && activeBanUserId === senderId;

                  return (
                    <tr key={message._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-800">
                        {formatUser(message.sender)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-800">
                        {formatUser(message.receiver)}
                      </td>
                      <td className="max-w-xl px-4 py-3 text-sm text-slate-700">
                        {message.text || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">
                        {formatDate(message.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={isDismissing || isBanning}
                            onClick={() => handleDismissFlag(message._id)}
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isDismissing ? "Dismissing..." : "Dismiss flag"}
                          </button>
                          <button
                            type="button"
                            disabled={isDismissing || isBanning || !senderId}
                            onClick={() => handleBanUser(senderId)}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isBanning ? "Banning..." : "Ban user"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3">
          <p className="text-sm text-slate-600">{pageLabel}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={loading || page <= 1}
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={loading || page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
