import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { authApi } from "../../../epics/identity/api/client";
import { useAuthStore } from "../../../epics/identity/store/authStore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Globe, ArrowRight, Eye, EyeOff, Shield, ArrowLeft, KeyRound, Mail, CheckCircle2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { SpaceDeviceFrame } from "./SpaceDeviceFrame";
import "./SpaceDevice.css";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { COMMUNITIES, DEFAULT_COMMUNITY } from "../../config/communities";

interface LoginFormProps {
    onSuccess?: () => void;
    onSwitchToRegister?: () => void;
    hideBackNav?: boolean;
    disablePrefill?: boolean;
}

export const LoginForm = ({ onSuccess, onSwitchToRegister, hideBackNav = false, disablePrefill = false }: LoginFormProps) => {
    const navigate = useNavigate();
    const { user, setAuth, isLoginExiting, setLoginExiting, startNebulaTransition } = useAuthStore();

    const [showPassword, setShowPassword] = useState(false);
    // Default to stored instance or Default Community
    const [instance, setInstance] = useState(
        localStorage.getItem('active_community_url') || DEFAULT_COMMUNITY.url
    );
    const [email, setEmail] = useState("");
    const location = useLocation();
    const [signupSuccess, setSignupSuccess] = useState(false);

    // Handle pre-fill from registration or store
    useEffect(() => {
        const state = location.state as { email?: string; signupSuccess?: boolean };
        if (state?.email) {
            setEmail(state.email);
        } else if (user && !disablePrefill && user.email) {
            setEmail(user.email);
        }

        if (state?.signupSuccess) {
            setSignupSuccess(true);
            toast.success("Account created successfully! Please sign in.");
        }
    }, [location.state, user, disablePrefill]);

    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // State for Views
    const [view, setView] = useState<'login' | 'login_otp' | 'forgot_email' | 'forgot_otp' | 'forgot_reset'>('login');
    const [otp, setOtp] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        if (instance) {
            localStorage.setItem('active_community_url', instance);
            const match = COMMUNITIES.find(c => c.url === instance || c.url === `http://${instance}`);
            if (match) {
                localStorage.setItem('active_community_id', match.id);
            }
        }

        try {
            if (view === 'login') {
                const response = await authApi.login({ email, password });
                if (response.token) {
                    startNebulaTransition();
                    setLoginExiting(true);
                    toast.success("Welcome back!");
                    onSuccess && onSuccess();
                    setTimeout(() => {
                        setAuth(response.user, response.token);
                    }, 1000);
                    return;
                }
                setView('login_otp');
                toast.success(`Verification code sent to ${email}. Check your inbox.`);
            } else if (view === 'login_otp') {
                const response = await authApi.verifyOTP({ email, code: otp });
                setAuth(response.user, response.token);
                toast.success("Welcome back!");
                onSuccess ? onSuccess() : navigate("/dashboard");
            }
        } catch (error: any) {
            const message = error.response?.data?.message || error.message || "Login failed. Please try again.";
            setError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotSendCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) {
            toast.error("Please enter your email");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            await authApi.forgotPassword(email);
            toast.success("If an account exists, a code has been sent.");
            setView('forgot_otp');
            setOtp("");
        } catch (error: any) {
            const message = error.response?.data?.message || "Failed to send code";
            setError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotVerifyCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!otp || otp.length !== 6) {
            toast.error("Please enter a valid 6-digit code");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            await authApi.verifyResetCode({ email, code: otp });
            toast.success("Code verified successfully");
            setView('forgot_reset');
        } catch (error: any) {
            const message = error.response?.data?.message || "Invalid or expired code";
            setError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPassword || !confirmPassword) {
            toast.error("Please fill in all fields");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            await authApi.resetPassword({ email, code: otp, new_password: newPassword });
            toast.success("Password reset successfully! Please login.");
            setView('login');
            setPassword("");
            setOtp("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error: any) {
            const message = error.response?.data?.message || "Failed to reset password";
            setError(message);
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full h-full flex flex-col justify-center">
            {/* Back Button */}
            {!hideBackNav && (
                <div className="absolute top-4 left-4 md:top-8 md:left-8 z-[10]">
                    <Button
                        variant="ghost"
                        className="gap-2 text-muted-foreground hover:text-foreground"
                        onClick={() => navigate('/')}
                    >
                        <ArrowLeft className="w-4 h-4" /> Back
                    </Button>
                </div>
            )}

            <div className="w-full max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center p-6">
                {/* Left Column: Heading & Info */}
                <motion.div
                    className="text-left space-y-6"
                    initial={{ opacity: 1, x: 0 }}
                    animate={isLoginExiting ? { opacity: 0, x: -200 } : { opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: "anticipate" }}
                >
                    <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center">
                        <Globe className="w-8 h-8 text-primary" />
                    </div>

                    <div>
                        <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
                            {view === 'login' && "Welcome back"}
                            {view === 'login_otp' && "Verify It's You"}
                            {view === 'forgot_email' && "Forgot Password?"}
                            {view === 'forgot_otp' && "Verify Email"}
                            {view === 'forgot_reset' && "Reset Password"}
                        </h1>
                        <p className="text-lg text-muted-foreground">
                            {view === 'login' && "Sign in to your Nexus account to connect with your community."}
                            {view === 'login_otp' && `We've sent a 6-digit code to ${email}. Please enter it below.`}
                            {view === 'forgot_email' && "Enter your registered email address and we'll send you a verification code."}
                            {view === 'forgot_otp' && `Enter the code sent to your email.`}
                            {view === 'forgot_reset' && "Create a new password for your account."}
                        </p>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground pt-4">
                        <Shield className="w-4 h-4" />
                        <span>Your credentials are encrypted end-to-end</span>
                    </div>
                </motion.div>

                {/* Right Column: Form */}
                <motion.div
                    initial={{ opacity: 1, x: 0 }}
                    animate={isLoginExiting ? { opacity: 0, x: 200 } : { opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: "anticipate" }}
                    className="relative w-full max-w-[400px] mx-auto z-10"
                >
                    <SpaceDeviceFrame className="p-6 md:p-8 space-y-6 min-h-full flex flex-col justify-center" wrapperClassName="w-full h-[540px]">
                        {error && (
                            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm shrink-0">
                                {error}
                            </div>
                        )}

                        {/* -- LOGIN VIEWS -- */}
                        {(view === 'login' || view === 'login_otp') && (
                            <form onSubmit={handleLoginSubmit} className="space-y-6">
                                {view === 'login' ? (
                                    <>
                                        <div className="space-y-2 shrink-0">
                                            <Label htmlFor="instance">Instance</Label>
                                            <Select value={instance} onValueChange={setInstance}>
                                                <SelectTrigger className="h-11 bg-secondary border-border">
                                                    <div className="flex items-center gap-2">
                                                        <Globe className="w-4 h-4 text-muted-foreground" />
                                                        <SelectValue placeholder="Select community" />
                                                    </div>
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {COMMUNITIES.map((community) => (
                                                        <SelectItem key={community.id} value={community.url}>
                                                            <div className="flex flex-col text-left">
                                                                <span className="font-medium">{community.name}</span>
                                                            </div>
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <p className="text-xs text-muted-foreground">
                                                Select the community instance your account belongs to
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="email">Email</Label>
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="you@example.com"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                className="h-11 bg-secondary border-border"
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <Label htmlFor="password">Password</Label>
                                                <button
                                                    type="button"
                                                    onClick={() => setView('forgot_email')}
                                                    className="text-sm text-primary hover:underline"
                                                >
                                                    Forgot password?
                                                </button>
                                            </div>
                                            <div className="relative">
                                                <Input
                                                    id="password"
                                                    type={showPassword ? "text" : "password"}
                                                    placeholder="••••••••"
                                                    value={password}
                                                    onChange={(e) => setPassword(e.target.value)}
                                                    className="h-11 bg-secondary border-border pr-10"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                >
                                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="space-y-4">
                                        <Label htmlFor="otp">Verification Code</Label>
                                        <Input
                                            id="otp"
                                            type="text"
                                            placeholder="Enter 6-digit code"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                            className="h-14 bg-secondary border-border text-center text-2xl tracking-[0.5em] font-mono"
                                            maxLength={6}
                                            required
                                            autoFocus
                                        />
                                        <div className="text-center">
                                            <Button
                                                type="button"
                                                variant="link"
                                                className="text-sm text-muted-foreground"
                                                onClick={() => setView('login')}
                                            >
                                                Use a different email
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                <Button type="submit" variant="hero" className="w-full h-11 text-base" disabled={isLoading}>
                                    {isLoading ? "Processing..." : (
                                        <>
                                            {view === 'login' ? "Sign In" : "Verify Code"}
                                            <ArrowRight className="w-4 h-4 ml-2" />
                                        </>
                                    )}
                                </Button>

                                {view === 'login' && (
                                    <>
                                        <div className="relative py-2">
                                            <div className="absolute inset-0 flex items-center">
                                                <div className="w-full border-t border-border"></div>
                                            </div>
                                            <div className="relative flex justify-center text-xs uppercase">
                                                <span className="bg-card px-2 text-muted-foreground">New to Nexus?</span>
                                            </div>
                                        </div>

                                        {onSwitchToRegister ? (
                                            <Button
                                                variant="outline"
                                                className="w-full h-11"
                                                onClick={(e) => { e.preventDefault(); onSwitchToRegister(); }}
                                            >
                                                Create an Account
                                            </Button>
                                        ) : (
                                            <Link to="/register">
                                                <Button variant="outline" className="w-full h-11">
                                                    Create an Account
                                                </Button>
                                            </Link>
                                        )}
                                    </>
                                )}
                            </form>
                        )}

                        {/* -- FORGOT PASSWORD VIEWS -- */}
                        {view === 'forgot_email' && (
                            <form onSubmit={handleForgotSendCode} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email Address</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            type="email"
                                            placeholder="you@example.com"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="pl-10 h-11 bg-secondary border-border"
                                            required
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <Button type="submit" variant="hero" className="w-full h-11 text-base" disabled={isLoading}>
                                    {isLoading ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</>
                                    ) : "Send Verification Code"}
                                </Button>
                                <div className="text-center pt-2">
                                    <Button type="button" variant="link" className="text-sm text-muted-foreground" onClick={() => setView('login')}>
                                        &larr; Back to login
                                    </Button>
                                </div>
                            </form>
                        )}

                        {view === 'forgot_otp' && (
                            <form onSubmit={handleForgotVerifyCode} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="otp">Verification Code</Label>
                                    <div className="relative">
                                        <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="otp"
                                            placeholder="Enter 6-digit code"
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value)}
                                            className="pl-10 h-14 bg-secondary border-border text-center text-2xl tracking-[0.5em] font-mono"
                                            maxLength={6}
                                            required
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <Button type="submit" variant="hero" className="w-full h-11 text-base" disabled={isLoading}>
                                    {isLoading ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</>
                                    ) : "Verify Code"}
                                </Button>
                                <div className="text-center pt-2">
                                    <Button type="button" variant="link" className="text-sm text-muted-foreground" onClick={() => setView('forgot_email')}>
                                        Use a different email
                                    </Button>
                                </div>
                            </form>
                        )}

                        {view === 'forgot_reset' && (
                            <form onSubmit={handleResetPassword} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="newPassword">New Password</Label>
                                    <div className="relative">
                                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="newPassword"
                                            type="password"
                                            placeholder="Enter new password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="pl-10 h-11 bg-secondary border-border"
                                            required
                                            minLength={8}
                                            autoFocus
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                                    <div className="relative">
                                        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="confirmPassword"
                                            type="password"
                                            placeholder="Confirm new password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="pl-10 h-11 bg-secondary border-border"
                                            required
                                            minLength={8}
                                        />
                                    </div>
                                </div>
                                <Button type="submit" variant="hero" className="w-full h-11 text-base" disabled={isLoading}>
                                    {isLoading ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Resetting...</>
                                    ) : "Reset Password"}
                                </Button>
                            </form>
                        )}
                    </SpaceDeviceFrame>
                </motion.div>
            </div>
        </div>
    );
};
