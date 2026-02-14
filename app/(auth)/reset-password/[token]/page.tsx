"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import apiClient from "@/lib/api";

const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters long"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const { token } = useParams<{ token: string }>();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  useEffect(() => {
    return () => {
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current);
      }
    };
  }, []);

  const onSubmit = async (values: ResetPasswordValues) => {
    if (!token) {
      setErrorMessage("Reset token is missing. Please use the link from your email.");
      return;
    }

    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      await apiClient.post(`/api/auth/reset-password/${token}`, {
        password: values.newPassword,
        confirmPassword: values.confirmPassword,
      });

      setSuccessMessage("Password updated successfully. Redirecting you to login...");
      reset();

      redirectTimer.current = setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      const fallback =
        err?.response?.data?.message ||
        err?.message ||
        "Unable to reset password. Please try again.";
      setErrorMessage(fallback);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="flex flex-col items-center w-full max-w-md">
        <div className="text-[#8B5CF6] font-bold text-[1.7rem]">PairUp</div>
        <h1 className="text-3xl font-bold text-black mt-2">Reset password</h1>
        <p className="text-sm text-gray-600 mt-2 text-center">
          Choose a new password to regain access to your account.
        </p>

        {successMessage && (
          <div
            className="w-full mt-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
            role="status"
          >
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div
            className="w-full mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="w-full mt-6 space-y-4">
          <div>
            <label htmlFor="newPassword" className="text-sm font-medium text-gray-700">
              New password
            </label>
            <input
              id="newPassword"
              type="password"
              {...register("newPassword")}
              placeholder="Enter new password"
              className={`mt-2 w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-1 text-black ${
                errors.newPassword ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-gray-400"
              }`}
            />
            {errors.newPassword && (
              <p className="text-red-500 text-xs mt-1">{errors.newPassword.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              {...register("confirmPassword")}
              placeholder="Re-enter new password"
              className={`mt-2 w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-1 text-black ${
                errors.confirmPassword ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-gray-400"
              }`}
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !token}
            className="w-full bg-[#8B5CF6] text-white py-3 rounded-lg font-bold text-lg hover:bg-[#6441B6] transition-all disabled:opacity-50"
          >
            {isSubmitting ? "Updating password..." : "Reset password"}
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
