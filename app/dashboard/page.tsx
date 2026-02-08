'use client';

import ProtectedRoute from '@/components/ProtectedRoute';

export default function Dashboard() {
    return (
        <ProtectedRoute requiredRole="user">
            <div className="min-h-screen bg-white text-white p-8">
                <h1>Dashboard - User Page</h1>
            </div>
        </ProtectedRoute>
    );
}