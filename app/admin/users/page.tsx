'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminGuard } from '@/lib/hooks/useAdminGuard';
import apiClient from '@/lib/api';

interface User {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  role: 'user' | 'admin';
}

const PAGE_SIZE = 5;

export default function AdminUsersPage() {
  // All hooks FIRST - in same order every render
  const { isAdmin, loading: authLoading } = useAdminGuard();
  const [users, setUsers] = useState<User[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async (page: number) => {
    try {
      setLoading(true);
      setError('');
      const response = await apiClient.get('/api/admin/users', {
        params: { page, limit: PAGE_SIZE },
      });

      const payload = response.data?.data ?? response.data;
      const listCandidate = Array.isArray(payload)
        ? payload
        : payload?.users ?? payload?.data ?? [];
      const rawUsers = Array.isArray(listCandidate)
        ? listCandidate
        : Array.isArray(listCandidate?.data)
        ? listCandidate.data
        : [];

      const normalizedUsers: User[] = rawUsers.map((user: any) => ({
        id: user.id || user._id || user.uid,
        firstname: user.firstname ?? '',
        lastname: user.lastname ?? '',
        email: user.email ?? '',
        role: user.role ?? 'user',
      }));

      setUsers(normalizedUsers);
      const pagination = response.data?.pagination ?? payload?.pagination;
      setTotalPages(pagination?.totalPages ?? payload?.totalPages ?? 1);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to fetch users';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers(currentPage);
  }, [currentPage, fetchUsers]);

  const handleDelete = async (userId: string) => {
    const confirmed = window.confirm('Delete this user? This action cannot be undone.');
    if (!confirmed) return;

    try {
      setDeletingId(userId);
      await apiClient.delete(`/api/admin/users/${userId}`);
      await fetchUsers(currentPage);
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to delete user';
      setError(message);
    } finally {
      setDeletingId(null);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  // Conditional renders AFTER all hooks
  if (authLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-sm uppercase tracking-wide text-gray-500">Admin</p>
              <h1 className="text-3xl font-semibold text-gray-900">Users</h1>
            </div>
            <Link
              href="/admin/users/create"
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              + New User
            </Link>
          </div>

          {error && (
            <div className="mb-6 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      First Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Last Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Role
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">
                        Loading users...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-sm text-gray-500">
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                          {user.firstname || '—'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                          {user.lastname || '—'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">
                          {user.email}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                              user.role === 'admin'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-3">
                            <Link
                              href={`/admin/users/${user.id}`}
                              className="text-blue-600 transition hover:text-blue-800"
                            >
                              View
                            </Link>
                            <Link
                              href={`/admin/users/${user.id}/edit`}
                              className="text-emerald-600 transition hover:text-emerald-800"
                            >
                              Edit
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDelete(user.id)}
                              disabled={deletingId === user.id}
                              className="text-red-600 transition hover:text-red-800 disabled:cursor-not-allowed disabled:text-red-400"
                            >
                              {deletingId === user.id ? 'Deleting…' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col items-center gap-3 border-t border-gray-200 px-6 py-4 sm:flex-row sm:justify-between">
              <p className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={goToPrevPage}
                  disabled={currentPage === 1 || loading}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages || loading}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}
