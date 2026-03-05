"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminFetch } from "../_lib/admin-api";

type AdminUser = {
  _id?: string;
  id?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
  role?: string;
  gender?: string;
  location?: string;
  isBanned?: boolean;
  banReason?: string;
  reportCount?: number;
};

type Pagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type UsersResponse = {
  success: boolean;
  data: AdminUser[];
  pagination: Pagination;
};

const PAGE_SIZE = 10;
const AUTO_BAN_REASON = "Auto-banned due to excessive reports";

const getUserId = (user: AdminUser): string => user._id || user.id || "";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [locations, setLocations] = useState<string[]>([]);
  const [actionUserId, setActionUserId] = useState<string>("");

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });

      if (searchQuery) params.append("search", searchQuery);
      if (genderFilter) params.append("gender", genderFilter);
      if (locationFilter) params.append("location", locationFilter);

      const response = await adminFetch<UsersResponse>(`/api/admin/users?${params.toString()}`);
      const nextUsers = Array.isArray(response.data) ? response.data : [];
      const nextPagination = response.pagination || {
        total: nextUsers.length,
        page,
        limit: PAGE_SIZE,
        totalPages: 1,
      };

      setUsers(nextUsers);
      setTotalUsers(nextPagination.total);
      setTotalPages(Math.max(nextPagination.totalPages || 1, 1));
      setLocations((prev) => {
        const merged = new Set(prev);
        nextUsers.forEach((user) => {
          if (user.location && user.location.trim()) {
            merged.add(user.location.trim());
          }
        });
        if (locationFilter) merged.add(locationFilter);
        return Array.from(merged).sort((a, b) => a.localeCompare(b));
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load users";
      setError(message);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [genderFilter, locationFilter, page, searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPage(1);
    setSearchQuery(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
    setPage(1);
  };

  const handleGenderChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setGenderFilter(event.target.value);
    setPage(1);
  };

  const handleLocationChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setLocationFilter(event.target.value);
    setPage(1);
  };

  const handleBanToggle = async (user: AdminUser) => {
    const userId = getUserId(user);
    if (!userId) return;

    try {
      setActionUserId(userId);
      setError("");

      const endpoint = user.isBanned ? "unban" : "ban";
      await adminFetch(`/api/admin/users/${userId}/${endpoint}`, {
        method: "PATCH",
      });

      await fetchUsers();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update user status";
      setError(message);
    } finally {
      setActionUserId("");
    }
  };

  const handleDelete = async (user: AdminUser) => {
    const userId = getUserId(user);
    if (!userId) return;

    const shouldDelete = window.confirm(
      "Delete this user and related likes, matches, and messages? This action cannot be undone."
    );
    if (!shouldDelete) return;

    try {
      setActionUserId(userId);
      setError("");
      await adminFetch(`/api/admin/users/${userId}`, { method: "DELETE" });

      if (users.length === 1 && page > 1) {
        setPage((current) => Math.max(current - 1, 1));
      } else {
        await fetchUsers();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete user";
      setError(message);
    } finally {
      setActionUserId("");
    }
  };

  const pageLabel = useMemo(
    () => `Page ${page} of ${Math.max(totalPages, 1)} - ${totalUsers.toLocaleString()} users`,
    [page, totalPages, totalUsers]
  );

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form className="grid gap-3 md:grid-cols-12" onSubmit={handleSearchSubmit}>
          <div className="md:col-span-6">
            <label htmlFor="user-search" className="mb-1 block text-xs font-semibold uppercase text-slate-500">
              Search
            </label>
            <input
              id="user-search"
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by first name, last name, or email"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-rose-200 transition focus:border-rose-400 focus:ring-2"
            />
          </div>

          <div className="md:col-span-3">
            <label htmlFor="gender-filter" className="mb-1 block text-xs font-semibold uppercase text-slate-500">
              Gender
            </label>
            <select
              id="gender-filter"
              value={genderFilter}
              onChange={handleGenderChange}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-rose-200 transition focus:border-rose-400 focus:ring-2"
            >
              <option value="">All genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <label htmlFor="location-filter" className="mb-1 block text-xs font-semibold uppercase text-slate-500">
              Location
            </label>
            <select
              id="location-filter"
              value={locationFilter}
              onChange={handleLocationChange}
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none ring-rose-200 transition focus:border-rose-400 focus:ring-2"
            >
              <option value="">All locations</option>
              {locations.map((location) => (
                <option key={location} value={location}>
                  {location}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-12 flex flex-wrap gap-2">
            <button
              type="submit"
              className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
            >
              Search
            </button>
            <button
              type="button"
              onClick={handleClearSearch}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Clear
            </button>
          </div>
        </form>
      </section>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  User
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Gender
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Location
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Reports
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    Loading users...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    No users found.
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const userId = getUserId(user);
                  const fullName = `${user.firstname || ""} ${user.lastname || ""}`.trim() || "Unnamed user";
                  const isBusy = actionUserId === userId;
                  const reportCount = Number(user.reportCount || 0);
                  const hasHighReports = reportCount >= 3;
                  const isAutoBanned = user.isBanned && user.banReason === AUTO_BAN_REASON;
                  const rowClass = user.isBanned
                    ? "bg-red-50 hover:bg-red-100"
                    : hasHighReports
                    ? "bg-amber-50 hover:bg-amber-100"
                    : "hover:bg-slate-50";

                  return (
                    <tr key={userId || fullName} className={rowClass}>
                      <td className="px-4 py-3">
                        <p
                          className={`text-sm font-semibold ${
                            user.isBanned ? "text-red-800" : "text-slate-900"
                          }`}
                        >
                          {fullName}
                        </p>
                        <p className="text-sm text-slate-600">{user.email || "-"}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{user.gender || "-"}</td>
                      <td className="px-4 py-3 text-sm text-slate-700">{user.location || "-"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            hasHighReports
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {reportCount}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            user.isBanned ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          {user.isBanned ? "Banned" : "Active"}
                        </span>
                        {isAutoBanned && (
                          <span className="ml-2 inline-flex rounded-full bg-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-800">
                            Auto-banned
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleBanToggle(user)}
                            className={`rounded-lg px-3 py-1.5 text-xs font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              user.isBanned ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"
                            }`}
                          >
                            {user.isBanned ? "Unban" : "Ban"}
                          </button>
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleDelete(user)}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Delete
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

