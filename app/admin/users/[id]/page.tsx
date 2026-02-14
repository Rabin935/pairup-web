'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAdminGuard } from '@/lib/hooks/useAdminGuard';
import apiClient from '@/lib/api';

interface User {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  number: string;
  role: 'user' | 'admin';
  createdAt: string;
}

export default function UserDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { isAdmin, loading: authLoading } = useAdminGuard();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    const fetchUser = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await apiClient.get(`/api/admin/users/${id}`);

        const userData = response.data?.data ?? response.data;
        setUser({
          id: userData.id || userData._id || userData.uid,
          firstname: userData.firstname ?? '',
          lastname: userData.lastname ?? '',
          email: userData.email ?? '',
          number: userData.number ?? '',
          role: userData.role ?? 'user',
          createdAt: userData.createdAt ?? '',
        });
      } catch (err: any) {
        setError(
          err.response?.data?.message ||
            err.message ||
            'Failed to fetch user details'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [id]);

  // Conditional checks AFTER all hooks
  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAdmin) return null;

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
          <h1 className="text-3xl font-bold text-gray-900">User Details</h1>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* User Details Card */}
        {user && !loading && (
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="px-6 py-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name
                  </label>
                  <p className="text-gray-900 text-lg">{user.firstname}</p>
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name
                  </label>
                  <p className="text-gray-900 text-lg">{user.lastname}</p>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <p className="text-gray-900 text-lg break-all">{user.email}</p>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <p className="text-gray-900 text-lg">{user.number || 'N/A'}</p>
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Role
                  </label>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      user.role === 'admin'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                </div>

                {/* Created At */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Created At
                  </label>
                  <p className="text-gray-900 text-lg">
                    {user.createdAt
                      ? new Date(user.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'N/A'}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-8 flex gap-4 pt-6 border-t border-gray-200">
                <Link
                  href={`/admin/users/${id}/edit`}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200 text-center"
                >
                  Edit User
                </Link>
                <Link
                  href="/admin/users"
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition duration-200 text-center"
                >
                  Back to Users
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!loading && !error && !user && (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg">
            No user data found.
          </div>
        )}
      </div>
    </div>
  );
}
