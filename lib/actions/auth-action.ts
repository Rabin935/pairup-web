"use server";
import { login, register } from "@/lib/api/auth"
import { LoginData, RegisterData } from "@/app/(auth)/schema"
import { setAuthToken, setUserData, clearAuthCookies } from "../cookie"
import { redirect } from "next/navigation";
export const handleRegister = async (data: RegisterData) => {
    try {
        const response = await register(data)
        if (response.success) {
            return {
                success: true,
                message: 'Registration successful',
                data: response.data
            }
        }
        return {
            success: false,
            message: response.message || 'Registration failed'
        }
    } catch (error: Error | any) {
        return { success: false, message: error.message || 'Registration action failed' }
    }
}

export const handleLogin = async (data: LoginData) => {
    try {
        console.log('handleLogin called with:', data);
        const response = await login(data)
        console.log('handleLogin raw response:', response);
        console.log('response.success:', response.success);
        console.log('response.token exists:', !!response.token);
        console.log('response.data exists:', !!response.data);
        
        // Handle backend response format: { success, data, token, message }
        if (response.success && response.token && response.data) {
          const result = {
            success: true,
            message: response.message || 'Login successful',
            data: {
              token: response.token,
              user: response.data
            }
          };
          console.log('Returning successful login result:', result);
          return result;
        }
        
        // Fallback for other response formats
        if (response.token && response.user) {
          return {
            success: true,
            message: 'Login successful',
            data: {
              token: response.token,
              user: response.user
            }
          }
        }
        
        if (response.success && response.data) {
            const result = {
                success: true,
                message: response.message || 'Login successful',
                data: {
                  token: response.token,
                  user: response.data
                }
            };
            console.log('Returning fallback successful login result:', result);
            return result;
        }
        
        console.log('No matching condition found, returning failure');
        return {
            success: false,
            message: response.message || 'Login failed'
        }
    } catch (error: Error | any) {
        console.error('handleLogin error caught:', error);
        return { success: false, message: error.message || 'Login action failed' }
    }
}

export const handleLogout = async () => {
    await clearAuthCookies();
    return redirect('/login');
}