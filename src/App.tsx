import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { UserRole } from '../shared/types';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeToastProvider } from './context/ThemeToastContext';
import { AppShell } from './layouts/AppShell';
import { AdminDashboard } from './pages/AdminDashboard';
import { FacultyDashboard } from './pages/FacultyDashboard';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { ModelTrainingPage } from './pages/ModelTrainingPage';
import { NeuralNetworkLabPage } from './pages/NeuralNetworkLabPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { PredictionHistoryPage } from './pages/PredictionHistoryPage';
import { PredictionPage } from './pages/PredictionPage';
import { ProfilePage } from './pages/ProfilePage';
import { RecommendationCenterPage } from './pages/RecommendationCenterPage';
import { RegisterPage } from './pages/RegisterPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { StudentFormPage } from './pages/StudentFormPage';
import { StudentManagementPage } from './pages/StudentManagementPage';
import { UserManagementPage } from './pages/UserManagementPage';

function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: UserRole[];
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#0B1120] text-sm text-slate-500">
        Loading NeuroPredict workspace...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    const fallback =
      user.role === 'admin' ? '/admin' : user.role === 'faculty' ? '/faculty' : '/student';
    return <Navigate to={fallback} replace />;
  }

  return <AppShell>{children}</AppShell>;
}

export default function App() {
  return (
    <ThemeToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Pages */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            {/* Role Dashboards */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/faculty"
              element={
                <ProtectedRoute roles={['faculty']}>
                  <FacultyDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/student"
              element={
                <ProtectedRoute roles={['student']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />

            {/* Student CRUD */}
            <Route
              path="/students"
              element={
                <ProtectedRoute roles={['admin', 'faculty']}>
                  <StudentManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students/add"
              element={
                <ProtectedRoute roles={['admin', 'faculty']}>
                  <StudentFormPage mode="add" />
                </ProtectedRoute>
              }
            />
            <Route
              path="/students/:id/edit"
              element={
                <ProtectedRoute roles={['admin', 'faculty']}>
                  <StudentFormPage mode="edit" />
                </ProtectedRoute>
              }
            />

            {/* Predictions & Neural Network */}
            <Route
              path="/predict"
              element={
                <ProtectedRoute roles={['admin', 'faculty', 'student']}>
                  <PredictionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/predictions"
              element={
                <ProtectedRoute roles={['admin', 'faculty', 'student']}>
                  <PredictionHistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/neural-lab"
              element={
                <ProtectedRoute roles={['admin', 'faculty', 'student']}>
                  <NeuralNetworkLabPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/training"
              element={
                <ProtectedRoute roles={['admin', 'faculty']}>
                  <ModelTrainingPage />
                </ProtectedRoute>
              }
            />

            {/* Analytics, Recommendations & Reports */}
            <Route
              path="/analytics"
              element={
                <ProtectedRoute roles={['admin', 'faculty']}>
                  <AdminDashboard
                    title="Institutional Analytics Suite"
                    description="Interactive multi-dimensional cohort analytics, risk breakdowns, and TensorFlow.js model evaluation charts."
                  />
                </ProtectedRoute>
              }
            />
            <Route
              path="/recommendations"
              element={
                <ProtectedRoute roles={['admin', 'faculty', 'student']}>
                  <RecommendationCenterPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute roles={['admin', 'faculty', 'student']}>
                  <ReportsPage />
                </ProtectedRoute>
              }
            />

            {/* Administration & Account */}
            <Route
              path="/users"
              element={
                <ProtectedRoute roles={['admin']}>
                  <UserManagementPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute roles={['admin', 'faculty', 'student']}>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute roles={['admin', 'faculty', 'student']}>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />

            {/* 404 Catch-All */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeToastProvider>
  );
}
