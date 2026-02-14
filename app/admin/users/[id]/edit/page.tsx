'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAdminGuard } from '@/lib/hooks/useAdminGuard';
import Link from 'next/link';
import apiClient from '@/lib/api';

interface User {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  number: string;
  role: 'user' | 'admin';
}

interface FormData {
  firstname: string;
  lastname: string;
  email: string;
  number: string;
  role: 'user' | 'admin';
}

export default function AdminUserEditPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;
  const { isAdmin, loading: authLoading } = useAdminGuard();

  const [formData, setFormData] = useState<FormData>({
    firstname: '',
    lastname: '',
    email: '',
    number: '',
    role: 'user',
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch user data on load
  useEffect(() => {
    if (!userId) return;

    const fetchUser = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await apiClient.get(`/api/admin/users/${userId}`);

        const userData = response.data?.data ?? response.data;
        setFormData({
          firstname: userData.firstname ?? '',
          lastname: userData.lastname ?? '',
          email: userData.email ?? '',
          number: userData.number ?? '',
          role: userData.role ?? 'user',
        });
      } catch (err: any) {
        setError(
          err.response?.data?.message ||
            err.message ||
            'Failed to fetch user data'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [userId]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (
      !formData.firstname.trim() ||
      !formData.lastname.trim() ||
      !formData.email.trim()
    ) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSubmitting(true);
      await apiClient.put(`/api/admin/users/${userId}`, formData);

      setSuccessMessage('User updated successfully!');
      setTimeout(() => {
        router.push('/admin/users');
      }, 1000);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          err.message ||
          'Failed to update user'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Conditional checks AFTER all hooks
  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAdmin) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin/users"
            className="text-blue-600 hover:text-blue-800 font-medium text-sm mb-4 inline-block"
          >
            ← Back to Users
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Edit User</h1>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
            {successMessage}
          </div>
        )}

        {/* Form */}
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <form onSubmit={handleSubmit} className="px-6 py-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* First Name */}
              <div>
                <label
                  htmlFor="firstname"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  First Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  id="firstname"
                  name="firstname"
                  value={formData.firstname}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-gray-900"
                  disabled={submitting}
                />
              </div>

              {/* Last Name */}
              <div>
                <label
                  htmlFor="lastname"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Last Name <span className="text-red-600">*</span>
                </label>
                <input
                  type="text"
                  id="lastname"
                  name="lastname"
                  value={formData.lastname}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-gray-900"
                  disabled={submitting}
                />
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Email <span className="text-red-600">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-gray-900"
                  disabled={submitting}
                />
              </div>

              {/* Phone Number */}
              <div>
                <label
                  htmlFor="number"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="number"
                  name="number"
                  value={formData.number}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-gray-900"
                  disabled={submitting}
                />
              </div>

              {/* Role */}
              <div className="md:col-span-2">
                <label
                  htmlFor="role"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Role <span className="text-red-600">*</span>
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition text-gray-900"
                  disabled={submitting}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 flex gap-4 pt-6 border-t border-gray-200">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
              <Link
                href="/admin/users"
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition duration-200 text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
