"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import apiClient from "@/lib/api";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please provide a valid email"),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await apiClient.post("/api/auth/forgot-password", values);
      setSuccessMessage("If the email exists, reset link has been sent.");
      reset();
    } catch (err: any) {
      const fallback =
        err?.response?.data?.message ||
        err?.message ||
        "Something went wrong. Please try again.";
      setErrorMessage(fallback);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="flex flex-col items-center w-full max-w-md">
        <div className="text-[#8B5CF6] font-bold text-[1.7rem]">PairUp</div>
        <h1 className="text-3xl font-bold text-black mt-2">Forgot password</h1>
        <p className="text-sm text-gray-600 mt-2 text-center">
          Enter the email tied to your account and we&apos;ll send a reset link if one exists.
        </p>

        {successMessage && (
          <div className="w-full mt-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800" role="status">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="w-full mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="w-full mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email address
            </label>
            <input
              id="email"
              type="email"
              {...register("email")}
              placeholder="you@example.com"
              className={`mt-2 w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-1 text-black ${
                errors.email ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-gray-400"
              }`}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#8B5CF6] text-white py-3 rounded-lg font-bold text-lg hover:bg-[#6441B6FF] transition-all disabled:opacity-50"
          >
            {isSubmitting ? "Sending reset link..." : "Send reset link"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-6">
          Remembered your password? {""}
          <Link href="/login" className="text-[#8B5CF6] font-bold hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
