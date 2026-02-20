import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSettingsStore } from '../epics/identity/store/settingsStore';
import { ThemeProvider } from './components/theme-provider';
import { MainLayout } from './components/layout/MainLayout';
import { useAutoLogout } from './hooks/useAutoLogout';
import { useActivityHeartbeat } from './hooks/useActivityHeartbeat';

import { useAuthStore } from '../epics/identity/store/authStore';
import { authApi } from '../epics/identity/api/client';

import { FeedPage } from '../epics/content-sharing/pages/FeedPage';
import { DashboardPage } from '../epics/content-sharing/pages/DashboardPage';

// Epic 1: Identity - Import pages
import LoginPage from '../epics/identity/pages/LoginUI';
import { SignupPage as RegisterPage } from '../epics/identity/pages/SignupPage';
import ProfileUI from '../epics/identity/pages/ProfileUI';
import { SettingsPage } from '../epics/identity/pages/SettingsPage';
import { ForgotPasswordPage } from '../epics/identity/pages/ForgotPasswordPage';


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

// Main App Component
// Handles:
// 1. Global providers (Theme, Query, Toast)
// 2. Routing configuration (Public, Protected, Admin)
// 3. Session persistence and synchronization
// 4. Auto-logout and activity tracking wrappers

const AppContent: React.FC = () => {
    const { isAuthenticated, user, token, setAuth, clearAuth, clearAllSessions, sessions, removeAccount } = useAuthStore();
    const { updateDailyUsage, dailyUsageMinutes, timeLimitMinutes, isLimitIgnoredToday, ignoreLimit, setTimeLimit } = useSettingsStore();

    // Track daily usage
    useEffect(() => {
        const interval = setInterval(() => {
            updateDailyUsage(1);
        }, 60000); // Check every minute
        return () => clearInterval(interval);
    }, []);

    const showTimeLimitAlert =
        timeLimitMinutes !== null &&
        Number(dailyUsageMinutes) >= Number(timeLimitMinutes) &&
        !isLimitIgnoredToday;

    // Session Sync: Ensure user data and token are fresh
    // This runs on mount/auth-change to validate the stored token against the backend
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

    // Safety Valve: Recover from corrupted login state and purge invalid sessions
    // Checks if we have an "authenticated" flag but missing critical user data, or if any background session is corrupt
    useEffect(() => {
        const hasCorruptActiveSession = isAuthenticated && (!user || !user.id || !user.username);
        const hasCorruptBackgroundSessions = sessions.some(s => !s.user || !s.user.id);

        if (hasCorruptActiveSession || hasCorruptBackgroundSessions) {
            console.warn("Targeted session recovery triggered for corrupted state.");

            if (hasCorruptBackgroundSessions) {
                // Remove all sessions that are missing user data
                sessions.forEach(s => {
                    if (!s.user || !s.user.id) {
                        removeAccount(s.user?.id || 'unknown');
                    }
                });
            }

            if (hasCorruptActiveSession) {
                clearAuth();
            }
        }
    }, [isAuthenticated, user, sessions, clearAuth, removeAccount]);

    return (
        <div className="h-full">
            {/* Time Limit Alert */}
            <AlertDialog open={!!showTimeLimitAlert}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Time Limit Reached</AlertDialogTitle>
                        <AlertDialogDescription>
                            You have reached your daily limit of {timeLimitMinutes} minutes.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => ignoreLimit()}>Ignore</AlertDialogCancel>
                        <AlertDialogAction onClick={() => setTimeLimit((timeLimitMinutes || 0) + 10)}>Extend 10 mins</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <BrowserRouter>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/" element={<Index />} />

                    {/* Authentication Routes - Redirects to dashboard if already logged in */}
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
                        path="/forgot-password"
                        element={
                            <PublicRoute>
                                <ForgotPasswordPage />
                            </PublicRoute>
                        }
                    />

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
