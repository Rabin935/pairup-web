"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import apiClient from "@/lib/api";
import ThemeToggle from "../_components/theme-toggle";
import { ChevronDown } from "lucide-react";

type SettingsPayload = {
  onlineVisibility: boolean;
  notificationPreferences: {
    likes: boolean;
    postLikes: boolean;
    matches: boolean;
    messages: boolean;
  };
  privacy: {
    showAge: boolean;
    showLocation: boolean;
    showOnlineStatus: boolean;
  };
  blockedUsers: string[];
};

type BlockedUser = {
  id: string;
  uid?: string;
  name: string;
  avatar?: string;
};

type ApiErrorShape = {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
};

type SectionKey =
  | "appearance"
  | "password"
  | "visibility"
  | "notifications"
  | "privacy"
  | "blockedUsers"
  | "deleteAccount";

type AccordionSectionProps = {
  title: string;
  description?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
  tone?: "default" | "danger";
};

const getErrorMessage = (error: unknown, fallback: string) => {
  const apiError = error as ApiErrorShape;
  return apiError.response?.data?.message || apiError.message || fallback;
};

function AccordionSection({
  title,
  description,
  isOpen,
  onToggle,
  children,
  tone = "default",
}: AccordionSectionProps) {
  const sectionStyle =
    tone === "danger"
      ? "border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/40"
      : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900";

  const titleStyle =
    tone === "danger" ? "text-rose-700 dark:text-rose-200" : "text-slate-900 dark:text-slate-100";

  const descriptionStyle =
    tone === "danger" ? "text-rose-600 dark:text-rose-300" : "text-slate-500 dark:text-slate-400";

  return (
    <section className={`rounded-2xl border p-5 transition-colors ${sectionStyle}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <div>
          <h2 className={`text-lg font-semibold ${titleStyle}`}>{title}</h2>
          {description ? <p className={`mt-1 text-sm ${descriptionStyle}`}>{description}</p> : null}
        </div>
        <ChevronDown
          className={`h-5 w-5 text-slate-400 transition-transform duration-300 dark:text-slate-500 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out ${
          isOpen ? "mt-4 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </section>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsPayload | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blockUserId, setBlockUserId] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
  });
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    appearance: true,
    password: true,
    visibility: true,
    notifications: false,
    privacy: false,
    blockedUsers: false,
    deleteAccount: false,
  });

  const toggleSection = (section: SectionKey) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [settingsRes, blockedRes] = await Promise.all([
        apiClient.get("/api/users/me/settings"),
        apiClient.get("/api/users/blocks"),
      ]);
      setSettings((settingsRes.data?.data ?? settingsRes.data) as SettingsPayload);
      setBlockedUsers(Array.isArray(blockedRes.data?.data) ? blockedRes.data.data : []);
    } catch (err) {
      setError(getErrorMessage(err, "Unable to load settings."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const updateToggle = async (
    endpoint: string,
    field: string,
    value: boolean,
    section: "onlineVisibility" | "notificationPreferences" | "privacy"
  ) => {
    if (!settings) return;
    setSaving(true);
    setStatus(null);
    setError(null);
    try {
      await apiClient.patch(endpoint, { [field]: value });
      setSettings((current) => {
        if (!current) return current;
        if (section === "onlineVisibility") {
          return { ...current, onlineVisibility: value };
        }
        return {
          ...current,
          [section]: {
            ...current[section],
            [field]: value,
          },
        };
      });
      setStatus("Settings updated.");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to update settings."));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword) {
      setError("Both current and new password are required.");
      return;
    }
    setSaving(true);
    setStatus(null);
    setError(null);
    try {
      await apiClient.patch("/api/users/settings/password", passwordForm);
      setPasswordForm({ currentPassword: "", newPassword: "" });
      setStatus("Password changed successfully.");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to change password."));
    } finally {
      setSaving(false);
    }
  };

  const handleBlock = async () => {
    if (!blockUserId.trim()) return;
    setSaving(true);
    setStatus(null);
    setError(null);
    try {
      await apiClient.post(`/api/users/block/${encodeURIComponent(blockUserId.trim())}`);
      setBlockUserId("");
      await loadSettings();
      setStatus("User blocked.");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to block user."));
    } finally {
      setSaving(false);
    }
  };

  const handleUnblock = async (userId: string) => {
    setSaving(true);
    setStatus(null);
    setError(null);
    try {
      await apiClient.delete(`/api/users/block/${encodeURIComponent(userId)}`);
      await loadSettings();
      setStatus("User unblocked.");
    } catch (err) {
      setError(getErrorMessage(err, "Unable to unblock user."));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm("Delete your account permanently?");
    if (!confirmed) return;
    setSaving(true);
    setStatus(null);
    setError(null);
    try {
      await apiClient.delete("/api/users/me");
      localStorage.removeItem("pairup_token");
      localStorage.removeItem("pairup_user");
      window.location.href = "/register";
    } catch (err) {
      setError(getErrorMessage(err, "Unable to delete account."));
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="user">
      <div className="min-h-screen bg-white dark:bg-slate-950">
        <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Settings</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage security, privacy, and account controls.
            </p>
          </div>

          <AccordionSection
            title="Appearance"
            description="Control your visual theme preference."
            isOpen={openSections.appearance}
            onToggle={() => toggleSection("appearance")}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600 dark:text-slate-300">Theme</p>
              <ThemeToggle />
            </div>
          </AccordionSection>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
              {error}
            </div>
          )}
          {status && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
              {status}
            </div>
          )}

          {loading || !settings ? (
            <div className="space-y-4">
              <div className="h-40 rounded-2xl bg-slate-100 animate-pulse dark:bg-slate-900/60" />
              <div className="h-40 rounded-2xl bg-slate-100 animate-pulse dark:bg-slate-900/60" />
            </div>
          ) : (
            <>
              <AccordionSection
                title="Change Password"
                description="Update your account password."
                isOpen={openSections.password}
                onToggle={() => toggleSection("password")}
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    type="password"
                    placeholder="Current password"
                    value={passwordForm.currentPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({ ...prev, currentPassword: event.target.value }))
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                  <input
                    type="password"
                    placeholder="New password"
                    value={passwordForm.newPassword}
                    onChange={(event) =>
                      setPasswordForm((prev) => ({ ...prev, newPassword: event.target.value }))
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </div>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handlePasswordChange()}
                  className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  Update Password
                </button>
              </AccordionSection>

              <AccordionSection
                title="Visibility"
                description="Control whether other users see your live status."
                isOpen={openSections.visibility}
                onToggle={() => toggleSection("visibility")}
              >
                <label className="flex items-center justify-between">
                  <span className="text-sm text-slate-700 dark:text-slate-300">Show as online</span>
                  <input
                    type="checkbox"
                    checked={settings.onlineVisibility}
                    onChange={(event) =>
                      void updateToggle(
                        "/api/users/settings/visibility",
                        "onlineVisibility",
                        event.target.checked,
                        "onlineVisibility"
                      )
                    }
                    className="h-4 w-4 accent-primary"
                  />
                </label>
              </AccordionSection>

              <AccordionSection
                title="Notifications"
                description="Choose the alerts you want from PairUp."
                isOpen={openSections.notifications}
                onToggle={() => toggleSection("notifications")}
              >
                <div className="space-y-3">
                  {([
                    ["likes", "Profile likes"],
                    ["postLikes", "Post likes"],
                    ["matches", "Matches"],
                    ["messages", "Messages"],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="flex items-center justify-between">
                      <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
                      <input
                        type="checkbox"
                        checked={settings.notificationPreferences[key]}
                        onChange={(event) =>
                          void updateToggle(
                            "/api/users/settings/notifications",
                            key,
                            event.target.checked,
                            "notificationPreferences"
                          )
                        }
                        className="h-4 w-4 accent-primary"
                      />
                    </label>
                  ))}
                </div>
              </AccordionSection>

              <AccordionSection
                title="Privacy"
                description="Manage how much profile data is visible to others."
                isOpen={openSections.privacy}
                onToggle={() => toggleSection("privacy")}
              >
                <div className="space-y-3">
                  {([
                    ["showAge", "Show age"],
                    ["showLocation", "Show location"],
                    ["showOnlineStatus", "Show online status"],
                  ] as const).map(([key, label]) => (
                    <label key={key} className="flex items-center justify-between">
                      <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
                      <input
                        type="checkbox"
                        checked={settings.privacy[key]}
                        onChange={(event) =>
                          void updateToggle(
                            "/api/users/settings/privacy",
                            key,
                            event.target.checked,
                            "privacy"
                          )
                        }
                        className="h-4 w-4 accent-primary"
                      />
                    </label>
                  ))}
                </div>
              </AccordionSection>

              <AccordionSection
                title="Block Users"
                description="Block or unblock users by account id."
                isOpen={openSections.blockedUsers}
                onToggle={() => toggleSection("blockedUsers")}
              >
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={blockUserId}
                    onChange={(event) => setBlockUserId(event.target.value)}
                    placeholder="Enter user id"
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/40 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleBlock()}
                    className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                  >
                    Block
                  </button>
                </div>

                <div className="mt-4 space-y-2">
                  {blockedUsers.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No blocked users.</p>
                  ) : (
                    blockedUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800">
                        <span className="text-sm text-slate-700 dark:text-slate-300">{user.name}</span>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void handleUnblock(user.id)}
                          className="text-sm font-semibold text-primary hover:text-primary/80 disabled:opacity-60"
                        >
                          Unblock
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </AccordionSection>

              <AccordionSection
                title="Delete Account"
                description="This action is permanent and removes your profile, chats, likes, and matches."
                isOpen={openSections.deleteAccount}
                onToggle={() => toggleSection("deleteAccount")}
                tone="danger"
              >
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleDeleteAccount()}
                  className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60 dark:bg-rose-500 dark:hover:bg-rose-400"
                >
                  Delete Account
                </button>
              </AccordionSection>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
