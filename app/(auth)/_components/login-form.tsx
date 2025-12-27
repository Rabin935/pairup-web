"use client";

import { useState } from "react";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log({ email, password });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full max-w-md bg-white p-6 rounded-xl shadow"
    >
      <h2 className="text-2xl font-semibold mb-4 text-center">
        Login to PairUp 💖
      </h2>

      <input
        type="email"
        placeholder="Email"
        className="w-full border p-2 rounded mb-3"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <input
        type="password"
        placeholder="Password"
        className="w-full border p-2 rounded mb-4"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <button
        type="submit"
        className="w-full bg-pink-500 text-white py-2 rounded hover:bg-pink-600"
      >
        Login
      </button>
    </form>
  );
}
