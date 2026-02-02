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

// Epic 4: Reports - Import pages
import About from '../epics/reports/pages/About';
import { RefinedReportsPage } from '../epics/reports/pages/RefinedReportsPage';

// Global pages
import Index from './pages/Index';
import NotFound from './pages/NotFound';

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

// Public Route Component - redirects to dashboard if already logged in
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { isAuthenticated, token } = useAuthStore();

    if (isAuthenticated && token) {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
};

function App() {
    const hydrate = useAuthStore((state) => state.hydrate);

    useEffect(() => {
        hydrate();
    }, [hydrate]);

    return (
        <ThemeProvider>
            <QueryClientProvider client={queryClient}>
                <TooltipProvider>
                    <Toaster />
                    <Sonner />
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
                                    path="/reports"
                                    element={
                                        <ProtectedRoute>
                                            <RefinedReportsPage />
                                        </ProtectedRoute>
                                    }
                                />
                                <Route path="/about" element={<About />} />
                                <Route path="*" element={<NotFound />} />
                            </Routes>
                        </BrowserRouter>
                    </div>
                </TooltipProvider>
            </QueryClientProvider>
        </ThemeProvider>
    );
}

export default App;
