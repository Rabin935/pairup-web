// Utility functions for authentication

export interface UserInfo {
  id: string;
  firstname: string;
  lastname: string;
  email: string;
  number: string;
  role: 'user' | 'admin';
  image?: string;
}

export const saveAuthData = (token: string, userInfo: UserInfo) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('authToken', token);
    localStorage.setItem('userInfo', JSON.stringify(userInfo));
  }
};

export const getAuthData = () => {
  if (typeof window === 'undefined') return null;
  
  const token = localStorage.getItem('authToken');
  const userInfoStr = localStorage.getItem('userInfo');
  
  if (!token || !userInfoStr) return null;
  
  try {
    return {
      token,
      userInfo: JSON.parse(userInfoStr) as UserInfo,
    };
  } catch {
    return null;
  }
};

export const clearAuthData = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
  }
};

export const isAuthenticated = () => {
  return getAuthData() !== null;
};

export const isAdmin = () => {
  const authData = getAuthData();
  return authData?.userInfo.role === 'admin';
};
