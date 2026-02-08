'use client';

import { useParams, useRouter } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import Link from 'next/link';

export default function AdminUserDetailPage() {
  const params = useParams();
  const userId = params.id as string;

  return (
    <AuthGuard requiredRole="admin">
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/admin/users"
            className="mb-6 inline-block text-blue-600 hover:underline"
          >
            ← Back to Users
          </Link>

          <div className="bg-white rounded-lg shadow-md p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">User Details</h1>

            <div className="space-y-4">
              <p className="text-lg text-gray-700">
                <span className="font-semibold">User ID:</span> {userId}
              </p>
              <p className="text-gray-600">User details placeholder</p>
            </div>

            <div className="mt-8 flex gap-4">
              <Link
                href={`/admin/users/${userId}/edit`}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium"
              >
                Edit User
              </Link>
              <Link
                href="/admin/users"
                className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition font-medium"
              >
                Back
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
