"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { adminFetch } from "../_lib/admin-api";

type ReportParty = {
  _id?: string;
  uid?: string;
  firstname?: string;
  lastname?: string;
  email?: string;
};

type ReportItem = {
  _id: string;
  reporter?: ReportParty;
  reportedUser?: ReportParty;
  reason: string;
  status: "pending" | "reviewed" | "resolved";
  createdAt: string;
};

type Pagination = {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type ReportsResponse = {
  success: boolean;
  data: ReportItem[];
  pagination: Pagination;
};

const PAGE_SIZE = 10;

const formatParty = (party?: ReportParty): string => {
  if (!party) return "Unknown user";
  const fullName = `${party.firstname || ""} ${party.lastname || ""}`.trim();
  return fullName || party.email || party.uid || "Unknown user";
};

const formatDate = (value?: string): string => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString();
};

export default function AdminReportsPage() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReports, setTotalReports] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionReportId, setActionReportId] = useState("");

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });

      const response = await adminFetch<ReportsResponse>(`/api/admin/reports?${params.toString()}`);
      const nextReports = Array.isArray(response.data) ? response.data : [];
      const nextPagination = response.pagination || {
        total: nextReports.length,
        page,
        limit: PAGE_SIZE,
        totalPages: 1,
      };

      setReports(nextReports);
      setTotalReports(nextPagination.total);
      setTotalPages(Math.max(nextPagination.totalPages || 1, 1));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load reports";
      setError(message);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const updateReport = async (reportId: string, action: "review" | "resolve") => {
    try {
      setActionReportId(reportId);
      setError("");

      await adminFetch(`/api/admin/reports/${reportId}/${action}`, {
        method: "PATCH",
      });

      await fetchReports();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update report";
      setError(message);
    } finally {
      setActionReportId("");
    }
  };

  const pageLabel = useMemo(
    () => `Page ${page} of ${Math.max(totalPages, 1)} - ${totalReports.toLocaleString()} reports`,
    [page, totalPages, totalReports]
  );

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Reporter
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Reported User
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Reason
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Created
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
                    Loading reports...
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    No reports found.
                  </td>
                </tr>
              ) : (
                reports.map((report) => {
                  const isBusy = actionReportId === report._id;
                  return (
                    <tr key={report._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-sm text-slate-800">{formatParty(report.reporter)}</td>
                      <td className="px-4 py-3 text-sm text-slate-800">{formatParty(report.reportedUser)}</td>
                      <td className="max-w-sm px-4 py-3 text-sm text-slate-700">{report.reason || "-"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            report.status === "resolved"
                              ? "bg-emerald-100 text-emerald-700"
                              : report.status === "reviewed"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          {report.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{formatDate(report.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={isBusy || report.status !== "pending"}
                            onClick={() => updateReport(report._id, "review")}
                            className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Review
                          </button>
                          <button
                            type="button"
                            disabled={isBusy || report.status === "resolved"}
                            onClick={() => updateReport(report._id, "resolve")}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Resolve
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

