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

type AdminMessage = {
  _id: string;
  text: string;
  read: boolean;
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

type AdminMessagesResponse = {
  success: boolean;
  data: AdminMessage[];
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

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMessages, setTotalMessages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [messageIdBeingDeleted, setMessageIdBeingDeleted] = useState("");
  const [userIdInput, setUserIdInput] = useState("");
  const [userIdFilter, setUserIdFilter] = useState("");

  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });

      if (userIdFilter) {
        params.append("userId", userIdFilter);
      }

      const response = await adminFetch<AdminMessagesResponse>(
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
      const message = err instanceof Error ? err.message : "Failed to load messages";
      setError(message);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [page, userIdFilter]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const handleFilterSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setUserIdFilter(userIdInput.trim());
  };

  const handleClearFilter = () => {
    setUserIdInput("");
    setUserIdFilter("");
    setPage(1);
  };

  const handleDeleteMessage = async (messageId: string) => {
    const confirmed = window.confirm("Delete this message permanently?");
    if (!confirmed) return;

    try {
      setMessageIdBeingDeleted(messageId);
      setError("");

      await adminFetch<{ success: boolean; message: string }>(`/api/admin/messages/${messageId}`, {
        method: "DELETE",
      });

      if (messages.length === 1 && page > 1) {
        setPage((current) => Math.max(current - 1, 1));
      } else {
        await fetchMessages();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete message";
      setError(message);
    } finally {
      setMessageIdBeingDeleted("");
    }
  };

  const pageLabel = useMemo(
    () => `Page ${page} of ${Math.max(totalPages, 1)} - ${totalMessages.toLocaleString()} messages`,
    [page, totalPages, totalMessages]
  );

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form className="flex flex-wrap items-end gap-3" onSubmit={handleFilterSubmit}>
          <div className="min-w-[260px] flex-1">
            <label htmlFor="userIdFilter" className="mb-1 block text-xs font-semibold uppercase text-slate-500">
              Filter by User ID
            </label>
            <input
              id="userIdFilter"
              type="text"
              value={userIdInput}
              onChange={(event) => setUserIdInput(event.target.value)}
              placeholder="Mongo ObjectId for sender/receiver"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-rose-200 transition focus:border-rose-400 focus:ring-2"
            />
          </div>

          <button
            type="submit"
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={handleClearFilter}
            className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
          >
            Clear
          </button>
        </form>
      </section>

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
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                    Loading messages...
                  </td>
                </tr>
              ) : messages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
                    No messages found.
                  </td>
                </tr>
              ) : (
                messages.map((message) => {
                  const isDeleting = messageIdBeingDeleted === message._id;
                  return (
                    <tr key={message._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-800">{formatUser(message.sender)}</td>
                      <td className="px-4 py-3 text-sm text-slate-800">{formatUser(message.receiver)}</td>
                      <td className="max-w-xl px-4 py-3 text-sm text-slate-700">{message.text || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{formatDate(message.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          disabled={isDeleting}
                          onClick={() => handleDeleteMessage(message._id)}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isDeleting ? "Deleting..." : "Delete"}
                        </button>
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
