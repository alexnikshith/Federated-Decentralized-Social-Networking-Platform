import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { ThemeProvider } from './components/theme-provider';
import { MainLayout } from './components/layout/MainLayout';
import { useAutoLogout } from './hooks/useAutoLogout';
import { useActivityHeartbeat } from './hooks/useActivityHeartbeat';

import { useAuthStore } from '../epics/identity/store/authStore';
import { authApi } from '../epics/identity/api/client';
import { ProfilePage } from '../epics/identity/pages/ProfilePage';
import { FeedPage } from '../epics/content-sharing/pages/FeedPage';
import { DashboardPage } from '../epics/content-sharing/pages/DashboardPage';

// Epic 1: Identity - Import pages
import LoginPage from '../epics/identity/pages/LoginUI';
import RegisterPage from '../epics/identity/pages/RegisterUI';
import ProfileUI from '../epics/identity/pages/ProfileUI';
import { SettingsPage } from '../epics/identity/pages/SettingsPage';

// Epic 3: Federation - Import pages
import Communities from '../epics/federation/pages/Communities';
import Explore from '../epics/federation/pages/Explore';
import MessagingUI from '../epics/messaging/pages/MessagingUI';

// Epic 4: Reports - Import pages
import About from '../epics/reports/pages/About';
import { RefinedReportsPage } from '../epics/reports/pages/RefinedReportsPage';

// Admin Epic
import AdminDashboard from '../epics/admin/pages/AdminDashboard';

// Global pages
import Index from './pages/Index';
import NotFound from './pages/NotFound';
import { NotificationsPage } from './pages/NotificationsPage';

import './App.css';

const queryClient = new QueryClient();

// Auto-logout wrapper component
const AutoLogoutWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    useAutoLogout();
    useActivityHeartbeat();
    return <>{children}</>;
};

// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const token = useAuthStore((state) => state.token);

    if (!isAuthenticated || !token) {
        return <Navigate to="/login" replace />;
    }

    return (
        <MainLayout>
            <AutoLogoutWrapper>{children}</AutoLogoutWrapper>
        </MainLayout>
    );
};

// Admin Route Component
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, user, token } = useAuthStore();

    if (!isAuthenticated || !token) {
        return <Navigate to="/login" replace />;
    }

    if (user?.role !== 'admin') {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <MainLayout>
            <AutoLogoutWrapper>{children}</AutoLogoutWrapper>
        </MainLayout>
    );
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, token } = useAuthStore();

    // Only redirect to dashboard if we HAVE a valid token (active session)
    if (isAuthenticated && token) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
};

const AppContent: React.FC = () => {
    const { isAuthenticated, user, token, setAuth, clearAuth, clearAllSessions } = useAuthStore();

    // Session Sync: Ensure user data and token are fresh
    useEffect(() => {
        const sync = async () => {
            if (isAuthenticated && token) {
                try {
                    const { user: freshUser, token: freshToken } = await authApi.syncSession();
                    setAuth(freshUser, freshToken);
                } catch (error) {
                    console.error("Session sync failed:", error);
                    // If it's a 401, the interceptor will handle logout
                }
            }
        };

        sync();
        // Refetch on window focus to ensure real-time data
        window.addEventListener('focus', sync);

        return () => window.removeEventListener('focus', sync);
    }, [isAuthenticated, token, setAuth]);

    // Safety Valve: Recover from corrupted login state without wiping other background sessions
    useEffect(() => {
        if (isAuthenticated && (!user || !user.id || !user.username)) {
            console.warn("Targeted session recovery triggered for corrupted state.");
            clearAuth();
        }
    }, [isAuthenticated, user, clearAuth]);

    return (
        <div className="h-full">
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<Index />} />
                    <Route
                        path="/login"
                        element={
                            <PublicRoute>
                                <LoginPage />
                            </PublicRoute>
                        }
                    />
                    <Route
                        path="/register"
                        element={
                            <PublicRoute>
                                <RegisterPage />
                            </PublicRoute>
                        }
                    />
                    <Route path="/signup" element={<Navigate to="/register" />} />
                    <Route
                        path="/profile"
                        element={
                            <ProtectedRoute>
                                <ProfileUI />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/profile/:username"
                        element={
                            <ProtectedRoute>
                                <ProfileUI />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/settings"
                        element={
                            <ProtectedRoute>
                                <SettingsPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/feed"
                        element={
                            <ProtectedRoute>
                                <FeedPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <DashboardPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/notifications"
                        element={
                            <ProtectedRoute>
                                <NotificationsPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/communities"
                        element={
                            <ProtectedRoute>
                                <Communities />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/explore"
                        element={
                            <ProtectedRoute>
                                <Explore />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/messages"
                        element={
                            <ProtectedRoute>
                                <MessagingUI />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/reports"
                        element={
                            <ProtectedRoute>
                                <RefinedReportsPage />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/admin"
                        element={
                            <AdminRoute>
                                <AdminDashboard />
                            </AdminRoute>
                        }
                    />
                    <Route path="/about" element={<About />} />
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </BrowserRouter>
        </div>
    );
};

const App: React.FC = () => (
    <ThemeProvider>
        <QueryClientProvider client={queryClient}>
            <TooltipProvider>
                <Toaster />
                <Sonner />
                <AppContent />
            </TooltipProvider>
        </QueryClientProvider>
    </ThemeProvider>
);

export default App;
