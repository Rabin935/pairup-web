'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { RegisterData, registerSchema } from '../schema';
import { handleRegister } from '@/lib/actions/auth-action';

export default function RegisterForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstname: '',
      lastname: '',
      email: '',
      number: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: RegisterData) => {
    setError(null);

    try {
      const payload = { ...values, authProvider: 'local' };
      const response = await handleRegister(payload);

      if (!response.success) {
        throw new Error(response.message || 'Registration failed');
      }

      router.push('/login');
    } catch (err: any) {
      console.error('Register failed:', err);
      setError(err?.response?.data?.message || err.message || 'Registration failed');
    }
  };

  return (
    <div className="flex flex-col items-center w-full">
      <div className="text-[#8B5CF6] font-bold text-[1.7rem]">PairUp</div>
      <h1 className="text-3xl font-bold text-black mb-8">Create an Account</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="w-full space-y-4">
        <div className="flex gap-3">
          <div className="w-1/2">
            <input
              {...register('firstname')}
              placeholder="First Name"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-1 text-black ${
                errors.firstname ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-gray-400'
              }`}
            />
            {errors.firstname && <p className="text-red-500 text-xs mt-1">{errors.firstname.message}</p>}
          </div>

          <div className="w-1/2">
            <input
              {...register('lastname')}
              placeholder="Last Name"
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-1 text-black ${
                errors.lastname ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-gray-400'
              }`}
            />
            {errors.lastname && <p className="text-red-500 text-xs mt-1">{errors.lastname.message}</p>}
          </div>
        </div>

        <div>
          <input
            {...register('email')}
            placeholder="Enter your email"
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-1 text-black ${
              errors.email ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-gray-400'
            }`}
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>

        <div className="flex">
          <span className="flex items-center px-3 rounded-l-lg border border-r-0 border-gray-300 bg-gray-100 text-black text-sm">+977</span>
          <input
            {...register('number')}
            placeholder="98XXXXXXXX"
            className={`w-full px-4 py-3 border rounded-r-lg focus:outline-none focus:ring-1 text-black ${
              errors.number ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-gray-400'
            }`}
          />
          {errors.number && <p className="text-red-500 text-xs mt-1">{errors.number.message}</p>}
        </div>

        <div className="relative">
          <input
            {...register('password')}
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-1 text-black ${
              errors.password ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-gray-400'
            }`}
          />
          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            {showPassword ? '🙈' : '👁️'}
          </button>
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
        </div>

        <div>
          <input
            {...register('confirmPassword')}
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirm Password"
            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-1 text-black ${
              errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-gray-400'
            }`}
          />
          {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
        </div>

        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-[#8B5CF6] text-white py-3 rounded-lg font-bold text-lg hover:bg-[#6441B6FF] transition-all disabled:opacity-50 mt-4"
        >
          {isSubmitting ? 'Creating account...' : 'Join now'}
        </button>

        <p className="text-center text-sm text-gray-600 mt-6">
          Already a member?{' '}
          <Link href="/login" className="text-[#8B5CF6] font-bold hover:underline">
            Login here
          </Link>
        </p>
      </form>
    </div>
  );
}
