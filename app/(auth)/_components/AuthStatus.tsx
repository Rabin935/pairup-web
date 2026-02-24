"use client";

import { useAuth } from "@/context/AuthContext";

export function AuthStatus() {
  const { user, isAuthenticated, login, logout } = useAuth();

  if (!isAuthenticated) {
    return (
      <button
        className="rounded bg-slate-900 px-4 py-2 text-white"
        onClick={() =>
          login({
            token: "demo-jwt-from-api",
            user: { id: "123", email: "demo@pairup.dev", name: "Demo User" },
          })
        }
      >
        Demo Login
      </button>
    );
  }

  return (
    <div className="flex items-center gap-3 text-sm text-slate-700">
      <span>Hi, {user?.name ?? user?.email}</span>
      <button onClick={logout} className="text-rose-600">
        Logout
      </button>
    </div>
  );
}