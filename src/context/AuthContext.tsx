import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { PublicUser, StudentRecord } from '../../shared/types';
import { api, TOKEN_KEY } from '../services/api';

interface AuthContextValue {
  user: PublicUser | null;
  studentProfile: StudentRecord | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<PublicUser>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    role: 'student' | 'faculty';
    department?: string;
  }) => Promise<PublicUser>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setUser(null);
      setStudentProfile(null);
      setLoading(false);
      return;
    }
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      setStudentProfile(data.studentProfile ?? null);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setUser(null);
      setStudentProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    // Fetch linked student profile if student role
    if (data.user.role === 'student') {
      try {
        const me = await api.get('/auth/me');
        setStudentProfile(me.data.studentProfile ?? null);
      } catch {
        setStudentProfile(null);
      }
    } else {
      setStudentProfile(null);
    }
    return data.user as PublicUser;
  }, []);

  const register = useCallback(
    async (payload: {
      name: string;
      email: string;
      password: string;
      role: 'student' | 'faculty';
      department?: string;
    }) => {
      const { data } = await api.post('/auth/register', payload);
      localStorage.setItem(TOKEN_KEY, data.token);
      setUser(data.user);
      setStudentProfile(null);
      return data.user as PublicUser;
    },
    []
  );

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
    setStudentProfile(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, studentProfile, loading, login, register, logout, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
