'use client';

import { useParams } from 'next/navigation';
import AuthGuard from '@/components/AuthGuard';
import Link from 'next/link';

export default function AdminUserEditPage() {
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
            <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit User</h1>

            <div className="space-y-4">
              <p className="text-lg text-gray-700">
                <span className="font-semibold">User ID:</span> {userId}
              </p>
              <p className="text-gray-600">Edit user form placeholder</p>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
