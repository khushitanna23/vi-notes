import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import apiClient from '../apiClient';
import type { ApiUser, AuthResponse, ApiErrorBody } from '../types/api';

function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    // Backend unreachable / blocked / not running.
    if (!error.response) {
      return 'Cannot connect to server. Start backend (port 5000) and try again.';
    }

    const data = error.response.data as ApiErrorBody | undefined;
    if (data?.message && data.message.trim().length > 0) {
      return data.message;
    }
    if (error.message) return error.message;
  }
  return 'Network error. Please try again.';
}

interface AuthContextType {
  user: ApiUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  register: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

interface Props {
  children: ReactNode;
}

export const AuthProvider: React.FC<Props> = ({ children }) => {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser) as ApiUser;
        setUser(parsedUser);
        setToken(storedToken);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      } catch {
        localStorage.clear();
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await apiClient.post<AuthResponse>('/auth/login', { email, password });
      const { user: loggedInUser, token: authToken } = res.data.data;

      setUser(loggedInUser);
      setToken(authToken);
      localStorage.setItem('token', authToken);
      localStorage.setItem('user', JSON.stringify(loggedInUser));
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
      return { success: true, message: 'Login successful' };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: getApiErrorMessage(error) };
    }
  };

  const register = async (email: string, password: string) => {
    try {
      const res = await apiClient.post<{ success: boolean; message?: string }>('/auth/register', {
        email,
        password,
      });

      if (res.data.success) {
        return { success: true, message: res.data.message || 'Registered successfully' };
      }
      return { success: false, message: res.data.message || 'Registration failed' };
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, message: getApiErrorMessage(error) };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete apiClient.defaults.headers.common['Authorization'];
  };

  return <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>{children}</AuthContext.Provider>;
};