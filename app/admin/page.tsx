"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { adminFetch } from "./_lib/admin-api";

type DailyMetric = {
  date: string;
  count: number;
};

type GrowthAnalyticsResponse = {
  dailyUsers: DailyMetric[];
  dailyMatches: DailyMetric[];
  dailyMessages: DailyMetric[];
};

const EMPTY_ANALYTICS: GrowthAnalyticsResponse = {
  dailyUsers: [],
  dailyMatches: [],
  dailyMessages: [],
};

const formatDateTick = (value: string): string => {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return `${parsed.getUTCMonth() + 1}/${parsed.getUTCDate()}`;
};

const sumCounts = (items: DailyMetric[]) => items.reduce((sum, item) => sum + item.count, 0);

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState<GrowthAnalyticsResponse>(EMPTY_ANALYTICS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadAnalytics = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await adminFetch<GrowthAnalyticsResponse>("/api/admin/analytics");
        if (!isMounted) return;

        setAnalytics({
          dailyUsers: Array.isArray(response.dailyUsers) ? response.dailyUsers : [],
          dailyMatches: Array.isArray(response.dailyMatches) ? response.dailyMatches : [],
          dailyMessages: Array.isArray(response.dailyMessages) ? response.dailyMessages : [],
        });
      } catch (err) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : "Failed to load analytics";
        setError(message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadAnalytics();

    return () => {
      isMounted = false;
    };
  }, []);

  const totals = useMemo(
    () => [
      { label: "Users (30 days)", value: sumCounts(analytics.dailyUsers) },
      { label: "Matches (30 days)", value: sumCounts(analytics.dailyMatches) },
      { label: "Messages (30 days)", value: sumCounts(analytics.dailyMessages) },
    ],
    [analytics]
  );

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        {totals.map((item) => (
          <article key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{item.label}</p>
            {loading ? (
              <div className="mt-3 h-9 w-20 animate-pulse rounded-lg bg-slate-200" />
            ) : (
              <p className="mt-3 text-3xl font-bold text-slate-900">{item.value.toLocaleString()}</p>
            )}
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
          <h3 className="text-lg font-semibold text-slate-900">Daily Users</h3>
          {loading ? (
            <div className="mt-4 h-[280px] animate-pulse rounded-xl bg-slate-200" />
          ) : (
            <div className="mt-4 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.dailyUsers}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tickFormatter={formatDateTick} stroke="#64748b" />
                  <YAxis allowDecimals={false} stroke="#64748b" />
                  <Tooltip
                    labelFormatter={(label) => String(label)}
                    formatter={(value) => [String(value ?? 0), "Users"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
          <h3 className="text-lg font-semibold text-slate-900">Daily Matches</h3>
          {loading ? (
            <div className="mt-4 h-[280px] animate-pulse rounded-xl bg-slate-200" />
          ) : (
            <div className="mt-4 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.dailyMatches}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tickFormatter={formatDateTick} stroke="#64748b" />
                  <YAxis allowDecimals={false} stroke="#64748b" />
                  <Tooltip
                    labelFormatter={(label) => String(label)}
                    formatter={(value) => [String(value ?? 0), "Matches"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#db2777"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
          <h3 className="text-lg font-semibold text-slate-900">Daily Messages</h3>
          {loading ? (
            <div className="mt-4 h-[280px] animate-pulse rounded-xl bg-slate-200" />
          ) : (
            <div className="mt-4 h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.dailyMessages}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tickFormatter={formatDateTick} stroke="#64748b" />
                  <YAxis allowDecimals={false} stroke="#64748b" />
                  <Tooltip
                    labelFormatter={(label) => String(label)}
                    formatter={(value) => [String(value ?? 0), "Messages"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
