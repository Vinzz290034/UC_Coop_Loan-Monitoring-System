'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import api from '../lib/api';

export interface User {
  id: number;
  username: string;
  role: 'admin' | 'manager' | 'member';
  profile?: {
    id: number;
    first_name: string;
    last_name: string;
    middle_name?: string;
    email?: string;
    phone?: string;
    status: 'active' | 'suspended' | 'inactive';
  } | null;
}

interface RegisterPayload {
  first_name: string;
  last_name: string;
  username: string;
  password: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<User>;
  register: (username: string, password: string) => Promise<void>;
  memberRegister: (data: RegisterPayload) => Promise<{ email: string; _dev_otp?: string }>;
  verifyOtp: (email: string, otp_code: string) => Promise<void>;
  resendOtp: (email: string) => Promise<{ _dev_otp?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function loadUserFromStorage() {
      if (typeof window === 'undefined') return;

      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        
        try {
          // Verify token against backend /me endpoint
          const response = await api.get('/auth/me');
          const freshUser = response.data.data || response.data.user;
          setUser(freshUser);
          localStorage.setItem('user', JSON.stringify(freshUser));
        } catch (error) {
          console.error('Failed to verify session token', error);
          // Token expired or invalid
          logout();
        }
      }
      setLoading(false);
    }
    loadUserFromStorage();
  }, []);

  // Protect client side routes
  useEffect(() => {
    if (!loading) {
      // Public routes — accessible without authentication.
      // Add any new public pages here to prevent the auth guard from redirecting them.
      const publicPaths = [
        '/',
        '/login',
        '/register',
        '/terms',
        '/privacy',
        '/about',
        '/features',
        '/how-it-works',
        '/contact'
      ];
      const isPublicPath = publicPaths.includes(pathname);
      
      if (!user && !isPublicPath) {
        router.push('/login');
      } else if (user && pathname === '/login') {
        router.push('/dashboard');
      }
    }
  }, [user, loading, pathname, router]);

  const login = async (username: string, password: string): Promise<User> => {
    try {
      const response = await api.post('/auth/login', {
        username,
        password,
      });

      const { token: receivedToken, user: receivedUser } = response.data;
      
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', receivedToken);
        localStorage.setItem('user', JSON.stringify(receivedUser));
      }

      setToken(receivedToken);
      setUser(receivedUser);
      
      router.push('/dashboard');
      return receivedUser;
    } catch (error: any) {
      const message = error.response?.data?.message || 'Login failed. Please check credentials.';
      throw new Error(message);
    }
  };

  // Legacy register — used by admin-created accounts (calls protected endpoint)
  const register = async (username: string, password: string): Promise<void> => {
    try {
      await api.post('/auth/register', {
        username,
        password,
        role: 'member',
      });
    } catch (error: any) {
      const message = error.response?.data?.error?.message || error.response?.data?.message || 'Registration failed.';
      throw new Error(message);
    }
  };

  // Member self-registration — Step 1: submit form, receive OTP via email
  const memberRegister = async (data: RegisterPayload): Promise<{ email: string; _dev_otp?: string }> => {
    try {
      const response = await api.post('/auth/member-register', data);
      return {
        email: response.data.email,
        _dev_otp: response.data._dev_otp,
      };
    } catch (error: any) {
      const message = error.response?.data?.error?.message || error.response?.data?.message || 'Registration failed.';
      throw new Error(message);
    }
  };

  // Member self-registration — Step 2: verify OTP
  const verifyOtp = async (email: string, otp_code: string): Promise<void> => {
    try {
      await api.post('/auth/verify-otp', { email, otp_code });
    } catch (error: any) {
      const message = error.response?.data?.error?.message || error.response?.data?.message || 'Verification failed.';
      throw new Error(message);
    }
  };

  // Resend OTP for pending registration
  const resendOtp = async (email: string): Promise<{ _dev_otp?: string }> => {
    try {
      const response = await api.post('/auth/resend-otp', { email });
      return {
        _dev_otp: response.data._dev_otp,
      };
    } catch (error: any) {
      const message = error.response?.data?.error?.message || error.response?.data?.message || 'Failed to resend code.';
      throw new Error(message);
    }
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        memberRegister,
        verifyOtp,
        resendOtp,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
