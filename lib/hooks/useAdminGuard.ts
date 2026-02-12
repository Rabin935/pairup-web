import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  role: 'user' | 'admin';
}

export function useAdminGuard() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    try {
      // Check multiple possible storage keys for user data
      let userJson = localStorage.getItem('userInfo') || localStorage.getItem('user');

      if (!userJson) {
        router.push('/login');
        return;
      }

      const userData: any = JSON.parse(userJson);
      
      // Extract role - handle different possible field names
      const userRole = userData.role || userData.Role || userData.userRole;

      if (userRole !== 'admin') {
        router.push('/');
        return;
      }

      setUser({
        id: userData.id || userData._id || '',
        firstname: userData.firstname || userData.firstName || '',
        lastname: userData.lastname || userData.lastName || '',
        email: userData.email || '',
        role: userRole,
      });
      setIsAdmin(true);
    } catch (error) {
      console.error('Error checking admin status:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  return { isAdmin, loading, user };
}
