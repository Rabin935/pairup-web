"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginSchema, LoginValues } from "@/app/lib/validations/login-auth";


export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginValues) => {
    console.log("Submit logic:", values);
    // Add your login logic here
  };

  return (
    <div className="flex flex-col items-center w-full max-w-[400px]">
      {/* PNG Logo */}
      <div className="mb-6">
        <Image src="" alt="PairUp Logo" width={160} height={50} priority />
        PairUp
      </div>

      <h1 className="text-3xl font-bold text-black mb-8">Login to GiftQuest</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-4">
        {/* Social Buttons */}
        <button type="button" className="w-full flex items-center justify-center gap-3 py-2.5 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all">
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
          Login with Google
        </button>
        <button type="button" className="w-full flex items-center justify-center gap-3 py-2.5 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition-all">
          <svg className="w-5 h-5" viewBox="0 0 384 512" fill="currentColor"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
          Login with Apple
        </button>

        <div className="relative py-4 flex items-center">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="flex-shrink mx-4 text-sm font-bold text-black uppercase">OR</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        {/* Inputs */}
        <div className="space-y-4">
          <div>
            <input
              {...register("email")}
              placeholder="Enter your email"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-1 text-black ${
                errors.email ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-gray-400"
              }`}
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email?.message}</p>}
          </div>

          <div className="relative">
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-1 text-black ${
                errors.password ? "border-red-500 focus:ring-red-500" : "border-gray-300 focus:ring-gray-400"
              }`}
            />
            <button 
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password?.message}</p>}
        </div>

        <div className="text-center pt-2">
          <Link href="#" className="text-[#8B5CF6] text-sm font-semibold hover:underline">
            Forget password?
          </Link>
        </div>

        <button 
          disabled={isSubmitting}
          className="w-full bg-[#A9A9A9] text-white py-3 rounded-lg font-bold text-lg hover:bg-gray-500 transition-all disabled:opacity-50"
        >
          {isSubmitting ? "Loading..." : "Login"}
        </button>

        <p className="text-center text-sm text-gray-600 mt-6">
          Not a member yet?{" "}
          <Link href="/signup" className="text-[#8B5CF6] font-bold hover:underline">
            Join now
          </Link>
        </p>
      </form>
    </div>
  );
}